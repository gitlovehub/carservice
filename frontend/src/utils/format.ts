/**
 * ============================================================================
 * CÁC HÀM ĐỊNH DẠNG HIỂN THỊ
 * ============================================================================
 *
 * Tách riêng thành file để:
 *   - đổi quy ước hiển thị tiền/ngày ở một chỽ duy nhất
 *     (sau này đổi "1500000" thành "1.500.000 đ" thì sửa đúng 1 file)
 *   - dùng lại được ở cả bảng, modal, thống kê, toast
 *   - giữ component gọn, không lặp Intl.NumberFormat ở mỗi file
 *
 * Điểm chung: mọi hàm đều nhận number | string và trả về chuỗi đã định dạng,
 * đồng thời tự xử lý trường hợp rác (NaN, undefined) trả về giá trị an toàn.
 */

/**
 * Bộ định dạng tiền Việt Nam.
 * Khai báo 1 lần ở module scope để không phải tạo lại object mỗi lần render.
 * maximumFractionDigits: 0 -> không hiện ",00" vì giá dịch vụ luôn là số tròn.
 */
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/** Bộ định dạng số có dấu chấm phân cách nghìn: 15000 -> "15.000" */
const numberFormatter = new Intl.NumberFormat('vi-VN');

/**
 * 1. Định dạng tiền.
 *
 * Input là number | string vì base_price từ Laravel về là string "750000.00".
 * Number.isFinite chặn NaN/Infinity — trường hợp input rỗng hoặc rác.
 *
 * Ví dụ: formatCurrency("750000.00") -> "750.000 ₫"
 *        formatCurrency('')          -> "0 ₫"  (an toàn, không crash UI)
 */
export function formatCurrency(value: number | string): string {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return currencyFormatter.format(Number.isFinite(parsed) ? parsed : 0);
}

/**
 * 2. Định dạng số có dấu phân cách nghìn.
 * Dùng cho số km, số phút, số lượng.
 *
 * Ví dụ: formatNumber(15000) -> "15.000"
 */
export function formatNumber(value: number | string): string {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return numberFormatter.format(Number.isFinite(parsed) ? parsed : 0);
}

/**
 * 3. Đổi số phút thành chữ cho dễ đọc.
 *
 *   0/null  -> "—"          (dùng em dash vì 0 phút sẽ gây hiểu nhầm là số 0)
 *   45      -> "45 phút"
 *   60      -> "1 giờ"
 *   90      -> "1 giờ 30 phút"
 *   240     -> "4 giờ"
 */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  if (rest === 0) return `${hours} giờ`;
  return `${hours} giờ ${rest} phút`;
}

/**
 * 4. Ghép mốc bảo dưỡng của gói thành một chuỗi.
 *
 * Nhận cả km và tháng vì gói có thể có một hoặc cả hai.
 * Ví dụ: formatMilestone(10000, 6)    -> "10.000 km · 6 tháng"
 *        formatMilestone(10000, null) -> "10.000 km"
 *        formatMilestone(null, null)  -> "—"
 */
export function formatMilestone(mileage: number | null, month: number | null): string {
  const parts: string[] = [];
  if (mileage) parts.push(`${formatNumber(mileage)} km`);
  if (month) parts.push(`${formatNumber(month)} tháng`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

/**
 * 5. Định dạng ngày tháng kiểu Việt Nam.
 *
 * Hiện chưa dùng trong các màn hình Sprint 1 (bảng không hiện cột ngày),
 * nhưng chắc chắn sẽ cần khi làm màn hình Lịch sử bảo dưỡng hoặc Báo giá
 * — nên để sẵn ở đây thay vì tự viết lại sau.
 *
 * new Date(str) có thể ra Invalid Date nếu chuỗi sai định dạng,
 * nên có kiểm tra Number.isNaN trước khi format.
 */
export function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
