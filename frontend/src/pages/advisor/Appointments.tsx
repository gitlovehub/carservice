import { useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

const appointments = [
  {
    id: "LH-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    date: "24/06/2026",
    time: "08:30",
    status: "Chờ xác nhận",
  },
  {
    id: "LH-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda City",
    plate: "30F-678.90",
    service: "Kiểm tra tổng quát",
    date: "25/06/2026",
    time: "09:30",
    status: "Đã xác nhận",
  },
  {
    id: "LH-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda 3",
    plate: "29A-456.78",
    service: "Thay dầu động cơ",
    date: "26/06/2026",
    time: "10:00",
    status: "Đang xử lý",
  },
];

function Appointments() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filteredAppointments = appointments.filter((appointment) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      appointment.id.toLowerCase().includes(keyword) ||
      appointment.customer.toLowerCase().includes(keyword) ||
      appointment.phone.includes(search) ||
      appointment.car.toLowerCase().includes(keyword) ||
      appointment.plate.toLowerCase().includes(keyword);

    const matchStatus =
      status === "" || appointment.status === status;

    return matchSearch && matchStatus;
  });

  const getStatusClass = (value: string) => {
    if (value === "Đã xác nhận") {
      return "bg-[#eef7f0] text-[#39734a]";
    }

    if (value === "Đang xử lý") {
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
                GARA / LỊCH HẸN
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Quản lý lịch hẹn
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Theo dõi và xử lý lịch hẹn của khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  + Tạo lịch hẹn
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  LỊCH HẸN
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {appointments.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng số lịch hẹn
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  CHỜ XÁC NHẬN
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {
                    appointments.filter(
                      (item) => item.status === "Chờ xác nhận"
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Cần xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {filteredAppointments.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Lịch hẹn đang hiển thị
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252b]">
                  Tìm kiếm lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo mã lịch, khách hàng, biển số hoặc dịch vụ.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mã lịch, tên khách hàng, biển số..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ xác nhận">Chờ xác nhận</option>
                  <option value="Đã xác nhận">Đã xác nhận</option>
                  <option value="Đang xử lý">Đang xử lý</option>
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
                    Danh sách lịch hẹn
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Lịch hẹn khách hàng tại gara
                  </p>
                </div>

                <p className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredAppointments.length} lịch hẹn
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e1e4e6] bg-[#f7f7f5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        MÃ
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
                        THỜI GIAN
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        TRẠNG THÁI
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-[#eef0f2] last:border-0 hover:bg-[#fafbfb]"
                      >
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-bold text-[#20252b]">
                            {appointment.id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252b]">
                            {appointment.customer}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {appointment.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#374151]">
                            {appointment.car}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {appointment.plate}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {appointment.service}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#374151]">
                            {appointment.date}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {appointment.time}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-lg px-3 py-1.5 text-[9px] font-semibold ${getStatusClass(
                              appointment.status
                            )}`}
                          >
                            {appointment.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#1f2933] hover:bg-[#f3f4f2]"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAppointments.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold text-[#20252b]">
                    Không tìm thấy lịch hẹn
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

export default Appointments;