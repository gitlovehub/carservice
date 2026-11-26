// Hiển thị dịch vụ dùng chung cho trang chủ và trang Dịch vụ.
import { API_BASE_URL } from '../../services/api';

export type Service = {
  id: number; name: string; description?: string | null; category?: string | null;
  base_price?: number | string | null; estimated_price?: number | string | null;
  created_at?: string | null;
  /** Thứ hạng phổ biến theo số lần thực hiện thật (1 = dùng nhiều nhất; null = chưa ai dùng). CL-01 / D-018. */
  popularity_rank?: number | null;
  /** Ảnh admin tải lên ("/api/service-images/{id}?v=…"); null = chưa có ảnh. */
  image_url?: string | null;
};

/** "Phổ biến": hạng nhỏ đứng trước; dịch vụ chưa ai dùng xếp sau, giữa chúng ưu tiên dịch vụ mới tạo. */
export const byPopularity = (a: Service, b: Service) =>
  (a.popularity_rank ?? Number.MAX_SAFE_INTEGER) - (b.popularity_rank ?? Number.MAX_SAFE_INTEGER)
  || (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0)
  || b.id - a.id;

export const money = (n: number | string | null | undefined) =>
  n == null || (typeof n === 'string' && !n.trim()) || !Number.isFinite(Number(n)) || Number(n) < 0
    ? 'Liên hệ tư vấn'
    : 'Từ ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n));

/**
 * Chuẩn hóa chữ để tìm kiếm không phân biệt dấu & hoa/thường: "Lọc dầu" → "loc dau", "Đèn" → "den".
 */
export const foldVi = (text: string | null | undefined) =>
  (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Ảnh dịch vụ do admin tải lên. API trả đường dẫn "/api/…"; khi frontend gọi API ở domain khác
 * (VITE_API_BASE_URL), ghép lại theo domain API để ảnh không bị 404.
 */
export function serviceImage(service: Pick<Service, 'image_url'>): string | null {
  const url = service.image_url;
  if (!url) return null;
  return url.startsWith('/api/') ? `${API_BASE_URL}${url.slice(4)}` : url;
}
