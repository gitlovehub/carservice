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
  "appointment.rescheduled_by_customer": "Khách tự đổi lịch",
  "appointment.cancelled_by_customer": "Khách tự hủy lịch",
  "appointment.cancelled": "Hủy lịch",
  "appointment.no_show": "Khách không đến",
};
const CONTACT_TEXT: Record<string, string> = { PHONE: "điện thoại", EMAIL: "email", IN_PERSON: "trực tiếp tại gara", OTHER: "kênh khác" };
type Who = { email?: string; employee?: { full_name?: string } | null } | null | undefined;
const nameOf = (who: Who) => who?.employee?.full_name || who?.email || "—";

/**
 * Đổi lịch hẹn (nhiều cố vấn): người xử lý gần nhất + nút đổi lịch giúp khách.
 * Dùng chung modal với trang Lịch hẹn (đã thống nhất với khách, kiểm khung giờ, báo khách web + email).
 */
export function AppointmentReschedulePanel({ appointment, onChanged }: { appointment: WorkflowAppointment; onChanged: (updated: WorkflowAppointment, message: string) => void }) {
  const [open, setOpen] = useState(false);
  const canReschedule = ["PENDING", "CONFIRMED"].includes(appointment.status);
  return <div className="text-sm" data-testid="appointment-reschedule">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-cs-text">Người xử lý: <strong>{appointment.handled_by ? nameOf(appointment.handled_by) : "Chưa có"}</strong>
        {appointment.created_by && <span className="text-xs text-cs-muted"> · tạo hộ bởi {nameOf(appointment.created_by)}</span>}</p>
      {canReschedule
        ? <Button size="sm" variant="secondary" icon="calendar" onClick={() => setOpen(true)}>Đổi lịch hẹn</Button>
        : <span className="text-caption text-cs-muted">Khách đã đến — không đổi lịch được nữa.</span>}
    </div>
    {open && <RescheduleModal appointment={appointment} onClose={() => setOpen(false)}
      onDone={(message, updated) => { setOpen(false); onChanged((updated as WorkflowAppointment | undefined) ?? appointment, message); }}/>}
  </div>;
}

/**
 * Lịch sử thao tác trên lịch hẹn dạng dòng thời gian dọc: mới nhất ở trên, đọc từ dưới lên theo thứ tự diễn ra.
 * Chấm trên cùng (thao tác gần nhất) màu xanh lá + badge "Đang ở bước này".
 */
export function AppointmentTimeline({ appointment }: { appointment: WorkflowAppointment }) {
  const items = appointment.activities ?? [];
  if (!items.length) return <p className="text-small text-cs-muted">Chưa có thao tác nào.</p>;
  return <div data-testid="appointment-history">
    <p className="mb-3 text-caption text-cs-muted">Mới nhất ở trên — đọc từ dưới lên theo thứ tự diễn ra.</p>
    <ol className="relative">
      {items.map((item, i) => {
        const latest = i === 0, last = i === items.length - 1;
        const moved = (item.action === "appointment.rescheduled" || item.action === "appointment.rescheduled_by_customer") && item.old_values && item.new_values
          ? `${String(item.old_values.appointment_time ?? "").slice(0, 5)} ${item.old_values.appointment_date ?? ""} → ${String(item.new_values.appointment_time ?? "").slice(0, 5)} ${item.new_values.appointment_date ?? ""}` : "";
        return <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
          {/* Đường nối xuống chấm cũ hơn bên dưới. */}
          {!last && <span aria-hidden="true" className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-cs-border"/>}
          <span aria-hidden="true" className={`relative z-10 mt-0.5 size-4 shrink-0 rounded-full border-2 ${latest ? "border-success bg-success shadow-[0_0_0_4px_var(--color-success-soft)]" : "border-cs-border-strong bg-cs-surface"}`}/>
          <div className="min-w-0 flex-1 text-small">
            <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${latest ? "font-semibold text-cs-text" : "text-cs-text"}`}>
              <span>{ACTION_TEXT[item.action] ?? item.action}{moved && <span className="font-normal text-cs-text-2"> ({moved})</span>}</span>
              {latest && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold leading-tight text-success-fg">Đang ở bước này</span>}
            </p>
            <p className="text-caption text-cs-muted"><span className="tabular-nums">{new Date(item.created_at).toLocaleString("vi-VN")}</span> · <b className="font-semibold text-cs-text-2">{nameOf(item.account)}</b>
              {item.reason ? ` — ${item.reason}` : ""}
              {item.action === "appointment.rescheduled" && item.new_values?.contact_method ? ` · khách đồng ý qua ${CONTACT_TEXT[item.new_values.contact_method] ?? item.new_values.contact_method}` : ""}</p>
          </div>
        </li>;
      })}
    </ol>
  </div>;
}
