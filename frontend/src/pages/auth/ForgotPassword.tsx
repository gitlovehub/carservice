import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import OtpInput from "../../components/auth/OtpInput";
import { LostEmailLink } from "../../components/auth/VerifyEmailPrompt";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";
import { GarageAuthLayout, GarageField } from "../../components/GaragePublic";
import { AuthSwitchLink, PasswordInput } from "../../components/auth/PasswordInput";
import { authFieldClass, authLinkRowClass, authPrimaryClass } from "../../components/auth/authStyles";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { focusFirstInvalid } from "../../components/ui/focusInvalid";
import { API_ERROR_MARK, splitApiErrors } from "../../components/ui/formValidation";

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useAppFeedback();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState<"FORGOT" | "RESET" | "SUCCESS">("FORGOT");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ email?: string; otp?: string; password?: string; confirm?: string }>({});

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

  /** Lỗi từ server: lỗi nhập liệu về dưới ô, lỗi nghiệp vụ ra một toast, rồi đưa người dùng tới ô sai. */
  const failWith = (error: unknown, fallback: string) => {
    const { fields, toast } = splitApiErrors(error, { email: "email", otp: "otp", password: "password", password_confirmation: "confirm" }, fallback);
    const invalid = toast && /OTP/i.test(toast) ? { ...fields, otp: fields.otp ?? API_ERROR_MARK } : fields;
    setFieldError(invalid);
    if (toast) notify(toast, "error");
    if (Object.keys(invalid).length) focusFirstInvalid();
  };

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setFieldError({ email: "Vui lòng nhập địa chỉ email đã đăng ký." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError({ email: "Email không đúng định dạng." });
      return;
    }

    setIsLoading(true);
    setFieldError({});

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      setStep("RESET");
      showToast("Đã gửi mã OTP. Vui lòng kiểm tra hộp thư email của bạn.", "success");
    } catch (err: unknown) {
      failWith(err, "Không thể gửi mã OTP. Vui lòng thử lại sau giây lát.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordUppercase = /[A-Z]/;
    const passwordLowercase = /[a-z]/;
    const passwordNumber = /[0-9]/;

    if (!otp || otp.length !== 6) {
      setFieldError({ otp: "Vui lòng nhập đủ 6 chữ số mã OTP." });
      return;
    }

    if (!newPassword) {
      setFieldError({ password: "Vui lòng nhập mật khẩu mới." });
      return;
    } else if (newPassword.length < 8) {
      setFieldError({ password: "Mật khẩu mới phải có ít nhất 8 ký tự." });
      return;
    } else if (!passwordUppercase.test(newPassword)) {
      setFieldError({ password: "Mật khẩu mới phải có ít nhất 1 chữ cái viết hoa." });
      return;
    } else if (!passwordLowercase.test(newPassword)) {
      setFieldError({ password: "Mật khẩu mới phải có ít nhất 1 chữ cái viết thường." });
      return;
    } else if (!passwordNumber.test(newPassword)) {
      setFieldError({ password: "Mật khẩu mới phải có ít nhất 1 chữ số." });
      return;
    }

    if (!confirmPassword) {
      setFieldError({ confirm: "Vui lòng xác nhận lại mật khẩu mới." });
      return;
    } else if (newPassword !== confirmPassword) {
      setFieldError({ confirm: "Mật khẩu xác nhận không trùng khớp." });
      return;
    }

    setIsLoading(true);
    setFieldError({});

    try {
      await fetchApi("/reset-password", {
        method: "POST",
        body: JSON.stringify({ 
          email: email.trim(),
          otp,
          password: newPassword,
          password_confirmation: confirmPassword
        }),
      });
      setStep("SUCCESS");
      showToast("Đặt lại mật khẩu thành công!", "success");
    } catch (err: unknown) {
      failWith(err, "Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setFieldError({});

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      showToast("Đã gửi lại mã OTP. Vui lòng kiểm tra hộp thư email của bạn.", "success");
    } catch (err: unknown) {
      failWith(err, "Không thể gửi lại mã OTP. Vui lòng thử lại sau giây lát.");
    } finally {
      setIsLoading(false);
    }
  };

  return <GarageAuthLayout title={step === "FORGOT" ? "Khôi phục mật khẩu" : step === "RESET" ? "Đặt lại mật khẩu" : "Hoàn tất xác thực"} description={step === "FORGOT" ? "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu." : step === "RESET" ? `Mã OTP đã gửi tới ${email}.` : "Mật khẩu của bạn đã được cập nhật thành công."}>
    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    {step === "FORGOT" && <><form className="grid gap-4" onSubmit={handleForgotSubmit} noValidate>
      <GarageField htmlFor="fp-email" label="Email đã đăng ký" error={fieldError.email}><input id="fp-email" type="email" className={authFieldClass} autoComplete="email" placeholder="you@example.com" value={email} onChange={e => {setEmail(e.target.value); setFieldError({});}} /></GarageField>
      <button type="submit" className={authPrimaryClass} disabled={isLoading || !email.trim()} aria-busy={isLoading || undefined}>{isLoading ? "Đang gửi mã..." : "Gửi mã xác thực OTP →"}</button></form>
      <p className="mt-3 text-center"><LostEmailLink/></p>
      <AuthSwitchLink text="Nhớ mật khẩu?" to="/login" label="Đăng nhập ngay" state={location.state}/>
    </>}
    {step === "RESET" && <><form className="grid gap-4" onSubmit={handleResetSubmit} noValidate>
      <GarageField label="Mã OTP 6 số" error={fieldError.otp}><OtpInput value={otp} onChange={value => { setOtp(value); setFieldError({}); }} disabled={isLoading} hasError={!!fieldError.otp}/></GarageField>
      <GarageField htmlFor="fp-new-password" label="Mật khẩu mới" error={fieldError.password}><PasswordInput id="fp-new-password" autoComplete="new-password" placeholder="Ít nhất 8 ký tự" value={newPassword} onChange={e => {setNewPassword(e.target.value);setFieldError({});}}/></GarageField>
      <PasswordStrengthIndicator password={newPassword}/>
      <GarageField htmlFor="fp-confirm-password" label="Nhập lại mật khẩu" error={fieldError.confirm}><PasswordInput id="fp-confirm-password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={e => {setConfirmPassword(e.target.value);setFieldError({});}}/></GarageField>
      <button type="submit" className={authPrimaryClass} disabled={isLoading || otp.length !== 6 || !newPassword} aria-busy={isLoading || undefined}>{isLoading ? "Đang đặt lại mật khẩu..." : "Lưu mật khẩu mới →"}</button></form>
      <div className={authLinkRowClass}>{resendCountdown > 0 ? <span>Gửi lại mã sau {resendCountdown}s</span> : <button type="button" onClick={handleResendOtp} disabled={isLoading}>Gửi lại mã OTP</button>}<button type="button" onClick={() => {setStep("FORGOT");setOtp("");setFieldError({});}}>← Thay đổi email</button></div>
    </>}
    {step === "SUCCESS" && <><div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" role="status"><Icon name="check" size={18}/>Mật khẩu đã cập nhật thành công.</div><button type="button" className={authPrimaryClass} onClick={() => navigate('/login', { state: location.state })}>Đăng nhập vào hệ thống →</button></>}
  </GarageAuthLayout>;

}

export default ForgotPassword;
