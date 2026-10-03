function RepairStatus() {
  const repairs = [
    {
      code: "SC-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      status: "Đang tiếp nhận",
    },
    {
      code: "SC-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      status: "Đang sửa chữa",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">

        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / THEO DÕI SỬA CHỮA
          </p>

          <h1 className="text-[28px] font-bold">
            Theo dõi tình trạng sửa chữa
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Theo dõi tiến độ sửa chữa và bảo dưỡng xe của bạn.
          </p>
        </div>

        <div className="rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách phiếu sửa chữa
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {repairs.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã phiếu</th>
                  <th className="px-6 py-4">Xe</th>
                  <th className="px-6 py-4">Dịch vụ</th>
                  <th className="px-6 py-4">Ngày</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {repairs.map((repair, index) => (
                  <tr
                    key={repair.code}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {repair.code}
                    </td>

                    <td className="px-6 py-5 text-[12px]">
                      {repair.car}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {repair.service}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {repair.date}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-md bg-[#f1f2f3] px-3 py-2 text-[10px] font-medium">
                        {repair.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        className="rounded-md bg-[#20252b] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#111519]"
                      >
                        Xem chi tiết
                      </button>
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

export default RepairStatus;