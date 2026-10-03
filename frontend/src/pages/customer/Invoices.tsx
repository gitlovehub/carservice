function Invoices() {
  const invoices = [
    {
      id: 1,
      code: "HD-001",
      car: "Toyota Vios",
      plate: "30A-123.45",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      total: "1.500.000 VNĐ",
      status: "Đã thanh toán",
    },
    {
      id: 2,
      code: "HD-002",
      car: "Honda City",
      plate: "30F-678.90",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      total: "850.000 VNĐ",
      status: "Chưa thanh toán",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            KHÁCH HÀNG / HÓA ĐƠN
          </p>

          <h1 className="text-[28px] font-bold">
            Hóa đơn của tôi
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Xem lại các hóa đơn dịch vụ và trạng thái thanh toán.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">
          <h2 className="mb-4 text-[15px] font-bold">
            Tìm kiếm hóa đơn
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Nhập mã hóa đơn..."
              className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
            />

            <select className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]">
              <option>Tất cả trạng thái</option>
              <option>Đã thanh toán</option>
              <option>Chưa thanh toán</option>
            </select>

            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách hóa đơn
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {invoices.length} hóa đơn
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã hóa đơn</th>
                  <th className="px-6 py-4">Xe</th>
                  <th className="px-6 py-4">Dịch vụ</th>
                  <th className="px-6 py-4">Ngày</th>
                  <th className="px-6 py-4">Tổng tiền</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {invoice.code}
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-[12px] font-semibold">
                        {invoice.car}
                      </p>
                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {invoice.plate}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {invoice.service}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {invoice.date}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {invoice.total}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-[#f1f3f4] px-3 py-1 text-[10px] font-medium text-[#59636d]">
                        {invoice.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-[#20252b] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#111519]"
                        >
                          Xem chi tiết
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                        >
                          In hóa đơn
                        </button>

                        {invoice.status === "Chưa thanh toán" && (
                          <button
                            type="button"
                            className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                          >
                            Thanh toán
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>
      </main>
    </div>
  );
}

export default Invoices;