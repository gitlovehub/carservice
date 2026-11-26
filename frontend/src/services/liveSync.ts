import { useEffect, useRef } from "react";
import { apiClient, fetchApi } from "./api";

/**
 * Realtime. Đã đăng nhập →
 *  1. WebSocket (Laravel Reverb + Echo): server đẩy sự kiện `live.changed` ngay khi dữ liệu đổi
 *     — nhân viên nghe kênh riêng "staff", khách nghe kênh riêng "account.{id}" (chỉ thay đổi của chính mình).
 *  2. Dự phòng: hỏi GET /api/live theo chu kỳ (4 giây khi WebSocket chưa nối được, 30 giây khi đã nối).
 * Có thay đổi → phát sự kiện "cs:live"; các trang / chuông đang mở tự tải lại ngầm, không cần F5.
 */
export const LIVE_EVENT = "cs:live";
const FALLBACK_MS = 4000;
const CONNECTED_MS = 30000;
const STAFF_ROLES = new Set(["ADMIN", "ADVISOR", "TECHNICIAN"]);

type RealtimeConfig = { key: string; host: string; port: number; scheme: string };
type LiveResponse = { stamp: string; realtime?: RealtimeConfig | null };
type EchoLike = { private: (channel: string) => { listen: (event: string, cb: () => void) => unknown }; disconnect: () => void; connector: { pusher?: { connection?: { state?: string } } } };

const emit = () => window.dispatchEvent(new Event(LIVE_EVENT));

async function connectEcho(config: RealtimeConfig, channel: string): Promise<EchoLike> {
  const [{ default: Echo }, { default: Pusher }] = await Promise.all([import("laravel-echo"), import("pusher-js")]);
  const echo = new Echo({
    broadcaster: "reverb",
    Pusher,
    key: config.key,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.scheme === "https",
    enabledTransports: ["ws", "wss"],
    // Xác thực kênh riêng bằng chính token đăng nhập (POST /api/broadcasting/auth qua apiClient).
    authorizer: (ch: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        apiClient.post<{ auth: string }>("/broadcasting/auth", { socket_id: socketId, channel_name: ch.name })
          .then(response => callback(null, response.data))
          .catch((error: Error) => callback(error, null));
      },
    }),
  }) as unknown as EchoLike;
  echo.private(channel).listen(".live.changed", emit);
  return echo;
}

export function startLiveSync(account: { id: number; role: string }): () => void {
  let last: string | null = null;
  let busy = false;
  let stopped = false;
  let echo: EchoLike | null = null;
  let connecting = false;
  let timer: number | undefined;

  const connected = () => echo?.connector.pusher?.connection?.state === "connected";

  const check = async () => {
    if (busy || stopped || document.visibilityState !== "visible") return;
    busy = true;
    try {
      const { stamp, realtime } = await fetchApi<LiveResponse>("/live");
      if (last !== null && stamp !== last) emit();
      last = stamp;
      if (realtime && !echo && !connecting) {
        connecting = true;
        const channel = STAFF_ROLES.has(account.role) ? "staff" : `account.${account.id}`;
        connectEcho(realtime, channel)
          .then(instance => { if (stopped) instance.disconnect(); else echo = instance; })
          .catch(() => undefined) // không nối được WebSocket → vẫn còn hỏi định kỳ
          .finally(() => { connecting = false; });
      }
    } catch {
      // Mất mạng / hết phiên: bỏ qua, lần sau hỏi lại.
    } finally {
      busy = false;
    }
  };

  // Chu kỳ hỏi tự giãn ra khi WebSocket đang nối (chỉ còn là lưới an toàn).
  const schedule = () => {
    if (stopped) return;
    timer = window.setTimeout(() => { void check().finally(schedule); }, connected() ? CONNECTED_MS : FALLBACK_MS);
  };
  void check().finally(schedule);
  const onVisible = () => { if (document.visibilityState === "visible") void check(); };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    echo?.disconnect();
  };
}

/** Gọi `onChange` mỗi khi dữ liệu trên server đổi (luôn dùng phiên bản callback mới nhất). */
export function useLiveRefresh(onChange: () => void) {
  const ref = useRef(onChange);
  useEffect(() => { ref.current = onChange; });
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(LIVE_EVENT, handler);
    return () => window.removeEventListener(LIVE_EVENT, handler);
  }, []);
}
