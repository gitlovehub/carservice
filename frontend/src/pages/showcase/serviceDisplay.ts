// Hiển thị dịch vụ dùng chung cho trang chủ và trang Dịch vụ.
export type Service = {
  id: number; name: string; description?: string | null; category?: string | null;
  base_price?: number | string | null; estimated_price?: number | string | null;
  is_popular?: boolean | null; sort_order?: number | null;
};

export const money = (n: number | string | null | undefined) =>
  n == null || n === '' || !Number.isFinite(Number(n))
    ? 'Liên hệ tư vấn'
    : 'Từ ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n));

/** Chọn ảnh minh họa /showcase/service-N.webp theo tên + danh mục dịch vụ. */
export function photo(service: Pick<Service, 'name' | 'category'>) {
  const text = `${service.name} ${service.category ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  if (['dau', 'oil', 'bao duong', 'maintenance'].some(k => text.includes(k))) return '1';
  if (['phanh', 'brake'].some(k => text.includes(k))) return '3';
  if (['lop', 'tire', 'wheel'].some(k => text.includes(k))) return '4';
  if (['ac quy', 'battery', 'binh dien'].some(k => text.includes(k))) return '6';
  if (['dieu hoa', 'may lanh', 'dien lanh', 'air conditioning'].some(k => text.includes(k))) return '5';
  return '2';
}
