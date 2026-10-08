import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  cancelAdvisorAppointment,
  checkInAdvisorAppointment,
  confirmAdvisorAppointment,
  getAdvisorAppointment,
  getAdvisorAppointments,
  type AppointmentStatus,
} from "../../services/advisorAppointmentService";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
};

type VehicleBrand = {
  id: number;
  name: string;
};

type VehicleModel = {
  id: number;
  brand?: VehicleBrand;
};

type Vehicle = {
  id: number;
  license_plate: string;
  model_id: number;
  variant?: string;
  year?: number;
  model?: VehicleModel;
};

type Service = {
  id: number;
  name: string;
  base_price?: number;
};

type MaintenancePackage = {
  id: number;
  name: string;
  mileage_milestone?: number;
};

type Appointment = {
  id: number;
  appointment_code: string;
  customer?: Customer;
  vehicle?: Vehicle;
  services?: Service[];
  packages?: MaintenancePackage[];
  appointment_date: string;
  appointment_time: string;
  request_type?: string;
  symptom_description?: string;
  note?: string;
  status: AppointmentStatus;
  cancel_reason?: string;
};

type AppointmentResponse = {
  success: boolean;
  data: Appointment[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

type ToastType = "success" | "error";

type Toast = {
  message: string;
  type: ToastType;
};

const statusOptions: {
  value: "" | AppointmentStatus;
  label: string;
}[] = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "CHECKED_IN", label: "Đã tiếp nhận" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function getStatusText(status: AppointmentStatus) {
  if (status === "PENDING") return "Chờ xác nhận";
  if (status === "CONFIRMED") return "Đã xác nhận";
  if (status === "CHECKED_IN") return "Đã tiếp nhận";
  return "Đã hủy";
}

function getStatusClass(status: AppointmentStatus) {
  if (status === "PENDING") {
    return "border border-[#F1D58F] bg-[#FFF8E7] text-[#8A651F]";
  }

  if (status === "CONFIRMED") {
    return "border border-[#B9D5F0] bg-[#EEF6FF] text-[#35658F]";
  }

  if (status === "CHECKED_IN") {
    return "border border-[#B9DEC4] bg-[#EEF9F1] text-[#39734A]";
  }

  return "border border-[#F0C1C1] bg-[#FFF1F1] text-[#A34D4D]";
}

function formatDate(date: string) {
  if (!date) return "-";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getVehicleName(vehicle?: Vehicle) {
  if (!vehicle) return "Chưa có thông tin";

  const brand = vehicle.model?.brand?.name || "";
  const variant = vehicle.variant || "";

  const name = `${brand} ${variant}`.trim();

  return name || "Xe của khách";
}

function getServiceName(appointment: Appointment) {
  const services = appointment.services || [];
  const packages = appointment.packages || [];

  const serviceNames = services.map((service) => service.name);
  const packageNames = packages.map((item) => item.name);

  const names = [...serviceNames, ...packageNames];

  if (names.length === 0) {
    return appointment.request_type || "Chưa xác định";
  }

  return names.join(", ");
}

function getAppointmentCustomer(appointment: Appointment) {
  return appointment.customer?.full_name || "Khách hàng";
}

function getAppointmentPhone(appointment: Appointment) {
  return appointment.customer?.phone || "-";
}

function getAppointmentPlate(appointment: Appointment) {
  return appointment.vehicle?.license_plate || "-";
}

function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [date, setDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const itemsPerPage = 15;

  const showToast = (
    message: string,
    type: ToastType = "success"
  ) => {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response =
        (await getAdvisorAppointments({
          page: currentPage,
          per_page: itemsPerPage,
          status,
          date,
          search: search.trim(),
        })) as AppointmentResponse;

      setAppointments(response.data || []);
      setTotalAppointments(response.pagination?.total || 0);
      setTotalPages(response.pagination?.last_page || 1);
    } catch (error: any) {
      if (error?.status === 401) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setAppointments([]);
      setTotalAppointments(0);
      setTotalPages(1);

      showToast(
        error?.message || "Không thể tải danh sách lịch hẹn.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [currentPage, status, date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }

      loadAppointments();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  const handleStatusTab = (value: "" | AppointmentStatus) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setDate("");
    setCurrentPage(1);
  };

  const handleConfirm = async (id: number) => {
    try {
      setLoadingAction(`confirm-${id}`);

      const response = await confirmAdvisorAppointment(id);

      showToast(
        response?.message || "Xác nhận lịch hẹn thành công."
      );

      await loadAppointments();
    } catch (error: any) {
      showToast(
        error?.message || "Không thể xác nhận lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      setLoadingAction(`checkin-${id}`);

      const response = await checkInAdvisorAppointment(id);

      showToast(
        response?.message || "Tiếp nhận xe thành công."
      );

      await loadAppointments();
    } catch (error: any) {
      showToast(
        error?.message || "Không thể tiếp nhận xe.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenDetail = async (appointment: Appointment) => {
    try {
      setSelectedAppointment(appointment);
      setLoadingDetail(true);

      const response = await getAdvisorAppointment(appointment.id);

      if (response?.data) {
        setSelectedAppointment(response.data);
      }
    } catch (error: any) {
      showToast(
        error?.message || "Không thể tải chi tiết lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelAppointment || cancelReason.trim() === "") {
      return;
    }

    try {
      setLoadingAction(`cancel-${cancelAppointment.id}`);

      const response = await cancelAdvisorAppointment(
        cancelAppointment.id,
        cancelReason.trim()
      );

      showToast(
        response?.message || "Đã từ chối lịch hẹn."
      );

      setCancelAppointment(null);
      setCancelReason("");

      await loadAppointments();
    } catch (error: any) {
      showToast(
        error?.message || "Không thể từ chối lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const currentPageStart =
    totalAppointments === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const currentPageEnd = Math.min(
    currentPage * itemsPerPage,
    totalAppointments
  );

  const statusCounts = useMemo(() => {
    return {
      pending: appointments.filter(
        (item) => item.status === "PENDING"
      ).length,
      confirmed: appointments.filter(
        (item) => item.status === "CONFIRMED"
      ).length,
      checkedIn: appointments.filter(
        (item) => item.status === "CHECKED_IN"
      ).length,
      cancelled: appointments.filter(
        (item) => item.status === "CANCELLED"
      ).length,
    };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8A949E]">
                GARA / LỊCH HẸN
              </p>

              <div>
                <h2 className="text-[25px] font-bold tracking-tight text-[#20252B]">
                  Quản lý lịch hẹn
                </h2>

                <p className="mt-2 max-w-[650px] text-[12px] leading-5 text-[#8A949E]">
                  Theo dõi, xác nhận và tiếp nhận lịch hẹn của khách hàng
                  tại gara.
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                    LỊCH HẸN
                  </p>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F7F5] text-xs text-[#66717C] transition duration-300 group-hover:bg-[#F3E8D2]">
                    □
                  </span>
                </div>

                <p className="mt-4 text-[24px] font-bold text-[#20252B]">
                  {totalAppointments}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tổng số lịch hẹn
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                    CHỜ XÁC NHẬN
                  </p>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF8E7] text-xs text-[#8A651F]">
                    !
                  </span>
                </div>

                <p className="mt-4 text-[24px] font-bold text-[#20252B]">
                  {statusCounts.pending}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Cần xử lý
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                    ĐÃ XÁC NHẬN
                  </p>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF6FF] text-xs text-[#35658F]">
                    ✓
                  </span>
                </div>

                <p className="mt-4 text-[24px] font-bold text-[#20252B]">
                  {statusCounts.confirmed}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Chờ tiếp nhận
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                    ĐÃ TIẾP NHẬN
                  </p>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF9F1] text-xs text-[#39734A]">
                    ✓
                  </span>
                </div>

                <p className="mt-4 text-[24px] font-bold text-[#20252B]">
                  {statusCounts.checkedIn}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xe đã vào gara
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Bộ lọc lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tìm theo khách hàng, xe, mã lịch hẹn hoặc ngày tiếp nhận.
                </p>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row">
                <div className="flex-1">
                  <label className="mb-2 block text-[10px] font-semibold text-[#66717C]">
                    Tìm kiếm
                  </label>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tên khách, số điện thoại, biển số, mã lịch..."
                    className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[11px] text-[#20252B] outline-none transition duration-200 placeholder:text-[#A5ADB5] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                  />
                </div>

                <div className="w-full xl:w-[190px]">
                  <label className="mb-2 block text-[10px] font-semibold text-[#66717C]">
                    Ngày
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[11px] text-[#20252B] outline-none transition duration-200 focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#FAFAF9] hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {statusOptions.map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => handleStatusTab(item.value)}
                    className={`rounded-xl px-4 py-2.5 text-[10px] font-semibold transition duration-200 ${
                      status === item.value
                        ? "bg-[#1F2933] text-white shadow-[0_5px_14px_rgba(31,41,51,0.10)]"
                        : "border border-[#D9DDE1] bg-white text-[#66717C] hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#FAFAF9]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252B]">
                    Danh sách lịch hẹn
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý lịch hẹn và trạng thái tiếp nhận xe.
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F7F7F5] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {totalAppointments} lịch hẹn
                </p>
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[62px] animate-pulse rounded-xl bg-[#F4F5F4]"
                    />
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-left">
                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Mã
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Khách hàng
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Xe
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Dịch vụ
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Thời gian
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Trạng thái
                        </th>

                        <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                          Thao tác
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {appointments.map((appointment) => {
                        const isConfirming =
                          loadingAction ===
                          `confirm-${appointment.id}`;

                        const isCheckingIn =
                          loadingAction ===
                          `checkin-${appointment.id}`;

                        return (
                          <tr
                            key={appointment.id}
                            className="border-b border-[#EEF0F2] transition duration-200 hover:bg-[#FAFAF9]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-[10px] font-semibold text-[#20252B]">
                                {appointment.appointment_code}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[11px] font-semibold text-[#20252B]">
                                {getAppointmentCustomer(appointment)}
                              </p>

                              <p className="mt-1 text-[10px] text-[#8A949E]">
                                {getAppointmentPhone(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[11px] font-semibold text-[#20252B]">
                                {getVehicleName(appointment.vehicle)}
                              </p>

                              <p className="mt-1 text-[10px] text-[#8A949E]">
                                {getAppointmentPlate(appointment)}
                              </p>
                            </td>

                            <td className="max-w-[190px] px-5 py-4">
                              <p className="text-[10px] leading-5 text-[#374151]">
                                {getServiceName(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[10px] font-semibold text-[#20252B]">
                                {formatDate(
                                  appointment.appointment_date
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-[#8A949E]">
                                {appointment.appointment_time}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-lg px-3 py-1.5 text-[9px] font-semibold ${getStatusClass(
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
                                    handleOpenDetail(appointment)
                                  }
                                  className="rounded-lg border border-[#D9DDE1] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#FAFAF9]"
                                >
                                  Chi tiết
                                </button>

                                {appointment.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isConfirming}
                                      onClick={() =>
                                        handleConfirm(
                                          appointment.id
                                        )
                                      }
                                      className="rounded-lg bg-[#1F2933] px-3 py-1.5 text-[10px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isConfirming
                                        ? "Đang xử lý..."
                                        : "Xác nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(
                                          appointment
                                        );
                                        setCancelReason("");
                                      }}
                                      className="rounded-lg border border-[#F0C1C1] bg-[#FFF8F8] px-3 py-1.5 text-[10px] font-semibold text-[#A34D4D] transition duration-200 hover:-translate-y-0.5 hover:bg-[#FFF1F1]"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}

                                {appointment.status === "CONFIRMED" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isCheckingIn}
                                      onClick={() =>
                                        handleCheckIn(
                                          appointment.id
                                        )
                                      }
                                      className="rounded-lg bg-[#1F2933] px-3 py-1.5 text-[10px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isCheckingIn
                                        ? "Đang xử lý..."
                                        : "Tiếp nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(
                                          appointment
                                        );
                                        setCancelReason("");
                                      }}
                                      className="rounded-lg border border-[#F0C1C1] bg-[#FFF8F8] px-3 py-1.5 text-[10px] font-semibold text-[#A34D4D] transition duration-200 hover:-translate-y-0.5 hover:bg-[#FFF1F1]"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F7F5] text-xl text-[#8A949E]">
                    □
                  </div>

                  <h3 className="mt-4 text-[13px] font-semibold text-[#20252B]">
                    Không có lịch hẹn
                  </h3>

                  <p className="mx-auto mt-2 max-w-[430px] text-[10px] leading-5 text-[#8A949E]">
                    Không tìm thấy lịch hẹn phù hợp với bộ lọc hiện tại.
                    Hãy thử thay đổi từ khóa, trạng thái hoặc ngày.
                  </p>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-5 rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:border-[#D6A85F] hover:bg-[#FAFAF9] hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}

              {!loading && totalAppointments > 0 && (
                <div className="flex flex-col justify-between gap-4 border-t border-[#EEF0F2] px-5 py-4 sm:flex-row sm:items-center">
                  <p className="text-[10px] text-[#8A949E]">
                    Hiển thị {currentPageStart} - {currentPageEnd} trong{" "}
                    {totalAppointments} lịch hẹn
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.max(1, page - 1)
                        )
                      }
                      className="rounded-lg border border-[#D9DDE1] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:border-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-40"
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
                        className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition duration-200 ${
                          currentPage === page
                            ? "bg-[#1F2933] text-white shadow-[0_4px_12px_rgba(31,41,51,0.10)]"
                            : "border border-[#D9DDE1] bg-white text-[#66717C] hover:border-[#D6A85F] hover:bg-[#FAFAF9]"
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
                      className="rounded-lg border border-[#D9DDE1] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:border-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2933]/35 px-4 py-6 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-[650px] overflow-y-auto rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_24px_60px_rgba(31,41,51,0.18)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEF0F2] bg-white px-6 py-5">
              <div>
                <p className="text-[15px] font-bold text-[#20252B]">
                  Chi tiết lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  {selectedAppointment.appointment_code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E1E4E6] text-lg text-[#8A949E] transition duration-200 hover:border-[#D6A85F] hover:bg-[#FAFAF9] hover:text-[#20252B]"
              >
                ×
              </button>
            </div>

            {loadingDetail ? (
              <div className="space-y-4 px-6 py-6">
                <div className="h-20 animate-pulse rounded-xl bg-[#F4F5F4]" />
                <div className="h-20 animate-pulse rounded-xl bg-[#F4F5F4]" />
                <div className="h-28 animate-pulse rounded-xl bg-[#F4F5F4]" />
              </div>
            ) : (
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
                <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4 transition duration-200 hover:border-[#D6A85F]">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                    KHÁCH HÀNG
                  </p>

                  <p className="mt-2 text-[12px] font-semibold text-[#20252B]">
                    {getAppointmentCustomer(selectedAppointment)}
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    {getAppointmentPhone(selectedAppointment)}
                  </p>

                  {selectedAppointment.customer?.email && (
                    <p className="mt-1 text-[10px] text-[#8A949E]">
                      {selectedAppointment.customer.email}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4 transition duration-200 hover:border-[#D6A85F]">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                    TRẠNG THÁI
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-lg px-3 py-1.5 text-[9px] font-semibold ${getStatusClass(
                      selectedAppointment.status
                    )}`}
                  >
                    {getStatusText(selectedAppointment.status)}
                  </span>
                </div>

                <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4 transition duration-200 hover:border-[#D6A85F]">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                    XE
                  </p>

                  <p className="mt-2 text-[12px] font-semibold text-[#20252B]">
                    {getVehicleName(selectedAppointment.vehicle)}
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    {getAppointmentPlate(selectedAppointment)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4 transition duration-200 hover:border-[#D6A85F]">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                    THỜI GIAN
                  </p>

                  <p className="mt-2 text-[12px] font-semibold text-[#20252B]">
                    {formatDate(
                      selectedAppointment.appointment_date
                    )}
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    {selectedAppointment.appointment_time}
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4 transition duration-200 hover:border-[#D6A85F]">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                    DỊCH VỤ
                  </p>

                  <p className="mt-2 text-[11px] leading-5 text-[#374151]">
                    {getServiceName(selectedAppointment)}
                  </p>
                </div>

                {selectedAppointment.request_type && (
                  <div className="sm:col-span-2 rounded-xl border border-[#EEF0F2] bg-[#FAFAF9] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                      LOẠI YÊU CẦU
                    </p>

                    <p className="mt-2 text-[11px] text-[#374151]">
                      {selectedAppointment.request_type}
                    </p>
                  </div>
                )}

                {selectedAppointment.symptom_description && (
                  <div className="sm:col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                      MÔ TẢ TÌNH TRẠNG
                    </p>

                    <div className="mt-2 rounded-xl border border-[#EEF0F2] bg-[#F7F7F5] p-4 text-[11px] leading-5 text-[#374151]">
                      {selectedAppointment.symptom_description}
                    </div>
                  </div>
                )}

                {selectedAppointment.note && (
                  <div className="sm:col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A949E]">
                      GHI CHÚ
                    </p>

                    <div className="mt-2 rounded-xl border border-[#EEF0F2] bg-[#F7F7F5] p-4 text-[11px] leading-5 text-[#374151]">
                      {selectedAppointment.note}
                    </div>
                  </div>
                )}

                {selectedAppointment.cancel_reason && (
                  <div className="sm:col-span-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#A34D4D]">
                      LÝ DO HỦY
                    </p>

                    <div className="mt-2 rounded-xl border border-[#F0C1C1] bg-[#FFF5F5] p-4 text-[11px] leading-5 text-[#7A5A5A]">
                      {selectedAppointment.cancel_reason}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {cancelAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2933]/35 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[500px] rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_24px_60px_rgba(31,41,51,0.18)]">
            <div className="flex items-start justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-[15px] font-bold text-[#20252B]">
                  Từ chối lịch hẹn
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  {cancelAppointment.appointment_code} -{" "}
                  {getAppointmentCustomer(cancelAppointment)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#8A949E] transition duration-200 hover:bg-[#FAFAF9] hover:text-[#20252B]"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-xl border border-[#F0C1C1] bg-[#FFF5F5] p-4">
                <p className="text-[10px] font-semibold text-[#A34D4D]">
                  Lưu ý
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#7A5A5A]">
                  Vui lòng nhập lý do để khách hàng biết nguyên nhân
                  lịch hẹn bị từ chối.
                </p>
              </div>

              <label className="mt-5 block text-[10px] font-semibold text-[#374151]">
                Lý do từ chối
              </label>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={5}
                placeholder="Nhập lý do từ chối lịch hẹn..."
                className="mt-2 w-full resize-none rounded-xl border border-[#D9DDE1] px-4 py-3 text-[12px] text-[#20252B] outline-none transition duration-200 focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
              />

              <p className="mt-2 text-[9px] text-[#8A949E]">
                Lý do phải được nhập trước khi xác nhận.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#EEF0F2] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:border-[#D6A85F] hover:bg-[#FAFAF9]"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={
                  cancelReason.trim() === "" ||
                  loadingAction ===
                    `cancel-${cancelAppointment.id}`
                }
                onClick={handleCancel}
                className="rounded-xl bg-[#1F2933] px-4 py-2.5 text-[10px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingAction ===
                `cancel-${cancelAppointment.id}`
                  ? "Đang xử lý..."
                  : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-5 z-[60]">
          <div
            className={`min-w-[280px] rounded-xl border bg-white px-4 py-3 shadow-[0_14px_35px_rgba(31,41,51,0.12)] transition duration-300 ${
              toast.type === "success"
                ? "border-[#B9DEC4]"
                : "border-[#F0C1C1]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  toast.type === "success"
                    ? "bg-[#EEF9F1] text-[#39734A]"
                    : "bg-[#FFF1F1] text-[#A34D4D]"
                }`}
              >
                {toast.type === "success" ? "✓" : "!"}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  {toast.type === "success"
                    ? "Thành công"
                    : "Có lỗi xảy ra"}
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#8A949E]">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;