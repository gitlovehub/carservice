
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchApi } from "../../services/api";
import {
  SERVICE_PRODUCTS,
  getServiceProductById,
  type ServiceProduct,
} from "../../services/serviceCatalog";

type Vehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  model?: {
    name: string;
    brand?: { name: string };
  } | null;
};

type Customer = {
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type DateOption = {
  iso: string;
  label: string;
  weekday: string;
  sunday: boolean;
};

const BRANDS: Record<string, string[]> = {
  Toyota: ["Vios", "Camry", "Corolla Altis", "Corolla Cross", "Raize", "Fortuner", "Innova", "Innova Cross", "Hilux", "Yaris Cross", "Veloz Cross", "Avanza Premio", "Land Cruiser Prado", "Land Cruiser", "Wigo"],
  Honda: ["City", "Civic", "CR-V", "HR-V", "BR-V", "Accord", "Brio"],
  Hyundai: ["Accent", "Grand i10", "Elantra", "Creta", "Tucson", "Santa Fe", "Custin", "Palisade", "Stargazer", "Venue"],
  Kia: ["Morning", "Soluto", "K3", "K5", "Sonet", "Seltos", "Carens", "Sportage", "Sorento", "Carnival"],
  Mazda: ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-30", "CX-5", "CX-8", "BT-50"],
  Ford: ["Ranger", "Everest", "Territory", "Explorer", "Ranger Raptor", "Transit"],
  VinFast: ["Fadil", "Lux A2.0", "Lux SA2.0", "President", "VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "VF e34"],
  Mitsubishi: ["Xpander", "Xforce", "Outlander", "Pajero Sport", "Triton", "Attrage"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "Maybach"],
  BMW: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7"],
  "Hãng khác": [],
};

const SLOTS = [
  "08:00", "09:00", "09:30", "10:30", "11:15",
  "13:30", "14:15", "15:00", "16:00", "16:45",
];

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 " +
  "text-sm text-slate-900 outline-none transition " +
  "focus:border-[#cf2935] focus:ring-2 focus:ring-[#cf2935]/10 " +
  "dark:border-[#41444b] dark:bg-[#24262b] dark:text-white";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm " +
  "dark:border-[#34373a] dark:bg-[#1b1d21] sm:p-7";

const mutedClass = "text-slate-500 dark:text-[#a1a5ad]";

function normalizePhone(phone: string) {
  return phone.replace(/[\s().-]/g, "");
}

function formatPlate(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = clean.match(/^([0-9]{2}[A-Z]{1,2})([0-9]*)$/);

  if (!match) return clean;

  const prefix = match[1];
  const digits = match[2].slice(0, 5);

  if (!digits) return prefix;
  if (digits.length <= 4) return `${prefix}-${digits}`;

  return `${prefix}-${digits.slice(0, 3)}.${digits.slice(3)}`;
}

function validPlate(plate: string) {
  return /^[1-9][0-9][A-Z]{1,2}-(?:[0-9]{4}|[0-9]{3}\.[0-9]{2})$/.test(
    plate.trim().toUpperCase()
  );
}

function getDates(): DateOption[] {
  const result: DateOption[] = [];

  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + i);

    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    result.push({
      iso,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      weekday: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" :
        date.toLocaleDateString("vi-VN", { weekday: "short" }),
      sunday: date.getDay() === 0,
    });
  }

  return result;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function Booking() {
  const [params] = useSearchParams();
  const serviceParam = params.get("service");
  const vehicleParam = params.get("vehicle_id");

  const [step, setStep] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [savedVehicleId, setSavedVehicleId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("TP. Hà Nội");
  const [notes, setNotes] = useState("");

  const [brand, setBrand] = useState("Toyota");
  const [model, setModel] = useState("Vios");
  const [plate, setPlate] = useState("");

  const [service, setService] = useState<ServiceProduct>(
    () => getServiceProductById(serviceParam) ?? SERVICE_PRODUCTS[0]
  );

  const dates = useMemo(getDates, []);
  const [date, setDate] = useState(dates[0].iso);
  const [time, setTime] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookingCode, setBookingCode] = useState("");

  const submittingRef = useRef(false);

  const selectedDate = dates.find(d => d.iso === date) ?? dates[0];

  const modelOptions = BRANDS[brand] ?? [];
  const isCustomModel = model === "Khác";

  const getFinalModel = () => model.trim();

  const isUnavailable = (slot: string, dateIso = date) => {
    const day = dates.find(d => d.iso === dateIso);
    if (!day) return true;

    if (day.sunday && slot > "12:00") return true;

    return new Date(`${dateIso}T${slot}:00`).getTime() <= Date.now();
  };

  const applyVehicle = (vehicle: Vehicle) => {
    const nextBrand = vehicle.model?.brand?.name ?? "Hãng khác";
    const nextModel = vehicle.model?.name ?? "";

    setSavedVehicleId(vehicle.id);
    setBrand(nextBrand);
    setModel(nextModel);
    setPlate(formatPlate(vehicle.license_plate ?? ""));
  };

  useEffect(() => {
    const product = getServiceProductById(serviceParam);
    if (product) setService(product);
  }, [serviceParam]);

  useEffect(() => {
    let active = true;

    let token: string | null = null;
    let logged = false;

    try {
      token = localStorage.getItem("token");
      logged = localStorage.getItem("isLoggedIn") === "true";
    } catch {
      // Không truy cập được bộ nhớ trình duyệt.
    }

    const authenticated = Boolean(token && logged);
    setIsLoggedIn(authenticated);

    if (!authenticated) return;

    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const customer: Customer = stored.customer ?? {};

      if (customer.full_name) setName(customer.full_name);
      if (customer.phone) setPhone(customer.phone);
      if (customer.email ?? stored.email) {
        setEmail(customer.email ?? stored.email);
      }
      if (customer.address) setCity(customer.address);
    } catch {
      // Bỏ qua dữ liệu cache không hợp lệ.
    }

    fetchApi("/me")
      .then(result => {
        if (!active) return;
        const customer: Customer = result?.account?.customer ?? {};

        if (customer.full_name) setName(customer.full_name);
        if (customer.phone) setPhone(customer.phone);
        if (customer.email ?? result?.account?.email) {
          setEmail(customer.email ?? result.account.email);
        }
        if (customer.address) setCity(customer.address);
      })
      .catch(() => {});

    fetchApi("/me/vehicles")
      .then(result => {
        if (!active) return;

        const list: Vehicle[] = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result) ? result : [];

        setVehicles(list);

        if (list.length > 0) {
          const preferred = list.find(
            item => String(item.id) === vehicleParam
          );

          applyVehicle(preferred ?? list[0]);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [vehicleParam]);

  const changeBrand = (value: string) => {
    setSavedVehicleId(null);
    setBrand(value);
    setModel(BRANDS[value]?.[0] ?? "Khác");
    setErrors(previous => ({ ...previous, model: "" }));
  };

  const changeModel = (value: string) => {
    setSavedVehicleId(null);
    setModel(value);
    setErrors(previous => ({ ...previous, model: "" }));
  };

  const changePlate = (value: string) => {
    setSavedVehicleId(null);
    setPlate(formatPlate(value));
    setErrors(previous => ({ ...previous, plate: "" }));
  };

  const validate = (targetStep: number) => {
    const next: Record<string, string> = {};

    if (targetStep === 1) {
      if (!name.trim()) next.name = "Vui lòng nhập họ tên.";

      if (!/^(?:0[35789]\d{8}|\+?84[35789]\d{8})$/.test(normalizePhone(phone))) {
        next.phone = "Số điện thoại không hợp lệ.";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        next.email = "Email không hợp lệ.";
      }

      if (!city.trim()) next.city = "Vui lòng chọn khu vực.";
    }

    if (targetStep === 2) {
      if (!getFinalModel()) next.model = "Vui lòng nhập dòng xe.";

      if (!savedVehicleId && !validPlate(plate)) {
        next.plate = "Biển số không hợp lệ. Ví dụ: 30A-123.45.";
      }

      if (!service) next.service = "Vui lòng chọn dịch vụ.";
    }

    if (targetStep === 3) {
      if (!time || isUnavailable(time)) {
        next.time = "Vui lòng chọn khung giờ hợp lệ.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = () => {
    if (!validate(step)) return;

    if (step === 3) {
      setSubmitError("");
      setConfirmOpen(true);
    } else {
      goTo(step + 1);
    }
  };

  const submit = async () => {
    if (submittingRef.current) return;

    if (!isLoggedIn) {
      setSubmitError("Vui lòng đăng nhập để xác nhận lịch hẹn.");
      return;
    }

    if (!validate(3)) {
      setConfirmOpen(false);
      goTo(3);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");

    const serviceNote =
      service.backendServiceName === service.title
        ? ""
        : `Nhu cầu cụ thể: ${service.title}`;

    const finalNote = [serviceNote, notes.trim()]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetchApi("/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...(savedVehicleId
            ? { vehicle_id: savedVehicleId }
            : {
                new_vehicle: {
                  brand,
                  model: getFinalModel(),
                  license_plate: plate.trim().toUpperCase(),
                  vehicle_type: "Ô tô",
                },
              }),
          appointment_date: date,
          appointment_time: time,
          request_type: "MAINTENANCE",
          note: finalNote || null,
          service_name: service.backendServiceName,
        }),
      });

      const code = response?.data?.appointment_code;

      if (!code) {
        throw new Error(
          "Chưa nhận được mã lịch hẹn. Vui lòng kiểm tra lịch hẹn trước khi gửi lại."
        );
      }

      setBookingCode(String(code));
      setConfirmOpen(false);
      goTo(4);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Không thể đặt lịch. Vui lòng thử lại."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl " +
    "bg-[#cf2935] px-6 py-3 text-sm font-bold text-white " +
    "hover:bg-[#a91e29] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f6] text-[#191919] dark:bg-[#111214] dark:text-[#f5f5f4]">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/"
          className={`mb-6 inline-flex text-sm font-medium hover:text-[#cf2935] ${mutedClass}`}
        >
          ← Trở về trang chủ
        </Link>

        <header className="mb-8 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#cf2935]">
            CARSERVICE / BOOKING
          </span>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Đặt lịch bảo dưỡng
          </h1>
          <p className={`mt-3 text-sm ${mutedClass}`}>
            Chọn xe, dịch vụ và thời gian tiếp nhận phù hợp.
          </p>
        </header>

        <nav
          aria-label="Tiến trình đặt lịch"
          className={`${cardClass} mb-6 grid grid-cols-4 gap-2`}
        >
          {["Liên hệ", "Xe & dịch vụ", "Ngày giờ", "Hoàn tất"].map(
            (label, index) => (
              <div key={label} className="text-center">
                <div
                  className={`mx-auto mb-2 grid size-9 place-items-center rounded-full text-sm font-bold ${
                    step >= index + 1
                      ? "bg-[#cf2935] text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-[#34373a] dark:text-[#a1a5ad]"
                  }`}
                >
                  {step > index + 1 ? "✓" : index + 1}
                </div>
                <span className="text-[11px] font-semibold sm:text-sm">
                  {label}
                </span>
              </div>
            )
          )}
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,0.8fr)]">
          <section className={cardClass}>
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Thông tin liên hệ</h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    Gara sử dụng thông tin này để liên hệ về lịch hẹn.
                  </p>
                </div>

                <div>
                  <label htmlFor="booking-name" className="mb-2 block text-sm font-semibold">
                    Họ và tên *
                  </label>
                  <input id="booking-name" className={inputClass} value={name}
                    onChange={e => setName(e.target.value)} autoComplete="name" />
                  <ErrorText message={errors.name} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-phone" className="mb-2 block text-sm font-semibold">
                      Số điện thoại *
                    </label>
                    <input id="booking-phone" type="tel" className={inputClass}
                      value={phone} onChange={e => setPhone(e.target.value)}
                      autoComplete="tel" />
                    <ErrorText message={errors.phone} />
                  </div>

                  <div>
                    <label htmlFor="booking-email" className="mb-2 block text-sm font-semibold">
                      Email *
                    </label>
                    <input id="booking-email" type="email" className={inputClass}
                      value={email} onChange={e => setEmail(e.target.value)}
                      autoComplete="email" />
                    <ErrorText message={errors.email} />
                  </div>
                </div>

                <div>
                  <label htmlFor="booking-city" className="mb-2 block text-sm font-semibold">
                    Khu vực *
                  </label>
                  <select id="booking-city" className={inputClass}
                    value={city} onChange={e => setCity(e.target.value)}>
                    {["TP. Hà Nội", "TP. Hồ Chí Minh", "TP. Đà Nẵng",
                      "TP. Hải Phòng", "Bình Dương", "Tỉnh thành khác",
                    ].map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                    {!["TP. Hà Nội", "TP. Hồ Chí Minh", "TP. Đà Nẵng",
                      "TP. Hải Phòng", "Bình Dương", "Tỉnh thành khác",
                    ].includes(city) && (
                      <option value={city}>{city}</option>
                    )}
                  </select>
                  <ErrorText message={errors.city} />
                </div>

                <div>
                  <label htmlFor="booking-notes" className="mb-2 block text-sm font-semibold">
                    Ghi chú tình trạng xe (không bắt buộc)
                  </label>
                  <textarea id="booking-notes" className={inputClass} rows={4}
                    maxLength={500} value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ví dụ: Xe rung khi phanh, cần kiểm tra..." />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Xe và dịch vụ</h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    Chọn xe đã lưu hoặc nhập thông tin xe mới.
                  </p>
                </div>

                {vehicles.length > 0 && (
                  <div>
                    <label htmlFor="saved-vehicle" className="mb-2 block text-sm font-semibold">
                      Xe trong tài khoản
                    </label>
                    <select id="saved-vehicle" className={inputClass}
                      value={savedVehicleId ?? ""}
                      onChange={e => {
                        const id = Number(e.target.value);
                        const selected = vehicles.find(v => v.id === id);
                        if (selected) applyVehicle(selected);
                        else {
                          setSavedVehicleId(null);
                          setPlate("");
                        }
                      }}>
                      <option value="">Nhập thông tin xe mới</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.model?.brand?.name} {v.model?.name} - {v.license_plate}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="car-brand" className="mb-2 block text-sm font-semibold">
                      Hãng xe *
                    </label>
                    <select id="car-brand" className={inputClass} value={brand}
                      onChange={e => changeBrand(e.target.value)}>
                      {Object.keys(BRANDS).concat(
                        brand in BRANDS ? [] : [brand]
                      ).map(value => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="car-model" className="mb-2 block text-sm font-semibold">
                      Dòng xe *
                    </label>
                    <select id="car-model" className={inputClass}
                      value={modelOptions.includes(model) || model === "Khác" ? model : "Khác"}
                      onChange={e => changeModel(e.target.value)}>
                      {modelOptions.map(value => (
                        <option key={value}>{value}</option>
                      ))}
                      <option value="Khác">Dòng xe khác</option>
                    </select>
                  </div>
                </div>

                {(isCustomModel || !modelOptions.includes(model)) && (
                  <div>
                    <label htmlFor="custom-car-model" className="mb-2 block text-sm font-semibold">
                      Nhập dòng xe
                    </label>
                    <input id="custom-car-model" className={inputClass}
                      value={model === "Khác" ? "" : model}
                      onChange={e => changeModel(e.target.value)}
                      placeholder="Ví dụ: Ranger Raptor" />
                  </div>
                )}
                <ErrorText message={errors.model} />

                <div>
                  <label htmlFor="car-plate" className="mb-2 block text-sm font-semibold">
                    Biển số xe *
                  </label>
                  <input id="car-plate" className={inputClass}
                    value={plate} onChange={e => changePlate(e.target.value)}
                    placeholder="30A-123.45" maxLength={12} />
                  <ErrorText message={errors.plate} />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold">Chọn dịch vụ *</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SERVICE_PRODUCTS.map(item => (
                      <label
                        key={item.id}
                        className={`cursor-pointer rounded-xl border p-4 transition ${
                          service.id === item.id
                            ? "border-[#cf2935] bg-red-50 dark:bg-[#3a2025]"
                            : "border-slate-200 dark:border-[#41444b]"
                        }`}
                      >
                        <input type="radio" name="service" className="sr-only"
                          checked={service.id === item.id}
                          onChange={() => setService(item)} />
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm">{item.title}</strong>
                          {service.id === item.id && <span className="text-[#cf2935]">✓</span>}
                        </div>
                        <p className={`mt-2 text-xs leading-5 ${mutedClass}`}>
                          {item.description}
                        </p>
                        <p className="mt-3 text-sm font-bold text-[#cf2935]">
                          {item.price}
                        </p>
                      </label>
                    ))}
                  </div>
                  <ErrorText message={errors.service} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Chọn ngày và giờ</h2>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    Khung giờ đề xuất, lịch tiếp nhận cần được gara xác nhận.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-[#41444b]">
                  <p className="font-semibold">Cơ sở Cầu Giấy</p>
                  <p className={`mt-1 text-xs ${mutedClass}`}>
                    36 Dịch Vọng Hậu, Cầu Giấy, Hà Nội
                  </p>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold">Ngày hẹn *</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {dates.map(item => (
                      <button key={item.iso} type="button"
                        onClick={() => {
                          setDate(item.iso);
                          setTime("");
                          setErrors({});
                        }}
                        className={`min-w-20 rounded-xl border px-3 py-3 text-center text-sm ${
                          date === item.iso
                            ? "border-[#cf2935] bg-[#cf2935] text-white"
                            : "border-slate-200 dark:border-[#41444b]"
                        }`}>
                        <span className="block text-xs">{item.weekday}</span>
                        <strong>{item.label}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold">Khung giờ *</h3>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {SLOTS.map(slot => {
                      const unavailable = isUnavailable(slot);
                      return (
                        <button key={slot} type="button"
                          disabled={unavailable}
                          onClick={() => {
                            setTime(slot);
                            setErrors({});
                          }}
                          className={`rounded-xl border px-2 py-3 text-sm font-semibold ${
                            unavailable
                              ? "cursor-not-allowed border-slate-200 opacity-35 dark:border-[#41444b]"
                              : time === slot
                                ? "border-[#cf2935] bg-[#cf2935] text-white"
                                : "border-slate-200 hover:border-[#cf2935] dark:border-[#41444b]"
                          }`}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  <ErrorText message={errors.time} />
                </div>

                {selectedDate.sunday && (
                  <p className="text-xs text-amber-600">
                    Chủ nhật chỉ nhận các khung giờ buổi sáng.
                  </p>
                )}

                <p className={`text-xs leading-6 ${mutedClass}`}>
                  Chọn được giờ trên giao diện không đồng nghĩa khung giờ
                  chắc chắn còn trống. Gara sẽ xác nhận sau khi tiếp nhận yêu cầu.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
                  ✓
                </div>
                <h2 className="text-2xl font-extrabold">
                  Đã gửi lịch hẹn thành công!
                </h2>
                <p className={`mt-3 text-sm ${mutedClass}`}>
                  CarService đã ghi nhận yêu cầu đặt lịch của bạn.
                </p>

                <div className="my-7 rounded-xl border border-slate-200 p-5 text-left dark:border-[#41444b]">
                  <p className={`text-xs ${mutedClass}`}>Mã lịch hẹn</p>
                  <p className="mt-1 break-all font-mono text-xl font-bold text-[#cf2935]">
                    {bookingCode}
                  </p>
                  <p className="mt-4 text-sm">{brand} {model} - {plate}</p>
                  <p className="mt-1 text-sm">{service.title}</p>
                  <p className="mt-1 text-sm">{date} lúc {time}</p>
                  <p className="mt-3 text-xs text-amber-600">
                    Trạng thái: Chờ gara xác nhận
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" className={buttonClass}
                    onClick={() => void navigator.clipboard.writeText(bookingCode)}>
                    Sao chép mã lịch
                  </button>
                  <Link to="/appointments"
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-bold dark:border-[#41444b]">
                    Xem lịch hẹn
                  </Link>
                </div>
              </div>
            )}

            {step < 4 && (
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-6 dark:border-[#41444b]">
                {step > 1 ? (
                  <button type="button" onClick={() => goTo(step - 1)}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold dark:border-[#41444b]">
                    ← Quay lại
                  </button>
                ) : <span />}

                <button type="button" className={buttonClass} onClick={nextStep}>
                  {step === 3 ? "Kiểm tra và xác nhận" : "Tiếp tục →"}
                </button>
              </div>
            )}
          </section>

          <aside className={`${cardClass} lg:sticky lg:top-24`}>
            <h2 className="mb-5 text-lg font-bold">Thông tin lịch hẹn</h2>

            <div className="space-y-4 text-sm">
              <div>
                <p className={mutedClass}>Khách hàng</p>
                <p className="mt-1 font-semibold">{name || "Chưa nhập"}</p>
              </div>
              <div>
                <p className={mutedClass}>Xe</p>
                <p className="mt-1 font-semibold">{brand} {model}</p>
                <p className="text-xs">{plate || "Chưa nhập biển số"}</p>
              </div>
              <div>
                <p className={mutedClass}>Dịch vụ</p>
                <p className="mt-1 font-semibold">{service.title}</p>
                <p className="text-xs text-[#cf2935]">{service.price}</p>
              </div>
              <div>
                <p className={mutedClass}>Thời gian</p>
                <p className="mt-1 font-semibold">
                  {time ? `${date} - ${time}` : "Chưa chọn"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-red-50 p-4 text-xs leading-6 text-slate-700 dark:bg-[#382126] dark:text-[#f5d4d6]">
              Đặt lịch không đồng nghĩa đặt trước phụ tùng.
              Mọi chi phí phát sinh cần được báo giá và xác nhận.
            </div>
          </aside>
        </div>
      </main>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-[#191919] shadow-2xl dark:bg-[#24262b] dark:text-white"
          >
            <h2 id="confirm-booking-title" className="text-xl font-bold">
              Xác nhận đặt lịch
            </h2>

            <p className={`mt-2 text-sm ${mutedClass}`}>
              Kiểm tra thông tin trước khi gửi đến gara.
            </p>

            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-[#41444b]">
              <p><strong>Khách hàng:</strong> {name}</p>
              <p><strong>Điện thoại:</strong> {phone}</p>
              <p><strong>Xe:</strong> {brand} {model} ({plate})</p>
              <p><strong>Dịch vụ:</strong> {service.title}</p>
              <p><strong>Thời gian:</strong> {date} - {time}</p>
              <p><strong>Địa điểm:</strong> Cơ sở Cầu Giấy</p>
            </div>

            {!isLoggedIn && (
              <p className="mt-4 text-sm text-amber-600">
                Bạn cần đăng nhập để gửi lịch hẹn.
                <Link to="/login" className="ml-2 font-bold underline">
                  Đăng nhập
                </Link>
              </p>
            )}

            {submitError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-[#44232a] dark:text-red-200">
                {submitError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold dark:border-[#41444b]">
                Xem lại
              </button>

              <button type="button" disabled={submitting || !isLoggedIn}
                onClick={() => void submit()} className={buttonClass}>
                {submitting ? "Đang gửi..." : "Xác nhận đặt lịch"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
