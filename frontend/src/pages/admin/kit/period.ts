import { useState } from "react";

export type PeriodPreset = "all" | "today" | "yesterday" | "7d" | "week" | "month" | "custom";
export type PeriodValue = { preset: PeriodPreset; from: string; to: string };
export type PeriodRange = { date_from?: string; date_to?: string };
export type PeriodUnit = "day" | "week" | "month" | "quarter" | "year";
export type DayRange = { from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const displayDay = (iso: string) => iso.split("-").reverse().join("/");
const addDays = (iso: string, days: number) => { const d = parseDay(iso); return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)); };
const span = (start: Date, end: Date): DayRange => ({ from: isoDay(start), to: isoDay(end) });
const dayCount = (from: string, to: string) => Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000) + 1;
const monthCount = (from: string, to: string) => {
  const f = parseDay(from), t = parseDay(to);
  return (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() + 1;
};

/** Kỳ trọn vẹn (ngày / tuần thứ Hai–Chủ nhật / tháng / quý / năm) chứa một ngày. */
export function unitRange(unit: PeriodUnit, iso: string): DayRange {
  const date = parseDay(iso);
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  switch (unit) {
    case "week": { const monday = d - ((date.getDay() + 6) % 7); return span(new Date(y, m, monday), new Date(y, m, monday + 6)); }
    case "month": return span(new Date(y, m, 1), new Date(y, m + 1, 0));
    case "quarter": { const first = m - (m % 3); return span(new Date(y, first, 1), new Date(y, first + 3, 0)); }
    case "year": return span(new Date(y, 0, 1), new Date(y, 11, 31));
    default: return { from: iso, to: iso };
  }
}

/** Nhận ra khoảng ngày đang là tuần, tháng, quý hay năm trọn vẹn để mở đúng tab và đặt nhãn. */
export function detectUnit({ from, to }: DayRange): PeriodUnit {
  const start = parseDay(from);
  if (start.getDate() === 1 && parseDay(addDays(to, 1)).getDate() === 1) {
    const months = monthCount(from, to);
    if (start.getMonth() === 0 && months % 12 === 0) return "year";
    if (start.getMonth() % 3 === 0 && months % 3 === 0) return "quarter";
    return "month";
  }
  return start.getDay() === 1 && dayCount(from, to) % 7 === 0 ? "week" : "day";
}

/** Dịch cả khoảng sang kỳ trước / sau có cùng độ dài. */
export function shiftRange(range: DayRange, direction: -1 | 1): DayRange {
  const unit = detectUnit(range);
  if (unit === "day" || unit === "week") {
    const days = dayCount(range.from, range.to) * direction;
    return { from: addDays(range.from, days), to: addDays(range.to, days) };
  }
  const months = monthCount(range.from, range.to);
  const start = parseDay(range.from);
  const moved = new Date(start.getFullYear(), start.getMonth() + months * direction, 1);
  return span(moved, new Date(moved.getFullYear(), moved.getMonth() + months, 0));
}

/** Nhãn ngắn của khoảng đang chọn: "Tháng 11/2026", "Quý 4/2026", "01/11/2026 – 07/11/2026". */
export function rangeLabel(range: DayRange, now = new Date()): string {
  const { from, to } = range;
  const today = isoDay(now);
  if (from === to) {
    if (from === today) return `Hôm nay · ${displayDay(from)}`;
    if (from === addDays(today, -1)) return `Hôm qua · ${displayDay(from)}`;
    return displayDay(from);
  }
  const f = parseDay(from), t = parseDay(to);
  const unit = detectUnit(range);
  const months = monthCount(from, to);
  const quarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1;
  if (unit === "year") return months === 12 ? `Năm ${f.getFullYear()}` : `Năm ${f.getFullYear()} – ${t.getFullYear()}`;
  if (unit === "quarter") return months === 3 ? `Quý ${quarter(f)}/${f.getFullYear()}` : `Quý ${quarter(f)}/${f.getFullYear()} – Quý ${quarter(t)}/${t.getFullYear()}`;
  if (unit === "month") return months === 1 ? `Tháng ${pad(f.getMonth() + 1)}/${f.getFullYear()}` : `Tháng ${pad(f.getMonth() + 1)}/${f.getFullYear()} – ${pad(t.getMonth() + 1)}/${t.getFullYear()}`;
  return `${displayDay(from)} – ${displayDay(to)}`;
}

/** Các lựa chọn nhanh của từng tab. */
export function quickRanges(unit: PeriodUnit, now = new Date()): Array<{ label: string; range: DayRange }> {
  const today = isoDay(now);
  const back = (u: PeriodUnit, steps: number) => {
    let current = unitRange(u, today);
    for (let i = 0; i < steps; i++) current = shiftRange(current, -1);
    return current;
  };
  const recent = (u: PeriodUnit, count: number) => ({ from: back(u, count - 1).from, to: unitRange(u, today).to });
  switch (unit) {
    case "week": return [{ label: "Tuần này", range: back("week", 0) }, { label: "Tuần trước", range: back("week", 1) }, { label: "4 tuần gần đây", range: recent("week", 4) }];
    case "month": return [{ label: "Tháng này", range: back("month", 0) }, { label: "Tháng trước", range: back("month", 1) }, { label: "3 tháng gần đây", range: recent("month", 3) }, { label: "6 tháng gần đây", range: recent("month", 6) }];
    case "quarter": return [{ label: "Quý này", range: back("quarter", 0) }, { label: "Quý trước", range: back("quarter", 1) }];
    case "year": return [{ label: "Năm nay", range: back("year", 0) }, { label: "Năm trước", range: back("year", 1) }, { label: "3 năm gần đây", range: recent("year", 3) }];
    default: return [
      { label: "Hôm nay", range: { from: today, to: today } }, { label: "Hôm qua", range: { from: addDays(today, -1), to: addDays(today, -1) } },
      { label: "7 ngày qua", range: { from: addDays(today, -6), to: today } }, { label: "30 ngày qua", range: { from: addDays(today, -29), to: today } },
    ];
  }
}

/** Đổi lựa chọn kỳ thành khoảng ngày gửi API (`date_from`, `date_to`). Tùy chỉnh chọn ngược thì tự đảo lại. */
export function periodRange({ preset, from, to }: PeriodValue, now = new Date()): PeriodRange {
  const today = isoDay(now);
  const send = (range: DayRange) => ({ date_from: range.from, date_to: range.to });
  switch (preset) {
    case "today": return send({ from: today, to: today });