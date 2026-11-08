import { useEffect, useRef, useState } from "react";
import { LABELS } from "../../config/labels";
import { Button, IconButton } from "./Button";
import { buttonClass } from "./buttonClass";
import { Icon, type IconName } from "./Icon";
import type { ConfirmOptions } from "./feedbackContext";
import "./overlay.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const variantStyle = {
  danger: { icon: "alert", box: "bg-danger-soft text-danger" },
  warning: { icon: "alert", box: "bg-warning-soft text-warning" },
  info: { icon: "info", box: "bg-cs-soft text-cs-accent-text" },
} as const;

/**
 * Giao diện hộp xác nhận. KHÔNG dùng trực tiếp trong trang — gọi `useAppFeedback().confirm({...})`,
 * FeedbackProvider sẽ render component này (một hàng đợi xác nhận duy nhất cho toàn hệ thống).
 */
/** Nút xác nhận danger luôn có icon: thùng rác cho xóa, X cho hủy/đóng/từ chối. */
function confirmIconFor(options: ConfirmOptions, variant: string): IconName | undefined {
  if (options.confirmIcon) return options.confirmIcon;
  if (variant !== "danger") return undefined;
  return /xóa|xoá/i.test(options.confirmText ?? "") ? "trash" : "x";
}

export function ConfirmDialog({ options, area, onClose }: { options: ConfirmOptions; area: string; onClose: (result: boolean) => void }) {
  const variant = options.variant ?? "info";
  const [checked, setChecked] = useState<boolean[]>(() => options.checklist?.map(() => false) ?? []);
  const panelRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const canConfirm = !options.checklist?.length || checked.every(Boolean);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Hủy nhận focus đầu tiên: nhấn Enter vội không vô tình thực hiện thao tác nguy hiểm.
    cancelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [onClose]);

  return <div data-area={area} className="cs-overlay cs-feedback-layer fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto px-4 py-6">
    <div className="cs-overlay-backdrop absolute inset-0 bg-cs-overlay backdrop-blur-[3px]" aria-hidden="true" onMouseDown={() => onClose(false)}/>
    <section ref={panelRef} role="alertdialog" aria-modal="true" aria-labelledby="cs-confirm-title" aria-describedby="cs-confirm-desc" data-ui-dialog="confirm"
      className="cs-modal-panel relative w-full max-w-[480px] overflow-hidden rounded-panel border border-cs-border bg-cs-surface text-cs-text shadow-overlay">
      <header className="flex items-start gap-4 px-6 pb-2 pt-5">
        <div className={`grid size-10 shrink-0 place-items-center rounded-control ${variantStyle[variant].box}`} aria-hidden="true">
          <Icon name={variantStyle[variant].icon} size={20}/>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h2 id="cs-confirm-title" className="text-subheading text-cs-text">{options.title}</h2>
          {options.reference && <p className="mt-1 text-caption font-semibold text-cs-muted">{options.reference}</p>}
        </div>
        <IconButton icon="close" label={LABELS.action.close} size="sm" onClick={() => onClose(false)} className="-mr-2 -mt-1"/>
      </header>
      <div className="space-y-4 px-6 pb-5 pl-[80px] max-sm:pl-6">
        <p id="cs-confirm-desc" className="text-small text-cs-text-2">{options.description}</p>
        {options.phone && <a className={buttonClass({ variant: "outline", size: "sm" })} href={`tel:${options.phone.replace(/[^+\d]/g, "")}`}>Gọi {options.phone}</a>}
        {options.checklist?.length ? <div className="space-y-3 rounded-card border border-cs-border bg-cs-surface-2 p-4">
          {options.checklist.map((item, i) => <label key={i} className="flex cursor-pointer items-start gap-3 text-small text-cs-text">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--cs-accent)]" checked={checked[i] || false}
              onChange={event => setChecked(prev => prev.map((v, index) => index === i ? event.target.checked : v))}/>
            <span>{item}</span>
          </label>)}
        </div> : null}
        {options.checklist?.length && !canConfirm ? <p className="text-caption text-cs-muted">Hãy đánh dấu các mục trên trước khi tiếp tục.</p> : null}
      </div>
      <footer className="cs-btn-row cs-btn-row-end border-t border-cs-border bg-cs-surface-2 px-6 py-3.5">
        <Button ref={cancelRef} variant="secondary" onClick={() => onClose(false)}>{options.cancelText || LABELS.action.back}</Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} icon={confirmIconFor(options, variant)} disabled={!canConfirm} onClick={() => onClose(true)}>{options.confirmText || LABELS.action.confirm}</Button>
      </footer>
    </section>
  </div>;
}
