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

type ApiError = {
  status?: number;
  message?: string;
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
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "CONFIRMED") {
    return "border border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "CHECKED_IN") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border border-rose-200 bg-rose-50 text-rose-800";
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

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response = (await getAdvisorAppointments({
        page: currentPage,
        per_page: itemsPerPage,
        status,
        date,
        search: search.trim(),
      })) as AppointmentResponse;

      setAppointments(response.data || []);
      setTotalAppointments(response.pagination?.total || 0);
      setTotalPages(response.pagination?.last_page || 1);
    } catch (err: unknown) {
      const error = err as ApiError;
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
      showToast(response?.message || "Xác nhận lịch hẹn thành công.");
      await loadAppointments();
    } catch (err: unknown) {
      const error = err as ApiError;
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
      showToast(response?.message || "Tiếp nhận xe thành công.");
      await loadAppointments();
    } catch (err: unknown) {
      const error = err as ApiError;
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
    } catch (err: unknown) {
      const error = err as ApiError;
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

      showToast(response?.message || "Đã từ chối lịch hẹn.");
      setCancelAppointment(null);
      setCancelReason("");
      await loadAppointments();
    } catch (err: unknown) {
      const error = err as ApiError;
      showToast(
        error?.message || "Không thể từ chối lịch hẹn.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const currentPageStart =
    totalAppointments === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const currentPageEnd = Math.min(
    currentPage * itemsPerPage,
    totalAppointments
  );

  const statusCounts = useMemo(() => {
    return {
      pending: appointments.filter((item) => item.status === "PENDING").length,
      confirmed: appointments.filter((item) => item.status === "CONFIRMED").length,
      checkedIn: appointments.filter((item) => item.status === "CHECKED_IN").length,
      cancelled: appointments.filter((item) => item.status === "CANCELLED").length,
    };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
            {/* TIÊU ĐỀ */}
            <div className="mb-8">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Gara / Lịch hẹn
              </p>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Quản lý lịch hẹn
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs text-slate-500">
                  Theo dõi, xác nhận và tiếp nhận lịch hẹn của khách hàng tại xưởng.
                </p>
              </div>
            </div>

            {/* THỐNG KÊ NHANH */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lịch hẹn
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {totalAppointments}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Tổng số lịch hẹn
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Chờ xác nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.pending}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Cần xử lý
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Đã xác nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.confirmed}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Chờ tiếp nhận
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Đã tiếp nhận
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {statusCounts.checkedIn}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Xe đã vào gara
                </p>
              </div>
            </div>

            {/* BỘ LỌC */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900">
                  Bộ lọc lịch hẹn
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tìm theo khách hàng, xe, mã lịch hẹn hoặc ngày tiếp nhận.
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tên khách, số điện thoại, biển số, mã lịch..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="w-full xl:w-48">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Ngày tiếp nhận
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => handleStatusTab(item.value)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      status === item.value
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Danh sách lịch hẹn
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Quản lý thông tin và tiến độ tiếp nhận xe.
                  </p>
                </div>

                <span className="w-fit rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {totalAppointments} lịch hẹn
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3.5">Mã</th>
                        <th className="px-5 py-3.5">Khách hàng</th>
                        <th className="px-5 py-3.5">Xe</th>
                        <th className="px-5 py-3.5">Dịch vụ</th>
                        <th className="px-5 py-3.5">Thời gian</th>
                        <th className="px-5 py-3.5">Trạng thái</th>
                        <th className="px-5 py-3.5">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs">
                      {appointments.map((appointment) => {
                        const isConfirming =
                          loadingAction === `confirm-${appointment.id}`;
                        const isCheckingIn =
                          loadingAction === `checkin-${appointment.id}`;

                        return (
                          <tr
                            key={appointment.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                              {appointment.appointment_code}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {getAppointmentCustomer(appointment)}
                              </p>
                              <p className="mt-0.5 text-slate-400">
                                {getAppointmentPhone(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {getVehicleName(appointment.vehicle)}
                              </p>
                              <p className="mt-0.5 font-mono text-slate-500">
                                {getAppointmentPlate(appointment)}
                              </p>
                            </td>

                            <td className="max-w-[200px] px-5 py-4 text-slate-600">
                              <p className="line-clamp-2 leading-relaxed">
                                {getServiceName(appointment)}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {formatDate(appointment.appointment_date)}
                              </p>
                              <p className="mt-0.5 font-mono text-slate-500">
                                {appointment.appointment_time}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(
                                  appointment.status
                                )}`}
                              >
                                {getStatusText(appointment.status)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(appointment)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Chi tiết
                                </button>

                                {appointment.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isConfirming}
                                      onClick={() => handleConfirm(appointment.id)}
                                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                    >
                                      {isConfirming ? "Đang xử lý..." : "Xác nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
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
                                      onClick={() => handleCheckIn(appointment.id)}
                                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                    >
                                      {isCheckingIn ? "Đang xử lý..." : "Tiếp nhận"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
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
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    Không có lịch hẹn
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                    Không tìm thấy lịch hẹn phù hợp với bộ lọc hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}

              {!loading && totalAppointments > 0 && (
                <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-slate-500">
                    Hiển thị {currentPageStart} - {currentPageEnd} trong{" "}
                    {totalAppointments} lịch hẹn
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Trước
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            currentPage === page
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
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

      {/* MODAL CHI TIẾT */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Chi tiết lịch hẹn
                </p>
                <p className="font-mono text-xs text-slate-400">
                  {selectedAppointment.appointment_code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="space-y-4 p-6">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Khách hàng
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                    {getAppointmentCustomer(selectedAppointment)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getAppointmentPhone(selectedAppointment)}
                  </p>
                  {selectedAppointment.customer?.email && (
                    <p className="text-xs text-slate-500">
                      {selectedAppointment.customer.email}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Trạng thái
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                      selectedAppointment.status
                    )}`}
                  >
                    {getStatusText(selectedAppointment.status)}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Thông tin xe
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                    {getVehicleName(selectedAppointment.vehicle)}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {getAppointmentPlate(selectedAppointment)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Thời gian hẹn
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                    {formatDate(selectedAppointment.appointment_date)}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {selectedAppointment.appointment_time}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dịch vụ đã chọn
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {getServiceName(selectedAppointment)}
                  </p>
                </div>

                {selectedAppointment.symptom_description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Mô tả tình trạng
                    </p>
                    <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                      {selectedAppointment.symptom_description}
                    </div>
                  </div>
                )}

                {selectedAppointment.note && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ghi chú
                    </p>
                    <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                      {selectedAppointment.note}
                    </div>
                  </div>
                )}

                {selectedAppointment.cancel_reason && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      Lý do từ chối / hủy
                    </p>
                    <div className="mt-1.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                      {selectedAppointment.cancel_reason}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI */}
      {cancelAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Từ chối lịch hẹn
                </p>
                <p className="text-xs text-slate-400">
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                <p className="text-xs font-semibold text-rose-800">Lưu ý</p>
                <p className="mt-0.5 text-xs text-rose-700">
                  Vui lòng nhập lý do cụ thể để khách hàng nắm rõ nguyên nhân lịch hẹn bị từ chối.
                </p>
              </div>

              <label className="mt-4 block text-xs font-semibold text-slate-700">
                Lý do từ chối
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối lịch hẹn..."
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={
                  cancelReason.trim() === "" ||
                  loadingAction === `cancel-${cancelAppointment.id}`
                }
                onClick={handleCancel}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
              >
                {loadingAction === `cancel-${cancelAppointment.id}`
                  ? "Đang xử lý..."
                  : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO */}
      {toast && (
        <div className="fixed right-5 top-5 z-[60]">
          <div
            className={`min-w-[280px] rounded-xl border bg-white px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-800"
                : "border-rose-200 text-rose-800"
            }`}
          >
            <p className="text-xs font-semibold">
              {toast.type === "success" ? "Thành công" : "Có lỗi xảy ra"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;