/**
 * Bản nhớ tạm trong phiên cho các trang khách: quay lại trang đã xem hiện ngay dữ liệu lần trước,
 * đồng thời trang vẫn gọi API để cập nhật. Đổi phiên đăng nhập → xoá sạch, tải lại trình duyệt → mất.
 */
const CACHE_LIMIT = 30;
const entries = new Map<string, unknown>();
let owner: string | null = null;

function currentOwner(): string | null {
  let token: string | null = null;
  try { token = localStorage.getItem("token"); } catch { /* trình duyệt chặn storage: coi như khách */ }
  if (token !== owner) {
    entries.clear();
    owner = token;
  }
  return token;
}

export function readPageCache<T>(key: string): T | null {
  currentOwner();
  return entries.has(key) ? entries.get(key) as T : null;
}

/** Gọi TRƯỚC khi gửi request: phản hồi về sau khi đã đổi tài khoản sẽ không được lưu vào phiên mới. */
export function pageCacheSaver<T>(key: string): (data: T) => void {
  const requestOwner = currentOwner();
  return (data) => {
    if (currentOwner() !== requestOwner) return;
    entries.delete(key);
    entries.set(key, data);
    if (entries.size > CACHE_LIMIT) entries.delete(entries.keys().next().value as string);
  };
}
