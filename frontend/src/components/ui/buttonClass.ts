/** Class chuẩn cho nút (styles/buttons.css). Dùng trực tiếp khi cần <Link> trông như nút. */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClass({ variant = "secondary", size = "md", block = false, iconOnly = false, className = "" }: {
  variant?: ButtonVariant; size?: ButtonSize; block?: boolean; iconOnly?: boolean; className?: string;
} = {}) {
  return [
    "cs-btn",
    `cs-btn-${variant}`,
    size !== "md" && `cs-btn-${size}`,
    block && "cs-btn-block",
    iconOnly && "cs-btn-icon",
    className,
  ].filter(Boolean).join(" ");
}
