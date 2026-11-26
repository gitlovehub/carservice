import { Badge } from "../../components/ui/Badge";
import { formatVnd, toNumber, type CustomerRequest } from "../../services/workflowService";

/** Tag phân loại hạng mục khách chọn, cùng kiểu nhãn trạng thái: Gói (vàng đồng) / Dịch vụ (xanh). */
function ItemTag({ kind }: { kind: "package" | "service" }) {
  // `!`: khung .cs-info-panel ép chữ bên trong theo màu khung, tag phải giữ màu riêng.
  return <Badge dot={false} tone={kind === "package" ? "accent" : "info"} className={`rounded-[4px]! ${kind === "package" ? "text-cs-accent-text!" : "text-info-fg!"}`}>{kind === "package" ? "Gói" : "Dịch vụ"}</Badge>;
}

/**
 * Những gì khách chọn khi đặt lịch: gói (kèm nội dung), dịch vụ lẻ, mô tả tình trạng.
 * Giá là giá ước tính lúc đặt; giá chính thức chốt ở báo giá.
 */
export default function CustomerRequestSummary({ request, compact = false }: { request: CustomerRequest; compact?: boolean }) {
  const packages = request.packages ?? [];
  const services = request.services ?? [];
  const hasItems = packages.length > 0 || services.length > 0;

  return <div className="space-y-3 text-sm text-cs-text">
    {packages.map(pkg => <div key={`package-${pkg.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 font-semibold">{pkg.name}<ItemTag kind="package"/></p>
        {toNumber(pkg.pivot?.estimated_price) > 0 && <span className="text-xs text-cs-muted">Ước tính {formatVnd(pkg.pivot?.estimated_price)}</span>}
      </div>
      {!compact && (pkg.services?.length || pkg.parts?.length) ? <ul className="mt-2 space-y-0.5 text-xs text-cs-muted">
        {pkg.services?.filter(service => service.name).map(service => <li key={`s-${service.id}`}>• {service.name}</li>)}
        {pkg.parts?.map(part => <li key={`p-${part.id}`}>• {part.name} × {part.pivot?.quantity ?? 1}{part.unit ? ` ${part.unit}` : ""}</li>)}
      </ul> : null}
    </div>)}

    {services.length > 0 && <ul className="space-y-1.5">
      {services.map(service => <li key={`service-${service.id}`} className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2 font-semibold">{service.name}<ItemTag kind="service"/></span>
        {toNumber(service.pivot?.estimated_price) > 0 && <span className="text-xs text-cs-muted">Ước tính {formatVnd(service.pivot?.estimated_price)}</span>}
      </li>)}
    </ul>}

    {/* Tổng dự kiến = cộng giá ước tính từng gói / dịch vụ lúc đặt (chỉ hiện khi có từ 2 mục có giá). */}
    {(() => {
      const prices = [...packages.map(p => toNumber(p.pivot?.estimated_price)), ...services.map(s => toNumber(s.pivot?.estimated_price))].filter(v => v > 0);
      if (prices.length < 2) return null;
      return <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-cs-border pt-2">
        <span className="font-semibold">Tổng dự kiến</span>
        <b className="tabular-nums text-cs-accent-text">{formatVnd(prices.reduce((sum, v) => sum + v, 0))}</b>
      </div>;
    })()}

    {!hasItems && !request.symptom_description && <p className="text-cs-muted">Khách chưa chọn dịch vụ.</p>}

    {request.symptom_description && <p className="whitespace-pre-wrap font-normal">
      <b className="font-semibold">Khách mô tả: </b>{request.symptom_description}
    </p>}
    {request.note && <p className="whitespace-pre-wrap font-normal"><b className="font-semibold">Ghi chú khi đặt lịch: </b>{request.note}</p>}
  </div>;
}
