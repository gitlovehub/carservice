import type { HandoverChecklistItem, WorkflowHandover } from "../../services/workflowService";

/** Nhãn tiếng Việt dùng chung cho biên bản nhận / trả xe (màn hình, xem nhanh, mẫu in A4). */
export const CONDITION_TEXT: Record<HandoverChecklistItem["condition"], string> = {
  OK: "Bình thường", SCRATCH: "Xước", DENT: "Móp", BROKEN: "Vỡ / hỏng", MISSING: "Thiếu", PRESENT: "Có",
};
export const FUEL_TEXT: Record<string, string> = { EMPTY: "Cạn", QUARTER: "1/4", HALF: "1/2", THREE_QUARTER: "3/4", FULL: "Đầy" };
export const RELATION_TEXT: Record<WorkflowHandover["person_relation"], string> = { OWNER: "Chủ xe", AUTHORIZED: "Người được ủy quyền", OTHER: "Người khác" };
export const CATEGORY_TEXT: Record<HandoverChecklistItem["category"], string> = { EXTERIOR: "Ngoại thất", INTERIOR: "Nội thất", ACCESSORY: "Vật dụng", KEY: "Chìa khóa", DOCUMENT: "Giấy tờ" };
export const STATUS_TEXT: Record<WorkflowHandover["status"], string> = { DRAFT: "Bản nháp", SUBMITTED: "Chờ khách xác nhận", CONFIRMED: "Khách đã xác nhận", VOID: "Đã hủy" };
/** Tình trạng coi là hư hỏng / thiếu (tô đỏ, đếm số hư hỏng). */
export const DAMAGE: Array<HandoverChecklistItem["condition"]> = ["SCRATCH", "DENT", "BROKEN", "MISSING"];

/** Cách chủ xe đã xác nhận biên bản. */
export const confirmationText = (method?: string) => method === "EMAIL_OTP" ? "bằng mã gửi email chủ xe"
  : method === "ADMIN_EXCEPTION" ? "tại gara với giấy tờ, được admin duyệt ngoại lệ" : "trong tài khoản";

export type CheckInRef = NonNullable<WorkflowHandover["compared_handover"]>;

/** Biên bản nhận xe dùng để đối chiếu với một biên bản trả xe. */
export function comparedCheckIn(handover: WorkflowHandover, handovers?: WorkflowHandover[]): CheckInRef | null {
  if (handover.type !== "CHECK_OUT") return null;
  return handover.compared_handover ?? handovers?.find(h => h.id === handover.compared_handover_id) ?? null;
}

const labelKey = (label: string) => label.trim().toLowerCase();

/** Mục tương ứng lúc nhận xe — khớp theo tên như backend. */
export const findBefore = (checkIn: CheckInRef | null | undefined, item: HandoverChecklistItem) =>
  checkIn?.checklist_items?.find(i => labelKey(i.label) === labelKey(item.label));

export const isChanged = (before: HandoverChecklistItem | undefined, item: HandoverChecklistItem) =>
  !before || before.condition !== item.condition || (before.quantity ?? 0) !== (item.quantity ?? 0);
