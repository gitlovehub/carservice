import { fetchApi } from "./api";

export type CatalogItem = {
  key: string;
  type: "service" | "package";
  id: number;
  name: string;
  summary: string;
  /** Chỉ có ở gói: danh sách dịch vụ rút gọn. */
  includes?: string;
  price: number | null;
  minutes: number | null;
  recommended: boolean;
  included_service_ids?: number[];
};

export type CatalogGroup = {
  key: string;
  name: string;
  items: CatalogItem[];
};

export type CatalogQuery = {
  /** Dòng xe chọn từ danh mục; có thì backend dùng luôn, không cần dò theo tên. */
  modelId?: number | null;
  brand?: string;
  model?: string;
  mileage?: number | null;
};

export async function getBookingCatalog(query: CatalogQuery): Promise<CatalogGroup[]> {
  const params = new URLSearchParams();
  if (query.modelId) params.set("model_id", String(query.modelId));
  if (query.brand) params.set("brand", query.brand);
  if (query.model) params.set("model", query.model);
  if (query.mileage) params.set("mileage", String(query.mileage));

  const response = await fetchApi<{ groups?: CatalogGroup[] }>(`/booking-catalog?${params.toString()}`);
  return Array.isArray(response?.groups) ? response.groups : [];
}

export function indexCatalogItems(groups: CatalogGroup[]): Map<string, CatalogItem> {
  const items = new Map<string, CatalogItem>();
  groups.forEach((group) => group.items.forEach((item) => items.set(item.key, item)));
  return items;
}

/** Dịch vụ đã nằm trong gói đang chọn thì không chọn riêng được nữa. */
export function servicesCoveredBySelection(keys: string[], itemsByKey: Map<string, CatalogItem>): Set<number> {
  const covered = new Set<number>();
  keys.forEach((key) => itemsByKey.get(key)?.included_service_ids?.forEach((id) => covered.add(id)));
  return covered;
}

export function formatCatalogPrice(price: number | null): string {
  return price === null ? "Báo giá tại garage" : `Từ ${Math.round(price).toLocaleString("vi-VN")} đ`;
}

export function formatMinutes(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `~${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `~${hours} giờ ${rest} phút` : `~${hours} giờ`;
}
