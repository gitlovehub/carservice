import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LABELS } from "../../config/labels";
import { IconButton } from "./Button";
import { useOverlayArea } from "./useOverlayArea";
import "./overlay.css";

const EXIT_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Lớp phủ đang mở, lớp cuối là lớp trên cùng — chỉ lớp trên cùng phản hồi Esc. */
const stack: string[] = [];

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Phần tử nhận focus khi mở (mặc định: ô nhập đầu tiên, nếu không có thì nút Đóng). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Tắt khi biểu mẫu đang gửi, tránh đóng giữa chừng. */
  dismissible?: boolean;
  className?: string;
};

function useOverlay({ open, onClose, initialFocus, dismissible = true }: Pick<OverlayProps, "open" | "onClose" | "initialFocus" | "dismissible">) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(open);
  // Mở: render ngay. Đóng: giữ lại EXIT_MS để chạy hiệu ứng rồi mới gỡ.
  if (open && !rendered) setRendered(true);

  useEffect(() => {
    if (open || !rendered) return;
    const timer = window.setTimeout(() => setRendered(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => { onCloseRef.current = onClose; dismissibleRef.current = dismissible; });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    stack.push(id);

    const panel = panelRef.current;
    const target = initialFocus?.current
      ?? panel?.querySelector<HTMLElement>("[data-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled])")
      ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
      ?? panel;
    target?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      // Hộp xác nhận (useAppFeedback) đang mở phía trên thì để nó xử lý.
      if (document.querySelector('[data-ui-dialog="confirm"]')) return;
      if (event.key === "Escape" && dismissibleRef.current) { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      // Giữ focus trong lớp phủ.
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const index = stack.lastIndexOf(id);
      if (index >= 0) stack.splice(index, 1);
      if (!stack.length) document.body.style.overflow = previousOverflow;
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open, id, initialFocus]);

  return { panelRef, rendered, state: open ? "open" : "closing" };
}

function OverlayHeader({ titleId, descId, title, description, onClose, dismissible }: {
  titleId: string; descId: string; title: ReactNode; description?: ReactNode; onClose: () => void; dismissible: boolean;
}) {
  return <header className="flex shrink-0 items-start gap-3 border-b border-cs-border px-5 py-4 sm:px-6">
    <div className="min-w-0 flex-1">
      <h2 id={titleId} className="text-section text-cs-text">{title}</h2>
      {description && <p id={descId} className="mt-1 text-small text-cs-muted">{description}</p>}
    </div>
    <IconButton icon="close" label={LABELS.action.close} size="sm" onClick={onClose} disabled={!dismissible} className="-mr-1.5"/>
  </header>;
}

const modalWidth = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

/** Hộp thoại giữa màn hình. Trên điện thoại chiếm gần toàn chiều cao, nội dung tự cuộn. */
export function Modal({ size = "md", ...props }: OverlayProps & { size?: keyof typeof modalWidth }) {
  const { open, onClose, title, description, children, footer, dismissible = true, className = "" } = props;
  const area = useOverlayArea();
  const { panelRef, rendered, state } = useOverlay(props);
  const titleId = useId(), descId = useId();
  if (!rendered) return null;
  return createPortal(
    <div className="cs-overlay cs-feedback-layer fixed inset-0 z-[300] flex items-end justify-center p-0 sm:items-center sm:p-6" data-area={area} data-state={state}>
      <div className="cs-overlay-backdrop absolute inset-0 bg-cs-overlay" aria-hidden="true" onMouseDown={() => { if (dismissible && open) onClose(); }}/>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={`cs-modal-panel relative flex max-h-[92dvh] w-full ${modalWidth[size]} flex-col overflow-hidden rounded-t-panel border border-cs-border bg-cs-surface text-cs-text shadow-overlay outline-none sm:rounded-panel ${className}`}>
        <OverlayHeader titleId={titleId} descId={descId} title={title} description={description} onClose={onClose} dismissible={dismissible}/>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="cs-btn-row cs-btn-row-end shrink-0 border-t border-cs-border bg-cs-surface-2 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Ngăn kéo trượt từ cạnh màn hình: chọn nhanh, xem chi tiết, bộ lọc nâng cao. */
export function Drawer({ side = "right", width = "md", ...props }: OverlayProps & { side?: "left" | "right"; width?: "sm" | "md" | "lg" }) {
  const { open, onClose, title, description, children, footer, dismissible = true, className = "" } = props;
  const area = useOverlayArea();
  const { panelRef, rendered, state } = useOverlay(props);
  const titleId = useId(), descId = useId();
  if (!rendered) return null;
  const widthClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[width];
  return createPortal(
    <div className="cs-overlay cs-feedback-layer fixed inset-0 z-[300]" data-area={area} data-state={state}>
      <div className="cs-overlay-backdrop absolute inset-0 bg-cs-overlay" aria-hidden="true" onMouseDown={() => { if (dismissible && open) onClose(); }}/>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1} data-side={side}
        className={`cs-drawer-panel absolute inset-y-0 ${side === "right" ? "right-0 sm:rounded-l-panel" : "left-0 sm:rounded-r-panel"} flex h-dvh w-full ${widthClass} flex-col overflow-hidden bg-cs-surface text-cs-text shadow-overlay outline-none ${className}`}>
        <div className="pt-[env(safe-area-inset-top)]"/>
        <OverlayHeader titleId={titleId} descId={descId} title={title} description={description} onClose={onClose} dismissible={dismissible}/>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="cs-btn-row cs-btn-row-end shrink-0 border-t border-cs-border bg-cs-surface px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
