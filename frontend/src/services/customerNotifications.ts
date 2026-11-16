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

export async function getCustomerNotifications(): Promise<{items: CustomerNotification[]; unreadCount: number}> {
  const response = await fetchApi<{data: CustomerNotification[]; unread_count: number}>("/me/notifications");
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
      case "HANDOVER_SUBMITTED": return { to: `/repair-status?orderId=${order}`, action: "Xem và xác nhận biên bản", icon: "file" };
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
