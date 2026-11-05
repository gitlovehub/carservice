/**
 * Trạng thái nghiệp vụ: NGUỒN DUY NHẤT cho tên hiển thị tiếng Việt và màu badge.
 *
 * - Mã trạng thái (key) giữ nguyên như backend Laravel trả về, không đổi ý nghĩa.
 * - `staff` / `customer`: chỉ khai báo khi cùng một trạng thái phải diễn đạt khác nhau theo
 *   góc nhìn (ví dụ báo giá SENT: khách thấy "Chờ bạn duyệt", cố vấn thấy "Đã gửi khách").
 * - Dùng qua getStatus() hoặc <StatusBadge domain=... status=... />.
 */
export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";
export type StatusAudience = "customer" | "staff";
type StatusDef = { label: string; tone: StatusTone; customer?: string; staff?: string };

export const STATUS = {
  /** Lịch hẹn (appointments.status). CREATED: dữ liệu cũ, cùng nghĩa với PENDING. */
  appointment: {
    PENDING: { label: "Chờ xác nhận", tone: "warning" },
    CREATED: { label: "Chờ xác nhận", tone: "warning" },
    CONFIRMED: { label: "Đã xác nhận", tone: "info" },
    CHECKED_IN: { label: "Đã tiếp nhận xe", tone: "success" },
    CANCELLED: { label: "Đã hủy", tone: "danger" },
    NO_SHOW: { label: "Không đến", tone: "neutral" },
  },
  /** Phiếu sửa chữa (repair_orders.status) — theo RepairOrder::TRANSITIONS. */
  repair: {
    RECEIVED: { label: "Đã tiếp nhận", tone: "info" },
    INSPECTING: { label: "Đang kiểm tra", tone: "info" },
    QUOTING: { label: "Đang lập báo giá", tone: "warning" },
    REVIEW_TEST: { label: "Đang kiểm tra lại", tone: "info" },
    WAITING_APPROVAL: { label: "Chờ khách duyệt báo giá", tone: "warning", customer: "Chờ bạn duyệt báo giá" },
    WAITING_FOR_PARTS: { label: "Chờ phụ tùng", tone: "warning" },
    IN_PROGRESS: { label: "Đang sửa chữa", tone: "accent" },
    COMPLETED: { label: "Đã hoàn tất", tone: "success", staff: "Chờ thanh toán" },
    HANDED_OVER: { label: "Đã bàn giao", tone: "success" },
    CLOSED: { label: "Đã đóng phiếu", tone: "neutral" },
  },
  /** Báo giá (quotations.status). */
  quotation: {
    DRAFT: { label: "Bản nháp", tone: "neutral" },
    SENT: { label: "Chờ khách duyệt", tone: "warning", customer: "Chờ bạn duyệt", staff: "Đã gửi khách" },
    APPROVED: { label: "Đã duyệt toàn bộ", tone: "success", staff: "Khách duyệt toàn bộ" },
    PARTIALLY_APPROVED: { label: "Đã duyệt một phần", tone: "info", staff: "Khách duyệt một phần" },
    REJECTED: { label: "Đã từ chối", tone: "danger", staff: "Khách từ chối" },
    CANCELLED: { label: "Đã hủy", tone: "neutral" },
  },
  /** Hóa đơn (invoices.status). */
  invoice: {
    UNPAID: { label: "Chưa thanh toán", tone: "warning" },
    PARTIALLY_PAID: { label: "Đã thanh toán một phần", tone: "info" },
    PAID: { label: "Đã thanh toán", tone: "success" },
    CANCELLED: { label: "Đã hủy", tone: "neutral" },
  },
  /** Giao dịch thanh toán (payments.status). */
  payment: {
    PENDING: { label: "Đang chờ xử lý", tone: "warning" },
    SUCCESS: { label: "Thành công", tone: "success" },
    FAILED: { label: "Thất bại", tone: "danger" },
    CANCELLED: { label: "Đã hủy", tone: "neutral" },
  },
  /** Hạng mục công việc trong phiếu sửa chữa. */
  workItem: {
    PENDING: { label: "Chờ làm", tone: "neutral" },
    IN_PROGRESS: { label: "Đang làm", tone: "accent" },
    COMPLETED: { label: "Hoàn thành", tone: "success" },
    CANCELLED: { label: "Đã hủy", tone: "neutral" },
  },
  /** Kết quả kiểm tra / chẩn đoán từng hạng mục. */
  inspection: {
    PASSED: { label: "Đạt", tone: "success" },
    NORMAL: { label: "Bình thường", tone: "success" },
    WARNING: { label: "Cần lưu ý", tone: "warning" },
    NEEDS_SERVICE: { label: "Cần bảo dưỡng", tone: "warning" },
    NEEDS_REPLACEMENT: { label: "Cần thay thế", tone: "danger" },
    FAILED: { label: "Không đạt", tone: "danger" },
  },
  /** Tài khoản (accounts.status) — theo Account::STATUS_*. */
  account: {
    PENDING: { label: "Chờ kích hoạt", tone: "warning" },
    ACTIVE: { label: "Đang hoạt động", tone: "success" },
    LOCKED: { label: "Đã khóa", tone: "danger" },
    INACTIVE: { label: "Ngừng hoạt động", tone: "neutral" },
  },
} satisfies Record<string, Record<string, StatusDef>>;

export type StatusDomain = keyof typeof STATUS;

/** Trả về nhãn + màu; mã chưa khai báo vẫn hiển thị (màu trung tính) để không mất thông tin. */
export function getStatus(domain: StatusDomain, code: string | null | undefined, audience: StatusAudience = "staff") {
  const key = (code ?? "").toUpperCase();
  const def = (STATUS[domain] as Record<string, StatusDef>)[key];
  if (!def) return { label: code || "Chưa cập nhật", tone: "neutral" as StatusTone };
  return { label: def[audience] ?? def.label, tone: def.tone };
}

/** Bảng nhãn phẳng { CODE: "Nhãn" } cho chỗ cần Record<string,string> (select, bộ lọc). */
export function statusLabels(domain: StatusDomain, audience: StatusAudience = "staff"): Record<string, string> {
  return Object.fromEntries(Object.keys(STATUS[domain]).map(code => [code, getStatus(domain, code, audience).label]));
}
