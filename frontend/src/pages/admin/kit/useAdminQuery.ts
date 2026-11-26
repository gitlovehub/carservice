import { useEffect, useState } from "react";
import { errorMessage } from "../../../services/adminApi";
import { LIVE_EVENT } from "../../../services/liveSync";

type State<T> = { key: string; data: T | null; error: string };
type CacheSlot = { id: string; owner: string };

/**
 * Cache trong bộ nhớ để quay lại trang đã xem không phải chờ vòng quay. Chỉ dùng làm `stale`: trang vẫn gọi API
 * lấy bản mới, còn `data` chỉ có sau khi server trả lời nên các thao tác dựa vào `data` không chạy trên số liệu cũ.
 * Tách theo phiên đăng nhập (đổi token là xoá sạch) và theo khu vực, vì admin và cố vấn có khoá trùng tên.
 */
const CACHE_LIMIT = 150;
const queryCache = new Map<string, unknown>();
let cacheOwner: string | null = null;

function cacheSlot(key: string): CacheSlot | null {
  const token = localStorage.getItem("token");
  if (token !== cacheOwner) {
    queryCache.clear();
    cacheOwner = token;
  }
  return token ? { id: `${window.location.pathname.split("/")[1]}|${key}`, owner: token } : null;
}

function remember(slot: CacheSlot | null, data: unknown) {
  if (!slot || localStorage.getItem("token") !== slot.owner) return;
  queryCache.delete(slot.id);
  queryCache.set(slot.id, data);
  if (queryCache.size > CACHE_LIMIT) queryCache.delete(queryCache.keys().next().value as string);
}

/**
 * Tải dữ liệu theo khoá yêu cầu (đổi tham số → tải lại). "Đang tải" = khoá hiện tại chưa có kết quả,
 * nên không cần setState đồng bộ trong effect. Giữ dữ liệu cũ (`stale`) khi đổi trang/bộ lọc để bảng không nháy.
 * Truyền key = null để tạm không tải.
 *
 * `live` (ms): tự làm mới ngầm theo chu kỳ và khi quay lại tab — cho dữ liệu khách có thể đổi bất cứ lúc nào
 * (khách xác nhận qua email, tự đổi/hủy lịch…). Làm mới ngầm không bật trạng thái "đang tải", lỗi mạng bỏ qua.
 */
export function useAdminQuery<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>, options?: { live?: number }) {
  const [state, setState] = useState<State<T>>({ key: "", data: null, error: "" });