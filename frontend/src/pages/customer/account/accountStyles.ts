/** Hằng số giao diện dùng chung cho khu "Hồ sơ của tôi" (tách khỏi AccountKit để file component chỉ xuất component). */

export type Tone = "accent" | "success" | "warning" | "info" | "neutral";

export const TONE_CLASS: Record<Tone, string> = {
  accent: "bg-cs-soft text-cs-accent-text",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  info: "bg-info-soft text-info-fg",
  neutral: "bg-cs-surface-2 text-cs-muted",
};

/** Nút chính màu đỏ (giống nút Đăng nhập ở header) — hành động chính của trang. */
export const PRIMARY_RED = "border-transparent! bg-[#e11d2e]! text-white! shadow-[0_6px_16px_rgb(225_29_46/22%)] hover:bg-[#c81627]!";

/** Class chuẩn cho <Modal bare> trong khu tài khoản. */
export const MODAL_CLASS = "my-auto w-full overflow-hidden rounded-3xl bg-cs-surface shadow-overlay";
