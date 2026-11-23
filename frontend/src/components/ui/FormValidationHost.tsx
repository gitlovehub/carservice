import { useEffect } from "react";
import { focusFirstInvalid } from "./focusInvalid";
import { isFormControl, validityMessage, type FormControl } from "./formValidation";

/**
 * Ô nhập không nằm trong <Field>: thay bong bóng lỗi của trình duyệt bằng viền đỏ + dòng lỗi ngay dưới ô.
 * Ô trong <Field> do chính Field xử lý.
 */
export function FormValidationHost() {
  useEffect(() => {
    const messages = new Map<FormControl, HTMLParagraphElement>();
    const clear = (control: FormControl) => {
      const message = messages.get(control);
      if (!message) return;
      message.remove();
      messages.delete(control);
      control.removeAttribute("aria-invalid");
    };
    const onInvalid = (event: Event) => {
      const control = event.target;
      if (!isFormControl(control) || control.closest("[data-field]")) return;
      event.preventDefault();
      let message = messages.get(control);
      if (!message) {
        message = document.createElement("p");
        message.className = "mt-1 text-caption font-medium normal-case text-danger";
        message.setAttribute("role", "alert");
        const label = control.closest("label");
        if (label) label.appendChild(message);
        else control.insertAdjacentElement("afterend", message);
        messages.set(control, message);
      }
      message.textContent = validityMessage(control);
      control.setAttribute("aria-invalid", "true");
      focusFirstInvalid(control.form);
    };
    // Form tự kiểm tra trong onSubmit: sau khi vẽ lỗi, đưa người dùng tới ô đầu tiên.
    const onSubmit = (event: Event) => { if (event.target instanceof HTMLFormElement) focusFirstInvalid(event.target); };
    const onEdit = (event: Event) => { if (isFormControl(event.target)) clear(event.target); };
    // Ô bị gỡ khỏi trang (đóng modal, đổi bước) thì gỡ luôn dòng lỗi.
    const observer = new MutationObserver(() => {
      messages.forEach((message, control) => { if (!control.isConnected) { message.remove(); messages.delete(control); } });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      messages.forEach(message => message.remove());
    };
  }, []);
  return null;
}
