import { Modal } from "../../components/ui";
import { useEffect, useState, useRef, type ChangeEvent } from "react";
import Header from "../../components/Header";
import { fetchApi } from "../../services/api";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import VietnamAddressSelector from "../../components/common/VietnamAddressSelector";
import { logout } from "../auth/auth";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { buttonClass } from "../../components/ui/buttonClass";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import carArt from "../../assets/car-garage.svg";

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

const roleNames: Record<AccountInfo["role"], string> = {
  CUSTOMER: "Khách hàng",
  ADMIN: "Quản trị viên",
  ADVISOR: "Cố vấn dịch vụ",
  TECHNICIAN: "Kỹ thuật viên",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : date.toLocaleDateString("vi-VN");
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type ProfileVehicle = { id: number; license_plate: string; year?: number | null; variant?: string | null; model?: { name?: string; brand?: { name?: string } | null } | null };

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

const VIETNAM_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

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
  const [vehicles, setVehicles] = useState<ProfileVehicle[] | null>(null);
  // ?tab=security mở thẳng tab Bảo mật (liên kết "Cài đặt" / đổi mật khẩu).
  const [tab, setTab] = useState<"profile" | "security">(() => new URLSearchParams(window.location.search).get("tab") === "security" ? "security" : "profile");
  const { confirm } = useAppFeedback();

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

  // Edit Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });
  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    phone?: string;
    address?: string;
  }>({});

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
          const [customerResult, vehiclesResult] = await Promise.allSettled([
            fetchApi("/me/customer/"),
            fetchApi("/me/vehicles/"),
          ]);

          if (customerResult.status === "fulfilled" && customerResult.value?.data) {
            setCustomer(customerResult.value.data as CustomerProfile);
          }

          if (
            vehiclesResult.status === "fulfilled" &&
            Array.isArray(vehiclesResult.value?.data)
          ) {
            setVehicles(vehiclesResult.value.data as ProfileVehicle[]);
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
  const address =
    customer?.address || account?.customer?.address || "Chưa cập nhật";
  const status =
    account?.status === "ACTIVE"
      ? "Đang hoạt động"
      : account?.status || "Chưa cập nhật";
  const roleName = account ? roleNames[account.role] : "Tài khoản";
  const profileNumber =
    account?.role === "CUSTOMER" && (customer?.id || account?.customer?.id)
      ? `KH-${String(customer?.id || account?.customer?.id).padStart(3, "0")}`
      : account?.employee?.id
        ? `NV-${String(account.employee.id).padStart(3, "0")}`
        : "Chưa cập nhật";

  // Xóa xe (cùng API trang "Xe của tôi"; backend chặn nếu xe đang có lịch / phiếu).
  const handleDeleteVehicle = async (id: number, plate: string) => {
    if (!await confirm({ title: "Xóa xe", reference: plate, description: "Xe sẽ bị xóa khỏi tài khoản. Không xóa được nếu xe đang có lịch hẹn hoặc đang sửa.", confirmText: "Xóa xe", variant: "danger" })) return;
    try {
      await fetchApi(`/me/vehicles/${id}`, { method: "DELETE" });
      setVehicles(list => (list ?? []).filter(v => v.id !== id));
      showToast("Đã xóa xe.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không xóa được xe.", "error");
    }
  };

  // --- Handlers: Edit Profile ---
  const handleOpenEditProfile = () => {
    setProfileForm({
      fullName: fullName === "Chưa cập nhật" ? "" : fullName,
      phone: phone === "Chưa cập nhật" ? "" : phone,
      address: address === "Chưa cập nhật" ? "" : address,
    });
    setProfileErrors({});
    setIsEditProfileOpen(true);
  };

  const validateProfileForm = () => {
    const errors: typeof profileErrors = {};
    const trimmedName = profileForm.fullName.trim();
    const trimmedPhone = profileForm.phone.trim();

    if (!trimmedName) {
      errors.fullName = "Vui lòng nhập họ và tên.";
    } else if (trimmedName.length < 2) {
      errors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    } else if (trimmedName.length > 100) {
      errors.fullName = "Họ và tên không được vượt quá 100 ký tự.";
    }

    if (!trimmedPhone) {
      errors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!VIETNAM_PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = "Số điện thoại không hợp lệ (10 chữ số, ví dụ: 0912345678).";
    }

    if (profileForm.address.trim().length > 255) {
      errors.address = "Địa chỉ không được vượt quá 255 ký tự.";
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim() || null,
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        if (response.account.customer) {
          setCustomer(response.account.customer);
        }
        localStorage.setItem("user", JSON.stringify(response.account));
        window.dispatchEvent(new Event("user-updated"));
      }

      showToast("Cập nhật thông tin cá nhân thành công!", "success");
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { message?: string } })?.data?.message ||
        "Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {/* Cột phải */}
        <section className="min-w-0">
          <div className="at-customer-heading">
            <div>
              <h1>Hồ sơ của tôi</h1>
              <p>Quản lý thông tin cá nhân, ảnh đại diện và bảo mật tài khoản.</p>
            </div>
            <button type="button" className="at-customer-primary" onClick={handleOpenEditProfile}>Chỉnh sửa thông tin</button>
          </div>

          <div role="tablist" aria-label="Hồ sơ" className="flex gap-2 border-b border-cs-border">
            {([["profile", "Thông tin cá nhân", "user"], ["security", "Bảo mật", "shield"]] as const).map(([key, label, icon]) =>
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === key ? "border-cs-accent text-cs-accent-text" : "border-transparent text-cs-muted hover:text-cs-text"}`}>
                <Icon name={icon} size={18}/>{label}
              </button>)}
          </div>

          {tab === "profile" ? <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-cs-text">Thông tin cá nhân</h2>

              </div>
              <dl className="mt-4 space-y-2.5">
                <div className="grid gap-1.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                  <dt className="flex items-center gap-3 text-sm text-cs-muted"><ProfileGlyph name="user"/>Ảnh đại diện</dt>
                  <dd className="flex items-center gap-3 rounded-xl bg-cs-surface-2 px-4 py-2">
                    {account?.avatar
                      ? <img src={account.avatar} alt="" className="size-10 rounded-full object-cover"/>
                      : <span className="flex size-10 items-center justify-center rounded-full bg-cs-accent text-sm font-bold text-cs-accent-contrast">{fullName === "Chưa cập nhật" ? "KH" : getInitials(fullName)}</span>}
                    <Button size="sm" variant="ghost" icon="edit" onClick={handleOpenAvatarModal}>Đổi ảnh</Button>
                  </dd>
                </div>
                {([["user", "Họ và tên", fullName], ["phone", "Số điện thoại", phone], ["mail", "Email", email], ["pin", "Địa chỉ", address]] as const).map(([icon, label, value]) =>
                  <div key={label} className="grid gap-1.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                    <dt className="flex items-center gap-3 text-sm text-cs-muted"><ProfileGlyph name={icon}/>{label}</dt>
                    <dd className={`break-words rounded-xl bg-cs-surface-2 px-4 py-2.5 text-sm font-semibold ${value === "Chưa cập nhật" ? "text-cs-muted" : "text-cs-text"}`}>{value}</dd>
                  </div>)}
              </dl>
            </div>

            {account?.role === "CUSTOMER" && <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6" data-testid="profile-vehicles">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-cs-text"><span className="text-cs-accent-text"><Icon name="car" size={22}/></span>Xe của tôi</h2>
                <Link to="/customer/cars" className={buttonClass({ variant: "danger-outline", size: "sm", className: "no-underline" })}><Icon name="plus" size={16}/>Thêm xe</Link>
              </div>
              {vehicles === null ? <p className="mt-4 text-sm text-cs-muted">Đang tải xe…</p>
                : !vehicles.length ? <p className="mt-4 rounded-xl bg-cs-surface-2 px-4 py-6 text-center text-sm text-cs-muted">Bạn chưa đăng ký xe nào.</p>
                  : <ul className="mt-4 space-y-3">{vehicles.map(vehicle => {
                    const name = [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.variant].filter(Boolean).join(" ") || "Xe chưa rõ dòng";
                    return <li key={vehicle.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-cs-border p-3 sm:flex-nowrap">
                      <img src={carArt} alt="" className="h-16 w-28 shrink-0 rounded-lg bg-cs-surface-2 object-contain p-1"/>
                      <div className="min-w-0 flex-1"><p className="truncate font-bold text-cs-text">{name}</p><p className="font-mono text-sm text-cs-muted">{vehicle.license_plate}{vehicle.year ? ` · ${vehicle.year}` : ""}</p></div>
                      <div className="ml-auto flex gap-1">
                        <Link to="/customer/cars" aria-label={`Sửa xe ${vehicle.license_plate}`} title="Sửa xe" className="inline-flex size-10 items-center justify-center rounded-lg text-cs-text hover:bg-cs-hover"><Icon name="edit" size={18}/></Link>
                        <button type="button" aria-label={`Xóa xe ${vehicle.license_plate}`} title="Xóa xe" onClick={() => void handleDeleteVehicle(vehicle.id, vehicle.license_plate)} className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg text-cs-danger hover:bg-cs-hover"><Icon name="trash" size={18}/></button>
                      </div>
                    </li>;
                  })}</ul>}
            </div>}
          </div> : <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-cs-text">Thông tin đăng nhập</h2>
                <Button variant="secondary" size="sm" icon="shield" onClick={handleOpenChangePassword}>Đổi mật khẩu</Button>
              </div>
              <dl className="mt-4 space-y-2.5">
                {([["mail", "Email đăng nhập", email], ["lock", "Mật khẩu", "••••••••••"], ["id", "Mã khách hàng", profileNumber], ["calendar", "Ngày tham gia", formatDate(account?.created_at)], ["user", "Vai trò", roleName], ["shield", "Trạng thái", `Tài khoản ${status.toLowerCase()}`]] as const).map(([icon, label, value]) =>
                  <div key={label} className="grid gap-1.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                    <dt className="flex items-center gap-3 text-sm text-cs-muted"><ProfileGlyph name={icon}/>{label}</dt>
                    <dd className="break-words rounded-xl bg-cs-surface-2 px-4 py-2.5 text-sm font-semibold text-cs-text">{value}</dd>
                  </div>)}
              </dl>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-cs-border bg-cs-surface p-5">
              <span className="text-cs-accent-text"><Icon name="shield" size={22}/></span>
              <p className="text-sm leading-6 text-cs-muted">Không chia sẻ mật khẩu với bất kỳ ai. Nên đặt mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường và chữ số.</p>
            </div>
            <Button variant="danger-outline" icon="logout" onClick={() => void logout()}>Đăng xuất</Button>
          </div>}
        </section>
      </div></main>

      {/* ========================================================= */}
      {/* MODAL 1: CHỈNH SỬA THÔNG TIN CÁ NHÂN                     */}
      {/* ========================================================= */}
      {isEditProfileOpen && (
        <Modal bare open onClose={() => setIsEditProfileOpen(false)} dismissible={!isSubmitting} title={"Chỉnh sửa thông tin cá nhân"} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-cs-surface shadow-overlay transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E1E4E6] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Chỉnh sửa thông tin cá nhân
                </h3>
                <p className="mt-0.5 text-xs text-cs-muted">
                  Cập nhật thông tin liên hệ cho tài khoản của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 px-6 pb-6 pt-5">
              {/* Email (Readonly) */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Email đăng nhập
                </label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-slate-400">
                    Định danh cố định
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-slate-400">
                  Email dùng làm tài khoản đăng nhập, không thể thay đổi tại đây.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, fullName: e.target.value });
                    if (profileErrors.fullName) {
                      setProfileErrors({ ...profileErrors, fullName: undefined });
                    }
                  }}
                  placeholder="Nhập họ và tên đầy đủ"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-xs text-[#20252B] transition focus:outline-none ${
                    profileErrors.fullName
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                  }`}
                />
                {profileErrors.fullName && (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {profileErrors.fullName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2933]">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, phone: e.target.value });
                    if (profileErrors.phone) {
                      setProfileErrors({ ...profileErrors, phone: undefined });
                    }
                  }}
                  placeholder="Ví dụ: 0912345678"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-xs text-[#20252B] transition focus:outline-none ${
                    profileErrors.phone
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
                  }`}
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-[12px] font-medium text-rose-500">
                    {profileErrors.phone}
                  </p>
                )}
              </div>

              {/* Address with VietnamAddressSelector */}
              <VietnamAddressSelector
                value={profileForm.address}
                onChange={(newAddress) => {
                  setProfileForm({ ...profileForm, address: newAddress });
                  if (profileErrors.address) {
                    setProfileErrors({ ...profileErrors, address: undefined });
                  }
                }}
                error={profileErrors.address}
              />

              {/* Form Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E1E4E6] pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsEditProfileOpen(false)}
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cs-btn cs-btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </form>
          </Modal>
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
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showCurrentPassword ? "Ẩn" : "Hiện"}
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
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showNewPassword ? "Ẩn" : "Hiện"}
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
                    className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-700 text-xs"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
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
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cs-btn cs-btn-primary"
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
                    className="cs-btn cs-btn-secondary"
                  >
                    <span>📁 Tải ảnh từ thiết bị</span>
                  </button>

                  {selectedAvatar && (
                    <button
                      type="button"
                      onClick={() => setSelectedAvatar("")}
                      className="cs-btn cs-btn-danger-outline"
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
                  className="cs-btn cs-btn-secondary"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveAvatar}
                  className="cs-btn cs-btn-primary"
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