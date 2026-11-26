import { API_BASE_URL } from "./api";

/**
 * "Ghi nhớ đăng nhập":
 *  - Có tích  → phiên giữ lại kể cả khi đóng/mở lại trình duyệt.
 *  - Không tích → tự đăng xuất khi đóng trình duyệt.
 * Cách làm: phiên vẫn nằm ở localStorage (các trang đang đọc từ đó), kèm cờ "không ghi nhớ" + một cookie phiên
 * (không có hạn → trình duyệt xoá khi đóng; dùng chung mọi tab). Lúc mở web, nếu cờ "không ghi nhớ" còn mà cookie
 * đã mất ⇒ trình duyệt đã được đóng ⇒ xoá phiên và thu hồi token ở server.
 */
const PERSIST_KEY = "carservice_auth_persist";
const ALIVE_COOKIE = "cs_session_alive";
const AUTH_KEYS = ["role", "isLoggedIn", "token", "authToken", "user"];

const hasAliveCookie = () => document.cookie.split("; ").some(part => part.startsWith(`${ALIVE_COOKIE}=`));

/** Gọi ngay sau khi đăng nhập / xác thực OTP thành công. */
export function markAuthSession(remember: boolean) {
  try {
    localStorage.setItem(PERSIST_KEY, remember ? "1" : "0");
    document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
  } catch { /* Trình duyệt chặn lưu trữ: phiên vẫn chạy như bình thường. */ }
}

/** Gọi khi đăng xuất. */
export function clearAuthSessionMarker() {
  try {
    localStorage.removeItem(PERSIST_KEY);
    document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch { /* bỏ qua */ }
}

/** Gọi một lần lúc khởi động app (main.tsx), trước khi render. */
export function expireUnrememberedSession() {
  try {
    if (localStorage.getItem(PERSIST_KEY) !== "0" || hasAliveCookie()) return;
    const token = localStorage.getItem("token");
    AUTH_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(PERSIST_KEY);
    if (token && token !== "session_authenticated") {
      void fetch(`${API_BASE_URL}/logout`, {
        method: "POST", keepalive: true,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }).catch(() => undefined);
    }
  } catch { /* bỏ qua */ }
}
