import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, buttonClass, DataTable, Dropdown, EmptyState, ErrorState, LoadingState, Modal, Pagination, SearchInput, type Column, type DropdownItem, type SortDir, type SortState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Field, Textarea } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { catalogAdminApi, dmy, hhmm, weekRange, type AppointmentRow, type AppointmentStatus } from "../../services/catalogAdminApi";
import { appointmentFilterOptions, bookingApi, capacityApi, type AppointmentFilterOptions, type BookingAvailability } from "../../services/workflowService";
import { ClearFilters, FilterSelect } from "../admin/kit/AdminKit";
import { AppointmentItemFilter, type ItemSelection } from "./AppointmentItemFilter";
import { RescheduleModal } from "./RescheduleModal";
import { TimeRangeBar } from "./TimeRangeBar";
import { isTodayRange, rangeBounds, todayRange, type TimeRange } from "./timeRange";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { capacityText, checkInConfirmOptions, confirmAppointmentOptions, errorText, sendEmailConfirmOptions } from "./workflowFormat";
import { sendAppointmentConfirmationEmail } from "../../services/workflowService";
import "./advisorDashboard.css";

/**
 * Lịch hẹn (cố vấn) — ADV-08, theo mockup PO 16/11/2026 (đồng bộ Tổng quan, đúng cả sáng / tối).
 * Banner + tab Danh sách / Lịch tuần, ô thống kê theo trạng thái (số thật, cùng bộ lọc), cảnh báo khung giờ sắp đầy,
 * lọc ngày / dịch vụ / tìm kiếm, bảng chỉ cột cần thiết (mã lịch nằm trong chi tiết + tìm được), thao tác theo trạng thái.
 */

type StatusFilter = "ALL" | AppointmentStatus;
type View = "list" | "week";
const STATS: Array<{ id: StatusFilter; label: string; icon: IconName; tone: string }> = [
  { id: "ALL", label: "Tất cả", icon: "grid", tone: "bg-cs-soft text-cs-accent-text" },
  { id: "PENDING", label: "Chờ xác nhận", icon: "clock", tone: "bg-warning-soft text-warning-fg" },
  { id: "CONFIRMED", label: "Chờ xe đến", icon: "car", tone: "bg-info-soft text-info-fg" },
  { id: "CHECKED_IN", label: "Đã tiếp nhận", icon: "check", tone: "bg-success-soft text-success-fg" },
  { id: "CANCELLED", label: "Đã huỷ", icon: "x-circle", tone: "bg-danger-soft text-danger-fg" },
  { id: "NO_SHOW", label: "Không đến", icon: "ban", tone: "bg-neutral-soft text-neutral-fg" },
];
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
/**
 * Sắp xếp (Laravel sắp trước khi phân trang; trùng thời điểm thì theo id để không nhảy dòng giữa các trang).
 * time = ngày hẹn rồi giờ hẹn; created = lúc khách đặt.
 */
const SORT_OPTIONS = [
  // "Ngày hẹn" (không phải "Giờ"): sắp theo ngày trước, cùng ngày mới xét giờ — khớp tên cột "Ngày giờ hẹn".
  { value: "time:asc", label: "Ngày hẹn sớm nhất" },
  { value: "time:desc", label: "Ngày hẹn muộn nhất" },
  { value: "created:desc", label: "Mới đặt gần đây" },
  { value: "created:asc", label: "Đặt lâu nhất" },
];
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const vehicleName = (a: AppointmentRow) => [a.vehicle?.model?.brand?.name, a.vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";
const itemNames = (a: AppointmentRow) => [...a.packages.map(p => p.name), ...a.services.map(s => s.name)];
const isPast = (a: AppointmentRow) => new Date(`${a.appointment_date.slice(0, 10)}T${hhmm(a.appointment_time)}:00`).getTime() <= Date.now();
/** Đã qua giờ hẹn mà vẫn Chờ xác nhận / Chờ xe đến → cố vấn cần xử lý (tiếp nhận, khách không đến hoặc huỷ). */
const isOverdue = (a: AppointmentRow) => (a.status === "PENDING" || a.status === "CONFIRMED") && isPast(a);
/** Quá hạn: chưa xử lý và đã sang ngày khác (lịch hỏng — chỉ còn đánh dấu Không đến / huỷ). Cùng ngày = Quá giờ (khách có thể đến trễ). */
const isExpired = (a: AppointmentRow) => isOverdue(a) && a.appointment_date.slice(0, 10) < isoDay();
function OverdueBadge({ a }: { a: AppointmentRow }) {
  if (!isOverdue(a)) return null;
  const expired = isExpired(a);
  return <span title={expired ? "Đã qua ngày hẹn mà lịch chưa được xử lý — đánh dấu Khách không đến hoặc huỷ" : "Đã qua giờ hẹn hôm nay — khách có thể đến trễ"}
    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold ${expired ? "bg-danger-soft text-danger-fg" : "bg-warning-soft text-warning-fg"}`}>
    <Icon name={expired ? "alert" : "clock"} size={12}/>{expired ? "Quá hạn" : "Quá giờ"}</span>;
}
/** Lúc đặt lịch (created_at, UTC) → giờ VN "dd/mm/yyyy · HH:mm". */
const bookedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  const date = d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
};
const initials = (name?: string | null) => (name ?? "?").trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();
const handler = (a: AppointmentRow) => a.handled_by ? (a.handled_by.employee?.full_name || a.handled_by.email || "—") : "Chưa xử lý";

/** Cảnh báo khung giờ sắp đầy / đã đầy của ngày đang lọc (từ /advisor/booking-availability). */
function SlotNotice({ data, onWeek }: { data: BookingAvailability; onWeek: () => void }) {
  // Ngày nghỉ / không làm việc: không hiện thông báo (PO 18/11) — bảng trống đã đủ rõ.
  if (data.holiday || !data.active) return null;
  const busy = data.slots.filter(s => s.status !== "past" && s.status !== "closed" && s.booked >= Math.max(1, data.max_slots - 1));
  const open = data.slots.filter(s => s.status === "available").length;
  if (!busy.length) return null;
  return <div className="adv-notice">
    <Icon name="calendar" size={20} className="text-cs-accent-text"/>
    <span className="min-w-0 flex-1 text-small">
      {busy.map(s => <span key={s.time} className="mr-3 inline-block"><b>{s.time}</b> {s.status === "full" ? "đã đầy" : "gần đầy"} · {s.booked}/{data.max_slots}</span>)}
      <span className="text-cs-muted">— còn {open} khung giờ nhận thêm xe.</span>
    </span>
    <Button size="sm" variant="outline" icon="calendar" onClick={onWeek}>Xem lịch tuần</Button>
  </div>;
}

/** Lịch tuần: 7 cột Thứ hai → Chủ nhật, mỗi lịch là một thẻ theo giờ (bấm để xem chi tiết). */
function WeekBoard({ days, rows, onOpen }: { days: Date[]; rows: AppointmentRow[]; onOpen: (a: AppointmentRow) => void }) {
  const today = new Date().toDateString();
  return <div className="overflow-x-auto rounded-2xl border border-cs-border">
    <div className="grid min-w-[980px] grid-cols-7 divide-x divide-cs-border">
      {days.map(day => {
        const key = isoDay(day);
        const items = rows.filter(r => r.appointment_date.slice(0, 10) === key).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const isToday = day.toDateString() === today;
        return <section key={key} aria-label={`${WEEKDAY[day.getDay()]} ${day.getDate()}/${day.getMonth() + 1}`} className="flex min-h-[420px] flex-col">
          <header className={`flex items-baseline justify-between border-b border-cs-border px-3 py-2.5 ${isToday ? "bg-cs-soft" : "bg-cs-surface-2"}`}>
            <span className={`text-small font-semibold ${isToday ? "text-cs-accent-text" : "text-cs-text"}`}>{WEEKDAY[day.getDay()]} <span className="tabular-nums">{day.getDate()}/{day.getMonth() + 1}</span></span>
            <span className="text-caption text-cs-muted">{items.length} lịch</span>
          </header>
          <ul className="flex flex-1 flex-col gap-2 p-2">
            {items.map(a => <li key={a.id}>
              <button type="button" onClick={() => onOpen(a)} className="w-full cursor-pointer rounded-xl border border-cs-border bg-cs-surface p-2.5 text-left transition-colors hover:border-cs-accent hover:bg-cs-hover">
                <span className="flex items-center justify-between gap-1"><b className="text-caption tabular-nums text-cs-text">{hhmm(a.appointment_time)}</b><VehicleBrandLogo brand={a.vehicle?.model?.brand?.name} size={20}/></span>
                <span className="mt-1 block truncate text-small font-semibold text-cs-text">{a.customer?.full_name ?? "—"}</span>
                <span className="block truncate text-caption text-cs-muted">{a.vehicle?.license_plate || "xxx.xx"}</span>
                <StatusBadge domain="appointment" status={a.status} className="mt-1.5"/>
              </button>
            </li>)}
            {!items.length && <li className="mt-6 text-center text-caption text-cs-muted">Không có lịch</li>}
          </ul>
        </section>;
      })}
    </div>
  </div>;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="cs-info-panel min-w-0 p-4"><p className="text-xs font-bold uppercase tracking-wide text-cs-muted">{label}</p><div className="mt-2 break-words text-sm text-cs-text">{children}</div></div>;
}

function Appointments() {
  const navigate = useNavigate();
  const { confirm, notify } = useAppFeedback();
  const [view, setView] = useState<View>("list");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  // Mặc định: chế độ Ngày, hôm nay.
  const [range, setRange] = useState<TimeRange>(todayRange);
  const [items, setItems] = useState<ItemSelection>({ packageIds: [], serviceIds: [] });
  const [itemFilterOpen, setItemFilterOpen] = useState(false);
  const [options, setOptions] = useState<AppointmentFilterOptions | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("20");
  const [anchor, setAnchor] = useState(() => new Date());
  const [detail, setDetail] = useState<AppointmentRow | null>(null);
  const [cancelling, setCancelling] = useState<AppointmentRow | null>(null);
  const [rescheduling, setRescheduling] = useState<AppointmentRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);
  const week = useMemo(() => weekRange(anchor), [anchor]);
  // Mặc định theo khoảng xem: Ngày / 7 ngày / Tùy chỉnh → giờ hẹn sớm nhất (làm việc theo thứ tự trong ngày);
  // Tháng / Tất cả → giờ hẹn muộn nhất (tra cứu, mới nhất trước). Người dùng đã tự chọn thì giữ lựa chọn đó.
  const [sortChoice, setSortChoice] = useState<SortState | null>(null);
  const defaultSort: SortState = range.mode === "month" || range.mode === "all" ? { key: "time", dir: "desc" } : { key: "time", dir: "asc" };
  const sort = sortChoice ?? defaultSort;
  const tableSort = {
    sort,
    params: { sort: sort.key, dir: sort.dir },
    isDefault: sortChoice === null,
    reset: () => setSortChoice(null),
    /** Bấm tiêu đề cột: cùng cột → đảo chiều; cột khác → chiều mặc định của cột (giờ hẹn tăng, ngày đặt giảm). */
    toggle: (key: string, dir?: SortDir) => {
      setSortChoice({ key, dir: dir ?? (sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : key === "time" ? "asc" : "desc") });
      setPage(1);
    },
  };

  useEffect(() => {
    let active = true;
    appointmentFilterOptions().then(data => { if (active) setOptions(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Lọc / tìm / sắp / phân trang đều ở Laravel; số ở các thẻ trạng thái (counts) tính theo cùng bộ lọc trừ trạng thái.
  const shared = {
    search: term, status: status === "ALL" ? "" : status,
    package_ids: items.packageIds.join(","), service_ids: items.serviceIds.join(","), v: version,
  };
  const params = view === "week"
    ? { ...shared, date_from: week.from, date_to: week.to, per_page: 500 }
    : { ...shared, ...rangeBounds(range), ...tableSort.params, page, per_page: Number(perPage) };
  const list = useAdminQuery(`advisor-appointments:${JSON.stringify(params)}`, signal => catalogAdminApi.appointments(params, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const slotDay = view === "list" && range.mode === "day" ? range.anchor : "";
  const availability = useAdminQuery(slotDay ? `availability:${slotDay}:${version}` : null, () => bookingApi.availability(slotDay));

  const reload = () => setVersion(v => v + 1);
  const resetPage = () => setPage(1);
  const itemCount = items.packageIds.length + items.serviceIds.length;
  const rangeChanged = !isTodayRange(range);
  const filtersActive = status !== "ALL" || itemCount > 0 || search !== "" || !tableSort.isDefault || rangeChanged;
  const clearFilters = () => { setStatus("ALL"); setRange(todayRange()); setItems({ packageIds: [], serviceIds: [] }); setSearch(""); tableSort.reset(); resetPage(); };
  // Tên các mục đang lọc (hiện thành chip, bấm × để bỏ từng mục).
  const chips = [
    ...items.packageIds.map(id => ({ key: `p${id}`, label: options?.packages.find(p => p.id === id)?.name ?? `Gói #${id}`, remove: () => setItems(s => ({ ...s, packageIds: s.packageIds.filter(x => x !== id) })) })),
    ...items.serviceIds.map(id => ({ key: `s${id}`, label: options?.services.find(s => s.id === id)?.name ?? `Dịch vụ #${id}`, remove: () => setItems(s => ({ ...s, serviceIds: s.serviceIds.filter(x => x !== id) })) })),
  ];

  async function run(key: string, task: () => Promise<{ message?: string }>, fallback: string, after?: () => void) {
    setBusy(key);
    try { const response = await task(); notify(response?.message || fallback, "success"); after?.(); reload(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setBusy(null); }
  }

  async function handleConfirm(appointment: AppointmentRow) {
    let capacityWarning: string | undefined;
    try {
      const day = await capacityApi.day(appointment.appointment_date.slice(0, 10));
      if (day?.over_capacity) capacityWarning = `Ngày này đã vượt công suất gara (${capacityText(day.load_minutes, day.capacity_minutes)}). Vẫn xác nhận được nếu khách đồng ý chờ lâu hơn.`;
    } catch { /* Không lấy được công suất thì xác nhận như cũ. */ }
    const approved = await confirm(confirmAppointmentOptions(appointment, capacityWarning, appointment.customer?.email ? () => void handleSendEmail(appointment) : undefined));
    if (approved) await run(`confirm-${appointment.id}`, () => catalogAdminApi.confirmAppointment(appointment.id), "Đã xác nhận lịch hẹn.");
  }

  async function handleCheckIn(appointment: AppointmentRow) {
    const approved = await confirm(checkInConfirmOptions(appointment));
    if (!approved) return;
    const id = appointment.id;
    await run(`checkin-${id}`, () => catalogAdminApi.checkInAppointment(id), "Đã tiếp nhận xe.", () => navigate(`/advisor/reception?appointment=${id}`));
  }

  async function handleNoShow(appointment: AppointmentRow) {
    const approved = await confirm({
      title: "Đánh dấu khách không đến", reference: appointment.appointment_code,
      description: `Đã qua giờ hẹn ${hhmm(appointment.appointment_time)} ${dmy(appointment.appointment_date)} mà khách chưa đến. Lịch chuyển sang Không đến, khung giờ được giải phóng.`,
      confirmText: "Khách không đến", variant: "danger",
    });
    if (approved) await run(`noshow-${appointment.id}`, () => catalogAdminApi.noShowAppointment(appointment.id), "Đã đánh dấu khách không đến.");
  }

  async function handleSendEmail(appointment: AppointmentRow) {
    if (!await confirm(sendEmailConfirmOptions(appointment))) return;
    const id = appointment.id;
    await run(`email-${id}`, async () => ({ message: await sendAppointmentConfirmationEmail(id) }), "Đã gửi email xác nhận cho khách.");
  }

  const primaryAction = (a: AppointmentRow) => {
    // Quá hạn: xác nhận / tiếp nhận không còn ý nghĩa → nút chính là "Khách không đến" (huỷ vẫn trong menu ⋯).
    if (isExpired(a)) return <Button size="sm" variant="danger-outline" icon="ban" loading={busy === `noshow-${a.id}`} onClick={() => void handleNoShow(a)}>Khách không đến</Button>;
    if (a.status === "PENDING") return <Button size="sm" variant="outline" icon="check" loading={busy === `confirm-${a.id}`} onClick={() => void handleConfirm(a)}>Xác nhận</Button>;
    if (a.status === "CONFIRMED") return <Button size="sm" variant="primary" icon="car" loading={busy === `checkin-${a.id}`} onClick={() => void handleCheckIn(a)}>Tiếp nhận xe</Button>;
    if (a.status === "CHECKED_IN") return <Button size="sm" variant="outline" icon="clipboard" onClick={() => navigate(`/advisor/reception?appointment=${a.id}`)}>Tạo / xem phiếu</Button>;
    return <Button size="sm" variant="ghost" icon="eye" onClick={() => setDetail(a)}>Chi tiết</Button>;
  };
  const menu = (a: AppointmentRow): DropdownItem[] => [
    { label: "Xem chi tiết", icon: "eye", onSelect: () => setDetail(a) },
    ...(a.status === "PENDING" && !isOverdue(a) ? [{ label: "Gửi email xác nhận", icon: "mail" as const, onSelect: () => void handleSendEmail(a) }] : []),
    ...(["PENDING", "CONFIRMED"].includes(a.status) ? [{ label: "Đổi lịch hẹn", icon: "calendar" as const, onSelect: () => setRescheduling(a) }] : []),
    ...(isOverdue(a) && !isExpired(a) ? [{ label: "Khách không đến", icon: "ban" as const, onSelect: () => void handleNoShow(a) }] : []),
    ...(["PENDING", "CONFIRMED"].includes(a.status) ? [{ type: "separator" as const }, { label: a.status === "PENDING" ? "Từ chối lịch" : "Huỷ lịch", icon: "x" as const, danger: true, onSelect: () => { setCancelling(a); setCancelReason(""); } }] : []),
  ];

  const columns: Column<AppointmentRow>[] = [
    { key: "customer", header: "Khách hàng", primary: true, render: a => <span className="flex min-w-0 items-center gap-3">
      <span className="adv-avatar" aria-hidden="true">{initials(a.customer?.full_name)}</span>
      <span className="min-w-0"><b className="block truncate text-cs-text">{a.customer?.full_name ?? "—"}</b>
        {a.customer?.phone && <span className="flex items-center gap-1 text-caption tabular-nums text-cs-muted"><Icon name="phone" size={12}/>{a.customer.phone}</span>}</span>
    </span> },
    { key: "vehicle", header: "Xe / Biển số", render: a => <span className="flex min-w-0 items-center gap-2.5">
      <VehicleBrandLogo brand={a.vehicle?.model?.brand?.name} size={34}/>
      <span className="min-w-0"><b className="block truncate font-semibold text-cs-text">{vehicleName(a)}</b><span className="block text-caption tabular-nums text-cs-text-2">{a.vehicle?.license_plate || "xxx.xx"}</span></span>
    </span> },
    { key: "time", header: "Ngày giờ hẹn", sortKey: "time", render: a => <span className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-3 whitespace-nowrap tabular-nums">
        <span className="flex items-center gap-1.5"><Icon name="calendar" size={14} className="text-cs-accent-text"/>{dmy(a.appointment_date)}</span>
        <span className="flex items-center gap-1.5"><Icon name="clock" size={14} className="text-cs-accent-text"/><b>{hhmm(a.appointment_time)}</b></span>
      </span>
      <OverdueBadge a={a}/>
      {(a.customer_reschedules ?? 0) > 0 && <span title="Khách tự đổi ngày giờ trên web — xem lịch sử trong trang Tiếp nhận"
        className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-caption font-semibold text-info-fg">
        <Icon name="refresh" size={12}/>Khách đổi lịch {a.customer_reschedules} lần</span>}
    </span> },
    { key: "request", header: "Dịch vụ / Yêu cầu", hideOnMobile: true, render: a => { const names = itemNames(a); return <span className="block max-w-60 truncate text-cs-text-2" title={names.join(", ") || a.symptom_description || undefined}>{names[0] ?? (a.symptom_description ? "Kiểm tra theo mô tả" : "Chưa chọn dịch vụ")}{names.length > 1 ? ` +${names.length - 1}` : ""}</span>; } },
    { key: "status", header: "Trạng thái", render: a => <StatusBadge domain="appointment" status={a.status}/> },
  ];

  const total = result?.pagination.total ?? 0;
  const from = total ? (page - 1) * Number(perPage) + 1 : 0;
  const to = Math.min(total, page * Number(perPage));
  const onThisWeek = week.from === weekRange(new Date()).from;
  const bounds = rangeBounds(range);
  const emptyText = range.mode === "all" ? "Không tìm thấy lịch hẹn phù hợp bộ lọc."
    : bounds.date_from === bounds.date_to ? `Không có lịch hẹn phù hợp ngày ${dmy(bounds.date_from)}.`
    : `Không có lịch hẹn phù hợp từ ${dmy(bounds.date_from)} đến ${dmy(bounds.date_to)}.`;

  return <div className="page-container adv-theme">
    {/* Đầu trang gọn (không ảnh banner, không icon): tiêu đề + nút tạo lịch, tab Danh sách / Lịch tuần gắn vào khung bên dưới. */}
    <section className="adv-page-hero">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0"><h1>Quản lý lịch hẹn</h1><p className="mt-1 text-small">Theo dõi, xác nhận và xử lý lịch đặt dịch vụ của khách hàng.</p></div>
        <Link to="/advisor/create-booking" className="adv-btn-gold"><Icon name="plus" size={18}/>Tạo lịch hẹn</Link>
      </div>
      <div className="adv-hero-tabs" role="tablist" aria-label="Cách xem lịch hẹn">
        <button type="button" role="tab" aria-selected={view === "list"} className="adv-hero-tab" onClick={() => setView("list")}><Icon name="list" size={18}/>Danh sách</button>
        <button type="button" role="tab" aria-selected={view === "week"} className="adv-hero-tab" onClick={() => setView("week")}><Icon name="calendar" size={18}/>Lịch tuần</button>
      </div>
    </section>

    {/* Khung cao tối thiểu cố định: bảng ít dòng thì trang không bị co ngắn, phân trang luôn nằm đáy khung, menu ⋯ đủ chỗ mở. */}
    <div className="adv-card adv-page-body flex flex-col gap-4 lg:min-h-[720px]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label="Lọc theo trạng thái">
        {STATS.map(s => <button key={s.id} type="button" className="adv-stat" aria-pressed={status === s.id} onClick={() => { setStatus(s.id); resetPage(); }}>
          <span className={`adv-stat-icon ${s.tone}`} aria-hidden="true"><Icon name={s.icon} size={18}/></span>
          <span className="min-w-0"><span className="block truncate text-caption font-medium text-cs-text-2">{s.label}</span><b className="block text-xl leading-tight tabular-nums text-cs-text">{result ? (counts[s.id] ?? 0) : "…"}</b></span>
        </button>)}
      </div>

      {view === "list"
        ? <TimeRangeBar value={range} onChange={value => { setRange(value); resetPage(); }}/>
        : <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" icon="chevron-left" onClick={() => setAnchor(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}>Tuần trước</Button>
          <span className="px-2 text-small font-semibold tabular-nums text-cs-text">{dmy(week.from)} – {dmy(week.to)}</span>
          <Button variant="outline" iconRight="chevron-right" onClick={() => setAnchor(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}>Tuần sau</Button>
          <Button variant={onThisWeek ? "tonal" : "outline"} onClick={() => setAnchor(new Date())}>Tuần này</Button>
        </div>}

      {view === "list" && availability.data && <SlotNotice data={availability.data} onWeek={() => { setAnchor(new Date(`${slotDay}T00:00:00`)); setView("week"); }}/>}

      {/* Tìm kiếm + 3 bộ lọc cùng chiều cao 40px (màn hẹp 44px); ≥1280px một hàng, nhỏ hơn tự xuống hàng. */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto]">
        <SearchInput value={search} onChange={value => { setSearch(value); resetPage(); }} className="sm:max-w-none [&_input]:max-sm:min-h-11"
          placeholder="Tìm mã lịch, khách hàng, SĐT, biển số, tên xe…"/>
        <button type="button" onClick={() => setItemFilterOpen(true)} aria-haspopup="dialog" data-active={itemCount > 0 || undefined}
          className={`inline-flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-control border px-3 text-small transition-colors max-sm:min-h-11 ${itemCount
            ? "border-cs-accent/50 bg-cs-soft text-cs-accent-text"
            : "border-cs-border bg-cs-surface text-cs-text hover:border-cs-border-strong hover:bg-cs-hover"}`}>
          <Icon name="car" size={15} className={`shrink-0 ${itemCount ? "" : "text-cs-muted"}`}/><span className="truncate">Gói & dịch vụ</span>
          {itemCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-cs-accent px-1.5 text-caption font-bold text-cs-accent-contrast">{itemCount}</span>}
          <Icon name="chevron-down" size={15} className="ml-auto shrink-0 opacity-70"/>
        </button>
        {/* Ẩn nhãn "Trạng thái" / "Sắp xếp" cho gọn (vẫn có aria-label); "Tất cả trạng thái" tự giải thích. */}
        <FilterSelect label="Trạng thái" hideLabel value={status} className="w-full" options={STATS.map(s => ({ value: s.id, label: s.id === "ALL" ? "Tất cả trạng thái" : s.label }))}
          onChange={value => { setStatus(value); resetPage(); }}/>
        {view === "list" && <FilterSelect label="Sắp xếp" hideLabel value={`${tableSort.sort.key}:${tableSort.sort.dir}`} options={SORT_OPTIONS} className="w-full"
          onChange={value => { const [key, dir] = value.split(":"); tableSort.toggle(key, dir as SortDir); }}/>}
        {/* Xoá bộ lọc nằm cuối hàng bộ lọc (chỉ hiện khi đang lọc). */}
        {filtersActive && <span className="flex justify-end"><ClearFilters active onClear={clearFilters}/></span>}
      </div>
      {chips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Gói & dịch vụ đang lọc">
        {chips.map(chip => <span key={chip.key} className="inline-flex max-w-full items-center gap-1 rounded-full bg-cs-soft py-1 pl-3 pr-1 text-caption font-semibold text-cs-accent-text">
          <span className="truncate">{chip.label}</span>
          <button type="button" aria-label={`Bỏ lọc ${chip.label}`} className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-cs-hover" onClick={() => { chip.remove(); resetPage(); }}><Icon name="x" size={12}/></button>
        </span>)}
      </div>}

      {view === "list"
        ? <><DataTable caption="Danh sách lịch hẹn" columns={columns} rows={rows} rowKey={a => a.id} sort={tableSort.sort} onSort={tableSort.toggle}
          loading={list.loading} error={list.error || undefined} onRetry={list.reload}
          onRowClick={a => setDetail(a)}
          actions={a => <>{primaryAction(a)}<Dropdown label={`Thao tác lịch ${a.appointment_code}`} items={menu(a)}/></>} actionsWidth="200px"
          empty={<EmptyState icon="calendar" title="Không có lịch hẹn" description={emptyText}
            action={filtersActive ? <Button size="sm" variant="outline" icon="refresh" onClick={clearFilters}>Xoá bộ lọc</Button> : undefined}/>}/>
          {/* Chân bảng: tổng số (từ API) bên trái; số dòng/trang + phân trang bên phải, cùng chiều cao. */}
          {total > 0 && <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-1 text-small text-cs-text-2">
            <span>Hiển thị <span className="tabular-nums">{from} – {to}</span> trên <b className="tabular-nums text-cs-text">{total}</b> lịch hẹn</span>
            <span className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-cs-muted">Số dòng/trang:
                {/* Mũi tên tự vẽ (bỏ mũi tên gốc của trình duyệt) để sát số và cách viền đều. */}
                <span className="relative inline-flex">
                  <select value={perPage} onChange={e => { setPerPage(e.target.value); resetPage(); }}
                    className="min-h-10 cursor-pointer appearance-none rounded-control border border-cs-border bg-cs-surface pl-3 pr-8 text-small font-semibold tabular-nums text-cs-text transition-colors hover:border-cs-border-strong focus:border-cs-accent focus:outline-none max-sm:min-h-11">
                    {["10", "20", "50"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <Icon name="chevron-down" size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cs-muted"/>
                </span>
              </label>
              {result && result.pagination.last_page > 1 && <Pagination className="" showSummary={false} page={result.pagination.current_page} totalPages={result.pagination.last_page} disabled={list.loading} onChange={setPage}/>}
            </span>
          </div>}</>
        : list.loading && !rows.length ? <LoadingState/> : list.error ? <ErrorState description={list.error} onRetry={list.reload}/>
        : <WeekBoard days={week.days} rows={rows} onOpen={setDetail}/>}
    </div>


    {detail && <Modal open onClose={() => setDetail(null)} size="lg" title="Chi tiết lịch hẹn" description={detail.appointment_code}
      footer={<>
        <Button variant="secondary" onClick={() => setDetail(null)}>Đóng</Button>
        {/* Chi tiết chỉ để xem + liên hệ khách (gọi / email). Thao tác đổi trạng thái (Xác nhận, Tiếp nhận…) chỉ ở cột Thao tác của bảng. */}
        {detail.customer?.phone && <a href={`tel:${detail.customer.phone.replace(/[^+\d]/g, "")}`} className={buttonClass({ variant: "outline" })}><Icon name="phone" size={16}/>Gọi {detail.customer.phone}</a>}
        {detail.status === "PENDING" && !isOverdue(detail) && <Button variant="outline" icon="mail" loading={busy === `email-${detail.id}`} onClick={() => { const a = detail; setDetail(null); void handleSendEmail(a); }}>Gửi email xác nhận</Button>}
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Khách hàng"><b>{detail.customer?.full_name ?? "—"}</b><p className="text-xs text-cs-muted">{detail.customer?.phone}{detail.customer?.email ? ` · ${detail.customer.email}` : ""}</p></Info>
        <Info label="Xe / biển số"><span className="flex items-center gap-2"><VehicleBrandLogo brand={detail.vehicle?.model?.brand?.name} size={28}/><b>{vehicleName(detail)}</b></span><p className="text-xs text-cs-muted">{detail.vehicle?.license_plate || "xxx.xx"}</p></Info>
        <Info label="Ngày giờ hẹn"><span className="flex flex-wrap items-center gap-2"><b>{dmy(detail.appointment_date)} · {hhmm(detail.appointment_time)}</b><OverdueBadge a={detail}/></span>
          {detail.created_at && <p className="mt-2 text-xs text-cs-muted">Đặt lúc: {bookedAt(detail.created_at)}</p>}</Info>
        <Info label="Trạng thái"><StatusBadge domain="appointment" status={detail.status}/><p className="mt-2 text-xs text-cs-muted">Người xử lý: {handler(detail)}</p></Info>
        <div className="cs-info-panel p-4 sm:col-span-2"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-cs-muted">Khách yêu cầu</p><CustomerRequestSummary request={detail}/></div>
        {detail.cancel_reason && <div className="cs-info-panel p-4 sm:col-span-2"><p className="text-xs font-bold text-danger-fg">Lý do huỷ</p><p className="mt-2 text-sm text-cs-text">{detail.cancel_reason}</p></div>}
      </div>
    </Modal>}

    <AppointmentItemFilter open={itemFilterOpen} onClose={() => setItemFilterOpen(false)} options={options} value={items}
      onApply={value => { setItems(value); setItemFilterOpen(false); resetPage(); }}/>

    {rescheduling && <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)}
      onDone={message => { setRescheduling(null); notify(message, "success"); reload(); }}/>}

    {cancelling && <Modal open onClose={() => setCancelling(null)} dismissible={!busy} size="sm" title={cancelling.status === "PENDING" ? "Từ chối lịch hẹn" : "Huỷ lịch hẹn"}
      description={`${cancelling.appointment_code} · ${cancelling.customer?.full_name ?? ""}`}
      footer={<>
        <Button variant="secondary" disabled={!!busy} onClick={() => setCancelling(null)}>Đóng</Button>
        <Button variant="danger" icon="x" disabled={cancelReason.trim().length < 5} loading={busy === `cancel-${cancelling.id}`}
          onClick={() => void run(`cancel-${cancelling.id}`, () => catalogAdminApi.cancelAppointment(cancelling.id, cancelReason.trim()), "Đã huỷ lịch hẹn.", () => setCancelling(null))}>Xác nhận</Button>
      </>}>
      <Field label="Lý do (khách sẽ thấy)" required hint="Ít nhất 5 ký tự."><Textarea rows={4} maxLength={500} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="VD: gara kín lịch ngày này, đã hẹn khách sang ngày khác"/></Field>
    </Modal>}
  </div>;
}

export default Appointments;
