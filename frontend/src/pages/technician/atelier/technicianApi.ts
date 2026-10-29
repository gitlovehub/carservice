import { fetchApi } from "../../../services/api";

// DTOs grounded in Laravel RepairOrderController, WorkItemController,
// InspectionController and the associated Eloquent models.
export type WorkStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type InspectionItemStatus = "PASSED" | "WARNING" | "FAILED" | "NORMAL" | "NEEDS_SERVICE" | "NEEDS_REPLACEMENT";
export type RepairOrderStatus = "RECEIVED" | "INSPECTING" | "QUOTING" | "WAITING_APPROVAL" | "WAITING_FOR_PARTS" | "IN_PROGRESS" | "COMPLETED" | "HANDED_OVER" | "CLOSED" | "REVIEW_TEST" | string;

export type RepairOrder = {
  id: number;
  repair_order_code?: string | null;
  status: RepairOrderStatus;
  received_at?: string | null;
  completed_at?: string | null;
  mileage_received?: number | null;
  initial_condition?: string | null;
  note?: string | null;
  customer?: { id?: number; full_name?: string | null; phone?: string | null } | null;
  vehicle?: { id?: number; license_plate?: string | null; variant?: string | null; year?: number | null; model?: { name?: string | null } | null } | null;
  advisor?: { id?: number; full_name?: string | null } | null;
  status_history?: Array<{ id: number; status?: string; note?: string | null; created_at?: string | null }>;
  inspections?: Inspection[];
  work_items?: WorkItem[];
};

export type WorkItem = {
  id: number;
  repair_order_id?: number;
  description?: string | null;
  status: WorkStatus;
  started_at?: string | null;
  completed_at?: string | null;
  service?: { name?: string | null } | null;
  technician?: { employee?: { full_name?: string | null } | null } | null;
};

export type InspectionItem = { id: number; item_name: string; condition_status: InspectionItemStatus | null; condition_description?: string | null; note?: string | null };
export type Inspection = {
  id: number;
  diagnosis?: string | null;
  condition_description?: string | null;
  inspected_at?: string | null;
  items?: InspectionItem[];
  recommendations?: Array<{ id: number; item_type: string; quantity?: number; note?: string | null }>;
};
export type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number; per_page: number };
export type InspectionPayload = {
  condition_description: string;
  diagnosis: string;
  inspection_items: Array<{ item_name: string; status: InspectionItemStatus; condition_description?: string; note?: string }>;
};

const base = "/repair-orders";
export const technicianApi = {
  orders: (page = 1, status = "", signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    return fetchApi<Paginated<RepairOrder>>(`${base}?${params}`, { signal });
  },
  detail: (id: number, signal?: AbortSignal) => fetchApi<RepairOrder>(`${base}/${id}`, { signal }),
  workItems: (id: number, signal?: AbortSignal) => fetchApi<WorkItem[]>(`${base}/${id}/work-items`, { signal }),
  updateWorkStatus: (id: number, status: WorkStatus) => fetchApi<WorkItem>(`/work-items/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  inspection: (id: number, signal?: AbortSignal) => fetchApi<Inspection>(`${base}/${id}/inspections`, { signal }),
  startInspection: (id: number, payload: InspectionPayload) => fetchApi<Inspection>(`${base}/${id}/inspections`, { method: "POST", body: JSON.stringify(payload) }),
  finishInspection: (id: number) => fetchApi<Inspection>(`${base}/${id}/inspections/complete`, { method: "POST" }),
  addRecommendation: (id: number, payload: { item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; quantity: number; note?: string }) =>
    fetchApi(`${base}/${id}/inspections/recommendations`, { method: "POST", body: JSON.stringify(payload) }),
};

export function messageForError(error: unknown) {
  return error instanceof Error ? error.message : "Không thể lấy dữ liệu từ máy chủ.";
}
export function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}
export function dateLabel(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}
export function vehicleLabel(order: RepairOrder) {
  const vehicle = order.vehicle;
  return [vehicle?.model?.name, vehicle?.variant].filter(Boolean).join(" · ") || vehicle?.license_plate || "Xe chưa cập nhật thông tin";
}
