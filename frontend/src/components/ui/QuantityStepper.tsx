import { useState } from "react";
import { Icon } from "./Icon";

const fmt = new Intl.NumberFormat("vi-VN");

/**
 * Ô số có nút [−] / [+] — dùng cho MỌI ô nhập số lượng (step 1) và số km (step 1000, unit "km").
 * Độ rộng cố định, không giãn theo hàng. Gõ trực tiếp được (số km hiện dấu chấm ngăn cách hàng nghìn).
 * `value = null` khi cho phép bỏ trống (allowEmpty), ví dụ mốc km không bắt buộc.
 */
export function QuantityStepper({ value, onChange, label, min = 1, max = 999, step = 1, unit, allowEmpty = false, placeholder, size = "sm", className = "", disabled = false, id }: {
  value: number | null; onChange: (value: number | null) => void; label: string;
  min?: number; max?: number; step?: number; unit?: string; allowEmpty?: boolean; placeholder?: string; size?: "sm" | "md"; className?: string; disabled?: boolean; id?: string;
}) {
  // Đang gõ: giữ bản nháp; không gõ: hiển thị theo `value` (đã định dạng).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value === null ? "" : fmt.format(value));
  const setText = setDraft;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const bump = (dir: 1 | -1) => {
    const base = value ?? (dir > 0 ? min - step : min);
    // Nhảy về bội số của bước (ví dụ 12.345 km + → 13.000 km).
    const next = dir > 0 ? Math.floor(base / step) * step + step : Math.ceil(base / step) * step - step;
    onChange(clamp(next));
  };
  const commit = (raw: string) => {
    setDraft(null);
    const digits = raw.replace(/\D/g, "");
    if (digits === "") { onChange(allowEmpty ? null : min); return; }
    onChange(clamp(Number(digits)));
  };
  const h = size === "md" ? "h-10" : "h-8";
  const btn = `grid ${size === "md" ? "w-10" : "w-8"} h-full shrink-0 cursor-pointer place-items-center text-cs-text-2 transition-colors hover:bg-cs-hover hover:text-cs-text disabled:cursor-not-allowed disabled:opacity-40`;
  const width = className.includes("w-") ? "" : unit ? "w-[168px]" : "w-[104px]";
  return <div role="group" aria-label={label} className={`inline-flex ${h} ${width} shrink-0 items-center overflow-hidden rounded-control border border-cs-border bg-cs-surface focus-within:border-cs-accent focus-within:ring-2 focus-within:ring-cs-accent/20 ${className}`}>
    <button type="button" className={btn} aria-label={`Giảm ${label}${step > 1 ? ` ${fmt.format(step)}` : ""}`} disabled={disabled || (value !== null && value <= min)} onClick={() => bump(-1)}><Icon name="minus" size={14}/></button>
    <span className="flex h-full min-w-0 flex-1 items-center border-x border-cs-border">
      <input id={id} type="text" inputMode="numeric" aria-label={label} value={text} placeholder={placeholder} disabled={disabled}
        onChange={e => setText(e.target.value.replace(/[^\d.]/g, ""))} onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
          if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
        }}
        className="h-full w-full min-w-0 bg-transparent px-1 text-center text-small font-semibold tabular-nums text-cs-text outline-none placeholder:font-normal placeholder:text-cs-muted"/>
      {unit && <span className="pr-2 text-caption text-cs-muted" aria-hidden="true">{unit}</span>}
    </span>
    <button type="button" className={btn} aria-label={`Tăng ${label}${step > 1 ? ` ${fmt.format(step)}` : ""}`} disabled={disabled || (value !== null && value >= max)} onClick={() => bump(1)}><Icon name="plus" size={14}/></button>
  </div>;
}

/**
 * Ô số km (ODO, mốc km): bước nhảy 1.000 km, hiện dấu chấm hàng nghìn, cho phép để trống.
 * Giá trị dạng chuỗi số ("" = chưa nhập) để thay trực tiếp các ô <input type="number"> cũ.
 */
export function KmInput({ value, onChange, label, placeholder = "Ví dụ: 35.000", disabled, id, className = "w-full", size = "md", max = 2_000_000 }: {
  value: string | number | null | undefined; onChange: (value: string) => void; label: string;
  placeholder?: string; disabled?: boolean; id?: string; className?: string; size?: "sm" | "md"; max?: number;
}) {
  const n = value === null || value === undefined || value === "" ? null : Number(value);
  return <QuantityStepper id={id} label={label} value={n !== null && Number.isFinite(n) ? n : null} min={0} max={max} step={1000} unit="km" allowEmpty
    placeholder={placeholder} disabled={disabled} size={size} className={className}
    onChange={v => onChange(v === null ? "" : String(v))}/>;
}