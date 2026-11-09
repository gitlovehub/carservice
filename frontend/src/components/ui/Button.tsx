import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { buttonClass, type ButtonSize, type ButtonTone, type ButtonVariant } from "./buttonClass";

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Đang gọi API: hiện vòng quay, khóa nút để tránh gửi lặp. */
  loading?: boolean;
  /** Chữ hiển thị khi đang xử lý (mặc định giữ nguyên chữ của nút). */
  loadingText?: ReactNode;
  /** "danger": chữ đỏ (nút Xóa trong dòng). */
  tone?: ButtonTone;
};

export type ButtonProps = BaseProps & {
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  children?: ReactNode;
};

/**
 * Nút chuẩn của hệ thống (docs/ui-button-redesign.md). Mặc định "secondary"; "primary" tối đa một nút mỗi khối,
 * "tonal" cho hành động quan trọng thứ hai, "danger" nền đặc chỉ trong hộp thoại xác nhận.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, loadingText, icon, iconRight, block, tone, type = "button", disabled, className, children, ...props },
  ref,
) {
  return <button
    ref={ref}
    type={type}
    className={buttonClass({ variant, size, block, tone, className })}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {!loading && icon && <Icon name={icon} size={iconSize[size]}/>}
    {loading && loadingText ? loadingText : children}
    {!loading && iconRight && <Icon name={iconRight} size={iconSize[size]}/>}
  </button>;
});

export type IconButtonProps = BaseProps & {
  icon: IconName;
  /** Bắt buộc: đọc bởi trình đọc màn hình và hiện làm tooltip. */
  label: string;
};

/** Nút chỉ có biểu tượng. Mặc định "ghost"; nhãn vừa là aria-label vừa là tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", size = "md", loading = false, tone, type = "button", disabled, className, title, ...props },
  ref,
) {
  return <button
    ref={ref}
    type={type}
    className={buttonClass({ variant, size, iconOnly: true, tone, className })}
    aria-label={label}
    title={title ?? label}
    data-icon={icon}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    <Icon name={icon} size={iconSize[size]}/>
  </button>;
});
