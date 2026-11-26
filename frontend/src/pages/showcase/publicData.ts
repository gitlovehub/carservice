// Hook đọc dữ liệu công khai (không cần đăng nhập) dùng chung cho các trang khách.
// Tách khỏi file component để Vite fast refresh hoạt động đúng.
import { useEffect, useState } from 'react';
import { fetchApi } from '../../services/api';

/** GET một API công khai; lỗi → giữ null (section tự ẩn). */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    fetchApi<T>(path).then(r => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  return data;
}

export type GarageSettings = { name: string; phone: string | null; email: string | null; address_line: string | null; ward: string | null; district: string | null; province: string | null; latitude: number | null; longitude: number | null };

/** Thông tin gara từ Admin → Thông tin gara. */
export const useGarage = () => useApi<{ data: GarageSettings | null }>('/garage-settings')?.data ?? null;
