import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { LABELS } from "../../config/labels";
import { Icon } from "./Icon";
import { FieldContext, controlClass, useFieldControl } from "./fieldContext";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Nhãn + ô nhập + gợi ý + lỗi. Ô nhập bên trong (<Input>/<Select>/<Textarea>) tự nhận id và aria. */
export function Field({ label, hint, error, required, optional, className = "", children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return <FieldContext.Provider value={{ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required }}>
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-label text-cs-text-2">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        {optional && <span className="ml-1 font-normal normal-case tracking-normal text-cs-muted">({LABELS.form.optional})</span>}
      </label>
      {children}
      {error ? <p id={errorId} className="text-caption text-danger" role="alert">{error}</p>
        : hint ? <p id={hintId} className="text-caption text-cs-muted">{hint}</p> : null}
    </div>
  </FieldContext.Provider>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...props }, ref) {
  const field = useFieldControl();
  return <input ref={ref} {...field} {...props} className={`${controlClass} ${className}`}/>;
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
