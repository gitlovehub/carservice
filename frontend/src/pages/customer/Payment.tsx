function Payment() {
  const payment = {
    code: "BG-001",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    date: "24/06/2026",
    total: "1.500.000 VNĐ",
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            KHÁCH HÀNG / THANH TOÁN
          </p>

          <h1 className="text-[28px] font-bold">
            Thanh toán dịch vụ
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Kiểm tra thông tin và xác nhận thanh toán dịch vụ.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-xl border border-[#e1e4e7] bg-white">
            <div className="border-b border-[#e1e4e7] px-6 py-5">
              <h2 className="text-[15px] font-bold">
                Thông tin thanh toán
              </h2>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase text-[#8a949e]">
                  Mã báo giá
                </p>
                <p className="mt-2 text-[12px] font-semibold">
                  {payment.code}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-[#8a949e]">
                  Ngày dịch vụ
                </p>
                <p className="mt-2 text-[12px] font-semibold">
                  {payment.date}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-[#8a949e]">
                  Xe
                </p>
                <p className="mt-2 text-[12px] font-semibold">
                  {payment.car}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-[#8a949e]">
                  Biển số
                </p>
                <p className="mt-2 text-[12px] font-semibold">
                  {payment.plate}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] uppercase text-[#8a949e]">
                  Dịch vụ
                </p>
                <p className="mt-2 text-[12px] font-semibold">
                  {payment.service}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-6">
            <p className="text-[10px] uppercase text-[#8a949e]">
              Tổng thanh toán
            </p>

            <p className="mt-3 text-[24px] font-bold">
              {payment.total}
            </p>

            <div className="my-6 border-t border-[#e1e4e7]" />

            <p className="mb-3 text-[11px] font-semibold">
              Phương thức thanh toán
            </p>

            <select className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]">
              <option>Tiền mặt</option>
              <option>Chuyển khoản</option>
              <option>Ví điện tử</option>
            </select>

            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Xác nhận thanh toán
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#e1e4e7] bg-white p-6">
          <h2 className="text-[15px] font-bold">
            Lưu ý thanh toán
          </h2>

          <p className="mt-3 text-[12px] leading-6 text-[#7b858f]">
            Vui lòng kiểm tra thông tin xe, dịch vụ và số tiền trước khi
            xác nhận thanh toán.
          </p>

          <p className="mt-2 text-[12px] leading-6 text-[#7b858f]">
            Sau khi thanh toán thành công, hóa đơn sẽ được cập nhật trong
            mục Hóa đơn.
          </p>
        </div>

        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>
      </main>
    </div>
  );
}

export default Payment;