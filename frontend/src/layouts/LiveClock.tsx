import { useEffect, useState } from "react";
import { Icon } from "../components/ui/Icon";

const TZ = "Asia/Ho_Chi_Minh";
const MODE_KEY = "carservice-clock-24h";
const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
// en-US để có "AM/PM" (vi-VN hiển thị "SA/CH"); 24 giờ dùng hourCycle h23 để 0 giờ hiện "00" chứ không "24".
const timeFmt12 = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
const timeFmt24 = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function readMode(): boolean {
  try { return localStorage.getItem(MODE_KEY) === "1"; } catch { return false; }
}

/**
 * Đồng hồ trên thanh trên cùng (cạnh nút sáng/tối): chạy theo giây, luôn theo giờ Việt Nam
 * (không phụ thuộc múi giờ máy). Bấm để đổi 12 giờ (AM/PM) ↔ 24 giờ; lựa chọn được nhớ trên trình duyệt.
 * Component riêng để mỗi giây chỉ vẽ lại đồng hồ, không vẽ lại cả shell.
 */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [is24h, setIs24h] = useState(readMode);
  useEffect(() => {
    // Căn tick vào đầu mỗi giây để không lệch nhịp.
    let timer = window.setTimeout(function tick() {
      setNow(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const toggle = () => setIs24h(current => {
    const next = !current;
    try { localStorage.setItem(MODE_KEY, next ? "1" : "0"); } catch { /* chỉ là tiện ích, không nhớ được cũng không sao */ }
    return next;
  });

  const date = dateFmt.format(now);
  const dateLabel = date.charAt(0).toUpperCase() + date.slice(1);
  const time = (is24h ? timeFmt24 : timeFmt12).format(now);
  return <button type="button" className="cs-ws-clock" onClick={toggle}
    title={`${dateLabel} · giờ Việt Nam — bấm để chuyển sang ${is24h ? "12 giờ (AM/PM)" : "24 giờ"}`}
    aria-label={`${time}, ${dateLabel}. Bấm để chuyển sang định dạng ${is24h ? "12 giờ" : "24 giờ"}`}>
    <Icon name="clock" size={15}/>
    <time dateTime={now.toISOString()}>{time}</time>
  </button>;
}
