import type { CustomerRepairOrder } from "../../services/customerApi";

/**
 * Gợi ý nhận xét nhanh cho form đánh giá: dựa trên dịch vụ / gói khách đã làm ở phiếu này
 * và số sao khách chấm (≥4 sao → lời khen, ≤3 sao → góp ý). Khách chọn tối đa MAX_SUGGESTIONS.
 */
export const MAX_SUGGESTIONS = 3;
const MAX_SHOWN = 6;

type Topic = { match: RegExp; good: string; bad: string };

/** Nhóm dịch vụ nhận diện theo tên (tiếng Việt, không phân biệt hoa thường). */
const TOPICS: Topic[] = [
  { match: /dầu|nhớt/i, good: "Thay dầu nhanh, đúng loại", bad: "Thay dầu chưa đúng như tư vấn" },
  { match: /phanh|thắng/i, good: "Phanh ăn, đi êm và an toàn hơn", bad: "Phanh vẫn chưa êm sau khi làm" },
  { match: /điều hòa|điều hoà|máy lạnh|lọc gió điều/i, good: "Điều hòa mát sâu, hết mùi", bad: "Điều hòa chưa mát như mong đợi" },
  { match: /lốp|vỏ xe|cân bằng|đảo lốp|góc đặt bánh|thước lái/i, good: "Lốp được cân chỉnh, xe chạy đầm", bad: "Xe vẫn còn rung hoặc lệch lái" },
  { match: /ắc quy|ắc-quy|bình điện|hệ thống điện|đèn/i, good: "Kiểm tra điện, ắc quy kỹ lưỡng", bad: "Lỗi điện chưa được xử lý triệt để" },
  { match: /động cơ|bugi|lọc nhiên liệu|kim phun|buồng đốt/i, good: "Động cơ êm hơn rõ rệt", bad: "Động cơ vẫn chưa êm như mong đợi" },
  { match: /bảo dưỡng|gói|cấp \d|định kỳ/i, good: "Làm đủ hạng mục trong gói bảo dưỡng", bad: "Chưa rõ đã làm đủ hạng mục trong gói" },
  { match: /rửa|vệ sinh|chăm sóc|đánh bóng|nội thất/i, good: "Xe được vệ sinh sạch sẽ, kỹ càng", bad: "Xe giao lại chưa được sạch sẽ" },
  { match: /sửa chữa|kiểm tra|chẩn đoán|tiếng kêu|kêu/i, good: "Bắt đúng bệnh, sửa dứt điểm", bad: "Lỗi xe chưa được khắc phục hết" },
];

const GENERIC_GOOD = ["Tư vấn rõ ràng, dễ hiểu", "Báo giá minh bạch", "Giao xe đúng hẹn", "Nhân viên thân thiện, chu đáo"];
const GENERIC_BAD = ["Thời gian chờ hơi lâu", "Cần tư vấn kỹ hơn", "Chi phí cao hơn dự kiến", "Chưa được báo tiến độ thường xuyên"];

/** Tên dịch vụ / gói / hạng mục khách đã làm ở phiếu (từ GET /me/repair-orders/{id}). */
export function serviceNamesOf(order: CustomerRepairOrder): string[] {
  const names = [
    ...(order.appointment?.packages ?? []).map((item) => item.name),
    ...(order.appointment?.services ?? []).map((item) => item.name),
    ...(order.work_items ?? order.workItems ?? []).map((item) => item.description ?? ""),
    ...(order.invoice?.items ?? []).filter((item) => item.item_type !== "PART").map((item) => item.description ?? ""),
  ];
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

/** Danh sách gợi ý: tối đa 3 câu theo dịch vụ đã làm, phần còn lại là câu chung — tổng tối đa 6. */
export function buildSuggestions(serviceNames: string[], rating: number): string[] {
  const negative = rating > 0 && rating <= 3;
  const text = serviceNames.join(" | ");
  const specific = TOPICS.filter((topic) => topic.match.test(text)).slice(0, 3).map((topic) => (negative ? topic.bad : topic.good));
  const generic = negative ? GENERIC_BAD : GENERIC_GOOD;
  return [...new Set([...specific, ...generic])].slice(0, MAX_SHOWN);
}

/** Ghép gợi ý đã chọn + phần khách tự viết thành nhận xét gửi lên API. */
export function composeComment(chips: string[], freeText: string): string {
  return [chips.join(". "), freeText.trim()].filter(Boolean).join(". ");
}
