import { useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

const repairs = [
  {
    id: "SC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    technician: "Trần Văn Nam",
    startDate: "24/06/2026",
    status: "Đang sửa chữa",
  },
  {
    id: "SC-002",
    customer: "Phùng Đức Anh",
    car: "Honda City",
    plate: "30F-678.90",
    service: "Kiểm tra tổng quát",
    technician: "Lê Minh Tuấn",
    startDate: "25/06/2026",
    status: "Chờ sửa chữa",
  },
  {
    id: "SC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "29A-456.78",
    service: "Thay dầu động cơ",
    technician: "Nguyễn Văn Hùng",
    startDate: "26/06/2026",
    status: "Đã hoàn thành",
  },
];

function RepairStatus() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filteredRepairs = repairs.filter((repair) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      repair.id.toLowerCase().includes(keyword) ||
      repair.customer.toLowerCase().includes(keyword) ||
      repair.plate.toLowerCase().includes(keyword) ||
      repair.car.toLowerCase().includes(keyword) ||
      repair.technician.toLowerCase().includes(keyword);

    const matchStatus =
      status === "" || repair.status === status;

    return matchSearch && matchStatus;
  });

  const getStatusClass = (value: string) => {
    if (value === "Đã hoàn thành") {
      return "bg-[#eef7f0] text-[#39734a]";
    }

    if (value === "Đang sửa chữa") {
      return "bg-[#f3e8d2] text-[#5b4630]";
    }

    return "bg-[#f3f4f2] text-[#66717c]";
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9aa1a7]">
                GARA / SỬA CHỮA
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Trạng thái sửa chữa
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Theo dõi tiến độ sửa chữa xe của khách hàng.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  + Tạo phiếu sửa chữa
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  PHIẾU SỬA CHỮA
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {repairs.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng số phiếu
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  ĐANG SỬA
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {
                    repairs.filter(
                      (item) => item.status === "Đang sửa chữa"
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Đang xử lý tại gara
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {filteredRepairs.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đang hiển thị
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252b]">
                  Tìm kiếm phiếu sửa chữa
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo mã phiếu, khách hàng, biển số hoặc kỹ thuật viên.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mã phiếu, khách hàng, biển số..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ sửa chữa">Chờ sửa chữa</option>
                  <option value="Đang sửa chữa">Đang sửa chữa</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-5">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252b]">
                    Danh sách phiếu sửa chữa
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Theo dõi tiến độ xử lý xe
                  </p>
                </div>

                <p className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredRepairs.length} phiếu
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e1e4e6] bg-[#f7f7f5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        MÃ PHIẾU
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        XE
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        DỊCH VỤ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        KỸ THUẬT VIÊN
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        NGÀY NHẬN
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        TRẠNG THÁI
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRepairs.map((repair) => (
                      <tr
                        key={repair.id}
                        className="border-b border-[#eef0f2] last:border-0 hover:bg-[#fafbfb]"
                      >
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-bold text-[#20252b]">
                            {repair.id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252b]">
                            {repair.customer}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#374151]">
                            {repair.car}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {repair.plate}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {repair.service}
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {repair.technician}
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {repair.startDate}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-lg px-3 py-1.5 text-[9px] font-semibold ${getStatusClass(
                              repair.status
                            )}`}
                          >
                            {repair.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRepairs.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold text-[#20252b]">
                    Không tìm thấy phiếu sửa chữa
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Thử thay đổi từ khóa hoặc trạng thái.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RepairStatus;