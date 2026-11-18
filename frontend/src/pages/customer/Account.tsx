import { Modal } from "../../components/ui";
import { useEffect, useState, useRef, type ChangeEvent } from "react";
import Header from "../../components/Header";
import { fetchApi } from "../../services/api";
import { NotificationsPanel } from "./account/NotificationsPanel";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import { Link, useSearchParams } from "react-router-dom";
import ContactEditModal from "../../components/customer/ContactEditModal";
import { buttonClass } from "../../components/ui/buttonClass";
import { Icon } from "../../components/ui/Icon";
import { AccountHeader } from "./account/AccountKit";

type AccountInfo = {
  id: number;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "ADVISOR" | "TECHNICIAN";
  status: string;
  avatar?: string | null;
  created_at: string;
  employee?: {
    id: number;
    full_name: string;
    phone?: string | null;
    technician_profile_id: number | null;
  } | null;
  customer?: {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

type CustomerProfile = NonNullable<AccountInfo["customer"]>;

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};


/** Icon nhỏ cho các dòng thông tin (bổ sung cho bộ Icon chung). */
function ProfileGlyph({ name }: { name: "user" | "phone" | "mail" | "pin" | "lock" | "id" | "calendar" | "shield" }) {
  const paths: Record<typeof name, string> = {
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
    phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
    mail: "M3 6h18v12H3zM3 7l9 6 9-6",
    pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
    lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
    id: "M3 5h18v14H3zM7 10h4M7 14h6M15 9h3v6h-3z",
    calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
    shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}


type ProfileTab = "profile" | "security" | "notifications";

function Account() {
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as AccountInfo | null;
    } catch {
      return null;
    }
  });

  const [customer, setCustomer] = useState<CustomerProfile | null>(
    account?.customer || null,
  );
  // ?tab=security|notifications mở thẳng tab tương ứng (liên kết "Cài đặt" / đổi mật khẩu).
  // Tab nằm trên URL → "Xem tất cả thông báo" ở chuông mở đúng tab kể cả khi đang đứng ở trang này.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: ProfileTab = (["security", "notifications"] as const).find(t => t === requestedTab) ?? "profile";
  const setTab = (next: ProfileTab) => setSearchParams(prev => {
    const params = new URLSearchParams(prev);
    if (next === "profile") params.delete("tab"); else params.set("tab", next);
    return params;
  }, { replace: true });

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar Selection
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch account data
  const loadAccountDetails = async () => {
    try {
      const accountResponse = await fetchApi("/me");
      if (accountResponse?.account) {
        const currentAccount = accountResponse.account as AccountInfo;
        setAccount(currentAccount);
        localStorage.setItem("user", JSON.stringify(currentAccount));

        if (currentAccount.role === "CUSTOMER") {
          const [customerResult] = await Promise.allSettled([fetchApi("/me/customer/")]);

          if (customerResult.status === "fulfilled" && customerResult.value?.data) {
            setCustomer(customerResult.value.data as CustomerProfile);
          }
        }
      }
    } catch {
      // Keep existing data in localStorage if offline
    }
  };

  useEffect(() => {
    void loadAccountDetails();
  }, []);

  const fullName =
    customer?.full_name ||
    account?.customer?.full_name ||
    account?.employee?.full_name ||
    "Chưa cập nhật";
  const email =
    customer?.email || account?.customer?.email || account?.email || "Chưa cập nhật";
  const phone =
    customer?.phone ||
    account?.customer?.phone ||
    account?.employee?.phone ||
    "Chưa cập nhật";

  // --- Sửa thông tin: dùng chung modal với bước Xác nhận ở trang Đặt lịch (ContactEditModal) ---
  const handleOpenEditProfile = () => setIsEditProfileOpen(true);

  // --- Handlers: Change Password ---
  const handleOpenChangePassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setIsChangePasswordOpen(true);
  };

  const validatePasswordForm = () => {
    const errors: typeof passwordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự.";
    } else if (
      !/[A-Z]/.test(passwordForm.newPassword) ||
      !/[a-z]/.test(passwordForm.newPassword) ||
      !/[0-9]/.test(passwordForm.newPassword)
    ) {
      errors.newPassword =
        "Mật khẩu mới phải bao gồm chữ hoa, chữ thường và chữ số.";
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = "Mật khẩu mới không được trùng với mật khẩu hiện tại.";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Xác nhận mật khẩu mới không khớp.";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);
    try {
      await fetchApi("/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          new_password_confirmation: passwordForm.confirmPassword,
        }),
      });

      showToast("Đổi mật khẩu thành công!", "success");
      setIsChangePasswordOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      const errorData = (err as { data?: { errors?: Record<string, string[]>; message?: string } })
        ?.data;
      if (errorData?.errors) {
        const backendErrors: typeof passwordErrors = {};
        if (errorData.errors.current_password) {
          backendErrors.currentPassword = errorData.errors.current_password[0];
        }
        if (errorData.errors.new_password) {
          backendErrors.newPassword = errorData.errors.new_password[0];
        }
        if (errorData.errors.new_password_confirmation) {
          backendErrors.confirmPassword = errorData.errors.new_password_confirmation[0];
        }
        setPasswordErrors(backendErrors);
      }
      const message =
        errorData?.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Avatar ---
  const handleOpenAvatarModal = () => {
    setSelectedAvatar(account?.avatar || "");
    setIsAvatarModalOpen(true);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn định dạng ảnh hợp lệ (PNG, JPG, WebP).", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh tối đa là 5MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          avatar: selectedAvatar || null,
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        localStorage.setItem("user", JSON.stringify(response.account));
        window.dispatchEvent(new Event("user-updated"));
      }

      showToast("Cập nhật ảnh đại diện thành công!", "success");
      setIsAvatarModalOpen(false);
    } catch {
      showToast("Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="at-customer-account text-cs-text">
      <Header />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="at-customer-page"><div className="at-customer-container">
        <section className="min-w-0">
          {/* Cùng khung tiêu đề với 7 trang khác của menu tài khoản. */}
          <AccountHeader title="Hồ sơ của tôi" description="Quản lý thông tin cá nhân và bảo mật tài khoản."/>

          {/* Tab */}
          <div role="tablist" aria-label="Hồ sơ" className="mt-6 flex gap-1 overflow-x-auto border-b border-cs-border [scrollbar-width:none]">
            {([["profile", "Thông tin cá nhân", "user"], ["security", "Bảo mật & Đăng nhập", "shield"], ["notifications", "Thông báo", "bell"]] as const).map(([key, label, icon]) =>
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition ${tab === key ? "border-[#e11d2e] text-cs-accent-text" : "border-transparent text-cs-muted hover:text-cs-text"}`}>
                <Icon name={icon} size={18}/>{label}
              </button>)}
          </div>

          <div className="mt-6">
            <div className="min-w-0">
              {tab === "profile" && <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cs-soft text-cs-accent-text"><ProfileGlyph name="id"/></span>
                    <h2 className="text-lg font-extrabold text-cs-text">Thông tin cá nhân</h2>
                  </div>
                  <button type="button" onClick={handleOpenEditProfile} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#e11d2e] px-5 py-2 text-sm font-bold text-cs-accent-text transition hover:bg-cs-soft"><Icon name="edit" size={15}/>Chỉnh sửa</button>
                </div>
                {/* Địa chỉ vẫn sửa được trong "Chỉnh sửa". */}
                <dl className="mt-5 space-y-2.5">
                  <div className="grid gap-1.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
                    <dt className="flex items-center gap-3 text-sm text-cs-muted"><ProfileGlyph name="user"/>Ảnh đại diện</dt>
                    <dd className="flex items-center gap-3 rounded-xl bg-cs-surface-2 px-4 py-2">
                      {account?.avatar
                        ? <img src={account.avatar} alt="Ảnh đại diện" className="size-10 rounded-full object-cover"/>
                        : <span className="flex size-10 items-center justify-center rounded-full bg-cs-accent text-sm font-bold text-cs-accent-contrast">{fullName === "Chưa cập nhật" ? "KH" : getInitials(fullName)}</span>}
                      <button type="button" onClick={handleOpenAvatarModal} className="cursor-pointer text-sm font-semibold text-cs-accent-text hover:underline">Đổi ảnh</button>
                    </dd>
                  </div>
                  {([["user", "Họ và tên", fullName], ["phone", "Số điện thoại", phone], ["mail", "Email", email]] as const).map(([icon, label, value]) =>
                    <div key={label} className="grid gap-1.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
                      <dt className="flex items-center gap-3 text-sm text-cs-muted"><ProfileGlyph name={icon}/>{label}</dt>
                      <dd className={`break-words rounded-xl bg-cs-surface-2 px-4 py-3 text-sm font-semibold ${value === "Chưa cập nhật" ? "text-cs-muted" : "text-cs-text"}`}>{value}</dd>
                    </div>)}
                </dl>
              </div>}

              {tab === "security" && <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cs-soft text-cs-accent-text"><ProfileGlyph name="shield"/></span>
                  <h2 className="text-lg font-extrabold text-cs-text">Bảo mật & Đăng nhập</h2>
                </div>
                {/* Chỉ hai việc về mật khẩu: đổi (biết mật khẩu cũ) và quên (đặt lại qua mã OTP gửi email). */}
                <div className="mt-5 divide-y divide-cs-border rounded-xl border border-cs-border">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-cs-muted"><ProfileGlyph name="lock"/></span>
                      <div className="min-w-0"><p className="text-sm font-semibold text-cs-text">Đổi mật khẩu</p><p className="text-xs text-cs-muted">Nhập mật khẩu hiện tại rồi đặt mật khẩu mới (tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số).</p></div>
                    </div>
                    <button type="button" onClick={handleOpenChangePassword} className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#e11d2e] px-5 py-2 text-sm font-bold text-cs-accent-text transition hover:bg-cs-soft"><Icon name="edit" size={15}/>Đổi mật khẩu</button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-cs-muted"><ProfileGlyph name="mail"/></span>
                      <div className="min-w-0"><p className="text-sm font-semibold text-cs-text">Quên mật khẩu</p><p className="text-xs text-cs-muted">Không nhớ mật khẩu hiện tại? Nhận mã OTP qua email {email === "Chưa cập nhật" ? "đăng nhập" : email} để đặt mật khẩu mới.</p></div>
                    </div>
                    <Link to="/forgot-password" state={{ from: { pathname: "/customer/account", search: "?tab=security", hash: "" } }} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cs-border px-5 py-2 text-sm font-bold text-cs-text no-underline transition hover:border-[#e11d2e] hover:text-cs-accent-text">Đặt lại qua email<Icon name="arrow" size={15}/></Link>
                  </div>
                </div>
              </div>}

              {tab === "notifications" && <NotificationsPanel/>}

            </div>

          </div>
        </section>
      </div></main>

      {/* ========================================================= */}
      {/* MODAL 1: CHỈNH SỬA THÔNG TIN CÁ NHÂN                     */}
      {/* ========================================================= */}
      {isEditProfileOpen && (
        <ContactEditModal
          title="Chỉnh sửa thông tin cá nhân"
          description="Thông tin liên hệ dùng cho lịch hẹn, báo giá và thông báo của gara."
          contact={{ name: fullName === "Chưa cập nhật" ? "" : fullName, phone: phone === "Chưa cập nhật" ? "" : phone, email: email === "Chưa cập nhật" ? "" : email }}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={(_, saved) => {
            const next = saved as AccountInfo | null;
            if (next) { setAccount(next); if (next.customer) setCustomer(next.customer); }
            setIsEditProfileOpen(false);
            showToast("Cập nhật thông tin cá nhân thành công!", "success");
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ĐỔI MẬT KHẨU                                     */}
      {/* ========================================================= */}
      {isChangePasswordOpen && (
        <Modal bare open onClose={() => setIsChangePasswordOpen(false)} dismissible={!isSubmitting} title={"Đổi mật khẩu"} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-cs-surface shadow-overlay transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Đổi mật khẩu tài khoản
                </h3>
                <p className="mt-0.5 text-xs text-cs-muted">
                  Cập nhật mật khẩu mới có độ bảo mật cao cho tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 px-6 pb-6 pt-5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      });
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          currentPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Nhập mật khẩu hiện tại"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.currentPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#cf2935]"
                  >
                    <Icon name={showCurrentPassword ? "eye-off" : "eye"} size={17}/>
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      });
                      if (passwordErrors.newPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          newPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Tối thiểu 8 ký tự, có hoa, thường và số"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.newPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#cf2935]"
                  >
                    <Icon name={showNewPassword ? "eye-off" : "eye"} size={17}/>
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {passwordErrors.newPassword}
                  </p>
                )}

                {/* Password strength indicator */}
                <PasswordStrengthIndicator password={passwordForm.newPassword} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      });
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors({
                          ...passwordErrors,
                          confirmPassword: undefined,
                        });
                      }
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-xs text-[#20252B] transition focus:outline-none ${
                      passwordErrors.confirmPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#cf2935]"
                  >
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} size={17}/>
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsChangePasswordOpen(false)}
                  className={buttonClass({ variant: "secondary" })}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={buttonClass({ variant: "primary" })}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang cập nhật...
                    </>
                  ) : (
                    "Xác nhận đổi mật khẩu"
                  )}
                </button>
              </div>
            </form>
          </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ĐỔI ẢNH ĐẠI DIỆN (AVATAR)                        */}
      {/* ========================================================= */}
      {isAvatarModalOpen && (
        <Modal bare open onClose={() => setIsAvatarModalOpen(false)} dismissible={!isSubmitting} title={"Đổi ảnh đại diện"} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-cs-surface shadow-overlay transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Thay đổi ảnh đại diện
                </h3>
                <p className="mt-0.5 text-xs text-cs-muted">
                  Tải ảnh từ máy tính hoặc chọn avatar phong cách có sẵn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 pb-6 pt-5">
              {/* Preview Avatar */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="relative h-24 w-24">
                  {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt="Preview Avatar"
                      className="h-24 w-24 rounded-full object-cover border-4 border-[#D6A85F] shadow-md"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-300 bg-slate-200 text-2xl font-bold text-slate-600 shadow-inner">
                      {getInitials(fullName)}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[12px] font-medium text-slate-500">
                  Ảnh đại diện hiển thị hiện tại
                </p>
              </div>

              {/* Upload file */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={buttonClass({ variant: "secondary" })}
                  >
                    <span>📁 Tải ảnh từ thiết bị</span>
                  </button>

                  {selectedAvatar && (
                    <button
                      type="button"
                      onClick={() => setSelectedAvatar("")}
                      className={buttonClass({ variant: "danger-outline" })}
                    >
                      Dùng chữ cái mặc định
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Định dạng hỗ trợ: PNG, JPG, JPEG, WebP. Tối đa 5MB.
                </p>
              </div>

              {/* Preset Avatars */}
              <div>
                <p className="text-xs font-semibold text-[#1F2933]">
                  Hoặc chọn nhanh từ bộ sưu tập:
                </p>
                <div className="mt-2.5 grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, index) => {
                    const isSelected = selectedAvatar === url;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setSelectedAvatar(url)}
                        className={`cursor-pointer group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                          isSelected
                            ? "border-[#D6A85F] ring-2 ring-[#D6A85F]/50 scale-105"
                            : "border-transparent hover:border-slate-300 hover:scale-105"
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Preset ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#D6A85F]/30 text-white font-bold text-xs">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAvatarModalOpen(false)}
                  className={buttonClass({ variant: "secondary" })}
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveAvatar}
                  className={buttonClass({ variant: "primary" })}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu ảnh đại diện"
                  )}
                </button>
              </div>
            </div>
          </Modal>
      )}
    </div>
  );
}

export default Account;
