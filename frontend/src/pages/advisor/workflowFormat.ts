import { LABELS } from "../../config/labels";

/** Ngày giờ ngắn kiểu Việt Nam (dd/mm/yyyy hh:mm). */
export function formatDateTime(date?: string | null) {
  if (!date) return "Chưa có";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? date : parsed.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Thông điệp lỗi hiển thị cho người dùng (api.ts đã chuẩn hóa message tiếng Việt). */
export function errorText(error: unknown) { return error instanceof Error ? error.message : LABELS.notify.genericError; }
