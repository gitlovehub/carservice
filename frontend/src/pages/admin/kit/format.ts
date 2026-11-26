/** Định dạng số liệu và tông màu dùng chung cho khu Admin. */
export type Tone = "brand" | "info" | "success" | "warning" | "danger" | "violet" | "neutral";

export const toneSoft: Record<Tone, string> = {
  brand: "bg-cs-soft text-cs-accent-text",
  info: "bg-info-soft text-info-fg",
  success: "bg-success-soft text-success-fg",