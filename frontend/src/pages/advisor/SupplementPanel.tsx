import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import {
  formatVnd, supplementQuotations, workflowApi,
  type CatalogService, type QuotationLineInput, type WorkflowOrder,
} from "../../services/workflowService";
import { CounterApprovalPanel } from "./CounterApprovalPanel";
import { card, input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Báo giá phát sinh (P3) khi đang sửa: lý do bắt buộc, khách duyệt từng dòng (tài khoản hoặc mã email tại quầy).
 * Chỉ dòng khách đồng ý mới thành công việc và vào hóa đơn. Phát sinh không thay thế báo giá gốc.
 */
export function SupplementPanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const supplements = supplementQuotations(order);
  const inRepair = ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status);
  const pending = supplements.some(q => ["DRAFT", "SENT"].includes(q.status));
  const recommendedParts = (order.inspections ?? []).flatMap(i => i.recommendations ?? []).filter(r => r.item_type === "PART" && r.part);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [reason, setReason] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [partId, setPartId] = useState("");
  const [lines, setLines] = useState<Array<QuotationLineInput & { label: string }>>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inRepair || pending) return;
    let active = true;
    workflowApi.services().then(list => { if (active) setServices(list); }).catch(() => undefined);
    return () => { active = false; };
  }, [inRepair, pending]);

  if (!inRepair && !supplements.length) return null;

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  function addLine(kind: "SERVICE" | "PART") {
    if (kind === "SERVICE") {
      const service = services.find(s => s.id === Number(serviceId));
      if (service) setLines([...lines, { item_type: "SERVICE", service_id: service.id, quantity: 1, label: service.name }]);
      setServiceId("");
    } else {
      const rec = recommendedParts.find(r => Number(r.part_id) === Number(partId));
      if (rec) setLines([...lines, { item_type: "PART", part_id: Number(rec.part_id), quantity: Number(rec.quantity ?? 1), label: rec.part?.name ?? `Phụ tùng #${rec.part_id}` }]);
      setPartId("");
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!lines.length) { setError("Thêm ít nhất một hạng mục phát sinh."); return; }
    await run(() => workflowApi.createQuotation(order.id, {
      type: "SUPPLEMENT", reason: reason.trim(),
      items: lines.map(line => ({ item_type: line.item_type, service_id: line.service_id, part_id: line.part_id, quantity: line.quantity })),
    }), "Đã lập báo giá phát sinh (nháp). Kiểm tra rồi gửi khách.");
    setLines([]); setReason("");
  }

  return <section className={`${card} mt-6 print:hidden`} data-testid="supplement-panel">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent-text">Phát sinh khi sửa</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Báo giá phát sinh</h2>
    <p className="mt-1 text-xs text-cs-muted">Phát sinh cộng thêm vào báo giá gốc. Chỉ hạng mục khách đồng ý mới được làm và tính tiền.</p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

    {supplements.map(q => <div key={q.id} className="mt-4 rounded-xl border border-cs-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-cs-text">{q.quotation_code} <span className="ml-1 rounded-full bg-cs-soft px-2 py-0.5 text-xs">Phát sinh</span></p>
        <StatusBadge domain="quotation" status={q.status}/>
      </div>
      {q.reason && <p className="mt-1 text-xs text-cs-muted">Lý do: {q.reason}</p>}
      <ul className="mt-2 divide-y divide-cs-border text-sm">{q.items?.map(item => <li key={item.id} className="flex justify-between gap-3 py-1.5">
        <span>{item.description} × {item.quantity}</span>
        <span className="text-xs">{formatVnd(item.amount)} · {item.is_approved == null ? "Chưa trả lời" : item.is_approved ? "✓ Đồng ý" : "✗ Từ chối"}</span>
      </li>)}</ul>
      {q.status === "DRAFT" && <div className="mt-3"><Button variant="primary" loading={working} onClick={() => void run(() => workflowApi.sendQuotation(q.id), "Đã gửi báo giá phát sinh cho khách.")}>Gửi khách duyệt</Button></div>}
      {q.status === "SENT" && <>
        <div className="mt-3"><Notice>Chờ khách duyệt: trong tài khoản (sau đó bấm "Làm mới") hoặc tại quầy bằng mã gửi email chủ xe.</Notice></div>
        <CounterApprovalPanel quotation={q} onDone={onChanged}/>
      </>}
    </div>)}

    {inRepair && !pending && <form className="mt-5 space-y-3 border-t border-cs-border pt-4" onSubmit={event => void create(event)}>
      <h3 className="text-sm font-bold text-cs-text">Lập báo giá phát sinh</h3>
      <label className="block text-xs font-semibold text-cs-muted">Lý do phát sinh (khách sẽ thấy)<textarea className={input} rows={2} required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select className={input} aria-label="Dịch vụ phát sinh" value={serviceId} onChange={e => setServiceId(e.target.value)}><option value="">Chọn dịch vụ…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} · {formatVnd(s.base_price)}</option>)}</select>
        <Button variant="secondary" disabled={!serviceId} onClick={() => addLine("SERVICE")}>Thêm dịch vụ</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select className={input} aria-label="Phụ tùng phát sinh" value={partId} onChange={e => setPartId(e.target.value)}><option value="">Chọn phụ tùng đã có trong đề xuất chẩn đoán…</option>{recommendedParts.map(r => <option key={r.id} value={r.part_id ?? ""}>{r.part?.name}</option>)}</select>
        <Button variant="secondary" disabled={!partId} onClick={() => addLine("PART")}>Thêm phụ tùng</Button>
      </div>
      {lines.length > 0 && <ul className="space-y-1 text-sm">{lines.map((line, index) => <li key={index} className="flex justify-between gap-3">
        <span>{line.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}: {line.label} × {line.quantity}</span>
        <Button size="sm" variant="ghost" aria-label="Bỏ dòng" onClick={() => setLines(lines.filter((_, i) => i !== index))}>✕</Button>
      </li>)}</ul>}
      <Button type="submit" variant="primary" loading={working} disabled={!lines.length || reason.trim().length < 5}>Lập báo giá phát sinh</Button>
    </form>}
  </section>;
}
