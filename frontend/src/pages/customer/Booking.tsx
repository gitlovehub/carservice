import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { fetchApi } from "../../services/api";

type Vehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  model?: { name: string; brand?: { name: string } } | null;
};

type Service = {
  id: number;
  name: string;
};

const initialServiceOptions = [
  "Bảo dưỡng định kỳ",
  "Kiểm tra tổng quát",
  "Thay dầu động cơ",
];

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
};

function Booking() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [car, setCar] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchApi("/me/vehicles/"), fetchApi("/services")])
      .then(([vehicleResponse, serviceResponse]) => {
        if (!active) return;
        setVehicles(Array.isArray(vehicleResponse?.data) ? vehicleResponse.data : []);
        setServices(Array.isArray(serviceResponse) ? serviceResponse : serviceResponse?.data ?? []);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if ((requestError as { status?: number })?.status === 401) {
          navigate("/login");
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu đặt lịch.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!car || !service || !date || !time) {
      setError("Vui lòng nhập đầy đủ thông tin đặt lịch.");
      return;
    }

    if (date < getTomorrowDateString()) {
      setError("Ngày hẹn phải sau ngày hiện tại.");
      return;
    }

    const selectedService = services.find((item) => item.name === service);

    setSubmitting(true);
    try {
      const response = await fetchApi("/appointments", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: Number(car),
          appointment_date: date,
          appointment_time: time,
          request_type: "MAINTENANCE",
          note: note.trim() || null,
          service_ids: selectedService ? [selectedService.id] : [],
          service_name: service,
        }),
      });

      setSuccess(`Đặt lịch thành công. Mã lịch hẹn: ${response?.data?.appointment_code ?? "đã được ghi nhận"}. Lịch đã được gửi đến admin và cố vấn.`);
      setCar("");
      setService("");
      setDate("");
      setTime("");
      setNote("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo lịch hẹn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main className="mx-auto max-w-[1050px] px-6 py-8 md:px-8 md:py-10">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#66717C] transition hover:bg-white hover:text-[#20252B]"
          >
            <span>←</span>
            Trở về trang chủ
          </Link>
        </div>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              ĐẶT LỊCH
            </p>

            <h1 className="mt-2 text-[26px] font-bold tracking-[-0.5px] text-[#1F2933]">
              Đặt lịch bảo dưỡng
            </h1>

            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#66717C]">
              Chọn xe, dịch vụ và thời gian phù hợp để tạo lịch hẹn.
            </p>
          </div>

          <div className="rounded-xl border border-[#E1E4E6] bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
              BƯỚC
            </p>

            <p className="mt-1 text-[13px] font-bold text-[#20252B]">
              01 / 02
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.05)]">
          <div className="border-b border-[#E1E4E6] px-6 py-5 md:px-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
              THÔNG TIN ĐẶT LỊCH
            </p>

            <p className="mt-1 text-[13px] text-[#66717C]">
              Vui lòng nhập đầy đủ thông tin trước khi xác nhận.
            </p>
          </div>

          <div className="p-6 md:p-7">
            {error && (
              <div role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                {success}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Xe của bạn
                </label>

                <select
                  value={car}
                  onChange={(e) => {
                    if (e.target.value === "ADD_NEW") {
                      navigate("/customer/cars");
                      return;
                    }
                    setCar(e.target.value);
                  }}
                  disabled={loading}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="" disabled>{loading ? "Đang tải xe..." : "Chọn xe"}</option>
                  {vehicles.map((vehicle) => {
                    const name = [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.variant, vehicle.year]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <option key={vehicle.id} value={vehicle.id}>
                        {name || "Xe"}{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
                      </option>
                    );
                  })}
                  <option value="ADD_NEW">＋ Thêm xe mới</option>
                </select>

                <p className="mt-1.5 text-[11px] text-[#8A949E]">
                  Chọn xe đã đăng ký với CarService.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Dịch vụ
                </label>

                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={loading}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="" disabled>{loading ? "Đang tải dịch vụ..." : "Chọn dịch vụ"}</option>
                  {initialServiceOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <p className="mt-1.5 text-[11px] text-[#8A949E]">
                  Chọn dịch vụ bạn muốn thực hiện.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Ngày hẹn
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={getTomorrowDateString()}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                />

                <p className="mt-1.5 text-[11px] text-[#8A949E]">
                  Chọn ngày bạn muốn đưa xe đến gara.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Khung giờ
                </label>

                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="" disabled>Chọn khung giờ</option>
                  <option value="08:00">08:00 – 10:00</option>
                  <option value="10:00">10:00 – 12:00</option>
                  <option value="13:00">13:00 – 15:00</option>
                  <option value="15:00">15:00 – 17:00</option>
                </select>

                <p className="mt-1.5 text-[11px] text-[#8A949E]">
                  Chọn một khung giờ phù hợp.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                Ghi chú
              </label>

              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Xe có tiếng kêu khi phanh, cần kiểm tra thêm..."
                className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              />

              <p className="mt-1.5 text-[11px] text-[#8A949E]">
                Mô tả tình trạng xe hoặc yêu cầu đặc biệt nếu có.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-4 border-t border-[#E1E4E6] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs text-[#3A3020]">
                  ✓
                </div>

                <p className="text-[11px] leading-5 text-[#66717C]">
                  Kiểm tra lại thông tin trước khi xác nhận lịch hẹn.
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/"
                  className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-5 py-3 text-xs font-semibold text-[#66717C] transition hover:border-[#1F2933] hover:text-[#20252B]"
                >
                  Hủy
                </Link>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading || submitting}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md"
                >
                  {submitting ? "Đang gửi..." : "Tiếp tục xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Booking;