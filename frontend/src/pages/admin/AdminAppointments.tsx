import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type Appointment = {
  id: string;
  time: string;
  customer: string;
  phone: string;
  plate: string;
  service: string;
  status: "Chờ xác nhận" | "Đã xác nhận" | "Đã tiếp nhận" | "Đã hủy";
};

const initialAppointments: Appointment[] = [
  {
    id: "APT-001",
    time: "08:30",
    customer: "Nguyễn Văn An",
    phone: "0901234567",
    plate: "30A-12345",
    service: "Bảo dưỡng định kỳ",
    status: "Chờ xác nhận",
  },
  {
    id: "APT-002",
    time: "09:30",
    customer: "Trần Thị Bình",
    phone: "0912345678",
    plate: "29A-67890",
    service: "Thay dầu động cơ",
    status: "Đã xác nhận",
  },
  {
    id: "APT-003",
    time: "10:30",
    customer: "Lê Minh Cường",
    phone: "0987654321",
    plate: "30F-45678",
    service: "Kiểm tra phanh",
    status: "Đã tiếp nhận",
  },
  {
    id: "APT-004",
    time: "13:30",
    customer: "Phạm Thu Hà",
    phone: "0934567890",
    plate: "30G-11223",
    service: "Vệ sinh nội thất",
    status: "Đã xác nhận",
  },
  {
    id: "APT-005",
    time: "15:00",
    customer: "Đỗ Văn Nam",
    phone: "0978123456",
    plate: "30H-99887",
    service: "Bảo dưỡng điều hòa",
    status: "Đã hủy",
  },
];

function AdminAppointments() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");

  const filteredAppointments = appointments.filter((appointment) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      appointment.id.toLowerCase().includes(keyword) ||
      appointment.customer.toLowerCase().includes(keyword) ||
      appointment.phone.includes(keyword) ||
      appointment.plate.toLowerCase().includes(keyword);

    const matchesStatus =
      status === "Tất cả" || appointment.status === status;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (
    id: string,
    newStatus: Appointment["status"],
  ) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? { ...appointment, status: newStatus }
          : appointment,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                QUẢN TRỊ HỆ THỐNG / LỊCH HẸN
              </p>

              <h1 className="text-3xl font-bold tracking-tight">
                Quản lý lịch hẹn
              </h1>

              <p className="mt-2 text-xs text-[#66717C]">
                Theo dõi và quản lý lịch hẹn của khách hàng trong toàn hệ thống.
              </p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng lịch hẹn
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {appointments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Chờ xác nhận
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {
                    appointments.filter(
                      (item) => item.status === "Chờ xác nhận",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đã tiếp nhận
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {
                    appointments.filter(
                      (item) => item.status === "Đã tiếp nhận",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đã hủy
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {
                    appointments.filter(
                      (item) => item.status === "Đã hủy",
                    ).length
                  }
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    DANH SÁCH
                  </p>

                  <h2 className="mt-1 text-base font-bold">
                    Lịch hẹn toàn hệ thống
                  </h2>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm mã, tên, SĐT, biển số..."
                    className="w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-2.5 text-xs outline-none transition focus:border-[#D6A85F] sm:w-[270px]"
                  />

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 py-2.5 text-xs outline-none"
                  >
                    <option>Tất cả</option>
                    <option>Chờ xác nhận</option>
                    <option>Đã xác nhận</option>
                    <option>Đã tiếp nhận</option>
                    <option>Đã hủy</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] text-left">
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Mã lịch
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Thời gian
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Khách hàng
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Xe
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Dịch vụ
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Trạng thái
                      </th>

                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-[#F0F1EF] last:border-b-0"
                      >
                        <td className="px-3 py-4 text-xs font-semibold">
                          {appointment.id}
                        </td>

                        <td className="px-3 py-4 text-xs text-[#66717C]">
                          {appointment.time}
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-xs font-semibold">
                            {appointment.customer}
                          </p>
                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            {appointment.phone}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <span className="text-xs font-semibold">
                            {appointment.plate}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-xs text-[#66717C]">
                          {appointment.service}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${
                              appointment.status === "Chờ xác nhận"
                                ? "bg-[#FFF6E6] text-[#9A6B22]"
                                : appointment.status === "Đã xác nhận"
                                  ? "bg-[#EEF4FA] text-[#46627A]"
                                  : appointment.status === "Đã tiếp nhận"
                                    ? "bg-[#EEF7EF] text-[#3F7047]"
                                    : "bg-[#FDEEEE] text-[#A24A4A]"
                            }`}
                          >
                            {appointment.status}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          {appointment.status === "Chờ xác nhận" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    appointment.id,
                                    "Đã xác nhận",
                                  )
                                }
                                className="cursor-pointer rounded-xl bg-[#1F2933] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                              >
                                Duyệt
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    appointment.id,
                                    "Đã hủy",
                                  )
                                }
                                className="cursor-pointer rounded-xl border border-[#E1E4E6] px-3 py-2 text-[10px] font-semibold text-[#A24A4A] transition hover:bg-[#FDEEEE]"
                              >
                                Hủy
                              </button>
                            </div>
                          )}

                          {appointment.status === "Đã xác nhận" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  appointment.id,
                                  "Đã tiếp nhận",
                                )
                              }
                              className="cursor-pointer rounded-xl border border-[#E1E4E6] px-3 py-2 text-[10px] font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                            >
                              Tiếp nhận
                            </button>
                          )}

                          {appointment.status === "Đã tiếp nhận" && (
                            <span className="text-[10px] font-medium text-[#8A949E]">
                              Đang xử lý
                            </span>
                          )}

                          {appointment.status === "Đã hủy" && (
                            <span className="text-[10px] font-medium text-[#8A949E]">
                              Đã kết thúc
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAppointments.length === 0 && (
                  <div className="py-10 text-center text-xs text-[#8A949E]">
                    Không tìm thấy lịch hẹn.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminAppointments;