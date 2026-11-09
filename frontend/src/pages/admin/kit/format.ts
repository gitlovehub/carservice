/** Định dạng số liệu và tông màu dùng chung cho khu Admin. */
export type Tone = "brand" | "info" | "success" | "warning" | "danger" | "violet" | "neutral";

export const toneSoft: Record<Tone, string> = {
  brand: "bg-cs-soft text-cs-accent-text",
  info: "bg-info-soft text-info-fg",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
  violet: "bg-[var(--cs-violet-soft)] text-[var(--cs-violet-fg)]",
  neutral: "bg-neutral-soft text-neutral-fg",
};
/* ---------- Định dạng ---------- */
const vndFormatter = new Intl.NumberFormat("vi-VN");
export const vnd = (value: number) => `${vndFormatter.format(Math.round(value))}\u00a0₫`;
export const num = (value: number) => vndFormatter.format(value);
export const shortVnd = (value: number) => value >= 1_000_000 ? `${num(Math.round(value / 100_000) / 10)}tr` : num(value);

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

/** Màu biểu đồ (token --cs-chart-*). */
export const chartColor = {
  brand: "var(--cs-chart-1)",
  brandSoft: "var(--cs-chart-2)",
  blue: "var(--cs-chart-3)",
  yellow: "var(--cs-chart-4)",
  violet: "var(--cs-chart-5)",
  green: "var(--cs-chart-6)",
  grey: "var(--cs-border-strong)",
};
