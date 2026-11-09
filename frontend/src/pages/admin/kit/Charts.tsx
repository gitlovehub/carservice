import { useEffect, useRef, useState, type ReactNode } from "react";
import { num } from "./format";

/**
 * Biểu đồ SVG gọn nhẹ cho khu Admin (không thêm thư viện). Màu lấy từ token --cs-chart-*.
 * Rê chuột (hoặc focus bằng bàn phím) lên một cột / điểm để xem tooltip.
 */

const PAD = { top: 16, right: 12, bottom: 30, left: 64 };

function niceMax(value: number) {
  if (value <= 0) return 1;
  const raw = value / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find(s => s * pow >= raw) ?? 10;
  return step * pow * 4;
}

/** Bề rộng thật của khung để chữ trên trục luôn giữ đúng cỡ (viewBox = pixel). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function Axis({ max, height, format, W }: { max: number; height: number; format: (v: number) => string; W: number }) {
  const inner = height - PAD.top - PAD.bottom;
  return <g>
    {[0, 1, 2, 3, 4].map(i => {
      const y = PAD.top + inner - (inner * i) / 4;
      return <g key={i}>
        <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--cs-chart-grid)" strokeDasharray={i ? "3 4" : undefined}/>
        <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--cs-muted)">{format((max * i) / 4)}</text>
      </g>;
    })}
  </g>;
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 12), 88);
  return <div className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-control border border-cs-border bg-cs-surface px-3 py-2 text-caption text-cs-text shadow-raised"
    style={{ left: `${left}%`, top: `${y}%` }}>{children}</div>;
}

export function Legend({ items }: { items: Array<{ label: string; color: string; line?: boolean }> }) {
  return <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-cs-text-2">
    {items.map(item => <li key={item.label} className="flex items-center gap-1.5">
      {item.line
        ? <span className="relative h-0.5 w-4 rounded" style={{ background: item.color }}><span className="absolute left-1/2 top-1/2 size-2 -translate-1/2 rounded-full border-2 bg-cs-surface" style={{ borderColor: item.color }}/></span>
        : <span className="size-2.5 rounded-sm" style={{ background: item.color }}/>}
      {item.label}
    </li>)}
  </ul>;
}

type Series = { label: string; values: number[]; color: string };

/** Cột (có thể chồng nhiều chuỗi) + đường tuỳ chọn. */
export function BarChart({ labels, bars, line, height = 260, format = num, tickEvery = 1, title, tooltipTitle }: {
  labels: string[]; bars: Series[]; line?: Series; height?: number; format?: (v: number) => string;
  tickEvery?: number; title: string; tooltipTitle?: (index: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { ref, width: W } = useWidth();
  const totals = labels.map((_, i) => bars.reduce((sum, s) => sum + s.values[i], 0));
  const max = niceMax(Math.max(...totals, ...(line?.values ?? [0])));
  const inner = height - PAD.top - PAD.bottom;
  const slot = (W - PAD.left - PAD.right) / labels.length;
  const barW = Math.max(4, Math.min(34, slot * 0.62));
  const every = Math.max(tickEvery, Math.ceil(52 / slot));
  const yOf = (v: number) => PAD.top + inner - (v / max) * inner;
  const xOf = (i: number) => PAD.left + slot * i + slot / 2;
  const linePath = line?.values.map((v, i) => `${i ? "L" : "M"}${xOf(i)},${yOf(v)}`).join(" ");
  return <div ref={ref} className="relative">
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setActive(null)}>
      <Axis max={max} height={height} format={format} W={W}/>
      {labels.map((label, i) => {
        let acc = 0;
        return <g key={label + i} tabIndex={0} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} className="outline-none">
          <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={inner} fill="transparent"/>
          {bars.map((s, si) => {
            const h = (s.values[i] / max) * inner;
            const y = PAD.top + inner - acc - h;
            acc += h;
            const top = si === bars.length - 1;
            return <rect key={s.label} x={xOf(i) - barW / 2} y={y} width={barW} height={Math.max(0, h)} rx={top ? 3 : 0} fill={s.color} opacity={active === null || active === i ? 1 : 0.55}/>;
          })}
          {i % every === 0 && <text x={xOf(i)} y={height - 9} textAnchor="middle" fontSize="11" fill="var(--cs-muted)">{label}</text>}
        </g>;
      })}
      {line && <>
        <path d={linePath} fill="none" stroke={line.color} strokeWidth="2.2" strokeLinejoin="round"/>
        {line.values.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r={active === i ? 5 : 2.6} fill={active === i ? "var(--cs-surface)" : line.color} stroke={line.color} strokeWidth="2"/>)}
      </>}
      {active !== null && <line x1={xOf(active)} x2={xOf(active)} y1={PAD.top} y2={PAD.top + inner} stroke="var(--cs-accent)" strokeDasharray="3 3" opacity="0.6"/>}
    </svg>
    {active !== null && <Tooltip x={(xOf(active) / W) * 100} y={(Math.min(yOf(totals[active]), line ? yOf(line.values[active]) : Infinity) / height) * 100 - 2}>
      <p className="mb-1 font-semibold">{tooltipTitle ? tooltipTitle(active) : labels[active]}</p>
      {[...bars].reverse().map(s => <p key={s.label} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: s.color }}/>{s.label}: <b className="ml-auto tabular-nums">{format(s.values[active])}</b></p>)}
      {line && <p className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: line.color }}/>{line.label}: <b className="ml-auto tabular-nums">{format(line.values[active])}</b></p>}
      {bars.length > 1 && <p className="mt-1 border-t border-cs-border pt-1">Tổng: <b className="tabular-nums">{format(totals[active])}</b></p>}
    </Tooltip>}
  </div>;
}

/** Đường có vùng tô. */
export function AreaChart({ labels, series, height = 260, title, format = num }: {
  labels: string[]; series: Series; height?: number; title: string; format?: (v: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { ref, width: W } = useWidth();
  const max = niceMax(Math.max(...series.values));
  const inner = height - PAD.top - PAD.bottom;
  const step = (W - PAD.left - PAD.right - 24) / Math.max(1, labels.length - 1);
  const xOf = (i: number) => PAD.left + 12 + step * i;
  const yOf = (v: number) => PAD.top + inner - (v / max) * inner;
  const path = series.values.map((v, i) => `${i ? "L" : "M"}${xOf(i)},${yOf(v)}`).join(" ");
  const area = `${path} L${xOf(labels.length - 1)},${PAD.top + inner} L${xOf(0)},${PAD.top + inner} Z`;
  return <div ref={ref} className="relative">
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setActive(null)}>
      <Axis max={max} height={height} format={format} W={W}/>
      <path d={area} fill={series.color} opacity="0.1"/>
      <path d={path} fill="none" stroke={series.color} strokeWidth="2.4" strokeLinejoin="round"/>
      {labels.map((label, i) => <g key={label} tabIndex={0} className="outline-none" onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
        <rect x={xOf(i) - step / 2} y={PAD.top} width={step} height={inner} fill="transparent"/>
        <circle cx={xOf(i)} cy={yOf(series.values[i])} r={active === i ? 6 : 4} fill="var(--cs-surface)" stroke={series.color} strokeWidth="2.2"/>
        <text x={xOf(i)} y={height - 9} textAnchor="middle" fontSize="11" fill="var(--cs-muted)">{label}</text>
      </g>)}
      {active !== null && <line x1={xOf(active)} x2={xOf(active)} y1={yOf(series.values[active])} y2={PAD.top + inner} stroke={series.color} strokeDasharray="3 3"/>}
    </svg>
    {active !== null && <Tooltip x={(xOf(active) / W) * 100} y={(yOf(series.values[active]) / height) * 100 - 3}>
      <p className="font-semibold">{labels[active]}</p>
      <p>{series.label}: <b className="tabular-nums">{format(series.values[active])}</b></p>
    </Tooltip>}
  </div>;
}

/** Biểu đồ vành khuyên kèm chú thích. */
export function DonutChart({ segments, centerValue, centerLabel, title }: {
  segments: Array<{ label: string; value: number; color: string }>; centerValue: ReactNode; centerLabel: string; title: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 15.9155; // chu vi = 100
  const offsets = segments.reduce<number[]>((acc, _s, i) => [...acc, (i ? acc[i - 1] : 25) - (i ? (segments[i - 1].value / total) * 100 : 0)], []);
  return <div className="flex flex-wrap items-center gap-6">
    <div className="relative mx-auto size-44 shrink-0">
      <svg viewBox="0 0 42 42" className="size-full" role="img" aria-label={title}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--cs-surface-2)" strokeWidth="7"/>
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return <circle key={s.label} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth="7"
            strokeDasharray={`${Math.max(0, pct - 0.6)} ${100 - pct + 0.6}`} strokeDashoffset={offsets[i]}/>;
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[1.9rem] font-bold leading-none text-cs-text tabular-nums">{centerValue}</span>
        <span className="mt-1 text-caption text-cs-muted">{centerLabel}</span>
      </div>
    </div>
    <ul className="flex min-w-48 flex-1 flex-col gap-2.5 text-small">
      {segments.map(s => <li key={s.label} className="flex items-center gap-2.5">
        <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }}/>
        <span className="min-w-0 flex-1 text-cs-text-2">{s.label}</span>
        <span className="font-semibold text-cs-text tabular-nums">{s.value}</span>
        <span className="w-12 text-right text-cs-muted tabular-nums">({Math.round((s.value / total) * 100)}%)</span>
      </li>)}
    </ul>
  </div>;
}
