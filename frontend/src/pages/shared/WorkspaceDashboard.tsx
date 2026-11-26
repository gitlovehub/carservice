import { useEffect, useState, type ReactNode } from "react";
import { useLiveRefresh } from "../../services/liveSync";
import { Link } from "react-router-dom";
import { getAdvisorAppointments } from "../../services/advisorAppointmentService";
import { listWorkflowOrders, type WorkflowOrder } from "../../services/workflowService";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, buttonClass } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";

/**
 * Trang "Tổng quan" dùng chung cho Advisor và Admin. Chỉ hiển thị số liệu từ API thật:
 *   - Lịch hẹn: /advisor/appointments (Advisor + Admin) — lấy pagination.total theo trạng thái / ngày.
 *   - Phiếu sửa chữa: /repair-orders (chỉ Advisor) — lấy total theo trạng thái.
 * Mỗi số liệu tải độc lập: một API lỗi không làm mất các số khác. Chưa có API thì không hiển thị.
 */
type Mode = "advisor" | "admin";
type Appointment = {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  customer?: { full_name?: string } | null;
  vehicle?: { license_plate?: string | null } | null;
};
type AppointmentPayload = { data?: Appointment[] | { data?: Appointment[] }; pagination?: { total?: number } };
type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error" };

function getItems(payload: AppointmentPayload): Appointment[] {
  const list = payload?.data;
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object" && Array.isArray(list.data)) return list.data;
  return [];
}
function totalOf(payload: AppointmentPayload): number {
  const total = payload?.pagination?.total;
  if (typeof total !== "number") throw new Error("API không trả tổng số");
  return total;
}
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Tải một nguồn dữ liệu; `reloadKey` đổi thì tải lại. */
function useLoad<T>(loader: () => Promise<T>, reloadKey: number, enabled = true): Load<T> {
  const [result, setResult] = useState<{ key: number; load: Load<T> }>({ key: -1, load: { state: "loading" } });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loader().then(
      value => { if (alive) setResult({ key: reloadKey, load: { state: "ready", value } }); },
      () => { if (alive) setResult({ key: reloadKey, load: { state: "error" } }); },
    );
    return () => { alive = false; };
    // loader được tạo mới mỗi lần render; chỉ tải lại khi reloadKey đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, enabled]);
  return result.key === reloadKey ? result.load : { state: "loading" };
}

function mapLoad<T, R>(load: Load<T>, fn: (value: T) => R): Load<R> {
  return load.state === "ready" ? { state: "ready", value: fn(load.value) } : load;
}
function combineLoad<A, B, R>(a: Load<A>, b: Load<B>, fn: (a: A, b: B) => R): Load<R> {
  if (a.state === "ready" && b.state === "ready") return { state: "ready", value: fn(a.value, b.value) };
  return a.state === "error" || b.state === "error" ? { state: "error" } : { state: "loading" };
}

function StatCard({ label, load, hint, to, icon, highlight }: {
  label: string; load: Load<number>; hint: string; to: string; icon: IconName; highlight?: boolean;
}) {
  const value = load.state === "ready" ? load.value.toLocaleString("vi-VN") : load.state === "error" ? "—" : null;
  return <Link to={to} className="group flex min-h-[132px] flex-col justify-between gap-3 rounded-card border border-cs-border bg-cs-surface p-card shadow-card transition-colors hover:border-cs-accent focus-visible:border-cs-accent">
    <div className="flex items-start justify-between gap-3">
      <p className="text-small font-medium text-cs-text-2">{label}</p>
      <span className={`grid size-9 shrink-0 place-items-center rounded-control ${highlight ? "bg-cs-accent text-cs-accent-contrast" : "bg-cs-soft text-cs-accent-text"}`} aria-hidden="true">
        <Icon name={icon} size={18}/>
      </span>
    </div>
    <div>
      {value === null
        ? <span role="status" className="block h-9 w-16 animate-pulse rounded-md bg-cs-surface-2"><span className="sr-only">Đang tải</span></span>
        : <p className="text-[2rem] font-bold leading-none text-cs-text" title={load.state === "error" ? "Không tải được số liệu" : undefined}>{value}</p>}
      <p className="mt-2 flex items-center gap-1 text-caption text-cs-muted">
        {load.state === "error" ? "Không tải được số liệu" : hint}
        <Icon name="chevron-right" size={12} className="opacity-0 transition-opacity group-hover:opacity-100"/>
      </p>
    </div>
  </Link>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <Card className="min-w-0 overflow-hidden p-0!">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cs-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-subheading text-cs-text">{title}</h2>
        {description && <p className="mt-0.5 text-caption text-cs-muted">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </Card>;
}

function TodayAppointments({ load, role, onRetry }: { load: Load<Appointment[]>; role: Mode; onRetry: () => void }) {
  if (load.state === "loading") return <LoadingState compact label="Đang tải lịch hẹn..."/>;
  if (load.state === "error") return <ErrorState compact description="Không tải được lịch hẹn hôm nay." onRetry={onRetry}/>;