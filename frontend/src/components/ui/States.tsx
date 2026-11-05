import type { ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

type StateProps = { title?: ReactNode; description?: ReactNode; action?: ReactNode; icon?: IconName; compact?: boolean; className?: string };

function StateBox({ title, description, action, icon, tone, compact, className = "", role }: StateProps & { tone: string; role?: "status" | "alert" }) {
  return <div role={role} className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? "px-4 py-8" : "min-h-[220px] px-6 py-12"} ${className}`}>
    {icon && <span className={`grid size-12 place-items-center rounded-card ${tone}`} aria-hidden="true"><Icon name={icon} size={22}/></span>}
    {title && <h2 className="text-subheading text-cs-text">{title}</h2>}
    {description && <p className="max-w-[520px] text-small text-cs-muted">{description}</p>}
    {action && <div className="cs-btn-row mt-1 justify-center">{action}</div>}
  </div>;
}

/** Không có dữ liệu. Có thể kèm hành động gợi ý (ví dụ "Tạo mới"). */
export function EmptyState({ title = LABELS.state.empty, icon = "box", ...props }: StateProps) {
  return <StateBox title={title} icon={icon} tone="bg-cs-surface-2 text-cs-muted" {...props}/>;
}

/** Đang tải. Dùng `inline` trong nút/bảng nhỏ, mặc định là khối giữa vùng nội dung. */
export function LoadingState({ label = LABELS.state.loading, compact }: { label?: string; compact?: boolean }) {
  return <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 text-small text-cs-muted ${compact ? "py-6" : "min-h-[220px] py-12"}`}>
    <span className="size-5 animate-spin rounded-full border-2 border-cs-border border-t-cs-accent" aria-hidden="true"/>
    {label}
  </div>;
}

/** Lỗi tải dữ liệu, kèm nút Thử lại khi có onRetry. */
export function ErrorState({ title = LABELS.state.error, description, onRetry, compact, className }: {
  title?: ReactNode; description?: ReactNode; onRetry?: () => void; compact?: boolean; className?: string;
}) {
  return <StateBox role="alert" title={title} description={description} icon="alert" tone="bg-danger-soft text-danger" compact={compact} className={className}
    action={onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>{LABELS.action.retry}</Button>}/>;
}
