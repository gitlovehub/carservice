import { useState } from "react";
import { Button, Modal } from "../../components/ui";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { fetchApi } from "../../services/api";
import { bookingApi, type BookingAvailability } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { errorText } from "./workflowFormat";

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
const METHODS = [{ id: "PHONE", label: "Điện thoại" }, { id: "IN_PERSON", label: "Trực tiếp tại gara" }, { id: "OTHER", label: "Kênh khác" }];
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dmy = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
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
  const changeDate = (value: string) => { setDate(value); setTime(""); };

  const car = [appointment.vehicle?.model?.brand?.name, appointment.vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";
  const noteOk = reasonType !== "OTHER" ? note.trim().length === 0 || note.trim().length >= 5 : note.trim().length >= 5;
  const canSave = !!time && noteOk && contact === "agreed" && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true); setError("");
    try {
      const response = await fetchApi<{ message?: string; data?: unknown }>(`/advisor/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          appointment_date: date, appointment_time: time, reason_type: reasonType, reason: note.trim() || null,
          customer_agreed: true, contact_method: method, expected_date: currentDate, expected_time: currentTime,
        }),
      });
      onDone(`Đã đổi lịch sang ${time} ngày ${dmy(date)} và báo khách.`, response.data);
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  }

  const closedText = slots?.holiday ? `Gara nghỉ ngày này: ${slots.holiday}.` : slots && !slots.active ? "Gara không làm việc ngày này." : "";
  return <Modal open onClose={onClose} dismissible={!saving} size="md" title="Đổi lịch hẹn" description={appointment.appointment_code ?? undefined}
    footer={<>
      <Button variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button>
      <Button variant="primary" icon="calendar" loading={saving} loadingText="Đang lưu..." disabled={!canSave} onClick={() => void save()}>Lưu lịch hẹn mới</Button>
    </>}>
    <div className="space-y-5">
      {/* Lịch hiện tại */}
      <section className="rounded-card bg-cs-surface-2 p-3.5 text-small">
        <p className="mb-2 text-caption font-bold uppercase tracking-wide text-cs-muted">Lịch hiện tại</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <dt className="text-cs-muted">Khách hàng</dt>
          <dd className="truncate text-right font-semibold text-cs-text">{appointment.customer?.full_name || "—"}
            {appointment.customer?.phone && <> · <a className="text-cs-accent-text hover:underline" href={`tel:${appointment.customer.phone.replace(/[^+\d]/g, "")}`}>{appointment.customer.phone}</a></>}</dd>
          <dt className="text-cs-muted">Xe</dt>
          <dd className="truncate text-right font-semibold text-cs-text">{car} · {appointment.vehicle?.license_plate || "xxx.xx"}</dd>
          <dt className="text-cs-muted">Giờ hẹn</dt>
          <dd className="text-right font-semibold tabular-nums text-cs-text">{currentTime} · {dmy(currentDate)}</dd>
        </dl>
      </section>

      {/* Lịch mới */}
      <section className="space-y-3">
        <p className="text-caption font-bold uppercase tracking-wide text-cs-accent-text">Lịch mới</p>
        <Field label="Ngày hẹn mới" required>
          <Input type="date" min={isoDay()} value={date} onChange={e => e.target.value && changeDate(e.target.value)}/>
        </Field>
        <div>
          <p className="mb-2 text-small font-semibold text-cs-text">Giờ hẹn mới <span className="text-danger-fg">*</span></p>
          {availability.loading && !slots ? <p className="text-small text-cs-muted">Đang tải khung giờ…</p>
            : availability.error ? <p className="text-small text-danger-fg">{availability.error}</p>
            : closedText ? <p className="text-small text-cs-muted">{closedText}</p>
            : !slots?.slots.length ? <p className="text-small text-cs-muted">Ngày này chưa có khung giờ đặt lịch.</p>
            : <div role="radiogroup" aria-label="Khung giờ" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.slots.map(s => {
                const isCurrent = date === currentDate && s.time === currentTime;
                const disabled = s.status !== "available" || isCurrent;
                return <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={disabled} onClick={() => setTime(s.time)}
                  title={isCurrent ? "Giờ hiện tại của lịch" : s.status === "full" ? "Đã đầy" : s.status === "past" ? "Đã qua" : s.status === "closed" ? "Không nhận" : `Còn ${slots.max_slots - s.booked} chỗ`}
                  className={`min-h-10 rounded-control border text-small font-semibold tabular-nums transition-colors ${time === s.time
                    ? "border-cs-accent bg-cs-accent text-cs-accent-contrast"
                    : disabled ? "cursor-not-allowed border-cs-border text-cs-muted line-through opacity-50"
                    : "cursor-pointer border-cs-border bg-cs-surface text-cs-text hover:border-cs-accent hover:bg-cs-hover"}`}>{s.time}</button>;
              })}
            </div>}
        </div>
      </section>

      {/* Lý do */}
      <section className="space-y-2">
        <p className="text-small font-semibold text-cs-text">Lý do thay đổi <span className="text-danger-fg">*</span></p>
        <div role="radiogroup" aria-label="Lý do thay đổi" className="grid gap-2 sm:grid-cols-3">
          {REASONS.map(r => <button key={r.id} type="button" role="radio" aria-checked={reasonType === r.id} onClick={() => setReasonType(r.id)} className={choice(reasonType === r.id)}>{r.label}</button>)}
        </div>
        <Textarea rows={2} maxLength={200} value={note} onChange={e => setNote(e.target.value)} aria-label="Ghi chú lý do"
          placeholder={reasonType === "OTHER" ? "Nhập lý do (bắt buộc, ít nhất 5 ký tự)" : "Ghi chú thêm (không bắt buộc) — khách sẽ nhận qua email"}/>
        {!noteOk && <p className="text-caption text-danger-fg">Ghi chú cần ít nhất 5 ký tự.</p>}
      </section>

      {/* Xác nhận liên hệ */}
      <section className="space-y-2">
        <p className="text-small font-semibold text-cs-text">Xác nhận với khách <span className="text-danger-fg">*</span></p>
        <div role="radiogroup" aria-label="Xác nhận với khách" className="grid gap-2 sm:grid-cols-2">
          <button type="button" role="radio" aria-checked={contact === "agreed"} onClick={() => setContact("agreed")} className={`${choice(contact === "agreed")} flex items-center gap-2`}>
            <Icon name="check" size={15}/>Đã liên hệ và khách đồng ý</button>
          <button type="button" role="radio" aria-checked={contact === "not_reached"} onClick={() => setContact("not_reached")} className={`${choice(contact === "not_reached")} flex items-center gap-2`}>
            <Icon name="phone" size={15}/>Chưa liên hệ được khách</button>
        </div>
        {contact === "agreed" && <label className="flex flex-wrap items-center gap-2 text-small text-cs-muted">Đã thống nhất qua
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="min-h-9 cursor-pointer rounded-control border border-cs-border bg-cs-surface px-2.5 text-small font-semibold text-cs-text transition-colors hover:border-cs-border-strong focus:border-cs-accent focus:outline-none">
            {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>}
        {contact === "not_reached" && <p className="flex items-start gap-2 rounded-card bg-warning-soft px-3 py-2.5 text-caption text-warning-fg">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0"/>Lịch cũ được giữ nguyên. Hãy liên hệ khách và thống nhất giờ mới trước khi lưu.</p>}
      </section>

      {error && <p className="rounded-card bg-danger-soft px-3 py-2.5 text-small text-danger-fg">{error}</p>}
    </div>
  </Modal>;
}
