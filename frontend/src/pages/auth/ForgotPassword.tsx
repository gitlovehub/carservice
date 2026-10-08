import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
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
            {!submitted ? (
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

                <form onSubmit={handleSubmit}>
                  <label className="text-[11px] font-semibold text-[#66717C]">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Nhập email của bạn"
                    className="mt-2 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-3 text-[12px] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                  />

                  <button
                    type="submit"
                    className="mt-5 w-full cursor-pointer rounded-xl bg-[#1F2933] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#151D24]"
                  >
                    Gửi yêu cầu
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
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF7EF] text-xl text-[#3F7047]">
                  ✓
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  ĐÃ GỬI YÊU CẦU
                </p>

                <h1 className="mt-2 text-2xl font-bold">
                  Kiểm tra email
                </h1>

                <p className="mt-3 text-[12px] leading-5 text-[#7A838C]">
                  Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại
                  mật khẩu sẽ được gửi đến email của bạn.
                </p>

                <Link
                  to="/login"
                  className="mt-6 inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-5 py-3 text-[12px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Quay lại đăng nhập
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