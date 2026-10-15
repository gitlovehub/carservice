import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { fetchApi } from "../../services/api";

type Appointment = {
  id: string;
  rawId: number | string;
  car: string;
  service: string;
  date: string;
  rawDate: string;
  time: string;
  status: string;
  note: string;
  licensePlate: string;
};

function getStatusLabel(status: string) {
  const value = status.toLowerCase();

  if (["confirmed", "approved", "đã xác nhận", "confirmed_by_advisor"].includes(value)) {
    return "Đã xác nhận";
  }

  if (["completed", "complete", "finished", "đã hoàn thành", "completed"].includes(value)) {
    return "Hoàn thành";
  }

  if (["cancelled", "canceled", "đã hủy", "đã huỷ"].includes(value)) {
    return "Đã hủy";
  }

  if (["in_progress", "processing", "đang thực hiện"].includes(value)) {
    return "Đang thực hiện";
  }

  if (["rejected", "declined", "từ chối"].includes(value)) {
    return "Từ chối";
  }

  return "Chờ xác nhận";
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Đã xác nhận":
      return "bg-[#E5EFE7] text-[#356344]";
    case "Hoàn thành":
      return "bg-[#E8EAF5] text-[#444D88]";
    case "Đã hủy":
    case "Từ chối":
      return "bg-[#FBE9E7] text-[#A33E36]";
    case "Đang thực hiện":
      return "bg-[#FFF0D9] text-[#93611D]";
    default:
      return "bg-[#F3F4F2] text-[#66717C]";
  }
}

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return "Chưa có ngày hẹn";
  }

  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function Appointments() {
  const location = useLocation();
  const isCustomerPage = location.pathname === "/customer/appointments";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetchApi("/appointments");
      const result = response?.data;

      const items = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(response)
            ? response
            : [];

      const formatted: Appointment[] = items.map((item: any) => {
        const vehicle = item.vehicle ?? item.car ?? {};
        const model = vehicle.model ?? {};
        const brand = model.brand ?? vehicle.brand ?? {};

        const carName =
          [brand.name, model.name ?? vehicle.model_name]
            .filter(Boolean)
            .join(" ") ||
          vehicle.name ||
          vehicle.license_plate ||
          "Chưa có thông tin xe";

        const rawStatus = String(item.status ?? "pending");

        return {
          id: String(item.appointment_code ?? item.code ?? item.id ?? ""),
          rawId: item.id ?? item.appointment_id ?? item.appointment_code ?? "",
          car: carName,
          service:
            item.service_name ??
            item.service?.name ??
            item.service?.service_name ??
            "Chưa có thông tin dịch vụ",
          date: formatDate(item.appointment_date ?? item.date),
          rawDate: String(item.appointment_date ?? item.date ?? ""),
          time: String(item.appointment_time ?? item.time ?? ""),
          status: getStatusLabel(rawStatus),
          note: String(item.note ?? item.notes ?? ""),
          licensePlate: String(vehicle.license_plate ?? ""),
        };
      });

      setAppointments(formatted);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách lịch hẹn. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchStatus = !status || appointment.status === status;

      const matchKeyword =
        !search ||
        appointment.id.toLowerCase().includes(search) ||
        appointment.car.toLowerCase().includes(search) ||
        appointment.service.toLowerCase().includes(search) ||
        appointment.licensePlate.toLowerCase().includes(search);

      return matchStatus && matchKeyword;
    });
  }, [appointments, keyword, status]);

  const handleCancel = async () => {
    if (!cancelTarget) {
      return;
    }

    setActionMessage(
      "Chức năng hủy lịch cần endpoint hủy lịch được hỗ trợ bởi API."
    );
    setCancelTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      {isCustomerPage ? (
        <>
          <CustomerHeader />
          <CustomerTopbar />
        </>
      ) : (
        <Header />
      )}

      <main className={isCustomerPage ? "lg:ml-[250px]" : ""}>
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                {isCustomerPage
                  ? "KHÁCH HÀNG / LỊCH HẸN"
                  : "CARSERVICE / LỊCH HẸN"}
              </p>

              <h1 className="mt-3 text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Lịch hẹn
              </h1>

              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
                Quản lý và theo dõi các lịch hẹn bảo dưỡng, sửa chữa xe.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAppointments()}
              disabled={loading}
              className="rounded-xl border border-[#DDE1E4] bg-white px-4 py-3 text-[12px] font-semibold text-[#20252B] transition hover:border-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang tải..." : "↻ Làm mới"}
            </button>
          </div>

          {actionMessage && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-[#E9D7B5] bg-[#FFF8EA] px-4 py-3 text-[13px] text-[#765526]">
              <p>{actionMessage}</p>
              <button
                type="button"
                onClick={() => setActionMessage("")}
                className="font-bold"
              >
                ×
              </button>
            </div>
          )}

          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                TỔNG LỊCH HẸN
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                {appointments.length}
              </p>
              <p className="mt-3 text-[11px] text-[#66717C]">
                Tổng số lịch hẹn tải được từ hệ thống.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                KẾT QUẢ HIỆN TẠI
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                {filteredAppointments.length}
              </p>
              <p className="mt-3 text-[11px] text-[#66717C]">
                Số lịch hẹn phù hợp với bộ lọc.
              </p>
            </div>
          </div>

          <div className="mb-7 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="border-b border-[#E1E4E6] px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                BỘ LỌC
              </p>
              <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                Tìm kiếm lịch hẹn
              </h2>
              <p className="mt-1 text-[11px] text-[#66717C]">
                Tìm theo mã lịch hẹn, tên xe, biển số hoặc dịch vụ.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Từ khóa
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Nhập mã lịch hẹn, tên xe..."
                  className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#9AA3AA] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ xác nhận">Chờ xác nhận</option>
                  <option value="Đã xác nhận">Đã xác nhận</option>
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Đã hủy">Đã hủy</option>
                  <option value="Từ chối">Từ chối</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  APPOINTMENTS
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                  Danh sách lịch hẹn
                </h2>
              </div>
              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#66717C]">
                {filteredAppointments.length} kết quả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
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
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#66717C]">
                        Đang tải danh sách lịch hẹn...
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className="text-sm font-semibold text-red-600">{error}</p>
                        <button
                          type="button"
                          onClick={() => void loadAppointments()}
                          className="mt-4 rounded-xl bg-[#1F2933] px-4 py-2.5 text-xs font-semibold text-white"
                        >
                          Thử lại
                        </button>
                      </td>
                    </tr>
                  )}

                  {!loading && !error && filteredAppointments.map((appointment, index) => (
                    <tr
                      key={`${appointment.id}-${index}`}
                      className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                    >
                      <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[12px] font-bold text-[#20252B]">
                          {appointment.id || "Chưa có mã"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                            🚗
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#20252B]">
                              {appointment.car}
                            </p>
                            <p className="mt-1 text-[11px] text-[#8A949E]">
                              {appointment.licensePlate || "Phương tiện cá nhân"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[12px] text-[#66717C]">
                        {appointment.service}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[12px] font-semibold text-[#20252B]">
                          {appointment.date}
                        </span>
                        {appointment.time && (
                          <p className="mt-1 text-[11px] text-[#8A949E]">
                            {appointment.time.slice(0, 5)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${getStatusStyle(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(appointment)}
                            className="cursor-pointer rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                          >
                            Xem chi tiết
                          </button>
                          {["Chờ xác nhận", "Đã xác nhận"].includes(appointment.status) && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(appointment)}
                              className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[11px] font-medium text-[#20252B] transition hover:border-red-300 hover:text-red-600"
                            >
                              Hủy lịch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && !error && filteredAppointments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm text-[#66717C]">
                          —
                        </div>
                        <p className="mt-4 text-sm font-semibold text-[#20252B]">
                          {appointments.length === 0
                            ? "Bạn chưa có lịch hẹn nào"
                            : "Không tìm thấy lịch hẹn"}
                        </p>
                        <p className="mt-1 text-[11px] text-[#8A949E]">
                          {appointments.length === 0
                            ? "Lịch hẹn của bạn sẽ xuất hiện tại đây sau khi được ghi nhận."
                            : "Thử thay đổi từ khóa hoặc trạng thái tìm kiếm."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>
              <div>
                <p className="text-sm font-bold text-[#20252B]">Quản lý lịch hẹn</p>
                <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                  Theo dõi ngày hẹn, dịch vụ và trạng thái xử lý lịch hẹn tại CarService.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {!isCustomerPage && <Footer />}

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  APPOINTMENT DETAILS
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#1F2933]">
                  Chi tiết lịch hẹn
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="text-2xl text-[#66717C]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ["Mã lịch hẹn", selectedAppointment.id],
                ["Xe", selectedAppointment.car],
                ["Biển số", selectedAppointment.licensePlate || "Chưa có thông tin"],
                ["Dịch vụ", selectedAppointment.service],
                ["Ngày hẹn", selectedAppointment.date],
                ["Giờ hẹn", selectedAppointment.time || "Chưa có thông tin"],
                ["Trạng thái", selectedAppointment.status],
                ["Ghi chú", selectedAppointment.note || "Không có ghi chú"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-[#EEF0F2] pb-3">
                  <span className="text-[12px] text-[#66717C]">{label}</span>
                  <span className="max-w-[65%] text-right text-[12px] font-semibold text-[#20252B]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedAppointment(null)}
              className="mt-6 w-full rounded-xl bg-[#1F2933] px-4 py-3 text-sm font-semibold text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1F2933]">Xác nhận hủy lịch</h2>
            <p className="mt-3 text-sm leading-6 text-[#66717C]">
              Cậu có chắc muốn hủy lịch hẹn{" "}
              <span className="font-bold text-[#20252B]">{cancelTarget.id}</span> không?
            </p>
            <p className="mt-2 text-xs leading-5 text-[#8A949E]">
              Thao tác hủy chưa được kết nối vì cần xác định endpoint hủy lịch của API.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-xl border border-[#DDE1E4] px-4 py-3 text-sm font-semibold text-[#20252B]"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelLoading}
                className="flex-1 rounded-xl bg-[#1F2933] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;