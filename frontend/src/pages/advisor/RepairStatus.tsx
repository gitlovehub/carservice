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

  const completedCount = repairs.filter(
    (item) => item.status === "Đã hoàn thành"
  ).length;

  const repairingCount = repairs.filter(
    (item) => item.status === "Đang sửa chữa"
  ).length;

  const getStatusClass = (value: string) => {
    if (value === "Đã hoàn thành") {
      return "bg-[#EEF7F0] text-[#39734A]";
    }

    if (value === "Đang sửa chữa") {
      return "bg-[#F3E8D2] text-[#5B4630]";
    }

    return "bg-[#F3F4F2] text-[#66717C]";
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
                GARA / SỬA CHỮA
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252B]">
                    Trạng thái sửa chữa
                  </h2>

                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Theo dõi tiến độ sửa chữa xe của khách hàng.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  + Tạo phiếu sửa chữa
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  PHIẾU SỬA CHỮA
                </p>

                <p className="mt-3 text-[24px] font-bold">
                  {repairs.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tổng số phiếu
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  ĐANG SỬA
                </p>

                <p className="mt-3 text-[24px] font-bold">
                  {repairingCount}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Đang xử lý tại gara
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  HOÀN THÀNH
                </p>

                <p className="mt-3 text-[24px] font-bold">
                  {completedCount}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Đã hoàn tất sửa chữa
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[24px] font-bold">
                  {filteredRepairs.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Phiếu đang hiển thị
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Tìm kiếm phiếu sửa chữa
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tìm theo mã phiếu, khách hàng, biển số hoặc kỹ thuật viên.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mã phiếu, khách hàng, biển số..."
                  className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition duration-200 placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition duration-200 focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ sửa chữa">Chờ sửa chữa</option>
                  <option value="Đang sửa chữa">Đang sửa chữa</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  Tìm kiếm
                </button>
              </div>

              <div className="mt-4 flex justify-end">
                {(search || status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                    }}
                    className="text-[10px] font-semibold text-[#66717C] transition hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252B]">
                    Danh sách phiếu sửa chữa
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Theo dõi tiến độ xử lý xe
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {filteredRepairs.length} phiếu
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        MÃ PHIẾU
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        XE
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        DỊCH VỤ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        KỸ THUẬT VIÊN
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        NGÀY NHẬN
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        TRẠNG THÁI
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRepairs.map((repair) => (
                      <tr
                        key={repair.id}
                        className="border-b border-[#EEF0F2] last:border-0 transition duration-200 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-bold text-[#20252B]">
                            {repair.id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252B]">
                            {repair.customer}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#374151]">
                            {repair.car}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8A949E]">
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
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-[#66717C]">
                    <span className="text-lg">⌕</span>
                  </div>

                  <p className="mt-4 text-[12px] font-semibold text-[#20252B]">
                    Không tìm thấy phiếu sửa chữa
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
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