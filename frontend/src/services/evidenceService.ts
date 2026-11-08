import { apiClient } from "./api";
import type { WorkflowQuotation } from "./workflowService";

/** Ảnh bằng chứng (P1B) và xác nhận tại quầy bằng OTP email (P1C). */

export type MediaAttachableType = "repair_order" | "quotation" | "inspection";
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
