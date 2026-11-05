import { LABELS } from "../../config/labels";
import { IconButton } from "./Button";

/** Dãy số trang rút gọn: 1 … 4 5 6 … 20. */
function pageItems(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

/**
 * Phân trang. Ẩn khi chỉ có 1 trang. `totalItems` (nếu có) hiển thị "Hiển thị 11–20 / 57".
 * Dùng được cho cả phân trang từ API (pagination.total) và phân trang dữ liệu đã tải.
 */
export function Pagination({ page, totalPages, onChange, totalItems, pageSize, disabled }: {
  page: number; totalPages: number; onChange: (page: number) => void; totalItems?: number; pageSize?: number; disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  const go = (p: number) => { if (p >= 1 && p <= totalPages && p !== page) onChange(p); };
  const from = totalItems && pageSize ? (page - 1) * pageSize + 1 : 0;
  const to = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : 0;
  return <nav aria-label={LABELS.pagination.navigation} className="flex flex-wrap items-center justify-between gap-3 pt-4">
    <p className="text-caption text-cs-muted">
      {totalItems && pageSize ? <>Hiển thị {from}–{to} / {totalItems}</> : <>{LABELS.pagination.page} {page} / {totalPages}</>}
    </p>
    <div className="flex items-center gap-1">
      <IconButton icon="chevron-left" label={LABELS.pagination.previous} size="sm" variant="outline" disabled={disabled || page <= 1} onClick={() => go(page - 1)}/>
      <div className="flex items-center gap-1 max-sm:hidden">
        {pageItems(page, totalPages).map((item, i) => item === "gap"
          ? <span key={`gap-${i}`} className="px-1 text-caption text-cs-muted" aria-hidden="true">…</span>
          : <button key={item} type="button" disabled={disabled} onClick={() => go(item)} aria-current={item === page ? "page" : undefined}
              aria-label={`${LABELS.pagination.page} ${item}`}
              className={`cs-btn cs-btn-sm min-w-8 px-2 ${item === page ? "cs-btn-primary" : "cs-btn-ghost"}`}>{item}</button>)}
      </div>
      <span className="px-2 text-caption text-cs-text sm:hidden">{page} / {totalPages}</span>
      <IconButton icon="chevron-right" label={LABELS.pagination.next} size="sm" variant="outline" disabled={disabled || page >= totalPages} onClick={() => go(page + 1)}/>
    </div>
  </nav>;
}
