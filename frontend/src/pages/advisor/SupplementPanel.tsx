import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import {
  formatVnd, supplementQuotations, workflowApi,
  type CatalogPart, type CatalogService, type QuotationLineInput, type WorkflowOrder,
} from "../../services/workflowService";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { CounterApprovalPanel } from "./CounterApprovalPanel";
import { OvernightField } from "./QuotationEditModal";
import { card, input, inputBare, Notice, Req } from "./WorkflowUI";
import { errorText } from "./workflowFormat";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";

/**
 * Báo giá phát sinh (P3) khi đang sửa: lý do bắt buộc, khách duyệt từng dòng (tài khoản hoặc mã email tại quầy).
 * Chỉ dòng khách đồng ý mới thành công việc và vào hóa đơn. Phát sinh không thay thế báo giá gốc.
 */
export function SupplementPanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const supplements = supplementQuotations(order);
  const inRepair = ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status);
  const pending = supplements.some(q => ["DRAFT", "SENT"].includes(q.status));
  const [services, setServices] = useState<CatalogService[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [overnight, setOvernight] = useState(false);
  const [reason, setReason] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [partId, setPartId] = useState("");
  const [lines, setLines] = useState<Array<QuotationLineInput & { label: string }>>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();

  useEffect(() => {
    if (!inRepair || pending) return;
    let active = true;
    Promise.all([workflowApi.services(), workflowApi.parts()])
      .then(([serviceList, partList]) => { if (active) { setServices(serviceList); setParts(partList); } })
      .catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, [inRepair, pending]);

  if (!inRepair && !supplements.length) return null;

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  function addLine(kind: "SERVICE" | "PART") {
    fieldErrors.clear("lines");
    if (kind === "SERVICE") {
      const service = services.find(s => s.id === Number(serviceId));
      if (service) setLines([...lines, { item_type: "SERVICE", service_id: service.id, quantity: 1, label: service.name }]);
      setServiceId("");
    } else {
      const part = parts.find(p => p.id === Number(partId));
      if (part) setLines([...lines, { item_type: "PART", part_id: part.id, quantity: 1, label: part.name }]);
      setPartId("");
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const problems: FieldErrors = {};
    if (reason.trim().length < 5) problems.reason = "Ghi lý do phát sinh (ít nhất 5 ký tự).";
    if (!lines.length) problems.lines = "Thêm ít nhất một hạng mục phát sinh.";
    setError("");
    if (fieldErrors.show(problems)) return;
    await run(() => workflowApi.createQuotation(order.id, {
      type: "SUPPLEMENT", reason: reason.trim(), stays_overnight: overnight,
      items: lines.map(line => ({ item_type: line.item_type, service_id: line.service_id, part_id: line.part_id, quantity: line.quantity })),
    }), "Đã lập báo giá phát sinh (nháp). Kiểm tra rồi gửi khách.");
    setLines([]); setReason(""); setOvernight(false);
  }

  const picked = (type: "SERVICE" | "PART", id: number) => lines.some(line => line.item_type === type && (type === "PART" ? line.part_id : line.service_id) === id);

  return <section className={`${card} print:hidden`} data-testid="supplement-panel">
    <h2 className="text-lg font-bold text-cs-text">Báo giá phát sinh</h2>
    <p className="mt-1 text-xs text-cs-muted">Phát sinh cộng thêm vào báo giá gốc. Chỉ hạng mục khách đồng ý mới được làm và tính tiền.</p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

    {supplements.map(q => <div key={q.id} className="mt-4 rounded-xl border border-cs-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-cs-text">{q.quotation_code} <span className="ml-1 rounded-full bg-cs-soft px-2 py-0.5 text-xs">Phát sinh</span></p>
        <StatusBadge domain="quotation" status={q.status}/>
      </div>
      {q.reason && <p className="mt-1 text-xs text-cs-muted">Lý do: {q.reason}</p>}
      {q.stays_overnight && <p className="mt-1 text-xs font-semibold text-warning-fg">Báo khách: xe lưu xưởng qua đêm, không tính phí.</p>}
      <ul className="mt-2 divide-y divide-cs-border text-sm">{q.items?.map(item => <li key={item.id} className="flex justify-between gap-3 py-1.5">
        <span>{item.description} × {item.quantity}</span>
        <span className="text-xs">{formatVnd(item.amount)} · {item.is_approved == null ? "Chưa trả lời" : item.is_approved ? "✓ Đồng ý" : "✗ Từ chối"}</span>
      </li>)}</ul>
      {q.status === "DRAFT" && <div className="mt-3"><Button variant="primary" icon="send" loading={working} onClick={() => void run(() => workflowApi.sendQuotation(q.id), "Đã gửi báo giá phát sinh cho khách (thông báo trên web, kèm email có link duyệt nếu khách đặt lịch).")}>Gửi khách duyệt</Button></div>}
      {q.status === "SENT" && <>
        <div className="mt-3"><Notice>Chờ khách duyệt: trong tài khoản (màn hình tự cập nhật khi khách trả lời) hoặc tại quầy bằng mã gửi email chủ xe.</Notice></div>
        <CounterApprovalPanel quotation={q} owner={order.customer} onDone={onChanged}/>
      </>}
    </div>)}

    {inRepair && !pending && <form noValidate className="mt-5 space-y-3 border-t border-cs-border pt-4" onSubmit={event => void create(event)}>
      <h3 className="text-sm font-bold text-cs-text">Lập báo giá phát sinh</h3>
      <label className="block text-xs font-semibold text-cs-muted">Lý do phát sinh (khách sẽ thấy)<Req/><textarea className={input} rows={2} required minLength={5} maxLength={1000} aria-invalid={!!fieldErrors.errors.reason || undefined} value={reason} onChange={e => { setReason(e.target.value); fieldErrors.clear("reason"); }}/><FieldError className="mt-1">{fieldErrors.errors.reason}</FieldError></label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select className={inputBare} aria-label="Dịch vụ phát sinh" aria-invalid={!!fieldErrors.errors.lines || undefined} value={serviceId} onChange={e => setServiceId(e.target.value)}><option value="">Chọn dịch vụ…</option>{services.filter(s => !picked("SERVICE", s.id)).map(s => <option key={s.id} value={s.id}>{s.name} · {formatVnd(s.base_price)}</option>)}</select>
        <Button variant="tonal" icon="plus" disabled={!serviceId} onClick={() => addLine("SERVICE")}>Thêm dịch vụ</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select className={inputBare} aria-label="Phụ tùng phát sinh" value={partId} onChange={e => setPartId(e.target.value)}><option value="">Chọn phụ tùng…</option>{parts.filter(p => !picked("PART", p.id)).map(p => <option key={p.id} value={p.id}>{p.name} · {formatVnd(p.sell_price)} · tồn {p.inventory?.quantity ?? 0}</option>)}</select>
        <Button variant="tonal" icon="plus" disabled={!partId} onClick={() => addLine("PART")}>Thêm phụ tùng</Button>
      </div>
      <FieldError>{fieldErrors.errors.lines}</FieldError>
      {lines.length > 0 && <ul className="space-y-1.5 text-sm">{lines.map((line, index) => <li key={`${line.item_type}-${line.part_id ?? line.service_id}`} className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 flex-1">{line.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}: {line.label}</span>
        <QuantityStepper label={`Số lượng ${line.label}`} size="sm" max={9999} className="w-28" value={line.quantity} onChange={value => setLines(lines.map((item, i) => i === index ? { ...item, quantity: value ?? 1 } : item))}/>
        <IconButton size="sm" icon="x" tone="danger" label="Bỏ dòng" onClick={() => setLines(lines.filter((_, i) => i !== index))}/>
      </li>)}</ul>}
      <OvernightField checked={overnight} onChange={setOvernight}/>
      <Button type="submit" variant="primary" loading={working}>Lập báo giá phát sinh</Button>
    </form>}
  </section>;
}
