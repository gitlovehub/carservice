import { Button, IconButton, Modal } from "../../components/ui";
import { buttonClass } from "../../components/ui/buttonClass";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import {
  cancelAdvisorAppointment,
  checkInAdvisorAppointment,
  confirmAdvisorAppointment,
  getAdvisorAppointment,
  getAdvisorAppointments,
  type AppointmentStatus,
} from "../../services/advisorAppointmentService";
import { requestTypeLabel } from "../../services/workflowService";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { StatusBadge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { getStatus } from "../../config/status";

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
  /** Nhân viên xử lý gần nhất (xác nhận / tiếp nhận / đổi / hủy). */
  handled_by?: { id: number; email?: string; employee?: { full_name?: string } | null } | null;
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

type ApiError = {
  status?: number;
  message?: string;
};

// Nhãn tab lọc lấy từ config/status.ts để khớp đúng với badge trạng thái.
const statusOptions: {
  value: "" | AppointmentStatus;
  label: string;
}[] = [
  { value: "", label: "Tất cả" },
  ...(["PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED"] as const).map(value => ({ value, label: getStatus("appointment", value).label })),
];

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
    return requestTypeLabel(appointment.request_type);
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
  const { confirm, notify } = useAppFeedback();
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

  useEffect(() => {
    if (!selectedAppointment && !cancelAppointment) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedAppointment(null); setCancelAppointment(null); }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedAppointment, cancelAppointment]);

  const itemsPerPage = 15;
  const showToast = (message: string, type: "success" | "error" = "success") => notify(message, type);

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

  const handleConfirm = async (appointment: Appointment) => {
    const approved = await confirm({
      title: "Xác minh lịch hẹn với khách",
      reference: appointment.appointment_code,
      phone: appointment.customer?.phone,
      description: `Hãy liên hệ ${getAppointmentCustomer(appointment)} qua số ${getAppointmentPhone(appointment)} để kiểm tra nhu cầu dịch vụ và khung giờ ${formatDate(appointment.appointment_date)} lúc ${appointment.appointment_time}. Chỉ xác nhận khi khách đồng ý. Nếu không liên hệ được, hãy quay lại và giữ lịch ở trạng thái chờ.`,
      confirmText: "Khách đã đồng ý – Xác nhận lịch",
      variant: "success",
      cancelText: "Chưa liên hệ được / Để sau",
      checklist: [
        "Tôi đã liên hệ trực tiếp với khách hàng và xác minh đúng xe, dịch vụ, ngày giờ.",
        "Khách hàng đã đồng ý với lịch hẹn; gara có thể tiếp nhận theo lịch.",
      ],
    });
    if (!approved) return;
    const id = appointment.id;
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

  const handleCheckIn = async (appointment: Appointment) => {
    const approved = await confirm({
      title: "Xác nhận xe đã đến gara",
      reference: appointment.appointment_code,
      description: `Chỉ tiếp nhận khi khách đã thực sự đến gara và cố vấn đã đối chiếu xe ${getAppointmentPlate(appointment)} với lịch hẹn. Không thực hiện khi chỉ mới gọi điện xác nhận.`,
      confirmText: "Xác nhận xe đã đến",
      checklist: [
        "Khách hàng đã có mặt tại gara cùng phương tiện.",
        "Tôi đã đối chiếu biển số và thông tin lịch hẹn trước khi tiếp nhận.",
      ],
    });
    if (!approved) return;
    const id = appointment.id;
    try {
      setLoadingAction(`checkin-${id}`);
      const response = await checkInAdvisorAppointment(id);
      showToast(response?.message || "Tiếp nhận xe thành công.");
      await loadAppointments();
      navigate(`/advisor/reception?appointment=${id}`);
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
    <div className="cs-appointment-page min-h-screen bg-cs-bg text-cs-text">

      <div className="lg:ml-[250px]">

        <main>
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-10">
            {/* TIÊU ĐỀ */}
            <PageHeader title="Lịch hẹn" description="Theo dõi, xác nhận và tiếp nhận lịch hẹn của khách hàng tại xưởng."/>

            {/* THỐNG KÊ NHANH */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-cs-muted">
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
                  <Button variant="outline" icon="filter" onClick={handleReset}>Xóa bộ lọc</Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    aria-pressed={status === item.value}
                    onClick={() => handleStatusTab(item.value)}
                    className={buttonClass({ variant: status === item.value ? "tonal" : "outline", size: "sm" })}
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
                  <th className="px-5 py-3.5">Người xử lý</th>
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
                              <StatusBadge domain="appointment" status={appointment.status}/>
                            </td>

                            <td className="px-5 py-4 text-slate-600" data-testid="handled-by">
                              {appointment.handled_by ? (appointment.handled_by.employee?.full_name || appointment.handled_by.email) : <span className="text-slate-400">Chưa xử lý</span>}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm" variant="ghost" icon="eye" onClick={() => handleOpenDetail(appointment)}>Chi tiết</Button>

                                {appointment.status === "PENDING" && (
                                  <>
                                    <Button size="sm" variant="success" icon="check" loading={isConfirming} loadingText="Đang xử lý..." onClick={() => handleConfirm(appointment)}>Xác nhận</Button>

                                    <Button size="sm" variant="danger-outline" icon="x" onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}>Từ chối</Button>
                                  </>
                                )}

                                {appointment.status === "CHECKED_IN" && (
                                  <Button size="sm" variant="tonal" icon="clipboard" onClick={() => navigate(`/advisor/reception?appointment=${appointment.id}`)}>Tạo / xem phiếu</Button>
                                )}

                                {appointment.status === "CONFIRMED" && (
                                  <>
                                    <Button size="sm" variant="primary" icon="car" loading={isCheckingIn} loadingText="Đang xử lý..." onClick={() => handleCheckIn(appointment)}>Tiếp nhận</Button>

                                    <Button size="sm" variant="danger-outline" icon="x" onClick={() => {
                                        setCancelAppointment(appointment);
                                        setCancelReason("");
                                      }}>Từ chối</Button>
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
                  <Button variant="outline" icon="filter" className="mt-4" onClick={handleReset}>Xóa bộ lọc</Button>
                </div>
              )}

              {!loading && totalAppointments > 0 && (
                <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-slate-500">
                    Hiển thị {currentPageStart} - {currentPageEnd} trong{" "}
                    {totalAppointments} lịch hẹn
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" icon="chevron-left" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Trước</Button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          aria-current={currentPage === page ? "page" : undefined}
                          className={buttonClass({ variant: currentPage === page ? "tonal" : "outline", size: "sm", className: "min-w-8 px-2" })}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <Button size="sm" variant="outline" iconRight="chevron-right" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Sau</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Chi tiết lịch theo tokens của role; không đặt chữ trắng trên nền xám sáng. */}
      {selectedAppointment && (
        <Modal bare open onClose={() => setSelectedAppointment(null)} dismissible={!loadingAction} title={"Chi tiết lịch hẹn"} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-cs-border bg-cs-surface text-cs-text shadow-overlay">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-cs-border bg-cs-surface px-6 py-5">
              <div><h2 id="advisor-appointment-title" className="text-lg font-extrabold">Chi tiết lịch hẹn</h2><p className="mt-1 font-mono text-xs text-cs-muted">{selectedAppointment.appointment_code}</p></div>
              <IconButton icon="close" label="Đóng chi tiết" onClick={() => setSelectedAppointment(null)}/>
            </header>
            {loadingDetail ? <div className="p-6 text-sm text-cs-muted">Đang tải chi tiết lịch hẹn...</div> : <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {[
                ["Khách hàng", getAppointmentCustomer(selectedAppointment), getAppointmentPhone(selectedAppointment)],
                ["Xe / Biển số", getVehicleName(selectedAppointment.vehicle), getAppointmentPlate(selectedAppointment)],
                ["Ngày hẹn", formatDate(selectedAppointment.appointment_date), selectedAppointment.appointment_time],
              ].map(([label,value,extra]) => <div key={label} className="cs-info-panel min-w-0 p-4"><p className="text-xs font-bold uppercase tracking-wide text-cs-muted">{label}</p><p className="mt-2 break-words text-sm font-bold text-cs-text">{value}</p><p className="mt-1 break-all text-xs text-cs-muted">{extra}</p>{label === "Khách hàng" && selectedAppointment.customer?.email && <p className="mt-1 break-all text-xs text-cs-muted">{selectedAppointment.customer.email}</p>}</div>)}
              <div className="cs-info-panel p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-cs-muted">Trạng thái</p><StatusBadge domain="appointment" status={selectedAppointment.status}/></div>
              <div className="cs-info-panel p-4 sm:col-span-2"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-cs-muted">Khách yêu cầu</p><CustomerRequestSummary request={selectedAppointment}/></div>
              {selectedAppointment.cancel_reason && <div className="cs-info-panel p-4 sm:col-span-2"><p className="text-xs font-bold text-red-400">Lý do hủy</p><p className="mt-2 text-sm text-cs-text">{selectedAppointment.cancel_reason}</p></div>}
            </div>}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cs-border px-6 py-4"><p className="text-xs text-cs-muted">Thông tin từ hệ thống gara</p><Button variant="secondary" onClick={() => setSelectedAppointment(null)}>Đóng</Button></footer>
          </Modal>
      )}

      {/* MODAL TỪ CHỐI */}
      {cancelAppointment && (
        <Modal bare open onClose={() => setCancelAppointment(null)} dismissible={!loadingAction} title={"Từ chối lịch hẹn"} className="w-full max-w-md rounded-2xl border border-cs-border bg-cs-surface text-cs-text shadow-overlay">
            <div className="flex items-start justify-between border-b border-cs-border px-6 py-4">
              <div>
                <p className="text-base font-bold text-cs-text">
                  Từ chối lịch hẹn
                </p>
                <p className="text-xs text-cs-muted">
                  {cancelAppointment.appointment_code} -{" "}
                  {getAppointmentCustomer(cancelAppointment)}
                </p>
              </div>

              <IconButton icon="close" label="Đóng" size="sm" onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}/>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                <p className="text-xs font-semibold text-rose-400">Lưu ý</p>
                <p className="mt-0.5 text-xs text-cs-text">
                  Vui lòng nhập lý do cụ thể để khách hàng nắm rõ nguyên nhân lịch hẹn bị từ chối.
                </p>
              </div>

              <label className="mt-4 block text-xs font-semibold text-cs-text">
                Lý do từ chối
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Nhập lý do từ chối lịch hẹn..."
                className="mt-1.5 w-full resize-none rounded-xl border border-cs-border bg-cs-surface-2 p-3 text-sm text-cs-text placeholder:text-cs-muted outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-cs-border px-6 py-4">
              <Button variant="secondary" onClick={() => {
                  setCancelAppointment(null);
                  setCancelReason("");
                }}>Hủy bỏ</Button>

              <Button variant="danger" icon="x" disabled={cancelReason.trim() === ""} loading={loadingAction === `cancel-${cancelAppointment.id}`} loadingText="Đang xử lý..." onClick={handleCancel}>Xác nhận từ chối</Button>
            </div>
          </Modal>
      )}


    </div>
  );
}

export default Appointments;