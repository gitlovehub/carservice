import { useEffect, useState, useRef } from "react";
import Header from "../../components/Header";
import { fetchApi } from "../../services/api";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";

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
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // Modal Trạng Thái
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Chỉnh sửa thông tin
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Form Đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Avatar tạm thời
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
              setVehicleCount(vehiclesResult.value.data.length);
            }
          }
        }
      } catch {
        // Giữ thông tin đã có trong localStorage
      }
    };

    void loadAccountDetails();
  }, []);

  const fullName =
    customer?.full_name ||
    account?.customer?.full_name ||
    account?.employee?.full_name ||
    "Chưa cập nhật";
  const email =
    customer?.email ||
    account?.customer?.email ||
    account?.email ||
    "Chưa cập nhật";
  const phone =
    customer?.phone ||
    account?.customer?.phone ||
    account?.employee?.phone ||
    "Chưa cập nhật";
  const address =
    customer?.address ||
    account?.customer?.address ||
    "Chưa cập nhật";
  const status =
    account?.status === "ACTIVE"
      ? "Đang hoạt động"
      : account?.status || "Chưa cập nhật";
  const roleName = account ? roleNames[account.role] : "Tài khoản";
  const profileNumber =
    account?.role === "CUSTOMER" && customer?.id
      ? `KH-${String(customer.id).padStart(3, "0")}`
      : account?.employee?.id
      ? `NV-${String(account.employee.id).padStart(3, "0")}`
      : "Chưa cập nhật";

  // Mở modal chỉnh sửa thông tin
  const handleOpenEditProfile = () => {
    setProfileForm({
      fullName: fullName === "Chưa cập nhật" ? "" : fullName,
      phone: phone === "Chưa cập nhật" ? "" : phone,
      address: address === "Chưa cập nhật" ? "" : address,
    });
    setProfileErrors({});
    setIsEditProfileOpen(true);
  };

  // Submit cập nhật thông tin cá nhân
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!profileForm.fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ và tên.";
    } else if (profileForm.fullName.trim().length < 2) {
      errors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (profileForm.phone.trim()) {
      const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(profileForm.phone.trim())) {
        errors.phone = "Số điện thoại không đúng định dạng.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        if (response.account.customer) {
          setCustomer(response.account.customer);
        }
        localStorage.setItem("user", JSON.stringify(response.account));
      }

      setIsEditProfileOpen(false);
      showToast("Cập nhật thông tin cá nhân thành công!", "success");
    } catch (err: any) {
      const msg = err?.data?.message || "Cập nhật thông tin thất bại.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal đổi mật khẩu
  const handleOpenChangePassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setIsChangePasswordOpen(true);
  };

  // Submit đổi mật khẩu
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự.";
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

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

      setIsChangePasswordOpen(false);
      showToast("Đổi mật khẩu thành công!", "success");
    } catch (err: any) {
      const errs = err?.data?.errors;
      if (errs?.current_password) {
        setPasswordErrors({ currentPassword: errs.current_password[0] });
      } else if (errs?.new_password) {
        setPasswordErrors({ newPassword: errs.new_password[0] });
      } else {
        showToast(err?.data?.message || "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal đổi avatar
  const handleOpenAvatarModal = () => {
    setSelectedAvatar(account?.avatar || "");
    setIsAvatarModalOpen(true);
  };

  // Xử lý upload file ảnh từ máy
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast("Dung lượng ảnh tối đa là 3MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Lưu Avatar
  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          avatar: selectedAvatar,
        }),
      });

      if (response?.account) {
        setAccount(response.account);
        localStorage.setItem("user", JSON.stringify(response.account));
      }

      setIsAvatarModalOpen(false);
      showToast("Cập nhật ảnh đại diện thành công!", "success");
    } catch (err: any) {
      showToast(err?.data?.message || "Cập nhật ảnh đại diện thất bại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Header />

      <main>
        {/* Banner tiêu đề */}
        <section className="border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-8 md:py-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              CARSERVICE / TÀI KHOẢN
            </p>

            <h1 className="mt-3 text-[32px] sm:text-[40px] font-bold tracking-tight text-[#1F2933]">
              Hồ sơ tài khoản
            </h1>

            <p className="mt-2 max-w-[620px] text-xs sm:text-sm text-[#66717C]">
              Quản lý thông tin cá nhân, cập nhật ảnh đại diện và đổi mật khẩu bảo mật của bạn.
            </p>
          </div>
        </section>

        {/* Nội dung hồ sơ */}
        <section>
          <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-14">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              
              {/* Thẻ Avatar & Trạng thái */}
              <div className="h-fit overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-sm">
                <div className="bg-[#1F2933] px-6 py-8 text-center text-white relative">
                  {/* Avatar Circle */}
                  <div className="relative mx-auto h-28 w-28 group">
                    <div className="h-full w-full overflow-hidden rounded-full border-4 border-[#3C4650] bg-[#D6A85F] shadow-lg flex items-center justify-center">
                      {account?.avatar ? (
                        <img
                          src={account.avatar}
                          alt={fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-extrabold text-[#1F2933]">
                          {fullName === "Chưa cập nhật"
                            ? account?.role.slice(0, 2) || "TK"
                            : getInitials(fullName)}
                        </span>
                      )}
                    </div>

                    {/* Nút bấm nhanh đổi avatar */}
                    <button
                      type="button"
                      onClick={handleOpenAvatarModal}
                      title="Đổi ảnh đại diện"
                      className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#D6A85F] text-sm text-[#1F2933] shadow-md border-2 border-[#1F2933] hover:scale-110 transition-transform"
                    >
                      📷
                    </button>
                  </div>

                  <h2 className="mt-4 text-lg font-bold truncate px-2">
                    {fullName}
                  </h2>

                  <p className="mt-0.5 text-xs text-[#AEB8C1]">
                    {roleName}
                  </p>

                  <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[#29333D] px-4 py-1.5 border border-[#3C4650]">
                    <span className="h-2 w-2 rounded-full bg-[#D6A85F] animate-pulse" />
                    <span className="text-[11px] font-semibold text-[#E8ECEF]">
                      Tài khoản {status.toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleOpenAvatarModal}
                      className="cursor-pointer text-xs font-semibold text-[#D6A85F] hover:text-[#E5B869] transition underline underline-offset-4"
                    >
                      Đổi ảnh đại diện
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    THÔNG TIN HỆ THỐNG
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-xs text-[#8A949E]">Mã tài khoản</span>
                      <span className="text-xs font-bold text-[#20252B]">{profileNumber}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-xs text-[#8A949E]">Ngày tham gia</span>
                      <span className="text-xs font-bold text-[#20252B]">{formatDate(account?.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-xs text-[#8A949E]">Số xe quản lý</span>
                      <span className="text-xs font-bold text-[#20252B]">
                        {account?.role !== "CUSTOMER"
                          ? "Không áp dụng"
                          : vehicleCount === null
                          ? "Đang tải..."
                          : `${vehicleCount} xe`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#E1E4E6] pt-4">
                    <p className="text-[11px] leading-relaxed text-[#7A838C]">
                      Thông tin hồ sơ được bảo mật theo tiêu chuẩn gara ô tô thông minh CarService.
                    </p>
                  </div>
                </div>
              </div>

              {/* Thông tin cá nhân & Tài khoản */}
              <div className="space-y-6">
                
                {/* Khối Thông tin cá nhân */}
                <div className="overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center bg-[#FAF8F5]/50">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                        PROFILE
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-lg font-bold text-[#20252B]">
                        Thông tin liên hệ cá nhân
                      </h2>
                      <p className="mt-0.5 text-xs text-[#66717C]">
                        Thông tin được cố vấn sử dụng khi liên hệ xác nhận lịch hẹn.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="w-fit cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 shadow-sm flex items-center gap-1.5"
                    >
                      <span>✏️ Chỉnh sửa hồ sơ</span>
                    </button>
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Họ và tên
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#20252B]">
                        {fullName}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Số điện thoại
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#20252B]">
                        {phone}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Email liên hệ
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#20252B]">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Vai trò sử dụng
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#D6A85F]">
                        {roleName}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 sm:col-span-2">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Địa chỉ cư trú
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#20252B]">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Khối Thông tin đăng nhập & Đổi mật khẩu */}
                <div className="overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center bg-[#FAF8F5]/50">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                        SECURITY
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-lg font-bold text-[#20252B]">
                        Bảo mật & Đăng nhập
                      </h2>
                      <p className="mt-0.5 text-xs text-[#66717C]">
                        Quản lý mật khẩu truy cập hệ thống CarService.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenChangePassword}
                      className="w-fit cursor-pointer rounded-xl border border-[#D6A85F] bg-[#FAF8F5] px-4 py-2 text-xs font-bold text-[#B58941] transition hover:bg-[#D6A85F] hover:text-white shadow-sm flex items-center gap-1.5"
                    >
                      <span>🔑 Đổi mật khẩu</span>
                    </button>
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Email đăng nhập
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#20252B]">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] font-bold text-[#8A949E] uppercase tracking-wider">
                        Mật khẩu tài khoản
                      </p>
                      <p className="mt-1.5 text-sm font-semibold tracking-widest text-[#20252B]">
                        ••••••••••••
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: CHỈNH SỬA THÔNG TIN CÁ NHÂN */}
      {/* ========================================================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E1E4E6] bg-white p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E4E6]">
              <div>
                <h3 className="text-lg font-bold text-[#20252B]">
                  Chỉnh sửa thông tin
                </h3>
                <p className="text-xs text-[#7A838C]">
                  Cập nhật thông tin hồ sơ của bạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, fullName: e.target.value })
                  }
                  placeholder="Nhập họ và tên"
                  className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                />
                {profileErrors.fullName && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">
                    {profileErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  placeholder="0912345678"
                  className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">
                    {profileErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, address: e.target.value })
                  }
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/TP"
                  className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E1E4E6]">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-xs font-semibold text-[#66717C] hover:bg-[#F7F7F5] transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ĐỔI MẬT KHẨU */}
      {/* ========================================================= */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E1E4E6] bg-white p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E4E6]">
              <div>
                <h3 className="text-lg font-bold text-[#20252B]">
                  Đổi mật khẩu tài khoản
                </h3>
                <p className="text-xs text-[#7A838C]">
                  Thiết lập mật khẩu bảo mật mới
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Nhập mật khẩu đang dùng"
                    className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-12 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] cursor-pointer"
                  >
                    {showCurrentPass ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    placeholder="Tối thiểu 8 ký tự"
                    className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-12 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] cursor-pointer"
                  >
                    {showNewPass ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-12 text-sm text-[#20252B] outline-none focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] cursor-pointer"
                  >
                    {showConfirmPass ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <PasswordStrengthIndicator password={passwordForm.newPassword} />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E1E4E6]">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-xs font-semibold text-[#66717C] hover:bg-[#F7F7F5] transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ĐỔI ẢNH ĐẠI DIỆN (AVATAR) */}
      {/* ========================================================= */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#E1E4E6] bg-white p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E4E6]">
              <div>
                <h3 className="text-lg font-bold text-[#20252B]">
                  Đổi ảnh đại diện
                </h3>
                <p className="text-xs text-[#7A838C]">
                  Chọn ảnh phong cách có sẵn hoặc tải ảnh từ thiết bị
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Xem trước ảnh đã chọn */}
              <div className="flex items-center gap-5 p-4 rounded-2xl border border-[#E1E4E6] bg-[#FAF8F5]">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#D6A85F] bg-slate-200 shadow-md flex items-center justify-center">
                  {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt="Xem trước"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-slate-500">
                      {getInitials(fullName)}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#20252B]">
                    Xem trước ảnh đại diện
                  </h4>
                  <p className="text-xs text-[#7A838C] mt-0.5">
                    Ảnh sẽ hiển thị trên thanh điều hướng và thông tin tài khoản.
                  </p>
                </div>
              </div>

              {/* Tải ảnh từ máy */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-2">
                  Tải ảnh từ máy tính (JPG, PNG, WebP)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 rounded-xl border border-dashed border-[#D6A85F] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] text-xs font-bold text-[#B58941] flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <span>📁 Chọn ảnh từ thiết bị của bạn</span>
                </button>
              </div>

              {/* Bộ sưu tập mẫu avatar phong cách */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-2">
                  Hoặc chọn avatar phong cách có sẵn
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {PRESET_AVATARS.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`h-14 w-14 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedAvatar === url
                          ? "border-[#D6A85F] ring-4 ring-[#D6A85F]/20 scale-105 shadow-md"
                          : "border-transparent hover:border-slate-300 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Preset ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E1E4E6]">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-xs font-semibold text-[#66717C] hover:bg-[#F7F7F5] transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={isSubmitting || !selectedAvatar}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu ảnh đại diện"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Account;