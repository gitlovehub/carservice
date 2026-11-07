import { formatMinutes, type CatalogItem } from "../../../services/bookingCatalog";

type BookingSummaryProps = {
  vehicleLabel: string;
  items: CatalogItem[];
  hasSymptom: boolean;
  timeLabel?: string;
};

export default function BookingSummary({ vehicleLabel, items, hasSymptom, timeLabel }: BookingSummaryProps) {
  const pricedTotal = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const hasUnpricedItem = items.some((item) => item.price === null);
  const totalMinutes = items.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const duration = formatMinutes(totalMinutes);

  return (
    <aside
      aria-label="Tóm tắt lịch hẹn"
      className="rounded-[19px] border border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] p-5 lg:sticky lg:top-[106px]"
    >
      <h2 className="mb-3 text-base font-extrabold text-slate-900">Tóm tắt</h2>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Xe</dt>
          <dd className="font-semibold text-slate-900">{vehicleLabel}</dd>
        </div>
        {timeLabel && (
          <div>
            <dt className="text-xs text-slate-500">Thời gian</dt>
            <dd className="font-semibold text-slate-900">{timeLabel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-3">
        {items.length === 0 && !hasSymptom ? (
          <p className="text-sm text-slate-500">Chưa chọn dịch vụ.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {items.map((item) => (
              <li key={item.key} className="flex justify-between gap-3">
                <span className="text-slate-800">{item.name}</span>
              </li>
            ))}
            {hasSymptom && <li className="text-slate-800">Kiểm tra theo tình trạng xe</li>}
          </ul>
        )}
      </div>

      {(pricedTotal > 0 || hasUnpricedItem) && (
        <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
          <span className="text-xs text-slate-500">Ước tính</span>
          <span className="text-right text-base font-extrabold text-slate-900">
            {pricedTotal > 0 ? `Từ ${Math.round(pricedTotal).toLocaleString("vi-VN")} đ` : "Báo giá tại garage"}
          </span>
        </div>
      )}
      {duration && <p className="mt-1 text-right text-xs text-slate-500">{duration}</p>}

      <p className="mt-4 rounded-xl bg-[var(--cs-soft,#fff1f1)] px-3 py-2 text-xs text-slate-600">
        Giá chốt sau khi kiểm tra xe. Gara chỉ làm khi bạn đồng ý.
      </p>
    </aside>
  );
}
