import { isTechnicalMessage } from "../../services/apiError";
import type { ToastTone } from "./feedbackContext";

export type ToastContent = { title: string; description?: string };

const RETRY = "Vui lòng thử lại sau giây lát.";
const GENERIC: ToastContent = { title: "Không thể hoàn tất thao tác", description: RETRY };

/** Thông báo thô của trình duyệt / thư viện còn nhận ra được nguyên nhân. */
const RAW_MESSAGES: Array<{ pattern: RegExp; title: string; description: string }> = [
  { pattern: /Network Error|Failed to fetch/i, title: "Mất kết nối", description: "Vui lòng kiểm tra kết nối mạng và thử lại." },
  { pattern: /timeout of \d+ms/i, title: "Máy chủ phản hồi chậm", description: RETRY },
  { pattern: /Too Many Attempts/i, title: "Thao tác quá nhanh", description: "Vui lòng thử lại sau ít phút." },
  { pattern: /Unauthenticated/i, title: "Phiên đăng nhập đã hết hạn", description: "Vui lòng đăng nhập lại." },
  { pattern: /This action is unauthorized/i, title: "Không có quyền thực hiện", description: "Vui lòng liên hệ quản trị viên nếu bạn cần quyền này." },
];

/** Câu backend chỉ nói một vế (hoặc diễn đạt dài): chuẩn hóa thành "chuyện gì xảy ra" + "cần làm gì". */
const KNOWN_MESSAGES: Array<{ pattern: RegExp; title: string; description?: string }> = [
  { pattern: /^(Đã xảy ra lỗi|Có lỗi xảy ra|Có lỗi khi xử lý)/i, ...GENERIC },
  { pattern: /^Email( này)? đã (tồn tại|được (sử dụng|dùng))/i, title: "Email đã tồn tại", description: "Vui lòng sử dụng địa chỉ email khác." },
  { pattern: /^Số điện thoại( này)? đã (tồn tại|được (sử dụng|dùng))/i, title: "Số điện thoại đã tồn tại", description: "Vui lòng sử dụng số điện thoại khác." },
  { pattern: /^Email hoặc mật khẩu không đúng/i, title: "Email hoặc mật khẩu không đúng", description: "Vui lòng kiểm tra lại rồi đăng nhập." },
  { pattern: /^Mật khẩu hiện tại không (chính xác|đúng)/i, title: "Mật khẩu hiện tại không đúng", description: "Vui lòng nhập lại mật khẩu hiện tại." },
  { pattern: /^Mật khẩu mới không được trùng/i, title: "Mật khẩu mới bị trùng", description: "Vui lòng chọn mật khẩu khác mật khẩu cũ." },
  { pattern: /^Mã OTP không hợp lệ hoặc đã hết hạn/i, title: "Mã OTP không hợp lệ", description: "Mã có thể đã hết hạn. Vui lòng kiểm tra lại hoặc yêu cầu mã mới." },
  { pattern: /^OTP đã được sử dụng/i, title: "Mã OTP đã được sử dụng", description: "Vui lòng yêu cầu mã mới." },
  { pattern: /^Biển số đã có trong hệ thống/i, title: "Biển số đã tồn tại", description: "Tìm theo biển số để chọn xe có sẵn." },
  { pattern: /^Biển số( này)? đã (tồn tại|được đăng ký)/i, title: "Biển số đã tồn tại", description: "Vui lòng kiểm tra lại hoặc liên hệ gara." },
  { pattern: /^Mã SKU đã tồn tại/i, title: "Mã SKU đã tồn tại", description: "Vui lòng nhập mã SKU khác." },
  { pattern: /^Tên này đã tồn tại/i, title: "Tên đã tồn tại", description: "Vui lòng nhập tên khác." },
  { pattern: /^Link đã được sử dụng hoặc hết hạn/i, title: "Liên kết không còn hiệu lực", description: "Vui lòng yêu cầu gửi liên kết mới." },
  { pattern: /^Bạn không có quyền/i, title: "Không có quyền thực hiện", description: "Vui lòng liên hệ quản trị viên nếu bạn cần quyền này." },
  { pattern: /^(Chỉ nhận ảnh|Chọn ảnh PNG|Vui lòng chọn định dạng ảnh)/i, title: "Định dạng ảnh không hỗ trợ", description: "Vui lòng chọn ảnh JPG, PNG hoặc WebP." },
  { pattern: /^(Ảnh không được vượt quá|Ảnh tối đa|Kích thước ảnh tối đa)/i, title: "Ảnh quá lớn", description: "Vui lòng chọn ảnh không quá 5 MB." },
  { pattern: /^Vui lòng điền đầy đủ/i, title: "Thiếu thông tin", description: "Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung." },
];

/** Thao tác không thành công mà câu gốc chưa nói cần làm gì. */
const FAILED_ACTION = /^Không (thể|tải|lưu|xoá|xóa|gửi|cập nhật|đổi|huỷ|hủy|xuất|đọc|xử lý|xác nhận|thực hiện|tra cứu)\b/i;

/**
 * Lỗi nghiệp vụ (trùng dữ liệu, sai mật khẩu, mã hết hạn...) hiện bằng toast.
 * Lỗi nhập liệu (thiếu, sai định dạng, quá dài...) hiện ngay dưới ô.
 */
export const isBusinessConflict = (message: string) =>
  /đã (tồn tại|được (dùng|sử dụng|đăng ký)|có trong|hết hạn)|hết hạn|bị trùng|không được trùng|không (đúng|chính xác)(?! định dạng)/i.test(message);

const withoutEndMark = (text: string) => text.trim().replace(/[.!]+$/, "");
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1);
const distinct = ({ title, description }: ToastContent): ToastContent =>
  description && withoutEndMark(description).toLowerCase() !== title.toLowerCase() ? { title, description } : { title };

/** Tách câu thông báo thành tiêu đề + mô tả; nội dung kỹ thuật không bao giờ được hiển thị. */
export function toastContent(message: string, tone: ToastTone = "info"): ToastContent {
  const text = message.trim();
  const raw = RAW_MESSAGES.find(item => item.pattern.test(text));
  if (raw) return { title: raw.title, description: raw.description };
  if (isTechnicalMessage(text)) return GENERIC;

  const known = KNOWN_MESSAGES.find(item => item.pattern.test(text));
  if (known) return distinct({ title: known.title, description: known.description });

  const dash = text.match(/^(.+?)\s+—\s+(.+)$/su);
  if (dash) return distinct({ title: withoutEndMark(dash[1]), description: capitalize(dash[2].trim()) });

  const comma = text.match(/^(.+?),\s*(vui lòng .+)$/isu);
  if (comma) return distinct({ title: comma[1].trim(), description: capitalize(comma[2].trim()) });

  // Chỉ tách khi câu đầu có từ 2 từ trở lên, tránh cắt nhầm chữ viết tắt như "TP. HCM".
  const sentences = text.match(/^(.+?[.!?])\s+(?=\p{Lu})(.+)$/su);
  if (sentences && sentences[1].trim().split(/\s+/).length >= 2) {
    return distinct({ title: withoutEndMark(sentences[1]), description: sentences[2].trim() });
  }

  const title = withoutEndMark(text);
  return tone === "error" && FAILED_ACTION.test(title) ? { title, description: RETRY } : { title };
}
