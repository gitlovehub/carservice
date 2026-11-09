import { useEffect, useState } from "react";
import { errorMessage } from "../../../services/adminApi";

type State<T> = { key: string; data: T | null; error: string };

/**
 * Tải dữ liệu theo khoá yêu cầu (đổi tham số → tải lại). "Đang tải" = khoá hiện tại chưa có kết quả,
 * nên không cần setState đồng bộ trong effect. Giữ dữ liệu cũ (`stale`) khi đổi trang/bộ lọc để bảng không nháy.
 * Truyền key = null để tạm không tải.
 */
export function useAdminQuery<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const requestKey = key === null ? null : `${key}#${attempt}`;

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
