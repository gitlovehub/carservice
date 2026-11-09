import type { Key, KeyboardEvent, ReactNode } from "react";
import { LABELS } from "../../config/labels";
import { EmptyState, ErrorState, LoadingState } from "./States";
import { SortHeader } from "./SortHeader";
import { ariaSort, type SortDir, type SortState } from "./tableSort";

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
  /** Khoá sắp xếp gửi lên API (`?sort=`). Có khoá → tiêu đề cột bấm được, kèm biểu tượng sort. */
  sortKey?: string;
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
  /** Bấm dòng (hoặc Enter / Space khi dòng được focus) để mở chi tiết — không cần thêm nút "Xem" trong actions. */
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  /** Class thêm cho từng dòng (ví dụ làm nổi dòng đang chọn). */
  rowClassName?: (row: T) => string;
  /** Sắp xếp hiện tại + hàm đổi (từ useTableSort). Không truyền → tiêu đề cột không bấm được. */
  sort?: SortState;
  /** Bấm tiêu đề: (key) → đảo chiều / chiều mặc định; ô chọn trên điện thoại: (key, dir) → đặt đúng chiều. */
  onSort?: (key: string, dir?: SortDir) => void;
  /** Chia đều bề rộng các cột (table-layout: fixed); cột có `width` giữ bề rộng riêng. */
  evenColumns?: boolean;
  /** Bề rộng cột thao tác khi `evenColumns` (mặc định 88px — đủ cho 1–2 nút). */
  actionsWidth?: string;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Bảng dữ liệu chuẩn. ≥ md: bảng có thể cuộn ngang; < md: danh sách thẻ.
 * Xử lý sẵn Loading / Error / Empty — trang chỉ truyền trạng thái, không tự vẽ lại.
 */
export function DataTable<T>({ columns, rows, rowKey, caption, loading, error, onRetry, empty, actions, onRowClick, footer, rowClassName, sort, onSort, evenColumns, actionsWidth = "88px" }: Props<T>) {
  const frame = "overflow-hidden rounded-card border border-cs-border bg-cs-surface shadow-card";
  if (loading && !rows.length) return <div className={frame}><LoadingState/></div>;
  if (error) return <div className={frame}><ErrorState description={error} onRetry={onRetry}/></div>;
  if (!rows.length) return <div className={frame}>{empty ?? <EmptyState/>}</div>;

  const sortable = columns.filter(c => c.sortKey);
  const primary = columns.find(c => c.primary) ?? columns[0];
  const rest = columns.filter(c => c !== primary && !c.hideOnMobile);
  // Bấm cả dòng để mở chi tiết; Tab tới dòng rồi Enter / Space cho người dùng bàn phím.
  const rowProps = (row: T) => onRowClick ? {
    onClick: () => onRowClick(row),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onRowClick(row);
    },
    tabIndex: 0,
    className: "cursor-pointer hover:bg-cs-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cs-accent",
  } : { className: "" };

  return <div aria-busy={loading || undefined}>
    {/* Desktop / tablet */}
    <div className={`${frame} max-md:hidden`}>
      <div className="overflow-x-auto">
        <table data-ui="table" className={`w-full border-collapse text-small ${evenColumns ? "table-fixed" : ""}`}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-cs-surface-2">
            <tr>
              {columns.map(col => <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined} aria-sort={ariaSort(sort, col.sortKey)}
                className={`whitespace-nowrap border-b border-cs-border px-4 py-3 text-label uppercase text-cs-muted ${alignClass[col.align ?? "left"]}`}>
                {col.sortKey && sort && onSort
                  ? <SortHeader label={col.header} sortKey={col.sortKey} sort={sort} onSort={onSort} align={col.align}/>
                  : col.header}
              </th>)}
              {actions && <th scope="col" style={evenColumns ? { width: actionsWidth } : undefined} className="w-px whitespace-nowrap border-b border-cs-border px-4 py-3 text-right text-label uppercase text-cs-muted">{LABELS.table.actions}</th>}
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

    {/* Điện thoại: không có tiêu đề cột → chọn cách sắp xếp bằng ô chọn. */}
    {sort && onSort && sortable.length > 0 && <label className="mb-3 flex items-center gap-2 text-small text-cs-muted md:hidden">
      <span className="shrink-0">Sắp xếp</span>
      <select className="min-h-11 flex-1 cursor-pointer rounded-control border border-cs-border bg-cs-surface px-3 text-cs-text"
        value={`${sort.key}:${sort.dir}`} onChange={event => {
          const [key, dir] = event.target.value.split(":");
          onSort(key, dir as SortDir);
        }}>
        {!sortable.some(c => c.sortKey === "created") && <option value="created:desc">Mới tạo nhất</option>}
        {sortable.flatMap(c => {
          const name = typeof c.header === "string" ? c.header : c.key;
          return [<option key={`${c.sortKey}:asc`} value={`${c.sortKey}:asc`}>{name} ↑</option>, <option key={`${c.sortKey}:desc`} value={`${c.sortKey}:desc`}>{name} ↓</option>];
        })}
      </select>
    </label>}
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
