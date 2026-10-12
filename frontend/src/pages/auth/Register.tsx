import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";

type ApiErrorResponse = {
  message?: string;
  data?: {
    message?: string;
    errors?: Record<string, string[] | string>;
  };
};

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: "",
  });

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"REGISTER" | "OTP">("REGISTER");
  const [otp, setOtp] = useState("");

  // Countdown timer cho gửi lại OTP (60s)
  const [resendCountdown, setResendCountdown] = useState(0);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });

    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      agree: "",
    };

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordUppercase = /[A-Z]/;
    const passwordLowercase = /[a-z]/;
    const passwordNumber = /[0-9]/;

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên của bạn.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không đúng định dạng (VD: 0912345678).";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (form.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (!passwordUppercase.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ cái viết hoa.";
    } else if (!passwordLowercase.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ cái viết thường.";
    } else if (!passwordNumber.test(form.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ số.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu xác nhận.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!form.agree) {
      newErrors.agree = "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== "");
  };

  const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (typeof error !== "object" || error === null) {
      return defaultMessage;
    }

    const err = error as ApiErrorResponse;

    if (err.data?.errors) {
      const validationErrors = err.data.errors;
      const firstKey = Object.keys(validationErrors)[0];

      if (firstKey) {
        const firstError = validationErrors[firstKey];

        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }

        if (typeof firstError === "string") {
          return firstError;
        }
      }
    }

    if (err.data?.message) {
      return err.data.message;
    }

    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      const msg = (err as { message: string }).message;
      if (msg === "Failed to fetch") {
        return "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.";
      }
      return msg;
    }

    return defaultMessage;
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.confirmPassword,
          accept_terms: form.agree,
        }),
      });

      setResendCountdown(60);
      setStep("OTP");
      showToast("Đăng ký thành công! Mã xác thực OTP đã được gửi đến email của bạn.", "success");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(
          error,
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setApiError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetchApi("/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          otp,
        }),
      });

      // Tự động lưu phiên đăng nhập ngay sau khi xác thực OTP thành công
      if (response?.account) {
        if (response.token) {
          localStorage.setItem("token", response.token);
        }
        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role || "CUSTOMER");
        showToast("Xác thực email thành công! Đang chuyển hướng vào hệ thống...", "success");
        setTimeout(() => {
          navigate("/");
        }, 800);
        return;
      }

      showToast("Xác thực email thành công! Vui lòng đăng nhập.", "success");
      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Mã OTP không chính xác hoặc đã hết hạn.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
        }),
      });

      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Không thể gửi lại mã OTP lúc này.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B] flex flex-col justify-between">
      {/* Toast thông báo */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header tối giản */}
      <header className="border-b border-[#E1E4E6] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white shadow-sm transition-transform group-hover:scale-105">
              🚗
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-[#20252B]">
                CarService
              </p>
              <p className="text-[11px] font-medium text-[#7A838C]">
                Trung tâm dịch vụ & chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
          >
            <span>Đã có tài khoản? Đăng nhập →</span>
          </Link>
        </div>
      </header>

      {/* Main Container - Split Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-[0_20px_50px_rgba(31,41,51,0.08)] grid grid-cols-1 lg:grid-cols-12">
          
          {/* CỘT TRÁI: FORM ĐĂNG KÝ / XÁC THỰC OTP */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            {step === "REGISTER" ? (
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]"></span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                      THÀNH VIÊN MỚI
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20252B] tracking-tight">
                    Đăng ký tài khoản
                  </h1>
                  <p className="mt-2 text-xs sm:text-sm text-[#7A838C]">
                    Tạo tài khoản để đặt lịch chăm sóc xe và theo dõi hồ sơ bảo dưỡng trực tuyến.
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-700 flex items-start gap-3">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="flex-1 leading-relaxed">{apiError}</div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                  {/* Họ và tên & Số điện thoại */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                          errors.fullName
                            ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                        }`}
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="0912345678"
                        className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                          errors.phone
                            ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                        }`}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Địa chỉ Email */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                      Địa chỉ Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="vidu@carservice.vn"
                      className={`h-11 w-full rounded-xl border px-3.5 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                        errors.email
                          ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                          : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Mật khẩu & Nhập lại mật khẩu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Mật khẩu (>= 8 ký tự)"
                          className={`h-11 w-full rounded-xl border px-3.5 pr-12 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                            errors.password
                              ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                              : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
                        >
                          {showPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                        Xác nhận lại <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="Nhập lại mật khẩu"
                          className={`h-11 w-full rounded-xl border px-3.5 pr-12 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                            errors.confirmPassword
                              ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                              : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
                        >
                          {showConfirmPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Thanh đo độ mạnh mật khẩu trực quan */}
                  <PasswordStrengthIndicator password={form.password} />

                  {/* Đồng ý điều khoản */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#D6A85F] focus:ring-[#D6A85F]"
                      />
                      <span className="text-xs text-[#66717C] leading-relaxed">
                        Tôi đồng ý với{" "}
                        <span className="text-[#20252B] font-semibold underline underline-offset-2">
                          Điều khoản dịch vụ
                        </span>{" "}
                        và{" "}
                        <span className="text-[#20252B] font-semibold underline underline-offset-2">
                          Chính sách bảo mật
                        </span>{" "}
                        của CarService.
                      </span>
                    </label>
                    {errors.agree && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {errors.agree}
                      </p>
                    )}
                  </div>

                  {/* Nút Đăng ký */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-3 h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang khởi tạo tài khoản...</span>
                      </>
                    ) : (
                      <span>Đăng ký tài khoản</span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-[#7A838C]">
                  Đã có tài khoản CarService?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#D6A85F] hover:text-[#B58941] transition"
                  >
                    Đăng nhập tại đây
                  </Link>
                </div>
              </div>
            ) : (
              /* BƯỚC XÁC THỰC OTP SAU ĐĂNG KÝ */
              <div>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#E5B869] text-2xl text-[#D6A85F]">
                    📩
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#20252B]">
                    Xác thực tài khoản
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#7A838C] max-w-sm mx-auto">
                    Mã kích hoạt tài khoản 6 chữ số đã được gửi đến: <br />
                    <strong className="text-[#20252B]">{form.email}</strong>
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-700 text-center">
                    {apiError}
                  </div>
                )}

                <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
                  {/* Ô nhập OTP 6 số tự động */}
                  <div>
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      disabled={isLoading}
                      hasError={Boolean(apiError)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang xác nhận mã...</span>
                      </>
                    ) : (
                      <span>Hoàn tất & Đăng nhập</span>
                    )}
                  </button>

                  {/* Nút gửi lại mã với Countdown Timer */}
                  <div className="text-center text-xs">
                    {resendCountdown > 0 ? (
                      <span className="text-[#8A949E] font-medium">
                        Gửi lại mã mới sau:{" "}
                        <strong className="text-[#D6A85F]">
                          {resendCountdown}s
                        </strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="font-bold text-[#D6A85F] hover:text-[#B58941] transition cursor-pointer underline underline-offset-4"
                      >
                        Chưa nhận được mã? Gửi lại OTP
                      </button>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("REGISTER");
                        setOtp("");
                        setApiError("");
                      }}
                      className="text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition cursor-pointer"
                    >
                      ← Chỉnh sửa lại thông tin đăng ký
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: LỢI ÍCH KHI LÀ THÀNH VIÊN */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#1F2933] to-[#11161B] text-white p-10 flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D6A85F]/10 blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md mb-6 border border-white/10">
                <span className="text-amber-400">👑</span>
                <span className="text-[11px] font-semibold text-slate-200">
                  Đặc quyền hội viên
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight leading-snug">
                Gia nhập cộng đồng chăm sóc xe hơi thông minh
              </h2>

              <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                Đăng ký tài khoản miễn phí để nhận trọn bộ tiện ích và quyền lợi độc quyền từ CarService.
              </p>
            </div>

            <div className="relative z-10 space-y-4 my-8">
              <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F] text-sm font-bold">
                  01
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Sổ bảo dưỡng điện tử trọn đời
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    Lưu trữ lịch sử thay dầu, phụ tùng và mốc bảo dưỡng định kỳ trên đám mây.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F] text-sm font-bold">
                  02
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Ưu tiên giữ chỗ & nhắc hẹn tự động
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    Không phải chờ đợi, nhận thông báo nhắc nhở khi đến chu kỳ kiểm tra định kỳ.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F] text-sm font-bold">
                  03
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Tích lũy điểm & ưu đãi thành viên
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    Giảm giá trực tiếp cho các gói vệ sinh khoang máy, nội thất và cân chỉnh góc đặt bánh xe.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Bảo mật dữ liệu tuyệt đối</span>
              <span className="font-semibold text-slate-300">Cam kết không spam</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer bản quyền */}
      <footer className="py-4 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default Register;