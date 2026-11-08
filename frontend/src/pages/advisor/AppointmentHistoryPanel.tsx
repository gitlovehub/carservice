import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { fetchApi } from "../../services/api";
import type { WorkflowAppointment } from "../../services/workflowService";
import { input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

const ACTION_TEXT: Record<string, string> = {
  "appointment.created_by_staff": "Tạo lịch hộ khách",
  "appointment.confirmed": "Xác nhận lịch",
  "appointment.checked_in": "Tiếp nhận xe",
  "appointment.rescheduled": "Đổi lịch",
  "appointment.cancelled": "Hủy lịch",
};

/**
 * Ai xử lý lịch hẹn (nhiều cố vấn): người xử lý gần nhất + lịch sử từng thao tác.
 * Đổi lịch giúp khách: bắt buộc lý do, hệ thống kiểm khung giờ, báo khách trong web và qua email.
 */
export function AppointmentHistoryPanel({ appointment, onChanged }: { appointment: WorkflowAppointment; onChanged: (updated: WorkflowAppointment, message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(String(appointment.appointment_date ?? "").slice(0, 10));
  const [time, setTime] = useState(String(appointment.appointment_time ?? "").slice(0, 5));
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const name = (who?: { email?: string; employee?: { full_name?: string } | null } | null) => who?.employee?.full_name || who?.email || "—";
  const canReschedule = ["PENDING", "CONFIRMED"].includes(appointment.status);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true); setError("");
    try {
      const response = await fetchApi<{ data: WorkflowAppointment }>(`/advisor/appointments/${appointment.id}/reschedule`, {
        method: "POST", body: JSON.stringify({ appointment_date: date, appointment_time: time, reason: reason.trim() }),
      });
      setOpen(false); setReason("");
      onChanged(response.data, "Đã đổi lịch và gửi thông báo cho khách.");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <div className="mt-5 rounded-xl border border-cs-border p-4 text-sm" data-testid="appointment-history">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-cs-text">Người xử lý: <strong>{appointment.handled_by ? name(appointment.handled_by) : "Chưa có"}</strong>
        {appointment.created_by && <span className="text-xs text-cs-muted"> · tạo hộ bởi {name(appointment.created_by)}</span>}</p>
      {canReschedule && !open && <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Đổi lịch giúp khách</Button>}
    </div>
    {open && <form className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end" onSubmit={event => void submit(event)}>
      <label className="text-xs font-semibold text-cs-muted">Ngày mới<input className={input} type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)}/></label>
      <label className="text-xs font-semibold text-cs-muted">Giờ mới<input className={input} type="time" required step={1800} value={time} onChange={e => setTime(e.target.value)}/></label>
      <label className="text-xs font-semibold text-cs-muted">Lý do (khách sẽ nhận qua email)<input className={input} required minLength={5} maxLength={255} value={reason} onChange={e => setReason(e.target.value)}/></label>
      {error && <div className="sm:col-span-3"><Notice tone="error">{error}</Notice></div>}
      <div className="flex gap-2 sm:col-span-3"><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Thôi</Button><Button type="submit" size="sm" variant="primary" loading={working} disabled={reason.trim().length < 5}>Đổi lịch và báo khách</Button></div>
    </form>}
    {!!appointment.activities?.length && <ol className="mt-3 space-y-1.5 border-t border-cs-border pt-3 text-xs">{appointment.activities.map(item => <li key={item.id} className="text-cs-text">
      <span className="text-cs-muted">{new Date(item.created_at).toLocaleString("vi-VN")}</span> · <strong>{name(item.account)}</strong> · {ACTION_TEXT[item.action] ?? item.action}
      {item.action === "appointment.rescheduled" && item.old_values && item.new_values ? ` (${String(item.old_values.appointment_time ?? "").slice(0, 5)} ${item.old_values.appointment_date ?? ""} → ${String(item.new_values.appointment_time ?? "").slice(0, 5)} ${item.new_values.appointment_date ?? ""})` : ""}
      {item.reason ? ` — ${item.reason}` : ""}
    </li>)}</ol>}
  </div>;
}
