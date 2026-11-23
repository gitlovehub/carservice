import { fetchApi } from "./api";
import type { AdminReview } from "./adminApi";

export type AdvisorReviewSummary = { total: number; average: number | null; unreplied: number; replied: number };
export type AdvisorReviewList = {
  data: AdminReview[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  summary: AdvisorReviewSummary;
};
type Saved = { message: string; data: AdminReview };

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") search.set(key, String(value)); });
  return search.size ? `?${search}` : "";
};

/** API Cố vấn: Backend chỉ trả và cho thao tác trên đánh giá thuộc phiếu mình phụ trách. */
export const advisorReviewApi = {
  list: (params: Record<string, string | number | undefined>, signal?: AbortSignal) =>
    fetchApi<AdvisorReviewList>(`/advisor/reviews${toQuery(params)}`, { signal }),
  reply: (id: number, reply: string) =>
    fetchApi<Saved>(`/advisor/reviews/${id}/reply`, { method: "POST", body: JSON.stringify({ reply }) }),
  editReply: (id: number, reply: string, expectedReply: string) =>
    fetchApi<Saved>(`/advisor/reviews/${id}/reply`, { method: "PUT", body: JSON.stringify({ reply, expected_reply: expectedReply }) }),
};
