import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";

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
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không đúng định dạng.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
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
      newErrors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
    }

    if (!form.agree) {
      newErrors.agree = "Bạn cần đồng ý với Chính sách và Điều khoản dịch vụ.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== "");
  };

  const getErrorMessage = (error: unknown, defaultMessage: string) => {
    const err = error as any;

    if (err?.data?.errors) {
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

    if (err?.data?.message) {
      return err.data.message;
    }

    if (err?.message) {
      if (err.message === "Failed to fetch") {
        return "Không thể kết nối tới máy chủ. Hãy kiểm tra backend Laravel đã chạy chưa.";
      }
      return err.message;
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

      setStep("OTP");
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
      await fetchApi("/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          otp,
        }),
      });

      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Xác thực OTP thất bại.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setApiError("");

    try {
      await fetchApi("/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
        }),
      });

      alert("Đã gửi lại mã OTP. Vui lòng kiểm tra email.");
    } catch (error: unknown) {
      setApiError(
        getErrorMessage(error, "Gửi lại OTP thất bại.")
      );
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
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {step === "REGISTER" ? "Tạo tài khoản" : "Xác thực Email"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {step === "REGISTER"
                ? "Đăng ký tài khoản khách hàng để sử dụng dịch vụ CarService."
                : `Vui lòng nhập mã OTP 6 số được gửi tới email ${form.email}`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {apiError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {apiError}
              </div>
            )}

            {step === "REGISTER" ? (
              <form onSubmit={handleRegisterSubmit} noValidate>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Họ và tên"
                      className={inputClass(errors.fullName)}
                    />

                    {errors.fullName && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Số điện thoại"
                      className={inputClass(errors.phone)}
                    />

                    {errors.phone && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email"
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

                  <div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Xác nhận mật khẩu"
                        className={`${inputClass(errors.confirmPassword)} pr-16`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                      >
                        {showConfirmPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div
                    className={`rounded-xl border p-3.5 transition ${
                      errors.agree
                        ? "border-red-300 bg-red-50/50"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 accent-slate-900 focus:ring-amber-500"
                      />

                      <span
                        className={`text-sm leading-5 ${
                          errors.agree ? "text-red-600" : "text-slate-600"
                        }`}
                      >
                        Tôi đã đọc và đồng ý với{" "}
                        <span
                          className={`font-medium ${
                            errors.agree ? "text-red-700" : "text-slate-900 hover:underline"
                          }`}
                        >
                          Chính sách và Điều khoản dịch vụ
                        </span>{" "}
                        của CarService.
                      </span>
                    </label>

                    {errors.agree && (
                      <p className="mt-2 pl-7 text-xs font-medium text-red-600">
                        {errors.agree}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? "Đang xử lý..." : "Đăng ký"}
                  </button>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <div className="text-center">
                  <p className="text-sm text-slate-500">
                    Đã có tài khoản?
                  </p>

                  <Link
                    to="/login"
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-6 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700"
                  >
                    Đăng nhập
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} noValidate>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setApiError("");
                      }}
                      placeholder="Nhập mã OTP 6 số"
                      autoComplete="one-time-code"
                      className={`${inputClass("")} text-center font-mono text-lg tracking-widest`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? "Đang xử lý..." : "Xác thực"}
                  </button>
                </div>

                <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
                  <p className="text-slate-500">Không nhận được mã?</p>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="font-medium text-amber-600 transition hover:text-amber-700 disabled:opacity-60"
                  >
                    Gửi lại mã
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("REGISTER");
                      setOtp("");
                      setApiError("");
                    }}
                    className="mt-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    Quay lại chỉnh sửa thông tin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Register;