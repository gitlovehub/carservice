import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Tham số URL dùng để mở thẳng một mục (vd. `/quotation?order=12` từ chuông thông báo).
 * Trang tự tìm mục tương ứng sau khi tải xong và mở modal; đóng modal → gọi `clear()` để bỏ tham số
 * (tải lại trang sẽ không bật lại modal).
 */
export function useDeepLink(key: string) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);
  const clear = useCallback(() => {
    setParams((previous) => {
      if (!previous.has(key)) return previous;
      const next = new URLSearchParams(previous);
      next.delete(key);
      return next;
    }, { replace: true });
  }, [key, setParams]);
  return { value, clear };
}
