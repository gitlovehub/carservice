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
              className={`grid h-8 grid-cols-7 place-items-center rounded-control text-small tabular-nums transition-colors ${cellClass(cell)}`}>
              {days.map(d => <span key={isoDay(d)} className={outside(d) ? "opacity-50" : ""}>{d.getDate()}</span>)}
            </button>;
          }
          return <div key={isoDay(days[0])} className="grid grid-cols-7 gap-0.5">
            {days.map(d => {
              const iso = isoDay(d);
              return <button key={iso} type="button" disabled={!!maxDay && iso > maxDay} onClick={() => pickCell({ from: iso, to: iso })} aria-label={iso.split("-").reverse().join("/")}
                className={`h-8 rounded-md text-small tabular-nums transition-colors ${iso === today ? "ring-1 ring-inset ring-cs-accent" : ""} ${cellClass({ from: iso, to: iso }, outside(d))}`}>{d.getDate()}</button>;
            })}
          </div>;
        })}
      </div>
    </div>;
  };
  const cursorLabel = () => {
    if (!draft) return "";
    const y = draft.cursor.getFullYear();
    if (draft.unit === "day" || draft.unit === "week") return `Tháng ${String(draft.cursor.getMonth() + 1).padStart(2, "0")}/${y}`;
    if (draft.unit === "year") { const first = Math.floor(y / 12) * 12; return `${first} – ${first + 11}`; }
    return String(y);
  };
  const quickClass = (active: boolean) => `flex w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-control px-3 py-1.5 text-left text-small transition-colors ${active ? "bg-cs-soft font-semibold text-cs-accent-text" : "text-cs-text hover:bg-cs-soft-hover hover:text-cs-on-soft"}`;
  const selection = draft?.all ? "Tất cả thời gian" : hasRange && !reversed && draft ? rangeLabel({ from: draft.from, to: draft.to }) : "Chưa chọn đủ ngày";

  return <>
    <div data-period-trigger className="inline-flex max-w-full items-center gap-0.5 rounded-control border border-cs-border bg-cs-surface p-1" role="group" aria-label="Bộ lọc thời gian">
      <IconButton icon="chevron-left" size="sm" label="Kỳ trước" disabled={!applied} onClick={() => { if (applied) { const r = shiftRange(applied, -1); change({ preset: "custom", ...r }); } }}/>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={panelId} onClick={() => { if (isOpen) close(false); else open(); }}
        className="inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-small font-semibold text-cs-text transition-colors hover:bg-cs-soft-hover hover:text-cs-on-soft">
        <Icon name="calendar" size={15} className="shrink-0 text-cs-accent-text"/>
        <span className="truncate tabular-nums">{applied ? rangeLabel(applied) : "Tất cả thời gian"}</span>
        <Icon name="chevron-down" size={14} className="shrink-0 text-cs-muted"/>
      </button>
      <IconButton icon="chevron-right" size="sm" label="Kỳ sau" disabled={!nextRange || (!!maxDay && nextRange.from > maxDay)} onClick={() => { if (nextRange) change({ preset: "custom", ...nextRange }); }}/>
    </div>
    {draft && createPortal(
      <div ref={panelRef} id={panelId} role="dialog" aria-label="Chọn khoảng thời gian" data-area={area}
        onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}
        style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight }}
        className="cs-feedback-layer fixed z-[350] flex flex-col overflow-hidden rounded-card border border-cs-border bg-cs-surface text-cs-text shadow-raised">
        <div role="tablist" aria-label="Đơn vị thời gian" className="flex shrink-0 gap-1 overflow-x-auto border-b border-cs-border p-2">
          {UNITS.map(u => <button key={u.id} type="button" role="tab" aria-selected={draft.unit === u.id}
            onClick={() => setDraft({ ...draft, unit: u.id, picking: false, custom: false, cursor: parseDay(draft.from || today) })}
            className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 py-2 text-small font-semibold transition-colors ${draft.unit === u.id ? "bg-cs-accent text-cs-accent-contrast hover:bg-cs-accent-hover" : "text-cs-text-2 hover:bg-cs-soft-hover hover:text-cs-on-soft"}`}>
            <Icon name={u.icon} size={15} className="max-sm:hidden"/>{u.label}
          </button>)}
        </div>
        <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="border-cs-border p-3 max-sm:border-b sm:border-r">
            <p className="mb-1.5 px-3 text-small font-semibold">Chọn nhanh</p>
            <ul className="grid gap-0.5 max-sm:grid-cols-2">
              {quickRanges(draft.unit).map(q => {
                const active = !draft.all && !draft.custom && draft.from === q.range.from && draft.to === q.range.to;
                return <li key={q.label}><button type="button" className={quickClass(active)}
                  onClick={() => setDraft({ ...draft, ...q.range, all: false, picking: false, custom: false, cursor: parseDay(q.range.to) })}>
                  {q.label}{active && <Icon name="check" size={14}/>}
                </button></li>;
              })}
              <li><button type="button" className={quickClass(draft.custom)} onClick={() => setDraft({ ...draft, from: draft.from || today, to: draft.to || today, all: false, picking: false, custom: true })}>
                Tùy chỉnh{draft.custom && <Icon name="check" size={14}/>}
              </button></li>
              {allowAll && <li><button type="button" className={quickClass(draft.all)} onClick={() => setDraft({ ...draft, from: "", to: "", all: true, picking: false, custom: false })}>
                Tất cả thời gian{draft.all && <Icon name="check" size={14}/>}
              </button></li>}
            </ul>
          </div>
          <div className="min-w-0 p-3">
            {draft.custom ? <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Từ ngày" required><DateInput value={draft.from} max={maxDay} onChange={e => setDraft({ ...draft, from: e.target.value })}/></Field>
              <Field label="Đến ngày" required error={reversed ? "Đến ngày phải từ ngày bắt đầu trở đi." : undefined}><DateInput value={draft.to} max={maxDay} onChange={e => setDraft({ ...draft, to: e.target.value })}/></Field>
            </div> : <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-small font-semibold">{PICK_TITLE[draft.unit]}</p>
                <span className="inline-flex items-center gap-1">
                  <IconButton icon="chevron-left" size="sm" label="Trang trước" onClick={() => moveCursor(-1)}/>
                  <b className="min-w-24 text-center text-small tabular-nums">{cursorLabel()}</b>
                  <IconButton icon="chevron-right" size="sm" label="Trang sau" onClick={() => moveCursor(1)}/>
                </span>
              </div>
              {picker()}
            </>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-cs-border p-3">
          <p className="min-w-0 text-small text-cs-text-2">
            <span className="text-cs-muted">Đang chọn: </span><b className="tabular-nums text-cs-text">{selection}</b>
            {draft.picking && <span className="block text-caption text-cs-muted">Bấm thêm một ô để chọn nhiều kỳ liên tiếp.</span>}
          </p>
          <span className="ml-auto inline-flex gap-2">
            <Button size="sm" onClick={() => close()}>Huỷ</Button>
            <Button size="sm" variant="primary" icon="check" disabled={!canApply} onClick={apply}>Áp dụng</Button>
          </span>
        </div>
      </div>,
      document.body,
    )}
  </>;
}
