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
