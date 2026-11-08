import { useEffect, useState } from "react";
import { capacityApi, type CapacityDay } from "../../services/workflowService";

/** P7: tải gara 7 ngày tới theo phút (chỉ để cân nhắc khi xác nhận lịch — không chặn). */
export function CapacityWeek() {
  const [days, setDays] = useState<CapacityDay[]>([]);
  useEffect(() => {
    let active = true;
    capacityApi.range(new Date().toISOString().slice(0, 10), 7).then(list => { if (active) setDays(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  // Chỉ hiện khi gara đã cấu hình năng lực cho ít nhất một ngày làm việc.
  if (!days.some(day => (day.capacity_minutes ?? 0) > 0)) return null;
  return <div className="mt-5 border-t border-cs-border pt-4" data-testid="capacity-week">
    <h3 className="text-sm font-bold text-cs-text">Tải gara 7 ngày tới</h3>
    <ul className="mt-2 space-y-1.5">{days.map(day => {
      const ratio = day.capacity_minutes ? Math.min(1, day.load_minutes / day.capacity_minutes) : 0;
      return <li key={day.date} className="text-xs text-cs-text">
        <div className="flex justify-between gap-2"><span>{new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
          <span className={day.over_capacity ? "font-bold text-cs-danger" : "text-cs-muted"}>{day.capacity_minutes === null ? "chưa cấu hình" : day.capacity_minutes === 0 ? "nghỉ" : `${day.load_minutes}/${day.capacity_minutes} phút${day.over_capacity ? " · quá tải" : ""}`}</span></div>
        {!!day.capacity_minutes && <div className="mt-1 h-1.5 rounded-full bg-cs-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={day.capacity_minutes} aria-valuenow={day.load_minutes} aria-label={`Tải ${day.date}`}><div className={`h-1.5 rounded-full ${day.over_capacity ? "bg-cs-danger" : "bg-cs-accent"}`} style={{ width: `${Math.round(ratio * 100)}%` }}/></div>}
      </li>;
    })}</ul>
  </div>;
}
