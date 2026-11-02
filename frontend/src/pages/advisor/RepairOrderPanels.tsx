import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import {
  formatVnd, latestQuotation, toNumber, workflowApi,
  type CatalogPart, type CatalogService, type QuotationLineInput, type WorkflowOrder, type WorkflowQuotation,
} from "../../services/workflowService";
import { action, card, errorText, input, Notice, outline } from "./WorkflowUI";

/** Panels for the steps after diagnosis; every action calls Laravel and then reloads the order. */
type PanelProps = { order: WorkflowOrder; onChanged: (message: string) => Promise<void> };

const quotationStatusText: Record<string, string> = {
  DRAFT: "Bản nháp", SENT: "Đã gửi khách", APPROVED: "Khách duyệt toàn bộ",
  PARTIALLY_APPROVED: "Khách duyệt một phần", REJECTED: "Khách từ chối", CANCELLED: "Đã hủy",
};

function QuotationTable({ quotation, approvals, onToggle }: {
  quotation: WorkflowQuotation;
  approvals?: Record<number, boolean>;
  onToggle?: (itemId: number, approved: boolean) => void;
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
    <thead><tr className="border-b border-cs-border text-left text-xs text-cs-muted">
      <th className="py-2 pr-3">Hạng mục</th><th className="py-2 pr-3">Loại</th><th className="py-2 pr-3 text-right">SL</th>
      <th className="py-2 pr-3 text-right">Đơn giá</th><th className="py-2 pr-3 text-right">Thành tiền</th><th className="py-2">Khách</th>
    </tr></thead>
    <tbody>{quotation.items?.map(item => <tr key={item.id} className="border-b border-cs-border/60 text-cs-text">
      <td className="py-2 pr-3 font-semibold">{item.description}</td>
      <td className="py-2 pr-3 text-xs text-cs-muted">{item.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}</td>
      <td className="py-2 pr-3 text-right">{item.quantity}</td>
      <td className="py-2 pr-3 text-right">{formatVnd(item.unit_price)}</td>
      <td className="py-2 pr-3 text-right font-semibold">{formatVnd(item.amount)}</td>
      <td className="py-2 text-xs">{onToggle && approvals
        ? <label className="inline-flex items-center gap-2"><input type="checkbox" checked={approvals[item.id] ?? true} onChange={event => onToggle(item.id, event.target.checked)}/>Đồng ý</label>
        : item.is_approved == null ? "Chưa trả lời" : item.is_approved ? "✓ Đồng ý" : "✗ Từ chối"}</td>
    </tr>)}</tbody>
  </table>
    <div className="mt-3 space-y-1 text-right text-sm text-cs-text">
      <p>Tạm tính: {formatVnd(quotation.subtotal)}</p>
      {toNumber(quotation.discount_amount) > 0 && <p>Giảm giá: −{formatVnd(quotation.discount_amount)}</p>}
      <p className="text-base font-black">Tổng: {formatVnd(quotation.total_amount)}</p>
    </div>
  </div>;
}

type DraftLine = { key: number; item_type: "SERVICE" | "PART"; ref_id: string; quantity: string; unit_price: string; description: string };

export function QuotationPanel({ order, onChanged }: PanelProps) {
  const { confirm } = useAppFeedback();
  const quotation = latestQuotation(order);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [discount, setDiscount] = useState("0");
  const [approvals, setApprovals] = useState<Record<number, boolean>>({});

  const recommendations = useMemo(() => order.inspections?.flatMap(item => item.recommendations ?? []) ?? [], [order.inspections]);
  const recommendedPartIds = useMemo(() => new Set(recommendations.filter(rec => rec.item_type === "PART").map(rec => Number(rec.part_id))), [recommendations]);
  const [lines, setLines] = useState<DraftLine[]>(() => recommendations.map((rec, index) => ({
    key: index + 1,
    item_type: rec.item_type === "PART" ? "PART" : "SERVICE",
    ref_id: String(rec.item_type === "PART" ? rec.part_id ?? "" : rec.service_id ?? ""),
    quantity: String(rec.quantity ?? 1),
    unit_price: String(toNumber(rec.item_type === "PART" ? rec.part?.sell_price : rec.service?.base_price)),
    description: "",
  })));

  useEffect(() => {
    let active = true;
    Promise.all([workflowApi.services(), workflowApi.parts()])
      .then(([serviceList, partList]) => { if (active) { setServices(serviceList); setParts(partList); } })
      .catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, []);

  const canBuild = ["INSPECTING", "QUOTING", "WAITING_APPROVAL"].includes(order.status)
    && (!quotation || ["REJECTED", "CANCELLED"].includes(quotation.status));
  const draftTotal = lines.reduce((sum, line) => sum + toNumber(line.unit_price) * toNumber(line.quantity), 0) - toNumber(discount);

  function updateLine(key: number, changes: Partial<DraftLine>) {
    setLines(previous => previous.map(line => {
      if (line.key !== key) return line;
      const next = { ...line, ...changes };
      if (changes.ref_id !== undefined || changes.item_type !== undefined) {
        const price = next.item_type === "PART"
          ? parts.find(part => part.id === Number(next.ref_id))?.sell_price
          : services.find(service => service.id === Number(next.ref_id))?.base_price;
        next.unit_price = String(toNumber(price));
        if (changes.item_type !== undefined) next.ref_id = "";
      }
      return next;
    }));
  }

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function createQuotation(event: FormEvent) {
    event.preventDefault();
    const items: QuotationLineInput[] = [];
    for (const line of lines) {
      const refId = Number(line.ref_id); const quantity = Number(line.quantity);
      if (!Number.isSafeInteger(refId) || refId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
        setError("Mỗi dòng cần chọn hạng mục và số lượng nguyên dương."); return;
      }
      items.push({
        item_type: line.item_type,
        ...(line.item_type === "PART" ? { part_id: refId } : { service_id: refId }),
        quantity, unit_price: toNumber(line.unit_price),
        ...(line.description.trim() ? { description: line.description.trim() } : {}),
      });
    }
    if (!items.length) { setError("Báo giá cần ít nhất một dòng."); return; }
    await run(() => workflowApi.createQuotation(order.id, { discount_amount: toNumber(discount), items }), "Đã lập báo giá nháp. Kiểm tra lại rồi gửi khách.");
  }

  async function sendQuotation() {
    if (!quotation || !await confirm({ title: "Gửi báo giá cho khách", reference: quotation.quotation_code, description: `Khách sẽ thấy báo giá ${formatVnd(quotation.total_amount)} trong tài khoản và duyệt từng hạng mục.`, confirmText: "Gửi báo giá" })) return;
    await run(() => workflowApi.sendQuotation(quotation.id), "Đã gửi báo giá. Phiếu chuyển sang chờ khách duyệt.");
  }

  async function recordResponse() {
    if (!quotation?.items) return;
    const responses = quotation.items.map(item => ({ item_id: item.id, is_approved: approvals[item.id] ?? true }));
    const approvedCount = responses.filter(item => item.is_approved).length;
    if (!await confirm({ title: "Ghi nhận phản hồi của khách tại quầy", reference: quotation.quotation_code, description: `Khách đồng ý ${approvedCount}/${responses.length} hạng mục. Chỉ hạng mục được đồng ý mới được sửa và tính tiền.`, confirmText: "Ghi nhận" })) return;
    await run(() => workflowApi.respondQuotation(quotation.id, responses), "Đã ghi nhận phản hồi báo giá của khách.");
  }

  async function startRepair() {
    if (!await confirm({ title: "Bắt đầu sửa chữa", description: "Tạo công việc cho KTV từ các dịch vụ khách đã duyệt và chuyển phiếu sang đang sửa chữa.", confirmText: "Bắt đầu sửa" })) return;
    await run(() => workflowApi.transition(order.id, "start-repair"), "Đã bắt đầu sửa chữa. KTV thấy công việc trên phiếu.");
  }

  async function closeDeclined() {
    if (!await confirm({ title: "Đóng phiếu do khách từ chối báo giá", description: "Phiếu chuyển sang CLOSED và không thể mở lại. Chỉ làm khi khách không sửa nữa.", confirmText: "Đóng phiếu", variant: "danger" })) return;
    await run(() => workflowApi.close(order.id, "CUSTOMER_DECLINED_QUOTE", "Khách từ chối báo giá."), "Đã đóng phiếu.");
  }

  if (!quotation && !canBuild) return null;
  return <section className={`${card} mt-6 print:hidden`}>
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent">Bước 3 · Báo giá</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Báo giá cho khách {quotation && <span className="ml-2 text-sm font-semibold text-cs-muted">{quotation.quotation_code} · {quotationStatusText[quotation.status] || quotation.status}</span>}</h2>
    <div className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>

    {quotation && <QuotationTable quotation={quotation} approvals={quotation.status === "SENT" ? approvals : undefined}
      onToggle={quotation.status === "SENT" ? (itemId, approved) => setApprovals(previous => ({ ...previous, [itemId]: approved })) : undefined}/>}

    {quotation?.status === "DRAFT" && <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={action} disabled={working} onClick={() => void sendQuotation()}>Gửi báo giá cho khách</button></div>}
    {quotation?.status === "SENT" && <div className="mt-5 space-y-3">
      <Notice>Khách có thể tự duyệt trong tài khoản. Nếu khách trả lời trực tiếp tại quầy, bỏ chọn hạng mục bị từ chối rồi ghi nhận.</Notice>
      <button type="button" className={action} disabled={working} onClick={() => void recordResponse()}>Ghi nhận phản hồi tại quầy</button>
    </div>}
    {quotation && ["APPROVED", "PARTIALLY_APPROVED"].includes(quotation.status) && order.status === "WAITING_APPROVAL" &&
      <div className="mt-5"><button type="button" className={action} disabled={working} onClick={() => void startRepair()}>Bắt đầu sửa chữa →</button></div>}
    {quotation?.status === "REJECTED" && order.status === "WAITING_APPROVAL" && <div className="mt-5 flex flex-wrap gap-3">
      <Notice tone="error">Khách từ chối toàn bộ báo giá. Lập báo giá mới bên dưới hoặc đóng phiếu.</Notice>
      <button type="button" className={outline} disabled={working} onClick={() => void closeDeclined()}>Đóng phiếu (khách từ chối)</button>
    </div>}

    {canBuild && <form className="mt-6 space-y-4 border-t border-cs-border pt-5" onSubmit={event => void createQuotation(event)}>
      <h3 className="font-bold text-cs-text">{quotation ? "Lập báo giá mới" : "Lập báo giá từ kết quả chẩn đoán"}</h3>
      {!recommendations.length && <Notice>KTV chưa đề xuất hạng mục. Có thể thêm dịch vụ thủ công; phụ tùng chỉ được báo giá khi KTV đã đề xuất.</Notice>}
      {lines.map(line => <div key={line.key} className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 md:grid-cols-[120px_minmax(0,2fr)_80px_140px_minmax(0,1.5fr)_auto] md:items-end">
        <label className="text-xs font-semibold text-cs-muted">Loại<select className={input} value={line.item_type} onChange={event => updateLine(line.key, { item_type: event.target.value as "SERVICE" | "PART" })}><option value="SERVICE">Dịch vụ</option><option value="PART">Phụ tùng</option></select></label>
        <label className="text-xs font-semibold text-cs-muted">Hạng mục *<select required className={input} value={line.ref_id} onChange={event => updateLine(line.key, { ref_id: event.target.value })}>
          <option value="">— Chọn —</option>
          {line.item_type === "SERVICE"
            ? services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)
            : parts.filter(part => recommendedPartIds.has(part.id)).map(part => <option key={part.id} value={part.id}>{part.name} · tồn {part.inventory?.quantity ?? 0}</option>)}
        </select></label>
        <label className="text-xs font-semibold text-cs-muted">SL<input className={input} type="number" min="1" step="1" required value={line.quantity} onChange={event => updateLine(line.key, { quantity: event.target.value })}/></label>
        <label className="text-xs font-semibold text-cs-muted">Đơn giá (₫)<input className={input} type="number" min="0" step="any" required value={line.unit_price} onChange={event => updateLine(line.key, { unit_price: event.target.value })}/></label>
        <label className="text-xs font-semibold text-cs-muted">Mô tả (tùy chọn)<input className={input} value={line.description} onChange={event => updateLine(line.key, { description: event.target.value })} placeholder="Mặc định: tên hạng mục"/></label>
        <button type="button" className={outline} onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))}>Xóa</button>
      </div>)}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <button type="button" className={outline} onClick={() => setLines(previous => [...previous, { key: Date.now(), item_type: "SERVICE", ref_id: "", quantity: "1", unit_price: "0", description: "" }])}>+ Thêm dòng</button>
          <label className="text-xs font-semibold text-cs-muted">Giảm giá (₫)<input className={input} type="number" min="0" step="any" value={discount} onChange={event => setDiscount(event.target.value)}/></label>
        </div>
        <div className="text-right"><p className="text-sm text-cs-muted">Tổng dự kiến</p><p className="text-xl font-black text-cs-text">{formatVnd(draftTotal)}</p></div>
      </div>
      <button type="submit" className={action} disabled={working || !lines.length}>{working ? "Đang lưu..." : "Lưu báo giá nháp"}</button>
    </form>}
  </section>;
}

const workStatusText: Record<string, string> = { PENDING: "Chờ làm", IN_PROGRESS: "Đang làm", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };

export function RepairPanel({ order, onChanged }: PanelProps) {
  const { confirm } = useAppFeedback();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const approvedParts = latestQuotation(order)?.items?.filter(item => item.item_type === "PART" && item.is_approved) ?? [];
  const workItems = order.work_items ?? [];
  const unfinished = workItems.filter(item => ["PENDING", "IN_PROGRESS"].includes(item.status)).length;
  const inRepair = ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status);

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function exportPart(event: FormEvent) {
    event.preventDefault();
    const part = Number(partId); const amount = Number(quantity);
    if (!Number.isSafeInteger(part) || part < 1 || !Number.isSafeInteger(amount) || amount < 1) { setError("Chọn phụ tùng và số lượng nguyên dương."); return; }
    await run(() => workflowApi.recordUsedPart(order.id, { part_id: part, quantity: amount }), "Đã ghi phụ tùng thực dùng và trừ tồn kho.");
    setPartId(""); setQuantity("1");
  }

  async function complete() {
    if (!await confirm({ title: "Hoàn thành sửa chữa", description: "Xác nhận xe đã sửa xong và chạy thử đạt. Sau bước này cố vấn lập hóa đơn để thu tiền.", confirmText: "Hoàn thành" })) return;
    await run(() => workflowApi.transition(order.id, "complete", note.trim() || undefined), "Phiếu đã hoàn thành. Tiếp theo: lập hóa đơn.");
  }

  if (!inRepair && !workItems.length) return null;
  return <section className={`${card} mt-6 print:hidden`}>
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent">Bước 4 · Sửa chữa</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Tiến độ sửa chữa</h2>
    <div className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>
    {order.status === "WAITING_FOR_PARTS" && <Notice>Phiếu đang chờ phụ tùng. Khi hàng về, bấm Tiếp tục sửa chữa.</Notice>}

    <h3 className="mb-2 text-sm font-bold text-cs-text">Công việc ({workItems.length - unfinished}/{workItems.length} xong)</h3>
    {workItems.length ? <ul className="space-y-2">{workItems.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 text-sm">
      <div><p className="font-semibold text-cs-text">{item.service?.name || item.description || `Công việc #${item.id}`}</p><p className="text-xs text-cs-muted">{workStatusText[item.status] || item.status}</p></div>
      {inRepair && <div className="flex gap-2">
        {item.status === "PENDING" && <button type="button" className={outline} disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(item.id, "IN_PROGRESS"), "Đã bắt đầu công việc.")}>Bắt đầu</button>}
        {item.status === "IN_PROGRESS" && <button type="button" className={outline} disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(item.id, "COMPLETED"), "Đã hoàn thành công việc.")}>Xong</button>}
      </div>}
    </li>)}</ul> : <p className="text-sm text-cs-muted">Báo giá không có dịch vụ nào được duyệt nên không có công việc.</p>}

    <h3 className="mb-2 mt-6 text-sm font-bold text-cs-text">Phụ tùng thực dùng (đã xuất kho)</h3>
    {order.used_parts?.length ? <ul className="space-y-1 text-sm text-cs-text">{order.used_parts.map(part => <li key={part.id}>• {part.part?.name || `Phụ tùng #${part.part_id}`} × {part.quantity} · {formatVnd(part.unit_price)}</li>)}</ul>
      : <p className="text-sm text-cs-muted">Chưa xuất phụ tùng nào.</p>}
    {order.status === "IN_PROGRESS" && approvedParts.length > 0 && <form className="mt-3 grid gap-3 md:grid-cols-[minmax(0,2fr)_100px_auto] md:items-end" onSubmit={event => void exportPart(event)}>
      <label className="text-xs font-semibold text-cs-muted">Phụ tùng đã duyệt<select required className={input} value={partId} onChange={event => setPartId(event.target.value)}>
        <option value="">— Chọn —</option>
        {approvedParts.map(item => <option key={item.id} value={item.part_id ?? ""}>{item.description} (duyệt {item.quantity})</option>)}
      </select></label>
      <label className="text-xs font-semibold text-cs-muted">SL<input className={input} type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
      <button type="submit" className={outline} disabled={working}>Xuất kho</button>
    </form>}

    {inRepair && <div className="mt-6 space-y-3 border-t border-cs-border pt-5">
      <label className="block text-xs font-semibold text-cs-muted">Ghi chú (tùy chọn)<input className={input} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: đã chạy thử 5 km, phanh ổn định"/></label>
      <div className="flex flex-wrap gap-3">
        {order.status === "IN_PROGRESS" && <button type="button" className={outline} disabled={working} onClick={() => void run(() => workflowApi.transition(order.id, "waiting-for-parts", note.trim() || undefined), "Phiếu chuyển sang chờ phụ tùng.")}>Chờ phụ tùng</button>}
        {order.status === "WAITING_FOR_PARTS" && <button type="button" className={action} disabled={working} onClick={() => void run(() => workflowApi.transition(order.id, "resume", note.trim() || undefined), "Tiếp tục sửa chữa.")}>Tiếp tục sửa chữa</button>}
        {order.status === "IN_PROGRESS" && <button type="button" className={action} disabled={working || unfinished > 0} onClick={() => void complete()}>Hoàn thành sửa chữa →</button>}
      </div>
      {order.status === "IN_PROGRESS" && unfinished > 0 && <p className="text-xs text-cs-muted">Còn {unfinished} công việc chưa xong nên chưa thể hoàn thành phiếu.</p>}
    </div>}
  </section>;
}

const invoiceStatusText: Record<string, string> = { UNPAID: "Chưa thanh toán", PARTIALLY_PAID: "Đã thu một phần", PAID: "Đã thanh toán đủ", CANCELLED: "Đã hủy" };

export function PaymentPanel({ order, onChanged }: PanelProps) {
  const { confirm } = useAppFeedback();
  const invoice = order.invoice;
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const paid = invoice?.payments?.filter(payment => payment.status === "SUCCESS").reduce((sum, payment) => sum + toNumber(payment.amount), 0) ?? 0;
  const remaining = Math.max(0, toNumber(invoice?.total_amount) - paid);
  const [amount, setAmount] = useState(() => String(remaining));
  const [cashGiven, setCashGiven] = useState("");
  const change = toNumber(cashGiven) - toNumber(amount);

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function collectCash(event: FormEvent) {
    event.preventDefault();
    const value = toNumber(amount);
    if (!invoice || value <= 0 || value > remaining) { setError(`Số tiền thu phải lớn hơn 0 và không quá ${formatVnd(remaining)}.`); return; }
    if (!await confirm({
      title: "Xác nhận đã nhận tiền mặt", reference: invoice.invoice_code,
      description: `Ghi nhận khách đã trả ${formatVnd(value)} tiền mặt tại quầy.${change > 0 ? ` Trả lại khách ${formatVnd(change)}.` : ""}`,
      confirmText: "Đã nhận tiền", checklist: ["Đã đếm đủ tiền mặt khách đưa."],
    })) return;
    await run(() => workflowApi.payCash(invoice.id, value), value >= remaining ? "Đã thu đủ tiền. Có thể bàn giao xe." : "Đã ghi nhận một phần tiền mặt.");
    setCashGiven("");
  }

  async function handOver() {
    if (!await confirm({ title: "Bàn giao xe cho khách", description: "Xác nhận khách đã nhận lại xe. Phiếu kết thúc và khách có thể gửi đánh giá.", confirmText: "Bàn giao xe" })) return;
    await run(() => workflowApi.transition(order.id, "hand-over"), "Đã bàn giao xe. Phiếu sửa chữa hoàn tất.");
  }

  if (!["COMPLETED", "HANDED_OVER"].includes(order.status)) return null;
  return <section className={`${card} mt-6`}>
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent print:hidden">Bước 5 · Thanh toán & bàn giao</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Hóa đơn {invoice && <span className="ml-2 text-sm font-semibold text-cs-muted">{invoice.invoice_code} · {invoiceStatusText[invoice.status] || invoice.status}</span>}</h2>
    <div className="mt-4 print:hidden">{error && <Notice tone="error">{error}</Notice>}</div>
    {!invoice && <div className="print:hidden"><p className="mb-4 text-sm text-cs-muted">Hóa đơn được tính từ các hạng mục khách đã duyệt trong báo giá.</p>
      <button type="button" className={action} disabled={working} onClick={() => void run(() => workflowApi.createInvoice(order.id), "Đã lập hóa đơn. Thu tiền mặt tại quầy.")}>Lập hóa đơn</button></div>}
    {invoice && <>
      <ul className="space-y-1 text-sm text-cs-text">{invoice.items?.map(item => <li key={item.id} className="flex justify-between gap-3"><span>{item.description} × {item.quantity}</span><span>{formatVnd(item.amount)}</span></li>)}</ul>
      <div className="mt-3 space-y-1 border-t border-cs-border pt-3 text-right text-sm text-cs-text">
        {toNumber(invoice.discount_amount) > 0 && <p>Giảm giá: −{formatVnd(invoice.discount_amount)}</p>}
        <p className="text-base font-black">Tổng cộng: {formatVnd(invoice.total_amount)}</p>
        <p>Đã thu: {formatVnd(paid)} · Còn lại: <strong>{formatVnd(remaining)}</strong></p>
      </div>
      {!!invoice.payments?.length && <ul className="mt-3 space-y-1 text-xs text-cs-muted">{invoice.payments.map(payment => <li key={payment.id}>Tiền mặt {formatVnd(payment.amount)} · {payment.paid_at ? new Date(payment.paid_at).toLocaleString("vi-VN") : payment.status}</li>)}</ul>}
      {remaining > 0 && <form className="mt-5 grid gap-3 border-t border-cs-border pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end print:hidden" onSubmit={event => void collectCash(event)}>
        <label className="text-xs font-semibold text-cs-muted">Số tiền thu (₫)<input className={input} type="number" min="1" step="any" max={remaining} required value={amount} onChange={event => setAmount(event.target.value)}/></label>
        <label className="text-xs font-semibold text-cs-muted">Khách đưa (₫, để tính tiền thối)<input className={input} type="number" min="0" step="any" value={cashGiven} onChange={event => setCashGiven(event.target.value)}/></label>
        <button type="submit" className={action} disabled={working}>Xác nhận đã nhận tiền mặt</button>
        {cashGiven && <p className="text-sm text-cs-text md:col-span-3">{change >= 0 ? `Tiền thối lại khách: ${formatVnd(change)}` : `Khách đưa thiếu ${formatVnd(-change)}`}</p>}
      </form>}
      {invoice.status === "PAID" && order.status === "COMPLETED" && <div className="mt-5 print:hidden"><button type="button" className={action} disabled={working} onClick={() => void handOver()}>Bàn giao xe cho khách →</button></div>}
      {order.status === "HANDED_OVER" && <div className="mt-5"><Notice tone="success">Đã bàn giao xe. Khách có thể gửi đánh giá dịch vụ.</Notice></div>}
    </>}
  </section>;
}
