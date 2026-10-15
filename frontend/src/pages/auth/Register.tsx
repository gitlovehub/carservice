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
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"REGISTER" | "OTP">("REGISTER");
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

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

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setTimeout(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

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

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên của bạn.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không đúng định dạng.";
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
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = "Mật khẩu cần có ít nhất 1 chữ hoa.";
    } else if (!/[a-z]/.test(form.password)) {
      newErrors.password = "Mật khẩu cần có ít nhất 1 chữ thường.";
    } else if (!/[0-9]/.test(form.password)) {
      newErrors.password = "Mật khẩu cần có ít nhất 1 chữ số.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!form.agree) {
      newErrors.agree =
        "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const getErrorMessage = (
    error: unknown,
    defaultMessage: string,
  ): string => {
    if (typeof error !== "object" || error === null) {
      return defaultMessage;
    }

    const err = error as ApiErrorResponse;

    if (err.data?.errors) {
      const firstKey = Object.keys(err.data.errors)[0];

      if (firstKey) {
        const firstError = err.data.errors[firstKey];

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

    if (typeof err.message === "string") {
      if (err.message === "Failed to fetch") {
        return "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.";
      }

      return err.message;
    }

    return defaultMessage;
  };

  const handleRegisterSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!validate()) return;

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
      showToast(
        "Đăng ký thành công! Mã OTP đã được gửi đến email của bạn.",
        "success",
      );
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(
          error,
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
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

      if (response?.account) {
        if (response.token) {
          localStorage.setItem("token", response.token);
        }

        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role || "CUSTOMER");

        showToast(
          "Xác thực email thành công! Đang chuyển hướng...",
          "success",
        );

        setTimeout(() => {
          navigate("/");
        }, 800);

        return;
      }

      showToast(
        "Xác thực email thành công! Vui lòng đăng nhập.",
        "success",
      );

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(
          error,
          "Mã OTP không chính xác hoặc đã hết hạn.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isLoading) return;

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
      showToast("Mã OTP mới đã được gửi đến email của bạn.", "success");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Không thể gửi lại mã OTP lúc này."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `h-11 w-full rounded-xl border px-3.5 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
      hasError
        ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-[#E1E4E6] bg-[#F7F7F5] focus:border-[#D6A85F] focus:bg-white focus:ring-4 focus:ring-[#D6A85F]/15"
    }`;

  const labelClass =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#66717C]";

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#20252B]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="sticky top-0 z-30 border-b border-[#E1E4E6] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white transition-transform group-hover:scale-105">
              🚗
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">CarService</p>
              <p className="text-[11px] font-medium text-[#7A838C]">
                Chăm sóc xe chuyên nghiệp
              </p>
            </div>
          </Link>

          <Link
            to="/login"
            className="text-xs font-semibold text-[#66717C] transition hover:text-[#B58941] sm:text-sm"
          >
            Đã có tài khoản? <span className="text-[#B58941]">Đăng nhập →</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-[0_24px_70px_rgba(31,41,51,0.08)] lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1F2933] p-10 text-white lg:flex xl:p-12">
            <div className="absolute -right-24 top-32 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-12 top-44 h-48 w-48 rounded-full border border-[#D6A85F]/30" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#D6A85F]/10 blur-2xl" />

            <div className="relative">
              <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6A85F]/40 bg-[#D6A85F]/10 text-2xl">
                ✦
              </div>

              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#D6A85F]">
                CAR SERVICE
              </p>

              <h1 className="max-w-sm text-3xl font-extrabold leading-tight xl:text-4xl">
                Chăm sóc xe tốt hơn, bắt đầu từ hôm nay.
              </h1>

              <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
                Tạo tài khoản để đặt lịch bảo dưỡng, theo dõi tiến độ sửa chữa
                và quản lý thông tin xe của bạn.
              </p>
            </div>

            <div className="relative space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm text-[#D6A85F]">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold">Đặt lịch thuận tiện</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Chủ động chọn dịch vụ và thời gian phù hợp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm text-[#D6A85F]">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold">Theo dõi lịch sử xe</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Quản lý lịch hẹn và hồ sơ bảo dưỡng tập trung.
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 text-xs text-white/40">
                Đồng hành cùng bạn trên mọi hành trình.
              </div>
            </div>
          </aside>

          <section className="min-w-0 p-6 sm:p-9 lg:p-10 xl:p-12">
            {step === "REGISTER" ? (
              <>
                <div className="mb-7">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D6A85F]/30 bg-[#FAF8F5] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#B58941]">
                      Thành viên mới
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Tạo tài khoản
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7A838C]">
                    Điền thông tin bên dưới để bắt đầu sử dụng CarService.
                  </p>
                </div>

                {apiError && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                  >
                    <span>⚠</span>
                    <p className="leading-6">{apiError}</p>
                  </div>
                )}

                <form
                  onSubmit={handleRegisterSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fullName" className={labelClass}>
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        name="fullName"
                        autoComplete="name"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        aria-invalid={Boolean(errors.fullName)}
                        className={inputClass(Boolean(errors.fullName))}
                      />
                      {errors.fullName && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="0912345678"
                        aria-invalid={Boolean(errors.phone)}
                        className={inputClass(Boolean(errors.phone))}
                      />
                      {errors.phone && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Địa chỉ email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="vidu@example.com"
                      aria-invalid={Boolean(errors.email)}
                      className={inputClass(Boolean(errors.email))}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="password" className={labelClass}>
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          autoComplete="new-password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Ít nhất 8 ký tự"
                          aria-invalid={Boolean(errors.password)}
                          className={`${inputClass(Boolean(errors.password))} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] transition hover:text-[#20252B]"
                        >
                          {showPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className={labelClass}>
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          autoComplete="new-password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="Nhập lại mật khẩu"
                          aria-invalid={Boolean(errors.confirmPassword)}
                          className={`${inputClass(Boolean(errors.confirmPassword))} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={
                            showConfirmPassword
                              ? "Ẩn mật khẩu xác nhận"
                              : "Hiện mật khẩu xác nhận"
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] transition hover:text-[#20252B]"
                        >
                          {showConfirmPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  <PasswordStrengthIndicator password={form.password} />

                  <div className="pt-1">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D4D8DC] accent-[#D6A85F] focus:ring-[#D6A85F]"
                      />
                      <span className="text-xs leading-5 text-[#66717C]">
                        Tôi đồng ý với{" "}
                        <span className="font-semibold text-[#20252B] underline underline-offset-2">
                          Điều khoản dịch vụ
                        </span>{" "}
                        và{" "}
                        <span className="font-semibold text-[#20252B] underline underline-offset-2">
                          Chính sách bảo mật
                        </span>{" "}
                        của CarService.
                      </span>
                    </label>
                    {errors.agree && (
                      <p className="mt-1.5 text-xs text-red-600">
                        {errors.agree}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2933] text-sm font-bold text-white transition hover:bg-[#303D49] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Đang tạo tài khoản...
                      </>
                    ) : (
                      "Tạo tài khoản"
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-[#7A838C]">
                  Đã có tài khoản?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#B58941] transition hover:text-[#8F6A2D]"
                  >
                    Đăng nhập ngay
                  </Link>
                </p>
              </>
            ) : (
              <div className="mx-auto max-w-md py-3">
                <div className="mb-7 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6A85F]/40 bg-[#FAF8F5] text-3xl">
                    ✉
                  </div>

                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B58941]">
                    Xác minh email
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Xác thực tài khoản
                  </h2>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7A838C]">
                    Nhập mã OTP gồm 6 chữ số đã được gửi đến địa chỉ email
                    của bạn.
                  </p>

                  <p className="mt-2 break-all text-sm font-semibold text-[#20252B]">
                    {form.email}
                  </p>
                </div>

                {apiError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-700"
                  >
                    {apiError}
                  </div>
                )}

                <form
                  onSubmit={handleOtpSubmit}
                  noValidate
                  className="space-y-6"
                >
                  <OtpInput
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setApiError("");
                    }}
                    disabled={isLoading}
                    hasError={Boolean(apiError)}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2933] text-sm font-bold text-white transition hover:bg-[#303D49] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Đang xác nhận...
                      </>
                    ) : (
                      "Xác nhận tài khoản"
                    )}
                  </button>

                  <div className="text-center text-sm">
                    {resendCountdown > 0 ? (
                      <p className="text-[#8A949E]">
                        Gửi lại mã sau{" "}
                        <span className="font-bold text-[#B58941]">
                          {resendCountdown}s
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="font-semibold text-[#B58941] underline underline-offset-4 transition hover:text-[#8F6A2D] disabled:opacity-50"
                      >
                        Chưa nhận được mã? Gửi lại OTP
                      </button>
                    )}
                  </div>

                  <div className="border-t border-[#E1E4E6] pt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("REGISTER");
                        setOtp("");
                        setApiError("");
                      }}
                      className="text-xs font-semibold text-[#7A838C] transition hover:text-[#20252B]"
                    >
                      ← Quay lại chỉnh sửa thông tin
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="px-4 py-5 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default Register;