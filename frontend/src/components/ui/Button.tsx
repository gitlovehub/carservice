import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonClass";

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Đang gọi API: hiện vòng quay, khóa nút để tránh gửi lặp. */
  loading?: boolean;
  /** Chữ hiển thị khi đang xử lý (mặc định giữ nguyên chữ của nút). */
  loadingText?: ReactNode;
};

export type ButtonProps = BaseProps & {
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  children?: ReactNode;
};

/**
 * Nút chuẩn của hệ thống. Mặc định là "secondary" — chỉ chọn "primary" cho hành động chính
 * của khối thao tác, "danger" cho xóa/hủy (kèm xác nhận qua useAppFeedback().confirm).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, loadingText, icon, iconRight, block, type = "button", disabled, className, children, ...props },
  ref,
) {
  return <button
    ref={ref}
    type={type}
    className={buttonClass({ variant, size, block, className })}
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
  { icon, label, variant = "ghost", size = "md", loading = false, type = "button", disabled, className, title, ...props },
  ref,
) {
  return <button
    ref={ref}
    type={type}
    className={buttonClass({ variant, size, iconOnly: true, className })}
    aria-label={label}
    title={title ?? label}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    <Icon name={icon} size={iconSize[size]}/>
  </button>;
});
