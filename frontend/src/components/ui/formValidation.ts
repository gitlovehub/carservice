import { LABELS } from "../../config/labels";
import { ApiClientError } from "../../services/api";
import { isTechnicalMessage, userErrorMessage } from "../../services/apiError";
import { isBusinessConflict } from "./toastContent";

export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const isFormControl = (target: EventTarget | null): target is FormControl =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

/** Câu lỗi tiếng Việt cho kiểm tra có sẵn của trình duyệt (required, pattern, min, max...). */
export function validityMessage(control: FormControl): string {
  const { validity } = control;
  if (validity.valueMissing) {
    if (control instanceof HTMLSelectElement) return "Vui lòng chọn một mục.";
    if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) return "Vui lòng chọn mục này.";
    return "Vui lòng nhập thông tin này.";
  }
  if (validity.typeMismatch) return control.type === "email" ? "Email không hợp lệ." : "Giá trị không hợp lệ.";
  if (validity.tooShort && !(control instanceof HTMLSelectElement)) return `Cần ít nhất ${control.minLength} ký tự.`;
  if (validity.tooLong && !(control instanceof HTMLSelectElement)) return `Tối đa ${control.maxLength} ký tự.`;
  if (validity.rangeUnderflow && control instanceof HTMLInputElement) return `Giá trị nhỏ nhất là ${control.min}.`;
  if (validity.rangeOverflow && control instanceof HTMLInputElement) return `Giá trị lớn nhất là ${control.max}.`;
  if (validity.patternMismatch) return control.title || "Định dạng chưa đúng.";
  return "Giá trị không hợp lệ.";
}

/** Lỗi 422 của Laravel theo từng trường: { mileage: "..." }. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError) || !error.data?.errors) return {};
  return Object.fromEntries(Object.entries(error.data.errors).flatMap(([key, messages]) => messages[0] ? [[key, messages[0]]] : []));
}

/** Ô sai do server trả về nhưng câu lỗi đã nằm trong toast: giữ viền đỏ, không lặp chữ dưới ô. */
export const API_ERROR_MARK = " ";

/**
 * Chia lỗi API: lỗi nhập liệu nằm dưới đúng ô; lỗi nghiệp vụ đầu tiên (trùng dữ liệu, sai mật khẩu...) ra MỘT toast.
 * Lỗi không thuộc ô nào cũng chỉ ra một toast để không xếp chồng nhiều thông báo.
 */
export function splitApiErrors(error: unknown, fieldByApiKey: Record<string, string> = {}, fallback: string = LABELS.notify.genericError) {
  const fields: Record<string, string> = {};
  let toast: string | null = null;
  Object.entries(apiFieldErrors(error)).forEach(([key, message]) => {
    const field = fieldByApiKey[key];
    const technical = isTechnicalMessage(message);
    if (!field) { if (!technical) toast ??= message; return; }
    if (technical) { fields[field] = "Thông tin chưa hợp lệ."; return; }
    if (isBusinessConflict(message) && toast === null) { toast = message; fields[field] = API_ERROR_MARK; return; }
    fields[field] = message;
  });
  if (toast === null && !Object.keys(fields).length) toast = userErrorMessage(error, fallback);
  return { fields, toast: toast as string | null };
}
