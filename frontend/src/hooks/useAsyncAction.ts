import { useCallback, useEffect, useRef, useState } from "react";
import { LABELS } from "../config/labels";
import { useAppFeedback } from "../components/ui/feedbackContext";
import type { ConfirmOptions } from "../components/ui/feedbackContext";

type Options<Args extends unknown[], R> = {
  /** Hỏi xác nhận trước (xóa, hủy, đóng phiếu). Hàm nhận cùng tham số với run(). */
  confirm?: ConfirmOptions | ((...args: Args) => ConfirmOptions);
  /** Thông báo khi thành công; false để không hiện. */
  success?: string | false | ((result: R) => string);
  /** Thông báo khi lỗi; mặc định lấy message từ API (api.ts đã chuẩn hóa tiếng Việt). */
  error?: string | false;
  onSuccess?: (result: R) => void | Promise<void>;
};

/**
 * Chuẩn hành vi cho mọi thao tác gọi API:
 *   (xác nhận) → pending = true, chặn gửi lặp → gọi API → thông báo thành công / lỗi → pending = false.
 * Dùng chung cơ chế confirm/notify của useAppFeedback, không tạo hệ thống thông báo riêng.
 *
 *   const remove = useAsyncAction((id: number) => deleteService(id), {
 *     confirm: name => confirmDelete(name), success: LABELS.notify.deleted, onSuccess: reload });
 *   <Button variant="danger" loading={remove.pending} onClick={() => remove.run(id)}>Xóa</Button>
 *
 * run() trả về kết quả, hoặc undefined nếu người dùng hủy / bị chặn / lỗi.
 */
export function useAsyncAction<Args extends unknown[], R>(action: (...args: Args) => Promise<R>, options: Options<Args, R> = {}) {
  const { confirm, notify } = useAppFeedback();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ action, options });
  useEffect(() => { latest.current = { action, options }; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    if (running.current) return undefined;
    const { action: act, options: opts } = latest.current;
    running.current = true;
    try {
      if (opts.confirm) {
        const confirmOptions = typeof opts.confirm === "function" ? opts.confirm(...args) : opts.confirm;
        if (!(await confirm(confirmOptions))) return undefined;
      }
      if (mounted.current) { setPending(true); setError(null); }
      const result = await act(...args);
      if (opts.success !== false && opts.success !== undefined) {
        notify(typeof opts.success === "function" ? opts.success(result) : opts.success, "success");
      }
      await opts.onSuccess?.(result);
      return result;
    } catch (caught) {
      const message = caught instanceof Error && caught.message ? caught.message : LABELS.notify.genericError;
      if (mounted.current) setError(message);
      if (opts.error !== false) notify(opts.error || message, "error");
      return undefined;
    } finally {
      running.current = false;
      if (mounted.current) setPending(false);
    }
  }, [confirm, notify]);

  return { run, pending, error, clearError: useCallback(() => setError(null), []) };
}
