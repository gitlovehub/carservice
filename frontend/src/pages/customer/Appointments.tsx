import { useState } from "react";

function Appointments() {
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");

  const appointments = [
    {
      code: "LH-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      status: "Chờ xác nhận",
    },
    {
      code: "LH-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      status: "Đã xác nhận",
    },
  ];

  const filteredAppointments = appointments.filter((item) => {
    const matchStatus =
      status === "" || item.status === status;

    const matchKeyword =
      keyword === "" ||
      item.code.toLowerCase().includes(keyword.toLowerCase()) ||
      item.car.toLowerCase().includes(keyword.toLowerCase()) ||
      item.service.toLowerCase().includes(keyword.toLowerCase());

    return matchStatus && matchKeyword;
  });

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">

        {/* TITLE */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / LỊCH HẸN
          </p>

          <h1 className="text-[28px] font-bold">
            Lịch hẹn của tôi
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Xem chi tiết, đổi hoặc hủy lịch hẹn bảo dưỡng.
          </p>
        </div>

        {/* SEARCH */}
        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">
          <h2 className="mb-4 text-[15px] font-bold">
            Tìm kiếm lịch hẹn
          </h2>

          <div className="grid gap-4 md:grid-cols-3">

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">
                Chờ xác nhận
              </option>
              <option value="Đã xác nhận">
                Đã xác nhận
              </option>
            </select>

            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập mã lịch, xe hoặc dịch vụ..."
              className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
            />

            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Tìm kiếm
            </button>

          </div>

          <p className="mt-4 text-[11px] text-[#8a949e]">
            Tìm kiếm và lọc danh sách theo thông tin hiện có.
          </p>
        </div>

        {/* TABLE */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white">

          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách lịch hẹn
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {filteredAppointments.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã lịch hẹn</th>
                  <th className="px-6 py-4">Xe</th>
                  <th className="px-6 py-4">Dịch vụ</th>
                  <th className="px-6 py-4">Ngày hẹn</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map((item, index) => (
                  <tr
                    key={item.code}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {item.code}
                    </td>

                    <td className="px-6 py-5 text-[12px]">
                      {item.car}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {item.service}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {item.date}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-md bg-[#f1f2f3] px-3 py-2 text-[10px] font-medium">
                        {item.status}
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
                          Đổi lịch
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                        >
                          Hủy lịch
                        </button>

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

export default Appointments;