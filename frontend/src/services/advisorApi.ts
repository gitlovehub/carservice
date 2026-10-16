import { fetchApi } from "./api";

/* ---------- Kiểu dữ liệu theo backend hiện có ---------- */

export type AdvisorVehicle = {
  id: number;
  license_plate: string | null;
  variant?: string | null;
  year?: number | null;
  model?: { id?: number; name?: string; brand?: { name?: string } | null } | null;
};

export type AdvisorCustomer = {
  id: number;
  full_name: string;
  phone: string | null;
  email?: string | null;
};

export type WorkItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ApiWorkItem = {
  id: number;
  repair_order_id: number;
  service_id?: number | null;
  technician_id?: number | null;
  description: string | null;
  status: WorkItemStatus | string;
  started_at?: string | null;
  completed_at?: string | null;
  service?: { id: number; name: string } | null;
};

export type ApiAssignment = {
  id: number;
  technician_id: number;
  status: string;
  technician?: {
    id: number;
    employee?: { id: number; full_name: string } | null;
  } | null;
};

export type ApiQuotationItem = {
  id: number;
  item_type: "SERVICE" | "PART" | string;
  service_id?: number | null;
  part_id?: number | null;
  description?: string | null;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
  is_approved?: boolean | null;
};

export type ApiQuotation = {
  id: number;
  repair_order_id: number;
  quotation_code: string;
  version: number;
  status:
    | "DRAFT"
    | "SENT"
    | "APPROVED"
    | "PARTIALLY_APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | string;
  subtotal: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  valid_until?: string | null;
  customer_response_at?: string | null;
  items?: ApiQuotationItem[];
  repairOrder?: ApiRepairOrder | null;
};

export type ApiService = {
  id: number;
  name: string;
  base_price?: string | number | null;
  estimated_minutes?: number | null;
  status?: string;
};

export type ApiRepairOrder = {
  id: number;
  repair_order_code: string;
  status: string;
  mileage_received?: number | null;
  initial_condition?: string | null;
  note?: string | null;
  received_at?: string | null;
  completed_at?: string | null;
  handed_over_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  customer?: AdvisorCustomer | null;
  vehicle?: AdvisorVehicle | null;
  advisor?: { id: number; full_name: string } | null;
  assignments?: ApiAssignment[];
  workItems?: ApiWorkItem[];
  work_items?: ApiWorkItem[];
  quotations?: ApiQuotation[];
  statusHistory?: {
    id: number;
    status: string;
    note?: string | null;
    created_at?: string | null;
  }[];
  invoice?: { id: number; invoice_code: string; total_amount: number | string; status: string } | null;
};

export type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

/*
 * Backend KHÔNG có endpoint liệt kê danh sách kỹ thuật viên,
 * nên ta khai báo sẵn các technician_profile_id để dropdown giao việc.
 */
export const TECHNICIANS: { id: number; name: string }[] = [
  { id: 1, name: "Pearline Tremblay III" },
  { id: 2, name: "Ms. Barbara McCullough PhD" },
  { id: 3, name: "Mrs. Tyra Dibbert" },
  { id: 4, name: "Dr. Kamron Emard" },
  { id: 5, name: "Marietta Kertzmann" },
];

/* ---------- Phiếu sửa chữa ---------- */

export async function getRepairOrders(): Promise<ApiRepairOrder[]> {
  const res = await fetchApi("/repair-orders");
  return Array.isArray(res?.data) ? res.data : [];
}

export async function getRepairOrder(id: number): Promise<ApiRepairOrder> {
  return fetchApi(`/repair-orders/${id}`);
}

export async function createRepairOrder(data: {
  customer_id: number;
  vehicle_id: number;
  mileage_received?: number;
  initial_condition?: string;
  note?: string;
}): Promise<ApiRepairOrder> {
  return fetchApi("/repair-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function assignTechnician(
  repairOrderId: number,
  technicianId: number,
  note?: string,
) {
  return fetchApi(`/repair-orders/${repairOrderId}/assign-technician`, {
    method: "POST",
    body: JSON.stringify({ technician_id: technicianId, note }),
  });
}

/* Chuyển trạng thái phiếu (các bước cố vấn điều khiển) */

export function startRepair(repairOrderId: number) {
  return fetchApi(`/repair-orders/${repairOrderId}/start-repair`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function markWaitingForParts(repairOrderId: number, note?: string) {
  return fetchApi(`/repair-orders/${repairOrderId}/waiting-for-parts`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function resumeRepair(repairOrderId: number, note?: string) {
  return fetchApi(`/repair-orders/${repairOrderId}/resume`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function reviewRepair(repairOrderId: number, note?: string) {
  return fetchApi(`/repair-orders/${repairOrderId}/review`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function completeRepair(repairOrderId: number, note?: string) {
  return fetchApi(`/repair-orders/${repairOrderId}/complete`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function handOverRepair(repairOrderId: number) {
  return fetchApi(`/repair-orders/${repairOrderId}/hand-over`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function closeRepair(
  repairOrderId: number,
  closeReason: string,
  note: string,
) {
  return fetchApi(`/repair-orders/${repairOrderId}/close`, {
    method: "POST",
    body: JSON.stringify({ close_reason: closeReason, note }),
  });
}

/* ---------- Khách hàng & xe (dùng khi tạo phiếu) ---------- */

export async function getCustomers(params: {
  search?: string;
  page?: number;
} = {}): Promise<{ items: AdvisorCustomer[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  query.set("page", String(params.page ?? 1));

  const res = await fetchApi(`/customers?${query.toString()}`);
  const result = res?.data;

  return {
    items: Array.isArray(result?.data) ? result.data : [],
    pagination: {
      current_page: result?.current_page ?? 1,
      per_page: result?.per_page ?? 10,
      total: result?.total ?? 0,
      last_page: result?.last_page ?? 1,
    },
  };
}

export async function getCustomerVehicles(
  customerId: number,
): Promise<AdvisorVehicle[]> {
  const res = await fetchApi(`/customers/${customerId}/vehicles`);
  return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
}

export async function getServices(): Promise<ApiService[]> {
  const res = await fetchApi("/services");
  return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
}

/* ---------- Báo giá ---------- */

export async function createQuotation(
  repairOrderId: number,
  data: {
    items: {
      item_type: "SERVICE";
      service_id: number;
      description: string;
      quantity: number;
      unit_price: number;
    }[];
    discount_amount?: number;
    valid_until?: string;
  },
): Promise<ApiQuotation> {
  return fetchApi(`/repair-orders/${repairOrderId}/quotations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendQuotation(quotationId: number): Promise<ApiQuotation> {
  return fetchApi(`/quotations/${quotationId}/send`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/* ---------- Nhãn & tiện ích hiển thị ---------- */

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

export const REPAIR_STATUSES = Object.keys(repairStatusLabel);

export const quotationStatusLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  SENT: "Chờ khách duyệt",
  APPROVED: "Đã duyệt toàn bộ",
  PARTIALLY_APPROVED: "Duyệt một phần",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

export const CLOSE_REASONS: { value: string; label: string }[] = [
  { value: "CUSTOMER_REQUEST", label: "Theo yêu cầu của khách" },
  { value: "PART_UNAVAILABLE", label: "Không có phụ tùng" },
  { value: "CUSTOMER_DECLINED_QUOTE", label: "Khách từ chối báo giá" },
  { value: "OTHER", label: "Lý do khác" },
];

export function getVehicleName(vehicle?: AdvisorVehicle | null): string {
  if (!vehicle) return "Xe chưa xác định";
  return (
    [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.variant, vehicle.year]
      .filter(Boolean)
      .join(" ") || vehicle.license_plate || "Xe chưa xác định"
  );
}

export function getTechnicianName(order?: ApiRepairOrder | null): string {
  const assignment = order?.assignments?.[0];
  const name = assignment?.technician?.employee?.full_name;
  return name || "—";
}

/** Ước lượng tiến độ (%) từ work items, fallback theo trạng thái phiếu. */
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

export function repairProgress(order: ApiRepairOrder): number {
  const items = order.workItems ?? order.work_items ?? [];
  if (items.length > 0) {
    const completed = items.filter((i) => i.status === "COMPLETED").length;
    return Math.round((completed / items.length) * 100);
  }
  return statusProgress(order.status);
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

export function formatMileage(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString("vi-VN")} km`;
}
