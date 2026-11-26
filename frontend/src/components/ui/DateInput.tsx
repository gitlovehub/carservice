import { useRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { controlClass, useFieldControl } from "./fieldContext";

type DateChange = { target: { value: string } };
type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "max"> & {
  /** Giá trị dạng YYYY-MM-DD, trống = chưa chọn. */
  value: string; min?: string; max?: string; onChange: (event: DateChange) => void; wrapperClassName?: string;
};

const toDisplay = (iso: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};
const maskDate = (text: string) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
};
const toIso = (text: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

/**
 * Ô ngày luôn hiển thị dd/mm/yyyy, không phụ thuộc ngôn ngữ trình duyệt (khác <input type="date">).
 * Gõ số là tự thêm dấu "/", hoặc bấm biểu tượng lịch. Chỉ báo thay đổi khi đã đủ một ngày hợp lệ.
 */
export function DateInput({ value, min, max, onChange, className = "", wrapperClassName = "", disabled, onBlur, ...props }: DateInputProps) {
  const field = useFieldControl();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => toDisplay(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) { setLastValue(value); setText(toDisplay(value)); }

  const iso = toIso(text);
  const outOfRange = !!iso && ((!!min && iso < min) || (!!max && iso > max));
  const invalid = text.length === 10 && (!iso || outOfRange);
  const openPicker = () => { const input = pickerRef.current; if (!input) return; try { input.showPicker(); } catch { input.focus(); } };
  const type = (raw: string) => {
    const next = maskDate(raw);
    setText(next);
    const parsed = toIso(next);
    if (!next) onChange({ target: { value: "" } });
    else if (parsed && (!min || parsed >= min) && (!max || parsed <= max)) onChange({ target: { value: parsed } });
  };

  return <span className={`relative block w-full ${wrapperClassName}`}>
    <input {...field} {...props} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/yyyy" maxLength={10} disabled={disabled} value={text}
      aria-invalid={invalid || field?.["aria-invalid"] ? true : undefined} title={outOfRange ? "Ngày nằm ngoài khoảng cho phép" : invalid ? "Ngày không hợp lệ" : undefined}
      onChange={event => type(event.target.value)}
      onBlur={event => { if (text !== toDisplay(value)) setText(toDisplay(value)); onBlur?.(event); }}
      className={`${controlClass} pr-10 tabular-nums ${className}`}/>
    <button type="button" disabled={disabled} onClick={openPicker} aria-label="Mở lịch chọn ngày" title="Mở lịch chọn ngày"
      className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-cs-muted transition-colors hover:bg-cs-hover hover:text-cs-text disabled:cursor-not-allowed disabled:opacity-50">
      <Icon name="calendar" size={15}/>
    </button>
    <input ref={pickerRef} type="date" tabIndex={-1} aria-hidden="true" value={value} min={min} max={max} disabled={disabled}
      onChange={event => { if (event.target.value) onChange({ target: { value: event.target.value } }); }}
      className="pointer-events-none absolute bottom-0 right-2 h-px w-px opacity-0"/>
  </span>;
}

/** Giờ + ngày (giờ trước, ngày sau). Giá trị dạng YYYY-MM-DDTHH:mm; chưa nhập giờ thì lấy 23:59 của ngày đã chọn. */
export function DateTimeInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [date, savedTime = ""] = value.split("T");
  const [time, setTime] = useState(savedTime);
  const validTime = (text: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
  const typeTime = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const next = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    setTime(next);
    if (date && validTime(next)) onChange(`${date}T${next}`);
  };
  return <span className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
    <input type="text" inputMode="numeric" placeholder="HH:mm" aria-label="Giờ" maxLength={5} disabled={disabled} value={time} aria-invalid={time.length === 5 && !validTime(time) ? true : undefined}
      onChange={event => typeTime(event.target.value)} className={`${controlClass} tabular-nums`}/>
    <DateInput aria-label="Ngày" value={date ?? ""} disabled={disabled}
      onChange={event => onChange(event.target.value ? `${event.target.value}T${validTime(time) ? time : "23:59"}` : "")}/>
  </span>;
}
