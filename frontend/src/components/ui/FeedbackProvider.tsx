import { useCallback, useRef, useState, type ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";
import { FeedbackContext, type ConfirmOptions, type ToastItem, type ToastTone } from "./feedbackContext";
import { useOverlayArea } from "./useOverlayArea";

type ConfirmState = { options: ConfirmOptions; resolve: (result: boolean) => void; key: number } | null;

/** Thời gian hiển thị mỗi toast (ms). */
const TOAST_DURATION = 3000;
const EXIT_MS = 220;

const toastStyle: Record<ToastTone, { icon: "check" | "alert" | "info"; title: string; box: string; bar: string }> = {
  success: { icon: "check", title: "Thành công", box: "bg-success-soft text-success", bar: "bg-success" },
  error: { icon: "alert", title: "Có lỗi", box: "bg-danger-soft text-danger", bar: "bg-danger" },
  warning: { icon: "alert", title: "Lưu ý", box: "bg-warning-soft text-warning", bar: "bg-warning" },
  info: { icon: "info", title: "Thông tin", box: "bg-info-soft text-info", bar: "bg-info" },
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

  // Đóng: chạy hiệu ứng trượt ra rồi mới gỡ khỏi danh sách.
  const dismissToast = useCallback((id: number) => {
    setToasts(current => current.map(item => item.id === id ? { ...item, leaving: true } : item));
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), EXIT_MS);
  }, []);
  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    if (!message.trim()) return;
    const id = ++nextId.current;
    // Cùng nội dung đang hiển thị thì không xếp chồng thêm.
    setToasts(current => current.some(item => !item.leaving && item.message === message) ? current : [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), TOAST_DURATION);
  }, [dismissToast]);

  return <FeedbackContext.Provider value={{ confirm, notify }}>
    {children}
    {dialog && <ConfirmDialog key={dialog.key} options={dialog.options} area={area} onClose={close}/>}
    <div data-area={area} className="cs-feedback-layer pointer-events-none fixed right-4 top-[max(1.25rem,env(safe-area-inset-top))] z-[450] flex w-[min(390px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map(toast => {
        const style = toastStyle[toast.tone];
        return <div key={toast.id} role={toast.tone === "error" ? "alert" : undefined} data-tone={toast.tone} data-leaving={toast.leaving || undefined}
          style={{ ["--cs-toast-duration" as string]: `${TOAST_DURATION}ms` }}
          className="cs-toast pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-card border border-cs-border bg-cs-surface py-3 pl-4 pr-3 text-cs-text shadow-raised">
          <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${style.box}`} aria-hidden="true"><Icon name={style.icon} size={16}/></span>
          <div className="min-w-0 flex-1">
            <p className="text-small font-semibold text-cs-text">{style.title}</p>
            <p className="mt-0.5 break-words text-small text-cs-text-2">{toast.message}</p>
          </div>
          <button type="button" className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-transparent text-cs-muted transition-colors hover:border-cs-border hover:bg-cs-hover hover:text-cs-text" aria-label={`${LABELS.action.close} thông báo`} onClick={() => dismissToast(toast.id)}>
            <Icon name="close" size={14}/>
          </button>
          <span className={`cs-toast-progress absolute inset-x-0 bottom-0 h-0.5 opacity-60 ${style.bar}`} aria-hidden="true"/>
        </div>;
      })}
    </div>
  </FeedbackContext.Provider>;
}
