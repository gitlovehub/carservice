import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, DateInput, Field, IconButton } from "../../../components/ui";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { useOverlayArea } from "../../../components/ui/useOverlayArea";
import { detectUnit, isoDay, parseDay, quickRanges, rangeLabel, shiftRange, unitRange, type DayRange, type PeriodState, type PeriodUnit } from "./period";

const UNITS: Array<{ id: PeriodUnit; label: string; icon: IconName }> = [
  { id: "day", label: "Ngày", icon: "calendar" }, { id: "week", label: "Tuần", icon: "calendar" }, { id: "month", label: "Tháng", icon: "calendar" },
  { id: "quarter", label: "Quý", icon: "calendar" }, { id: "year", label: "Năm", icon: "calendar" },
];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const PICK_TITLE: Record<PeriodUnit, string> = { day: "Chọn ngày", week: "Chọn tuần", month: "Chọn tháng", quarter: "Chọn quý", year: "Chọn năm" };
const POPOVER_WIDTH = 640;
/** Dưới nút còn ít hơn mức này và phía trên rộng hơn thì mở lên trên. */
const MIN_SPACE_BELOW = 340;

type Draft = { unit: PeriodUnit; from: string; to: string; all: boolean; picking: boolean; custom: boolean; cursor: Date };

/** Các tuần (thứ Hai–Chủ nhật) phủ kín một tháng. */
function monthWeeks(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  for (let monday = start; monday <= last; monday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
  }
  return weeks;
}

/**
 * Bộ lọc thời gian dùng chung của Admin: popover 5 tab Ngày, Tuần, Tháng, Quý, Năm.
 * Bấm hai ô để chọn nhiều kỳ liên tiếp. Chỉ lọc khi bấm Áp dụng; hai mũi tên chuyển sang kỳ trước / sau ngay.
 * `allowFuture`: cho chọn ngày tương lai (lịch hẹn). `allowAll`: có lựa chọn Tất cả thời gian.
 */
export function PeriodFilter({ period, allowAll = true, allowFuture = false }: { period: PeriodState; allowAll?: boolean; allowFuture?: boolean }) {
  const { params, change } = period;
  const area = useOverlayArea();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ top: 0, left: 0, width: POPOVER_WIDTH, maxHeight: 560 });
  const today = isoDay(new Date());
  const maxDay = allowFuture ? undefined : today;
  const applied: DayRange | null = params.date_from && params.date_to ? { from: params.date_from, to: params.date_to } : null;
  const nextRange = applied ? shiftRange(applied, 1) : null;

  const place = () => {
    const rect = triggerRef.current?.closest("[data-period-trigger]")?.getBoundingClientRect();