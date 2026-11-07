import { LABELS } from "../../config/labels";

/** Ngày giờ ngắn kiểu Việt Nam (dd/mm/yyyy hh:mm). */
export function formatDateTime(date?: string | null) {
  if (!date) return "Chưa có";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? date : parsed.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Ngày + giờ hẹn từ API (YYYY-MM-DD, HH:MM:SS) → "dd/mm/yyyy · hh:mm". */
export function formatSlot(date?: string | null, time?: string | null) {
  const [y, m, d] = (date ?? "").slice(0, 10).split("-");
  const day = y && m && d ? `${d}/${m}/${y}` : date || "Chưa có ngày";
  return time ? `${day} · ${time.slice(0, 5)}` : day;
}

/** Thông điệp lỗi hiển thị cho người dùng (api.ts đã chuẩn hóa message tiếng Việt). */
export function errorText(error: unknown) { return error instanceof Error ? error.message : LABELS.notify.genericError; }
