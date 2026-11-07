import { formatVnd, requestTypeLabel, toNumber, type CustomerRequest } from "../../services/workflowService";

/**
 * Những gì khách chọn khi đặt lịch: gói (kèm nội dung), dịch vụ lẻ, mô tả tình trạng.
 * Giá là giá ước tính lúc đặt; giá chính thức chốt ở báo giá.
 */
export default function CustomerRequestSummary({ request, compact = false }: { request: CustomerRequest; compact?: boolean }) {
  const packages = request.packages ?? [];
  const services = request.services ?? [];
  const hasItems = packages.length > 0 || services.length > 0;

  return <div className="space-y-3 text-sm text-cs-text">
    <p className="text-xs text-cs-muted">Loại yêu cầu: <strong className="text-cs-text">{requestTypeLabel(request.request_type)}</strong></p>

    {packages.map(pkg => <div key={`package-${pkg.id}`} className="rounded-xl border border-cs-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold"><span className="mr-1.5 rounded bg-cs-soft px-1.5 py-0.5 text-[11px] font-bold uppercase text-cs-accent-text">Gói</span>{pkg.name}</p>
        {toNumber(pkg.pivot?.estimated_price) > 0 && <span className="text-xs text-cs-muted">Ước tính {formatVnd(pkg.pivot?.estimated_price)}</span>}
      </div>
      {!compact && (pkg.services?.length || pkg.parts?.length) ? <ul className="mt-2 space-y-0.5 text-xs text-cs-muted">
        {pkg.services?.map(service => <li key={`s-${service.id}`}>• {service.name}</li>)}
        {pkg.parts?.map(part => <li key={`p-${part.id}`}>• {part.name} × {part.pivot?.quantity ?? 1}{part.unit ? ` ${part.unit}` : ""}</li>)}
      </ul> : null}
    </div>)}

    {services.length > 0 && <ul className="space-y-1">
      {services.map(service => <li key={`service-${service.id}`} className="flex flex-wrap justify-between gap-2">
        <span>• {service.name}</span>
        {toNumber(service.pivot?.estimated_price) > 0 && <span className="text-xs text-cs-muted">Ước tính {formatVnd(service.pivot?.estimated_price)}</span>}
      </li>)}
    </ul>}

    {!hasItems && !request.symptom_description && <p className="text-cs-muted">Khách chưa chọn dịch vụ.</p>}

    {request.symptom_description && <div>
      <p className="text-xs text-cs-muted">Tình trạng khách mô tả</p>
      <p className="mt-1 whitespace-pre-wrap">{request.symptom_description}</p>
    </div>}
    {request.note && <p className="whitespace-pre-wrap text-xs text-cs-muted">Ghi chú: {request.note}</p>}
  </div>;
}
