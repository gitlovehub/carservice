import { useState } from "react";
import { Button } from "../../components/ui/Button";
import type { WorkflowAppointment } from "../../services/workflowService";
import { RescheduleModal } from "./RescheduleModal";

const ACTION_TEXT: Record<string, string> = {
  "appointment.created_by_staff": "Tạo lịch hộ khách",
  "appointment.confirmed": "Xác nhận lịch",
  "appointment.confirmation_email_sent": "Gửi email xác nhận cho khách",
  "appointment.confirmed_by_customer": "Khách xác nhận qua email",
  "appointment.checked_in": "Tiếp nhận xe",
  "appointment.rescheduled": "Đổi lịch",
  "appointment.cancelled": "Hủy lịch",
  "appointment.no_show": "Khách không đến",
};
const CONTACT_TEXT: Record<string, string> = { PHONE: "điện thoại", IN_PERSON: "trực tiếp tại gara", OTHER: "kênh khác" };

/**
 * Ai xử lý lịch hẹn (nhiều cố vấn): người xử lý gần nhất + lịch sử từng thao tác.
 * Đổi lịch giúp khách: dùng chung modal với trang Lịch hẹn (đã thống nhất với khách, kiểm khung giờ, báo khách web + email).
 */
export function AppointmentHistoryPanel({ appointment, onChanged }: { appointment: WorkflowAppointment; onChanged: (updated: WorkflowAppointment, message: string) => void }) {
  const [open, setOpen] = useState(false);
  const name = (who?: { email?: string; employee?: { full_name?: string } | null } | null) => who?.employee?.full_name || who?.email || "—";
  const canReschedule = ["PENDING", "CONFIRMED"].includes(appointment.status);

  return <div className="text-sm" data-testid="appointment-history">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-cs-text">Người xử lý: <strong>{appointment.handled_by ? name(appointment.handled_by) : "Chưa có"}</strong>
        {appointment.created_by && <span className="text-xs text-cs-muted"> · tạo hộ bởi {name(appointment.created_by)}</span>}</p>
      {canReschedule && <Button size="sm" variant="secondary" icon="calendar" onClick={() => setOpen(true)}>Đổi lịch hẹn</Button>}
    </div>
    {open && <RescheduleModal appointment={appointment} onClose={() => setOpen(false)}
      onDone={(message, updated) => { setOpen(false); onChanged((updated as WorkflowAppointment | undefined) ?? appointment, message); }}/>}
    {!!appointment.activities?.length && <ol className="mt-4 space-y-1.5 text-xs">{appointment.activities.map(item => <li key={item.id} className="text-cs-text">
      <span className="text-cs-muted">{new Date(item.created_at).toLocaleString("vi-VN")}</span> · <strong>{name(item.account)}</strong> · {ACTION_TEXT[item.action] ?? item.action}
      {item.action === "appointment.rescheduled" && item.old_values && item.new_values ? ` (${String(item.old_values.appointment_time ?? "").slice(0, 5)} ${item.old_values.appointment_date ?? ""} → ${String(item.new_values.appointment_time ?? "").slice(0, 5)} ${item.new_values.appointment_date ?? ""})` : ""}
      {item.reason ? ` — ${item.reason}` : ""}
      {item.action === "appointment.rescheduled" && item.new_values?.contact_method ? ` · khách đồng ý qua ${CONTACT_TEXT[item.new_values.contact_method] ?? item.new_values.contact_method}` : ""}
    </li>)}</ol>}
  </div>;
}
