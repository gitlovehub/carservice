import { apiClient } from "./api";
import type { HandoverChecklistItem, PickupAuthorization, WorkflowHandover, WorkflowQuotation } from "./workflowService";

/** Ảnh bằng chứng (P1B) và xác nhận tại quầy bằng OTP email (P1C). */

/** Vị trí ảnh trên xe (biên bản). Dịch vụ nhanh bắt buộc đủ 4 góc FRONT/REAR/LEFT/RIGHT (D-011). */
export const VEHICLE_POSITIONS: Record<string, string> = { FRONT: "Đầu xe", REAR: "Đuôi xe", LEFT: "Bên trái", RIGHT: "Bên phải", INTERIOR: "Nội thất", ODOMETER: "Đồng hồ km", OTHER: "Khác" };

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
  /** Xoá ảnh chụp nhầm — máy chủ chặn khi chứng từ đã khoá / khách đã xác nhận. */
  remove: async (mediaId: number) => { await apiClient.delete(`/media/${mediaId}`); },
  /** Ảnh nằm sau API có kiểm quyền: tải blob kèm token rồi hiển thị bằng object URL. */
  blob: async (id: number) => (await apiClient.get<Blob>(`/media/${id}`, { responseType: "blob" })).data,
};

export type HandoverInput = Omit<WorkflowHandover, "id" | "type" | "status" | "checklist_items" | "confirmations" | "submitted_at" | "confirmed_at" | "void_reason"> & {
  items: HandoverChecklistItem[];
  /** Chỉ gửi lên để đối chiếu, API không bao giờ trả lại. */
  person_id_last4?: string | null;
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
  /** Gửi link để chủ xe tự khai người được ủy quyền, không cần tài khoản. */
  sendPickupLink: async (orderId: number) => (await apiClient.post<{ sent_to: string }>(`/repair-orders/${orderId}/pickup-authorization-link`)).data,
};

/** Xác minh email chủ xe bằng mã; email đã xác minh chỉ admin được đổi. */
export const ownerEmailApi = {
  send: async (customerId: number, email: string) => (await apiClient.post<{ sent_to: string; expires_at: string }>(`/customers/${customerId}/email-verification`, { email })).data,
  verify: async (customerId: number, email: string, code: string) => (await apiClient.post<{ email: string }>(`/customers/${customerId}/email-verification/verify`, { email, code })).data,
  /** Khách có tài khoản: gửi nút xác thực tới email mới, email chỉ đổi khi khách bấm nút. */
  sendChangeLink: async (customerId: number, email: string) => (await apiClient.post<{ message: string; sent_to: string }>(`/customers/${customerId}/email-change-link`, { email })).data,
};

export type HandoverExceptionRow = {
  id: number; status: "PENDING" | "APPROVED" | "REJECTED"; reason: string; decision_note?: string | null; created_at: string; decided_at?: string | null;
  /** false: ảnh giấy tờ đã quá 90 ngày kể từ khi xử lý. */
  documents_available: boolean;
  handover?: {
    id: number; type: "CHECK_IN" | "CHECK_OUT"; status: string; person_name: string;
    repair_order?: { repair_order_code?: string | null; customer?: { full_name?: string | null; phone?: string | null } | null } | null;
    vehicle?: { license_plate?: string | null; model?: { name?: string | null; brand?: { name?: string | null } | null } | null } | null;
  } | null;
  requested_by?: { email?: string; employee?: { full_name?: string } | null } | null;
  decided_by?: { email?: string; employee?: { full_name?: string } | null } | null;
};

/** Ngoại lệ khi chủ xe mất email: cố vấn lập yêu cầu kèm ảnh giấy tờ, admin duyệt. */
export const handoverExceptionApi = {
  request: async (handoverId: number, input: { reason: string; idDocument: File; registration: File }) => {
    const body = new FormData();
    body.append("reason", input.reason);
    body.append("id_document", input.idDocument);
    body.append("registration", input.registration);
    return (await apiClient.post(`/handovers/${handoverId}/exception`, body)).data;
  },
  list: async (status: HandoverExceptionRow["status"], signal?: AbortSignal) =>
    (await apiClient.get<{ data: HandoverExceptionRow[] }>("/admin/handover-exceptions", { params: { status }, signal })).data.data,
  file: async (id: number, kind: "id-document" | "registration") => (await apiClient.get<Blob>(`/admin/handover-exceptions/${id}/files/${kind}`, { responseType: "blob" })).data,
  approve: async (id: number, note: string) => (await apiClient.post(`/admin/handover-exceptions/${id}/approve`, { note })).data,
  reject: async (id: number, note: string) => (await apiClient.post(`/admin/handover-exceptions/${id}/reject`, { note })).data,
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
