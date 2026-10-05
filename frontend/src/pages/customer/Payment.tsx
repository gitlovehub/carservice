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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <main className="mx-auto max-w-[1100px] px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / THANH TOÁN
          </p>

          <div className="mt-3">
            <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
              Thanh toán dịch vụ
            </h1>

            <p className="mt-2 text-[12px] leading-6 text-[#66717C]">
              Kiểm tra thông tin và xác nhận thanh toán dịch vụ.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="border-b border-[#E1E4E6] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                PAYMENT
              </p>

              <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                Thông tin thanh toán
              </h2>
            </div>

            <div className="grid gap-x-8 gap-y-6 p-6 md:grid-cols-2">
              <div className="rounded-xl bg-[#F7F7F5] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  Mã báo giá
                </p>

                <p className="mt-2 text-[12px] font-bold text-[#20252B]">
                  {payment.code}
                </p>
              </div>

              <div className="rounded-xl bg-[#F7F7F5] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  Ngày dịch vụ
                </p>

                <p className="mt-2 text-[12px] font-bold text-[#20252B]">
                  {payment.date}
                </p>
              </div>

              <div className="rounded-xl border border-[#E1E4E6] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  Xe
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2933] text-xs text-white">
                    🚗
                  </div>

                  <p className="text-[12px] font-bold text-[#20252B]">
                    {payment.car}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E1E4E6] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  Biển số
                </p>

                <p className="mt-2 inline-flex rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-bold text-[#20252B]">
                  {payment.plate}
                </p>
              </div>

              <div className="rounded-xl border border-[#E1E4E6] p-4 md:col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  Dịch vụ
                </p>

                <p className="mt-2 text-[12px] font-bold text-[#20252B]">
                  {payment.service}
                </p>

                <p className="mt-1 text-[10px] text-[#66717C]">
                  Dịch vụ bảo dưỡng và chăm sóc phương tiện.
                </p>
              </div>
            </div>
          </div>

          <div className="h-fit overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.05)]">
            <div className="bg-[#1F2933] px-6 py-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                TỔNG THANH TOÁN
              </p>

              <p className="mt-2 text-[27px] font-bold tracking-tight text-white">
                {payment.total}
              </p>

              <p className="mt-2 text-[10px] text-[#AEB8C1]">
                Chi phí dịch vụ cần thanh toán
              </p>
            </div>

            <div className="p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#66717C]">
                Phương thức thanh toán
              </p>

              <select className="w-full rounded-xl border border-[#DDE1E4] bg-white px-4 py-3 text-[12px] font-medium text-[#20252B] outline-none transition focus:border-[#D6A85F]">
                <option>Tiền mặt</option>
                <option>Chuyển khoản</option>
                <option>Ví điện tử</option>
              </select>

              <div className="mt-5 rounded-xl bg-[#F7F7F5] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#66717C]">
                    Mã báo giá
                  </span>

                  <span className="text-[10px] font-bold text-[#20252B]">
                    {payment.code}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-[#66717C]">
                    Tổng tiền
                  </span>

                  <span className="text-[11px] font-bold text-[#20252B]">
                    {payment.total}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-[#1F2933] px-5 py-3.5 text-[11px] font-bold text-white transition hover:bg-[#151D24]"
              >
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.03)]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020]">
              i
            </div>

            <div>
              <h2 className="text-[14px] font-bold text-[#20252B]">
                Lưu ý thanh toán
              </h2>

              <p className="mt-3 text-[11px] leading-6 text-[#66717C]">
                Vui lòng kiểm tra thông tin xe, dịch vụ và số tiền trước khi
                xác nhận thanh toán.
              </p>

              <p className="mt-1 text-[11px] leading-6 text-[#66717C]">
                Sau khi thanh toán thành công, hóa đơn sẽ được cập nhật trong
                mục Hóa đơn.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[#E1E4E6] pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-[10px] text-[#8A949E]">
            © CarService · Quản lý dịch vụ ô tô
          </p>

          <p className="text-[10px] text-[#8A949E]">
            Chăm sóc xe đúng cách.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Payment;