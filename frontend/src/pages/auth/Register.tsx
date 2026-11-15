import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { readReturnLocation, resolveReturnPath, setUserRole } from "./auth";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import { GarageAuthError, GarageAuthLayout, GarageField } from "../../components/GaragePublic";
import { AuthSwitchLink, PasswordInput } from "../../components/auth/PasswordInput";
import { authFieldClass, authLinkRowClass, authPrimaryClass } from "../../components/auth/authStyles";
import { markAuthSession } from "../../services/authPersistence";

type ApiErrorResponse = {
  message?: string;
  data?: {
    message?: string;
    errors?: Record<string, string[] | string>;
  };
};

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

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
    let timer: ReturnType<typeof setTimeout>;
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
        markAuthSession(true);
        setUserRole(response.account.role || "CUSTOMER");
        showToast("Xác thực email thành công! Đang chuyển hướng vào hệ thống...", "success");
        setTimeout(() => {
          // Về lại trang đang đứng trước khi phải đăng nhập/đăng ký (quy tắc chung với trang Đăng nhập).
          navigate(resolveReturnPath(response.account.role || "CUSTOMER", readReturnLocation(location.state)), { replace: true });
        }, 800);
        return;
      }

      showToast("Xác thực email thành công! Vui lòng đăng nhập.", "success");
      setTimeout(() => {
        navigate("/login", { state: location.state });
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

  return <GarageAuthLayout title={step === "REGISTER" ? "Đăng ký" : "Xác thực tài khoản."} description={step === "REGISTER" ? "Đăng ký để quản lý xe và đặt lịch bảo dưỡng." : `Mã xác thực đã gửi đến ${form.email}.`}>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    {apiError && <GarageAuthError message={apiError} />}
    {step === "REGISTER" ? <>
      <form className="grid gap-4" onSubmit={handleRegisterSubmit} noValidate>
        <GarageField htmlFor="reg-name" label="Họ và tên" error={errors.fullName}><input className={authFieldClass} type="text" id="reg-name" name="fullName" autoComplete="name" placeholder="Nguyễn Văn A" value={form.fullName} onChange={handleChange} aria-invalid={!!errors.fullName} /></GarageField>
        <GarageField htmlFor="reg-phone" label="Số điện thoại" error={errors.phone}><input className={authFieldClass} type="tel" id="reg-phone" name="phone" autoComplete="tel" placeholder="0912345678" value={form.phone} onChange={handleChange} aria-invalid={!!errors.phone} /></GarageField>
        <GarageField htmlFor="reg-email" label="Địa chỉ email" error={errors.email}><input className={authFieldClass} type="email" id="reg-email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email} /></GarageField>
        <GarageField htmlFor="reg-password" label="Mật khẩu" error={errors.password}><PasswordInput id="reg-password" name="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={handleChange} aria-invalid={!!errors.password}/></GarageField>
        <PasswordStrengthIndicator password={form.password}/>
        <GarageField htmlFor="reg-confirm" label="Xác nhận mật khẩu" error={errors.confirmPassword}><PasswordInput id="reg-confirm" name="confirmPassword" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={handleChange} aria-invalid={!!errors.confirmPassword}/></GarageField>
        <label className="flex cursor-pointer items-start gap-3 text-xs text-cs-muted [&_input]:mt-0.5 [&_input]:size-4 [&_input]:shrink-0 [&_input]:cursor-pointer [&_input]:accent-[#cf2935]"><input name="agree" type="checkbox" checked={form.agree} onChange={handleChange}/><span>Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của CarService.</span></label>
        {errors.agree && <p className="text-xs font-bold text-[#dc4250]">{errors.agree}</p>}
        <button type="submit" className={authPrimaryClass} disabled={isLoading} aria-busy={isLoading || undefined}>{isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}</button>
      </form>
      <AuthSwitchLink text="Đã có tài khoản?" to="/login" label="Đăng nhập" state={location.state}/>
    </> : <>
      <form className="grid gap-4" onSubmit={handleOtpSubmit} noValidate><OtpInput value={otp} onChange={setOtp} disabled={isLoading} hasError={!!apiError}/><button type="submit" className={authPrimaryClass} disabled={isLoading || otp.length !== 6} aria-busy={isLoading || undefined}>{isLoading ? "Đang xác minh..." : "Xác thực email →"}</button></form>
      <div className={authLinkRowClass}>{resendCountdown > 0 ? <span>Gửi lại OTP sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại OTP</button>}<button type="button" onClick={() => {setStep("REGISTER");setOtp("");setApiError("");}}>← Chỉnh sửa thông tin</button></div>
    </>}
  </GarageAuthLayout>;

}

export default Register;
