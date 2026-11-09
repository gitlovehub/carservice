import type { Key, ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { EmptyState, ErrorState, LoadingState } from "./States";

export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Bề rộng cột trên desktop, ví dụ "120px" hoặc "20%". */
  width?: string;
  /** Dòng tiêu đề của thẻ trên điện thoại (thường là mã phiếu / tên). */
  primary?: boolean;
  /** Ẩn trên điện thoại khi thông tin không cần thiết. */
  hideOnMobile?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => Key;
  /** Nhãn mô tả bảng cho trình đọc màn hình. */
  caption: string;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  empty?: ReactNode;
  /** Cột thao tác cuối (Button / IconButton / Dropdown). */
  actions?: (row: T) => ReactNode;
  /** Lối tắt bằng chuột; vẫn phải có nút "Xem chi tiết" trong actions để dùng được bằng bàn phím. */
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  /** Class thêm cho từng dòng (ví dụ làm nổi dòng đang chọn). */
  rowClassName?: (row: T) => string;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Bảng dữ liệu chuẩn. ≥ md: bảng có thể cuộn ngang; < md: danh sách thẻ.
 * Xử lý sẵn Loading / Error / Empty — trang chỉ truyền trạng thái, không tự vẽ lại.
 */
export function DataTable<T>({ columns, rows, rowKey, caption, loading, error, onRetry, empty, actions, onRowClick, footer, rowClassName }: Props<T>) {
  const frame = "overflow-hidden rounded-card border border-cs-border bg-cs-surface shadow-card";
  if (loading && !rows.length) return <div className={frame}><LoadingState/></div>;
  if (error) return <div className={frame}><ErrorState description={error} onRetry={onRetry}/></div>;
  if (!rows.length) return <div className={frame}>{empty ?? <EmptyState/>}</div>;

  const primary = columns.find(c => c.primary) ?? columns[0];
  const rest = columns.filter(c => c !== primary && !c.hideOnMobile);
  const rowProps = (row: T) => onRowClick ? {
    onClick: () => onRowClick(row),
    className: "cursor-pointer hover:bg-cs-hover",
  } : { className: "" };

  return <div aria-busy={loading || undefined}>
    {/* Desktop / tablet */}
    <div className={`${frame} max-md:hidden`}>
      <div className="overflow-x-auto">
        <table data-ui="table" className="w-full border-collapse text-small">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-cs-surface-2">
            <tr>
              {columns.map(col => <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined}
                className={`whitespace-nowrap border-b border-cs-border px-4 py-3 text-label uppercase text-cs-muted ${alignClass[col.align ?? "left"]}`}>{col.header}</th>)}
              {actions && <th scope="col" className="w-px whitespace-nowrap border-b border-cs-border px-4 py-3 text-right text-label uppercase text-cs-muted">{LABELS.table.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const { className, ...handlers } = rowProps(row);
              return <tr key={rowKey(row)} {...handlers} className={`border-b border-cs-border transition-colors last:border-b-0 ${className} ${rowClassName?.(row) ?? ""}`}>
                {columns.map(col => <td key={col.key} className={`px-4 py-3 align-middle text-cs-text ${alignClass[col.align ?? "left"]}`}>{col.render(row)}</td>)}
                {actions && <td className="px-4 py-2 text-right" onClick={event => event.stopPropagation()}><div className="inline-flex items-center justify-end gap-1">{actions(row)}</div></td>}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-cs-border px-4 pb-3">{footer}</div>}
    </div>

    {/* Điện thoại */}
    <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
      {rows.map(row => {
        const { className, ...handlers } = rowProps(row);
        return <li key={rowKey(row)} {...handlers} className={`rounded-card border border-cs-border bg-cs-surface p-4 shadow-card ${className}`}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 font-semibold text-cs-text">{primary.render(row)}</div>
            {actions && <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1" onClick={event => event.stopPropagation()}>{actions(row)}</div>}
          </div>
          <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-3 gap-y-1.5 text-small">
            {rest.map(col => <div key={col.key} className="contents">
              <dt className="text-cs-muted">{col.header}</dt>
              <dd className="min-w-0 text-cs-text">{col.render(row)}</dd>
            </div>)}
          </dl>
        </li>;
      })}
      {footer && <li className="list-none">{footer}</li>}
    </ul>
  </div>;
}
