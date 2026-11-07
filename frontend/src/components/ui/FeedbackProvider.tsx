import { useCallback, useRef, useState, type ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";
import { FeedbackContext, type ConfirmOptions, type ToastItem, type ToastTone } from "./feedbackContext";
import { useOverlayArea } from "./useOverlayArea";

type ConfirmState = { options: ConfirmOptions; resolve: (result: boolean) => void; key: number } | null;

const toastStyle: Record<ToastTone, { icon: "check" | "alert" | "info"; box: string }> = {
  success: { icon: "check", box: "bg-success-soft text-success" },
  error: { icon: "alert", box: "bg-danger-soft text-danger" },
  info: { icon: "info", box: "bg-cs-soft text-cs-accent-text" },
};

/** Cơ chế xác nhận + thông báo DUY NHẤT của hệ thống: useAppFeedback().confirm / notify. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const area = useOverlayArea();
  const [dialog, setDialog] = useState<ConfirmState>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const queue = useRef<NonNullable<ConfirmState>[]>([]);
  const dialogRef = useRef<ConfirmState>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    const request = { options, resolve, key: ++nextId.current };
    if (dialogRef.current) { queue.current.push(request); return; }
    dialogRef.current = request;
    setDialog(request);
  }), []);

  const close = useCallback((result: boolean) => {
    const active = dialogRef.current;
    if (!active) return;
    active.resolve(result);
    const next = queue.current.shift() || null;
    dialogRef.current = next;
    setDialog(next);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts(current => current.filter(item => item.id !== id)), []);
  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++nextId.current;
    setToasts(current => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 4200);
  }, [dismissToast]);

  return <FeedbackContext.Provider value={{ confirm, notify }}>
    {children}
    {dialog && <ConfirmDialog key={dialog.key} options={dialog.options} area={area} onClose={close}/>}
    <div data-area={area} className="cs-feedback-layer pointer-events-none fixed right-4 top-[max(1.25rem,env(safe-area-inset-top))] z-[450] flex w-[min(390px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(toast => <div key={toast.id} role={toast.tone === "error" ? "alert" : undefined}
        className="cs-menu-panel pointer-events-auto flex items-start gap-3 rounded-card border border-cs-border bg-cs-surface px-4 py-3 text-cs-text shadow-raised">
        <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${toastStyle[toast.tone].box}`} aria-hidden="true"><Icon name={toastStyle[toast.tone].icon} size={14}/></span>
        <p className="flex-1 text-small">{toast.message}</p>
        <button type="button" className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-cs-muted hover:bg-cs-hover hover:text-cs-text" aria-label={`${LABELS.action.close} thông báo`} onClick={() => dismissToast(toast.id)}>
          <Icon name="close" size={14}/>
        </button>
      </div>)}
    </div>
  </FeedbackContext.Provider>;
}
