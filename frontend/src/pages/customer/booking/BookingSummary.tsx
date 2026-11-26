import { Icon, type IconName } from "../../../components/ui/Icon";
import { formatCatalogPrice, formatMinutes, type CatalogItem } from "../../../services/bookingCatalog";

type BookingSummaryProps = {
  vehicleLabel: string;
  items: CatalogItem[];
  hasSymptom: boolean;
  timeLabel?: string;
};

/** Icon danh mục do admin chọn (API trả tên icon); thiếu thì dùng icon mặc định. */
const iconOf = (item: CatalogItem): IconName => (item.icon ? (item.icon as IconName) : item.type === "package" ? "layers" : "wrench");

/**
 * Cột "Tóm tắt lịch hẹn" (bước Dịch vụ & Xác nhận) — cùng phong cách khung "Thông tin đã chọn" ở bước Ngày giờ:
 * tiêu đề có icon, dòng thông tin có ô icon, danh sách dịch vụ kèm giá, ô tạm tính nổi bật, ghi chú cuối.
 */
export default function BookingSummary({ vehicleLabel, items, hasSymptom, timeLabel }: BookingSummaryProps) {
  const pricedTotal = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const hasUnpricedItem = items.some((item) => item.price === null);
  const totalMinutes = items.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const duration = formatMinutes(totalMinutes);
  const count = items.length + (hasSymptom ? 1 : 0);

  return (
    <aside
      aria-label="Tóm tắt lịch hẹn"
      className="overflow-hidden rounded-[19px] border border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] lg:sticky lg:top-[106px]"
    >
      <div className="px-5 pt-1.5">
        <div className="flex items-center gap-3 border-b border-cs-border py-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cs-surface-2 text-cs-text-2"><Icon name="car" size={18}/></span>
          <div className="min-w-0"><p className="text-xs text-cs-muted">Xe</p><p className="truncate text-sm font-bold text-cs-text">{vehicleLabel}</p></div>
        </div>
        {timeLabel && (
          <div className="flex items-center gap-3 border-b border-cs-border py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cs-surface-2 text-cs-text-2"><Icon name="clock" size={18}/></span>
            <div className="min-w-0"><p className="text-xs text-cs-muted">Thời gian</p><p className="text-sm font-bold text-cs-text">{timeLabel}</p></div>
          </div>
        )}

        <div className="py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-cs-muted">Dịch vụ</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${count ? "bg-[#e11d2e] text-white" : "bg-cs-surface-2 text-cs-muted"}`}>{count} mục</span>
          </div>
          {count === 0 ? (
            <p className="rounded-xl border border-dashed border-cs-border px-3 py-3 text-center text-sm text-cs-muted">Chưa chọn dịch vụ.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.key} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${item.type === "package" ? "bg-[#e11d2e] text-white" : "bg-[#fde8eb] text-[#e11d2e] dark:bg-[var(--cs-soft)] dark:text-[var(--cs-accent-text)]"}`}>
                    <Icon name={iconOf(item)} size={14}/>
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-cs-text">{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-cs-text-2">{formatCatalogPrice(item.price).replace("Từ ", "")}</span>
                </li>
              ))}
              {hasSymptom && (
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Icon name="search" size={14}/></span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-cs-text">Kiểm tra theo tình trạng xe</span>
                  <span className="shrink-0 text-xs font-semibold text-cs-text-2">Báo giá sau</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {(pricedTotal > 0 || hasUnpricedItem) && (
        <div className="mx-5 rounded-2xl bg-cs-surface-2 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-cs-muted">Tạm tính</span>
            <span className="text-right text-lg font-extrabold text-[#e11d2e] dark:text-[var(--cs-accent-text)]">
              {pricedTotal > 0 ? `Từ ${Math.round(pricedTotal).toLocaleString("vi-VN")} đ` : "Báo giá tại garage"}
            </span>
          </div>
          {duration && <p className="mt-1 flex items-center justify-end gap-1 text-xs text-cs-muted"><span className="text-[#e11d2e] dark:text-[var(--cs-accent-text)]"><Icon name="clock" size={12}/></span>Dự kiến {duration}</p>}
        </div>
      )}

      <p className="m-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Icon name="shield" size={16}/>
        <span>Giá chốt sau khi kiểm tra xe. Gara chỉ làm khi bạn đồng ý.</span>
      </p>
    </aside>
  );
}
