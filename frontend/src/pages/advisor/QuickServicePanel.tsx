import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { formatVnd, workflowApi, type CatalogService, type WorkflowOrder } from "../../services/workflowService";
import { card, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Dịch vụ nhanh (P5): chọn dịch vụ mức "Nhanh" → gửi khách báo giá niêm yết, bỏ bước chẩn đoán.
 * Backend bắt buộc: biên bản nhận xe đã xác nhận + đủ 4 ảnh tổng quan; khách vẫn phải duyệt giá.
 */
export function QuickServicePanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const checkedIn = (order.handovers ?? []).some(h => h.type === "CHECK_IN" && h.status === "CONFIRMED");
  const visible = order.status === "RECEIVED" && checkedIn;
  const [services, setServices] = useState<CatalogService[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    let active = true;
    workflowApi.services().then(list => { if (active) setServices(list.filter(s => s.service_level === "QUICK" && (s.status ?? "ACTIVE") === "ACTIVE")); }).catch(() => undefined);
    return () => { active = false; };
  }, [visible]);

  if (!visible || !services.length) return null;
  const total = services.filter(s => selected.includes(s.id)).reduce((sum, s) => sum + Number(s.base_price ?? 0), 0);

  async function submit() {
    setWorking(true); setError("");
    try { await workflowApi.quickQuotation(order.id, selected); await onChanged("Đã gửi báo giá dịch vụ nhanh. Chờ khách duyệt giá."); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <section className={`${card} mt-6 print:hidden`} data-testid="quick-service-panel">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent-text">Dịch vụ nhanh</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Báo giá niêm yết (không qua chẩn đoán)</h2>
    <p className="mt-1 text-xs text-cs-muted">Chỉ dùng cho dịch vụ mức "Nhanh". Cần đủ 4 ảnh tổng quan (đầu, đuôi, trái, phải) trong biên bản nhận xe. Khách vẫn phải duyệt giá trước khi làm. Việc khác cần kiểm tra → dùng bước chẩn đoán bên dưới.</p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    <ul className="mt-3 space-y-1.5">{services.map(service => <li key={service.id}>
      <label className="flex items-center gap-2 text-sm text-cs-text">
        <input type="checkbox" checked={selected.includes(service.id)} onChange={e => setSelected(e.target.checked ? [...selected, service.id] : selected.filter(id => id !== service.id))}/>
        {service.name} <span className="text-cs-muted">· {formatVnd(service.base_price)}{service.estimated_minutes ? ` · ~${service.estimated_minutes} phút` : ""}</span>
      </label>
    </li>)}</ul>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-cs-text">Tổng: <strong>{formatVnd(total)}</strong></p>
      <Button variant="primary" loading={working} disabled={!selected.length} onClick={() => void submit()}>Gửi báo giá dịch vụ nhanh</Button>
    </div>
  </section>;
}
