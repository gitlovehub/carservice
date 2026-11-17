import { useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { capacityApi, type CapacityBasis, type CapacityDay } from "../../services/workflowService";
import { minutesToHours } from "./workflowFormat";

const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEKDAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const dayLabel = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`; };

/** Câu giải thích công suất lấy từ đâu (hiện khi rê chuột vào phụ đề). */
function basisText(basis?: CapacityBasis | null) {
  if (!basis) return undefined;
  if (basis.type === "technicians") return `Công suất = ${basis.count} kỹ thuật viên đang làm × giờ mở cửa (${minutesToHours(basis.open_minutes)} giờ/ngày).`;
  if (basis.type === "bays") return `Công suất = ${basis.count} cầu nâng × giờ mở cửa (${minutesToHours(basis.open_minutes)} giờ/ngày).`;
  if (basis.type === "manual") return "Công suất do quản trị viên đặt trong Lịch làm việc.";
  return undefined;
}

function DayRow({ day, today }: { day: CapacityDay; today: boolean }) {
  const closed = day.capacity_minutes === 0;
  const unset = day.capacity_minutes === null;
  const capacity = day.capacity_minutes ?? 0;
  const pct = capacity ? Math.round((day.load_minutes / capacity) * 100) : 0;
  const state = closed ? "closed" : day.over_capacity ? "over" : today ? "today" : "normal";
  return <li className="adv-cap-day" data-state={state} aria-current={today ? "date" : undefined}>
    <Icon name="calendar" size={20} className="adv-cap-icon shrink-0"/>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-3">
        <b className="truncate text-small text-cs-text">{dayLabel(day.date)}{today && <span className="sr-only"> (hôm nay)</span>}</b>
        {!closed && !unset && <span className="shrink-0 text-caption tabular-nums text-cs-text-2">{minutesToHours(day.load_minutes)} / {minutesToHours(capacity)} giờ</span>}
        {unset && <span className="shrink-0 text-caption text-cs-muted">Chưa cấu hình</span>}
      </div>
      {!closed && !unset && <div className="adv-cap-track mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={day.load_minutes} aria-label={`Tải ${dayLabel(day.date)}: ${pct}%`}>
        <span style={{ width: `${Math.min(100, pct)}%` }}/>
      </div>}
    </div>
    {closed ? <span className="adv-cap-pill"><Icon name="coffee" size={15}/>Nghỉ</span>
      : !unset && <span className="adv-cap-pill tabular-nums">{pct}%{day.over_capacity && <span className="sr-only"> — quá tải</span>}</span>}
  </li>;
}

/**
 * P7: tải gara 7 ngày tới (chỉ để cân nhắc khi xác nhận lịch — không chặn). Khung thu gọn được;
 * mỗi ngày một thẻ: giờ công đã kín / công suất + thanh + %; hôm nay viền vàng, ngày nghỉ đỏ, quá tải đỏ.
 */
export function CapacityWeek() {
  const [days, setDays] = useState<CapacityDay[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    capacityApi.range(localIso(), 7).then(list => { if (active) setDays(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  // Chỉ hiện khi gara đã cấu hình năng lực cho ít nhất một ngày làm việc.
  if (!days.some(day => (day.capacity_minutes ?? 0) > 0)) return null;
  const today = localIso();
  const basis = basisText(days.find(day => day.capacity_basis && day.capacity_basis.type !== "closed")?.capacity_basis);
  return <section className="border-t border-cs-border" data-testid="capacity-week">
    <button type="button" className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-cs-hover"
      aria-expanded={open} aria-controls="capacity-week-list" onClick={() => setOpen(v => !v)}>
      <span className="adv-page-icon !h-11 !w-11 !rounded-xl" aria-hidden="true"><Icon name="calendar" size={20}/></span>
      <span className="min-w-0 flex-1">
        <b className="block text-small text-cs-text">Tải gara 7 ngày tới</b>
        <span className="block truncate text-caption text-cs-muted" title={basis}>Giờ công đã kín lịch / tổng giờ công trong ngày</span>
      </span>
      <Icon name="chevron-down" size={18} className={`shrink-0 text-cs-text-2 transition-transform ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div id="capacity-week-list" className="px-4 pb-4">
      {basis && <p className="mb-2.5 flex items-start gap-1.5 text-caption text-cs-muted"><Icon name="info" size={13} className="mt-0.5 shrink-0"/>{basis}</p>}
      <ul className="space-y-2">{days.map(day => <DayRow key={day.date} day={day} today={day.date === today}/>)}</ul>
    </div>}
  </section>;
}
