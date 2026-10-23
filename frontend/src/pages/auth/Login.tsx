
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { getRoleManagementPage, setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import { AtelierAuthError, AtelierAuthLayout, AtelierField } from "../../components/AtelierPublic";

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
            requestedPath === "/admin"
          : role === "ADVISOR"
            ? requestedPath.startsWith("/advisor/")
            : role === "TECHNICIAN"
              ? requestedPath === "/technician" ||
                requestedPath.startsWith("/technician/")
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

  return <AtelierAuthLayout title={step === "login" ? "Chào mừng trở lại." : "Xác thực email."} description={step === "login" ? "Đăng nhập để tiếp tục công việc hoặc theo dõi xe của bạn." : `Nhập mã OTP được gửi tới ${pendingEmail}.`}>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    {apiError && <AtelierAuthError message={apiError} />}
    {step === "login" ? <>
      <form className="at-form-stack" onSubmit={handleSubmit} noValidate>
        <AtelierField htmlFor="login-email" label="Địa chỉ email" error={errors.email}><input id="login-email" name="email" type="email" autoComplete="username" className="at-control" placeholder="you@example.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email}/></AtelierField>
        <AtelierField htmlFor="login-password" label="Mật khẩu" error={errors.password}><div className="at-password-wrap"><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="at-control" placeholder="Nhập mật khẩu" value={form.password} onChange={handleChange} aria-invalid={!!errors.password}/><button type="button" className="at-show-password" onClick={() => setShowPassword(s => !s)}>{showPassword ? "Ẩn" : "Hiện"}</button></div></AtelierField>
        <div className="at-form-meta"><Link to="/forgot-password">Quên mật khẩu?</Link><span>Đăng nhập bảo mật</span></div>
        <button type="submit" className="at-btn at-btn-primary at-large at-full" disabled={isLoading}>{isLoading ? "Đang đăng nhập..." : "Đăng nhập →"}</button>
      </form>
      <p className="at-auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </> : <>
      <form className="at-form-stack" onSubmit={handleOtpSubmit} noValidate><OtpInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!apiError}/><button className="at-btn at-btn-primary at-large at-full" type="submit" disabled={isLoading || otp.length !== 6}>{isLoading ? "Đang xác thực..." : "Xác nhận mã OTP →"}</button></form>
      <div className="at-otp-tools">{resendCountdown > 0 ? <span>Gửi lại mã sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại mã OTP</button>}<button type="button" onClick={() => {setStep("login");setOtp("");setApiError("");}}>← Quay lại đăng nhập</button></div>
    </>}
  </AtelierAuthLayout>;

}

export default Login;
