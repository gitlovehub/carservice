import type { ReactNode } from "react";
import { getStatus, type StatusAudience, type StatusDomain, type StatusTone } from "../../config/status";

const toneClass: Record<StatusTone, string> = {
  neutral: "bg-neutral-soft text-neutral-fg",
  info: "bg-info-soft text-info-fg",
  warning: "bg-warning-soft text-warning-fg",
  success: "bg-success-soft text-success-fg",
  danger: "bg-danger-soft text-danger-fg",
  accent: "bg-cs-soft text-cs-accent-text",
};

/** Nhãn nhỏ có màu theo ý nghĩa. Màu luôn đi kèm chữ, không dùng màu làm tín hiệu duy nhất. */
export function Badge({ tone = "neutral", children, className = "", status }: { tone?: StatusTone; children: ReactNode; className?: string; status?: string }) {
  return <span data-status={status} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold ${toneClass[tone]} ${className}`}>
    <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden="true"/>
    {children}
  </span>;
}

/** Badge trạng thái nghiệp vụ — tên và màu lấy từ config/status.ts. */
export function StatusBadge({ domain, status, audience = "staff", className }: {
  domain: StatusDomain; status: string | null | undefined; audience?: StatusAudience; className?: string;
}) {
  const { label, tone } = getStatus(domain, status, audience);
  return <Badge tone={tone} status={status ?? undefined} className={className}>{label}</Badge>;
}
