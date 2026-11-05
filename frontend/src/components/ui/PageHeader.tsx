import type { ReactNode } from "react";

/**
 * Đầu trang chuẩn: nhãn nhỏ (tùy chọn) → tiêu đề → mô tả ngắn, nút hành động bên phải,
 * hàng bộ lọc / tìm kiếm phía dưới. Breadcrumb do topbar của khu vực làm việc hiển thị.
 */
export function PageHeader({ eyebrow, title, description, actions, children, className = "" }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Nút hành động: tối đa một nút primary, đặt cuối. */
  actions?: ReactNode;
  /** Bộ lọc, ô tìm kiếm, tab. */
  children?: ReactNode;
  className?: string;
}) {
  return <header className={`mb-6 flex flex-col gap-4 ${className}`}>
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1 basis-[320px]">
        {eyebrow && <p className="mb-1.5 text-label uppercase text-cs-accent">{eyebrow}</p>}
        <h1 className="text-title text-cs-text">{title}</h1>
        {description && <p className="mt-1.5 max-w-[680px] text-small text-cs-muted">{description}</p>}
      </div>
      {actions && <div className="cs-btn-row max-sm:w-full max-sm:[&>*]:flex-1">{actions}</div>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </header>;
}
