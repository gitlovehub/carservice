import { useEffect, useState } from "react";
import { errorMessage } from "../../../services/adminApi";
import { LIVE_EVENT } from "../../../services/liveSync";

type State<T> = { key: string; data: T | null; error: string };

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
  const [attempt, setAttempt] = useState(0);
  const requestKey = key === null ? null : `${key}#${attempt}`;
  const live = options?.live ?? 0;

  // Làm mới ngầm: khi server báo dữ liệu đổi (liveSync — mọi trang), và thêm theo chu kỳ `live` nếu có.
  useEffect(() => {
    if (requestKey === null) return;
    let controller: AbortController | null = null;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      const current = controller = new AbortController();
      load(current.signal)
        .then(data => setState(prev => prev.key === requestKey ? { key: requestKey, data, error: "" } : prev))
        .catch(() => undefined);
    };
    window.addEventListener(LIVE_EVENT, refresh);
    const timer = live ? window.setInterval(refresh, live) : undefined;
    return () => {
      window.removeEventListener(LIVE_EVENT, refresh);
      window.clearInterval(timer);
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, live]);

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    load(controller.signal)
      .then(data => setState({ key: requestKey, data, error: "" }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState(current => ({ key: requestKey, data: current.data, error: errorMessage(error, "Không tải được dữ liệu.") }));
      });
    return () => controller.abort();
    // `load` đổi theo mỗi lần render; chỉ tải lại khi khoá yêu cầu đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const ready = requestKey !== null && state.key === requestKey;
  return {
    data: ready && !state.error ? state.data : null,
    /** Dữ liệu gần nhất (kể cả của lần tải trước) để hiển thị trong lúc chờ. */
    stale: state.data,
    loading: requestKey !== null && !ready,
    error: ready ? state.error : "",
    reload: () => setAttempt(n => n + 1),
  };
}
