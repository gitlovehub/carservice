function Account() {
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">

        {/* HEADER */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            KHÁCH HÀNG / TÀI KHOẢN
          </p>

          <h1 className="text-[28px] font-bold">
            Tài khoản của tôi
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Xem và cập nhật thông tin cá nhân, bảo mật tài khoản.
          </p>
        </div>

        {/* THÔNG TIN CÁ NHÂN */}
        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">

          <h2 className="mb-6 text-[15px] font-bold">
            Thông tin cá nhân
          </h2>

          <div className="grid gap-6 md:grid-cols-3">

            <div>
              <p className="mb-2 text-[11px] text-[#8a949e]">
                Họ và tên
              </p>

              <p className="text-[13px] font-semibold">
                Nguyễn Tiến Hiền
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] text-[#8a949e]">
                Số điện thoại
              </p>

              <p className="text-[13px] font-semibold">
                0901234567
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] text-[#8a949e]">
                Email
              </p>

              <p className="text-[13px] font-semibold">
                nguyentienhien@gmail.com
              </p>
            </div>

          </div>

          {/* ACTION */}
          <div className="mt-8 flex flex-wrap gap-3">

            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Cập nhật thông tin
            </button>

            <button
              type="button"
              className="rounded-lg border border-[#dfe3e6] px-5 py-3 text-[12px] font-medium hover:bg-[#f5f5f5]"
            >
              Đổi mật khẩu
            </button>

          </div>
        </div>

        {/* TRUY CẬP TÀI KHOẢN */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white p-6">

          <h2 className="mb-2 text-[15px] font-bold">
            Truy cập tài khoản
          </h2>

          <p className="mb-6 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            ĐĂNG KÝ / ĐĂNG NHẬP
          </p>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Đăng ký
            </button>

            <button
              type="button"
              className="rounded-lg border border-[#dfe3e6] px-5 py-3 text-[12px] font-medium hover:bg-[#f5f5f5]"
            >
              Đăng nhập
            </button>

            <button
              type="button"
              className="rounded-lg border border-[#dfe3e6] px-5 py-3 text-[12px] font-medium hover:bg-[#f5f5f5]"
            >
              Quên mật khẩu
            </button>

          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>

      </main>
    </div>
  );
}

export default Account;