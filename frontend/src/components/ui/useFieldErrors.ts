import { useCallback, useState } from "react";
import { useAppFeedback } from "./feedbackContext";
import { focusFirstInvalid } from "./focusInvalid";
import { splitApiErrors } from "./formValidation";

export type FieldErrors = Record<string, string>;

/**
 * Lỗi theo từng ô của một form.
 * `show`: dùng khi gửi form thất bại, tô đỏ rồi cuộn và focus ô lỗi đầu tiên.
 * `mark`: dùng khi đang nhập (rời ô, chọn file), chỉ hiện lỗi và không cuộn.
 * `clear`: khi người dùng sửa ô.
 * `showApi`: lỗi nhập liệu hiện dưới đúng ô; lỗi nghiệp vụ (trùng dữ liệu...) hiện một toast và tô đỏ ô.
 * `general`: toast cho lỗi chung do form tự kiểm tra.
 */
export function useFieldErrors() {
  const { notify } = useAppFeedback();
  const [errors, setErrors] = useState<FieldErrors>({});
  const mark = useCallback((next: FieldErrors) => {
    setErrors(next);
    return Object.keys(next).length > 0;
  }, []);
  const show = useCallback((next: FieldErrors) => {
    const hasErrors = mark(next);
    if (hasErrors) focusFirstInvalid();
    return hasErrors;
  }, [mark]);
  const clear = useCallback((...keys: string[]) => {
    setErrors(previous => keys.some(key => key in previous)
      ? Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key)))
      : previous);
  }, []);
  const reset = useCallback(() => setErrors({}), []);
  const general = useCallback((message: string) => notify(message, "error"), [notify]);
  const showApi = useCallback((error: unknown, fieldByApiKey: Record<string, string> = {}) => {
    const { fields, toast } = splitApiErrors(error, fieldByApiKey);
    if (toast) general(toast);
    show(fields);
  }, [general, show]);
  return { errors, show, mark, clear, reset, showApi, general };
}
