import { LABELS } from "../../config/labels";
import type { ConfirmOptions } from "../../components/ui/feedbackContext";

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

/** Ngày (YYYY-MM-DD...) có phải hôm nay theo giờ máy không. */
export function isTodayIso(date?: string | null) {
  const now = new Date();
  return (date ?? "").slice(0, 10) === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Thông điệp lỗi hiển thị cho người dùng (api.ts đã chuẩn hóa message tiếng Việt). */
/** Phút → giờ, tối đa 1 chữ số thập phân: 1035 → "17,3", 3240 → "54". */
export const minutesToHours = (minutes: number) => (Math.round(minutes / 6) / 10).toLocaleString("vi-VN");

/** Tải / công suất gara dạng dễ đọc: "17,3/54 giờ · 32%". */
export function capacityText(load: number, capacity: number | null) {
  if (!capacity) return `${minutesToHours(load)} giờ`;
  return `${minutesToHours(load)}/${minutesToHours(capacity)} giờ · ${Math.round((load / capacity) * 100)}%`;
}

type CheckInSource = {
  appointment_code?: string | null; appointment_date?: string | null; appointment_time?: string | null;
  customer?: { full_name?: string | null; phone?: string | null } | null;
  vehicle?: { license_plate?: string | null; model?: { name?: string | null; brand?: { name?: string | null } | null } | null } | null;
};

const carText = (a: CheckInSource) => {
  const car = [a.vehicle?.model?.brand?.name, a.vehicle?.model?.name].filter(Boolean).join(" ");
  return `${car ? `${car} · ` : ""}${a.vehicle?.license_plate || "xxx.xx"}`;
};

/**
 * Hộp "Xác minh lịch hẹn với khách" (PENDING → CONFIRMED), dùng chung trang Lịch hẹn và Tiếp nhận.
 * Thông tin cần đọc khi gọi khách tách thành bảng; cảnh báo quá tải (nếu có) hiện riêng.
 */
export function confirmAppointmentOptions(a: CheckInSource, capacityNote?: string, onSendEmail?: () => void): ConfirmOptions {
  return {
    title: "Xác minh lịch hẹn với khách", reference: a.appointment_code ?? undefined, phone: a.customer?.phone ?? undefined,
    // Không gọi được khách → gửi email để khách tự bấm xác nhận.
    extraAction: onSendEmail ? { label: "Gửi email xác nhận", icon: "mail", onSelect: onSendEmail } : undefined,
    description: "Gọi khách để xác nhận lại lịch dưới đây.\nChỉ xác nhận khi khách đồng ý.",
    details: [
      { label: "Khách hàng", value: a.customer?.full_name || "Khách hàng" },
      { label: "Xe", value: carText(a) },
      { label: "Giờ hẹn", value: formatSlot(a.appointment_date, a.appointment_time), badge: isTodayIso(a.appointment_date) ? "Hôm nay" : undefined },
    ],
    note: capacityNote,
    confirmText: "Khách đồng ý – Xác nhận", variant: "success", cancelText: "Để sau",
    checklist: ["Tôi đã xác minh thông tin lịch hẹn với khách hàng.", "Khách đồng ý đến theo lịch này."],
  };
}

/** Hộp hỏi trước khi gửi email để khách tự bấm xác nhận lịch (dùng chung trang Lịch hẹn và Tiếp nhận). */
export function sendEmailConfirmOptions(a: CheckInSource & { customer?: { email?: string | null } | null }, resend = false): ConfirmOptions {
  return {
    title: resend ? "Gửi lại email xác nhận" : "Gửi email cho khách xác nhận", reference: a.appointment_code ?? undefined, icon: "mail", confirmIcon: "send",
    description: "Email gồm giờ hẹn, xe và dịch vụ khách đã đặt, kèm nút Xác nhận lịch hẹn. Khách bấm nút thì lịch tự chuyển sang Đã xác nhận.",
    details: [
      { label: "Gửi tới", value: a.customer?.email || "Email tài khoản của khách" },
      { label: "Giờ hẹn", value: formatSlot(a.appointment_date, a.appointment_time), badge: isTodayIso(a.appointment_date) ? "Hôm nay" : undefined },
    ],
    confirmText: "Gửi email",
  };
}

/**
 * Hộp xác nhận "Khách đã đến gara" (CONFIRMED → CHECKED_IN), dùng chung trang Lịch hẹn và Tiếp nhận.
 * Chỉ ghi nhận khách có mặt; đối chiếu xe thực tế, ODO, tạo phiếu làm ở bước 2 — nên không bắt tick khớp biển số ở đây.
 */
export function checkInConfirmOptions(a: CheckInSource): ConfirmOptions {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const day = (a.appointment_date ?? "").slice(0, 10);
  return {
    title: "Ghi nhận khách đã đến", reference: a.appointment_code ?? undefined, icon: "car", confirmIcon: "check",
    description: "Đối chiếu nhanh với khách tại quầy. Xe thực tế, số km và tình trạng xe sẽ kiểm tra ở bước tiếp theo.",
    details: [
      { label: "Khách hàng", value: [a.customer?.full_name || "Khách hàng", a.customer?.phone].filter(Boolean).join(" · ") },
      { label: "Xe", value: carText(a) },
      { label: "Giờ hẹn", value: formatSlot(a.appointment_date, a.appointment_time), badge: isTodayIso(a.appointment_date) ? "Hôm nay" : undefined },
    ],
    note: day && day !== today ? `Lịch hẹn ngày ${formatSlot(day)}, không phải hôm nay. Chỉ tiếp nhận nếu khách thực sự đang có mặt.` : undefined,
    confirmText: "Khách đã đến",
  };
}

export function errorText(error: unknown) { return error instanceof Error ? error.message : LABELS.notify.genericError; }
