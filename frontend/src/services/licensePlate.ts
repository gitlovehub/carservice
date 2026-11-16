/**
 * Tự động format biển số xe theo chuẩn VN khi nhập.
 * VD: "30a12345" → "30A-123.45", "29ld1234" → "29LD-1234", "51k" → "51K".
 * Chuỗi không khớp mẫu (đang gõ dở hoặc biển đặc biệt) chỉ được viết hoa + bỏ ký tự lạ.
 */
export function formatLicensePlate(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return "";

  // 2 số tỉnh + 1–2 chữ cái seri (VD: 30K, 29LD), theo sau là phần số.
  const match = clean.match(/^([0-9]{2}[A-Z]{1,2})([0-9]*)$/);
  if (!match) return clean;

  const [, prefix, digits] = match;
  if (!digits) return prefix;
  if (digits.length <= 4) return `${prefix}-${digits}`;
  // 5 số: 3 số đầu + "." + 2 số cuối (VD: 30K-888.88); bỏ phần thừa.
  return `${prefix}-${digits.slice(0, 3)}.${digits.slice(3, 5)}`;
}
