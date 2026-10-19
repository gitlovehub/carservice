import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Button({ children, className = "", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button className={`cs-button ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`cs-card ${className}`}>{children}</section>;
}
export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="cs-page-head">{eyebrow && <p className="cs-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>;
}
export function EmptyState({ title = "Chưa có dữ liệu", description, children }: PropsWithChildren<{title?: string; description?: string}>) {
  return <Card><div className="cs-empty"><span className="cs-empty-mark" aria-hidden="true">◇</span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div></Card>;
}
export function LoadingState() { return <p className="cs-loading" role="status">Đang tải dữ liệu...</p>; }
export function StatusBadge({ status }: { status: string }) {
  const statusLabel: Record<string, string> = {
    CREATED: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy",
    RECEIVED: "Đã tiếp nhận", DIAGNOSING: "Đang chẩn đoán", CLOSED: "Đã đóng phiếu",
    ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động",
  };
  return <span className="cs-status-badge">{statusLabel[status] ?? status}</span>;
}
