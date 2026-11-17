import { fetchApi } from "./api";
import { query, type AdminPart, type AdminPartRequest, type Paged, type Params, type StockMove } from "./adminApi";

/** Trang "Phụ tùng" của cố vấn — chỉ đọc (D-020). Báo thiếu dùng `workflowApi.reportPartShortage`. */

export type AdvisorPart = Omit<AdminPart, "cost">;
export type AdvisorPartList = Paged<AdvisorPart, { total: number; ok: number; low: number; out: number; requests_open: number }> & { categories: string[] };
export type PartRequestPage = { data: AdminPartRequest[]; current_page: number; last_page: number; total: number };

export const advisorPartsApi = {
  parts: (params: Params, signal?: AbortSignal) => fetchApi<AdvisorPartList>(`/advisor/parts${query(params)}`, { signal }),
  moves: (params: Params, signal?: AbortSignal) => fetchApi<Paged<StockMove>>(`/advisor/stock-moves${query(params)}`, { signal }),
  requests: (params: Params, signal?: AbortSignal) => fetchApi<PartRequestPage>(`/part-requests${query(params)}`, { signal }),
};
