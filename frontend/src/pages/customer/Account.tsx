import Header from "../../components/Header";
import Footer from "../../components/Footer";

function Account() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / TÀI KHOẢN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Thông tin tài khoản
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Quản lý thông tin cá nhân và tài khoản sử dụng dịch vụ CarService.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#20252b] text-2xl font-bold text-white shadow-sm">
                NV
              </div>

              <h2 className="mt-4 text-lg font-bold">
                Nguyễn Văn A
              </h2>

              <p className="mt-1 text-xs text-[#8a949e]">
                Khách hàng
              </p>

              <div className="mt-4 rounded-full bg-[#eef7f0] px-4 py-1.5 text-[10px] font-semibold text-[#39734a]">
                Tài khoản đang hoạt động
              </div>
            </div>

            <div className="my-6 border-t border-[#eef0f2]" />

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Mã khách hàng
                </p>

                <p className="mt-1 text-xs font-semibold">
                  KH-001
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Ngày tham gia
                </p>

                <p className="mt-1 text-xs font-semibold">
                  05/01/2026
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Số xe đã đăng ký
                </p>

                <p className="mt-1 text-xs font-semibold">
                  2 xe
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                    PROFILE
                  </p>

                  <h2 className="mt-1 text-base font-bold">
                    Thông tin cá nhân
                  </h2>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                >
                  Chỉnh sửa
                </button>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Họ và tên
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    Nguyễn Văn A
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Số điện thoại
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    0901 234 567
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Email
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    nguyenvana@gmail.com
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Ngày sinh
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    15/08/2000
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4 md:col-span-2">
                  <p className="text-[10px] text-[#8a949e]">
                    Địa chỉ
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    Hà Nội, Việt Nam
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
              <div className="border-b border-[#eef0f2] px-6 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  ACCOUNT
                </p>

                <h2 className="mt-1 text-base font-bold">
                  Thông tin đăng nhập
                </h2>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div className="rounded-xl border border-[#e5e8ea] bg-[#fafbfb] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Tên tài khoản
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    nguyenvana
                  </p>
                </div>

                <div className="rounded-xl border border-[#e5e8ea] bg-[#fafbfb] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Mật khẩu
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    ••••••••••
                  </p>
                </div>
              </div>

              <div className="border-t border-[#eef0f2] px-6 py-5">
                <button
                  type="button"
                  className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Bảo mật tài khoản
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Không chia sẻ thông tin đăng nhập cho người khác.
                    Thông tin tài khoản được sử dụng để quản lý lịch hẹn
                    và thông tin phương tiện của bạn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Account;