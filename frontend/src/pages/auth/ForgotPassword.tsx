import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [step, setStep] = useState<"FORGOT" | "RESET" | "SUCCESS">("FORGOT");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      // The API always returns success message
      setStep("RESET");
    } catch (error: any) {
      setErrorMsg(error.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
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
      setErrorMsg("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Vui lòng nhập mật khẩu mới.");
      return;
    } else if (newPassword.length < 8) {
      setErrorMsg("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    } else if (!passwordUppercase.test(newPassword)) {
      setErrorMsg("Mật khẩu phải có ít nhất 1 chữ cái viết hoa.");
      return;
    } else if (!passwordLowercase.test(newPassword)) {
      setErrorMsg("Mật khẩu phải có ít nhất 1 chữ cái viết thường.");
      return;
    } else if (!passwordNumber.test(newPassword)) {
      setErrorMsg("Mật khẩu phải có ít nhất 1 chữ số.");
      return;
    }

    if (!confirmPassword) {
      setErrorMsg("Vui lòng xác nhận lại mật khẩu.");
      return;
    } else if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await fetchApi("/reset-password", {
        method: "POST",
        body: JSON.stringify({ 
          email,
          otp,
          password: newPassword,
          password_confirmation: confirmPassword
        }),
      });
      setStep("SUCCESS");
    } catch (error: any) {
      setErrorMsg(
        error.data?.errors?.new_password?.[0] || 
        error.data?.message || 
        "Đặt lại mật khẩu thất bại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[430px]">
          <Link
            to="/"
            className="mb-8 flex cursor-pointer items-center justify-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2933] text-lg text-white">
              🚗
            </div>

            <div>
              <p className="text-left text-[15px] font-bold">
                CarService
              </p>

              <p className="text-left text-[10px] text-[#7A838C]">
                Chăm sóc xe chuyên nghiệp
              </p>
            </div>
          </Link>

          <div className="rounded-3xl border border-[#E1E4E6] bg-white p-7 shadow-sm">
            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            {step === "FORGOT" && (
              <>
                <div className="mb-6">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    KHÔI PHỤC TÀI KHOẢN
                  </p>

                  <h1 className="text-2xl font-bold">
                    Quên mật khẩu?
                  </h1>

                  <p className="mt-2 text-[12px] leading-5 text-[#7A838C]">
                    Nhập email đã đăng ký để nhận hướng dẫn đặt lại
                    mật khẩu.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit}>
                  <label className="text-[11px] font-semibold text-[#66717C]">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrorMsg("");
                    }}
                    placeholder="Nhập email của bạn"
                    className="mt-2 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 text-[12px] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-5 w-full cursor-pointer rounded-xl bg-[#1F2933] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70"
                  >
                    {isLoading ? "Đang xử lý..." : "Gửi yêu cầu"}
                  </button>
                </form>

                <Link
                  to="/login"
                  className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-[11px] font-medium text-[#66717C] transition hover:text-[#20252B]"
                >
                  <span>←</span>
                  Quay lại đăng nhập
                </Link>
              </>
            )}

            {step === "RESET" && (
              <>
                <div className="mb-6">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    MẬT KHẨU MỚI
                  </p>

                  <h1 className="text-2xl font-bold">
                    Đặt lại mật khẩu
                  </h1>

                  <p className="mt-2 text-[12px] leading-5 text-[#7A838C]">
                    Nhập mã OTP gồm 6 chữ số được gửi đến email {email} và mật khẩu mới của bạn.
                  </p>
                </div>

                <form onSubmit={handleResetSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-[#66717C]">Mã OTP</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value); setErrorMsg(""); }}
                        placeholder="Nhập mã 6 số"
                        autoComplete="one-time-code"
                        className="mt-2 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 text-[12px] text-center font-mono tracking-widest outline-none transition focus:border-[#D6A85F] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#66717C]">Mật khẩu mới</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setErrorMsg(""); }}
                          placeholder="Mật khẩu mới"
                          className="mt-2 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 pr-16 text-[12px] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
                        >
                          {showPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#66717C]">Xác nhận mật khẩu mới</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(""); }}
                          placeholder="Xác nhận mật khẩu"
                          className="mt-2 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 pr-16 text-[12px] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-medium text-[#66717C] transition hover:text-[#20252B]"
                        >
                          {showConfirmPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-5 w-full cursor-pointer rounded-xl bg-[#1F2933] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#151D24] disabled:opacity-70"
                  >
                    {isLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                  </button>
                </form>

                <button
                  onClick={() => setStep("FORGOT")}
                  className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 text-[11px] font-medium text-[#66717C] transition hover:text-[#20252B]"
                >
                  <span>←</span>
                  Sử dụng email khác
                </button>
              </>
            )}

            {step === "SUCCESS" && (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF7EF] text-xl text-[#3F7047]">
                  ✓
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  THÀNH CÔNG
                </p>

                <h1 className="mt-2 text-2xl font-bold">
                  Đã cập nhật
                </h1>

                <p className="mt-3 text-[12px] leading-5 text-[#7A838C]">
                  Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập.
                </p>

                <Link
                  to="/login"
                  className="mt-6 inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-5 py-3 text-[12px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;