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