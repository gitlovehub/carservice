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