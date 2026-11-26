import { useEffect } from "react";
import { useAppFeedback } from "./feedbackContext";

/**
 * Đưa lỗi của form vào hệ thống toast chung thay cho khung lỗi trong trang.
 * `signal`: truyền khi một lần gửi có thể lặp lại đúng câu lỗi cũ mà state không qua rỗng.
 */
export function ToastError({ message, signal }: { message?: string | null; signal?: unknown }) {
  const { notify } = useAppFeedback();
  useEffect(() => {
    if (message) notify(message, "error");
  }, [message, signal, notify]);
  return null;
}
