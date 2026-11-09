import { useEffect, useRef } from "react";
import { useAppFeedback } from "../ui/feedbackContext";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  /** Giữ để tương thích; thời gian hiển thị do hệ thống toast chung quyết định (3 giây). */
  duration?: number;
}

/**
 * Lớp tương thích cho các trang cũ dùng <Toast message type onClose/>:
 * chuyển thông báo sang hệ thống toast DUY NHẤT (useAppFeedback().notify — góc phải trên, tự tắt sau 3 giây, có nút ✕)
 * rồi báo trang cũ đã hiển thị xong. Không tự vẽ giao diện riêng nữa.
 */
export function Toast({ message, type = "info", onClose }: ToastProps) {
  const { notify } = useAppFeedback();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!message) { shown.current = null; return; }
    if (shown.current === message) return;
    shown.current = message;
    notify(message, type);
    onClose();
  }, [message, type, notify, onClose]);

  return null;
}

export default Toast;
