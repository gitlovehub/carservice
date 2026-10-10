import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { setUserRole } from "./auth";

type Step = "login" | "otp";
type ApiErrorDetails = {
  message?: string;
  errors?: Record<string, string[]>;
};

const getApiErrorDetails = (error: unknown): ApiErrorDetails => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return {};
  }

  const data = error.data;
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

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
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
    setStep("otp");
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
          email: form.email,
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
        goToDashboard(response.account.role);
        return;
      }

      setApiError("Không nhận được thông tin đăng nhập.");
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
          setApiError(
            resendDetails.message ||
              "Không gửi được mã OTP. Vui lòng thử gửi lại.",
          );
        }
        return;
      }

      setApiError(emailErrors[0] || backendMessage || "Đăng nhập thất bại.");
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
        goToDashboard(finalAccount.role);
        return;
      }

      if (finalToken) {
        localStorage.setItem("token", finalToken);
        goToDashboard("CUSTOMER");
        return;
      }

      setApiError("Xác thực OTP thất bại.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(
        details.errors?.otp?.[0] ||
          details.message ||
          "Mã OTP không hợp lệ."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) {
      setApiError("Không có email để gửi lại OTP.");
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      setApiError("");
      alert("Mã OTP mới đã được gửi đến email của bạn.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      setApiError(details.message || "Không thể gửi lại OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (error: string) =>
    `h-12 w-full rounded-xl border px-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:ring-2 ${
      error
        ? "border-red-300 bg-red-50/50 text-red-900 focus:border-red-500 focus:ring-red-100"
        : "border-slate-200 bg-white focus:border-amber-500 focus:ring-amber-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              🚗
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">CarService</p>
              <p className="text-[10px] text-slate-500">
                Dịch vụ chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {step === "login" ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Đăng nhập
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Đăng nhập để quản lý lịch hẹn và thông tin xe của bạn.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                {apiError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                    {apiError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Địa chỉ email"
                      className={inputClass(errors.email)}
                    />

                    {errors.email && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Mật khẩu"
                        className={`${inputClass(errors.password)} pr-16`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-slate-500 transition hover:text-amber-600"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <div className="text-center">
                  <Link
                    to="/register"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700"
                  >
                    Đăng ký
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Xác thực OTP
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Mã OTP đã được gửi tới <br />
                  <span className="font-semibold text-slate-800">{pendingEmail}</span>
                </p>
              </div>

              {apiError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleOtpSubmit} noValidate>
                <div className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Nhập mã OTP 6 số"
                    className={inputClass("")}
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? "Đang xác thực..." : "Xác nhận"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="w-full text-sm font-medium text-amber-600 transition hover:text-amber-700 disabled:opacity-60"
                  >
                    Gửi lại mã OTP
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("login");
                      setOtp("");
                      setApiError("");
                    }}
                    className="w-full text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Login;