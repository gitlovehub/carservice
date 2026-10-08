import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { setUserRole } from "./auth";

type Step = "login" | "otp";

function Login() {
  const navigate = useNavigate();

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

    navigate("/customer");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

      if (response?.account) {
        await sendOtpForPendingAccount(
          response.account.email || form.email.trim(),
          response.token || ""
        );
        return;
      }

      setApiError("Không nhận được thông tin đăng nhập.");
    } catch (error: any) {
      const backendMessage = error?.data?.message || "";
      const emailErrors = error?.data?.errors?.email || [];
      const otpErrors = error?.data?.errors?.otp || [];

      if (
        backendMessage.toLowerCase().includes("xác thực") ||
        backendMessage.toLowerCase().includes("otp") ||
        emailErrors.some((msg: string) => /otp|xác thực|chưa/i.test(msg)) ||
        otpErrors.length > 0
      ) {
        await sendOtpForPendingAccount(form.email.trim());
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
    } catch (error: any) {
      setApiError(
        error?.data?.errors?.otp?.[0] ||
          error?.data?.message ||
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
    } catch (error: any) {
      setApiError(error?.data?.message || "Không thể gửi lại OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (error: string) =>
    `h-12 w-full rounded-xl border px-4 text-sm text-[#20252B] outline-none transition placeholder:text-[#8A949E] ${
      error
        ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-[#D9DDE1] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
    }`;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <header className="border-b border-[#E1E4E6] bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-white">
              🚗
            </div>

            <div>
              <p className="text-sm font-bold">CarService</p>
              <p className="text-[10px] text-[#8A949E]">
                Dịch vụ chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {step === "login" ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-[28px] font-bold tracking-tight text-[#20252B]">
                  Đăng nhập
                </h1>

                <p className="mt-2 text-sm text-[#66717C]">
                  Đăng nhập để quản lý lịch hẹn và thông tin xe của bạn.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.06)]"
              >
                {apiError && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-100 text-center">
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
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
                    className="h-12 w-full rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70"
                  >
                    {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#66717C] transition hover:text-[#D6A85F]"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="my-6 border-t border-[#E5E7E9]" />

                <div className="text-center">
                  <Link
                    to="/register"
                    className="mt-3 inline-flex h-11 items-center justify-center w-full rounded-xl border border-[#D6A85F] px-6 text-sm font-semibold text-[#3A3020] transition hover:bg-[#F3E8D2]"
                  >
                    Đăng ký tài khoản
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.06)]">
              <div className="mb-6 text-center">
                <h2 className="text-[28px] font-bold tracking-tight text-[#20252B]">
                  Xác thực OTP
                </h2>
                <p className="mt-2 text-sm text-[#66717C]">
                  Mã OTP đã được gửi tới <br />
                  <span className="font-semibold text-[#20252B]">{pendingEmail}</span>
                </p>
              </div>

              {apiError && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-100 text-center">
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
                    className="h-12 w-full rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70"
                  >
                    {isLoading ? "Đang xác thực..." : "Xác nhận"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="w-full text-sm font-medium text-[#D6A85F] transition hover:text-[#B8892E] disabled:opacity-70"
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
                    className="w-full text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
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