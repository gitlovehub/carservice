import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
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
export function AreaChart({ labels, series, height = 260, title, format = num, tooltipTitle }: {
  labels: string[]; series: Series; height?: number; title: string; format?: (v: number) => string; tooltipTitle?: (index: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { ref, width: W } = useWidth();
  const max = niceMax(Math.max(...series.values));
  const inner = height - PAD.top - PAD.bottom;
  const step = (W - PAD.left - PAD.right - 24) / Math.max(1, labels.length - 1);
  const xOf = (i: number) => PAD.left + 12 + step * i;
  const yOf = (v: number) => PAD.top + inner - (v / max) * inner;
  const every = Math.max(1, Math.ceil(52 / step));
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
        {i % every === 0 && <text x={xOf(i)} y={height - 9} textAnchor="middle" fontSize="11" fill="var(--cs-muted)">{label}</text>}
      </g>)}
      {active !== null && <line x1={xOf(active)} x2={xOf(active)} y1={yOf(series.values[active])} y2={PAD.top + inner} stroke={series.color} strokeDasharray="3 3"/>}
    </svg>
    {active !== null && <Tooltip x={(xOf(active) / W) * 100} y={(yOf(series.values[active]) / height) * 100 - 3}>
      <p className="font-semibold">{tooltipTitle ? tooltipTitle(active) : labels[active]}</p>
      <p>{series.label}: <b className="tabular-nums">{format(series.values[active])}</b></p>
    </Tooltip>}
  </div>;
}

/** Cột doanh thu (trục trái) + đường số phiếu (trục phải, có số trên từng điểm). */
export function ComboChart({ labels, titles, bars, line, height = 250, format = num, title }: {
  labels: string[]; titles?: string[]; bars: Series; line: Series; height?: number; format?: (v: number) => string; title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { ref, width: W } = useWidth();
  const gradientId = `cs-combo-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const pad = { top: 24, right: 40, bottom: 30, left: 58 };
  const inner = height - pad.top - pad.bottom;
  const leftMax = niceMax(Math.max(...bars.values, 0));
  const rightMax = Math.max(4, Math.ceil(Math.max(...line.values, 0) / 4) * 4);
  const slot = (W - pad.left - pad.right) / Math.max(1, labels.length);
  const barW = Math.max(6, Math.min(64, slot * 0.46));
  const every = Math.max(1, Math.ceil(64 / slot));
  const xOf = (i: number) => pad.left + slot * i + slot / 2;
  const yBar = (v: number) => pad.top + inner - (v / leftMax) * inner;
  const yLine = (v: number) => pad.top + inner - (v / rightMax) * inner;
  const path = line.values.map((v, i) => `${i ? "L" : "M"}${xOf(i)},${yLine(v)}`).join(" ");
  return <div ref={ref} className="relative">
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setActive(null)}>
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={bars.color}/><stop offset="1" stopColor={bars.color} stopOpacity="0.35"/></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(i => {
        const y = pad.top + inner - (inner * i) / 4;
        return <g key={i}>
          <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="var(--cs-chart-grid)" strokeDasharray={i ? "3 4" : undefined}/>
          <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--cs-muted)">{format((leftMax * i) / 4)}</text>
          <text x={W - pad.right + 8} y={y + 4} fontSize="11" fill="var(--cs-muted)">{num((rightMax * i) / 4)}</text>
        </g>;
      })}
      {labels.map((label, i) => <g key={`${label}-${i}`} tabIndex={0} className="outline-none" onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
        <rect x={pad.left + slot * i} y={pad.top} width={slot} height={inner} fill="transparent"/>
        <rect x={xOf(i) - barW / 2} y={yBar(bars.values[i])} width={barW} height={Math.max(0, pad.top + inner - yBar(bars.values[i]))} rx="3" fill={`url(#${gradientId})`} opacity={active === null || active === i ? 1 : 0.55}/>
        {i % every === 0 && <text x={xOf(i)} y={height - 9} textAnchor="middle" fontSize="11" fill="var(--cs-muted)">{label}</text>}
      </g>)}
      <path d={path} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" pointerEvents="none"/>
      {line.values.map((v, i) => <g key={i} pointerEvents="none">
        <circle cx={xOf(i)} cy={yLine(v)} r={active === i ? 5 : 3.5} fill={line.color} stroke="var(--cs-surface)" strokeWidth="1.5"/>
        {labels.length <= 12 && v > 0 && <text x={xOf(i)} y={yLine(v) - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--cs-text)">{num(v)}</text>}
      </g>)}
    </svg>
    {active !== null && <Tooltip x={(xOf(active) / W) * 100} y={(Math.min(yBar(bars.values[active]), yLine(line.values[active])) / height) * 100 - 2}>
      <p className="mb-1 font-semibold">{titles?.[active] ?? labels[active]}</p>
      <p className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: bars.color }}/>{bars.label}: <b className="ml-auto tabular-nums">{format(bars.values[active])}</b></p>
      <p className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: line.color }}/>{line.label}: <b className="ml-auto tabular-nums">{num(line.values[active])}</b></p>
    </Tooltip>}
  </div>;
}

/** Hai đường cong so sánh kỳ này với kỳ trước. */
export function CompareChart({ current, previous, height = 120, format = num, title }: {
  current: Series; previous: Series; height?: number; format?: (v: number) => string; title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { ref, width: W } = useWidth();
  const gradientId = `cs-compare-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const count = Math.max(current.values.length, previous.values.length, 2);
  const max = niceMax(Math.max(...current.values, ...previous.values, 0));
  const pad = 6;
  const step = (W - pad * 2) / (count - 1);
  const xOf = (i: number) => pad + step * i;
  const yOf = (v: number) => pad + (height - pad * 2) * (1 - v / max);
  const curve = (values: number[]) => values.map((v, i) => {
    if (!i) return `M${xOf(0)},${yOf(v)}`;
    const mid = (xOf(i - 1) + xOf(i)) / 2;
    return `C${mid},${yOf(values[i - 1])} ${mid},${yOf(v)} ${xOf(i)},${yOf(v)}`;
  }).join(" ");
  const last = current.values.length - 1;
  const area = last > 0 ? `${curve(current.values)} L${xOf(last)},${height - pad} L${xOf(0)},${height - pad} Z` : "";
  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(count - 1, Math.round((((event.clientX - box.left) / box.width) * W - pad) / step))));
  };
  return <div ref={ref} className="relative">
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={title} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={current.color} stopOpacity="0.4"/><stop offset="1" stopColor={current.color} stopOpacity="0"/></linearGradient></defs>
      {area && <path d={area} fill={`url(#${gradientId})`}/>}
      <path d={curve(previous.values)} fill="none" stroke={previous.color} strokeWidth="1.8"/>
      <path d={curve(current.values)} fill="none" stroke={current.color} strokeWidth="2.2"/>
      {active !== null && <line x1={xOf(active)} x2={xOf(active)} y1={pad} y2={height - pad} stroke="var(--cs-border-strong)" strokeDasharray="3 3"/>}
    </svg>
    {active !== null && <Tooltip x={(xOf(active) / W) * 100} y={30}>
      <p className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: current.color }}/>{current.label}: <b className="ml-auto tabular-nums">{current.values[active] === undefined ? "—" : format(current.values[active])}</b></p>
      <p className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: previous.color }}/>{previous.label}: <b className="ml-auto tabular-nums">{previous.values[active] === undefined ? "—" : format(previous.values[active])}</b></p>
    </Tooltip>}
  </div>;
}

/** Biểu đồ vành khuyên kèm chú thích. */
export function DonutChart({ segments, centerValue, centerLabel, title, size = "md", formatValue = String }: {
  segments: Array<{ label: string; value: number; color: string }>; centerValue: ReactNode; centerLabel: string; title: string;
  /** "lg" = vòng 208px (lòng trong rộng hơn cho nhãn giữa dài). */
  size?: "md" | "lg";
  /** Cách hiện giá trị ở chú thích (ví dụ tiền rút gọn). */
  formatValue?: (value: number) => string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 15.9155; // chu vi = 100
  const offsets = segments.reduce<number[]>((acc, _s, i) => [...acc, (i ? acc[i - 1] : 25) - (i ? (segments[i - 1].value / total) * 100 : 0)], []);
  return <div className="flex flex-wrap items-center gap-6">
    <div className={`relative mx-auto shrink-0 ${size === "lg" ? "size-52" : "size-44"}`}>
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
        <span className="font-semibold text-cs-text tabular-nums">{formatValue(s.value)}</span>
        <span className="w-12 text-right text-cs-muted tabular-nums">({Math.round((s.value / total) * 100)}%)</span>
      </li>)}
    </ul>
  </div>;
}
