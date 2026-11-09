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

/**
 * Nền toast theo trạng thái (xanh lá thành công, đỏ lỗi, vàng lưu ý, xanh dương thông tin) — token *-soft
 * nên đúng ở cả theme sáng / tối. Không viền màu (giữ quyết định trước); tiêu đề dùng màu chữ đậm của trạng thái.
 */
const toastStyle: Record<ToastTone, { icon: "check" | "alert" | "info"; title: string; bg: string; box: string; heading: string; bar: string }> = {
  // Ô icon: màu đặc pha 20% trắng — nổi trên nền nhạt nhưng không quá nặng.
  success: { icon: "check", title: "Thành công", bg: "bg-success-soft", box: "bg-[color-mix(in_srgb,var(--cs-success-solid)_80%,white)]", heading: "text-success-fg", bar: "bg-success" },
  error: { icon: "alert", title: "Có lỗi", bg: "bg-danger-soft", box: "bg-[color-mix(in_srgb,var(--cs-danger-solid)_80%,white)]", heading: "text-danger-fg", bar: "bg-danger" },
  warning: { icon: "alert", title: "Lưu ý", bg: "bg-warning-soft", box: "bg-[color-mix(in_srgb,var(--cs-warning-solid)_80%,white)]", heading: "text-warning-fg", bar: "bg-warning" },
  info: { icon: "info", title: "Thông tin", bg: "bg-info-soft", box: "bg-[color-mix(in_srgb,var(--cs-info-solid)_80%,white)]", heading: "text-info-fg", bar: "bg-info" },
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
          className={`cs-toast pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-card border border-transparent py-3 pl-4 pr-3 text-cs-text shadow-raised ${style.bg}`}>
          {/* Ô icon: nền đặc đậm theo trạng thái + icon trắng, nổi trên nền nhạt của toast. */}
          <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-on-solid shadow-sm ${style.box}`} aria-hidden="true"><Icon name={style.icon} size={16} className="[stroke-width:2]"/></span>
          <div className="min-w-0 flex-1">
            <p className={`text-small font-semibold ${style.heading}`}>{style.title}</p>
            <p className="mt-0.5 break-words text-small text-cs-text">{toast.message}</p>
          </div>
          <button type="button" className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-transparent text-cs-text-2 transition-colors hover:bg-cs-surface/70 hover:text-cs-text" aria-label={`${LABELS.action.close} thông báo`} onClick={() => dismissToast(toast.id)}>
            <Icon name="close" size={14}/>
          </button>
          <span className={`cs-toast-progress absolute inset-x-0 bottom-0 h-0.5 opacity-60 ${style.bar}`} aria-hidden="true"/>
        </div>;
      })}
    </div>
  </FeedbackContext.Provider>;
}
