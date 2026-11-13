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
