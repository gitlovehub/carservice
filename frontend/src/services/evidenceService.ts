import { apiClient } from "./api";
import type { HandoverChecklistItem, PickupAuthorization, WorkflowHandover, WorkflowQuotation } from "./workflowService";

/** Ảnh bằng chứng (P1B) và xác nhận tại quầy bằng OTP email (P1C). */

export type MediaAttachableType = "repair_order" | "quotation" | "inspection" | "handover";
export type MediaItem = {
  id: number; attachable_type: MediaAttachableType; attachable_id: number; mime: string; size_bytes: number;
  sha256: string; caption?: string | null; position_code?: string | null; taken_at?: string | null; created_at?: string | null; url: string;
};
export type QuotationDecision = { item_id: number; is_approved: boolean };
export type OtpSent = { message: string; sent_to: string; expires_at: string };

export const mediaApi = {
  list: async (type: MediaAttachableType, id: number) =>
    (await apiClient.get<{ data: MediaItem[] }>("/media", { params: { attachable_type: type, attachable_id: id } })).data.data,
  upload: async (type: MediaAttachableType, id: number, file: Blob, fileName: string, meta: { caption?: string; position_code?: string } = {}) => {
    const form = new FormData();
    form.append("file", file, fileName);
    form.append("attachable_type", type);
    form.append("attachable_id", String(id));
    if (meta.caption) form.append("caption", meta.caption);
    if (meta.position_code) form.append("position_code", meta.position_code);
    return (await apiClient.post<MediaItem>("/media", form, { timeout: 60000 })).data;
  },
  /** Ảnh nằm sau API có kiểm quyền: tải blob kèm token rồi hiển thị bằng object URL. */
  blob: async (id: number) => (await apiClient.get<Blob>(`/media/${id}`, { responseType: "blob" })).data,
};

export type HandoverInput = Omit<WorkflowHandover, "id" | "type" | "status" | "checklist_items" | "confirmations" | "submitted_at" | "confirmed_at" | "void_reason"> & {
  items: HandoverChecklistItem[];
};

/** Biên bản giao nhận xe (P2). Khách xác nhận trong tài khoản hoặc OTP email chủ xe tại quầy. */
export const handoverApi = {
  create: async (orderId: number, input: HandoverInput, type: "CHECK_IN" | "CHECK_OUT" = "CHECK_IN") =>
    (await apiClient.post<WorkflowHandover>(`/repair-orders/${orderId}/handovers`, { type, ...input })).data,
  update: async (id: number, input: Partial<HandoverInput>) => (await apiClient.patch<WorkflowHandover>(`/handovers/${id}`, input)).data,
  submit: async (id: number) => (await apiClient.post<WorkflowHandover>(`/handovers/${id}/submit`)).data,
  void: async (id: number, reason: string) => (await apiClient.post<WorkflowHandover>(`/handovers/${id}/void`, { reason })).data,
  requestOtp: async (id: number) => (await apiClient.post<OtpSent>(`/handovers/${id}/otp`)).data,
  verifyOtp: async (id: number, code: string) => (await apiClient.post<WorkflowHandover>(`/handovers/${id}/verify-otp`, { code })).data,
  /** Khách tự xác nhận (ACCOUNT). */
  confirmAsCustomer: async (id: number, comment?: string) => (await apiClient.post<WorkflowHandover>(`/me/handovers/${id}/confirm`, { comment })).data,
};

/** Ủy quyền nhận xe (P4, N9) — chỉ chủ xe, trong tài khoản của mình. */
export const pickupAuthorizationApi = {
  list: async (orderId: number) => (await apiClient.get<{ data: PickupAuthorization[] }>(`/me/repair-orders/${orderId}/pickup-authorizations`)).data.data,
  create: async (orderId: number, input: { full_name: string; phone: string; id_last4: string; valid_until?: string | null }) =>
    (await apiClient.post<PickupAuthorization>(`/me/repair-orders/${orderId}/pickup-authorizations`, input)).data,
  revoke: async (id: number) => (await apiClient.delete<PickupAuthorization>(`/me/pickup-authorizations/${id}`)).data,
};

export const counterApprovalApi = {
  requestOtp: async (quotationId: number, responses: QuotationDecision[]) =>
    (await apiClient.post<OtpSent>(`/quotations/${quotationId}/otp`, { responses })).data,
  verifyOtp: async (quotationId: number, code: string, responses: QuotationDecision[]) =>
    (await apiClient.post<WorkflowQuotation>(`/quotations/${quotationId}/verify-otp`, { code, responses })).data,
};

/** Thu nhỏ ảnh phía trình duyệt (cạnh dài ≤ 1600 px, JPEG) để tải nhanh và tiết kiệm dung lượng. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 2 * 1024 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob ?? file;
}
