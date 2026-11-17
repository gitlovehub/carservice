import type { IconName } from "./Icon";
import { createContext, useContext } from "react";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "warning" | "danger" | "info" | "success";
  checklist?: string[];
  reference?: string;
  phone?: string;
  /** Icon nút xác nhận. Mặc định với variant danger: "trash" nếu là xóa, ngược lại "x" (hủy/đóng/từ chối). */
  confirmIcon?: IconName;
  /** Icon ở đầu hộp thoại (mặc định theo variant). */
  icon?: IconName;
  /** Bảng thông tin ngắn để đối chiếu trước khi xác nhận (vd. khách, xe, giờ hẹn). */
  details?: Array<{ label: string; value: string; /** Badge xanh lá nhỏ cạnh giá trị, vd. "Hôm nay". */ badge?: string }>;
  /** Lưu ý nổi bật (màu cảnh báo), vd. lịch hẹn không phải hôm nay. */
  note?: string;
};

export type ToastTone = "success" | "error" | "warning" | "info";
export type ToastItem = { id: number; message: string; tone: ToastTone; leaving?: boolean };
type Feedback = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, tone?: ToastTone) => void;
};

export const FeedbackContext = createContext<Feedback | null>(null);

export function useAppFeedback(): Feedback {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useAppFeedback must be used inside FeedbackProvider");
  return context;
}
