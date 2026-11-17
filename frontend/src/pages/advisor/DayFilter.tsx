import { useRef } from "react";
import { Icon } from "../../components/ui/Icon";
import { dmy } from "../../services/catalogAdminApi";

const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Cộng/trừ ngày trên chuỗi YYYY-MM-DD (giờ địa phương). */
const addDays = (iso: string, offset: number) => { const [y, m, d] = iso.split("-").map(Number); return isoDay(new Date(y, m - 1, d + offset)); };
const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
function dayName(iso: string) {
  const today = isoDay();
  if (iso === today) return "Hôm nay";
  if (iso === addDays(today, -1)) return "Hôm qua";
  if (iso === addDays(today, 1)) return "Ngày mai";
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/**
 * Lọc ngày: ‹ ngày trước | ngày đang xem (bấm để mở lịch chọn ngày bất kỳ) | ngày sau ›.
 * Giữa hiện "Hôm qua / Hôm nay / Ngày mai" hoặc thứ trong tuần kèm ngày.
 * `allowAll`: value "" = mọi ngày (giữa hiện "Mọi ngày", ‹ › bắt đầu từ hôm nay); có nút × để quay về mọi ngày.
 */
export function DayFilter({ value, onChange, allowAll = false, className = "" }: { value: string; onChange: (value: string) => void; allowAll?: boolean; className?: string }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  // Cao bằng ô nhập chuẩn (min-h-10, màn hẹp min-h-11) để đứng cạnh ô tìm kiếm / bộ lọc không lệch.
  const arrow = "grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-cs-text-2 transition-colors hover:bg-cs-hover hover:text-cs-text";
  const step = (offset: number) => onChange(value ? addDays(value, offset) : isoDay());
  const openPicker = () => {
    const input = pickerRef.current;
    if (!input) return;
    try { input.showPicker(); } catch { input.focus(); }
  };
  return <div role="group" aria-label="Ngày hẹn" className={`flex min-h-10 min-w-0 items-center gap-1 rounded-control border border-cs-border bg-cs-surface px-1 max-sm:min-h-11 ${className}`}>
    <button type="button" className={arrow} aria-label="Ngày trước" title="Ngày trước" onClick={() => step(-1)}><Icon name="chevron-left" size={18}/></button>
    <span className="relative min-w-0 flex-1">
      <button type="button" onClick={openPicker} title="Bấm để chọn ngày khác"
        className="flex min-h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] px-2 text-small transition-colors hover:bg-cs-hover">
        <Icon name="calendar" size={15} className="shrink-0 text-cs-accent-text"/>
        {value
          ? <span className="truncate"><b className="text-cs-text">{dayName(value)}</b><span className="text-cs-muted"> · {dmy(value)}</span></span>
          : <b className="truncate text-cs-text">Mọi ngày</b>}
      </button>
      <input ref={pickerRef} type="date" tabIndex={-1} aria-hidden="true" value={value} onChange={e => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"/>
    </span>
    {allowAll && value && <button type="button" className={arrow} aria-label="Xem mọi ngày" title="Xem mọi ngày" onClick={() => onChange("")}><Icon name="x" size={16}/></button>}
    <button type="button" className={arrow} aria-label="Ngày sau" title="Ngày sau" onClick={() => step(1)}><Icon name="chevron-right" size={18}/></button>
  </div>;
}
