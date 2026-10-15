import { fetchApi } from "./api";

/* ---------- Kiểu dữ liệu theo API_Documentation & backend thực tế ---------- */

export type VehicleBrand = { id?: number; name?: string } | null;

export type CustomerVehicle = {
  id: number;
  license_plate: string | null;
  variant?: string | null;
  year?: number | null;
  mileage?: number | null;
  model?: { id?: number; name?: string; brand?: VehicleBrand } | null;
};

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CANCELLED"
  | "NO_SHOW";

export type CustomerAppointment = {
  id: number;
  appointment_code: string;
  vehicle_id: number;
  appointment_date: string;
  appointment_time: string;
  request_type: string;
  symptom_description?: string | null;
  note?: string | null;
  status: AppointmentStatus | string;
  cancel_reason?: string | null;
  vehicle?: CustomerVehicle | null;
  services?: { id: number; name: string; base_price?: string | number; estimated_minutes?: number }[];
  packages?: { id: number; name: string; mileage_milestone?: number }[];
};

export type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type RepairOrderStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "WAITING_APPROVAL"
  | "WAITING_FOR_PARTS"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "HANDED_OVER"
  | "CLOSED";

export type InvoiceItem = {
  id: number;
  item_type?: string;
  description?: string | null;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
};

export type CustomerRepairOrder = {
  id: number;
  repair_order_code: string;
  vehicle_id: number;
  mileage_received?: number | null;
  status: RepairOrderStatus | string;
  received_at?: string | null;
  completed_at?: string | null;
  handed_over_at?: string | null;
  note?: string | null;
  vehicle?: CustomerVehicle | null;
  work_items?: { id: number; description?: string | null; status?: string }[];
  workItems?: { id: number; description?: string | null; status?: string }[];
  quotations?: { id: number; quotation_code: string; status: string; total_amount: number | string }[];
  invoice?: {
    id: number;
    invoice_code: string;
    total_amount: number | string;
    status: string;
    items?: InvoiceItem[];
    payments?: { id: number; amount: number | string; status: string }[];
  } | null;
};

/* ---------- Gọi API ---------- */

export async function getMyVehicles(): Promise<CustomerVehicle[]> {
  const res = await fetchApi("/me/vehicles");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function updateMyVehicleMileage(id: number, mileage: number) {
  return fetchApi(`/me/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ mileage }),
  });
}

export async function getMyAppointments(params: {
  status?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<{ items: CustomerAppointment[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));

  const res = await fetchApi(`/appointments?${query.toString()}`);
  return {
    items: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination ?? {
      current_page: 1,
      per_page: params.perPage ?? 10,
      total: Array.isArray(res?.data) ? res.data.length : 0,
      last_page: 1,
    },
  };
}

export async function getAppointmentDetail(id: number): Promise<CustomerAppointment> {
  const res = await fetchApi(`/appointments/${id}`);
  return res.data;
}

export async function updateAppointment(
  id: number,
  data: { appointment_date?: string; appointment_time?: string; note?: string },
) {
  return fetchApi(`/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(id: number, cancelReason: string) {
  return fetchApi(`/appointments/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_reason: cancelReason }),
  });
}

export async function getMyRepairOrders(): Promise<CustomerRepairOrder[]> {
  const res = await fetchApi("/me/repair-orders");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function getMyRepairOrderDetail(id: number): Promise<CustomerRepairOrder> {
  return fetchApi(`/me/repair-orders/${id}`);
}

/* ---------- Hiển thị ---------- */

export const appointmentStatusLabel: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã tiếp nhận xe",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

export const requestTypeLabel: Record<string, string> = {
  DIAGNOSIS: "Kiểm tra / chẩn đoán",
  REPAIR: "Sửa chữa",
  MAINTENANCE: "Bảo dưỡng",
  REPLACEMENT: "Thay thế phụ tùng",
};

export const repairStatusLabel: Record<string, string> = {
  RECEIVED: "Đã tiếp nhận",
  INSPECTING: "Đang kiểm tra",
  WAITING_APPROVAL: "Chờ khách duyệt báo giá",
  WAITING_FOR_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang sửa chữa",
  COMPLETED: "Đã hoàn tất",
  HANDED_OVER: "Đã bàn giao",
  CLOSED: "Đã đóng phiếu",
};

export const FINISHED_REPAIR_STATUSES = ["COMPLETED", "HANDED_OVER", "CLOSED"];

export function getVehicleName(vehicle?: CustomerVehicle | null): string {
  if (!vehicle) return "Xe chưa xác định";
  return (
    [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.variant]
      .filter(Boolean)
      .join(" ") || "Xe của bạn"
  );
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("vi-VN")} đ`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("vi-VN");
}

export function formatTime(value?: string | null): string {
  return value ? value.slice(0, 5) : "—";
}
