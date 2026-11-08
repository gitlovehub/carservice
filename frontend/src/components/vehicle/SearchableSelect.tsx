import { useId, useMemo, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { controlClass } from "../ui/fieldContext";
import { foldText } from "../../services/vehicleCatalog";

export type SelectOption = { value: number; label: string; hint?: string };

type Props = {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: number | null;
  onChange: (option: SelectOption | null) => void;
  loading?: boolean;
  /** Lỗi tải danh sách (kèm nút thử lại). */
  loadError?: string;
  onRetry?: () => void;
  /** Lỗi kiểm tra của biểu mẫu. */
  error?: string;
  disabled?: boolean;
  /** Gợi ý khi đang khóa, ví dụ "Chọn hãng xe trước". */
  disabledHint?: string;
  emptyText?: string;
  required?: boolean;
  optional?: boolean;
  /** Tên đang lưu nhưng không còn trong danh sách (đã bị ẩn) — vẫn hiển thị đúng. */
  fallbackLabel?: string;
  testId?: string;
};

/**
 * Ô chọn có tìm kiếm (combobox): gõ để lọc, ↑ ↓ Enter để chọn, Esc để đóng, nút × để bỏ chọn.
 * Lọc ngay trên danh sách đã tải (mỗi cấp chỉ vài chục mục), không phân biệt dấu/hoa thường.
 */
export function SearchableSelect({
  label, placeholder, options, value, onChange, loading, loadError, onRetry, error, disabled, disabledHint,
  emptyText = "Không có kết quả phù hợp.", required, optional, fallbackLabel, testId,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find(option => option.value === value) ?? null;
  const selectedLabel = selected?.label ?? (value !== null ? fallbackLabel ?? "" : "");
  const filtered = useMemo(() => {
    const needle = foldText(query);
    return needle ? options.filter(option => foldText(`${option.label} ${option.hint ?? ""}`).includes(needle)) : options;
  }, [options, query]);
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0));

  const isDisabled = disabled || loading;
  const describedBy = [error && `${id}-error`, (loadError || (disabled && disabledHint)) && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  function choose(option: SelectOption) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return <div className="relative flex flex-col gap-1.5" data-testid={testId}>
    <label htmlFor={id} className="text-label text-cs-text-2">
      {label}
      {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      {optional && <span className="ml-1 font-normal normal-case tracking-normal text-cs-muted">(không bắt buộc)</span>}
    </label>
    <div className="relative">
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cs-muted"/>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? `${id}-opt-${filtered[activeIndex].value}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        autoComplete="off"
        disabled={isDisabled}
        placeholder={loading ? "Đang tải…" : selectedLabel || placeholder}
        value={open ? query : selectedLabel}
        className={`${controlClass} pl-9 ${value !== null && !isDisabled ? "pr-16" : "pr-9"}`}
        onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
        onClick={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(Math.min(activeIndex + 1, Math.max(filtered.length - 1, 0))); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
          else if (event.key === "Enter" && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]); }
          else if (event.key === "Escape") { setOpen(false); setQuery(""); }
        }}
      />
      {loading
        ? <span className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-cs-border border-t-cs-accent" aria-hidden="true"/>
        : <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cs-muted"/>}
      {value !== null && !isDisabled && <button type="button" onMouseDown={event => event.preventDefault()} onClick={clear}
        aria-label={`Bỏ chọn ${label.toLowerCase()}`} title={`Bỏ chọn ${label.toLowerCase()}`}
        className="absolute right-8 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-cs-muted hover:bg-cs-hover hover:text-cs-text">
        <Icon name="close" size={14}/>
      </button>}
    </div>

    {open && !isDisabled && <ul id={listId} role="listbox" aria-label={label}
      className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-control border border-cs-border bg-cs-surface py-1 shadow-overlay">
      {filtered.length ? filtered.map((option, index) => {
        const isSelected = option.value === value;
        return <li key={option.value} id={`${id}-opt-${option.value}`} role="option" aria-selected={isSelected}
          className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-small max-sm:min-h-11 ${index === activeIndex ? "bg-cs-hover" : ""} ${isSelected ? "font-semibold text-cs-accent-text" : "text-cs-text"}`}
          onMouseEnter={() => setActive(index)}
          onMouseDown={event => { event.preventDefault(); choose(option); }}>
          <span className="min-w-0 break-words">{option.label}</span>
          {option.hint && <span className="shrink-0 text-caption text-cs-muted">{option.hint}</span>}
          {isSelected && <Icon name="check" size={14} className="shrink-0"/>}
        </li>;
      }) : <li className="px-3 py-3 text-small text-cs-muted" role="presentation">{emptyText}</li>}
    </ul>}

    {error && <p id={`${id}-error`} className="text-caption text-danger" role="alert">{error}</p>}
    {loadError
      ? <p id={`${id}-hint`} className="flex flex-wrap items-center gap-2 text-caption text-danger" role="alert">
        {loadError}
        {onRetry && <button type="button" onClick={onRetry} className="cursor-pointer font-semibold underline">Thử lại</button>}
      </p>
      : disabled && disabledHint && <p id={`${id}-hint`} className="text-caption text-cs-muted">{disabledHint}</p>}
  </div>;
}
