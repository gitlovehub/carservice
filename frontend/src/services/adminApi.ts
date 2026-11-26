import { apiClient, fetchApi } from "./api";
import { userErrorMessage } from "./apiError";

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
export type PaymentGroup = "CASH" | "BANK_TRANSFER" | "CARD" | "EWALLET" | "VNPAY";
export type ReportData = {
  period: string;
  label: string;
  periods: Array<{ value: string; label: string }>;
  revenue: { total: Kpi; service: Kpi; parts: Kpi };
  monthly: Array<{ month: string; service: number; parts: number; orders: number }>;
  /** Trục biểu đồ theo đúng khoảng đang lọc. */
  granularity: "day" | "week" | "month" | "year";
  series: Array<{ key: string; label: string; title: string; service: number; parts: number; orders: number }>;
  /** Doanh thu kỳ liền trước, cùng cách chia mốc, để so sánh xu hướng. */
  previous_series: Array<{ label: string; title: string; revenue: number }>;
  /** Phụ tùng và các danh mục dịch vụ lớn nhất. */
  revenue_groups: Array<{ name: string; revenue: number }>;
  top_services: Array<{ name: string; count: number; revenue: number }>;
  top_parts: Array<{ name: string; sku: string | null; quantity: number; revenue: number }>;
  collection: {
    invoices: Kpi; average_invoice: Kpi; billed: number; collected: number; outstanding: number;
    unpaid_invoices: number; collection_rate: number | null;
  };
  operations: {
    order_status: Record<"completed" | "in_progress" | "waiting_parts" | "waiting_approval" | "inspecting" | "closed", number>;
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
  items: Array<{ name: string | null; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; service_status?: string | null; technician: string | null; price: number }>;
  quotation_items: Array<{ type: "SERVICE" | "PART"; service_status?: string | null; name: string; quantity: number; amount: number; approved: boolean }>;
  timeline: Array<{ at: string | null; status: string; by: string; note: string | null }>;
  /** ADV-01: phụ tùng cố vấn báo thiếu cho phiếu. */
  part_requests: Array<{ id: number; part: string | null; unit: string | null; quantity: number; status: PartRequestStatus; eta_date: string | null; note: string | null }>;
};
export type OrderList = Paged<AdminOrder, { total: number; in_shop: number; groups: Record<OrderGroup, number> }> & { technicians: Array<{ id: number; name: string | null }> };

/* ------------------------------------------------------ Hoá đơn & thanh toán */
export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type AdminInvoice = {
  id: number; code: string; order_code: string | null; customer: string | null; plate: string | null; issued_at: string | null;
  subtotal: number; discount: number; total: number; paid: number; status: InvoiceStatus;
};
export type AdminPayment = {
  id: number; code: string; invoice: string | null; invoice_id: number | null; customer: string | null; method: PaymentGroup; amount: number; at: string | null;
  status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED"; order_code: string | null; plate: string | null; created_at: string | null; paid_at: string | null;
  gateway_ref: string | null; bank_code: string | null; collector: string | null;
};
export type AdminInvoiceDetail = AdminInvoice & {
  lines: Array<{ type: "SERVICE" | "PART"; name: string; quantity: number; price: number; amount: number }>;
  payments: AdminPayment[];
};
export type InvoiceList = Paged<AdminInvoice, { total: number; open: number; debt: number; collected: number }>;

/* ---------------------------------------------------------- Khung giờ đặt lịch */
export type BookingSlots = { morning: string[]; afternoon: string[] };
export type ReschedulePolicy = { limit: number; cutoff_hours: number };

/* ------------------------------------------------------------------ Đánh giá */
/** Khách đánh giá GA-RA sau một lần bảo dưỡng / sửa chữa (gắn với phiếu sửa chữa). */
export type AdminReview = {
  id: number; customer: string | null; phone: string | null; vehicle: string; plate: string | null;
  order_id: number | null; order_code: string | null; visit_date: string | null; services: string[];
  rating: number; comment: string; date: string | null; reply: string | null; replied_at: string | null; reply_edited_at: string | null; hidden: boolean;
  /** Chỉ có ở API Cố vấn: phản hồi này do chính cố vấn đang đăng nhập tạo. */
  can_edit_reply?: boolean;
};
/** Một phiên bản phản hồi. `edited_by` null: phản hồi có từ trước khi hệ thống ghi lịch sử. */
export type ReviewReplyVersion = { version: number; content: string; old_content: string | null; edited_by: string | null; edited_at: string | null };
export type ReviewList = Paged<AdminReview, {
  average: number; recent_average: number | null; positive_rate: number | null; reply_rate: number | null;
  visible: number; hidden: number; unreplied: number; low_unreplied: number; distribution: Record<string, number>;
}>;

/* ------------------------------------------------------------------- Nhật ký */
export type AuditCategory = "CREATE" | "UPDATE" | "DELETE" | "STATUS";
export type AdminAuditLog = { id: number; at: string | null; actor: string; role: string; category: AuditCategory; action: string; label: string; target: string; detail: string; ip: string | null };

/* -------------------------------------------------------------- Khách hàng */
export type AdminCustomer = {
  id: number; name: string; phone: string | null; email: string | null; email_verified?: boolean; city: string | null; vehicles_count: number; visits: number;
  last_visit: string | null; total_spent: number; has_account: boolean; locked: boolean;
};
export type AdminCustomerDetail = AdminCustomer & {
  address: string | null; created_at: string | null;
  vehicles: Array<{ id: number; brand: string | null; model: string | null; trim: string | null; plate: string | null; year: number | null; mileage: number | null; avatar_url: string | null }>;
  history: Array<{ id: number; code: string; date: string | null; title: string; vehicle: string; amount: number; status: string }>;
  last_review: { rating: number; date: string | null; comment: string } | null;
};
export type CustomerList = Paged<AdminCustomer, { total: number; with_account: number; new_this_month: number; returning: number }>;

/* ----------------------------------------------------------------- Nhân sự */
export type StaffRole = "ADVISOR" | "TECHNICIAN";
export type StaffLevel = "JUNIOR" | "SENIOR" | "EXPERT";
export type AdminStaff = {
  id: number; account_id: number; name: string; email: string | null; phone: string | null; role: StaffRole;
  specialty: string | null; level: StaffLevel | null; status: "ACTIVE" | "INACTIVE"; joined_at: string | null;
};