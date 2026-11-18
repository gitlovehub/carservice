import type { ReactNode } from "react";
import { StatusBadge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { STATUS } from "../../config/status";
export const card = "adv-panel rounded-2xl border border-cs-border bg-cs-surface p-5 shadow-sm sm:p-6";
/** Ô nhập khu cố vấn: cao 40px (màn hẹp 44px) — bằng <Input> chuẩn và nút cỡ md để đứng cạnh nhau không lệch. */
export const input = "mt-2 block min-h-10 w-full rounded-control border border-cs-border bg-cs-surface-2 px-3 py-2 text-sm text-cs-text outline-none transition hover:border-cs-accent/60 focus:border-cs-accent disabled:opacity-50 max-sm:min-h-11";
/** Như `input` nhưng không cách trên — ô đứng cùng hàng với nút / ô khác (không có nhãn phía trên). */
export const inputBare = "block min-h-10 w-full rounded-control border border-cs-border bg-cs-surface-2 px-3 py-2 text-sm text-cs-text outline-none transition hover:border-cs-accent/60 focus:border-cs-accent disabled:opacity-50 max-sm:min-h-11";
/** Dấu * đỏ cho ô bắt buộc (nhãn tự viết, không qua <Field required>). */
export function Req() {
  return <span className="ml-0.5 text-danger" aria-hidden="true">*</span>;
}
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
