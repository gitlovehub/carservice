import { useRef } from "react";
import { Icon } from "../../components/ui/Icon";
import { isTodayRange, isoDay, rangeLabel, shiftRange, todayRange, type RangeMode, type TimeRange } from "./timeRange";

const MODES: Array<{ id: RangeMode; label: string }> = [
  { id: "day", label: "Ngày" }, { id: "week", label: "7 ngày" }, { id: "month", label: "Tháng" },
  { id: "custom", label: "Tùy chỉnh" }, { id: "all", label: "Tất cả" },
];
// Mọi control cao 40px (màn hẹp 44px), hover chỉ đổi màu — không dịch chuyển / phóng to.
const box = "inline-flex min-h-10 items-center rounded-control border border-cs-border bg-cs-surface max-sm:min-h-11";
const navBtn = "grid min-h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-control border border-cs-border bg-cs-surface text-cs-text-2 transition-colors hover:border-cs-border-strong hover:bg-cs-hover hover:text-cs-text max-sm:min-h-11 max-sm:w-11";
const dateInput = "min-h-10 rounded-control border border-cs-border bg-cs-surface px-3 text-small tabular-nums text-cs-text transition-colors hover:border-cs-border-strong focus:border-cs-accent focus:outline-none max-sm:min-h-11";

/**
 * Thanh lọc thời gian trang Lịch hẹn: [Ngày | 7 ngày | Tháng | Tùy chỉnh | Tất cả]  ·  [‹] [📅 nhãn] [›] [Hôm nay].
 * Bấm nhãn ở giữa → mở lịch chọn ngày. Tùy chỉnh → hai ô Từ ngày / Đến ngày.
 */
export function TimeRangeBar({ value, onChange }: { value: TimeRange; onChange: (value: TimeRange) => void }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => { const input = pickerRef.current; if (!input) return; try { input.showPicker(); } catch { input.focus(); } };
  const setMode = (mode: RangeMode) => {
    if (mode === value.mode) return;
    const today = isoDay();
    // Ngày bắt đầu khi đổi chế độ: từ Tùy chỉnh lấy "Từ ngày"; từ Tháng lấy hôm nay nếu cùng tháng, không thì ngày 1.
    const start = value.mode === "custom" ? value.from
      : value.mode === "month" ? (today.slice(0, 7) === value.anchor.slice(0, 7) ? today : value.anchor)
      : value.anchor;
    if (mode === "month") onChange({ ...value, mode, anchor: `${start.slice(0, 7)}-01` });
    else if (mode === "custom") onChange({ ...value, mode, from: start, to: start });
    else onChange({ ...value, mode, anchor: start });
  };
  const navigable = value.mode === "day" || value.mode === "week" || value.mode === "month";

  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cs-border p-2">
    <div role="radiogroup" aria-label="Khoảng thời gian" className={`${box} max-w-full gap-0.5 overflow-x-auto p-1`}>
      {MODES.map(m => <button key={m.id} type="button" role="radio" aria-checked={value.mode === m.id} onClick={() => setMode(m.id)}
        className={`min-h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-[8px] px-3.5 text-small font-semibold transition-colors sm:px-4 ${value.mode === m.id
          ? "bg-cs-accent text-cs-accent-contrast"
          : "text-cs-text-2 hover:bg-cs-hover hover:text-cs-text"}`}>{m.label}</button>)}
    </div>

    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {navigable && <>
        <button type="button" className={navBtn} aria-label="Trước" title="Trước" onClick={() => onChange(shiftRange(value, -1))}><Icon name="chevron-left" size={18}/></button>
        <span className="relative">
          <button type="button" onClick={openPicker} title="Bấm để chọn ngày"
            className={`${box} min-w-[190px] cursor-pointer justify-center gap-2 px-4 text-small font-semibold tabular-nums text-cs-text transition-colors hover:border-cs-border-strong hover:bg-cs-hover sm:min-w-[230px]`}>
            <Icon name="calendar" size={16} className="shrink-0 text-cs-accent-text"/>{rangeLabel(value)}
          </button>
          <input ref={pickerRef} type="date" tabIndex={-1} aria-hidden="true" value={value.anchor}
            onChange={e => e.target.value && onChange({ ...value, anchor: value.mode === "month" ? `${e.target.value.slice(0, 7)}-01` : e.target.value })}
            className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"/>
        </span>
        <button type="button" className={navBtn} aria-label="Sau" title="Sau" onClick={() => onChange(shiftRange(value, 1))}><Icon name="chevron-right" size={18}/></button>
      </>}
      {value.mode === "custom" && <span className="flex flex-wrap items-center gap-2 text-small text-cs-muted">
        <label className="flex items-center gap-2">Từ <input type="date" className={dateInput} value={value.from} max={value.to || undefined} onChange={e => e.target.value && onChange({ ...value, from: e.target.value })}/></label>
        <label className="flex items-center gap-2">đến <input type="date" className={dateInput} value={value.to} min={value.from || undefined} onChange={e => e.target.value && onChange({ ...value, to: e.target.value })}/></label>
      </span>}
      {value.mode === "all" && <span className="px-2 text-small text-cs-muted">Toàn bộ lịch hẹn, không giới hạn thời gian</span>}
      {/* Đang xem hôm nay → nút mờ, không bấm được; xem ngày / khoảng khác → nút sáng (vàng) để quay về hôm nay. */}
      <button type="button" onClick={() => onChange(todayRange())} disabled={isTodayRange(value)}
        title={isTodayRange(value) ? "Đang xem hôm nay" : "Quay về hôm nay"}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-control border px-4 text-small font-semibold transition-colors max-sm:min-h-11 ${isTodayRange(value)
          ? "cursor-not-allowed border-cs-border bg-cs-surface text-cs-muted opacity-60"
          : "cursor-pointer border-cs-accent bg-cs-accent text-cs-accent-contrast hover:bg-cs-accent-hover"}`}>Hôm nay</button>
    </div>
  </div>;
}
