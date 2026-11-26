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