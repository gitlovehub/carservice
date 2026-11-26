import { useRef, useState, type ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

const RETRY_GUARD_MS = 500;

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

/** Lỗi tải dữ liệu. `onRetry` gọi lại API: nút có loading và chặn bấm lặp; `action` thay cho nút Thử lại khi cần nút riêng. */
export function ErrorState({ title = LABELS.state.error, description, onRetry, action, compact, className }: {
  title?: ReactNode; description?: ReactNode; onRetry?: () => void | Promise<unknown>; action?: ReactNode; compact?: boolean; className?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const busy = useRef(false);
  const retry = async () => {
    if (!onRetry || busy.current) return;
    busy.current = true;
    setRetrying(true);
    try {
      await onRetry();
    } catch { /* Lỗi mới do màn hình gọi hiển thị lại. */ } finally {
      // Giữ khóa cả khi API thất bại ngay.
      await new Promise(resolve => setTimeout(resolve, RETRY_GUARD_MS));
      busy.current = false;
      setRetrying(false);
    }
  };
  return <StateBox role="alert" title={title} description={description} icon="alert" tone="bg-danger-soft text-danger" compact={compact} className={className}
    action={action ?? (onRetry && <Button variant="secondary" icon="refresh" loading={retrying} loadingText="Đang thử lại..." onClick={() => void retry()}>{LABELS.action.retry}</Button>)}/>;
}
