import type { IconName } from "../components/ui/Icon";
import { fetchApi } from "./api";

export type CustomerNotification = {
  id: number;
  appointment_id: number | null;
  repair_order_id: number | null;
  title: string;
  content: string;
  type: string;
  created_at: string | null;
  read_at: string | null;
};

/** Chuông: 30 tin mới nhất (mặc định); trang Hồ sơ > Thông báo xin nhiều hơn. */
export async function getCustomerNotifications(limit?: number): Promise<{items: CustomerNotification[]; unreadCount: number}> {
  const response = await fetchApi<{data: CustomerNotification[]; unread_count: number}>(`/me/notifications${limit ? `?limit=${limit}` : ""}`);
  return {
    items: Array.isArray(response?.data) ? response.data : [],
    unreadCount: Number(response?.unread_count ?? 0),
  };
}

export async function readCustomerNotification(id: number) {
  return fetchApi(`/me/notifications/${id}/read`, {method: "PATCH"});
}

export async function readAllCustomerNotifications() {
  return fetchApi("/me/notifications/read-all", {method: "PATCH"});
}

/** Xóa toàn bộ thông báo của chính khách. */
export async function clearCustomerNotifications() {
  return fetchApi("/me/notifications", {method: "DELETE"});
}

/* ------------------------------------------------------------------ Nhóm (bộ lọc ở Hồ sơ > Thông báo) */

export type NotificationGroup = "appointment" | "quotation" | "repair" | "billing" | "review";
export const NOTIFICATION_GROUPS: Array<{ key: NotificationGroup; label: string }> = [
  { key: "appointment", label: "Lịch hẹn" },
  { key: "quotation", label: "Báo giá" },
  { key: "repair", label: "Sửa chữa" },
  { key: "billing", label: "Hóa đơn & thanh toán" },
  { key: "review", label: "Đánh giá" },
];

/** Nhóm của một thông báo theo type (khớp backend Notification::TYPE_*); loại lạ → theo phiếu / lịch hẹn. */
export function notificationGroup(item: CustomerNotification): NotificationGroup {
  const type = item.type ?? "";
  if (type.startsWith("APPOINTMENT_")) return "appointment";
  if (type.startsWith("QUOTATION_")) return "quotation";
  if (type === "INVOICE_ISSUED" || type === "PAYMENT_RECEIVED") return "billing";
  if (type.startsWith("REVIEW_")) return "review";
  return item.repair_order_id ? "repair" : "appointment";
}

/* ------------------------------------------------------------------ Đích đến của từng loại */

export type NotificationTarget = { to: string; action: string; icon: IconName };

/**
 * Bấm thông báo → mở ĐÚNG chỗ chi tiết (khớp với type do backend CustomerNotifier tạo):
 * lịch hẹn → modal lịch hẹn; báo giá / hóa đơn → modal của phiếu đó; sửa chữa / biên bản → tiến độ của phiếu;
 * đánh giá → modal đánh giá trong Lịch sử bảo dưỡng. Loại lạ → suy theo appointment_id / repair_order_id.
 */
export function notificationTarget(item: CustomerNotification): NotificationTarget {
  const order = item.repair_order_id;
  const appointment = item.appointment_id;
  if (order) {
    switch (item.type) {
      case "QUOTATION_SENT": return { to: `/quotation?order=${order}`, action: "Xem và duyệt báo giá", icon: "dollar" };
      case "INVOICE_ISSUED": return { to: `/invoices?order=${order}`, action: "Xem hóa đơn", icon: "receipt" };
      case "PAYMENT_RECEIVED": return { to: `/invoices?order=${order}`, action: "Xem hóa đơn", icon: "card" };
      case "HANDOVER_SUBMITTED": return { to: `/repair-status?orderId=${order}#bien-ban`, action: "Xem và xác nhận biên bản", icon: "file" };
      case "REVIEW_INVITE": return { to: `/customer/service-history?review=${order}`, action: "Đánh giá ngay", icon: "star" };
      case "REVIEW_REPLIED": return { to: `/customer/service-history?review=${order}`, action: "Xem phản hồi", icon: "star" };
      case "PART_ARRIVED":
      case "WAITING_FOR_PARTS": return { to: `/repair-status?orderId=${order}`, action: "Xem tiến độ", icon: "box" };
      default: return { to: `/repair-status?orderId=${order}`, action: "Xem tiến độ", icon: "wrench" };
    }
  }
  if (appointment) return { to: `/customer/appointments?appointment=${appointment}`, action: "Xem lịch hẹn", icon: "calendar" };
  return { to: "/customer/appointments", action: "Xem chi tiết", icon: "bell" };
}
