import type { IconName } from "../../components/ui/Icon";
import { latestQuotation, openPartRequests, supplementQuotations, type WorkflowOrder } from "../../services/workflowService";

/**
 * Bước của phiếu sửa chữa + "việc tiếp theo" của cố vấn — dùng chung cho trang chi tiết phiếu
 * và khung xem nhanh ở danh sách phiếu.
 */

export type StepKey = "reception" | "inspection" | "quotation" | "repair" | "delivery";
export const STEPS: Array<{ key: StepKey; label: string; icon: IconName; statuses: string[] }> = [
  { key: "reception", label: "Nhận xe", icon: "car", statuses: ["RECEIVED"] },
  { key: "inspection", label: "Chẩn đoán", icon: "search", statuses: ["INSPECTING"] },
  { key: "quotation", label: "Báo giá", icon: "receipt", statuses: ["QUOTING", "WAITING_APPROVAL"] },
  { key: "repair", label: "Sửa chữa", icon: "wrench", statuses: ["IN_PROGRESS", "WAITING_FOR_PARTS"] },
  { key: "delivery", label: "Bàn giao", icon: "cash", statuses: ["COMPLETED", "HANDED_OVER"] },
];

export const OPEN_STATUSES = ["RECEIVED", "INSPECTING", "QUOTING", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_FOR_PARTS"];

export const CLOSE_REASONS: Array<{ value: string; label: string }> = [
  { value: "CUSTOMER_DECLINED_QUOTE", label: "Khách từ chối báo giá" },
  { value: "CUSTOMER_REQUEST", label: "Khách không muốn sửa nữa" },
  { value: "PART_UNAVAILABLE", label: "Không có phụ tùng thay thế" },
  { value: "OTHER", label: "Lý do khác" },
];

/** Bước đang diễn ra. Phiếu đã đóng: bước xa nhất đã có dữ liệu. */
export function currentStepIndex(order: WorkflowOrder): number {
  const index = STEPS.findIndex(step => step.statuses.includes(order.status));
  if (index >= 0) return index;
  if (order.invoice) return 4;
  if (order.work_items?.length) return 3;
  if (order.quotations?.length) return 2;
  if (order.inspections?.length) return 1;
  return 0;
}

export const hasHandover = (order: WorkflowOrder, type: "CHECK_IN" | "CHECK_OUT", status = "CONFIRMED") =>
  (order.handovers ?? []).some(h => h.type === type && h.status === status);

export type NextAction = { tone: "action" | "wait" | "done" | "closed"; text: string; step: number };

/** Việc cố vấn cần làm tiếp theo — hiện ở đầu nội dung để không phải đọc cả trang. */
export function nextAction(order: WorkflowOrder): NextAction {
  const quotation = latestQuotation(order);
  const pendingSupplement = supplementQuotations(order).find(q => ["DRAFT", "SENT"].includes(q.status));
  switch (order.status) {
    case "RECEIVED": {
      if (order.requires_check_in && !hasHandover(order, "CHECK_IN")) {
        const submitted = hasHandover(order, "CHECK_IN", "SUBMITTED");
        return submitted
          ? { tone: "wait", text: "Chờ chủ xe xác nhận biên bản nhận xe (trong tài khoản hoặc mã email tại quầy).", step: 0 }
          : { tone: "action", text: "Lập biên bản nhận xe (tình trạng, ảnh, chìa khóa, giấy tờ) rồi gửi khách xác nhận.", step: 0 };
      }
      return { tone: "action", text: "Ghi kết quả kiểm tra xe — hoặc gửi báo giá dịch vụ nhanh nếu khách chỉ làm dịch vụ đơn giản.", step: 1 };
    }
    case "INSPECTING": return { tone: "action", text: "Ghi đủ hạng mục kiểm tra, đề xuất cần làm rồi bấm Hoàn tất chẩn đoán.", step: 1 };
    case "QUOTING": return { tone: "action", text: quotation?.status === "DRAFT" ? "Kiểm tra báo giá nháp rồi gửi cho khách." : "Lập báo giá từ kết quả chẩn đoán.", step: 2 };
    case "WAITING_APPROVAL":
      if (quotation?.status === "SENT") return { tone: "wait", text: "Chờ khách duyệt từng hạng mục báo giá (trong tài khoản hoặc mã email tại quầy).", step: 2 };
      if (quotation?.status === "REJECTED") return { tone: "action", text: "Khách từ chối toàn bộ báo giá: lập báo giá mới, hoặc đóng phiếu và trả xe.", step: 2 };
      if (quotation?.status === "DRAFT") return { tone: "action", text: "Kiểm tra báo giá nháp rồi gửi cho khách.", step: 2 };
      return { tone: "action", text: "Khách đã duyệt báo giá. Bắt đầu sửa chữa các hạng mục được đồng ý.", step: 2 };
    case "IN_PROGRESS":
      if (pendingSupplement?.status === "SENT") return { tone: "wait", text: "Chờ khách duyệt báo giá phát sinh. Chưa làm hạng mục phát sinh khi khách chưa đồng ý.", step: 3 };
      return { tone: "action", text: "Cập nhật từng công việc. Phát hiện hư hỏng mới → lập báo giá phát sinh. Xong hết → Hoàn thành sửa chữa.", step: 3 };
    case "WAITING_FOR_PARTS": {
      const waiting = openPartRequests(order);
      const arrived = (order.part_requests ?? []).some(r => r.status === "RECEIVED");
      if (!waiting.length) return arrived
        ? { tone: "action", text: "Phụ tùng đã về đủ. Bấm Tiếp tục sửa chữa.", step: 3 }
        : { tone: "action", text: "Chưa ghi phụ tùng đang thiếu: bấm Báo thiếu phụ tùng để kho đặt hàng, hoặc Tiếp tục sửa chữa.", step: 3 };
      const notOrdered = waiting.filter(r => r.status === "REQUESTED").length;
      return { tone: "wait", text: `Đang chờ ${waiting.length} phụ tùng${notOrdered ? ` (${notOrdered} chưa được kho đặt hàng)` : ""}. Kho nhập hàng xong sẽ báo khách.`, step: 3 };
    }
    case "COMPLETED": {
      if (!order.quality_checked_at) return { tone: "action", text: "Kiểm tra sau sửa chữa (động cơ, phanh, lái, đèn điện, ngoại thất, đối chiếu hạng mục) — bắt buộc trước khi bàn giao.", step: 4 };
      if (!order.invoice) return { tone: "action", text: "Lập hóa đơn từ các hạng mục khách đã duyệt.", step: 4 };
      if (order.invoice.status !== "PAID") return { tone: "action", text: "Thu tiền khách (tiền mặt tại quầy hoặc khách tự thanh toán VNPay).", step: 4 };
      if (order.requires_check_in && !hasHandover(order, "CHECK_OUT")) return { tone: "action", text: "Lập biên bản trả xe, đối chiếu với lúc nhận và để chủ xe xác nhận.", step: 4 };
      return { tone: "action", text: "Đã thu đủ tiền. Bàn giao xe cho khách.", step: 4 };
    }
    case "HANDED_OVER": return { tone: "done", text: "Đã bàn giao xe. Phiếu hoàn tất.", step: 4 };
    case "CLOSED": {
      const reason = CLOSE_REASONS.find(r => r.value === order.close_reason)?.label;
      return { tone: "closed", text: `Phiếu đã đóng${reason ? ` · ${reason}` : ""}. Không còn thao tác tiếp.`, step: currentStepIndex(order) };
    }
    default: return { tone: "action", text: "", step: currentStepIndex(order) };
  }
}

/** Hạng mục kiểm tra sau sửa chữa — khớp `RepairOrder::QUALITY_CHECK_ITEMS` (backend). */
export const QUALITY_ITEMS: Array<{ code: string; label: string }> = [
  { code: "ENGINE", label: "Động cơ, vận hành ổn định" },
  { code: "BRAKES", label: "Hệ thống phanh" },
  { code: "STEERING", label: "Hệ thống lái" },
  { code: "ELECTRICAL", label: "Hệ thống đèn, điện" },
  { code: "EXTERIOR_CLEAN", label: "Ngoại thất & vệ sinh xe" },
  { code: "APPROVED_ITEMS", label: "Đối chiếu hạng mục đã phê duyệt" },
];

/** Tình trạng bàn giao của phiếu đã sửa xong — cùng điều kiện với backend `handOver`. */
export function deliveryState(order: WorkflowOrder): "check" | "payment" | "checkout" | "ready" | "done" | "other" {
  if (order.status === "HANDED_OVER") return "done";
  if (order.status !== "COMPLETED") return "other";
  if (!order.quality_checked_at) return "check";
  if (order.invoice?.status !== "PAID") return "payment";
  const checkoutOk = order.check_out_confirmed ?? hasHandover(order, "CHECK_OUT");
  if (order.requires_check_in && !checkoutOk) return "checkout";
  return "ready";
}

/** Đường dẫn mở trang chi tiết phiếu tại một bước (`?step=quotation`). */
export const orderStepPath = (id: number, step?: number) =>
  `/advisor/service-orders/${id}${step === undefined ? "" : `?step=${STEPS[step]?.key ?? ""}`}`;

/**
 * Trang làm việc đúng cho tình trạng hiện tại của phiếu (PO 18/11: thao tác xong thì tự sang trang của bước kế):
 * mới nhận xe → chi tiết phiếu (biên bản nhận xe, chẩn đoán); chờ khách duyệt báo giá → Báo giá & phê duyệt; đang sửa / chờ phụ tùng → Tiến độ;
 * sửa xong → Kiểm tra & bàn giao (kiểm tra) → Thanh toán (lập hoá đơn, thu tiền) → biên bản trả xe (chi tiết phiếu) →
 * Kiểm tra & bàn giao (bàn giao). Các việc còn lại (chẩn đoán, lập báo giá) làm ở chi tiết phiếu.
 * Đã bàn giao / đã đóng → null (không tự chuyển).
 */
export function stagePath(order: WorkflowOrder): string | null {
  const id = order.id;
  switch (order.status) {
    // Có phiếu rồi thì biên bản nhận xe + chẩn đoán làm ở trang Phiếu sửa chữa (kể cả xe theo lịch hẹn).
    case "RECEIVED": return orderStepPath(id, hasHandover(order, "CHECK_IN") || !order.requires_check_in ? 1 : 0);
    case "INSPECTING": return orderStepPath(id, 1);
    case "QUOTING": return orderStepPath(id, 2);
    case "WAITING_APPROVAL": {
      const quotation = latestQuotation(order);
      return quotation?.status === "SENT" ? `/advisor/quotations?quotation=${quotation.id}` : orderStepPath(id, 2);
    }
    case "IN_PROGRESS": {
      const supplement = supplementQuotations(order).find(q => q.status === "SENT");
      return supplement ? `/advisor/quotations?quotation=${supplement.id}` : `/advisor/repair-progress?order=${id}`;
    }
    case "WAITING_FOR_PARTS": return `/advisor/repair-progress?order=${id}`;
    case "COMPLETED": {
      const state = deliveryState(order);
      if (state === "payment") return `/advisor/payments?order=${id}`;
      if (state === "checkout") return orderStepPath(id, 4);
      return `/advisor/delivery?order=${id}`;
    }
    default: return null;
  }
}

/**
 * Trang cần chuyển tới sau một thao tác: chỉ khi thao tác đưa phiếu sang bước có trang khác (trước ≠ sau)
 * và trang đó khác trang đang đứng (`pathname`). Thao tác trong cùng bước (bắt đầu một công việc, lưu nháp…) không chuyển.
 */
export function stageRedirect(before: WorkflowOrder | null | undefined, after: WorkflowOrder, pathname: string): string | null {
  const target = stagePath(after);
  if (!target || (before && stagePath(before) === target)) return null;
  return target.split("?")[0] === pathname ? null : target;
}
