/** Khoảng thời gian lọc lịch hẹn (trang Lịch hẹn cố vấn). Ngày dạng YYYY-MM-DD theo giờ máy (giờ gara). */
export type RangeMode = "day" | "week" | "month" | "custom" | "all";
export type TimeRange = { mode: RangeMode; anchor: string; from: string; to: string };

export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso: string, days: number) => { const d = parse(iso); return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)); };
const addMonths = (iso: string, months: number) => { const d = parse(iso); return isoDay(new Date(d.getFullYear(), d.getMonth() + months, 1)); };
const dm = (iso: string) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const dmy = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
/** Thứ Hai của tuần chứa ngày `iso` (tuần Thứ Hai → Chủ nhật). */
export const weekStart = (iso: string) => addDays(iso, -((parse(iso).getDay() + 6) % 7));
const WEEKDAYS =["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export const todayRange = (): TimeRange => { const t = isoDay(); return { mode: "day", anchor: t, from: t, to: t }; };

/** Giới hạn gửi lên API (?date_from=&date_to=). "Tất cả" → không giới hạn. */
export function rangeBounds(r: TimeRange): { date_from: string; date_to: string } {
  switch (r.mode) {
    case "day": return { date_from: r.anchor, date_to: r.anchor };
    case "week": { const from = weekStart(r.anchor); return { date_from: from, date_to: addDays(from, 6) }; }
    case "month": { const first = addMonths(r.anchor, 0); return { date_from: first, date_to: addDays(addMonths(first, 1), -1) }; }
    case "custom": return r.from <= r.to ? { date_from: r.from, date_to: r.to } : { date_from: r.to, date_to: r.from };
    default: return { date_from: "", date_to: "" };
  }
}

/** ‹ › : lùi / tiến 1 ngày, 1 tuần hoặc 1 tháng tuỳ chế độ. */
export function shiftRange(r: TimeRange, dir: -1 | 1): TimeRange {
  if (r.mode === "day") return { ...r, anchor: addDays(r.anchor, dir) };
  if (r.mode === "week") return { ...r, anchor: addDays(weekStart(r.anchor), 7 * dir) };
  if (r.mode === "month") return { ...r, anchor: addMonths(r.anchor, dir) };
  return r;
}

/** Nhãn ở giữa bộ điều hướng. */
export function rangeLabel(r: TimeRange): string {
  if (r.mode === "day") return `${WEEKDAYS[parse(r.anchor).getDay()]}, ${dmy(r.anchor)}`;
  if (r.mode === "week") {
    const from = weekStart(r.anchor);
    return from === weekStart(isoDay()) ? `Tuần này · ${dm(from)} – ${dmy(addDays(from, 6))}` : `${dm(from)} – ${dmy(addDays(from, 6))}`;
  }
  if (r.mode === "month") { const [y, m] = r.anchor.split("-"); return `Tháng ${Number(m)}/${y}`; }
  return "";
}

/** Đang xem đúng "hôm nay" (để tô nút Hôm nay). */
export const isTodayRange = (r: TimeRange) => r.mode === "day" && r.anchor === isoDay();
