import { useCallback, useState } from "react";
import { useAppFeedback } from "./feedbackContext";
import { apiFieldErrors } from "./formValidation";
import { userErrorMessage } from "../../services/apiError";

export type FieldErrors = Record<string, string>;

/** Đưa ô lỗi đầu tiên vào tầm nhìn sau khi giao diện đã vẽ viền đỏ. */
function focusFirstInvalid() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const scope = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].pop() ?? document;
    const first = scope.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    first?.focus({ preventScroll: true });
  }));
}

/**
 * Lỗi theo từng ô của một form: `show` tô đỏ và cuộn tới ô đầu tiên, `clear` khi người dùng sửa ô.
 * `showApi` gắn lỗi 422 vào đúng ô; lỗi không thuộc ô nào (mất mạng, sai trạng thái...) hiện bằng toast.
 * `general` hiện toast cho lỗi chung do form tự kiểm tra.
 */
export function useFieldErrors() {
  const { notify } = useAppFeedback();
  const [errors, setErrors] = useState<FieldErrors>({});
  const show = useCallback((next: FieldErrors) => {
    setErrors(next);
    if (Object.keys(next).length) focusFirstInvalid();
    return Object.keys(next).length > 0;
  }, []);
  const clear = useCallback((...keys: string[]) => {
    setErrors(previous => keys.some(key => key in previous)
      ? Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key)))
      : previous);
  }, []);
  const reset = useCallback(() => setErrors({}), []);
  const general = useCallback((message: string) => notify(message, "error"), [notify]);
  const showApi = useCallback((error: unknown, fieldByApiKey: Record<string, string> = {}) => {
    const mapped = Object.entries(apiFieldErrors(error)).flatMap(([key, message]) => fieldByApiKey[key] ? [[fieldByApiKey[key], message]] : []);
    if (mapped.length) show(Object.fromEntries(mapped));
    else general(userErrorMessage(error, "Có lỗi xảy ra. Vui lòng thử lại."));
  }, [general, show]);
  return { errors, show, clear, reset, showApi, general };
}
