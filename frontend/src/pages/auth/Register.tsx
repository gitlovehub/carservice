import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/login");
  };

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
              <p className="text-[9px] text-[#8A949E]">
                Dịch vụ chăm sóc ô tô
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="text-[11px] font-semibold text-[#66717C] hover:text-[#20252B]"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8D2] text-xl">
              ✨
            </div>

            <h1 className="text-2xl font-bold text-[#20252B]">
              Tạo tài khoản
            </h1>

            <p className="mt-2 text-xs text-[#66717C]">
              Đăng ký tài khoản khách hàng để sử dụng dịch vụ CarService.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Họ và tên
                </label>

                <input
                  type="text"
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Số điện thoại
                </label>

                <input
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="Nhập email"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Tên đăng nhập
                </label>

                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Mật khẩu
                </label>

                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Xác nhận mật khẩu
                </label>

                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  className="w-full rounded-xl border border-[#E1E4E6] px-4 py-3 text-xs outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-[#1F2933] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
              >
                Đăng ký
              </button>
            </div>

            <div className="mt-6 border-t border-[#E1E4E6] pt-5 text-center">
              <p className="text-[11px] text-[#66717C]">
                Đã có tài khoản?
              </p>

              <Link
                to="/login"
                className="mt-2 inline-block text-[11px] font-semibold text-[#3A3020] hover:text-[#D6A85F]"
              >
                Đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Register;