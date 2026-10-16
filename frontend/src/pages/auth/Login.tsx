
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { getRoleManagementPage, setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import BrandLogo from "../../components/common/BrandLogo";

type Step = "login" | "otp";

type ApiErrorDetails = {
  message?: string;
  errors?: Record<string, string[]>;
};

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
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

  if (
    "errors" in data &&
    typeof data.errors === "object" &&
    data.errors !== null
  ) {
    for (const [field, messages] of Object.entries(
      data.errors as Record<string, unknown>,
    )) {
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
    const validRoles = [
      "CUSTOMER",
      "ADVISOR",
      "TECHNICIAN",
      "ADMIN",
    ];

    if (!validRoles.includes(role)) {
      setApiError("Tài khoản không có vai trò hợp lệ.");
      return;
    }

    const state = location.state as LocationState | null;
    const from = state?.from;
    const requestedPath = from?.pathname || "";

    const rolePage = getRoleManagementPage(role);
    const isBooking = requestedPath === "/booking";

    const isAllowedPath =
      role === "CUSTOMER"
        ? requestedPath.startsWith("/customer/") ||
          [
            "/booking",
            "/appointments",
            "/cars",
            "/account",
            "/contact",
            "/repair-status",
            "/quotation",
            "/payment",
            "/invoices",
            "/reviews",
          ].includes(requestedPath)
        : role === "ADMIN"
          ? requestedPath.startsWith("/admin/") ||
            requestedPath === "/admin" ||
            requestedPath.startsWith("/advisor/")
          : role === "ADVISOR"
            ? requestedPath.startsWith("/advisor/")
            : role === "TECHNICIAN"
              ? [
                  "/technician",
                  "/assigned-repairs",
                  "/vehicle-check",
                  "/diagnosis",
                  "/repair-progress",
                  "/checklist",
                  "/account",
                ].includes(requestedPath)
              : false;

    if (isBooking && role !== "CUSTOMER") {
      navigate(rolePage?.path || "/", { replace: true });
      return;
    }

    if (from && isAllowedPath) {
      navigate(
        {
          pathname: from.pathname || "/",
          search: from.search || "",
          hash: from.hash || "",
        },
        { replace: true },
      );
      return;
    }

    navigate(rolePage?.path || "/", { replace: true });
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

  const sendOtpForPendingAccount = async (email: string) => {
    setPendingEmail(email);
    setPendingToken("");

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
        localStorage.setItem(
          "token",
          response.token || "session_authenticated",
        );
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
        emailErrors.some((message) =>
          /chưa xác thực|otp/i.test(message),
        ) ||
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

      if (finalAccount?.role) {
        if (finalToken) {
          localStorage.setItem("token", finalToken);
        }

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
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F7F5] text-[#20252B]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="sticky top-0 z-30 border-b border-[#E1E4E6] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <BrandLogo />

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A949E] transition hover:text-[#20252B]"
          >
            ← Về trang chủ
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[480px]">
          <div className="rounded-3xl border border-[#E1E4E6] bg-white p-7 shadow-[0_20px_50px_rgba(31,41,51,0.06)] sm:p-9">
            {step === "login" ? (
              <div>
                <div className="mb-8">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E5B869]/40 bg-[#FAF8F5] px-3 py-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D6A85F]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                      HỆ THỐNG XÁC THỰC AN TOÀN
                    </span>
                  </div>

                  <h1 className="text-2xl font-extrabold tracking-tight text-[#20252B] sm:text-3xl">
                    Đăng nhập tài khoản
                  </h1>

                  <p className="mt-2 text-xs text-[#7A838C] sm:text-sm">
                    Chào mừng bạn quay trở lại. Vui lòng đăng nhập để quản lý
                    lịch bảo dưỡng và xe của bạn.
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-700">
                    <span className="shrink-0 text-base">⚠️</span>
                    <div className="flex-1 leading-relaxed">{apiError}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#66717C]">
                      Địa chỉ Email <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="vidu@carservice.vn"
                      className={`h-12 w-full rounded-xl border px-4 text-sm text-[#20252B] outline-none transition duration-200 placeholder:text-[#9EA8B3] ${
                        errors.email
                          ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                          : "border-[#E1E4E6] bg-[#F7F7F5] focus:border-[#D6A85F] focus:bg-white focus:ring-4 focus:ring-[#D6A85F]/15"
                      }`}
                    />

                    {errors.email && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C]">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-[11px] font-semibold text-[#D6A85F] transition hover:text-[#B58941]"
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
                        className={`h-12 w-full rounded-xl border px-4 pr-14 text-sm text-[#20252B] outline-none transition duration-200 placeholder:text-[#9EA8B3] ${
                          errors.password
                            ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-[#E1E4E6] bg-[#F7F7F5] focus:border-[#D6A85F] focus:bg-white focus:ring-4 focus:ring-[#D6A85F]/15"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] transition hover:text-[#20252B]"
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1F2933] text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Đang xử lý đăng nhập...</span>
                      </>
                    ) : (
                      <span>Đăng nhập ngay</span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-[#7A838C]">
                  Chưa có tài khoản khách hàng?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-[#D6A85F] transition hover:text-[#B58941]"
                  >
                    Đăng ký tài khoản mới
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5B869] bg-[#FAF8F5] text-2xl text-[#D6A85F]">
                    ✉️
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-[#20252B]">
                    Xác thực mã OTP
                  </h2>

                  <p className="mx-auto mt-2 max-w-sm text-xs text-[#7A838C] sm:text-sm">
                    Mã xác thực 6 chữ số đã được gửi tới email:
                    <br />
                    <strong className="text-[#20252B]">{pendingEmail}</strong>
                  </p>
                </div>

                {apiError && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-center text-xs font-medium text-red-700">
                    {apiError}
                  </div>
                )}

                <form onSubmit={handleOtpSubmit} noValidate className="space-y-6">
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                    hasError={Boolean(apiError)}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1F2933] text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Đang xác nhận mã...</span>
                      </>
                    ) : (
                      <span>Xác nhận &amp; Tiếp tục</span>
                    )}
                  </button>

                  <div className="text-center text-xs">
                    {resendCountdown > 0 ? (
                      <span className="font-medium text-[#8A949E]">
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
                        className="cursor-pointer font-bold text-[#D6A85F] underline underline-offset-4 transition hover:text-[#B58941] disabled:opacity-50"
                      >
                        Chưa nhận được mã? Gửi lại OTP
                      </button>
                    )}
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("login");
                        setOtp("");
                        setApiError("");
                      }}
                      className="cursor-pointer text-xs font-semibold text-[#8A949E] transition hover:text-[#20252B]"
                    >
                      ← Quay lại màn hình đăng nhập
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default Login;
