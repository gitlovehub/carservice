import type { ReactNode } from "react";
import { StatusBadge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { STATUS } from "../../config/status";
export const card = "rounded-2xl border border-cs-border bg-cs-surface p-5 shadow-sm sm:p-6";
export const input = "mt-2 min-h-11 w-full rounded-xl border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none transition hover:border-cs-accent/60 focus:border-cs-accent focus:ring-2 focus:ring-cs-accent/20 disabled:opacity-50";
/* Nút: dùng <Button>/<IconButton> hoặc buttonClass() từ components/ui (docs/ui-button-redesign.md). */
/**
 * Đầu trang của luồng nghiệp vụ Advisor = PageHeader chung. `label` (nhãn trang trí cũ) không còn hiển thị:
 * breadcrumb trên topbar đã cho biết vị trí trang.
 */
export function WorkflowTitle({ title, sub, actions }: { label?: string; title: string; sub: string; actions?: ReactNode }) {
  return <PageHeader title={title} description={sub} actions={actions}/>;
}
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-6 ${tone === "error" ? "border-red-500/40 bg-red-500/10 text-cs-text" : tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-cs-text" : "border-cs-border bg-cs-soft text-cs-text"}`}>{children}</div>;
}
/** Trạng thái lịch hẹn hoặc phiếu sửa chữa — nhãn và màu lấy từ config/status.ts (góc nhìn nhân viên). */
export function Status({ status }: { status: string }) {
  const domain = status in STATUS.appointment ? "appointment" : "repair";
  return <StatusBadge domain={domain} status={status}/>;
}
// formatDateTime / errorText: xem ./workflowFormat.ts (tách riêng để file này chỉ export component + hằng).
