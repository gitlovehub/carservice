import { useEffect, useState } from "react";

const TZ = "Asia/Ho_Chi_Minh";
const MODE_KEY = "carservice-clock-24h";
const MODE_EVENT = "carservice-clock-mode";
export const clockDateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
// en-US để có "AM/PM" (vi-VN hiển thị "SA/CH"); 24 giờ dùng hourCycle h23 để 0 giờ hiện "00" chứ không "24".
const timeFmt12 = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
const timeFmt24 = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function readMode(): boolean {
  try { return localStorage.getItem(MODE_KEY) === "1"; } catch { return false; }
}

/** Thời điểm hiện tại, cập nhật đúng đầu mỗi giây. */
export function useSecondTick() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = window.setTimeout(function tick() {
      setNow(new Date());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Chế độ 12/24 giờ dùng chung mọi đồng hồ (nhớ trên trình duyệt; đổi một chỗ thì chỗ khác đổi theo). */
export function useClockMode() {
  const [is24h, setIs24h] = useState(readMode);
  useEffect(() => {
    const sync = () => setIs24h(readMode());
    window.addEventListener(MODE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(MODE_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const toggle = () => {
    const next = !readMode();
    try { localStorage.setItem(MODE_KEY, next ? "1" : "0"); } catch { /* chỉ là tiện ích, không nhớ được cũng không sao */ }
    setIs24h(next);
    window.dispatchEvent(new Event(MODE_EVENT));
  };
  return { is24h, toggle };
}

/** Giờ Việt Nam: { time: "10:15:32", period: "PM" | "" }. */
export function formatClock(now: Date, is24h: boolean) {
  if (is24h) return { time: timeFmt24.format(now), period: "" };
  const parts = timeFmt12.formatToParts(now);
  return {
    time: parts.filter(p => p.type !== "dayPeriod").map(p => p.value).join("").trim(),
    period: parts.find(p => p.type === "dayPeriod")?.value.toUpperCase() ?? "",
  };
}
