import { fetchApi } from "./api";

/** API thật của khu Admin (backend/app/Http/Controllers/Api/Admin*Controller.php). */

export type Kpi = { value: number; previous: number; delta: number | null };
export type PageMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type Paged<T, S = undefined> = { data: T[]; meta: PageMeta } & (S extends undefined ? object : { summary: S });
export type Params = Record<string, string | number | boolean | null | undefined>;

export function query(params: Params = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

/* ---------------------------------------------------------------- Tổng quan */
export type RepairGroupKey = "inspecting" | "quoting" | "waiting_parts" | "in_progress" | "waiting_payment";
export type DashboardData = {
  range: "today" | "7d" | "30d";
  kpis: { revenue_month: Kpi; appointments_today: Kpi; in_shop: Kpi; unpaid_invoices: Kpi };
  revenue_series: Array<{ date: string; revenue: number; avg7: number }>;
  repair_status: Record<RepairGroupKey, number>;
  attention: { pending_appointments: number; low_reviews_unreplied: number };
  upcoming_appointments: Array<{ id: number; date: string; start: string; end: string; customer: string | null; phone: string | null; vehicle: string; plate: string | null; services: string; status: string }>;
  low_stock: Array<{ part_id: number; sku: string | null; name: string | null; quantity: number; min_quantity: number }>;
};

/* ------------------------------------------------------------------ Báo cáo */
export type PaymentGroup = "CASH" | "BANK_TRANSFER" | "VNPAY";
export type ReportData = {
  period: string;
  label: string;
  periods: Array<{ value: string; label: string }>;
  revenue: { total: Kpi; service: Kpi; parts: Kpi };
  monthly: Array<{ month: string; service: number; parts: number; orders: number }>;
  top_services: Array<{ name: string; count: number; revenue: number }>;
  top_parts: Array<{ name: string; sku: string | null; quantity: number; revenue: number }>;
  collection: {
    invoices: Kpi; average_invoice: Kpi; billed: number; collected: number; outstanding: number;
    unpaid_invoices: number; collection_rate: number | null;
  };
  operations: {
    received: Kpi; delivered: number; in_shop: number; turnaround_hours: Kpi | null;
    appointments: { total: number; arrived: number; cancelled: number; no_show: number; upcoming: number; show_rate: number | null };
    customers: { total: number; returning: number; new: number; return_rate: number | null };
    quotations: { decided: number; approved: number; approval_rate: number | null };
    satisfaction: { count: number; average: Kpi | null; positive_rate: number | null; distribution: Record<number, number> };
  };
};

/* ----------------------------------------------------------- Phiếu sửa chữa */
export type OrderGroup = "intake" | "quote" | "parts" | "repair" | "done" | "closed";
export type AdminOrder = {
  id: number; code: string; status: string; customer: string | null; phone: string | null; vehicle: string; plate: string | null;
  advisor: string | null; technician: string | null; received_at: string | null; estimated_ready_at: string | null; estimate: number;
};
export type AdminOrderDetail = AdminOrder & {
  items: Array<{ name: string | null; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; technician: string | null; price: number }>;
  quotation_items: Array<{ type: "SERVICE" | "PART"; name: string; quantity: number; amount: number; approved: boolean }>;
  timeline: Array<{ at: string | null; status: string; by: string; note: string | null }>;
};
export type OrderList = Paged<AdminOrder, { total: number; in_shop: number; groups: Record<OrderGroup, number> }> & { technicians: Array<{ id: number; name: string | null }> };

/* ------------------------------------------------------ Hoá đơn & thanh toán */
export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type AdminInvoice = {
  id: number; code: string; order_code: string | null; customer: string | null; plate: string | null; issued_at: string | null;
  subtotal: number; discount: number; total: number; paid: number; status: InvoiceStatus;
};
export type AdminPayment = { id: number; code: string; invoice: string | null; customer: string | null; method: PaymentGroup; amount: number; at: string | null; status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED" };
export type AdminInvoiceDetail = AdminInvoice & {
  lines: Array<{ type: "SERVICE" | "PART"; name: string; quantity: number; price: number; amount: number }>;
  payments: AdminPayment[];
};
export type InvoiceList = Paged<AdminInvoice, { total: number; open: number; debt: number; collected: number }>;

/* ------------------------------------------------------------------ Đánh giá */
/** Khách đánh giá GA-RA sau một lần bảo dưỡng / sửa chữa (gắn với phiếu sửa chữa). */
export type AdminReview = {
  id: number; customer: string | null; phone: string | null; vehicle: string; plate: string | null;
  order_id: number | null; order_code: string | null; visit_date: string | null; services: string[];
  rating: number; comment: string; date: string | null; reply: string | null; replied_at: string | null; hidden: boolean;
};
export type ReviewList = Paged<AdminReview, {
  average: number; recent_average: number | null; positive_rate: number | null; reply_rate: number | null;
  visible: number; hidden: number; unreplied: number; low_unreplied: number; distribution: Record<string, number>;
}>;

/* ------------------------------------------------------------------- Nhật ký */
export type AuditCategory = "CREATE" | "UPDATE" | "DELETE" | "STATUS";
export type AdminAuditLog = { id: number; at: string | null; actor: string; role: string; category: AuditCategory; action: string; label: string; target: string; detail: string; ip: string | null };

/* -------------------------------------------------------------- Khách hàng */
export type AdminCustomer = {
  id: number; name: string; phone: string | null; email: string | null; city: string | null; vehicles_count: number; visits: number;
  last_visit: string | null; total_spent: number; vip: boolean; has_account: boolean; locked: boolean;
};
export type AdminCustomerDetail = AdminCustomer & {
  address: string | null; created_at: string | null;
  vehicles: Array<{ id: number; brand: string | null; model: string | null; trim: string | null; plate: string | null; year: number | null; mileage: number | null }>;
  history: Array<{ id: number; code: string; date: string | null; title: string; vehicle: string; amount: number; status: string }>;
  last_review: { rating: number; date: string | null; comment: string } | null;
};
export type CustomerList = Paged<AdminCustomer, { total: number; with_account: number; new_this_month: number }>;

/* ----------------------------------------------------------------- Nhân sự */
export type StaffRole = "ADVISOR" | "TECHNICIAN";
export type StaffLevel = "JUNIOR" | "SENIOR" | "EXPERT";
export type AdminStaff = {
  id: number; account_id: number; name: string; email: string | null; phone: string | null; role: StaffRole;
  specialty: string | null; level: StaffLevel | null; status: "ACTIVE" | "INACTIVE"; joined_at: string | null;
};
export type StaffPayload = { name: string; email: string; phone: string; role: StaffRole; specialty?: string | null; level?: StaffLevel | null; status?: "ACTIVE" | "INACTIVE"; send_invite?: boolean };

/* --------------------------------------------------------------- Tài khoản */
export type AccountRole = "ADMIN" | "ADVISOR" | "TECHNICIAN" | "CUSTOMER";
export type AccountStatus = "ACTIVE" | "PENDING" | "LOCKED" | "INACTIVE";
export type AdminAccount = { id: number; email: string; name: string; role: AccountRole; status: AccountStatus; verified: boolean; last_login_at: string | null; created_at: string | null };

/* ------------------------------------------------------------ Phụ tùng & kho */
export type AdminPart = {
  id: number; sku: string; name: string; description: string | null; category: string | null; unit: string; cost: number; price: number;
  stock: number; min: number; level: "ok" | "low" | "out"; status: "ACTIVE" | "INACTIVE"; updated_at: string | null; compat: Array<{ id: number; name: string }>;
};
export type PartPayload = {
  sku: string; name: string; category: string | null; unit: string; cost_price: number; sell_price: number; description: string | null;
  status: "ACTIVE" | "INACTIVE"; min_quantity: number; compat_model_ids: number[];
};
export type PartList = Paged<AdminPart, { total: number; active: number; low: number; out: number; stock_value: number }> & { categories: string[]; units: string[] };
export type StockMove = { id: number; at: string | null; type: "IN" | "OUT"; sku: string | null; name: string | null; unit: string | null; quantity: number; ref: string; note: string | null; by: string };

/* -------------------------------------------------------------- Ngày nghỉ */
export type HolidayRange = { ids: number[]; from: string; to: string; reason: string | null; days: number };

type Message<T> = { message: string; data: T };
const send = <T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) =>
  fetchApi<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const adminApi = {
  dashboard: (range: string, signal?: AbortSignal) => fetchApi<{ data: DashboardData }>(`/admin/dashboard${query({ range })}`, { signal }).then(r => r.data),
  reports: (period: string, signal?: AbortSignal) => fetchApi<{ data: ReportData }>(`/admin/reports${query({ period })}`, { signal }).then(r => r.data),

  repairOrders: (params: Params, signal?: AbortSignal) => fetchApi<OrderList>(`/admin/repair-orders${query(params)}`, { signal }),
  repairOrder: (id: number, signal?: AbortSignal) => fetchApi<{ data: AdminOrderDetail }>(`/admin/repair-orders/${id}`, { signal }).then(r => r.data),

  invoices: (params: Params, signal?: AbortSignal) => fetchApi<InvoiceList>(`/admin/invoices${query(params)}`, { signal }),
  invoice: (id: number, signal?: AbortSignal) => fetchApi<{ data: AdminInvoiceDetail }>(`/admin/invoices/${id}`, { signal }).then(r => r.data),
  payments: (params: Params, signal?: AbortSignal) => fetchApi<Paged<AdminPayment>>(`/admin/payments${query(params)}`, { signal }),

  reviews: (params: Params, signal?: AbortSignal) => fetchApi<ReviewList>(`/admin/reviews${query(params)}`, { signal }),
  replyReview: (id: number, reply: string) => send<Message<AdminReview>>(`/admin/reviews/${id}/reply`, "POST", { reply }),
  hideReview: (id: number, hidden: boolean) => send<Message<AdminReview>>(`/admin/reviews/${id}`, "PATCH", { is_hidden: hidden }),

  auditLogs: (params: Params, signal?: AbortSignal) => fetchApi<Paged<AdminAuditLog>>(`/admin/audit-logs${query(params)}`, { signal }),

  customers: (params: Params, signal?: AbortSignal) => fetchApi<CustomerList>(`/admin/customers${query(params)}`, { signal }),
  customer: (id: number, signal?: AbortSignal) => fetchApi<{ data: AdminCustomerDetail }>(`/admin/customers/${id}`, { signal }).then(r => r.data),
  lockCustomer: (id: number, locked: boolean) => send<Message<AdminCustomer>>(`/admin/customers/${id}/lock`, "PATCH", { locked }),
  createCustomer: (body: { full_name: string; phone: string; email: string | null; address: string | null }) => send<{ data: { id: number } }>("/customers", "POST", body),
  updateCustomer: (id: number, body: { full_name: string; phone: string; email: string | null; address: string | null }) => send<{ data: { id: number } }>(`/customers/${id}`, "PATCH", body),
  addVehicle: (body: { customer_id: number; model_id: number; trim_id: number | null; license_plate: string; year: number | null }) => send<{ data: { id: number } }>("/vehicles", "POST", body),

  staff: (params: Params, signal?: AbortSignal) =>
    fetchApi<{ data: AdminStaff[]; summary: { total: number; active: number; advisors: number; technicians: number } }>(`/admin/staff${query(params)}`, { signal }),
  createStaff: (body: StaffPayload) => send<Message<AdminStaff>>("/admin/staff", "POST", body),
  updateStaff: (id: number, body: StaffPayload) => send<Message<AdminStaff>>(`/admin/staff/${id}`, "PATCH", body),

  accounts: (params: Params, signal?: AbortSignal) => fetchApi<Paged<AdminAccount> & { summary: Partial<Record<AccountRole, number>> }>(`/admin/accounts${query(params)}`, { signal }),
  createAccount: (body: { email: string; name: string; phone: string | null; role: Exclude<AccountRole, "CUSTOMER">; send_invite: boolean }) => send<Message<AdminAccount>>("/admin/accounts", "POST", body),
  setAccountStatus: (id: number, status: "ACTIVE" | "LOCKED") => send<Message<AdminAccount>>(`/admin/accounts/${id}/status`, "PATCH", { status }),
  resetPassword: (id: number) => send<{ message: string }>(`/admin/accounts/${id}/reset-password`, "POST"),

  parts: (params: Params, signal?: AbortSignal) => fetchApi<PartList>(`/admin/parts${query(params)}`, { signal }),
  createPart: (body: PartPayload) => send<Message<AdminPart>>("/admin/parts", "POST", body),
  updatePart: (id: number, body: PartPayload) => send<Message<AdminPart>>(`/admin/parts/${id}`, "PATCH", body),
  adjustStock: (id: number, body: { type: "IN" | "OUT"; quantity: number; note: string | null }) => send<Message<AdminPart>>(`/admin/parts/${id}/stock`, "POST", body),
  stockMoves: (params: Params, signal?: AbortSignal) => fetchApi<Paged<StockMove>>(`/admin/stock-moves${query(params)}`, { signal }),

  holidays: (signal?: AbortSignal) => fetchApi<{ data: HolidayRange[] }>("/admin/holidays", { signal }).then(r => r.data),
  saveHoliday: (body: { from: string; to: string | null; reason: string; replace_ids?: number[] }) => send<Message<HolidayRange> & { affected_appointments: number }>("/admin/holidays", "POST", body),

  deleteHoliday: (ids: number[]) => send<{ message: string }>("/admin/holidays", "DELETE", { ids }),
};

/* ------------------------------------------------------------ Định dạng ngày */
const pad = (n: number) => String(n).padStart(2, "0");
/** "08/11/2026" */
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** "08/11/2026 14:30" */
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "14:30" */
export const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const errorMessage = (error: unknown, fallback = "Có lỗi khi xử lý yêu cầu.") => (error instanceof Error ? error.message : fallback);
