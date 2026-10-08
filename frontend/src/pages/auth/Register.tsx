import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  apiRequest,
  getApiErrorMessage,
  initializeCsrfCookie,
} from "../../lib/api";

type RegisterFields = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type RegistrationResponse = {
  message: string;
  email: string;
  debug_otp?: string;
};

type VerificationResponse = {
  message: string;
  token?: string;
};

const inputClass =
  "h-12 w-full rounded-xl border border-[#D9DDE1] px-4 text-sm text-[#20252B] outline-none transition placeholder:text-[#8A949E] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<RegisterFields>({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterFields, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState(
    () => searchParams.get("email") ?? "",
  );
  const [verificationMode, setVerificationMode] = useState(
    () => searchParams.get("verify") === "1",
  );
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof RegisterFields, string>> = {};
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (form.fullName.trim().length < 2 || form.fullName.trim().length > 100) {
      errors.fullName = "Họ tên cần có từ 2 đến 100 ký tự.";
    }
    if (!/^(0|\+84)[35789][0-9]{8}$/.test(phone)) {
      errors.phone = "Số điện thoại không đúng định dạng Việt Nam.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Vui lòng nhập email hợp lệ.";
    }
    if (form.password.length < 8) {
      errors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }
    if (!form.acceptTerms) {
      errors.acceptTerms = "Bạn cần đồng ý với điều khoản dịch vụ.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, checked, type } = event.target;
    const field = name as keyof RegisterFields;
    setForm((current) => ({
      ...current,
      [field]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await initializeCsrfCookie();
      const response = await apiRequest<RegistrationResponse>("/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.confirmPassword,
          device_name: "CarService Web",
          accept_terms: true,
        }),
      });
      setVerificationEmail(response.email);
      setVerificationMode(true);
      setOtp(response.debug_otp ?? "");
      setDebugOtp(response.debug_otp ?? "");
      setNotice(response.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) {
      setError("Vui lòng nhập email đã đăng ký.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Mã OTP phải gồm 6 chữ số.");
      return;
    }

    setSubmitting(true);
    try {
      await initializeCsrfCookie();
      const response = await apiRequest<VerificationResponse>("/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: verificationEmail, otp }),
      });
      if (!response.token) {
        navigate("/login", {
          state: { successMessage: "Email đã được xác thực. Vui lòng đăng nhập." },
        });
        return;
      }
      localStorage.setItem("authToken", response.token);
      localStorage.setItem("isLoggedIn", "true");
      navigate("/customer", {
        state: { successMessage: "Xác thực thành công. Tài khoản của bạn đã sẵn sàng." },
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) {
      setError("Vui lòng nhập email đã đăng ký.");
      return;
    }
    setSubmitting(true);
    try {
      await initializeCsrfCookie();
      const response = await apiRequest<{
        message: string;
        debug_otp?: string;
      }>("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: verificationEmail }),
      });
      setOtp(response.debug_otp ?? "");
      setDebugOtp(response.debug_otp ?? "");
      setNotice(response.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldError = (field: keyof RegisterFields) =>
    fieldErrors[field] ? (
      <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors[field]}</p>
    ) : null;

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
              <p className="text-[10px] text-[#8A949E]">Dịch vụ chăm sóc ô tô</p>
            </div>
          </Link>
          <Link to="/" className="text-sm font-medium text-[#66717C] hover:text-[#20252B]">
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 text-center">
            <h1 className="text-[28px] font-bold tracking-tight text-[#20252B]">
              {verificationMode ? "Xác thực email" : "Tạo tài khoản"}
            </h1>
            <p className="mt-2 text-sm text-[#66717C]">
              {verificationMode
                ? verificationEmail
                  ? `Nhập mã 6 chữ số đã gửi đến ${verificationEmail}. Mã có hiệu lực trong 5 phút.`
                  : "Nhập email đã đăng ký và mã OTP được gửi tới email. Mã có hiệu lực trong 5 phút."
                : "Đăng ký tài khoản khách hàng để sử dụng dịch vụ CarService."}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.06)] sm:p-6">
            {error && (
              <div role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                {notice}
              </div>
            )}
            {verificationMode && debugOtp && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">
                  OTP kiểm thử (chỉ bật ở môi trường local)
                </p>
                <p className="mt-1 select-all text-2xl font-bold tracking-[0.3em] text-amber-950">
                  {debugOtp}
                </p>
              </div>
            )}

            {verificationMode ? (
              <form onSubmit={handleVerify} className="space-y-4">
                {!verificationEmail && (
                  <label htmlFor="verification-email" className="block text-sm font-semibold">
                    Email đã đăng ký
                    <input
                      id="verification-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={verificationEmail}
                      onChange={(event) => setVerificationEmail(event.target.value)}
                      placeholder="Email"
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                )}
                <label htmlFor="otp" className="block text-sm font-semibold">
                  Mã xác thực OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Nhập mã gồm 6 chữ số"
                  className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-50"
                >
                  {submitting ? "Đang xác thực..." : "Xác thực và tiếp tục"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleResendOtp()}
                  className="w-full py-2 text-sm font-semibold text-[#66717C] hover:text-[#20252B] disabled:opacity-50"
                >
                  Gửi lại mã OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={handleFieldChange}
                    placeholder="Họ và tên"
                    className={inputClass}
                    aria-label="Họ và tên"
                  />
                  {renderFieldError("fullName")}
                </div>
                <div>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleFieldChange}
                    placeholder="Số điện thoại"
                    className={inputClass}
                    aria-label="Số điện thoại"
                  />
                  {renderFieldError("phone")}
                </div>
                <div>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleFieldChange}
                    placeholder="Email"
                    className={inputClass}
                    aria-label="Email"
                  />
                  {renderFieldError("email")}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleFieldChange}
                    placeholder="Mật khẩu (ít nhất 8 ký tự)"
                    className={`${inputClass} pr-16`}
                    aria-label="Mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#66717C]"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                  {renderFieldError("password")}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleFieldChange}
                    placeholder="Xác nhận mật khẩu"
                    className={`${inputClass} pr-16`}
                    aria-label="Xác nhận mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#66717C]"
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                  {renderFieldError("confirmPassword")}
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F7F7F5] p-3 text-sm leading-5 text-[#66717C]">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={form.acceptTerms}
                      onChange={handleFieldChange}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#1F2933]"
                    />
                    <span>
                      Tôi đã đọc và đồng ý với{" "}
                      <span className="font-medium text-[#20252B]">
                        Chính sách và Điều khoản dịch vụ
                      </span>{" "}
                      của CarService.
                    </span>
                  </label>
                  {renderFieldError("acceptTerms")}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-[#1F2933] text-sm font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-50"
                >
                  {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
                </button>
              </form>
            )}

            <div className="my-6 border-t border-[#E5E7E9]" />
            <div className="text-center">
              <p className="text-sm text-[#66717C]">Đã có tài khoản?</p>
              <Link
                to="/login"
                className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-[#D6A85F] px-6 text-sm font-semibold text-[#3A3020] transition hover:bg-[#F3E8D2]"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Register;
