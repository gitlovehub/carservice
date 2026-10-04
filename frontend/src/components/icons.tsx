/**
 * ============================================================================
 * ICON SVG DÙNG CHUNG
 * ============================================================================
 *
 * VÌ SAO LÀ FILE .tsx MÀ KHÔNG PHẢI .ts:
 *   Icon là JSX (<svg>...</svg>) nên bắt buộc phải là .tsx.
 *
 * VÌ SAO ĐỂ RIÊNG MỘT FILE, KHÔNG GỘP VỚI ActionButton:
 *   Quy tắc react-refresh của Vite yêu cầu: file nào export component thì
 *   chỉ được export component. Export thêm hằng JSX (các icon) sẽ làm
 *   Fast Refresh ngừng hoạt động — tức là mỗi lần lưu file trong lúc code,
 *   trình duyệt reload toàn trang thay vì chỉ cập nhật phần vừa sửa.
 *   Nên icon (hằng) nằm ở file này, ActionButton (component) nằm ở file riêng.
 *
 * VÌ SAO KHÔNG CÀI THƯ VIỆN ICON (react-icons, lucide-react...):
 *   package.json hiện chỉ có react + react-router-dom + tailwindcss.
 *   Thêm cả dependency chỉ để vẽ 4 icon là không đáng.
 *   Icon đặt sẵn ở đây nên không bị gỡ khỏi cây khi không còn dùng đến.
 *
 * NGUỒN GỐC: bộ Feather (viewBox 24x24, stroke nét mảnh, không fill).
 * Phong cách nét mảnh khớp với phần giao diện sẵn có (LoginPage, VehicleCard).
 *
 * CHÚ Ý KHI DÙNG:
 *   Các icon KHÔNG có fill nên kế thừa màu chữ từ class `text-*` trên nút.
 *   Muốn đổi màu chỉ cần đổi class màu chữ ở nơi dùng.
 */

/**
 * Icon bút chì — dùng cho nút Sửa.
 * Path 1 ("M12 20h9"): đường ngang là dấu hiệu "đang chỉnh sửa nội dung".
 * Path 2: thân bút chì kéo từ (16.5, 3.5) xuống góc (7, 19).
 */
export const editIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

/**
 * Icon con mắt — dùng cho nút bật/tắt hoạt động.
 * Dùng mắt chứ không dùng công tắc (toggle) vì đây là thao tác bật/tắt TRẠNG THÁI,
 * không phải công tắc trong bảng cài đặt. Mắt = nhìn thấy / không thấy,
 * hình ảnh này quen thuộc và tránh bị hiểu nhầm là xoá.
 */
export const eyeIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * Icon thùng rác — dùng cho nút Xoá.
 * 3 path theo thứ tự: nắp (đường ngang) → thân thùng có nắp → thùng rác mở.
 */
export const trashIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

/**
 * Icon dấu cộng — dùng cho nút "Thêm dịch vụ" / "Thêm gói bảo dưỡng".
 * 2 path tạo hình chữ thập: 1 dọc + 1 ngang.
 * strokeWidth="2" (đậm hơn 3 icon trên) vì nút thêm là hành động chính,
 * cần nổi hơn một chút.
 */
export const plusIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);
