import type { HandoverChecklistItem, WorkflowHandover } from "../../services/workflowService";

/** Nhãn tiếng Việt dùng chung cho biên bản nhận / trả xe (màn hình, xem nhanh, mẫu in A4). */
export const CONDITION_TEXT: Record<HandoverChecklistItem["condition"], string> = {
  OK: "Bình thường", SCRATCH: "Trầy", DENT: "Móp", BROKEN: "Vỡ / hỏng", MISSING: "Thiếu", PRESENT: "Có",
};
export const FUEL_TEXT: Record<string, string> = { EMPTY: "Cạn", QUARTER: "1/4", HALF: "1/2", THREE_QUARTER: "3/4", FULL: "Đầy" };
export const RELATION_TEXT: Record<WorkflowHandover["person_relation"], string> = { OWNER: "Chủ xe", AUTHORIZED: "Người được ủy quyền", OTHER: "Người khác" };
export const CATEGORY_TEXT: Record<HandoverChecklistItem["category"], string> = { EXTERIOR: "Ngoại thất", INTERIOR: "Nội thất", ACCESSORY: "Vật dụng", KEY: "Chìa khóa", DOCUMENT: "Giấy tờ" };
export const STATUS_TEXT: Record<WorkflowHandover["status"], string> = { DRAFT: "Bản nháp", SUBMITTED: "Chờ khách xác nhận", CONFIRMED: "Khách đã xác nhận", VOID: "Đã hủy" };
/** Tình trạng coi là hư hỏng / thiếu (tô đỏ, đếm số hư hỏng). */
export const DAMAGE: Array<HandoverChecklistItem["condition"]> = ["SCRATCH", "DENT", "BROKEN", "MISSING"];
