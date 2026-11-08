/** Class chuẩn cho nút (styles/buttons.css). Dùng trực tiếp khi cần <Link> trông như nút. */
export type ButtonVariant = "primary" | "tonal" | "secondary" | "outline" | "ghost" | "success" | "danger-outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
/** "danger": chữ đỏ, hover nền danger-soft — cho nút icon Xóa trong dòng (đi kèm variant ghost). */
export type ButtonTone = "danger";

export function buttonClass({ variant = "secondary", size = "md", block = false, iconOnly = false, tone, className = "" }: {
  variant?: ButtonVariant; size?: ButtonSize; block?: boolean; iconOnly?: boolean; tone?: ButtonTone; className?: string;
} = {}) {
  return [
    "cs-btn",
    `cs-btn-${variant}`,
    size !== "md" && `cs-btn-${size}`,
    block && "cs-btn-block",
    iconOnly && "cs-btn-icon",
    tone && `cs-btn-tone-${tone}`,
    className,
  ].filter(Boolean).join(" ");
}
