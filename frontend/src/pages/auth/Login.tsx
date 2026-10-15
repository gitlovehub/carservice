import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";

type Step = "login" | "otp";

type ApiErrorDetails = {
  message?: string;
  errors?: Record<string, string[]>;
};

const getApiErrorDetails = (error: unknown): ApiErrorDetails => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return {};
  }

  const data = (error as { data: unknown }).data;

  if (typeof data !== "object" || data === null) {
    return {};
  }

  const message =
    "message" in data && typeof data.message === "string"
      ? data.message
      : undefined;

  const errors: Record<string, string[]> = {};

  if ("errors" in data && typeof data.errors === "object" && data.errors !== null) {
    for (const [field, messages] of Object.entries(data.errors)) {
      if (Array.isArray(messages)) {
        errors[field] = messages.filter(
          (value): value is string => typeof value === "string",
        );
      }
    }
  }

  return { message, errors };
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setTimeout(() => {
      setResendCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const goToDashboard = (role: string) => {
    const from = (
      location.state as { from?: { pathname?: string } } | null
    )?.from?.pathname;

    if (role === "CUSTOMER" && from === "/booking") {
      navigate("/booking", { replace: true });
      return;
    }

    if (role === "ADMIN") {
      navigate("/admin", { replace: true });
      return;
    }

    if (role === "ADVISOR") {
      navigate("/advisor/appointments", { replace: true });
      return;
    }

    if (role === "TECHNICIAN") {
      navigate("/technician", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const sendOtpForPendingAccount = async (email: string, token?: string) => {
    setPendingEmail(email);
    setPendingToken(token || "");

    await fetchApi("/resend-email-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setOtp("");
    setResendCountdown(60);
    setStep("otp");
    showToast("Mã xác thực OTP đã được gửi đến email của bạn.", "info");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetchApi("/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          device_name: "web",
        }),
      });

      if (response?.account?.role) {
        if (response.token) {
          localStorage.setItem("token", response.token);
        } else {
          localStorage.setItem("token", "session_authenticated");
        }

        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role);

        showToast("Đăng nhập thành công!", "success");

        setTimeout(() => {
          goToDashboard(response.account.role);
        }, 400);

        return;
      }

      setApiError("Không nhận được dữ liệu xác thực từ máy chủ.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      const backendMessage = details.message || "";
      const emailErrors = details.errors?.email || [];
      const otpErrors = details.errors?.otp || [];

      const needsOtp =
        backendMessage.toLowerCase().includes("chưa xác thực") ||
        backendMessage.toLowerCase().includes("otp") ||
        emailErrors.some((message) => /chưa xác thực|otp/i.test(message)) ||
        otpErrors.length > 0;

      if (needsOtp) {
        try {
          await sendOtpForPendingAccount(form.email.trim());
        } catch (resendError: unknown) {
          const resendDetails = getApiErrorDetails(resendError);

          setPendingEmail(form.email.trim());
          setStep("otp");
          setResendCountdown(0);
          setApiError(
            resendDetails.message ||
              "Không gửi được mã OTP. Vui lòng thử gửi lại.",
          );
        }

        return;
      }

      setApiError(
        emailErrors[0] ||
          backendMessage ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!pendingEmail) {
      setStep("login");
      setApiError("Không tìm thấy email cần xác thực.");
      return;
    }

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
          email: pendingEmail,
          otp,
        }),
      });

      const finalToken = response?.token || pendingToken;
      const finalAccount = response?.account || null;

      if (finalAccount) {
        if (finalToken) {
          localStorage.setItem("token", finalToken);
        }

        localStorage.setItem("user", JSON.stringify(finalAccount));
        setUserRole(finalAccount.role);

        showToast("Xác thực OTP thành công!", "success");

        setTimeout(() => {
          goToDashboard(finalAccount.role);
        }, 400);

        return;
      }

      if (finalToken) {
        localStorage.setItem("token", finalToken);
        setUserRole("CUSTOMER");
        goToDashboard("CUSTOMER");
        return;
      }

      setApiError("Xác thực OTP không thành công.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);

      setApiError(
        details.errors?.otp?.[0] ||
          details.message ||
          "Mã OTP không chính xác hoặc đã hết hạn.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) {
      setApiError("Không tìm thấy email cần gửi lại OTP.");
      return;
    }

    if (resendCountdown > 0 || isLoading) return;

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });

      setOtp("");
      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi đến email của bạn.", "success");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(details.message || "Không thể gửi lại mã OTP lúc này.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `h-12 w-full rounded-xl border px-4 text-sm text-[#20252B] outline-none transition duration-200 placeholder:text-[#A0A8B0] ${
      hasError
        ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-[#E3E5E7] bg-[#F8F8F6] focus:border-[#D6A85F] focus:bg-white focus:ring-4 focus:ring-[#D6A85F]/15"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#20252B]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="sticky top-0 z-30 border-b border-[#E7E7E3] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-xl text-white shadow-sm transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
              🚗
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight">
                CarService
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-[#858D94] sm:text-[11px]">
                Trung tâm dịch vụ & chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="rounded-full px-3 py-2 text-xs font-semibold text-[#737D86] transition hover:bg-[#F5F3EF] hover:text-[#20252B] sm:px-4 sm:text-sm"
          >
            <span className="mr-1">←</span>
            <span className="hidden sm:inline">Về trang chủ</span>
            <span className="sm:hidden">Trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
        <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#E9D8B8]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[#D9DCD8]/40 blur-3xl" />

        <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#E4E5E1] bg-white shadow-[0_24px_80px_rgba(31,41,51,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden flex-col justify-between overflow-hidden bg-[#202A32] p-10 text-white lg:flex xl:p-12">
            <div className="absolute -right-24 -top-16 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-12 -top-4 h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#D6A85F]/10 blur-2xl" />

            <div className="relative">
              <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl">
                ✦
              </div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#DDBA7D]">
                Chăm sóc xe chuyên nghiệp
              </p>
              <h1 className="max-w-sm text-4xl font-bold leading-[1.2] tracking-tight xl:text-[42px]">
                Chăm xe đúng cách.
                <span className="mt-1 block text-[#DDBA7D]">
                  An tâm trên mọi hành trình.
                </span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
                Theo dõi lịch bảo dưỡng, quản lý thông tin xe và cập nhật tình
                trạng dịch vụ ngay trên một nền tảng.
              </p>
            </div>

            <div className="relative mt-12 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/15 text-lg text-[#E7C58F]">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold">Quản lý lịch hẹn</p>
                  <p className="mt-1 text-xs text-white/50">
                    Chủ động theo dõi lịch dịch vụ của bạn
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/15 text-lg text-[#E7C58F]">
                  ◈
                </div>
                <div>
                  <p className="text-sm font-semibold">Thông tin minh bạch</p>
                  <p className="mt-1 text-xs text-white/50">
                    Theo dõi dịch vụ và tình trạng xe
                  </p>
                </div>
              </div>
              <p className="pt-2 text-[10px] tracking-wide text-white/35">
                CARSERVICE · DRIVE WITH CONFIDENCE
              </p>
            </div>
          </section>

          <section className="min-w-0 p-6 sm:p-9 md:p-11 xl:p-14">
            {step === "login" ? (
              <>
                <div className="mb-8">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8D8BC] bg-[#FBF7EF] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C99A4A]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A47A35]">
                      Đăng nhập an toàn
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Chào mừng trở lại
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#858D94]">
                    Đăng nhập để tiếp tục sử dụng các dịch vụ của CarService.
                  </p>
                </div>

                {apiError && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-700"
                  >
                    <span className="mt-0.5">!</span>
                    <p>{apiError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-2 block text-xs font-bold text-[#454E56]"
                    >
                      Địa chỉ email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="vidu@carservice.vn"
                      aria-invalid={Boolean(errors.email)}
                      className={inputClass(Boolean(errors.email))}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="login-password"
                        className="text-xs font-bold text-[#454E56]"
                      >
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-[#A47A35] transition hover:text-[#805C26]"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>

                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu"
                        aria-invalid={Boolean(errors.password)}
                        className={`${inputClass(Boolean(errors.password))} pr-16`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#7D858D] transition hover:bg-[#EFEEE9] hover:text-[#20252B]"
                      >
                        {showPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 accent-[#B88A43]"
                    />
                    <span className="text-xs font-medium text-[#707981]">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#202A32] px-4 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#303D47] hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E9E9E5]" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#A0A6AA]">
                    CarService
                  </span>
                  <div className="h-px flex-1 bg-[#E9E9E5]" />
                </div>

                <p className="text-center text-sm text-[#7C848B]">
                  Chưa có tài khoản khách hàng?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-[#A47A35] transition hover:text-[#805C26]"
                  >
                    Đăng ký ngay
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setOtp("");
                    setApiError("");
                  }}
                  className="mb-7 text-xs font-semibold text-[#7C848B] transition hover:text-[#20252B]"
                >
                  ← Quay lại đăng nhập
                </button>

                <div className="mb-7">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D8BC] bg-[#FBF7EF] text-2xl">
                    ✉
                  </div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A47A35]">
                    Bước xác thực
                  </p>
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Xác thực mã OTP
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#858D94]">
                    Nhập mã xác thực gồm 6 chữ số đã được gửi đến email:
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-[#303A43]">
                    {pendingEmail}
                  </p>
                </div>

                {apiError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-700"
                  >
                    {apiError}
                  </div>
                )}

                <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#202A32] px-4 text-sm font-bold text-white transition hover:bg-[#303D47] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Đang xác nhận...
                      </>
                    ) : (
                      <>
                        Xác nhận và tiếp tục
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>

                  <div className="text-center text-xs">
                    {resendCountdown > 0 ? (
                      <p className="text-[#858D94]">
                        Gửi lại mã sau{" "}
                        <span className="font-bold text-[#A47A35]">
                          {resendCountdown}s
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="font-bold text-[#A47A35] underline decoration-[#D9C39F] underline-offset-4 transition hover:text-[#805C26] disabled:opacity-50"
                      >
                        Chưa nhận được mã? Gửi lại OTP
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-[#E7E7E3] bg-white/70 px-4 py-5 text-center">
        <p className="text-[11px] text-[#92999E]">
          © 2026 CarService System. Tất cả quyền được bảo lưu.
        </p>
      </footer>
    </div>
  );
}

export default Login;