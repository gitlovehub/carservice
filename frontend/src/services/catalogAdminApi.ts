/**
 * API cho 3 trang Admin: Lịch hẹn, Dịch vụ, Gói bảo dưỡng.
 * Lịch hẹn dùng chung API của Cố vấn (/advisor/appointments — Admin có quyền), các trang còn lại dùng /admin/*.
 */
import { fetchApi } from "./api";
import { query, type Params } from "./adminApi";

type Message<T> = { message: string; data: T };
const send = <T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) =>
  fetchApi<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

/* ---------------- Lịch hẹn ---------------- */
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "NO_SHOW";
export type RequestType = "MAINTENANCE" | "REPAIR" | "DIAGNOSIS" | "REPLACEMENT";

type Priced = { pivot?: { estimated_price?: string | number | null } | null };
export type AppointmentRow = {
  id: number;
  appointment_code: string;
  appointment_date: string;
  appointment_time: string;
  end_time?: string;
  estimated_minutes?: number;
  estimated_total?: number;
  request_type: RequestType;
  status: AppointmentStatus;
  symptom_description: string | null;
  note: string | null;
  cancel_reason: string | null;
  customer: { id: number; full_name: string; phone: string | null; email: string | null } | null;
  vehicle: {
    id: number; license_plate: string | null; year: number | null; mileage: number | null; variant: string | null;
    model: { id: number; name: string; brand: { id: number; name: string } | null } | null;
  } | null;
  services: Array<{ id: number; name: string; base_price: string; estimated_minutes: number | null } & Priced>;
  packages: Array<{ id: number; name: string; mileage_milestone: number | null } & Priced>;
  handled_by?: { employee?: { full_name?: string } | null; email?: string } | null;
};
export type AppointmentList = {
  data: AppointmentRow[];
  counts: Partial<Record<AppointmentStatus | "ALL", number>>;
  pagination: { current_page: number; per_page: number; total: number; last_page: number };
};

export const REQUEST_TYPES: Record<RequestType, { label: string; short: string; icon: "droplet" | "tools" | "search" | "wrench" }> = {
  MAINTENANCE: { label: "Bảo dưỡng định kỳ", short: "Bảo dưỡng", icon: "droplet" },
  REPAIR: { label: "Sửa chữa", short: "Sửa chữa", icon: "tools" },
  DIAGNOSIS: { label: "Kiểm tra", short: "Kiểm tra", icon: "search" },
  REPLACEMENT: { label: "Thay thế phụ tùng", short: "Thay phụ tùng", icon: "wrench" },
};

/* ---------------- Dịch vụ ---------------- */
export type ServiceStatus = "ACTIVE" | "INACTIVE";
export type ServiceLevel = "QUICK" | "STANDARD" | "MAJOR";
export type ServiceCategory = { id: number; name: string; icon: string; sort_order: number; services_count: number; active_services_count: number };
export type AdminService = {
  id: number; name: string; category: string | null; category_id: number | null; description: string | null;
  base_price: string; estimated_minutes: number | null; status: ServiceStatus; is_visible: boolean; is_popular: boolean;
  sort_order: number; service_level?: ServiceLevel; active_packages_count?: number;
  service_category?: { id: number; name: string; icon: string } | null;
};
export type ServicePayload = {
  name: string; category_id: number | null; description: string | null; base_price: number; estimated_minutes: number | null;
  status: ServiceStatus; is_visible: boolean; service_level: ServiceLevel;
};
type LaravelPage<T> = { data: T[]; current_page: number; last_page: number; per_page: number; total: number };

/* ---------------- Gói bảo dưỡng ---------------- */
export type PackageStatus = "ACTIVE" | "INACTIVE";
export type AdminPackage = {
  id: number; vehicle_model_id: number | null; name: string; mileage_milestone: number | null; month_milestone: number | null;
  description: string | null; status: PackageStatus; price: number;
  vehicle_model: { id: number; name: string; brand_id: number; brand: { id: number; name: string } | null } | null;
  services: Array<{ id: number; name: string; base_price: string; estimated_minutes: number | null; pivot?: { quantity: number } }>;
  parts: Array<{ id: number; sku: string; name: string; unit?: string | null; sell_price: string; pivot?: { quantity: number } }>;
};
export type PackagePayload = {
  name: string; vehicle_model_id: number | null; mileage_milestone: number | null; month_milestone: number | null;
  description: string | null; status: PackageStatus;
  services: Array<{ service_id: number; quantity: number }>; parts: Array<{ part_id: number; quantity: number }>;
};
export type CatalogBrand = { id: number; name: string; models_count?: number };
export type CatalogModel = { id: number; brand_id: number; name: string };

export const catalogAdminApi = {
  /* Lịch hẹn */
  appointments: (params: Params, signal?: AbortSignal) => fetchApi<AppointmentList>(`/advisor/appointments${query(params)}`, { signal }),
  appointment: (id: number, signal?: AbortSignal) => fetchApi<{ data: AppointmentRow }>(`/advisor/appointments/${id}`, { signal }).then(r => r.data),
  confirmAppointment: (id: number) => send<Message<AppointmentRow>>(`/advisor/appointments/${id}/confirm`, "POST"),
  checkInAppointment: (id: number) => send<Message<AppointmentRow>>(`/advisor/appointments/${id}/check-in`, "POST"),
  cancelAppointment: (id: number, reason: string) => send<Message<AppointmentRow>>(`/advisor/appointments/${id}/cancel`, "POST", { cancel_reason: reason }),
  noShowAppointment: (id: number) => send<Message<AppointmentRow>>(`/advisor/appointments/${id}/no-show`, "POST"),
  createAppointment: (body: {
    customer_id: number; vehicle_id: number; appointment_date: string; appointment_time: string; request_type: RequestType;
    symptom_description: string | null; service_ids: number[]; package_ids: number[];
  }) => send<Message<AppointmentRow>>("/advisor/appointments", "POST", body),
  searchCustomers: (search: string, signal?: AbortSignal) =>
    fetchApi<{ data: LaravelPage<{ id: number; full_name: string; phone: string | null; email: string | null }> }>(`/customers${query({ search, per_page: 8 })}`, { signal }).then(r => r.data.data),
  customerVehicles: (customerId: number, signal?: AbortSignal) =>
    fetchApi<{ data: Array<{ id: number; license_plate: string | null; model?: { name: string; brand?: { name: string } | null } | null }> } | Array<{ id: number; license_plate: string | null; model?: { name: string; brand?: { name: string } | null } | null }>>(`/customers/${customerId}/vehicles`, { signal })
      .then(r => (Array.isArray(r) ? r : r.data ?? [])),

  /* Dịch vụ */
  services: (params: Params, signal?: AbortSignal) => fetchApi<{ data: LaravelPage<AdminService> }>(`/admin/services${query(params)}`, { signal }).then(r => r.data),
  service: (id: number, signal?: AbortSignal) => fetchApi<{ data: AdminService }>(`/admin/services/${id}`, { signal }).then(r => r.data),
  createService: (body: ServicePayload) => send<Message<AdminService>>("/admin/services", "POST", body),
  updateService: (id: number, body: Partial<ServicePayload>) => send<Message<AdminService>>(`/admin/services/${id}`, "PATCH", body),  categories: (signal?: AbortSignal) =>
    fetchApi<{ data: ServiceCategory[]; meta: { total: number; uncategorized: number; active?: number; visible?: number; icons: string[] } }>("/admin/service-categories", { signal }),
  createCategory: (body: { name: string; icon: string }) => send<Message<ServiceCategory>>("/admin/service-categories", "POST", body),
  updateCategory: (id: number, body: { name: string; icon: string }) => send<Message<ServiceCategory>>(`/admin/service-categories/${id}`, "PATCH", body),
  deleteCategory: (id: number) => send<{ message: string }>(`/admin/service-categories/${id}`, "DELETE"),

  /* Gói bảo dưỡng */
  packages: (params: Params, signal?: AbortSignal) => fetchApi<{ data: LaravelPage<AdminPackage> }>(`/admin/maintenance-packages${query(params)}`, { signal }).then(r => r.data),
  package: (id: number, signal?: AbortSignal) => fetchApi<{ data: AdminPackage }>(`/admin/maintenance-packages/${id}`, { signal }).then(r => r.data),
  createPackage: (body: PackagePayload) => send<Message<AdminPackage>>("/admin/maintenance-packages", "POST", body),
  updatePackage: (id: number, body: Partial<PackagePayload>) => send<Message<AdminPackage>>(`/admin/maintenance-packages/${id}`, "PATCH", body),
  brands: (signal?: AbortSignal) => fetchApi<{ data: CatalogBrand[] }>("/vehicle-catalog/brands", { signal }).then(r => r.data),
  models: (brandId: number, signal?: AbortSignal) => fetchApi<{ data: CatalogModel[] }>(`/vehicle-catalog/brands/${brandId}/models`, { signal }).then(r => r.data),
};

/* ---------------- Định dạng ---------------- */
export const money = (value: number | string | null | undefined) => `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value) || 0))} ₫`;
export const hhmm = (time: string | null | undefined) => (time ?? "").slice(0, 5);
export const dmy = (date: string | null | undefined) => {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
export const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function weekRange(anchor: Date): { from: string; to: string; days: Date[] } {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Thứ hai
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  return { from: isoDate(days[0]), to: isoDate(days[6]), days };
}

/** Tông màu pill danh mục theo icon (ổn định giữa các trang). */
export const CATEGORY_TONE: Record<string, "info" | "warning" | "violet" | "success" | "brand" | "neutral" | "danger"> = {
  droplet: "info", engine: "warning", disc: "violet", snowflake: "info", tire: "violet", bolt: "success",
  battery: "success", search: "neutral", sparkle: "brand", wrench: "neutral", tools: "neutral", gauge: "info",
};
