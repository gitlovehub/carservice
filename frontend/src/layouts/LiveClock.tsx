import { useEffect, useState } from "react";
import { Icon } from "../components/ui/Icon";

const TZ = "Asia/Ho_Chi_Minh";
const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
// en-US để có "AM/PM" (vi-VN hiển thị "SA/CH").
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

/**
 * Đồng hồ trên thanh trên cùng (cạnh nút sáng/tối): chạy theo giây, luôn theo giờ Việt Nam
 * (không phụ thuộc múi giờ máy), dạng 12 giờ AM/PM; rê chuột xem thứ, ngày.
 * Component riêng để mỗi giây chỉ vẽ lại đồng hồ, không vẽ lại cả shell.
 */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Căn tick vào đầu mỗi giây để không lệch nhịp.
    let timer = window.setTimeout(function tick() {
      setNow(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const date = dateFmt.format(now);
  const dateLabel = date.charAt(0).toUpperCase() + date.slice(1);
  const time = timeFmt.format(now);
  return <time className="cs-ws-clock" dateTime={now.toISOString()} title={`${dateLabel} · giờ Việt Nam`} aria-label={`${time}, ${dateLabel}`}>
    <Icon name="clock" size={15}/>
    <span>{time}</span>
  </time>;
}
