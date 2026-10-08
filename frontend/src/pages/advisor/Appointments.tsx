import { useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CANCELLED";

type Appointment = {
  id: string;
  customer: string;
  phone: string;
  car: string;
  plate: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  note: string;
  cancelReason?: string;
};

const initialAppointments: Appointment[] = [
  {
    id: "APT-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    date: "2026-10-05",
    time: "08:30",
    status: "PENDING",
    note: "Khách muốn kiểm tra thêm lốp xe.",
  },
  {
    id: "APT-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda City",
    plate: "30F-678.90",
    service: "Kiểm tra tổng quát",
    date: "2026-10-05",
    time: "09:30",
    status: "CONFIRMED",
    note: "Khách đã xác nhận lịch qua điện thoại.",
  },
  {
    id: "APT-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda 3",
    plate: "29A-456.78",
    service: "Thay dầu động cơ",
    date: "2026-10-06",
    time: "10:00",
    status: "CHECKED_IN",
    note: "Khách đã đưa xe đến gara.",
  },
  {
    id: "APT-004",
    customer: "Trần Văn Nam",
    phone: "0978123456",
    car: "Toyota Camry",
    plate: "30G-222.22",
    service: "Sửa chữa điều hòa",
    date: "2026-10-06",
    time: "14:00",
    status: "CANCELLED",
    note: "Khách báo bận và xin hủy lịch.",
    cancelReason: "Khách có việc đột xuất.",
  },
  {
    id: "APT-005",
    customer: "Lê Minh Hoàng",
    phone: "0968123456",
    car: "Kia K3",
    plate: "30H-333.33",
    service: "Bảo dưỡng định kỳ",
    date: "2026-10-07",
    time: "08:00",
    status: "PENDING",
    note: "Kiểm tra dầu máy và hệ thống phanh.",
  },
  {
    id: "APT-006",
    customer: "Nguyễn Văn Long",
    phone: "0988123456",
    car: "Hyundai Accent",
    plate: "30K-444.44",
    service: "Kiểm tra phanh",
    date: "2026-10-07",
    time: "09:00",
    status: "CONFIRMED",
    note: "Khách phản ánh phanh có tiếng kêu.",
  },
];

function getStatusText(status: AppointmentStatus) {
  if (status === "PENDING") return "Chờ xác nhận";
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đã tiếp nhận";
  return "Đã hủy";
}

function getStatusClass(status: AppointmentStatus) {
  if (status === "PENDING") {
    return "bg-[#f3e8d2] text-[#7a5a24]";
  }

  if (status === "CONFIRMED") {
    return "bg-[#eef7f0] text-[#39734a]";
  }

  if (status === "CHECKED_IN") {
    return "bg-[#e9f0f7] text-[#3d5f7a]";
  }

  return "bg-[#f3f4f2] text-[#66717c]";
}

function formatDate(date: string) {
  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function Appointments() {
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);

  const [cancelReason, setCancelReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 4;

  const filteredAppointments = appointments.filter((appointment) => {
    const keyword = search.toLowerCase().trim();

    const matchSearch =
      keyword === "" ||
      appointment.id.toLowerCase().includes(keyword) ||
      appointment.customer.toLowerCase().includes(keyword) ||
      appointment.phone.includes(keyword) ||
      appointment.car.toLowerCase().includes(keyword) ||
      appointment.plate.toLowerCase().includes(keyword) ||
      appointment.service.toLowerCase().includes(keyword);

    const matchStatus =
      status === "" || appointment.status === status;

    const matchDate =
      date === "" || appointment.date === date;

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / itemsPerPage)
  );

  const startIndex = (currentPage - 1) * itemsPerPage;

  const currentAppointments = filteredAppointments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleConfirm = (id: string) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              status: "CONFIRMED",
            }
          : appointment
      )
    );
  };

  const handleCheckIn = (id: string) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? {
              ...appointment,
              status: "CHECKED_IN",
            }
          : appointment
      )
    );
  };

  const handleCancel = () => {
    if (!cancelAppointment || cancelReason.trim() === "") {
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === cancelAppointment.id
          ? {
              ...appointment,
              status: "CANCELLED",
              cancelReason: cancelReason.trim(),
            }
          : appointment
      )
    );

    setCancelAppointment(null);
    setCancelReason("");
  };

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "PENDING"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "CONFIRMED"
  ).length;

  const checkedInCount = appointments.filter(
    (appointment) => appointment.status === "CHECKED_IN"
  ).length;

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

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
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
                  {pendingCount}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Cần xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  ĐÃ XÁC NHẬN
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {confirmedCount}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Chờ khách đến
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  ĐÃ TIẾP NHẬN
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {checkedInCount}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Xe đang chờ xử lý
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252b]">
                  Tìm kiếm lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo mã lịch, khách hàng, số điện thoại hoặc biển số.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Mã lịch, tên khách hàng, biển số..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ xác nhận</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="CHECKED_IN">Đã tiếp nhận</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>

                <button
                  type="button"
                  onClick={handleSearch}
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
                <table className="w-full min-w-[1150px] border-collapse">
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
                    {currentAppointments.map((appointment) => (
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
                            {formatDate(appointment.date)}
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
                            {getStatusText(appointment.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAppointment(appointment)
                              }
                              className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#1f2933] hover:bg-[#f3f4f2]"
                            >
                              Chi tiết
                            </button>

                            {appointment.status === "PENDING" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleConfirm(appointment.id)
                                  }
                                  className="rounded-lg bg-[#1f2933] px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                                >
                                  Duyệt lịch
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelAppointment(appointment);
                                    setCancelReason("");
                                  }}
                                  className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#6b4f4f] transition hover:bg-[#f7eeee]"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}

                            {appointment.status === "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCheckIn(appointment.id)
                                }
                                className="rounded-lg bg-[#1f2933] px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                              >
                                Tiếp nhận xe
                              </button>
                            )}

                            {appointment.status === "CHECKED_IN" && (
                              <button
                                type="button"
                                className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:bg-[#f3f4f2]"
                              >
                                Lập Lệnh sửa chữa
                              </button>
                            )}
                          </div>
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
                    Thử thay đổi từ khóa, ngày hoặc trạng thái.
                  </p>
                </div>
              )}

              {filteredAppointments.length > 0 && (
                <div className="flex items-center justify-between border-t border-[#eef0f2] px-5 py-4">
                  <p className="text-[10px] text-[#8a9299]">
                    Hiển thị {startIndex + 1} -{" "}
                    {Math.min(
                      startIndex + itemsPerPage,
                      filteredAppointments.length
                    )}{" "}
                    trong {filteredAppointments.length} lịch hẹn
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      className="rounded-lg border border-[#d9dde1] bg-white px-3 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Trước
                    </button>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${
                          currentPage === page
                            ? "bg-[#1f2933] text-white"
                            : "border border-[#d9dde1] bg-white text-[#374151]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      className="rounded-lg border border-[#d9dde1] bg-white px-3 py-2 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[600px] rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-5">
              <div>
                <p className="text-[15px] font-bold text-[#20252b]">
                  Chi tiết lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  {selectedAppointment.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="text-[18px] text-[#8a9299] hover:text-[#20252b]"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  KHÁCH HÀNG
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  {selectedAppointment.customer}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  SỐ ĐIỆN THOẠI
                </p>

                <p className="mt-1 text-[12px]">
                  {selectedAppointment.phone}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  XE
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  {selectedAppointment.car}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Biển số: {selectedAppointment.plate}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  DỊCH VỤ
                </p>

                <p className="mt-1 text-[12px]">
                  {selectedAppointment.service}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  THỜI GIAN
                </p>

                <p className="mt-1 text-[12px]">
                  {formatDate(selectedAppointment.date)} -{" "}
                  {selectedAppointment.time}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  TRẠNG THÁI
                </p>

                <span
                  className={`mt-1 inline-flex rounded-lg px-3 py-1.5 text-[9px] font-semibold ${getStatusClass(
                    selectedAppointment.status
                  )}`}
                >
                  {getStatusText(selectedAppointment.status)}
                </span>
              </div>

              <div className="sm:col-span-2">
                <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                  GHI CHÚ KHÁCH HÀNG
                </p>

                <div className="mt-2 rounded-xl bg-[#f7f7f5] p-4 text-[11px] text-[#374151]">
                  {selectedAppointment.note}
                </div>
              </div>

              {selectedAppointment.cancelReason && (
                <div className="sm:col-span-2">
                  <p className="text-[9px] font-bold uppercase text-[#9aa1a7]">
                    LÝ DO HỦY
                  </p>

                  <div className="mt-2 rounded-xl bg-[#f7eeee] p-4 text-[11px] text-[#6b4f4f]">
                    {selectedAppointment.cancelReason}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#eef0f2] px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="rounded-lg border border-[#d9dde1] px-4 py-2 text-[10px] font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[500px] rounded-2xl bg-white shadow-xl">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[15px] font-bold text-[#20252b]">
                Từ chối lịch hẹn
              </p>

              <p className="mt-1 text-[10px] text-[#8a9299]">
                Lịch {cancelAppointment.id} -{" "}
                {cancelAppointment.customer}
              </p>
            </div>

            <div className="px-6 py-6">
              <label className="text-[10px] font-semibold text-[#374151]">
                Lý do từ chối
              </label>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối lịch hẹn..."
                className="mt-2 w-full resize-none rounded-xl border border-[#d9dde1] px-4 py-3 text-[12px] outline-none focus:border-[#1f2933]"
              />

              <p className="mt-2 text-[9px] text-[#8a9299]">
                Vui lòng nhập lý do trước khi xác nhận từ chối.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#eef0f2] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="rounded-lg border border-[#d9dde1] px-4 py-2 text-[10px] font-semibold"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={cancelReason.trim() === ""}
                onClick={handleCancel}
                className="rounded-lg bg-[#1f2933] px-4 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;