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

export const LICENSE_PLATE_ERROR = "Biển số chưa đúng định dạng. Ví dụ: 30A-123.45 hoặc 29LD-1234.";

/** Biển số ô tô dân sự: 2 số tỉnh (11–99) + 1–2 chữ seri + 4 hoặc 5 số. Cùng quy tắc với Backend (App\Support\LicensePlate). */
export function isValidLicensePlate(plate: string): boolean {
  const match = plate.match(/^(\d{2})[A-Z]{1,2}-(?:\d{4}|\d{3}\.\d{2})$/);
  return !!match && Number(match[1]) >= 11;
}

/**
 * Lỗi của ô biển số; để trống là hợp lệ vì biển số không bắt buộc.
 * `current`: biển số đang lưu. Giữ nguyên thì không chặn để xe có dữ liệu cũ vẫn sửa được ODO, ghi chú.
 */
export function licensePlateError(value: string, current?: string | null): string {
  const plate = value.trim().toUpperCase();
  if (!plate || plate === current?.trim().toUpperCase()) return "";
  return isValidLicensePlate(plate) ? "" : LICENSE_PLATE_ERROR;
}
