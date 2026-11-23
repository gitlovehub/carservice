import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { fetchApi } from "../../services/api";
import { bookingApi, type BookingAvailability } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";

/** Tối thiểu cần để đổi lịch — dùng được cho cả AppointmentRow (Lịch hẹn) và WorkflowAppointment (Tiếp nhận). */
export type ReschedulableAppointment = {
  id: number; appointment_code?: string | null; appointment_date?: string | null; appointment_time?: string | null;
  customer?: { full_name?: string | null; phone?: string | null } | null;
  vehicle?: { license_plate?: string | null; model?: { name?: string | null; brand?: { name?: string | null } | null } | null } | null;
};

type ReasonType = "CUSTOMER_REQUEST" | "GARAGE_ADJUSTMENT" | "OTHER";
type Contact = "agreed" | "not_reached";
const REASONS: Array<{ id: ReasonType; label: string }> = [
  { id: "CUSTOMER_REQUEST", label: "Khách hàng yêu cầu" },
  { id: "GARAGE_ADJUSTMENT", label: "Gara cần điều chỉnh khung giờ" },
  { id: "OTHER", label: "Lý do khác" },
];
const METHODS = [{ id: "PHONE", label: "Điện thoại" }, { id: "EMAIL", label: "Email" }, { id: "IN_PERSON", label: "Tại gara" }, { id: "OTHER", label: "Kênh khác" }];
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dmy = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const weekday = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return WEEKDAYS[new Date(y, m - 1, d).getDay()]; };
const choice = (on: boolean) => `cursor-pointer rounded-control border px-3 py-2 text-left text-small transition-colors ${on
  ? "border-cs-accent bg-cs-soft text-cs-accent-text"
  : "border-cs-border bg-cs-surface text-cs-text hover:border-cs-border-strong hover:bg-cs-hover"}`;

/**
 * Đổi lịch hẹn SAU KHI cố vấn đã thống nhất với khách (gọi điện / tại quầy): khách không phải xác nhận lại trên web.
 * Lịch hiện tại ↔ lịch mới tách rõ; chỉ cho lưu khi đã chọn "Đã liên hệ và khách đồng ý". Backend kiểm lại toàn bộ
 * (trạng thái, ngày nghỉ, giờ làm việc, sức chứa, người khác vừa đổi) và báo khách qua kênh sẵn có (chuông web + email).
 */
export function RescheduleModal<T extends ReschedulableAppointment>({ appointment, onClose, onDone }: {
  appointment: T; onClose: () => void; onDone: (message: string, updated?: unknown) => void;
}) {
  const currentDate = (appointment.appointment_date ?? "").slice(0, 10);
  const currentTime = (appointment.appointment_time ?? "").slice(0, 5);
  const [date, setDate] = useState(currentDate >= isoDay() ? currentDate : isoDay());
  const [time, setTime] = useState("");
  const [reasonType, setReasonType] = useState<ReasonType>("CUSTOMER_REQUEST");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);
  const [method, setMethod] = useState("PHONE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Khung giờ của ngày đang chọn (tải lại khi đổi ngày).
  const availability = useAdminQuery(`reschedule-slots:${date}`, () => bookingApi.availability(date));
  const slots: BookingAvailability | null = availability.data ?? null;
  const changeDate = (value: string) => { setDate(value); setTime(""); setTimeOpen(false); };
  const dateRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => { const input = dateRef.current; if (!input) return; try { input.showPicker(); } catch { input.focus(); } };
  const [timeOpen, setTimeOpen] = useState(false);
  const fieldErrors = useFieldErrors();
  const timeBoxRef = useRef<HTMLDivElement>(null);
  // Bấm ra ngoài / Esc → đóng danh sách giờ.
  useEffect(() => {
    if (!timeOpen) return;
    const onDown = (e: MouseEvent) => { if (!timeBoxRef.current?.contains(e.target as Node)) setTimeOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setTimeOpen(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [timeOpen]);

  const car = [appointment.vehicle?.model?.brand?.name, appointment.vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";
  const noteOk = reasonType !== "OTHER" ? note.trim().length === 0 || note.trim().length >= 5 : note.trim().length >= 5;
  // Lỗi tự hết ngay khi ô đã hợp lệ.
  const timeError = time ? undefined : fieldErrors.errors.time;
  const noteError = noteOk ? undefined : fieldErrors.errors.note;
  const contactError = contact === "agreed" ? undefined : fieldErrors.errors.contact;

  async function save() {
    if (saving) return;
    setError("");
    if (fieldErrors.show({
      ...(time ? {} : { time: "Chọn khung giờ hẹn mới." }),
      ...(noteOk ? {} : { note: reasonType === "OTHER" ? "Nhập lý do (ít nhất 5 ký tự)." : "Ghi chú cần ít nhất 5 ký tự." }),
      ...(contact === "agreed" ? {} : { contact: "Cần liên hệ và được khách đồng ý trước khi đổi lịch." }),
    })) return;
    setSaving(true);
    try {
      const response = await fetchApi<{ message?: string; data?: unknown }>(`/advisor/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          appointment_date: date, appointment_time: time, reason_type: reasonType, reason: note.trim() || null,
          customer_agreed: true, contact_method: method, expected_date: currentDate, expected_time: currentTime,
        }),
      });
      onDone(`Đã đổi lịch sang ${time} - ${dmy(date)} và báo khách.`, response.data);
    } catch (err) {
      fieldErrors.showApi(err, { appointment_date: "time", appointment_time: "time", reason: "note", customer_agreed: "contact" });
    }
    finally { setSaving(false); }
  }

  const closedText = slots?.holiday ? `Gara nghỉ ngày này: ${slots.holiday}.` : slots && !slots.active ? "Gara không làm việc ngày này." : "";
  // Khung giờ cho ô chọn: chỉ khung còn chỗ chọn được; đầy / đã qua / giờ hiện tại hiện mờ (disabled) để cố vấn biết lý do.
  const slotOptions = (slots?.slots ?? []).map(s => {
    const isCurrent = date === currentDate && s.time === currentTime;
    const note = isCurrent ? "Giờ hiện tại" : s.status === "full" ? "Đã đầy" : s.status === "past" ? "Đã qua" : s.status === "closed" ? "Không nhận" : `Còn ${slots!.max_slots - s.booked} chỗ`;
    return { time: s.time, note, disabled: s.status !== "available" || isCurrent };
  });
  const slotHint = availability.loading && !slots ? "Đang tải khung giờ…" : availability.error ? availability.error : closedText
    || (slots && !slots.slots.length ? "Ngày này chưa có khung giờ đặt lịch." : slots && !slotOptions.some(o => !o.disabled) ? "Ngày này đã kín khung giờ." : "");
  const control = "flex min-h-11 w-full items-center gap-2.5 rounded-control border border-cs-border bg-cs-surface px-3.5 text-small text-cs-text transition-colors hover:border-cs-border-strong focus-within:border-cs-accent";

  return <Modal open onClose={onClose} dismissible={!saving} size="lg"
    title={<span className="flex items-center gap-3.5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name="calendar" size={24}/></span>
      <span className="min-w-0"><span className="block">Đổi lịch hẹn</span>
        {appointment.appointment_code && <span className="block text-small font-normal text-cs-muted">{appointment.appointment_code}</span>}</span>
    </span>}
    footer={<>
      <Button variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button>
      <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void save()}>Lưu lịch hẹn mới</Button>
    </>}>
    <div className="space-y-5">
      {/* Lịch hiện tại: 3 cột Khách hàng · Xe · Thời gian hẹn */}
      <section className="rounded-card border border-cs-border bg-cs-surface-2 p-4">
        <span className="inline-flex rounded-full bg-cs-soft px-3 py-1 text-small font-semibold text-cs-accent-text">Lịch hiện tại</span>
        <div className="mt-3 grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-cs-border">
          <div className="flex min-w-0 gap-2.5">
            <Icon name="user" size={18} className="mt-0.5 shrink-0 text-cs-muted"/>
            <div className="min-w-0"><p className="text-caption text-cs-muted">Khách hàng</p>
              <p className="truncate font-semibold text-cs-text">{appointment.customer?.full_name || "—"}</p>
              {appointment.customer?.phone && <a className="text-small tabular-nums text-cs-text-2 hover:text-cs-accent-text" href={`tel:${appointment.customer.phone.replace(/[^+\d]/g, "")}`}>{appointment.customer.phone}</a>}</div>
          </div>
          <div className="flex min-w-0 gap-2.5 sm:pl-4">
            <Icon name="car" size={18} className="mt-0.5 shrink-0 text-cs-muted"/>
            <div className="min-w-0"><p className="text-caption text-cs-muted">Xe</p>
              <p className="truncate font-semibold text-cs-text">{car}</p>
              <p className="text-small tabular-nums text-cs-text-2">{appointment.vehicle?.license_plate || "xxx.xx"}</p></div>
          </div>
          <div className="flex min-w-0 gap-2.5 sm:pl-4">
            <Icon name="calendar" size={18} className="mt-0.5 shrink-0 text-cs-muted"/>
            <div className="min-w-0"><p className="text-caption text-cs-muted">Thời gian hẹn</p>
              <p className="font-semibold tabular-nums text-cs-text">{currentTime} · {dmy(currentDate)}</p></div>
          </div>
        </div>
      </section>

      {/* Lịch mới: ngày + giờ cùng hàng */}
      <section className="space-y-3 border-t border-cs-border pt-5">
        <p className="text-base font-bold text-cs-accent-text">Lịch mới</p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Ngày: hiện "Thứ Năm, 19/11/2026" (dd/mm/yyyy, không theo định dạng trình duyệt); bấm mở lịch chọn ngày. */}
          <div>
            <span className="mb-1.5 block text-small font-semibold text-cs-text">Ngày hẹn mới <span className="text-danger-fg">*</span></span>
            <span className="relative block">
              <button type="button" onClick={openDatePicker} className={`${control} cursor-pointer text-left`}>
                <Icon name="calendar" size={17} className="shrink-0 text-cs-muted"/>
                <span className="min-w-0 flex-1 truncate tabular-nums">{weekday(date)}, {dmy(date)}</span>
                <Icon name="chevron-down" size={16} className="shrink-0 text-cs-muted"/>
              </button>
              <input ref={dateRef} type="date" tabIndex={-1} aria-hidden="true" min={isoDay()} value={date} onChange={e => e.target.value && changeDate(e.target.value)}
                className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"/>
            </span>
          </div>
          {/* Giờ: danh sách tự vẽ theo màu giao diện (ô chọn gốc của trình duyệt nền trắng, khó đọc ở chế độ tối). */}
          <div ref={timeBoxRef} className="relative">
            <span className="mb-1.5 block text-small font-semibold text-cs-text">Giờ hẹn mới <span className="text-danger-fg">*</span></span>
            <button type="button" aria-haspopup="listbox" aria-expanded={timeOpen} aria-invalid={!!timeError || undefined} disabled={!slotOptions.length} onClick={() => setTimeOpen(v => !v)}
              className={`${control} cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-60 ${timeError ? "border-danger! hover:border-danger!" : ""}`}>
              <Icon name="clock" size={17} className="shrink-0 text-cs-muted"/>
              <span className={`min-w-0 flex-1 truncate tabular-nums ${time ? "font-semibold text-cs-text" : "text-cs-muted"}`}>{time || (slotOptions.length ? "Chọn khung giờ" : "Không có khung giờ")}</span>
              <Icon name="chevron-down" size={16} className={`shrink-0 text-cs-muted transition-transform ${timeOpen ? "rotate-180" : ""}`}/>
            </button>
            {timeOpen && <ul role="listbox" aria-label="Khung giờ" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-card border border-cs-border bg-cs-surface p-1 shadow-overlay">
              {slotOptions.map(o => <li key={o.time} role="option" aria-selected={time === o.time} aria-disabled={o.disabled}>
                <button type="button" disabled={o.disabled} onClick={() => { setTime(o.time); setTimeOpen(false); }}
                  className={`flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-small transition-colors ${time === o.time
                    ? "bg-cs-soft font-semibold text-cs-accent-text"
                    : o.disabled ? "cursor-not-allowed text-cs-muted opacity-55" : "cursor-pointer text-cs-text hover:bg-cs-hover"}`}>
                  <b className="tabular-nums">{o.time}</b><span className="text-caption text-cs-muted">{o.note}</span>
                </button>
              </li>)}
            </ul>}
            <FieldError className="mt-1.5">{timeError}</FieldError>
            {slotHint && <span className="mt-1.5 block text-caption text-cs-muted">{slotHint}</span>}
          </div>
        </div>
      </section>

      {/* Lý do thay đổi */}
      <section className="space-y-2.5">
        <p className="text-small font-semibold text-cs-text">Lý do thay đổi <span className="text-danger-fg">*</span></p>
        <div role="radiogroup" aria-label="Lý do thay đổi" className="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1.3fr)_auto]">
          {REASONS.map(r => <button key={r.id} type="button" role="radio" aria-checked={reasonType === r.id} onClick={() => setReasonType(r.id)}
            className={`${choice(reasonType === r.id)} flex min-h-11 items-center gap-2.5 px-4`}>
            <span className={`grid size-4 shrink-0 place-items-center rounded-full border-2 ${reasonType === r.id ? "border-cs-accent" : "border-cs-border-strong"}`} aria-hidden="true">
              {reasonType === r.id && <span className="size-2 rounded-full bg-cs-accent"/>}
            </span>{r.label}</button>)}
        </div>
        <div className={`relative rounded-control border bg-cs-surface transition-colors ${noteError ? "border-danger" : "border-cs-border focus-within:border-cs-accent hover:border-cs-border-strong"}`}>
          <Icon name="edit" size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-cs-muted"/>
          <textarea rows={2} maxLength={200} value={note} onChange={e => setNote(e.target.value)} aria-label="Ghi chú lý do" aria-invalid={!!noteError || undefined}
            placeholder={reasonType === "OTHER" ? "Nhập lý do (bắt buộc, ít nhất 5 ký tự)" : "Ghi chú thêm (không bắt buộc)"}
            className="block w-full resize-none bg-transparent py-3 pl-10 pr-3.5 text-small text-cs-text outline-none placeholder:text-cs-muted"/>
          <span className="block px-3.5 pb-2 text-right text-caption tabular-nums text-cs-muted">{note.length}/200</span>
        </div>
        <FieldError>{noteError}</FieldError>
      </section>

      {/* Xác nhận với khách */}
      <section className="space-y-2.5">
        <p className="text-small font-semibold text-cs-text">Xác nhận với khách <span className="text-danger-fg">*</span></p>
        <div role="radiogroup" aria-label="Xác nhận với khách" aria-invalid={!!contactError || undefined} className={`grid gap-2.5 sm:grid-cols-2 ${contactError ? "rounded-card border border-danger p-2" : ""}`}>
          <button type="button" role="radio" aria-checked={contact === "agreed"} onClick={() => setContact("agreed")} className={`${choice(contact === "agreed")} flex min-h-12 items-center gap-2.5 px-4`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full ${contact === "agreed" ? "bg-cs-accent text-cs-accent-contrast" : "border-2 border-cs-border-strong"}`} aria-hidden="true">
              {contact === "agreed" && <Icon name="check" size={12}/>}</span>Đã liên hệ và khách đồng ý</button>
          <button type="button" role="radio" aria-checked={contact === "not_reached"} onClick={() => setContact("not_reached")} className={`${choice(contact === "not_reached")} flex min-h-12 items-center gap-2.5 px-4`}>
            <Icon name="phone" size={17} className="shrink-0"/>Chưa liên hệ được khách</button>
        </div>
        <FieldError>{contactError}</FieldError>
        {contact === "agreed" && <div className="flex flex-wrap items-center gap-2 text-small text-cs-muted">
          <span id="contact-method-label">Đã thống nhất qua</span>
          <span role="radiogroup" aria-labelledby="contact-method-label" className="flex flex-wrap gap-1.5">
            {METHODS.map(m => <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)}
              className={`min-h-8 cursor-pointer rounded-full border px-3 text-small font-semibold transition-colors ${method === m.id
                ? "border-cs-accent bg-cs-soft text-cs-accent-text"
                : "border-cs-border bg-cs-surface text-cs-text-2 hover:border-cs-border-strong hover:bg-cs-hover hover:text-cs-text"}`}>{m.label}</button>)}
          </span>
        </div>}
        {contact === "not_reached" && <p className="flex items-start gap-2 rounded-card bg-warning-soft px-3 py-2.5 text-caption text-warning-fg">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0"/>Lịch cũ được giữ nguyên. Hãy liên hệ khách và thống nhất giờ mới trước khi lưu.</p>}
      </section>

      {error && <p className="rounded-card bg-danger-soft px-3 py-2.5 text-small text-danger-fg">{error}</p>}
    </div>
  </Modal>;
}
