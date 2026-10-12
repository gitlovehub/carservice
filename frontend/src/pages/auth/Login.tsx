import { useState, useEffect } from "react";
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

const DEMO_ACCOUNTS = [
  {
    role: "Quản trị viên",
    code: "ADMIN",
    email: "admin.demo@carservice.test",
    pass: "CarService123!",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    desc: "Toàn quyền quản trị hệ thống và cấu hình",
  },
  {
    role: "Cố vấn dịch vụ",
    code: "ADVISOR",
    email: "advisor.demo@carservice.test",
    pass: "CarService123!",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    desc: "Tiếp nhận xe, tư vấn và quản lý lịch hẹn",
  },
  {
    role: "Kỹ thuật viên",
    code: "TECHNICIAN",
    email: "technician.demo@carservice.test",
    pass: "CarService123!",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "Kiểm tra thực tế, chẩn đoán và sửa chữa",
  },
  {
    role: "Khách hàng",
    code: "CUSTOMER",
    email: "customer.demo@carservice.test",
    pass: "CarService123!",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "Đặt lịch, quản lý xe và theo dõi bảo dưỡng",
  },
];

const getApiErrorDetails = (error: unknown): ApiErrorDetails => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return {};
  }

  const data = (error as { data: unknown }).data;
  if (typeof data !== "object" || data === null) {
    return {};
  }

  const message =
    "message" in data && typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : undefined;
  const errors: Record<string, string[]> = {};

  if ("errors" in data && typeof (data as { errors: unknown }).errors === "object" && (data as { errors: unknown }).errors !== null) {
    for (const [field, messages] of Object.entries((data as { errors: Record<string, unknown> }).errors)) {
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

  // Đếm ngược gửi lại OTP (60s)
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

  useEffect(() => {
    const prefillRole = (location.state as { prefillRole?: string } | null)?.prefillRole;
    if (prefillRole) {
      const demoAcc = DEMO_ACCOUNTS.find((d) => d.code === prefillRole);
      if (demoAcc) {
        const timer = setTimeout(() => {
          setForm({
            email: demoAcc.email,
            password: demoAcc.pass,
          });
          setToast({ message: `Đã tự động chọn tài khoản ${demoAcc.role}!`, type: "info" });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [location.state]);

  const goToDashboard = (role: string) => {
    const returnToBooking =
      role === "CUSTOMER" &&
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ===
        "/booking";

    if (returnToBooking) {
      navigate("/booking", { replace: true });
      return;
    }

    if (role === "ADMIN") {
      navigate("/admin");
      return;
    }

    if (role === "ADVISOR") {
      navigate("/advisor/appointments");
      return;
    }

    if (role === "TECHNICIAN") {
      navigate("/technician");
      return;
    }

    navigate("/");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
    setApiError("");
  };

  const handleSelectDemoAccount = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setForm({
      email: demo.email,
      password: demo.pass,
    });
    setErrors({ email: "", password: "" });
    setApiError("");
    showToast(`Đã điền tài khoản mẫu ${demo.role}! Bấm "Đăng nhập" để truy cập.`, "info");
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
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const sendOtpForPendingAccount = async (email: string, token?: string) => {
    setPendingEmail(email);
    setPendingToken(token || "");
    await fetchApi("/resend-email-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setResendCountdown(60);
    setStep("otp");
    showToast("Mã xác thực OTP đã được gửi đến email của bạn.", "info");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

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
        }
        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role);
        showToast("Đăng nhập thành công! Đang chuyển hướng...", "success");
        setTimeout(() => {
          goToDashboard(response.account.role);
        }, 500);
        return;
      }

      setApiError("Không nhận được dữ liệu xác thực từ máy chủ.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      const backendMessage = details.message || "";
      const emailErrors = details.errors?.email || [];
      const otpErrors = details.errors?.otp || [];

      if (
        backendMessage.toLowerCase().includes("chưa xác thực") ||
        backendMessage.toLowerCase().includes("otp") ||
        emailErrors.some((msg: string) => /chưa xác thực|otp/i.test(msg)) ||
        otpErrors.length > 0
      ) {
        try {
          await sendOtpForPendingAccount(form.email.trim());
        } catch (resendError: unknown) {
          const resendDetails = getApiErrorDetails(resendError);
          setPendingEmail(form.email.trim());
          setStep("otp");
          setResendCountdown(60);
          setApiError(
            resendDetails.message ||
              "Không gửi được mã OTP. Vui lòng thử lại sau.",
          );
        }
        return;
      }

      setApiError(emailErrors[0] || backendMessage || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
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
        localStorage.setItem("token", finalToken || "");
        localStorage.setItem("user", JSON.stringify(finalAccount));
        setUserRole(finalAccount.role);
        showToast("Xác thực OTP thành công!", "success");
        setTimeout(() => {
          goToDashboard(finalAccount.role);
        }, 500);
        return;
      }

      if (finalToken) {
        localStorage.setItem("token", finalToken);
        goToDashboard("CUSTOMER");
        return;
      }

      setApiError("Xác thực OTP không thành công.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(
        details.errors?.otp?.[0] ||
          details.message ||
          "Mã OTP không chính xác hoặc đã hết hạn."
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

    if (resendCountdown > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(details.message || "Không thể gửi lại mã OTP lúc này.");
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

          <div className="flex items-center gap-4">
            <Link
              to="/role-selector"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
            >
              <span>🧭 Chọn vai trò</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
            >
              <span>← Về trang chủ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container - Split Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E1E4E6] bg-white shadow-[0_20px_50px_rgba(31,41,51,0.08)] grid grid-cols-1 lg:grid-cols-12">
          
          {/* CỘT TRÁI: FORM ĐĂNG NHẬP / XÁC THỰC OTP */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            {step === "login" ? (
              <div>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F] animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                      HỆ THỐNG XÁC THỰC AN TOÀN
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20252B] tracking-tight">
                    Đăng nhập tài khoản
                  </h1>
                  <p className="mt-2 text-xs sm:text-sm text-[#7A838C]">
                    Chào mừng bạn quay trở lại. Vui lòng đăng nhập để quản lý lịch bảo dưỡng và xe của bạn.
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-700 flex items-start gap-3">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="flex-1 leading-relaxed">{apiError}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Trường Email */}
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
                      className={`h-12 w-full rounded-xl border px-4 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
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

                  {/* Trường Mật khẩu */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C]">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-[11px] font-semibold text-[#D6A85F] hover:text-[#B58941] transition"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu"
                        className={`h-12 w-full rounded-xl border px-4 pr-14 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 ${
                          errors.password
                            ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-[#E1E4E6] bg-[#F7F7F5] focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
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

                  {/* Nhớ mật khẩu */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#D6A85F] focus:ring-[#D6A85F]"
                      />
                      <span className="text-xs text-[#66717C] font-medium">
                        Ghi nhớ đăng nhập
                      </span>
                    </label>
                  </div>

                  {/* Nút Đăng nhập */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang xử lý đăng nhập...</span>
                      </>
                    ) : (
                      <span>Đăng nhập ngay</span>
                    )}
                  </button>
                </form>

                {/* Chuyển sang đăng ký */}
                <div className="mt-6 text-center text-xs text-[#7A838C]">
                  Chưa có tài khoản khách hàng?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-[#D6A85F] hover:text-[#B58941] transition"
                  >
                    Đăng ký tài khoản mới
                  </Link>
                </div>

                {/* Panel Tài khoản mẫu dùng thử (Demo Quick Fill) */}
                <div className="mt-8 pt-6 border-t border-[#E1E4E6]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                      ⚡ Tài khoản mẫu trải nghiệm (Demo)
                    </span>
                    <span className="text-[10px] text-[#A6ADB4]">Click để tự điền</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEMO_ACCOUNTS.map((demo) => (
                      <button
                        key={demo.code}
                        type="button"
                        onClick={() => handleSelectDemoAccount(demo)}
                        className="text-left p-2.5 rounded-xl border border-[#E1E4E6] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] hover:border-[#D6A85F] transition group cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#20252B] group-hover:text-[#D6A85F]">
                            {demo.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8A949E] truncate">
                          {demo.email}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* BƯỚC XÁC THỰC OTP */
              <div>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#E5B869] text-2xl text-[#D6A85F]">
                    ✉️
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#20252B]">
                    Xác thực mã OTP
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#7A838C] max-w-sm mx-auto">
                    Mã xác thực 6 chữ số đã được gửi tới email: <br />
                    <strong className="text-[#20252B]">{pendingEmail}</strong>
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
                      <span>Xác nhận & Tiếp tục</span>
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
                        setStep("login");
                        setOtp("");
                        setApiError("");
                      }}
                      className="text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition cursor-pointer"
                    >
                      ← Quay lại màn hình đăng nhập
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: BANNER THƯƠNG HIỆU CARSERVICE ĐẲNG CẤP */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#1F2933] to-[#11161B] text-white p-10 flex-col justify-between relative overflow-hidden">
            {/* Họa tiết nền sang trọng */}
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D6A85F]/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md mb-6 border border-white/10">
                <span className="text-amber-400">★ ★ ★ ★ ★</span>
                <span className="text-[11px] font-semibold text-slate-200">
                  Chuẩn dịch vụ 5 sao
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight leading-snug">
                Chăm sóc xế cưng với trải nghiệm kỹ thuật số hàng đầu
              </h2>

              <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                Theo dõi tiến trình bảo dưỡng minh bạch, đặt lịch hẹn nhanh chóng và nhận báo giá chuẩn xác theo phụ tùng chính hãng.
              </p>
            </div>

            {/* Các cam kết dịch vụ */}
            <div className="relative z-10 space-y-3.5 my-8">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F]">
                  ✓
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Minh bạch quy trình
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Báo giá rõ ràng, duyệt từng hạng mục trước khi thực hiện.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F]">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Cập nhật tiến độ tức thì
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Theo dõi trực tiếp xe đang ở khâu kiểm tra hay sửa chữa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F]/20 text-[#D6A85F]">
                  🛡️
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Phụ tùng 100% chính hãng
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bảo hành điện tử toàn diện cho mọi phụ tùng và gói dịch vụ.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer bản quyền */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Hỗ trợ kỹ thuật 24/7</span>
              <a href="tel:0332405972" className="font-semibold text-slate-300 hover:text-[#D6A85F] transition">
                Hotline: 033 240 5972
              </a>
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

export default Login;