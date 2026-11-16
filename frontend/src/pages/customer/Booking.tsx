import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, buttonClass } from "../../components/ui";
import ContactEditModal from "../../components/customer/ContactEditModal";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { fetchApi } from "../../services/api";
import {
  getBookingCatalog,
  indexCatalogItems,
  type CatalogGroup,
  type CatalogItem,
} from "../../services/bookingCatalog";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { clearServicePicks, readServicePicks, syncServicePicks } from "../../services/servicePicks";
import { emptySelection, selectionFromVehicle, type VehicleSelection } from "../../services/vehicleCatalog";
import BookingSummary from "./booking/BookingSummary";
import { ReferenceBanner } from "../showcase/ReferenceShell";
import { ProcessSteps } from "../showcase/ReferenceHome";
import { HomeFaq } from "../showcase/HomeSections";
import { formatGarageAddress, useGarageInfo } from "../../services/garageService";
import ServicePicker from "./booking/ServicePicker";
import BookingReviewModal from "./booking/BookingReviewModal";
import { logout } from "../auth/auth";
import { getStatus, type StatusTone } from "../../config/status";
import { formatLicensePlate } from "../../services/licensePlate";

type SavedVehicle = {
  id: number;
  license_plate: string | null;
  variant: string | null;
  year: number | null;
  mileage?: number | null;
  model_id?: number;
  trim_id?: number | null;
  model?: { id?: number; name: string; brand?: { id?: number; name: string } } | null;
  trim?: { id: number; name: string } | null;
};

const MORNING_SLOTS = ["08:00", "09:00", "09:30", "10:30", "11:15"];
const AFTERNOON_SLOTS = ["13:30", "14:15", "15:00", "16:00", "16:45"];

const WEEKDAY_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Đầu thẻ của một bước: ô icon + tiêu đề + mô tả; nền hồng (sáng) / tối, tuỳ chọn ảnh xe mờ ở bên phải. */
/** Màu badge theo tone của config/status.ts (cùng bảng màu với <Badge>). */
const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-neutral-soft text-neutral-fg",
  info: "bg-info-soft text-info-fg",
  warning: "bg-warning-soft text-warning-fg",
  success: "bg-success-soft text-success-fg",
  danger: "bg-danger-soft text-danger-fg",
  accent: "bg-cs-soft text-cs-accent-text",
};

type VehicleOption = { id: number | null; name: string; sub: string; brand?: string | null };

/** Xe chưa có biển số cùng dòng xe + phiên bản = cùng một xe → chỉ hiện 1 thẻ (ưu tiên xe đang chọn).
    Biển số khác nhau mới là các xe khác nhau. */
function dedupePlatelessVehicles(list: SavedVehicle[], selectedId: number | null): SavedVehicle[] {
  const keyOf = (v: SavedVehicle) => (v.license_plate?.trim() ? null : `${v.model_id ?? v.model?.id ?? v.model?.name ?? ""}|${v.trim_id ?? v.trim?.id ?? ""}`);
  const keep = new Map<string, number>();
  for (const v of list) {
    const key = keyOf(v);
    if (key !== null && (!keep.has(key) || v.id === selectedId)) keep.set(key, v.id);
  }
  return list.filter((v) => { const key = keyOf(v); return key === null || keep.get(key) === v.id; });
}

/** Xe đã lưu dạng slider ngang: không dàn hết ra khi khách có nhiều xe.
    Thẻ "Xe mới" luôn đứng đầu; xe đang chọn được cuộn vào tầm nhìn. */
function SavedVehicleSlider({ options, selectedId, onSelect }: { options: VehicleOption[]; selectedId: number | null; onSelect: (id: number | null) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const updateEdge = () => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const selected = el.querySelector<HTMLElement>('[aria-checked="true"]');
    if (selected) el.scrollLeft = Math.max(0, selected.offsetLeft - el.offsetLeft - 10);
    updateEdge();
    const ro = new ResizeObserver(updateEdge);
    ro.observe(el);
    return () => ro.disconnect();
    // Chỉ căn xe đang chọn khi mở bước 1 / số xe đổi, không giật khi khách tự cuộn.
  }, [options.length]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const navBtn = "grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition disabled:cursor-default disabled:opacity-35 enabled:hover:border-[#e11d2e] enabled:hover:text-[#e11d2e]";

  return (
    <div className="mb-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">
          Xe đã lưu <span className="text-sm font-semibold text-slate-400">({options.length - 1})</span>
        </h3>
        {!(edge.start && edge.end) && (
          <div className="flex gap-2">
            <button type="button" className={navBtn} onClick={() => scrollByPage(-1)} disabled={edge.start} aria-label="Xe trước"><Icon name="chevron-left" size={16}/></button>
            <button type="button" className={navBtn} onClick={() => scrollByPage(1)} disabled={edge.end} aria-label="Xe tiếp theo"><Icon name="chevron-right" size={16}/></button>
          </div>
        )}
      </div>
      <div ref={trackRef} onScroll={updateEdge} role="radiogroup" aria-label="Chọn xe"
        className={`-mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2.5 overflow-x-auto scroll-smooth px-2.5 pt-2.5 pb-3 scrollbar-none [&::-webkit-scrollbar]:hidden ${edge.end ? "" : "mask-[linear-gradient(90deg,#000_82%,transparent)]"}`}>
        {options.map((opt) => {
          const on = selectedId === opt.id;
          return (
            <button key={opt.id ?? "new"} type="button" role="radio" aria-checked={on} onClick={() => onSelect(opt.id)}
              className={`relative flex shrink-0 basis-[calc((100%-0.625rem)/1.5)] snap-start items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition sm:basis-[calc((100%-1.25rem)/2.5)] lg:basis-[calc((100%-1.875rem)/3.5)] ${on ? "border-[#e11d2e] bg-[#fff1f2] shadow-[0_8px_20px_#e11d2e1f] dark:bg-[var(--cs-soft)]" : "border-slate-200 bg-white hover:border-[#e11d2e]"}`}>
              {opt.id === null
                ? <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-[#e11d2e] text-white" : "bg-slate-100 text-slate-500"}`}><Icon name="plus" size={18}/></span>
                // Xe đã lưu: logo hãng (logo Admin tải lên / có sẵn / chữ cái đầu).
                : <VehicleBrandLogo brand={opt.brand} size={40} className="rounded-xl"/>}
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900">{opt.name}</span><span className="block truncate text-xs text-slate-500">{opt.sub}</span></span>
              {on && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-[#e11d2e] text-white shadow"><Icon name="check" size={13}/></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({ icon, title, subtitle, image }: { icon: IconName; title: string; subtitle: string; image?: string }) {
  return (
    <div className="relative -mx-[18px] -mt-[18px] mb-6 flex items-center gap-4 overflow-hidden rounded-t-[19px] border-b border-slate-200 bg-gradient-to-r from-[#fff1f2] via-[#ffe8eb] to-[#fff5f6] px-[18px] py-5 sm:-mx-6 sm:-mt-6 sm:px-6 dark:from-[#1b1d21] dark:via-[#1b1d21] dark:to-[#2a1418]">
      {image && <img src={image} alt="" aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[45%] object-cover object-[70%_55%] opacity-40 [mask-image:linear-gradient(90deg,transparent,#000_55%)] sm:block dark:opacity-60"/>}
      <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-white/85 text-[#e11d2e] shadow-sm dark:bg-[#4a1219] dark:text-white"><Icon name={icon} size={28}/></span>
      <div className="relative z-10 min-w-0">
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}

const BOOKING_STEPS = ["Xe", "Dịch vụ", "Ngày giờ", "Xác nhận"];
const SUCCESS_STEP = BOOKING_STEPS.length + 1;

type CustomerContact = { name: string; phone: string; email: string };

/* ------------------------------------------------------------- Bản nháp đặt lịch
 * Khách chưa đăng nhập vẫn điền được form. Mọi thay đổi được lưu (localStorage, 24 giờ);
 * khi bấm gửi mà chưa đăng nhập → sang /login rồi quay lại /booking, form được khôi phục nguyên trạng.
 * Nháp chỉ chứa lựa chọn đặt lịch (xe, dịch vụ, ngày giờ, ghi chú) — không chứa mật khẩu hay token. */
const DRAFT_KEY = "cs-booking-draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
type BookingDraft = {
  savedAt: number; step: number; vehicleSelection: VehicleSelection; vehiclePlate: string;
  selectedKeys: string[]; symptom: string; mileage: string; date: string; time: string; notes: string;
  /** true khi khách vừa được chuyển sang đăng nhập để gửi lịch → luôn khôi phục khi quay lại. */
  awaitingLogin?: boolean;
};
function readDraft(): BookingDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as BookingDraft | null;
    if (!draft || Date.now() - draft.savedAt > DRAFT_TTL_MS) { localStorage.removeItem(DRAFT_KEY); return null; }
    return draft;
  } catch { return null; }
}
function writeDraft(draft: BookingDraft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage bị chặn: bỏ qua */ } }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* bỏ qua */ } }
/** Nháp có nội dung đáng giữ (tránh lưu / báo "khôi phục" cho form trống). */
const draftHasContent = (d: Pick<BookingDraft, "vehicleSelection" | "vehiclePlate" | "selectedKeys" | "symptom" | "time" | "notes">) =>
  d.vehicleSelection.brandId !== null || d.vehiclePlate.trim() !== "" || d.selectedKeys.length > 0 || d.symptom.trim() !== "" || d.time !== "" || d.notes.trim() !== "";
/** yyyy-mm-dd của hôm nay + offset ngày (giờ địa phương). */
function isoDay(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Khôi phục nháp: luôn khôi phục khi vừa đăng nhập xong; nếu không, chỉ khôi phục khi URL không
  // mang lựa chọn mới (?service / ?package / ?vehicle_id / ?symptom) — link mới thì bắt đầu form mới.
  const [draft] = useState<BookingDraft | null>(() => {
    const saved = readDraft();
    if (!saved || !draftHasContent(saved)) return null;
    const hasDeepLink = ["service", "services", "package", "vehicle_id", "symptom"].some((k) => searchParams.has(k));
    return saved.awaitingLogin || !hasDeepLink ? saved : null;
  });
  const draftDateIndex = draft ? Array.from({ length: 8 }, (_, i) => isoDay(i)).indexOf(draft.date) : -1;
  const [restoredNotice, setRestoredNotice] = useState(Boolean(draft));

  const [currentStep, setCurrentStep] = useState<number>(() => Math.min(Math.max(draft?.step ?? 1, 1), BOOKING_STEPS.length));

  // Liên hệ: lấy từ hồ sơ khách, chỉ để khách kiểm tra lại.
  const [contact, setContact] = useState<CustomerContact>(readStoredContact);
  const [customerNotes, setCustomerNotes] = useState(() => draft?.notes ?? "");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Bước 1: Xe
  // Mặc định khai báo xe mới với form trống; chỉ đổ dữ liệu khi khách chọn xe đã lưu.
  // Hãng → Dòng xe → Phiên bản chọn từ danh mục (API), không còn danh sách cố định trong code.
  const [vehicleSelection, setVehicleSelection] = useState<VehicleSelection>(() => draft?.vehicleSelection ?? emptySelection);
  const vehicleBrand = vehicleSelection.brandName;
  const [vehiclePlate, setVehiclePlate] = useState(() => draft?.vehiclePlate ?? "");
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState<number | null>(null);

  // Bước 2: Dịch vụ
  const [catalog, setCatalog] = useState<{ requestKey: string; groups: CatalogGroup[]; error: string }>({
    requestKey: "",
    groups: [],
    error: "",
  });
  // Dịch vụ / gói khách bấm "Đặt lịch" ở trang khác (?service=ID, ?services=1,2,3, ?package=ID): đưa vào
  // lựa chọn NGAY từ bước 1 → được lưu vào nháp luôn (rời trang / đăng nhập giữa chừng vẫn còn). Sang bước 2,
  // mục nào không áp dụng cho dòng xe đã chọn sẽ bị bỏ khi danh mục tải xong.
  const [linkedKeys] = useState<string[]>(() => {
    const serviceIds = [searchParams.get("service"), ...(searchParams.get("services") ?? "").split(",")]
      .map((id) => (id ?? "").trim()).filter((id) => /^\d+$/.test(id));
    const packageId = (searchParams.get("package") ?? "").trim();
    const fromLink = [...serviceIds.map((id) => `service:${id}`), ...(/^\d+$/.test(packageId) ? [`package:${packageId}`] : [])];
    // Vào Đặt lịch từ menu (không mang lựa chọn, không có nháp): dùng dịch vụ khách đang tick ở trang Dịch vụ.
    const fromPicks = fromLink.length === 0 && !draft ? readServicePicks().ids.map((id) => `service:${id}`) : [];
    return [...new Set([...fromLink, ...fromPicks])];
  });
  // Luôn GỘP mục trong link vào lựa chọn — kể cả khi khôi phục nháp (vd. nháp chờ đăng nhập) — để bấm "Đặt lịch"
  // ở dịch vụ / gói nào thì dịch vụ đó chắc chắn có ở bước 2.
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => [...new Set([...(draft?.selectedKeys ?? []), ...linkedKeys])]);
  // Mục vừa mang sang từ link: sáng nhẹ MỘT lần khi khách tới bước 2 để biết đã có sẵn ở đây.
  const [flashKeys, setFlashKeys] = useState<string[]>(() => linkedKeys.filter((key) => !(draft?.selectedKeys ?? []).includes(key)));

  // Lựa chọn từ link đã nằm trong state + nháp → bỏ ?service / ?services / ?package / ?symptom khỏi URL, để tải lại
  // trang không "nhét lại" dịch vụ khách vừa xóa. (Đăng nhập giữa chừng vẫn quay về đúng form nhờ nháp.)
  useEffect(() => {
    if (!["service", "services", "package", "symptom"].some((key) => searchParams.has(key))) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      ["service", "services", "package", "symptom"].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Đồng bộ kho lựa chọn chung (trang Dịch vụ / chi tiết nhóm dịch vụ) theo đúng dịch vụ đang chọn ở đây:
  // khách xóa dịch vụ ở bước 2 thì nơi khác cũng bỏ tick.
  useEffect(() => {
    syncServicePicks(selectedKeys.filter((key) => key.startsWith("service:")).map((key) => Number(key.slice("service:".length))));
  }, [selectedKeys]);
  // ?symptom=... (từ mục "Xe bạn có dấu hiệu này?" ở trang chủ) điền sẵn mô tả triệu chứng.
  const [symptom, setSymptom] = useState(() => draft?.symptom ?? (searchParams.get("symptom") ?? "").slice(0, 500));
  const [mileage, setMileage] = useState(() => draft?.mileage ?? "");
  const [debouncedMileage, setDebouncedMileage] = useState(() => draft?.mileage ?? "");
  const dayStripRef = useRef<HTMLDivElement>(null);

  // Bước 3: Ngày & Giờ — ngày trong nháp đã quá hạn (ngoài 8 ngày tới) thì chọn lại từ đầu.
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(() => Math.max(draftDateIndex, 0));
  const [selectedTime, setSelectedTime] = useState<string>(() => (draftDateIndex >= 0 ? draft?.time ?? "" : ""));
  const [bookingSlots, setBookingSlots] = useState({ morning: MORNING_SLOTS, afternoon: AFTERNOON_SLOTS });
  const [workingHours, setWorkingHours] = useState<Record<number, { open: string; close: string; active: boolean }> | null>(null);

  // Kết quả
  const [bookingCode, setBookingCode] = useState<string>("");
  const [bookingStatus, setBookingStatus] = useState<string>("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [isLoggedIn] = useState(
    () => Boolean(localStorage.getItem("token")) && localStorage.getItem("isLoggedIn") === "true",
  );
  // Trang giờ công khai: tài khoản nhân viên (admin/cố vấn) xem được nhưng không đặt lịch cho chính mình ở đây.
  const [isStaffAccount] = useState(() => isLoggedIn && !["", "CUSTOMER"].includes(localStorage.getItem("role") ?? ""));

  // Địa chỉ & hotline lấy từ Admin → Thông tin gara (không viết cứng trong code).
  const garageInfo = useGarageInfo();
  const garageAddress = formatGarageAddress(garageInfo);
  const garagePhone = garageInfo?.phone?.trim() || null;
  const garageMapUrl = garageInfo?.latitude != null && garageInfo?.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${garageInfo.latitude},${garageInfo.longitude}`
    : garageAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(garageAddress)}` : null;

  // Hôm nay và 7 ngày tới
  const upcomingDates = useMemo(() => {
    const dates = [];
    const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const now = new Date();

    for (let i = 0; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayName = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : weekdays[d.getDay()];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      // Định dạng chung web khách: ngày/tháng có số 0 đầu (09/11).
      const dayFormatted = `${day}/${month}`;

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

  // Lưu nháp sau mỗi thay đổi (trước khi đặt xong). Xe đã lưu của tài khoản không đưa vào nháp.
  useEffect(() => {
    if (currentStep === SUCCESS_STEP) return;
    const next: BookingDraft = {
      savedAt: Date.now(), step: currentStep,
      vehicleSelection: selectedSavedVehicleId ? emptySelection : vehicleSelection,
      vehiclePlate: selectedSavedVehicleId ? "" : vehiclePlate,
      selectedKeys, symptom, mileage, notes: customerNotes,
      date: isoDay(selectedDateIndex), time: selectedTime,
    };
    if (draftHasContent(next)) writeDraft(next);
  }, [currentStep, vehicleSelection, vehiclePlate, selectedSavedVehicleId, selectedKeys, symptom, mileage, customerNotes, selectedDateIndex, selectedTime]);

  /** Chưa đăng nhập: giữ nháp (đánh dấu chờ đăng nhập) rồi sang /login; đăng nhập xong Login.tsx đưa về đúng /booking. */
  const goLoginToFinish = () => {
    writeDraft({ ...(readDraft() ?? {
      savedAt: Date.now(), step: currentStep, vehicleSelection, vehiclePlate, selectedKeys, symptom, mileage,
      notes: customerNotes, date: isoDay(selectedDateIndex), time: selectedTime,
    }), savedAt: Date.now(), awaitingLogin: true });
    navigate("/login", { state: { from: { pathname: "/booking", search: location.search, hash: "" } } });
  };

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
  // Chỉ báo "đang tải" ở lần tải đầu (chưa có danh mục). Đổi số km / dòng xe → tải lại ngầm, giữ danh mục cũ
  // để nút "Thêm dịch vụ" không nhấp nháy mỗi lần bấm +/− số km.
  const catalogLoading = catalogNeeded && catalog.requestKey !== catalogRequestKey && catalog.groups.length === 0;

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
        // Bỏ mục không áp dụng cho dòng xe đang chọn (hàm cập nhật thuần — không đổi ref/state khác bên trong).
        setSelectedKeys((keys) => keys.filter((key) => available.has(key)));
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
  }, [catalogNeeded, catalogRequestKey, selectedModelId, vehicleBrand, effectiveModelName, debouncedMileage]);

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
    // Điền sẵn odo đã lưu của xe ở bước Dịch vụ; khách sửa nếu đã chạy thêm.
    const savedKm = v.mileage ? String(v.mileage) : "";
    setMileage(savedKm);
    setDebouncedMileage(savedKm);
    setErrors({});
  }

  const handleSelectSavedVehicle = (vId: number | null) => {
    const v = vId ? savedVehicles.find((item) => item.id === vId) : undefined;
    if (v) {
      fillFromSavedVehicle(v);
      return;
    }
    // Quay lại khai báo xe mới: xóa trắng form (kể cả odo của xe vừa bỏ chọn).
    setSelectedSavedVehicleId(null);
    setVehicleSelection(emptySelection);
    setVehiclePlate("");
    setMileage("");
    setDebouncedMileage("");
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
      // Đã đăng nhập: mở modal xem lại + 2 ô đồng ý trước khi gửi; chưa đăng nhập / nhân viên xử lý như cũ.
      if (isLoggedIn && !isStaffAccount) {
        setSubmissionError("");
        setReviewOpen(true);
      } else {
        void completeBooking();
      }
      return;
    }
    if (validators[currentStep]?.()) {
      goToStep(currentStep + 1);
    }
  };

  const completeBooking = async () => {
    if (!isLoggedIn) {
      goLoginToFinish();
      return;
    }
    if (isStaffAccount) {
      setSubmissionError("Tài khoản nhân viên không đặt lịch ở trang này. Vui lòng dùng chức năng tạo lịch hẹn trong khu quản lý.");
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
                  license_plate: vehiclePlate.trim() ? vehiclePlate.trim().toUpperCase() : null,
                },
              }),
          appointment_date: selectedDate.isoDate,
          appointment_time: selectedTime,
          // Odo khách nhập ở bước Dịch vụ → backend cập nhật hồ sơ xe (chỉ khi lớn hơn số đang lưu).
          mileage: mileage && Number.isFinite(Number(mileage)) ? Number(mileage) : null,
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
      setBookingStatus(response?.data?.status ?? "PENDING");
      setReviewOpen(false);
      clearDraft();
      // Dịch vụ đã chọn ở trang chi tiết nhóm dịch vụ đã vào lịch hẹn → xóa để lần sau bắt đầu mới.
      clearServicePicks();
      setRestoredNotice(false);
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

  /** "Làm lại từ đầu" trên thông báo khôi phục: xoá nháp và toàn bộ lựa chọn. */
  const discardDraft = () => {
    clearDraft();
    setRestoredNotice(false);
    setSelectedSavedVehicleId(null);
    setVehicleSelection(emptySelection);
    setVehiclePlate("");
    setMileage("");
    setSelectedDateIndex(0);
    resetFormToStart();
  };

  const selectedDateObj = upcomingDates[selectedDateIndex] || upcomingDates[0];
  const finalModelDisplayName = [effectiveModelName || "Xe riêng", vehicleSelection.trimName].filter(Boolean).join(" ");
  const vehicleLabel = `${vehicleBrand} ${finalModelDisplayName}${vehiclePlate ? ` (${vehiclePlate})` : ""}`;
  const timeLabel = selectedTime ? `${selectedTime}, ${selectedDateObj.fullLabel}` : undefined;
  // Bước 3 có khung "Thông tin đã chọn" ngay trong thẻ → ẩn cột tóm tắt bên ngoài để không trùng.
  const showSummary = currentStep >= 2 && currentStep <= BOOKING_STEPS.length && currentStep !== 3;

  return (
    <div className="min-h-screen bg-[var(--cs-bg,#f7f7f6)] [&_button:not(:disabled)]:cursor-pointer [&_a]:cursor-pointer text-[var(--cs-text,#191919)] [&_.bg-white]:bg-[var(--cs-surface,#fff)] [&_.bg-slate-50]:bg-[var(--cs-bg,#f7f7f6)] [&_.bg-slate-100]:bg-[var(--cs-surface-2,#f1f1ef)] [&_.text-slate-900]:text-[var(--cs-text,#191919)] [&_.text-slate-800]:text-[var(--cs-text,#191919)] [&_.text-slate-700]:text-[var(--cs-text,#191919)] [&_.text-slate-600]:text-[var(--cs-muted,#757575)] [&_.text-slate-500]:text-[var(--cs-muted,#757575)] [&_.border-slate-200]:border-[var(--cs-border,#e9e9e6)] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_input]:accent-[#cf2935] [&_input]:focus-visible:outline-[#cf2935] [&_select]:focus-visible:outline-[#cf2935] [&_textarea]:focus-visible:outline-[#cf2935] antialiased font-sans flex flex-col justify-between selection:bg-[#1F2933] selection:text-white">
      {/* Banner đầu trang — cùng kiểu Dịch vụ / Về chúng tôi / Liên hệ (breadcrumb + tiêu đề có chữ đỏ). */}
      <ReferenceBanner title="Đặt lịch tại" highlight="CarService" crumb="Đặt lịch" image="banner-booking.webp" position="right center"
        subtitle={`Chọn xe, dịch vụ và khung giờ phù hợp — gara xác nhận lịch cho bạn, chỉ làm những gì bạn đồng ý.${garagePhone ? ` Hỗ trợ: ${garagePhone}.` : ""}`}/>
      {/* Cùng khung chiều rộng với các trang khách khác (.v3ref-container): tối đa 1230px, lề 24px; ≤570px lề 14px. */}
      <main className="mx-auto w-[min(1230px,calc(100%-48px))] grow py-8 max-[570px]:w-[calc(100%-28px)]">
        {/* Tài khoản nhân viên: trang đặt lịch dành cho khách. Đặt hộ khách → khu làm việc; xe riêng → tài khoản khách riêng. */}
        {isStaffAccount && (
          <div role="status" className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white"><Icon name="info" size={19}/></span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-extrabold">Bạn đang đăng nhập bằng tài khoản {localStorage.getItem("role") === "ADMIN" ? "quản trị" : "cố vấn"}</p>
              <p className="mt-0.5 opacity-90">Trang này dành cho khách hàng. Đặt lịch giúp khách thì dùng chức năng tạo lịch hẹn trong khu làm việc; muốn đặt lịch cho xe của riêng bạn, hãy dùng một tài khoản khách hàng riêng.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link to={localStorage.getItem("role") === "ADMIN" ? "/admin/appointments?create=1" : "/advisor/appointments"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e11d2e] px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#c81627]">
                {localStorage.getItem("role") === "ADMIN" ? "Tạo lịch hẹn hộ khách" : "Về quản lý lịch hẹn"}<Icon name="arrow" size={15}/>
              </Link>
              <button type="button" onClick={() => void logout()} className="rounded-xl border border-amber-400/70 px-4 py-2.5 text-sm font-bold hover:bg-amber-100 dark:hover:bg-amber-500/15">Đăng xuất</button>
            </div>
          </div>
        )}
        {restoredNotice && currentStep !== SUCCESS_STEP && (
          <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex items-center gap-2"><Icon name="check" size={16}/>Đã khôi phục thông tin bạn điền trước đó.</span>
            <span className="flex gap-2">
              <button type="button" onClick={discardDraft} className="rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100">Làm lại từ đầu</button>
              <button type="button" onClick={() => setRestoredNotice(false)} aria-label="Đóng thông báo" className="rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100">✕</button>
            </span>
          </div>
        )}

        {/* Thanh tiến trình — tông đỏ của web: đã xong = đỏ ✓, đang làm = đỏ có viền hồng, chưa tới = xám. */}
        <ol className="mb-6 grid grid-cols-4 gap-2 rounded-[19px] border border-slate-200 bg-white p-3 sm:p-4">
          {BOOKING_STEPS.map((label, index) => {
            const step = index + 1;
            const isDone = currentStep > step;
            const isCurrent = currentStep === step;
            const canJumpBack = isDone && currentStep !== SUCCESS_STEP;
            return (
              <li key={label} className="relative">
                {/* Thanh nối sang bước kế tiếp: từ mép vòng tròn này tới mép vòng tròn sau (gap-2 = 0.5rem). */}
                {index < BOOKING_STEPS.length - 1 && (
                  <span aria-hidden="true"
                    className={`absolute top-[19px] left-[calc(50%+26px)] h-0.5 w-[calc(100%+0.5rem-52px)] rounded-full transition-colors ${isDone ? "bg-[#e11d2e]" : "bg-slate-200"}`}/>
                )}
                <button
                  type="button"
                  disabled={!canJumpBack}
                  onClick={() => goToStep(step)}
                  aria-current={isCurrent ? "step" : undefined}
                  className="flex w-full flex-col items-center gap-1.5 disabled:cursor-default! disabled:opacity-100!"
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-full text-sm font-extrabold transition ${
                      isDone
                        ? "bg-[#e11d2e] text-white"
                        : isCurrent
                          ? "bg-[#e11d2e] text-white ring-4 ring-[#fde0e4] dark:ring-[#4a1219]"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isDone ? <Icon name="check" size={16}/> : step}
                  </span>
                  <span className={`text-xs sm:text-sm ${isCurrent ? "font-extrabold text-[#e11d2e] dark:text-[var(--cs-accent-text)]" : isDone ? "font-bold text-slate-800" : "font-medium text-slate-500"}`}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className={`grid grid-cols-1 items-start gap-6 ${showSummary ? "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
          <div className="min-w-0 rounded-[19px] border border-slate-200/90 bg-white p-[18px] sm:p-6">
            {/* BƯỚC 1: XE — cùng phong cách các bước sau: đầu thẻ + tiêu đề có vạch đỏ; xe đã lưu dạng thẻ chọn. */}
            {currentStep === 1 && (
              <div>
                <StepHeader icon="car" title="Xe của bạn" subtitle="Chọn xe đã lưu hoặc khai báo hãng, dòng xe để gara chuẩn bị đúng phụ tùng."/>

                {savedVehicles.length > 0 && (
                  <SavedVehicleSlider
                    options={[
                      { id: null, name: "Xe mới", sub: "Chọn hãng, dòng xe bên dưới" },
                      ...dedupePlatelessVehicles(savedVehicles, selectedSavedVehicleId).map((v) => ({ id: v.id as number | null, brand: v.model?.brand?.name, name: [v.model?.brand?.name, v.model?.name, v.trim?.name].filter(Boolean).join(" ") || "Xe của bạn", sub: v.license_plate || "Chưa có biển số" })),
                    ]}
                    selectedId={selectedSavedVehicleId}
                    onSelect={handleSelectSavedVehicle}
                  />
                )}

                <h3 className="mb-3 border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">
                  Thông tin xe
                </h3>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <VehicleSelector
                    value={vehicleSelection}
                    errors={{ brand: errors.brand || undefined, model: errors.model || undefined }}
                    onChange={handleSelectionChange}
                  />
                </div>
                {/* Không hỏi biển số khi đặt lịch: gara ghi nhận biển số lúc tiếp nhận xe.
                    Xe đã lưu (chọn ở trên) vẫn mang theo biển số của nó. */}

              </div>
            )}

            {/* BƯỚC 2: DỊCH VỤ */}
            {currentStep === 2 && (
              <div>
                <StepHeader icon="wrench" title="Chọn dịch vụ" subtitle="Chọn dịch vụ hoặc gói bảo dưỡng — chưa rõ xe bị gì thì mô tả tình trạng để kỹ thuật viên kiểm tra."/>
                <ServicePicker
                  groups={catalogGroups}
                  loading={catalogLoading}
                  loadError={catalog.error}
                  selectedKeys={selectedKeys}
                  flashKeys={flashKeys}
                  onFlashDone={(key) => setFlashKeys((keys) => keys.filter((k) => k !== key))}
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

            {/* BƯỚC 3: NGÀY GIỜ — đầu thẻ có ảnh xe, cột trái chọn ngày/giờ, cột phải "Thông tin đã chọn". Có sáng/tối. */}
            {currentStep === 3 && (() => {
              const sel = upcomingDates[selectedDateIndex] ?? upcomingDates[0];
              const hours = workingHours?.[sel.dayOfWeek];
              const timeValid = Boolean(selectedTime) && !isSlotUnavailable(selectedTime);
              const range = (slots: string[]) => (slots.length ? `${slots[0]} – ${slots[slots.length - 1]}` : "");
              const slotRow = (label: string, icon: ReactNode, slots: string[], tone: string) => slots.length > 0 && (
                <div className={`flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:gap-4 ${tone}`}>
                  <div className="flex min-w-[150px] items-center gap-3 px-1">
                    {icon}
                    <div><p className="text-sm font-bold text-slate-900">{label}</p><p className="text-xs text-slate-500">{range(slots)}</p></div>
                  </div>
                  <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {slots.map((slotTime) => {
                      const off = isSlotUnavailable(slotTime);
                      const on = selectedTime === slotTime;
                      return (
                        <button key={slotTime} type="button" disabled={off} aria-pressed={on}
                          title={off ? "Khung giờ đã qua hoặc gara không phục vụ" : undefined}
                          onClick={() => { setSelectedTime(slotTime); clearError("time"); }}
                          className={`relative rounded-xl border px-2 py-2.5 text-sm font-bold transition ${
                            off ? "border-slate-200 bg-slate-100 text-slate-400 line-through"
                              : on ? "border-[#e11d2e] bg-[#e11d2e] text-white shadow-[0_6px_16px_#e11d2e40]"
                                : "border-slate-200 bg-white text-slate-800 hover:border-[#e11d2e] hover:text-[#e11d2e]"}`}>
                          {slotTime}
                          {on && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-[#e11d2e] shadow"><Icon name="check" size={12}/></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
              const scrollDays = (dir: number) => dayStripRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
              return (
              <div>
                <StepHeader icon="calendar" title="Chọn ngày và giờ" subtitle="Lựa chọn thời gian phù hợp để đến gara."/>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    {/* Chọn ngày */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">Chọn ngày</h3>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Icon name="calendar" size={16}/>Tháng {sel.isoDate.slice(5, 7)}/{sel.isoDate.slice(0, 4)}</span>
                        <button type="button" onClick={() => scrollDays(-1)} aria-label="Ngày trước" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-[#e11d2e] hover:text-[#e11d2e]"><Icon name="chevron-left" size={16}/></button>
                        <button type="button" onClick={() => scrollDays(1)} aria-label="Ngày sau" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-[#e11d2e] hover:text-[#e11d2e]"><Icon name="chevron-right" size={16}/></button>
                      </div>
                    </div>
                    <div ref={dayStripRef} className="-mx-1 mb-7 flex snap-x gap-2.5 overflow-x-auto px-1 pt-2 pb-2 [scrollbar-width:none]">
                      {upcomingDates.map((d) => {
                        const isSelected = selectedDateIndex === d.index;
                        const dayHours = workingHours?.[d.dayOfWeek];
                        const closed = dayHours ? !dayHours.active : false;
                        return (
                          <button key={d.index} type="button" onClick={() => handleDateSelect(d.index)} aria-pressed={isSelected}
                            className={`relative w-[92px] shrink-0 snap-start rounded-2xl border px-2 py-3 text-center transition ${
                              isSelected ? "border-[#e11d2e] bg-[#e11d2e] text-white shadow-[0_8px_20px_#e11d2e40]"
                                : "border-slate-200 bg-white text-slate-800 hover:border-[#e11d2e]"}`}>
                            <span className={`block text-xs font-semibold ${isSelected ? "text-white/90" : "text-slate-600"}`}>{d.dayName}</span>
                            <span className="mt-1 block text-lg font-extrabold">{d.dayFormatted}</span>
                            {/* Dòng dưới: trạng thái làm việc theo Giờ làm việc admin cấu hình (không lặp lại tên thứ). */}
                            <span className={`mt-0.5 block text-[11px] font-semibold ${isSelected ? "text-white/90" : closed ? "text-[#e11d2e]" : "text-emerald-600 dark:text-emerald-400"}`}>{closed ? "Nghỉ" : "Làm việc"}</span>
                            {isSelected && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-white text-[#e11d2e] shadow"><Icon name="check" size={14}/></span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Chọn giờ */}
                    <h3 className="mb-3 border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">Chọn giờ</h3>
                    <div className="space-y-3">
                      {slotRow("Buổi sáng", <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#fbbf24"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>, bookingSlots.morning, "bg-gradient-to-r from-[#fff4ec] to-white dark:from-[#3a2a22] dark:to-transparent")}
                      {slotRow("Buổi chiều", <svg viewBox="0 0 24 24" width="30" height="30" fill="none" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="3.5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.8"/><path d="M9 2.5v1.5M3.5 9H2M4.8 4.8l1 1M13.2 4.8l-1 1" stroke="#f59e0b" strokeWidth="1.8"/><path d="M8 20h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.5A3 3 0 0 0 8 20Z" fill="#fb923c" stroke="#f97316" strokeWidth="1.6"/></svg>, bookingSlots.afternoon, "bg-white")}
                    </div>

                    <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      <Icon name="info" size={18}/>
                      <span>{hours ? (hours.active ? `Ngày này gara nhận lịch từ ${hours.open} đến ${hours.close}.` : "Gara nghỉ ngày này, vui lòng chọn ngày khác.") : sel.dayOfWeek === 0 ? "Chủ nhật chỉ nhận lịch đến 12:00." : "Khung giờ đã qua hoặc ngoài giờ làm việc sẽ không chọn được."}</span>
                    </p>
                    {errors.time && <p className="mt-2 text-[12px] text-red-500">{errors.time}</p>}
                  </div>

                  {/* Thông tin đã chọn */}
                  <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-extrabold text-slate-900"><span className="text-[#e11d2e]"><Icon name="calendar" size={20}/></span>Thông tin đã chọn</h3>
                    <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-white text-slate-600"><Icon name="calendar" size={18}/></span>
                      <div><p className="text-xs text-slate-500">Ngày hẹn</p><p className="text-sm font-extrabold text-slate-900">{WEEKDAY_FULL[sel.dayOfWeek]}, {sel.isoDate.split("-").reverse().join("/")}</p></div>
                    </div>
                    <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-white text-slate-600"><Icon name="clock" size={18}/></span>
                      <div><p className="text-xs text-slate-500">Giờ hẹn</p><p className="text-sm font-extrabold text-slate-900">{selectedTime || "Chưa chọn"}</p></div>
                    </div>
                    <div className={`mt-3 flex items-start gap-3 rounded-xl border p-3 ${timeValid ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-slate-200 bg-white"}`}>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${timeValid ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}><Icon name={timeValid ? "check" : "clock"} size={16}/></span>
                      <div>
                        <p className={`text-sm font-bold ${timeValid ? "text-emerald-800 dark:text-emerald-300" : "text-slate-700"}`}>{timeValid ? "Khung giờ hợp lệ" : "Chưa chọn giờ"}</p>
                        <p className={`text-xs ${timeValid ? "text-emerald-700 dark:text-emerald-300/80" : "text-slate-500"}`}>{timeValid ? "Gara sẽ xác nhận lịch sau khi bạn gửi yêu cầu." : "Chọn một khung giờ còn trống ở bên trái."}</p>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
              );
            })()}

            {/* BƯỚC 4: XÁC NHẬN — đầu thẻ nền hồng, 3 mục (Thông tin của bạn / Địa chỉ mang xe đến / Ghi chú) chung 1 kiểu. */}
            {currentStep === 4 && (
              <div>
                <div className="relative -mx-[18px] -mt-[18px] mb-6 flex items-center gap-4 overflow-hidden rounded-t-[19px] bg-gradient-to-r from-[#fff1f2] via-[#ffe8eb] to-[#fff5f6] px-[18px] py-5 sm:-mx-6 sm:-mt-6 sm:px-6 dark:from-[var(--cs-soft)] dark:via-[var(--cs-soft)] dark:to-[var(--cs-surface)]">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/80 text-[#d71327] shadow-sm dark:bg-[var(--cs-surface)]"><Icon name="calendar" size={28}/></span>
                  <div className="relative z-10 min-w-0">
                    <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Xác nhận đặt lịch</h2>
                    <p className="mt-0.5 text-sm text-slate-600">Vui lòng kiểm tra lại thông tin trước khi xác nhận.</p>
                  </div>
                  {/* Minh hoạ lịch mờ ở góc phải. */}
                  <svg className="pointer-events-none absolute -right-2 -bottom-4 hidden h-28 w-28 rotate-6 text-[#d71327] opacity-25 sm:block" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <rect x="8" y="12" width="48" height="44" rx="8" fill="#fff" stroke="currentColor" strokeWidth="3"/>
                    <path d="M8 24h48" stroke="currentColor" strokeWidth="3"/><path d="M20 6v12M44 6v12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    <path d="m22 40 7 7 14-14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {isLoggedIn ? (
                  <section className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">Thông tin của bạn</h3>
                      <button type="button" onClick={() => setContactModalOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-cs-accent-text hover:underline">
                        <Icon name="edit" size={16}/>Cập nhật
                      </button>
                    </div>
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                      <div className="min-w-0 text-sm">
                        <p className="font-bold text-slate-900">{contact.name || "Chưa có tên"}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                          <span className="inline-flex items-center gap-1.5"><span className="text-[#d71327] dark:text-[var(--cs-accent-text)]"><Icon name="phone" size={15}/></span>{contact.phone || "Chưa có số điện thoại"}</span>
                          {contact.email && <><span className="text-slate-300" aria-hidden="true">|</span>
                          <span className="inline-flex min-w-0 items-center gap-1.5"><span className="text-[#d71327] dark:text-[var(--cs-accent-text)]"><Icon name="mail" size={15}/></span><span className="truncate">{contact.email}</span></span></>}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
                {isLoggedIn && contactModalOpen && (
                  <ContactEditModal contact={contact} description="Gara dùng thông tin này để xác nhận lịch hẹn với bạn." onClose={() => setContactModalOpen(false)}
                    onSaved={(c) => { setContact(c); setContactModalOpen(false); notify("Đã cập nhật thông tin liên hệ.", "success"); }}/>
                )}
                {!isLoggedIn && (
                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-bold">Đăng nhập để hoàn tất đặt lịch</p>
                    <p className="mt-1">Thông tin bạn đã điền (xe, dịch vụ, gói bảo dưỡng, ngày giờ, ghi chú) được lưu lại. Sau khi đăng nhập, bạn sẽ quay lại đúng bước này để xác nhận.</p>
                    <p className="mt-2 text-xs">Chưa có tài khoản? <Link to="/register" className="font-bold underline">Đăng ký</Link> — thông tin vẫn được giữ lại.</p>
                  </div>
                )}

                <section className="mb-6">
                  <h3 className="mb-2 text-base font-bold text-slate-900">Địa chỉ mang xe đến</h3>
                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                    <div className="min-w-0 flex-1 text-sm">
                      {garageInfo?.name && <p className="font-bold text-slate-900">{garageInfo.name}</p>}
                      <p className="text-slate-600">{garageAddress ?? "Gara sẽ xác nhận địa điểm khi liên hệ lại với bạn."}</p>
                    </div>
                    {garageMapUrl && (
                      <a href={garageMapUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#f5c6cd] bg-white px-4 py-2 text-sm font-bold text-[#c10d22] transition hover:bg-[#fff1f2] dark:border-[var(--cs-border)] dark:bg-[var(--cs-surface)] dark:text-[var(--cs-accent-text)]">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2Z"/><path d="M9 4v14M15 6v14"/></svg>
                        Xem bản đồ
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>
                      </a>
                    )}
                  </div>
                </section>

                <section>
                  <label htmlFor="customerNotes" className="mb-2 block text-base font-bold text-slate-900">
                    Ghi chú <span className="text-sm font-normal text-slate-400">(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="customerNotes"
                    rows={3}
                    maxLength={500}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Ví dụ: Gọi trước khi nhận xe, yêu cầu đặc biệt,..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white"
                  />
                </section>

                {submissionError && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {submissionError}
                  </p>
                )}
              </div>
            )}

            {/* HOÀN TẤT */}
            {currentStep === SUCCESS_STEP && (() => {
              const serviceNames = [...selectedItems.map((item) => item.name), ...(hasSymptom ? ["Kiểm tra theo tình trạng xe"] : [])];
              const shown = serviceNames.slice(0, 3);
              const more = serviceNames.length - shown.length;
              // Màu & tên trạng thái theo quy tắc chung (config/status.ts): Chờ xác nhận = vàng (warning).
              const status = getStatus("appointment", bookingStatus, "customer");
              return (
                <div className="py-2 text-center">
                  <div className="relative mx-auto mb-4 size-24">
                    <svg className="absolute inset-0 size-24 overflow-visible" viewBox="0 0 96 96" fill="none" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M-6 44q4-4 8 0" stroke="#f5b82e"/><path d="M14 24l4 5" stroke="#f4a3c4"/><path d="M12 72l5-4" stroke="#e8a0d8"/>
                      <path d="M86 22l-5 6" stroke="#e11d2e"/><path d="M96 44l7-4" stroke="#f5c84b"/><path d="M84 70l-4-4" stroke="#8fd3c7"/>
                    </svg>
                    <span className="absolute inset-3 grid place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Đặt lịch thành công!</h2>
                  <p className="mt-1.5 text-sm text-slate-500 sm:text-base">Gara sẽ xác nhận lịch hẹn của bạn trong thời gian sớm nhất.</p>

                  <div className="mx-auto mt-7 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 text-left">
                    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-5 py-4">
                      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#fde8eb] text-[#e11d2e] dark:bg-[var(--cs-soft)] dark:text-[var(--cs-accent-text)]"><Icon name="calendar" size={26}/></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-500">Mã lịch hẹn</p>
                        <p className="text-lg font-extrabold tracking-wide break-all text-[#e11d2e] sm:text-xl dark:text-[var(--cs-accent-text)]">{bookingCode}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${STATUS_TONE_CLASS[status.tone]}`}>
                        <Icon name="clock" size={17}/>{status.label}
                      </span>
                    </div>
                    <div className="grid border-b border-slate-200 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-5 py-4 max-sm:border-b max-sm:border-slate-200 sm:border-r sm:border-slate-200">
                        <VehicleBrandLogo brand={vehicleBrand} size={40} className="rounded-xl"/>
                        <div className="min-w-0"><p className="text-sm text-slate-500">Xe sử dụng</p><p className="truncate text-base font-extrabold text-slate-900 sm:text-lg">{vehicleLabel}</p></div>
                      </div>
                      <div className="flex items-center gap-4 px-5 py-4">
                        <span className="text-slate-600"><Icon name="calendar" size={28}/></span>
                        <div className="min-w-0"><p className="text-sm text-slate-500">Thời gian hẹn</p><p className="text-base font-extrabold text-slate-900 sm:text-lg">{timeLabel}</p></div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 px-5 py-4">
                      <span className="mt-1 text-slate-600"><Icon name="wrench" size={26}/></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-500">Dịch vụ đã chọn</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {shown.map((name) => (
                            <span key={name} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-800">
                              <span className="text-[#e11d2e] dark:text-[var(--cs-accent-text)]"><Icon name="check" size={15}/></span>{name}
                            </span>
                          ))}
                          {more > 0 && <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700">+{more} dịch vụ khác</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={copyBookingCode} className={buttonClass({ variant: "secondary", size: "lg" })}><Icon name="file" size={18}/>Sao chép mã</button>
                    <Link to="/customer/appointments" className={buttonClass({ variant: "secondary", size: "lg" })}><Icon name="calendar" size={18}/>Xem lịch hẹn</Link>
                    <button type="button" onClick={resetFormToStart} className={buttonClass({ variant: "primary", size: "lg" })}><Icon name="calendar" size={18}/>Đặt lịch khác</button>
                  </div>
                </div>
              );
            })()}

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
                  icon={currentStep === BOOKING_STEPS.length && isLoggedIn ? "calendar" : undefined}
                  iconRight={currentStep === BOOKING_STEPS.length ? "check" : "arrow-right"}
                  loading={submitting}
                  loadingText="Đang gửi..."
                  disabled={currentStep === BOOKING_STEPS.length && isStaffAccount}
                  onClick={handleNextClick}
                >
                  {currentStep !== BOOKING_STEPS.length ? "Tiếp tục" : isLoggedIn ? "Xác nhận đặt lịch" : "Đăng nhập để đặt lịch"}
                </Button>
              </div>
            )}
          </div>

          {reviewOpen && currentStep === BOOKING_STEPS.length && (
            <BookingReviewModal
              vehicleLabel={vehicleLabel}
              timeLabel={timeLabel ?? "Chưa chọn khung giờ"}
              items={selectedItems}
              hasSymptom={hasSymptom}
              symptom={symptom}
              contact={contact}
              garageName={garageInfo?.name}
              garageAddress={garageAddress}
              notes={customerNotes}
              submitting={submitting}
              error={submissionError}
              onClose={() => setReviewOpen(false)}
              onConfirm={() => void completeBooking()}
            />
          )}

          {showSummary && (
            <BookingSummary
              vehicleLabel={vehicleLabel}
              items={selectedItems}
              hasSymptom={hasSymptom}
              timeLabel={currentStep >= 3 ? timeLabel : undefined}
            />
          )}
        </div>

        {/* Bên dưới khung đặt lịch: quy trình 7 bước + câu hỏi thường gặp (dùng chung với Trang chủ). Ẩn ở màn hình thành công.
            v3ref-home: dùng đúng bố cục quy trình 7 cột (trải hết chiều ngang) như ở Trang chủ. */}
        {currentStep !== SUCCESS_STEP && (
          <div className="v3ref v3ref-home mt-12 bg-transparent! [&_.v3ref-faq]:max-w-none!">
            <ProcessSteps/>
            <HomeFaq/>
          </div>
        )}
      </main>
    </div>
  );
}
