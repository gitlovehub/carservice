import { Icon } from "../components/ui/Icon";
import { clockDateFmt, formatClock, useClockMode, useSecondTick } from "./clock";

/**
 * Đồng hồ trên thanh trên cùng (cạnh nút sáng/tối): chạy theo giây, luôn theo giờ Việt Nam
 * (không phụ thuộc múi giờ máy). Bấm để đổi 12 giờ (AM/PM) ↔ 24 giờ; lựa chọn được nhớ trên trình duyệt.
 * Component riêng để mỗi giây chỉ vẽ lại đồng hồ, không vẽ lại cả shell.
 */
export function LiveClock() {
  const now = useSecondTick();
  const { is24h, toggle } = useClockMode();
  const date = clockDateFmt.format(now);
  const dateLabel = date.charAt(0).toUpperCase() + date.slice(1);
  const { time, period } = formatClock(now, is24h);
  const text = period ? `${time} ${period}` : time;
  return <button type="button" className="cs-ws-clock" onClick={toggle}
    title={`${dateLabel} · giờ Việt Nam — bấm để chuyển sang ${is24h ? "12 giờ (AM/PM)" : "24 giờ"}`}
    aria-label={`${text}, ${dateLabel}. Bấm để chuyển sang định dạng ${is24h ? "12 giờ" : "24 giờ"}`}>
    <Icon name="calendar" size={15}/>
    <span className="cs-ws-clock-date">{dateLabel}</span>
    <span className="cs-ws-clock-sep" aria-hidden="true"/>
    <Icon name="clock" size={15}/>
    <time className="cs-ws-clock-time" dateTime={now.toISOString()}>{text}</time>
  </button>;
}
