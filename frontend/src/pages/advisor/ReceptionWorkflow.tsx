import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DayFilter } from "./DayFilter";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { buttonClass } from "../../components/ui/buttonClass";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { KmInput } from "../../components/ui/QuantityStepper";
import { LoadingState, EmptyState, ErrorState, Pagination } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { catalogAdminApi, dmy, hhmm, type AppointmentRow } from "../../services/catalogAdminApi";
import {
  advisorAppointment, capacityApi, checkInConfirmedAppointment, confirmPendingAppointment, counterCustomerVehicles, receiveRepairOrder, sendAppointmentConfirmationEmail, workflowApi,
  type CatalogService, type CounterVehicle, type WorkflowAppointment, type WorkflowOrder,
} from "../../services/workflowService";
import { FilterSelect } from "../admin/kit/AdminKit";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { AppointmentHistoryPanel } from "./AppointmentHistoryPanel";
import { CapacityWeek } from "./CapacityWeek";
import { CheckInPanel } from "./CheckInPanel";
import { VehicleChoiceList } from "./CounterFields";
import { emptyVehicleDraft, toNewVehicle, vehicleDraftError, type NewVehicleDraft } from "./counterForms";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { WalkInReception } from "./WalkInReception";
import { Notice } from "./WorkflowUI";
import { capacityText, checkInConfirmOptions, confirmAppointmentOptions, errorText, formatSlot, isTodayIso, sendEmailConfirmOptions } from "./workflowFormat";
import "./advisorDashboard.css";

/**
 * Tiếp nhận xe (ADV-08, theo mockup PO 16/11/2026). Trái: lịch trong ngày cần tiếp nhận. Phải: tiếp nhận một lịch theo 4 bước
 *   1. Chọn lịch hẹn (xác nhận lịch / xác nhận xe đã đến)
 *   2. Kiểm tra & ghi nhận — xe thực tế (đổi xe có lý do, xe chưa có trong hệ thống), số km → tạo phiếu; biên bản nhận xe: sơ đồ, ảnh, hư hỏng
 *   3. Xác nhận với khách — CHỈ chủ xe xác nhận (tài khoản hoặc mã OTP email tại quầy; D-008, D-012 — nhân viên không tick thay khách)
 *   4. Chuyển sang chẩn đoán & báo giá (mở phiếu).
 * Phiếu được tạo ở bước 2 vì ảnh / biên bản gắn với phiếu. Khách vãng lai: nút ở danh sách (?mode=walk-in).
 */

const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const initials = (name?: string | null) => (name ?? "?").trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();
const PER_PAGE = 6;
const STEPS: Array<{ icon: IconName; title: string; desc: string }> = [
  { icon: "calendar", title: "Chọn lịch hẹn", desc: "Xác nhận lịch, khách đến gara" },
  { icon: "car", title: "Kiểm tra & ghi nhận", desc: "Xe thực tế, tình trạng, hình ảnh" },
  { icon: "shield", title: "Xác nhận với khách", desc: "Chủ xe xác nhận biên bản" },
  { icon: "clipboard", title: "Chẩn đoán & báo giá", desc: "Mở phiếu sửa chữa" },
];

function queueLabel(a: AppointmentRow): { text: string; tone: string } {
  if (a.repair_order) return { text: "Đã có phiếu", tone: "bg-success-soft text-success-fg" };
  if (a.status === "PENDING") return { text: "Chờ xác nhận", tone: "bg-warning-soft text-warning-fg" };
  if (a.status === "CONFIRMED") return { text: "Chờ xe đến", tone: "bg-info-soft text-info-fg" };
  return { text: "Chờ lập phiếu", tone: "bg-cs-soft text-cs-on-soft" };
}

function Stepper({ current }: { current: number }) {
  return <ol className="adv-steps mb-5" aria-label="Các bước tiếp nhận xe">
    {STEPS.map((s, i) => <li key={s.title} className="adv-step" data-state={i < current ? "done" : i === current ? "active" : "todo"} aria-current={i === current ? "step" : undefined}>
      <span className="adv-step-icon" aria-hidden="true"><Icon name={i < current ? "check" : s.icon} size={20}/></span>
      <span className="min-w-0"><b>{s.title}</b><small>{s.desc}</small></span>
      {i < STEPS.length - 1 && <span className="adv-step-arrow" aria-hidden="true"><Icon name="chevron-right" size={14}/></span>}
    </li>)}
  </ol>;
}

/** Danh sách lịch trong ngày cần tiếp nhận (chờ xác nhận, chờ xe đến, đã đến chưa lập phiếu). */
function AppointmentQueue({ selectedId, onSelect, onWalkIn, walkIn, version }: {
  selectedId: number; onSelect: (id: number) => void; onWalkIn: () => void; walkIn: boolean; version: number;
}) {
  const [date, setDate] = useState(isoDay());
  const [serviceId, setServiceId] = useState("all");
  const [scope, setScope] = useState<"todo" | "all">("todo");
  const [page, setPage] = useState(1);
  const [services, setServices] = useState<CatalogService[]>([]);
  useEffect(() => {
    let active = true;
    workflowApi.services().then(list => { if (active) setServices(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const params = { date, service_id: serviceId, per_page: 200, v: version };
  const list = useAdminQuery(`reception-queue:${JSON.stringify(params)}`, signal => catalogAdminApi.appointments(params, signal));
  const all = ((list.data ?? list.stale)?.data ?? [])
    .filter(a => ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(a.status))
    .filter(a => scope === "all" || !a.repair_order)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const shown = all.slice((Math.min(page, pages) - 1) * PER_PAGE, Math.min(page, pages) * PER_PAGE);

  return <section className="adv-card flex min-w-0 flex-col overflow-hidden" aria-label="Lịch hẹn cần tiếp nhận">
    <header className="flex items-center gap-3 border-b border-cs-border px-4 py-3.5">
      <div className="min-w-0 flex-1"><p className="adv-section-title whitespace-nowrap">Cần tiếp nhận <span className="rounded-full bg-cs-accent px-2 py-0.5 text-caption font-bold text-cs-accent-contrast">{all.length}</span></p><p className="truncate text-caption text-cs-muted">Chọn một lịch để tiếp nhận xe.</p></div>
      <Button size="sm" variant={walkIn ? "primary" : "outline"} icon="user" onClick={onWalkIn}>Khách vãng lai</Button>
    </header>
    <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
      <DayFilter className="w-full" value={date} onChange={value => { setDate(value); setPage(1); }}/>
      <FilterSelect label="Dịch vụ" value={serviceId} onChange={v => { setServiceId(v); setPage(1); }} options={[{ value: "all", label: "Tất cả" }, ...services.map(s => ({ value: String(s.id), label: s.name }))]}/>
      <FilterSelect label="Hiện" value={scope} onChange={v => { setScope(v); setPage(1); }} options={[{ value: "todo", label: "Chưa lập phiếu" }, { value: "all", label: "Tất cả" }]}/>
    </div>
    <div className="flex-1 space-y-2.5 p-4">
      {list.loading && !list.stale ? <LoadingState compact/>
        : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
        : !shown.length ? <EmptyState compact icon="calendar" title="Không có lịch cần tiếp nhận" description={`Ngày ${dmy(date)} không còn lịch chờ. Khách đến không hẹn → "Khách vãng lai".`}/>
        : shown.map(a => { const label = queueLabel(a); return <button key={a.id} type="button" className="adv-appt" aria-current={selectedId === a.id} onClick={() => onSelect(a.id)}>
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-small font-bold tabular-nums text-cs-text"><Icon name="clock" size={15} className="text-cs-accent-text"/>{hhmm(a.appointment_time)} <span className="font-normal text-cs-muted">· {dmy(a.appointment_date)}</span></span>
            <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${label.tone}`}>{label.text}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="adv-avatar !h-8 !w-8 !text-[11px]" aria-hidden="true">{initials(a.customer?.full_name)}</span>
            <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{a.customer?.full_name ?? "—"}</b><span className="block text-caption text-cs-muted">{a.customer?.phone}</span></span>
            <VehicleBrandLogo brand={a.vehicle?.model?.brand?.name} size={30}/>
            <span className="min-w-0 max-w-[40%] text-right"><b className="block truncate text-caption text-cs-text">{[a.vehicle?.model?.brand?.name, a.vehicle?.model?.name].filter(Boolean).join(" ") || "Xe"}</b><span className="block text-caption tabular-nums text-cs-text-2">{a.vehicle?.license_plate || "xxx.xx"}</span></span>
          </span>
        </button>; })}
    </div>
    {pages > 1 && <div className="px-4 pb-3"><Pagination page={Math.min(page, pages)} totalPages={pages} onChange={setPage}/></div>}
    <CapacityWeek/>
  </section>;
}

/** Badge xanh lá nhỏ cạnh giờ hẹn khi lịch rơi vào hôm nay. */
function TodayBadge() {
  return <span className="rounded-full bg-success-soft px-2 py-0.5 text-caption font-semibold text-success-fg">Hôm nay</span>;
}

/** Khung tiếp nhận một lịch hẹn. Báo bước hiện tại lên trang qua onStep. */
function ReceptionPanel({ id, onStep, onChanged, onBack }: { id: number; onStep: (step: number) => void; onChanged: () => void; onBack: () => void }) {
  const navigate = useNavigate();
  const { confirm, notify } = useAppFeedback();
  const [selected, setSelected] = useState<WorkflowAppointment | null>(null);
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<CounterVehicle[]>([]);
  const [vehicleChoice, setVehicleChoice] = useState<number | "new" | null>(null);
  const [newVehicle, setNewVehicle] = useState<NewVehicleDraft>(emptyVehicleDraft);
  const [changeReason, setChangeReason] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const bookedVehicleId = selected ? (selected.vehicle?.id ?? selected.vehicle_id ?? null) : null;
  const chosenVehicle = vehicleChoice ?? bookedVehicleId;
  const vehicleChanged = chosenVehicle === "new" || (chosenVehicle != null && bookedVehicleId != null && chosenVehicle !== bookedVehicleId);

  const load = useCallback(async () => {
    const appointment = await advisorAppointment(id);
    const linked = appointment.repair_order ? await workflowApi.order(appointment.repair_order.id) : null;
    return { appointment, linked };
  }, [id]);
  const apply = useCallback(({ appointment, linked }: { appointment: WorkflowAppointment; linked: WorkflowOrder | null }) => {
    setSelected(appointment); setOrder(linked); setLoadError("");
  }, []);
  useEffect(() => {
    let active = true;
    load().then(r => { if (active) apply(r); }).catch(err => { if (active) setLoadError(errorText(err)); });
    return () => { active = false; };
  }, [load, apply]);
  const refresh = async (message?: string) => {
    apply(await load());
    if (message) notify(message, "success");
    onChanged();
  };

  // Xe của cùng khách: cho phép nhận xe khác lịch hẹn (bắt buộc lý do, backend ghi audit).
  useEffect(() => {
    const customerId = selected?.customer?.id ?? selected?.customer_id;
    if (selected?.status !== "CHECKED_IN" || !customerId || order) return;
    let active = true;
    counterCustomerVehicles(customerId).then(list => { if (active) setVehicles(list); }).catch(() => { if (active) setVehicles([]); });
    return () => { active = false; };
  }, [selected, order]);

  const checkIn = order?.handovers?.slice().reverse().find(h => h.type === "CHECK_IN" && h.status !== "VOID") ?? null;
  const step = !selected || ["PENDING", "CONFIRMED"].includes(selected.status) ? 0
    : !order ? 1
    : order.status !== "RECEIVED" || checkIn?.status === "CONFIRMED" ? 3
    : checkIn?.status === "SUBMITTED" ? 2 : 1;
  useEffect(() => { onStep(step); }, [step, onStep]);

  // Lần gửi mail xác nhận gần nhất (activities mới nhất đứng đầu).
  const lastEmail = selected?.activities?.find(item => item.action === "appointment.confirmation_email_sent");

  async function handleSendEmail() {
    if (!selected || selected.status !== "PENDING") return;
    const approved = await confirm(sendEmailConfirmOptions(selected, !!lastEmail));
    if (!approved) return;
    setWorking(true); setError("");
    try { await refresh(await sendAppointmentConfirmationEmail(selected.id)); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function handleConfirm() {
    if (!selected || selected.status !== "PENDING") return;
    // P7: cảnh báo quá tải theo phút (không chặn — Q6).
    let capacityWarning: string | undefined;
    try {
      const day = selected.appointment_date ? await capacityApi.day(String(selected.appointment_date).slice(0, 10)) : null;
      if (day?.over_capacity) {
        const free = (day.suggestions ?? []).slice(0, 3).map(s => new Date(s.date).toLocaleDateString("vi-VN")).join(", ");
        capacityWarning = `Ngày này đã vượt công suất gara (${capacityText(day.load_minutes, day.capacity_minutes)}).${free ? ` Ngày còn chỗ: ${free}.` : ""} Vẫn xác nhận được nếu khách đồng ý chờ lâu hơn.`;
      }
    } catch { /* Không lấy được công suất thì xác nhận như cũ. */ }
    const approved = await confirm(confirmAppointmentOptions(selected, capacityWarning, () => void handleSendEmail()));
    if (!approved) return;
    setWorking(true); setError("");
    try { await confirmPendingAppointment(selected.id); await refresh(`Đã xác nhận lịch hẹn ${selected.appointment_code}. Tiếp nhận xe khi khách đến gara.`); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function handleCheckIn() {
    if (!selected || selected.status !== "CONFIRMED") return;
    const approved = await confirm(checkInConfirmOptions(selected));
    if (!approved) return;
    setWorking(true); setError("");
    try { await checkInConfirmedAppointment(selected.id); await refresh("Khách đã đến. Kiểm tra xe thực tế rồi tạo phiếu để lập biên bản nhận xe."); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function submitReceive(event: FormEvent) {
    event.preventDefault();
    if (!selected || selected.status !== "CHECKED_IN" || working) return;
    const customerId = selected.customer?.id ?? selected.customer_id;
    if (!customerId || !chosenVehicle) { setError("Không xác định được khách hàng hoặc xe trong lịch hẹn."); return; }
    if (chosenVehicle === "new") { const message = vehicleDraftError(newVehicle); if (message) { setError(message); return; } }
    if (vehicleChanged && changeReason.trim().length < 5) { setError("Xe mang tới khác xe trong lịch hẹn: nhập lý do đổi xe (ít nhất 5 ký tự)."); return; }
    if (mileage.trim() && !/^\d+$/.test(mileage.trim())) { setError("Số km phải là số nguyên không âm."); return; }
    const approved = await confirm({
      title: "Xác nhận tạo phiếu sửa chữa", reference: selected.appointment_code,
      description: "Tạo phiếu sửa chữa cho xe khách mang tới. Mỗi lịch hẹn chỉ được có một phiếu. Bước tiếp theo: lập biên bản nhận xe (ảnh, vị trí hư hỏng, chìa khóa, giấy tờ) và gửi chủ xe xác nhận.",
      confirmText: "Tạo phiếu sửa chữa", checklist: ["Đã đối chiếu xe thực tế với biển số và lịch hẹn."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const result = await receiveRepairOrder({
        appointment_id: selected.id, customer_id: customerId,
        ...(chosenVehicle === "new" ? { vehicle: toNewVehicle(newVehicle) } : { vehicle_id: chosenVehicle }),
        ...(mileage.trim() ? { mileage_received: Number(mileage) } : {}),
        ...(condition.trim() ? { initial_condition: condition.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(vehicleChanged ? { vehicle_change_reason: changeReason.trim() } : {}),
      });
      await refresh(result.existing ? "Lịch đã có phiếu, không tạo trùng." : "Đã tạo phiếu. Lập biên bản nhận xe bên dưới.");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  if (loadError) return <ErrorState description={loadError} onRetry={() => void load().then(apply).catch(err => setLoadError(errorText(err)))}/>;
  if (!selected) return <LoadingState label="Đang tải lịch hẹn..."/>;
  const vehicleName = [selected.vehicle?.model?.brand?.name, selected.vehicle?.model?.name].filter(Boolean).join(" ") || selected.vehicle?.variant || "Xe của khách";

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="adv-page-icon !h-12 !w-12" aria-hidden="true"><Icon name="calendar" size={24}/></span>
        <div className="min-w-0">
          <p className="text-lg font-bold text-cs-text">Tiếp nhận theo lịch hẹn <span className="text-cs-accent-text">{selected.appointment_code}</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-small text-cs-text-2"><Icon name="calendar" size={14}/>{formatSlot(selected.appointment_date, selected.appointment_time)}{isTodayIso(selected.appointment_date) && <TodayBadge/>}<StatusBadge domain="appointment" status={selected.status}/></p>
        </div>
      </div>
      {order && <Link to={`/advisor/service-orders/${order.id}`} className={buttonClass({ variant: "outline", size: "sm" })}><Icon name="clipboard" size={15}/>Mở phiếu {order.repair_order_code}</Link>}
    </header>
    {error && <Notice tone="error">{error}</Notice>}

    <section className="border-t border-cs-border pt-5">
      <p className="adv-section-title mb-3"><Icon name="user" size={17} className="text-cs-accent-text"/>Thông tin khách hàng & xe</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <span className="adv-avatar" aria-hidden="true">{initials(selected.customer?.full_name)}</span>
          <div className="min-w-0"><b className="block text-cs-text">{selected.customer?.full_name || "Khách hàng"}</b>
            {selected.customer?.phone && <a href={`tel:${selected.customer.phone}`} className="text-small text-cs-accent-text hover:underline">{selected.customer.phone}</a>}</div>
        </div>
        <div className="flex items-center gap-3">
          <VehicleBrandLogo brand={selected.vehicle?.model?.brand?.name} size={44}/>
          <div className="min-w-0"><b className="block truncate text-cs-text">{vehicleName}</b><span className="block text-small font-semibold tabular-nums text-cs-text-2">{selected.vehicle?.license_plate || "xxx.xx"}</span>
            <span className="mt-0.5 flex flex-wrap gap-x-3">{selected.vehicle?.year && <span className="text-caption text-cs-text-2">Năm SX {selected.vehicle.year}</span>}{selected.vehicle?.mileage != null && <span className="text-caption text-cs-text-2">ODO {selected.vehicle.mileage.toLocaleString("vi-VN")} km</span>}</span></div>
        </div>
      </div>
      <div className="mt-5"><p className="mb-2 text-caption font-semibold text-cs-muted">Khách yêu cầu khi đặt lịch</p><CustomerRequestSummary request={selected}/></div>
    </section>

    {selected.status === "PENDING" && <section className="border-t border-cs-border pt-5">
      <p className="adv-section-title mb-2"><Icon name="phone" size={17} className="text-cs-accent-text"/>Xác nhận lịch với khách</p>
      <p className="mb-4 text-small text-cs-muted">Gọi điện hoặc gửi email để khách xác nhận.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="check" loading={working} loadingText="Đang xử lý..." onClick={() => void handleConfirm()}>Xác nhận lịch hẹn</Button>
        <Button variant="secondary" icon="mail" disabled={working} onClick={() => void handleSendEmail()}>{lastEmail ? "Gửi lại email" : "Gửi email xác nhận"}</Button>
      </div>
      {lastEmail && <p className="mt-3 flex items-center gap-1.5 text-caption text-cs-muted"><Icon name="mail" size={13}/>
        Đã gửi email{lastEmail.new_values?.email ? ` tới ${lastEmail.new_values.email}` : ""} lúc {new Date(lastEmail.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} — đang chờ khách bấm xác nhận.</p>}
    </section>}

    {selected.status === "CONFIRMED" && <section className="border-t border-cs-border pt-5">
      <p className="adv-section-title mb-2"><Icon name="car" size={17} className="text-cs-accent-text"/>Khách đến gara</p>
      <p className="mb-4 text-small text-cs-muted">Chỉ tiếp nhận khi khách và xe đã thực sự có mặt.</p>
      <Button variant="primary" icon="car" loading={working} loadingText="Đang tiếp nhận..." onClick={() => void handleCheckIn()}>Khách đã đến</Button>
    </section>}

    {selected.status === "CHECKED_IN" && !order && <form onSubmit={event => void submitReceive(event)} className="space-y-4 border-t border-cs-border pt-5">
      <p className="adv-section-title"><Icon name="car" size={17} className="text-cs-accent-text"/>Kiểm tra xe thực tế</p>
      <div>
        <p className="mb-2 text-sm font-semibold text-cs-text">Xe thực tế mang tới</p>
        <VehicleChoiceList name="received-vehicle" vehicles={vehicles} value={chosenVehicle} onChange={setVehicleChoice} bookedVehicleId={bookedVehicleId}
          newVehicle={newVehicle} onNewVehicleChange={setNewVehicle} newLabel="Xe khác, chưa có trong hệ thống"/>
      </div>
      {vehicleChanged && <Field label="Lý do đổi xe (bắt buộc, được ghi vết)" required><Input minLength={5} maxLength={500} value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Ví dụ: xe đặt lịch đang đi công tác, khách mang xe còn lại"/></Field>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Số km khi tiếp nhận" optional><KmInput label="Số km khi tiếp nhận" value={mileage} onChange={setMileage}/></Field>
        <Field label="Ghi chú tiếp nhận" optional><Input maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú nội bộ"/></Field>
      </div>
      <Field label="Khách mô tả tình trạng / yêu cầu" hint="Hiện trạng xe (trầy, móp, phụ kiện, ảnh) ghi ở biên bản nhận xe ngay sau khi tạo phiếu."><Textarea rows={2} maxLength={2000} value={condition} onChange={e => setCondition(e.target.value)}/></Field>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cs-border pt-4">
        <p className="text-caption text-cs-muted">Mỗi lịch hẹn chỉ được có một phiếu sửa chữa.</p>
        <Button type="submit" variant="primary" iconRight="arrow-right" loading={working} loadingText="Đang tạo phiếu...">Tạo phiếu sửa chữa & lập biên bản</Button>
      </div>
    </form>}

    {order && order.status === "RECEIVED" && checkIn?.status !== "CONFIRMED" && <section className="border-t border-cs-border pt-5">
      <p className="adv-section-title mb-2"><Icon name="car" size={17} className="text-cs-accent-text"/>Ghi nhận tình trạng xe ban đầu</p>
      <p className="mb-3 text-small text-cs-muted">Đánh dấu vị trí trầy / móp trên sơ đồ, chụp ảnh từng vị trí, ghi chìa khóa và giấy tờ. Gửi biên bản để <b>chủ xe tự xác nhận</b> trong tài khoản hoặc bằng mã OTP gửi email tại quầy — nhân viên không xác nhận thay khách.</p>
      <CheckInPanel key={`check-in-${order.handovers?.map(h => `${h.id}:${h.status}`).join(",") ?? ""}`} order={order} onChanged={message => refresh(message)}/>
    </section>}

    {order && step === 3 && <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-success/40 bg-success-soft p-4">
      <span className="grid size-11 place-items-center rounded-full bg-success-solid text-on-solid" aria-hidden="true"><Icon name="check" size={22}/></span>
      <div className="min-w-0 flex-1"><b className="text-cs-text">{checkIn?.status === "CONFIRMED" ? "Chủ xe đã xác nhận biên bản nhận xe" : "Phiếu đã qua bước tiếp nhận"}</b><p className="text-small text-cs-text-2">Tiếp tục kiểm tra, chẩn đoán và lập báo giá trên phiếu {order.repair_order_code}.</p></div>
      <Button variant="primary" iconRight="arrow-right" onClick={() => navigate(`/advisor/service-orders/${order.id}`)}>Chuyển sang chẩn đoán & báo giá</Button>
    </section>}

    <details className="border-t border-cs-border pt-5">
      <summary className="adv-section-title cursor-pointer"><Icon name="history" size={17} className="text-cs-accent-text"/>Đổi lịch & lịch sử xác nhận</summary>
      <div className="mt-4"><AppointmentHistoryPanel key={`history-${selected.id}-${selected.appointment_date}-${selected.appointment_time}-${selected.status}`} appointment={selected} onChanged={(_updated, text) => { void refresh(text); }}/></div>
    </details>

    <div className="flex justify-start pt-1"><Button variant="outline" icon="arrow-left" onClick={onBack}>Quay lại danh sách</Button></div>
  </div>;
}

export default function ReceptionWorkflow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("appointment")) || 0;
  const walkIn = searchParams.get("mode") === "walk-in";
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const onStep = useCallback((value: number) => setStep(value), []);
  const select = (id: number) => setSearchParams({ appointment: String(id) });

  return <div className="page-container adv-theme">
    <Stepper current={walkIn ? 1 : selectedId ? step : 0}/>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.6fr)]">
      <AppointmentQueue selectedId={selectedId} onSelect={select} walkIn={walkIn} version={version}
        onWalkIn={() => setSearchParams(walkIn ? {} : { mode: "walk-in" })}/>
      <section className="adv-card min-w-0 p-5" aria-label="Tiếp nhận xe">
        {walkIn ? <>
          <p className="adv-section-title mb-1"><Icon name="user" size={18} className="text-cs-accent-text"/>Tiếp nhận khách vãng lai</p>
          <p className="mb-4 text-small text-cs-muted">Khách đến không đặt lịch: tìm hoặc tạo khách, chọn xe, rồi tạo phiếu và lập biên bản nhận xe.</p>
          <WalkInReception/>
        </> : selectedId
          ? <ReceptionPanel key={selectedId} id={selectedId} onStep={onStep} onChanged={() => setVersion(v => v + 1)} onBack={() => setSearchParams({})}/>
          : <EmptyState icon="car" title="Chọn một lịch hẹn để tiếp nhận" description="Lịch đã xác nhận nằm ở danh sách bên trái. Khách đến không đặt lịch → bấm “Khách vãng lai”."/>}
      </section>
    </div>
  </div>;
}
