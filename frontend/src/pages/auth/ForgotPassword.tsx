import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchApi } from "../../services/api";
import OtpInput from "../../components/auth/OtpInput";
import Toast, { type ToastType } from "../../components/auth/Toast";
import PasswordStrengthIndicator from "../../components/auth/PasswordStrengthIndicator";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [step, setStep] = useState<"FORGOT" | "RESET" | "SUCCESS">("FORGOT");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Countdown timer cho gửi lại OTP (60s)
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

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Vui lòng nhập địa chỉ email đã đăng ký.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Email không đúng định dạng.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      setStep("RESET");
      showToast("Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.", "info");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setErrorMsg(error.data?.message || "Đã xảy ra sự cố kết nối. Vui lòng thử lại.");
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
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Vui lòng nhập mật khẩu mới.");
      return;
    } else if (newPassword.length < 8) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    } else if (!passwordUppercase.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ cái viết hoa.");
      return;
    } else if (!passwordLowercase.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ cái viết thường.");
      return;
    } else if (!passwordNumber.test(newPassword)) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 1 chữ số.");
      return;
    }

    if (!confirmPassword) {
      setErrorMsg("Vui lòng xác nhận lại mật khẩu mới.");
      return;
    } else if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

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
      const error = err as {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };
      setErrorMsg(
        error.data?.errors?.password?.[0] || 
        error.data?.errors?.otp?.[0] || 
        error.data?.message || 
        "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendCountdown(60);
      showToast("Mã OTP mới đã được gửi lại vào email của bạn.", "success");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setErrorMsg(error.data?.message || "Không thể gửi lại mã OTP lúc này.");
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
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-6">
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

          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
          >
            <span>← Quay lại Đăng nhập</span>
          </Link>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[480px]">
          <div className="rounded-3xl border border-[#E1E4E6] bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(31,41,51,0.06)]">
            
            {errorMsg && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-700 flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* BƯỚC 1: NHẬP EMAIL */}
            {step === "FORGOT" && (
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]"></span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                      KHÔI PHỤC TÀI KHOẢN
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#20252B]">
                    Quên mật khẩu?
                  </h1>
                  <p className="mt-2 text-xs text-[#7A838C] leading-relaxed">
                    Nhập địa chỉ email đã đăng ký của bạn. Hệ thống sẽ gửi mã xác thực OTP 6 số để bạn tiến hành đặt lại mật khẩu mới an toàn.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                      Địa chỉ Email tài khoản
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setErrorMsg("");
                      }}
                      placeholder="vidu@carservice.vn"
                      className="h-12 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang gửi mã xác thực...</span>
                      </>
                    ) : (
                      <span>Gửi mã xác thực OTP</span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs text-[#7A838C]">
                  Nhớ lại mật khẩu?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#D6A85F] hover:text-[#B58941] transition"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              </div>
            )}

            {/* BƯỚC 2: NHẬP OTP 6 SỐ & MẬT KHẨU MỚI */}
            {step === "RESET" && (
              <div>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#E5B869] text-xl text-[#D6A85F]">
                    🔐
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#20252B]">
                    Đặt lại mật khẩu mới
                  </h1>
                  <p className="mt-1.5 text-xs text-[#7A838C]">
                    Mã OTP đã gửi tới <strong className="text-[#20252B]">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {/* OTP 6 số tự động nhảy ô */}
                  <div>
                    <label className="block text-center text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-2.5">
                      Nhập mã OTP 6 số
                    </label>
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      disabled={isLoading}
                      hasError={Boolean(errorMsg && errorMsg.includes("OTP"))}
                    />
                  </div>

                  {/* Nút gửi lại OTP */}
                  <div className="text-center text-xs pb-1">
                    {resendCountdown > 0 ? (
                      <span className="text-[#8A949E] font-medium">
                        Gửi lại mã mới sau:{" "}
                        <strong className="text-[#D6A85F]">{resendCountdown}s</strong>
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

                  {/* Mật khẩu mới */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrorMsg("");
                        }}
                        placeholder="Mật khẩu mới (>= 8 ký tự)"
                        className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-12 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
                      >
                        {showPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>
                  </div>

                  {/* Nhập lại mật khẩu mới */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrorMsg("");
                        }}
                        placeholder="Nhập lại mật khẩu mới"
                        className="h-11 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-12 text-sm text-[#20252B] placeholder:text-[#9EA8B3] outline-none transition duration-200 focus:bg-white focus:border-[#D6A85F] focus:ring-4 focus:ring-[#D6A85F]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition"
                      >
                        {showConfirmPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>
                  </div>

                  {/* Thanh đo độ mạnh mật khẩu */}
                  <PasswordStrengthIndicator password={newPassword} />

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6 || !newPassword}
                    className="mt-3 h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang cập nhật mật khẩu...</span>
                      </>
                    ) : (
                      <span>Lưu mật khẩu mới</span>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("FORGOT");
                        setOtp("");
                        setErrorMsg("");
                      }}
                      className="text-xs font-semibold text-[#8A949E] hover:text-[#20252B] transition cursor-pointer"
                    >
                      ← Nhập lại địa chỉ email
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* BƯỚC 3: THÀNH CÔNG */}
            {step === "SUCCESS" && (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl text-emerald-600 shadow-inner">
                  ✓
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-[#20252B]">
                  Đổi mật khẩu thành công!
                </h2>

                <p className="mt-2 text-xs sm:text-sm text-[#7A838C] leading-relaxed max-w-sm mx-auto">
                  Mật khẩu tài khoản của bạn đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới này để đăng nhập ngay bây giờ.
                </p>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="h-12 w-full cursor-pointer rounded-xl bg-[#1F2933] text-sm font-bold text-white transition hover:bg-slate-800 shadow-md"
                  >
                    Đăng nhập vào hệ thống →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default ForgotPassword;