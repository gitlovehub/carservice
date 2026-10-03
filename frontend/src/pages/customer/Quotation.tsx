function Quotation() {
  const quotations = [
    {
      code: "BG-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      amount: "1.500.000 VNĐ",
      status: "Chờ duyệt",
    },
    {
      code: "BG-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      amount: "850.000 VNĐ",
      status: "Đã duyệt",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">

        {/* HEADER */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / BÁO GIÁ
          </p>

          <h1 className="text-[28px] font-bold">
            Báo giá dịch vụ
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Xem và xác nhận các báo giá dịch vụ sửa chữa, bảo dưỡng.
          </p>
        </div>

        {/* TABLE */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white">

          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách báo giá
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {quotations.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">

                  <th className="px-6 py-4">
                    STT
                  </th>

                  <th className="px-6 py-4">
                    Mã báo giá
                  </th>

                  <th className="px-6 py-4">
                    Xe
                  </th>

                  <th className="px-6 py-4">
                    Dịch vụ
                  </th>

                  <th className="px-6 py-4">
                    Ngày
                  </th>

                  <th className="px-6 py-4">
                    Tổng tiền
                  </th>

                  <th className="px-6 py-4">
                    Trạng thái
                  </th>

                  <th className="px-6 py-4">
                    Thao tác
                  </th>

                </tr>
              </thead>

              <tbody>
                {quotations.map((quotation, index) => (
                  <tr
                    key={quotation.code}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {quotation.code}
                    </td>

                    <td className="px-6 py-5 text-[12px]">
                      {quotation.car}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {quotation.service}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {quotation.date}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {quotation.amount}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-md bg-[#f1f2f3] px-3 py-2 text-[10px] font-medium">
                        {quotation.status}
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

                        {quotation.status === "Chờ duyệt" && (
                          <>
                            <button
                              type="button"
                              className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                            >
                              Duyệt
                            </button>

                            <button
                              type="button"
                              className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
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

export default Quotation;