import { LABELS } from "../../config/labels";
import type { ConfirmOptions } from "./feedbackContext";

/**
 * Mẫu hộp xác nhận dùng chung, truyền vào useAppFeedback().confirm(...).
 * Ví dụ: if (await confirm(confirmDelete("dịch vụ Thay dầu"))) { ... }
 */
export function confirmDelete(subject: string, description: string = LABELS.confirm.deleteDescription): ConfirmOptions {
  return { title: LABELS.confirm.deleteTitle(subject), description, confirmText: LABELS.action.delete, cancelText: LABELS.action.cancel, variant: "danger" };
}

export function confirmDiscard(): ConfirmOptions {
  return { title: LABELS.confirm.discardTitle, description: LABELS.confirm.discardDescription, confirmText: "Bỏ thay đổi", cancelText: "Tiếp tục chỉnh sửa", variant: "warning" };
}
