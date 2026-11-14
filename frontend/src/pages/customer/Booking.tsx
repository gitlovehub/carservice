import { useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonClass } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { fetchApi } from "../../services/api";
import {
  getBookingCatalog,
  indexCatalogItems,
  type CatalogGroup,
  type CatalogItem,
} from "../../services/bookingCatalog";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { emptySelection, selectionFromVehicle, type VehicleSelection } from "../../services/vehicleCatalog";
import BookingSummary from "./booking/BookingSummary";
import Breadcrumb from "../../components/Breadcrumb";
import ServicePicker from "./booking/ServicePicker";

type SavedVehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  model_id?: number;
  trim_id?: number | null;
  model?: { id?: number; name: string; brand?: { id?: number; name: string } } | null;
  trim?: { id: number; name: string } | null;
};

const GARAGE_BRANCHES = [
  {
    id: "branch-cau-giay",
    name: "Cơ sở Cầu Giấy",
    fullName: "CarService Cầu Giấy (36 Dịch Vọng Hậu)",
    address: "Số 36 Phố Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    status: "Còn chỗ",
  },
];

const MORNING_SLOTS = ["08:00", "09:00", "09:30", "10:30", "11:15"];
const AFTERNOON_SLOTS = ["13:30", "14:15", "15:00", "16:00", "16:45"];

// Tự động format biển số xe theo chuẩn VN (VD: 30A-123.45 hoặc 51K-888.88 hoặc 29A-1234)
function formatLicensePlate(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return "";

  // Bắt đầu bằng 2 số tỉnh + 1 hoặc 2 chữ cái (VD: 30K, 29LD)
  const match = clean.match(/^([0-9]{2}[A-Z]{1,2})([0-9]*)$/);
  if (match) {
    const prefix = match[1];
    const nums = match[2];
    if (!nums) return prefix;
    if (nums.length <= 4) {
      return `${prefix}-${nums}`;
    }
    // 5 số: 3 số đầu + '.' + 2 số cuối (VD: 30K-888.88)
    const p1 = nums.slice(0, 3);
    const p2 = nums.slice(3, 5);
    return `${prefix}-${p1}.${p2}`;
  }

  return clean;
}

// Kiểm tra biển số xe ô tô có đúng chuẩn định dạng Việt Nam
function isValidLicensePlate(plate: string): boolean {
  const clean = plate.trim().toUpperCase().replace(/\s+/g, "");
  // Chuẩn 5 số: 30A-123.45, 51K-888.88, 29LD-123.45
  const regex5 = /^[1-9][0-9][A-Z]{1,2}-[0-9]{3}\.[0-9]{2}$/;
  // Chuẩn 4 số: 29A-1234, 30H-5678
  const regex4 = /^[1-9][0-9][A-Z]{1,2}-[0-9]{4}$/;
  return regex5.test(clean) || regex4.test(clean);
}

const BOOKING_STEPS = ["Xe", "Dịch vụ", "Ngày giờ", "Xác nhận"];
const SUCCESS_STEP = BOOKING_STEPS.length + 1;

type CustomerContact = { name: string; phone: string; email: string };

/** Hiện ngay thông tin đã lưu khi đăng nhập; /me sẽ cập nhật lại sau. */
function readStoredContact(): CustomerContact {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      name: user?.customer?.full_name ?? "",
      phone: user?.customer?.phone ?? "",
      email: user?.customer?.email ?? user?.email ?? "",
    };
  } catch {
    return { name: "", phone: "", email: "" };
  }
}

export default function Booking() {
  const { notify } = useAppFeedback();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Liên hệ: lấy từ hồ sơ khách, chỉ để khách kiểm tra lại.
  const [contact, setContact] = useState<CustomerContact>(readStoredContact);
  const [customerNotes, setCustomerNotes] = useState("");

  // Bước 1: Xe
  // Mặc định khai báo xe mới với form trống; chỉ đổ dữ liệu khi khách chọn xe đã lưu.
  // Hãng → Dòng xe → Phiên bản chọn từ danh mục (API), không còn danh sách cố định trong code.
  const [vehicleSelection, setVehicleSelection] = useState<VehicleSelection>(emptySelection);
  const vehicleBrand = vehicleSelection.brandName;
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState<number | null>(null);

  // Bước 2: Dịch vụ
  const [catalog, setCatalog] = useState<{ requestKey: string; groups: CatalogGroup[]; error: string }>({
    requestKey: "",
    groups: [],
    error: "",
  });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // ?symptom=... (từ mục "Xe bạn có dấu hiệu này?" ở trang chủ) điền sẵn mô tả triệu chứng.
  const [symptom, setSymptom] = useState(() => (searchParams.get("symptom") ?? "").slice(0, 500));
  const [mileage, setMileage] = useState("");
  const [debouncedMileage, setDebouncedMileage] = useState("");
  const deepLinkApplied = useRef(false);

  // Bước 3: Ngày & Giờ
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookingSlots, setBookingSlots] = useState({ morning: MORNING_SLOTS, afternoon: AFTERNOON_SLOTS });
  const [workingHours, setWorkingHours] = useState<Record<number, { open: string; close: string; active: boolean }> | null>(null);

  // Kết quả
  const [bookingCode, setBookingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [isLoggedIn] = useState(
    () => Boolean(localStorage.getItem("token")) && localStorage.getItem("isLoggedIn") === "true",
  );

  const garage = GARAGE_BRANCHES[0];

  // Hôm nay và 7 ngày tới
  const upcomingDates = useMemo(() => {
    const dates = [];
    const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const now = new Date();

    for (let i = 0; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayName = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : weekdays[d.getDay()];
      const dayFormatted = `${d.getDate()}/${d.getMonth() + 1}`;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      dates.push({
        index: i,
        dayName,
        dayFormatted,
        fullLabel: `${dayName}, ${dayFormatted}/${year}`,
        isoDate: `${year}-${month}-${day}`,
        dayOfWeek: d.getDay(),
      });
    }
    return dates;
  }, []);

  // Thông tin khách và xe đã lưu
  useEffect(() => {
    if (!isLoggedIn) return;

    fetchApi("/me")
      .then((res) => {
        const c = res?.account?.customer;
        if (!c) return;
        setContact((previous) => ({
          name: c.full_name || previous.name,
          phone: c.phone || previous.phone,
          email: c.email || previous.email,
        }));
      })
      .catch(() => {
        // Giữ thông tin từ localStorage.
      });

    const paramVehicleId = searchParams.get("vehicle_id");
    fetchApi("/me/vehicles")
      .then((res) => {
        const list: SavedVehicle[] = Array.isArray(res?.data) ? res.data : [];
        setSavedVehicles(list);
        // Chỉ chọn sẵn khi khách bấm "Đặt lịch" từ một xe cụ thể (?vehicle_id=).
        const target = paramVehicleId ? list.find((item) => String(item.id) === paramVehicleId) : undefined;
        if (target) fillFromSavedVehicle(target);
      })
      .catch(() => {
        // Chưa có xe đã lưu.
      });
  }, [isLoggedIn, searchParams]);

  const effectiveModelName = vehicleSelection.modelName;
  const selectedModelId = vehicleSelection.modelId;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMileage(mileage), 400);
    return () => clearTimeout(timer);
  }, [mileage]);

  // Khung giờ sáng / chiều do admin cấu hình (trang Giờ làm việc); lỗi mạng thì giữ khung giờ mặc định.
  useEffect(() => {
    let cancelled = false;
    fetchApi("/working-hours")
      .then((response: { data?: Array<{ day_of_week: number; open_time: string; close_time: string; is_active: boolean | number }> }) => {
        if (cancelled || !Array.isArray(response?.data)) return;
        setWorkingHours(Object.fromEntries(response.data.map((h) => [h.day_of_week, {
          open: String(h.open_time).slice(0, 5), close: String(h.close_time).slice(0, 5), active: Boolean(Number(h.is_active)),
        }])));
      })
      .catch(() => undefined);
    fetchApi("/booking-slots")
      .then((response: { data?: { morning?: string[]; afternoon?: string[] } }) => {
        if (cancelled || !response?.data) return;
        setBookingSlots({
          morning: Array.isArray(response.data.morning) ? response.data.morning : MORNING_SLOTS,
          afternoon: Array.isArray(response.data.afternoon) ? response.data.afternoon : AFTERNOON_SLOTS,
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Danh mục phụ thuộc dòng xe và số km nên tải lại khi chúng đổi.
  const catalogRequestKey = `${selectedModelId ?? ""}|${vehicleBrand}|${effectiveModelName}|${debouncedMileage}`;
  const catalogNeeded = currentStep >= 2 && currentStep !== SUCCESS_STEP;
  const catalogLoading = catalogNeeded && catalog.requestKey !== catalogRequestKey;

  useEffect(() => {
    if (!catalogNeeded) return;

    let cancelled = false;

    getBookingCatalog({
      modelId: selectedModelId,
      brand: vehicleBrand,
      model: effectiveModelName,
      mileage: debouncedMileage ? Number(debouncedMileage) : null,
    })
      .then((groups) => {
        if (cancelled) return;
        setCatalog({ requestKey: catalogRequestKey, groups, error: "" });
        const available = indexCatalogItems(groups);
        setSelectedKeys((keys) => {
          const kept = keys.filter((key) => available.has(key));
          if (deepLinkApplied.current) return kept;
          deepLinkApplied.current = true;
          const serviceParam = searchParams.get("service");
          const packageParam = searchParams.get("package");
          const linked = [
            serviceParam ? `service:${serviceParam}` : null,
            packageParam ? `package:${packageParam}` : null,
          ].filter((key): key is string => key !== null && available.has(key) && !kept.includes(key));
          return [...kept, ...linked];
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog((previous) => ({
          ...previous,
          requestKey: catalogRequestKey,
          error: "Không tải được danh sách dịch vụ. Vui lòng thử lại.",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [catalogNeeded, catalogRequestKey, selectedModelId, vehicleBrand, effectiveModelName, debouncedMileage, searchParams]);

  const catalogGroups = catalog.groups;
  const itemsByKey = useMemo(() => indexCatalogItems(catalogGroups), [catalogGroups]);
  const selectedItems = selectedKeys
    .map((key) => itemsByKey.get(key))
    .filter((item): item is CatalogItem => Boolean(item));
  const hasSymptom = symptom.trim() !== "";

  const showToast = (msg: string) => notify(msg, "success");

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Đổi xe trong bộ chọn = khai báo xe mới (bỏ chọn xe đã lưu).
  const handleSelectionChange = (next: VehicleSelection) => {
    setSelectedSavedVehicleId(null);
    setVehicleSelection(next);
    setErrors((prev) => ({ ...prev, brand: "", model: "" }));
  };

  function fillFromSavedVehicle(v: SavedVehicle) {
    setSelectedSavedVehicleId(v.id);
    setVehicleSelection(selectionFromVehicle(v));
    setVehiclePlate(v.license_plate ? formatLicensePlate(v.license_plate) : "");
    setErrors({});
  }

  const handleSelectSavedVehicle = (vId: number | null) => {
    const v = vId ? savedVehicles.find((item) => item.id === vId) : undefined;
    if (v) {
      fillFromSavedVehicle(v);
      return;
    }
    // Quay lại khai báo xe mới: xóa trắng form.
    setSelectedSavedVehicleId(null);
    setVehicleSelection(emptySelection);
    setVehiclePlate("");
    setErrors({});
  };

  const validateVehicleStep = () => {
    const newErrors: Record<string, string> = {};

    // Xe đã lưu gửi theo vehicle_id, không cần kiểm tra lại hãng/dòng/biển số.
    if (selectedSavedVehicleId) {
      setErrors({});
      return true;
    }

    if (vehicleSelection.brandId === null) {
      newErrors.brand = "Vui lòng chọn hãng xe.";
    } else if (vehicleSelection.modelId === null) {
      newErrors.model = `Vui lòng chọn dòng xe của hãng ${vehicleBrand}.`;
    }

    if (!vehiclePlate.trim()) {
      newErrors.plate = "Vui lòng nhập biển số xe.";
    } else if (!isValidLicensePlate(vehiclePlate)) {
      newErrors.plate = "Biển số không đúng chuẩn (VD: 30A-123.45).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateServiceStep = () => {
    if (selectedItems.length > 0 || hasSymptom) {
      setErrors({});
      return true;
    }
    setErrors({ services: "Vui lòng chọn dịch vụ hoặc mô tả tình trạng xe." });
    return false;
  };

  const isSlotUnavailable = (timeStr: string, dateIndex = selectedDateIndex) => {
    const selectedDate = upcomingDates[dateIndex];
    if (!selectedDate) return false;

    const slotDateTime = new Date(`${selectedDate.isoDate}T${timeStr}:00`);
    if (slotDateTime <= new Date()) return true;
    // Theo giờ làm việc admin cấu hình cho thứ đó; chưa tải được thì giữ quy tắc cũ (CN chỉ nhận buổi sáng).
    const hours = workingHours?.[selectedDate.dayOfWeek];
    if (hours) return !hours.active || timeStr < hours.open || timeStr >= hours.close;
    return selectedDate.dayOfWeek === 0 && timeStr > "12:00";
  };

  const handleDateSelect = (index: number) => {
    setSelectedDateIndex(index);
    if (selectedTime && isSlotUnavailable(selectedTime, index)) {
      setSelectedTime("");
    }
  };

  const validateTimeStep = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTime) {
      newErrors.time = "Vui lòng chọn khung giờ.";
    } else if (isSlotUnavailable(selectedTime)) {
      newErrors.time = "Khung giờ đã qua hoặc garage không phục vụ.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 140, behavior: "smooth" });
  };

  const handleNextClick = () => {
    const validators: Record<number, () => boolean> = {
      1: validateVehicleStep,
      2: validateServiceStep,
      3: validateTimeStep,
    };
    if (currentStep === BOOKING_STEPS.length) {
      void completeBooking();
      return;
    }
    if (validators[currentStep]?.()) {
      goToStep(currentStep + 1);
    }
  };

  const completeBooking = async () => {
    if (!isLoggedIn) {
      setSubmissionError("Vui lòng đăng nhập để đặt lịch.");
      return;
    }

    setSubmitting(true);
    setSubmissionError("");

    const selectedDate = upcomingDates[selectedDateIndex] || upcomingDates[0];
    const serviceIds = selectedItems.filter((item) => item.type === "service").map((item) => item.id);
    const packageIds = selectedItems.filter((item) => item.type === "package").map((item) => item.id);

    try {
      const response = await fetchApi("/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...(selectedSavedVehicleId
            ? { vehicle_id: selectedSavedVehicleId }
            : {
                new_vehicle: {
                  model_id: vehicleSelection.modelId,
                  trim_id: vehicleSelection.trimId,
                  license_plate: vehiclePlate.trim().toUpperCase(),
                },
              }),
          appointment_date: selectedDate.isoDate,
          appointment_time: selectedTime,
          service_ids: serviceIds,
          package_ids: packageIds,
          symptom_description: hasSymptom ? symptom.trim() : null,
          note: customerNotes.trim() || null,
        }),
      });
      const finalCode = response?.data?.appointment_code;
      if (!finalCode) {
        throw new Error("Chưa nhận được mã lịch hẹn. Vui lòng thử lại.");
      }

      setBookingCode(finalCode);
      goToStep(SUCCESS_STEP);

      setTimeout(() => {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }, 150);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : "Không thể gửi lịch hẹn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyBookingCode = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode).then(() => {
      showToast(`Đã sao chép mã: ${bookingCode}`);
    });
  };

  const resetFormToStart = () => {
    setCustomerNotes("");
    setSelectedTime("");
    setSelectedKeys([]);
    setSymptom("");
    setErrors({});
    goToStep(1);
  };

  const selectedDateObj = upcomingDates[selectedDateIndex] || upcomingDates[0];
  const finalModelDisplayName = [effectiveModelName || "Xe riêng", vehicleSelection.trimName].filter(Boolean).join(" ");
  const vehicleLabel = `${vehicleBrand} ${finalModelDisplayName}${vehiclePlate ? ` (${vehiclePlate})` : ""}`;
  const timeLabel = selectedTime ? `${selectedTime}, ${selectedDateObj.fullLabel}` : undefined;
  const showSummary = currentStep >= 2 && currentStep <= BOOKING_STEPS.length;

  const renderSlotGroup = (label: string, icon: string, slots: string[]) => slots.length > 0 && (
    <div>
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <i className={icon}></i> {label}
      </span>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {slots.map((slotTime) => {
          const isPassed = isSlotUnavailable(slotTime);
          const isSelected = selectedTime === slotTime;
          return (
            <button
              key={slotTime}
              type="button"
              disabled={isPassed}
              title={isPassed ? "Khung giờ không khả dụng" : undefined}
              onClick={() => {
                setSelectedTime(slotTime);
                clearError("time");
              }}
              className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                isPassed
                  ? "border-slate-100 bg-slate-100/70 text-slate-400 line-through"
                  : isSelected
                    ? "border-[#1F2933] bg-[#1F2933] text-white ring-2 ring-[#E8D3A8]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#D6A85F]"
              }`}
            >
              {slotTime}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--cs-bg,#f7f7f6)] [&_button:not(:disabled)]:cursor-pointer [&_a]:cursor-pointer text-[var(--cs-text,#191919)] [&_.bg-white]:bg-[var(--cs-surface,#fff)] [&_.bg-slate-50]:bg-[var(--cs-bg,#f7f7f6)] [&_.bg-slate-100]:bg-[var(--cs-surface-2,#f1f1ef)] [&_.text-slate-900]:text-[var(--cs-text,#191919)] [&_.text-slate-800]:text-[var(--cs-text,#191919)] [&_.text-slate-700]:text-[var(--cs-text,#191919)] [&_.text-slate-600]:text-[var(--cs-muted,#757575)] [&_.text-slate-500]:text-[var(--cs-muted,#757575)] [&_.border-slate-200]:border-[var(--cs-border,#e9e9e6)] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_input]:accent-[#cf2935] [&_input]:focus-visible:outline-[#cf2935] [&_select]:focus-visible:outline-[#cf2935] [&_textarea]:focus-visible:outline-[#cf2935] antialiased font-sans flex flex-col justify-between selection:bg-[#1F2933] selection:text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumb tone="light" className="!mb-0" items={[{ label: "Đặt lịch" }]}/>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="fa-solid fa-headset text-[#B68A43]"></i>
            <span>Hỗ trợ: <strong className="text-slate-800">033 240 5972</strong></span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-normal">Đặt lịch</h1>
        </div>

        {/* Stepper */}
        <ol className="mb-6 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4">
          {BOOKING_STEPS.map((label, index) => {
            const step = index + 1;
            const isDone = currentStep > step;
            const isCurrent = currentStep === step;
            const canJumpBack = isDone && currentStep !== SUCCESS_STEP;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!canJumpBack}
                  onClick={() => goToStep(step)}
                  aria-current={isCurrent ? "step" : undefined}
                  className="flex w-full flex-col items-center gap-1.5 disabled:cursor-default! disabled:opacity-100!"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[#1F2933] text-white ring-4 ring-[#F3E8D2]"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? <i className="fa-solid fa-check text-xs"></i> : step}
                  </span>
                  <span className={`text-xs sm:text-sm ${isCurrent ? "font-bold text-[#B68A43]" : isDone ? "font-semibold text-emerald-700" : "text-slate-400"}`}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className={`grid grid-cols-1 items-start gap-6 ${showSummary ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
          <div className="min-w-0 rounded-[19px] border border-slate-200/90 bg-white p-[18px] sm:p-6">
            {/* BƯỚC 1: XE */}
            {currentStep === 1 && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Xe của bạn</h2>
                  {savedVehicles.length > 0 && (
                    <select
                      aria-label="Xe đã lưu"
                      value={selectedSavedVehicleId ?? ""}
                      onChange={(e) => handleSelectSavedVehicle(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 sm:w-auto"
                    >
                      <option value="">+ Khai báo xe mới</option>
                      {savedVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {[v.model?.brand?.name, v.model?.name, v.trim?.name].filter(Boolean).join(" ")} ({v.license_plate || "Chưa có biển"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <VehicleSelector
                  className="mb-4"
                  value={vehicleSelection}
                  errors={{ brand: errors.brand || undefined, model: errors.model || undefined }}
                  onChange={handleSelectionChange}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="vehiclePlate" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
                      Biển số <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="vehiclePlate"
                      required
                      value={vehiclePlate}
                      onChange={(e) => {
                        setSelectedSavedVehicleId(null);
                        setVehiclePlate(formatLicensePlate(e.target.value));
                        clearError("plate");
                      }}
                      placeholder="30A-123.45"
                      maxLength={12}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider"
                    />
                    {errors.plate && <p className="mt-1 text-[12px] text-red-500">{errors.plate}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 2: DỊCH VỤ */}
            {currentStep === 2 && (
              <div>
                <h2 className="mb-5 border-b border-slate-100 pb-4 text-lg font-bold text-slate-900">Dịch vụ</h2>
                <ServicePicker
                  groups={catalogGroups}
                  loading={catalogLoading}
                  loadError={catalog.error}
                  selectedKeys={selectedKeys}
                  onSelectedKeysChange={(keys) => {
                    setSelectedKeys(keys);
                    clearError("services");
                  }}
                  symptom={symptom}
                  onSymptomChange={(value) => {
                    setSymptom(value);
                    clearError("services");
                  }}
                  mileage={mileage}
                  onMileageChange={setMileage}
                  error={errors.services}
                />
              </div>
            )}

            {/* BƯỚC 3: NGÀY GIỜ */}
            {currentStep === 3 && (
              <div>
                <h2 className="mb-5 border-b border-slate-100 pb-4 text-lg font-bold text-slate-900">Ngày giờ</h2>

                <div className="mb-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Ngày</p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {upcomingDates.map((d) => {
                      const isSelected = selectedDateIndex === d.index;
                      return (
                        <button
                          key={d.index}
                          type="button"
                          onClick={() => handleDateSelect(d.index)}
                          aria-pressed={isSelected}
                          className={`w-24 flex-shrink-0 rounded-2xl border-2 px-2 py-3 text-center transition ${
                            isSelected
                              ? "border-[#cf2935] bg-[#cf2935] font-bold text-white"
                              : "border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] hover:border-[#cf2935]"
                          }`}
                        >
                          <span className="block text-[12px] uppercase tracking-wider">{d.dayName}</span>
                          <span className="mt-0.5 block text-base font-extrabold">{d.dayFormatted}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Giờ</p>
                <div className="space-y-4">
                  {renderSlotGroup("Sáng", "fa-regular fa-sun text-amber-500", bookingSlots.morning)}
                  {renderSlotGroup("Chiều", "fa-solid fa-cloud-sun text-orange-500", bookingSlots.afternoon)}
                </div>
                {(() => {
                  const day = upcomingDates[selectedDateIndex]?.dayOfWeek;
                  const hours = day === undefined ? undefined : workingHours?.[day];
                  if (hours) return <p className="mt-3 text-xs text-amber-700">{hours.active ? `Ngày này ga-ra nhận lịch từ ${hours.open} đến ${hours.close}.` : "Ga-ra nghỉ ngày này, vui lòng chọn ngày khác."}</p>;
                  return day === 0 && <p className="mt-3 text-xs text-amber-700">Chủ nhật chỉ nhận lịch đến 12:00.</p>;
                })()}
                {errors.time && <p className="mt-2 text-[12px] text-red-500">{errors.time}</p>}
              </div>
            )}

            {/* BƯỚC 4: XÁC NHẬN */}
            {currentStep === 4 && (
              <div>
                <h2 className="mb-5 border-b border-slate-100 pb-4 text-lg font-bold text-slate-900">Xác nhận</h2>

                {isLoggedIn ? (
                  <div className="mb-5 rounded-2xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Liên hệ</h3>
                      <Link to="/customer/account" className="text-xs font-semibold text-cs-accent-text hover:underline">
                        Cập nhật
                      </Link>
                    </div>
                    <p className="text-sm text-slate-800">{contact.name || "Chưa có tên"}</p>
                    <p className="text-sm text-slate-600">{contact.phone || "Chưa có số điện thoại"}</p>
                    <p className="text-sm text-slate-600">{contact.email}</p>
                  </div>
                ) : (
                  <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Bạn cần <Link to="/login" className="font-bold underline">đăng nhập</Link> để đặt lịch.
                  </div>
                )}

                <div className="mb-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-1 text-sm font-bold text-slate-900">Địa điểm</h3>
                  <p className="text-sm text-slate-600">{garage.address}</p>
                </div>

                <label htmlFor="customerNotes" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Ghi chú <span className="font-normal normal-case text-slate-400">(không bắt buộc)</span>
                </label>
                <textarea
                  id="customerNotes"
                  rows={2}
                  maxLength={500}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="VD: Gọi trước khi nhận xe"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />

                {submissionError && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {submissionError}
                  </p>
                )}
              </div>
            )}

            {/* HOÀN TẤT */}
            {currentStep === SUCCESS_STEP && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Đã đặt lịch</h2>
                <p className="mt-1 text-sm text-slate-500">Gara sẽ xác nhận sớm.</p>

                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">Mã lịch hẹn</p>
                  <p className="mb-3 font-mono text-lg font-extrabold text-[#B68A43]">{bookingCode}</p>
                  <p><span className="text-slate-500">Xe:</span> <strong>{vehicleLabel}</strong></p>
                  <p><span className="text-slate-500">Thời gian:</span> <strong>{timeLabel}</strong></p>
                  <p className="mt-2 text-slate-500">Dịch vụ:</p>
                  <ul className="list-inside list-disc text-slate-800">
                    {selectedItems.map((item) => <li key={item.key}>{item.name}</li>)}
                    {hasSymptom && <li>Kiểm tra theo tình trạng xe</li>}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="secondary" icon="file" onClick={copyBookingCode}>Sao chép mã</Button>
                  <Link to="/customer/appointments" className={buttonClass({ variant: "outline" })}>
                    <Icon name="calendar" size={16}/>Xem lịch hẹn
                  </Link>
                  <Button variant="primary" icon="plus" onClick={resetFormToStart}>Đặt lịch khác</Button>
                </div>
              </div>
            )}

            {currentStep <= BOOKING_STEPS.length && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                {currentStep > 1 ? (
                  <Button variant="secondary" icon="arrow-left" onClick={() => goToStep(currentStep - 1)}>Quay lại</Button>
                ) : (
                  <div />
                )}
                <Button
                  variant="primary"
                  size="lg"
                  className="ml-auto"
                  iconRight={currentStep === BOOKING_STEPS.length ? "check" : "arrow-right"}
                  loading={submitting}
                  loadingText="Đang gửi..."
                  disabled={currentStep === BOOKING_STEPS.length && !isLoggedIn}
                  onClick={handleNextClick}
                >
                  {currentStep === BOOKING_STEPS.length ? "Xác nhận đặt lịch" : "Tiếp tục"}
                </Button>
              </div>
            )}
          </div>

          {showSummary && (
            <BookingSummary
              vehicleLabel={vehicleLabel}
              items={selectedItems}
              hasSymptom={hasSymptom}
              timeLabel={currentStep >= 3 ? timeLabel : undefined}
            />
          )}
        </div>
      </main>
    </div>
  );
}
