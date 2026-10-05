function Footer() {
  return (
    <footer className="border-t border-[#e3e6e8] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                CS
              </div>

              <p className="text-sm font-bold text-[#20252b]">
                CarService
              </p>
            </div>

            <p className="max-w-sm text-xs leading-5 text-[#7b858f]">
              Dịch vụ bảo dưỡng và sửa chữa ô tô.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold text-[#20252b]">
              LIÊN HỆ
            </p>

            <div className="space-y-2 text-xs text-[#7b858f]">
              <p>Điện thoại: 0123 456 789</p>
              <p>Email: contact@carservice.vn</p>
              <p>Địa chỉ: Hà Nội, Việt Nam</p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold text-[#20252b]">
              CAR SERVICE
            </p>

            <p className="text-xs leading-5 text-[#7b858f]">
              Đồng hành cùng bạn trong quá trình chăm sóc và bảo dưỡng xe.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[#eef0f2] pt-5 text-center text-[11px] text-[#8a949e]">
          © 2026 CarService. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;