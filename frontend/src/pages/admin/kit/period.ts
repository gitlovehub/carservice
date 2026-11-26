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