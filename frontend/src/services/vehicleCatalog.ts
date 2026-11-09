import { fetchApi } from "./api";

/** Danh mục xe: Hãng → Dòng xe → Phiên bản. Dữ liệu luôn lấy từ Laravel API, không hardcode. */
export type CatalogStatus = "ACTIVE" | "INACTIVE";
export type CatalogBrand = { id: number; name: string; models_count?: number; trims_count?: number; status?: CatalogStatus; source?: string | null };
export type CatalogModel = {
  id: number; brand_id: number; name: string; body_type?: string | null; trims_count?: number; vehicles_count?: number;
  status?: CatalogStatus; source?: string | null; brand?: { id: number; name: string; status?: CatalogStatus };
};
export type CatalogTrim = {
  id: number; model_id: number; name: string; vehicles_count?: number; status?: CatalogStatus; source?: string | null;
  model?: { id: number; brand_id: number; name: string; status?: CatalogStatus; brand?: { id: number; name: string; status?: CatalogStatus } };
};

/** Lựa chọn hiện tại của bộ chọn xe (id + tên để hiển thị). */
export type VehicleSelection = {
  brandId: number | null; brandName: string;
  modelId: number | null; modelName: string;
  trimId: number | null; trimName: string;
};
export const emptySelection: VehicleSelection = { brandId: null, brandName: "", modelId: null, modelName: "", trimId: null, trimName: "" };

const withSearch = (path: string, search?: string) => (search?.trim() ? `${path}?search=${encodeURIComponent(search.trim())}` : path);

export const vehicleCatalogApi = {
  brands: (search?: string, signal?: AbortSignal) =>
    fetchApi<{ data: CatalogBrand[] }>(withSearch("/vehicle-catalog/brands", search), { signal }).then(r => r.data),
  models: (brandId: number, search?: string, signal?: AbortSignal) =>
    fetchApi<{ data: CatalogModel[] }>(withSearch(`/vehicle-catalog/brands/${brandId}/models`, search), { signal }).then(r => r.data),
  trims: (modelId: number, search?: string, signal?: AbortSignal) =>
    fetchApi<{ data: CatalogTrim[] }>(withSearch(`/vehicle-catalog/models/${modelId}/trims`, search), { signal }).then(r => r.data),
};

/** Trang danh sách phân trang của Laravel. */
export type Paginated<T> = { data: T[]; current_page: number; last_page: number; per_page: number; total: number };
export type AdminLevel = "brands" | "models" | "trims";
const adminPath: Record<AdminLevel, string> = { brands: "/admin/vehicle-brands", models: "/admin/vehicle-models", trims: "/admin/vehicle-trims" };
type AdminRow = { brands: CatalogBrand; models: CatalogModel; trims: CatalogTrim };

type LevelCount = { total: number; hidden: number };
export type CatalogSummary = { brands: LevelCount; models: LevelCount; trims: LevelCount; vehicles: number };

export const adminVehicleCatalogApi = {
  summary: (signal?: AbortSignal) => fetchApi<{ data: CatalogSummary }>("/admin/vehicle-catalog/summary", { signal }).then(r => r.data),
  list<L extends AdminLevel>(level: L, params: Record<string, string | number | undefined>, signal?: AbortSignal) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    return fetchApi<{ data: Paginated<AdminRow[L]> }>(`${adminPath[level]}?${query}`, { signal }).then(r => r.data);
  },
  create<L extends AdminLevel>(level: L, body: Record<string, unknown>) {
    return fetchApi<{ data: AdminRow[L]; message: string }>(adminPath[level], { method: "POST", body: JSON.stringify(body) });
  },
  update<L extends AdminLevel>(level: L, id: number, body: Record<string, unknown>) {
    return fetchApi<{ data: AdminRow[L]; message: string }>(`${adminPath[level]}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  remove(level: AdminLevel, id: number) {
    return fetchApi<{ message: string }>(`${adminPath[level]}/${id}`, { method: "DELETE" });
  },
};

/** Lựa chọn ban đầu của bộ chọn từ một xe đã lưu (để sửa xe). */
export function selectionFromVehicle(vehicle: {
  model_id?: number; trim_id?: number | null;
  model?: { id?: number; name?: string; brand?: { id?: number; name?: string } | null } | null;
  trim?: { id: number; name: string } | null;
}): VehicleSelection {
  return {
    brandId: vehicle.model?.brand?.id ?? null, brandName: vehicle.model?.brand?.name ?? "",
    modelId: vehicle.model?.id ?? vehicle.model_id ?? null, modelName: vehicle.model?.name ?? "",
    trimId: vehicle.trim?.id ?? vehicle.trim_id ?? null, trimName: vehicle.trim?.name ?? "",
  };
}

/** Bỏ dấu + chữ thường để gõ "cho" vẫn tìm thấy "chỗ", "toyota" thấy "Toyota". */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

/** Tên đầy đủ của xe đã lưu: "Toyota Vios 1.5G-CVT". */
export function vehicleDisplayName(vehicle: {
  variant?: string | null;
  model?: { name?: string | null; brand?: { name?: string | null } | null } | null;
  trim?: { name?: string | null } | null;
}): string {
  const trim = vehicle.trim?.name || vehicle.variant || "";
  return [vehicle.model?.brand?.name, vehicle.model?.name, trim].filter(Boolean).join(" ");
}
