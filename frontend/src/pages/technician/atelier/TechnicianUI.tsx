import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { RepairOrderStatus, WorkStatus } from "./technicianApi";

export const panel = "rounded-2xl border border-ktv-line/70 bg-ktv-panel shadow-[0_14px_40px_rgba(0,0,0,.12)]";
export const control = "w-full min-w-0 rounded-xl border border-ktv-line/70 bg-ktv-inset px-3.5 py-3 text-sm text-ktv-text placeholder:text-ktv-subtle outline-none transition-colors hover:border-ktv-accent/65 focus:border-ktv-accent focus:ring-2 focus:ring-ktv-accent/20";
export const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-ktv-accent px-5 py-3 text-sm font-bold text-ktv-contrast shadow-sm transition-colors hover:bg-ktv-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ktv-accent disabled:cursor-not-allowed disabled:opacity-50";
export const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-ktv-line bg-ktv-panel-alt px-5 py-3 text-sm font-semibold text-ktv-text transition-colors hover:border-ktv-accent hover:bg-ktv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ktv-accent disabled:opacity-50";

const orderStatus: Record<string, string> = {
  RECEIVED: "Đã tiếp nhận", INSPECTING: "Đang kiểm tra", QUOTING: "Đang báo giá", WAITING_APPROVAL: "Chờ khách duyệt",
  WAITING_FOR_PARTS: "Chờ phụ tùng", IN_PROGRESS: "Đang sửa chữa", COMPLETED: "Hoàn tất sửa chữa",
  REVIEW_TEST: "Kiểm tra cuối", HANDED_OVER: "Đã bàn giao", CLOSED: "Đã đóng phiếu",
};
const workStatus: Record<WorkStatus, string> = {
  PENDING: "Chờ thực hiện", IN_PROGRESS: "Đang thực hiện", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
};
export function StatusBadge({ status, work = false }: { status: RepairOrderStatus | WorkStatus; work?: boolean }) {
  const positive = ["COMPLETED", "HANDED_OVER"];
  const pending = ["RECEIVED", "PENDING", "WAITING_APPROVAL", "WAITING_FOR_PARTS"];
  const danger = ["CANCELLED", "CLOSED"];
  const colors = positive.includes(status) ? "border-ktv-positive/30 bg-ktv-positive/10 text-ktv-positive"
    : danger.includes(status) ? "border-ktv-danger/30 bg-ktv-danger/10 text-ktv-danger"
    : pending.includes(status) ? "border-ktv-warning/30 bg-ktv-warning/10 text-ktv-warning"
    : "border-ktv-accent/30 bg-ktv-accent-soft text-ktv-highlight";
  const label = work ? workStatus[status as WorkStatus] : orderStatus[status];
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${colors}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"/>{label || status}
  </span>;
}
export function Heading({ label, title, description, action }: { label: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div className="max-w-2xl"><p className="mb-2 text-xs font-extrabold tracking-[.19em] text-ktv-accent uppercase">{label}</p>
      <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ktv-strong sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-ktv-muted">{description}</p></div>{action}
  </div>;
}
export function Alert({ children, retry }: { children: ReactNode; retry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-ktv-danger">
    {children}{retry && <button type="button" className="ml-3 underline underline-offset-4 hover:text-ktv-strong" onClick={retry}>Thử lại</button>}
  </div>;
}
export function Busy() { return <div role="status" className={`${panel} animate-pulse p-8 text-ktv-muted`}>Đang tải dữ liệu từ CarService...</div>; }
export function Empty({ title, description, action }: { title: string; description: string; action?: { label: string; to: string } }) {
  return <div className={`${panel} px-6 py-14 text-center`}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ktv-accent-soft text-2xl text-ktv-highlight">◇</div>
    <h2 className="text-lg font-bold text-ktv-strong">{title}</h2><p className="mt-2 text-sm text-ktv-muted">{description}</p>
    {action && <Link className={`${secondary} mt-5`} to={action.to}>{action.label}</Link>}
  </div>;
}
