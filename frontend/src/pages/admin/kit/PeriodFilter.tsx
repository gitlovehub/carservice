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
    if (!rect) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(POPOVER_WIDTH, viewportWidth - 16);
    // Đủ chỗ thì canh trái theo nút, nút nằm sát phải thì canh phải theo nút.
    const preferred = rect.left + width <= viewportWidth - 8 ? rect.left : rect.right - width;
    const left = Math.min(Math.max(8, preferred), viewportWidth - width - 8);
    // Luôn bám sát nút, không che header: thiếu chỗ thì nội dung tự cuộn bên trong.
    const spaceBelow = window.innerHeight - rect.bottom - 14;
    const spaceAbove = rect.top - 14;
    setPosition(spaceBelow >= MIN_SPACE_BELOW || spaceBelow >= spaceAbove
      ? { top: rect.bottom + 6, left, width, maxHeight: spaceBelow }
      : { bottom: window.innerHeight - rect.top + 6, left, width, maxHeight: spaceAbove });
  };
  const close = (returnFocus = true) => {
    setDraft(null);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const open = () => {
    place();
    const unit = applied ? detectUnit(applied) : "month";
    setDraft({ unit, from: applied?.from ?? "", to: applied?.to ?? "", all: !applied, picking: false, custom: false, cursor: parseDay(applied?.from ?? today) });
  };

  const isOpen = draft !== null;
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus({ preventScroll: true });
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.closest("[data-period-trigger]")?.contains(target)) setDraft(null);
    };
    const onScroll = (event: Event) => { if (!panelRef.current?.contains(event.target as Node)) setDraft(null); };
    const onResize = () => setDraft(null);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  const pickCell = (cell: DayRange) => {
    if (!draft) return;
    setDraft(draft.picking
      ? { ...draft, from: cell.from < draft.from ? cell.from : draft.from, to: cell.to > draft.to ? cell.to : draft.to, picking: false, all: false, custom: false }
      : { ...draft, from: cell.from, to: cell.to, picking: true, all: false, custom: false });
  };
  const moveCursor = (direction: -1 | 1) => {
    if (!draft) return;
    const c = draft.cursor;
    const cursor = draft.unit === "day" || draft.unit === "week" ? new Date(c.getFullYear(), c.getMonth() + direction, 1)
      : new Date(c.getFullYear() + direction * (draft.unit === "year" ? 12 : 1), c.getMonth(), 1);
    setDraft({ ...draft, cursor });
  };

  const hasRange = !!draft?.from && !!draft.to;
  const reversed = hasRange && draft.to < draft.from;
  const canApply = !!draft && (draft.all || (hasRange && !reversed));
  const apply = () => {
    if (!draft || !canApply) return;
    change(draft.all ? { preset: "all", from: "", to: "" } : { preset: "custom", from: draft.from, to: draft.to });
    close();
  };

  const cellClass = (cell: DayRange, muted = false) => {
    const blocked = !!maxDay && cell.from > maxDay;
    const inRange = !!draft && !draft.all && hasRange && cell.from >= draft.from && cell.to <= draft.to;
    const edge = inRange && (cell.from === draft.from || cell.to === draft.to);
    if (blocked) return "cursor-not-allowed text-cs-muted opacity-40";
    if (edge) return "cursor-pointer bg-cs-accent font-semibold text-cs-accent-contrast hover:bg-cs-accent-hover";
    if (inRange) return "cursor-pointer bg-cs-soft font-medium text-cs-accent-text hover:bg-cs-soft-hover";
    return `cursor-pointer hover:bg-cs-soft-hover hover:text-cs-on-soft ${muted ? "text-cs-muted" : "text-cs-text"}`;
  };
  const gridCell = (key: string, label: string, cell: DayRange) => <button key={key} type="button" disabled={!!maxDay && cell.from > maxDay} onClick={() => pickCell(cell)}
    className={`h-10 rounded-control border border-cs-border text-small tabular-nums transition-colors ${cellClass(cell)}`}>{label}</button>;

  const picker = () => {
    if (!draft) return null;
    const y = draft.cursor.getFullYear();
    if (draft.unit === "month") return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => gridCell(`m${m}`, `T${m + 1}`, unitRange("month", isoDay(new Date(y, m, 1)))))}
    </div>;
    if (draft.unit === "quarter") return <div className="grid grid-cols-2 gap-2">
      {[0, 1, 2, 3].map(q => gridCell(`q${q}`, `Quý ${q + 1}`, unitRange("quarter", isoDay(new Date(y, q * 3, 1)))))}
    </div>;
    if (draft.unit === "year") {
      const first = Math.floor(y / 12) * 12;
      return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => gridCell(`y${i}`, String(first + i), unitRange("year", isoDay(new Date(first + i, 0, 1)))))}
      </div>;
    }
    const weeks = monthWeeks(draft.cursor);
    return <div>
      <div className="grid grid-cols-7 text-center text-caption font-semibold text-cs-muted">{WEEKDAYS.map(d => <span key={d} className="py-1">{d}</span>)}</div>
      <div className="grid gap-0.5">
        {weeks.map(days => {
          const outside = (d: Date) => d.getMonth() !== draft.cursor.getMonth();
          if (draft.unit === "week") {
            const cell = unitRange("week", isoDay(days[0]));
            return <button key={cell.from} type="button" disabled={!!maxDay && cell.from > maxDay} onClick={() => pickCell(cell)} aria-label={`Tuần ${rangeLabel(cell)}`}