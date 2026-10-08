function Footer() {
  return (
    <footer className="border-t border-[#E1E4E6] bg-white lg:ml-[250px]">
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-white">
                <span className="text-lg">🚗</span>
              </div>

              <div>
                <p className="text-[15px] font-bold text-[#20252B]">
                  CarService
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-[#66717C]">
                  Chăm sóc xe chuyên nghiệp
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#66717C]">
              Dịch vụ bảo dưỡng và sửa chữa ô tô, giúp bạn quản lý lịch hẹn,
              thông tin xe và quá trình sửa chữa một cách thuận tiện.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E1E4E6] bg-[#F7F7F5] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

              <span className="text-[10px] font-semibold text-[#66717C]">
                Đồng hành cùng mọi hành trình
              </span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              LIÊN HỆ
            </p>

            <div className="space-y-2.5 text-[11px] text-[#66717C]">
              <div>
                <p className="font-semibold text-[#20252B]">
                  Điện thoại
                </p>

                <p className="mt-0.5">033 240 5972</p>
              </div>

              <div>
                <p className="font-semibold text-[#20252B]">
                  Email
                </p>

                <p className="mt-0.5">contact@carservice.vn</p>
              </div>

              <div>
                <p className="font-semibold text-[#20252B]">
                  Địa chỉ
                </p>

                <p className="mt-0.5">Hà Nội, Việt Nam</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              CARSERVICE
            </p>

            <div className="space-y-2 text-[11px] text-[#66717C]">
              <p>Bảo dưỡng định kỳ</p>
              <p>Kiểm tra và sửa chữa</p>
              <p>Đặt lịch dịch vụ</p>
              <p>Theo dõi quá trình sửa chữa</p>
            </div>

            <div className="mt-4 rounded-xl bg-[#1F2933] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                SERVICE
              </p>

              <p className="mt-1 text-[11px] font-medium text-white">
                Chăm xe đúng cách.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-[#E1E4E6] pt-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="text-[10px] text-[#8A949E]">
            © 2026 CarService. All rights reserved.
          </p>

          <p className="text-[10px] text-[#8A949E]">
            Dịch vụ bảo dưỡng & sửa chữa ô tô
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;