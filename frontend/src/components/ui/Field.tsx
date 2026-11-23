import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { LABELS } from "../../config/labels";
import { Icon } from "./Icon";
import { FieldContext, controlClass, useFieldControl } from "./fieldContext";
import { focusFirstInvalid } from "./focusInvalid";
import { isFormControl, validityMessage } from "./formValidation";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Dòng lỗi đỏ ngay dưới ô nhập (dùng khi ô không nằm trong <Field>). */
export function FieldError({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return hasErrorText(children) ? <p className={`text-caption font-medium text-danger ${className}`} role="alert">{children}</p> : null;
}

/** Lỗi từ server chỉ tô đỏ ô (câu lỗi nằm trong toast) nên giá trị là khoảng trắng, không vẽ dòng chữ. */
const hasErrorText = (error: ReactNode) => typeof error === "string" ? error.trim() !== "" : !!error;

/**
 * Nhãn + ô nhập + gợi ý + lỗi. Ô nhập bên trong (<Input>/<Select>/<Textarea>) tự nhận id và aria.
 * Lỗi kiểm tra của trình duyệt (required, pattern...) cũng hiện ngay dưới ô, viền đỏ; sửa ô là hết lỗi.
 */
export function Field({ label, hint, error, required, optional, className = "", children }: FieldProps) {
  const id = useId();
  const [browserError, setBrowserError] = useState("");
  const shownError = error || browserError;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = hasErrorText(shownError) ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return <FieldContext.Provider value={{ id, "aria-describedby": describedBy, "aria-invalid": shownError ? true : undefined, required }}>
    <div data-field="" className={`flex flex-col gap-1.5 ${className}`}
      onInvalidCapture={event => {
        if (!isFormControl(event.target)) return;
        event.preventDefault();
        setBrowserError(validityMessage(event.target));
        focusFirstInvalid(event.target.form);
      }}
      onInputCapture={() => setBrowserError("")} onChangeCapture={() => setBrowserError("")}>
      <label htmlFor={id} className="text-label text-cs-text-2">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        {optional && <span className="ml-1 font-normal normal-case tracking-normal text-cs-muted">({LABELS.form.optional})</span>}
      </label>
      {children}
      {errorId ? <p id={errorId} className="text-caption font-medium text-danger" role="alert">{shownError}</p>
        : hint ? <p id={hintId} className="text-caption text-cs-muted">{hint}</p> : null}
    </div>
  </FieldContext.Provider>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...props }, ref) {
  const field = useFieldControl();
  return <input ref={ref} {...field} {...props} className={`${controlClass} ${className}`}/>;
});

/** Ô mật khẩu có nút con mắt ẩn/hiện — dùng thay cho <Input type="password"> ở mọi form. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput({ className = "", ...props }, ref) {
  const field = useFieldControl();
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input ref={ref} {...field} {...props} type={visible ? "text" : "password"} className={`${controlClass} pr-11 ${className}`}/>
    <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible}
      title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} disabled={props.disabled}
      className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-cs-muted transition hover:bg-cs-hover hover:text-cs-text disabled:cursor-not-allowed disabled:opacity-50">
      <Icon name={visible ? "eye-off" : "eye"} size={17}/>
    </button>
  </div>;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", children, ...props }, ref) {
  const field = useFieldControl();
  return <select ref={ref} {...field} {...props} className={`${controlClass} cursor-pointer ${className}`}>{children}</select>;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", rows = 3, ...props }, ref) {
  const field = useFieldControl();
  return <textarea ref={ref} rows={rows} {...field} {...props} className={`${controlClass} resize-y ${className}`}/>;
});

/** Ô tìm kiếm của trang danh sách: lọc trên dữ liệu đã tải, có nút xóa nhanh. */
export function SearchInput({ value, onChange, placeholder = LABELS.action.search, label = LABELS.action.search, className = "" }: {
  value: string; onChange: (value: string) => void; placeholder?: string; label?: string; className?: string;
}) {
  return <div data-ui="search" className={`relative w-full sm:max-w-xs ${className}`}>
    <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cs-muted"/>
    <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label}
      className={`${controlClass} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}/>
    {value && <button type="button" onClick={() => onChange("")} aria-label="Xóa nội dung tìm kiếm" title="Xóa nội dung tìm kiếm"
      className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-cs-muted hover:bg-cs-hover hover:text-cs-text">
      <Icon name="close" size={14}/>
    </button>}
  </div>;
}
