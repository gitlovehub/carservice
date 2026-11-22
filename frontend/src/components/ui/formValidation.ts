import { ApiClientError } from "../../services/api";

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

/** Đưa con trỏ tới ô lỗi đầu tiên của form. */
export function focusIfFirstInvalid(control: FormControl) {
  const first = control.form?.querySelector("input:invalid, select:invalid, textarea:invalid");
  if (!control.form || first === control) control.focus();
}

/** Lỗi 422 của Laravel theo từng trường: { mileage: "..." }. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError) || !error.data?.errors) return {};
  return Object.fromEntries(Object.entries(error.data.errors).flatMap(([key, messages]) => messages[0] ? [[key, messages[0]]] : []));
}
