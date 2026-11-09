import { useState } from "react";

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir };

/** Mặc định của mọi bảng: mới tạo lên đầu. */
export const NEWEST_FIRST: SortState = { key: "created", dir: "desc" };

/** Khoá kiểu chữ: lần bấm đầu sắp A→Z; còn lại (số, ngày, trạng thái số liệu) sắp lớn / mới nhất trước. */
const TEXT_KEYS = new Set(["name", "code", "sku", "email", "phone", "category", "unit", "brand", "model", "customer", "body", "role", "type", "status", "order"]);

/**
 * Trạng thái sắp xếp của một bảng. `toggle(key)`: bấm cột đang sắp → đảo chiều; bấm cột khác → chiều mặc định của cột đó.
 * `params` gửi thẳng lên API (`?sort=&dir=`).
 */
export function useTableSort(initial: SortState = NEWEST_FIRST, onChange?: () => void) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (key: string, dir?: SortDir) => {
    setSort(current => dir ? { key, dir }
      : current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: TEXT_KEYS.has(key) ? "asc" : "desc" });
    onChange?.();
  };
  /** Đang ở cách sắp mặc định (dùng cho nút "Xoá bộ lọc"). */
  const isDefault = sort.key === initial.key && sort.dir === initial.dir;
  const reset = () => { if (!isDefault) { setSort(initial); onChange?.(); } };
  return { sort, toggle, setSort, reset, isDefault, params: { sort: sort.key, dir: sort.dir } };
}

export const ariaSort = (sort: SortState | undefined, key?: string): "ascending" | "descending" | undefined =>
  sort && key && sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined;
