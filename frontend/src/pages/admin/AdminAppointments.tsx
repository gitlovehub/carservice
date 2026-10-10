import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type Appointment = {
  recordId: number;
  id: string;
  time: string;
  customer: string;
  phone: string;
  plate: string;
  service: string;
  status: "Chờ xác nhận" | "Đã xác nhận" | "Đã tiếp nhận" | "Đã hủy";
};

type ApiAppointment = {
  id: number;
  appointment_code: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  customer?: { full_name?: string; phone?: string } | null;
  vehicle?: { license_plate?: string | null } | null;
  services?: { name: string }[];
  packages?: { name: string }[];
};

function formatStatus(status: string): Appointment["status"] {
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đã tiếp nhận";
  if (status === "CANCELLED") return "Đã hủy";
  return "Chờ xác nhận";
}

function mapAppointment(item: ApiAppointment): Appointment {
  const serviceNames = [...(item.services ?? []), ...(item.packages ?? [])]
    .map((entry) => entry.name)
    .join(", ");
  const date = new Date(`${item.appointment_date}T00:00:00`).toLocaleDateString("vi-VN");

  return {
    recordId: item.id,
    id: item.appointment_code,
    time: `${date} · ${item.appointment_time.slice(0, 5)}`,
    customer: item.customer?.full_name || "Khách hàng",
    phone: item.customer?.phone || "",
    plate: item.vehicle?.license_plate || "Chưa có biển số",
    service: serviceNames || "Chưa chọn dịch vụ",
    status: formatStatus(item.status),
  };
}

function AdminAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [error, setError] = useState("");

  const loadAppointments = async () => {
    try {
      const response = await fetchApi("/advisor/appointments?per_page=100");
      setAppointments((response?.data ?? []).map(mapAppointment));
      setError("");
    } catch (requestError) {
      if ((requestError as { status?: number })?.status === 401) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Không thể tải lịch hẹn.");
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

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

  const handleStatusChange = async (appointment: Appointment, newStatus: Appointment["status"]) => {
    const endpoint = newStatus === "Đã xác nhận"
      ? `/advisor/appointments/${appointment.recordId}/confirm`
      : newStatus === "Đã tiếp nhận"
        ? `/advisor/appointments/${appointment.recordId}/check-in`
        : `/advisor/appointments/${appointment.recordId}/cancel`;

    try {
      await fetchApi(endpoint, {
        method: "POST",
        ...(newStatus === "Đã hủy"
          ? { body: JSON.stringify({ cancel_reason: "Admin hủy lịch hẹn" }) }
          : {}),
      });
      await loadAppointments();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật lịch hẹn.");
    }
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
              {error && (
                <div role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
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
                                onClick={() => void handleStatusChange(appointment, "Đã xác nhận")}
                                className="cursor-pointer rounded-xl bg-[#1F2933] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                              >
                                Duyệt
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleStatusChange(appointment, "Đã hủy")}
                                className="cursor-pointer rounded-xl border border-[#E1E4E6] px-3 py-2 text-[10px] font-semibold text-[#A24A4A] transition hover:bg-[#FDEEEE]"
                              >
                                Hủy
                              </button>
                            </div>
                          )}

                          {appointment.status === "Đã xác nhận" && (
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(appointment, "Đã tiếp nhận")}
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