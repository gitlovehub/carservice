import { fetchApi } from "./api";

/* ---------- Kiểu dữ liệu theo backend hiện có ---------- */

export type ApiVehicle = {
  id: number;
  license_plate: string | null;
  variant?: string | null;
  year?: number | null;
  mileage?: number | null;
  model?: { id?: number; name?: string; brand?: { name?: string } | null } | null;
};

export type ApiInspectionItem = {
  id: number;
  item_name: string;
  condition_status: string | null;
  condition_description: string | null;
  note: string | null;
};

export type ApiInspection = {
  id: number;
  repair_order_id: number;
  condition_description: string | null;
  diagnosis: string | null;
  inspected_at: string | null;
  items?: ApiInspectionItem[];
};

export type WorkItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ApiWorkItem = {
  id: number;
  repair_order_id: number;
  service_id: number | null;
  technician_id: number | null;
  description: string | null;
  status: WorkItemStatus | string;
  started_at: string | null;
  completed_at: string | null;
  service?: { id: number; name: string } | null;
};

export type ApiRepairOrder = {
  id: number;
  repair_order_code: string;
  status: string;
  mileage_received: number | null;
  initial_condition: string | null;
  note: string | null;
  received_at: string | null;
  completed_at: string | null;
  customer?: { id: number; full_name: string; phone?: string | null } | null;
  vehicle?: ApiVehicle | null;
  advisor?: { id: number; full_name: string } | null;
  work_items?: ApiWorkItem[];
  workItems?: ApiWorkItem[];
  inspections?: ApiInspection[];
};

/* ---------- Gọi API (chỉ dùng endpoint sẵn có) ---------- */

export async function getRepairOrders(): Promise<ApiRepairOrder[]> {
  const res = await fetchApi("/repair-orders");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function getRepairOrder(id: number): Promise<ApiRepairOrder> {
  return fetchApi(`/repair-orders/${id}`);
}

export async function getWorkItems(repairOrderId: number): Promise<ApiWorkItem[]> {
  const res = await fetchApi(`/repair-orders/${repairOrderId}/work-items`);
  return Array.isArray(res) ? res : [];
}

export async function updateWorkItemStatus(
  workItemId: number,
  status: WorkItemStatus,
): Promise<ApiWorkItem> {
  return fetchApi(`/work-items/${workItemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createInspection(
  repairOrderId: number,
  data: {
    condition_description?: string;
    diagnosis?: string;
    items?: {
      item_name: string;
      condition_status?: string;
      condition_description?: string;
      note?: string;
    }[];
  },
): Promise<ApiInspection> {
  return fetchApi(`/repair-orders/${repairOrderId}/inspections`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ---------- Tiện ích hiển thị ---------- */

export const repairStatusLabel: Record<string, string> = {
  RECEIVED: "Đã tiếp nhận",
  INSPECTING: "Đang kiểm tra",
  WAITING_APPROVAL: "Chờ khách duyệt báo giá",
  WAITING_FOR_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang sửa chữa",
  COMPLETED: "Đã hoàn tất",
  HANDED_OVER: "Đã bàn giao",
  CLOSED: "Đã đóng phiếu",
  REVIEW_TEST: "Kiểm tra & chạy thử",
};

export function getVehicleName(vehicle?: ApiVehicle | null): string {
  if (!vehicle) return "Xe chưa xác định";
  return (
    [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.variant, vehicle.year]
      .filter(Boolean)
      .join(" ") || vehicle.license_plate || "Xe chưa xác định"
  );
}

export function latestInspection(order: ApiRepairOrder): ApiInspection | null {
  const list = order.inspections ?? [];
  if (list.length === 0) return null;
  return [...list].sort((a, b) => b.id - a.id)[0];
}

export function inspectionItem(
  inspection: ApiInspection | null,
  itemName: string,
): ApiInspectionItem | null {
  if (!inspection?.items) return null;
  return inspection.items.find((item) => item.item_name === itemName) ?? null;
}

/** Nhóm trạng thái phiếu theo 3 nhãn dùng ở khu vực kỹ thuật. */
export function technicianStatusGroup(
  status: string,
): "Chờ thực hiện" | "Đang thực hiện" | "Hoàn thành" {
  switch (status) {
    case "RECEIVED":
    case "INSPECTING":
    case "WAITING_APPROVAL":
      return "Chờ thực hiện";
    case "WAITING_FOR_PARTS":
    case "IN_PROGRESS":
      return "Đang thực hiện";
    default:
      return "Hoàn thành";
  }
}

/** Ước lượng tiến độ (%) từ trạng thái phiếu (schema chưa có cột tiến độ). */
export function statusProgress(status: string): number {
  switch (status) {
    case "RECEIVED":
      return 0;
    case "INSPECTING":
      return 10;
    case "WAITING_APPROVAL":
      return 20;
    case "WAITING_FOR_PARTS":
      return 50;
    case "IN_PROGRESS":
      return 60;
    case "COMPLETED":
    case "HANDED_OVER":
    case "CLOSED":
      return 100;
    default:
      return 0;
  }
}

export function progressGroup(percent: number): "Chờ sửa chữa" | "Đang sửa chữa" | "Hoàn thành" {
  if (percent >= 100) return "Hoàn thành";
  if (percent <= 0) return "Chờ sửa chữa";
  return "Đang sửa chữa";
}

export function formatMileage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString("vi-VN")} km`;
}
