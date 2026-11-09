import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { SortState } from "./tableSort";

/**
 * Tiêu đề cột sắp xếp được: chữ + biểu tượng ⇅ (chưa sắp), ↑ (tăng), ↓ (giảm). Bấm để đổi.
 * Thẻ <th> chứa nút này nên đặt `aria-sort={ariaSort(...)}`.
 */
/**
 * Dòng trạng thái phía trên bảng: đang sắp theo cột nào, chiều nào; nút "Về mặc định" (mới tạo nhất)
 * khi người dùng đã chọn cột khác. Mặc định "created" thường không có cột riêng nên cần dòng này để thấy được.
 */
export function SortStatus({ sort, label, onReset, className = "" }: {
  sort: SortState; label: ReactNode; onReset: () => void; className?: string;
}) {
  const isDefault = sort.key === "created" && sort.dir === "desc";
  return <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-cs-muted ${className}`} aria-live="polite">
    <Icon name={sort.dir === "asc" ? "sort-asc" : "sort-desc"} size={14} className="text-cs-accent-text"/>
    Sắp xếp: <b className="font-semibold text-cs-text">{label}</b>
    <span>({sort.dir === "asc" ? "tăng dần" : "giảm dần"})</span>
    {!isDefault && <button type="button" onClick={onReset}
      className="ml-1 cursor-pointer font-medium text-cs-accent-text hover:underline underline-offset-2">Về mặc định: mới tạo nhất</button>}
  </p>;
}

export function SortHeader({ label, sortKey, sort, onSort, align = "left" }: {
  label: ReactNode; sortKey: string; sort: SortState; onSort: (key: string) => void; align?: "left" | "right" | "center";
}) {
  const active = sort.key === sortKey;
  const icon = !active ? "sort" : sort.dir === "asc" ? "sort-asc" : "sort-desc";
  const hint = !active ? "Bấm để sắp xếp" : sort.dir === "asc" ? "Đang sắp tăng dần — bấm để đảo" : "Đang sắp giảm dần — bấm để đảo";
  return <button type="button" onClick={() => onSort(sortKey)} title={hint}
    className={`group/sort -mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 [text-transform:inherit] [letter-spacing:inherit] transition-colors hover:text-cs-text ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-cs-text" : ""}`}>
    <span>{label}</span>
    <Icon name={icon} size={14} className={`shrink-0 ${active ? "text-cs-accent-text" : "text-cs-muted opacity-60 group-hover/sort:opacity-100"}`}/>
  </button>;
}

