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