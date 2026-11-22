import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import {
  billableQuotations, CONFIRMATION_METHOD_TEXT, formatVnd, latestQuotation, openPartRequests, toNumber, workflowApi,
  type CatalogPart, type CatalogService, type InspectionResult, type QuotationLineInput, type RecommendationInput,
  type WorkflowOrder, type WorkflowQuotation,
} from "../../services/workflowService";
import { card, input, Notice, Req } from "./WorkflowUI";
import { Button, IconButton } from "../../components/ui/Button";
import { errorText, formatDateTime } from "./workflowFormat";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { StatusBadge } from "../../components/ui/Badge";
import { getStatus } from "../../config/status";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { CounterApprovalPanel } from "./CounterApprovalPanel";
import { PartRequestsPanel, WaitForPartsModal } from "./PartRequestsPanel";
import { deliveryState } from "./repairOrderFlow";
import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { OvernightField, QuotationEditModal, RequiredField } from "./QuotationEditModal";
import { SendQuotationModal } from "./SendQuotationModal";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";

/** Panels for the steps after diagnosis; every action calls Laravel and then reloads the order. */
type PanelProps = { order: WorkflowOrder; onChanged: (message: string) => Promise<void> };

// Nhãn + màu trạng thái (báo giá, hạng mục, hóa đơn, thanh toán, kết quả kiểm tra): config/status.ts.

/** Nhãn "Bắt buộc" cạnh tên hạng mục (rê chuột xem lý do) — dùng ở mọi bảng báo giá phía cố vấn. */
export function RequiredMark({ item }: { item: { is_required?: boolean; required_reason?: string | null } }) {
  if (!item.is_required) return null;
  return <span title={item.required_reason ? `Lý do bắt buộc: ${item.required_reason}` : undefined}
    className="ml-2 inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 align-middle text-caption font-semibold text-warning-fg">Bắt buộc</span>;
}

/** Bảng báo giá — chỉ hiển thị. Quyết định đồng ý/từ chối do khách tự thực hiện trong tài khoản. */
function QuotationTable({ quotation }: { quotation: WorkflowQuotation }) {
  // Khách đã trả lời → hiện thêm tiền các hạng mục khách đồng ý (sau giảm giá) — đây là số sẽ vào hoá đơn.
  const items = quotation.items ?? [];
  const responded = items.some(item => item.is_approved != null);
  const approved = items.filter(item => item.is_approved).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const approvedNet = approved > 0 ? Math.max(0, approved - toNumber(quotation.discount_amount)) : 0;
  return <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
    <thead><tr className="border-b border-cs-border text-left text-xs text-cs-muted">
      <th className="py-2 pr-3">Hạng mục</th><th className="py-2 pr-3">Loại</th><th className="py-2 pr-3 text-right">Số lượng</th>
      <th className="py-2 pr-3 text-right">Đơn giá</th><th className="py-2 pr-3 text-right">Thành tiền</th><th className="py-2">Khách</th>
    </tr></thead>
    <tbody>{quotation.items?.map(item => <tr key={item.id} className="border-b border-cs-border/60 text-cs-text">
      <td className="py-2 pr-3 font-semibold">{item.description}<RequiredMark item={item}/></td>
      <td className="py-2 pr-3 text-xs text-cs-muted">{item.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}</td>
      <td className="py-2 pr-3 text-right">{item.quantity}</td>
      <td className="py-2 pr-3 text-right">{formatVnd(item.unit_price)}</td>
      <td className="py-2 pr-3 text-right font-semibold">{formatVnd(item.amount)}</td>
      <td className="py-2 text-xs">{item.is_approved == null ? "Chưa trả lời" : item.is_approved ? "✓ Đồng ý" : "✗ Từ chối"}</td>
    </tr>)}</tbody>
  </table>
    <div className="mt-3 space-y-1 text-right text-sm text-cs-text">
      <p>Tạm tính: {formatVnd(quotation.subtotal)}</p>
      {toNumber(quotation.discount_amount) > 0 && <p>Giảm giá: −{formatVnd(quotation.discount_amount)}</p>}
      {responded
        ? <>
          <p className="text-cs-text-2">Tổng báo giá: {formatVnd(quotation.total_amount)}</p>
          <p className="text-base font-black">Khách đồng ý: <span className="text-success-fg">{formatVnd(approvedNet)}</span></p>
        </>
        : <p className="text-base font-black">Tổng: {formatVnd(quotation.total_amount)}</p>}
    </div>
  </div>;
}

type DraftLine = { key: number; item_type: "SERVICE" | "PART"; ref_id: string; quantity: string; unit_price: string; description: string; required?: boolean; required_reason?: string };

/** Lịch sử khách duyệt / từ chối (P3): mỗi lần xác nhận là một mục, kèm phương thức (tài khoản / mã email tại quầy). */
function ApprovalHistory({ quotation }: { quotation: WorkflowQuotation }) {
  const rows = (quotation.items ?? []).flatMap(item => (item.responses ?? []).map(response => ({ ...response, label: item.description ?? `#${item.id}` })));
  if (!rows.length) return null;
  const groups = new Map<number, typeof rows>();
  rows.forEach(row => { const key = row.confirmation?.id ?? row.id; groups.set(key, [...(groups.get(key) ?? []), row]); });
  return <details className="mt-3 rounded-xl border border-cs-border p-3 text-xs text-cs-text" data-testid="approval-history">
    <summary className="cursor-pointer font-semibold">Lịch sử khách duyệt ({groups.size} lần xác nhận)</summary>
    <ul className="mt-2 space-y-2">{[...groups.values()].map(group => <li key={group[0].confirmation?.id ?? group[0].id}>
      <p className="text-cs-muted">{group[0].confirmation ? new Date(group[0].confirmation.confirmed_at).toLocaleString("vi-VN") : ""} · {CONFIRMATION_METHOD_TEXT[group[0].confirmation?.method ?? "ACCOUNT"]}</p>
      <p>{group.map(row => `${row.decision === "APPROVED" ? "✓" : "✗"} ${row.label}`).join(" · ")}</p>
    </li>)}</ul>
  </details>;
}

export function QuotationPanel({ order, onChanged, onRequestClose }: PanelProps & { onRequestClose?: () => void }) {
  const { confirm } = useAppFeedback();
  const quotation = latestQuotation(order);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [discount, setDiscount] = useState("0");
  const [overnight, setOvernight] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);

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

  // Chỉ lập báo giá sau khi chẩn đoán đã hoàn tất (backend cho phép sớm hơn, giao diện giữ đúng thứ tự bước).
  const canBuild = ["QUOTING", "WAITING_APPROVAL"].includes(order.status)
    && (!quotation || ["REJECTED", "CANCELLED"].includes(quotation.status));
  // Không trùng hạng mục (máy chủ cũng chặn): mỗi dòng chỉ thấy dịch vụ / phụ tùng chưa chọn ở dòng khác.
  const takenElsewhere = (type: DraftLine["item_type"], id: number, key: number) =>
    lines.some(line => line.key !== key && line.item_type === type && Number(line.ref_id) === id);
  const freeParts = (key: number) => parts.filter(part => recommendedPartIds.has(part.id) && !takenElsewhere("PART", part.id, key));
  const draftTotal = lines.reduce((sum, line) => sum + toNumber(line.unit_price) * toNumber(line.quantity), 0) - toNumber(discount);
  const fieldErrors = useFieldErrors();

  function updateLine(key: number, changes: Partial<DraftLine>) {
    if ("item_type" in changes || "ref_id" in changes) fieldErrors.clear(`${key}.ref`, `${key}.price`);
    if ("unit_price" in changes) fieldErrors.clear(`${key}.price`);
    if ("required" in changes) fieldErrors.clear(`${key}.reason`);
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
    catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  async function createQuotation(event: FormEvent) {
    event.preventDefault();
    const items: QuotationLineInput[] = [];
    const problems: FieldErrors = {};
    for (const line of lines) {
      const refId = Number(line.ref_id); const quantity = Number(line.quantity);
      if (!Number.isSafeInteger(refId) || refId < 1) problems[`${line.key}.ref`] = "Chọn hạng mục.";
      if (line.unit_price === "") problems[`${line.key}.price`] = "Nhập đơn giá.";
      if (line.required && !(line.required_reason ?? "").trim()) problems[`${line.key}.reason`] = "Ghi lý do bắt buộc để khách hiểu.";
      items.push({
        item_type: line.item_type,
        ...(line.item_type === "PART" ? { part_id: refId } : { service_id: refId }),
        quantity, unit_price: toNumber(line.unit_price),
        ...(line.description.trim() ? { description: line.description.trim() } : {}),
        ...(line.required ? { is_required: true, required_reason: (line.required_reason ?? "").trim() } : {}),
      });
    }
    setError("");
    if (fieldErrors.show(problems)) return;
    if (!items.length) { fieldErrors.general("Báo giá cần ít nhất một dòng."); return; }
    await run(() => workflowApi.createQuotation(order.id, { discount_amount: toNumber(discount), items, stays_overnight: overnight }), "Đã lập báo giá nháp. Kiểm tra lại rồi gửi khách.");
  }

  async function sendQuotation() {
    if (quotation) setSending(true);
  }

  async function startRepair() {
    if (!await confirm({ title: "Bắt đầu sửa chữa", description: "Tạo danh sách công việc từ các dịch vụ khách đã duyệt và chuyển phiếu sang đang sửa chữa.", confirmText: "Bắt đầu sửa" })) return;
    await run(() => workflowApi.transition(order.id, "start-repair"), "Đã bắt đầu sửa chữa. Cập nhật từng công việc ở Bước 4.");
  }

  if (!quotation && !canBuild) return null;
  return <section className={`${card} print:hidden`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-cs-text">Báo giá cho khách {quotation && <span className="ml-2 inline-flex items-center gap-2 text-sm font-semibold text-cs-muted">{quotation.quotation_code} <StatusBadge domain="quotation" status={quotation.status}/></span>}</h2>
      {/* Sang trang "Báo giá & phê duyệt", chọn sẵn báo giá này. */}
      {quotation && <Link to={`/advisor/quotations?quotation=${quotation.id}`} className="inline-flex items-center gap-1.5 text-small font-semibold text-cs-accent-text hover:underline">Xem ở Báo giá & phê duyệt<Icon name="arrow-right" size={15}/></Link>}
    </div>
    <div className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>

    {quotation?.stays_overnight && <p className="mb-3 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-small font-semibold text-warning-fg"><Icon name="moon" size={15}/>Báo khách: xe lưu xưởng qua đêm, không tính phí.</p>}
    {quotation && <QuotationTable quotation={quotation}/>}
    {quotation && <ApprovalHistory quotation={quotation}/>}

    {quotation?.status === "DRAFT" && <div className="mt-5 flex flex-wrap items-stretch gap-3">
      {/* Hai nút cùng chiều cao (h-11). */}
      <Button variant="outline" icon="edit" className="h-11" disabled={working} onClick={() => setEditing(true)}>Sửa báo giá</Button>
      <Button variant="primary" icon="send" className="h-11" loading={working} onClick={() => void sendQuotation()}>Gửi báo giá cho khách</Button>
    </div>}
    {sending && quotation && <SendQuotationModal order={order} quotation={quotation} onClose={() => setSending(false)} onSent={onChanged}/>}
    {editing && quotation && <QuotationEditModal order={order} quotation={quotation} onClose={() => setEditing(false)} onSaved={onChanged}/>}
    {quotation?.status === "SENT" && <div className="mt-5">
      <Notice>Đang chờ khách duyệt. Chỉ khách được đồng ý hoặc từ chối từng hạng mục: trong tài khoản của mình (mục "Báo giá" — màn hình này tự cập nhật khi khách trả lời), hoặc tại quầy bằng mã gửi tới email chủ xe bên dưới.</Notice>
      <CounterApprovalPanel quotation={quotation} owner={order.customer} onDone={onChanged}/>
    </div>}
    {quotation && ["APPROVED", "PARTIALLY_APPROVED"].includes(quotation.status) && order.status === "WAITING_APPROVAL" &&
      <div className="mt-5"><Button variant="primary" iconRight="arrow-right" loading={working} onClick={() => void startRepair()}>Bắt đầu sửa chữa</Button></div>}
    {quotation?.status === "REJECTED" && order.status === "WAITING_APPROVAL" && <div className="mt-5">
      <Notice tone="error">Khách từ chối toàn bộ báo giá. Lập báo giá mới bên dưới, hoặc đóng phiếu nếu khách không sửa nữa.</Notice>
      {onRequestClose && <Button variant="danger-outline" icon="ban" disabled={working} onClick={onRequestClose}>Đóng phiếu (khách từ chối)</Button>}
    </div>}

    {canBuild && <form noValidate className="mt-6 space-y-4 border-t border-cs-border pt-5" onSubmit={event => void createQuotation(event)}>
      <h3 className="font-bold text-cs-text">{quotation ? "Lập báo giá mới" : "Lập báo giá từ kết quả chẩn đoán"}</h3>
      {!recommendations.length && <Notice>Chưa có đề xuất từ bước kiểm tra. Có thể thêm dịch vụ thủ công; phụ tùng chỉ được báo giá khi đã có trong đề xuất ở bước kiểm tra.</Notice>}
      {lines.map(line => <div key={line.key} className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 md:grid-cols-[110px_minmax(0,1fr)_120px_140px_auto] md:items-end">
        <label className="text-xs font-semibold text-cs-muted">Loại<select className={input} value={line.item_type} onChange={event => updateLine(line.key, { item_type: event.target.value as "SERVICE" | "PART" })}>
          <option value="SERVICE">Dịch vụ</option>
          <option value="PART" disabled={line.item_type !== "PART" && !freeParts(line.key).length}>Phụ tùng{line.item_type !== "PART" && !freeParts(line.key).length ? " (đã chọn hết đề xuất)" : ""}</option>
        </select></label>
        <label className="text-xs font-semibold text-cs-muted">Hạng mục<Req/><select required className={input} aria-invalid={!!fieldErrors.errors[`${line.key}.ref`] || undefined} value={line.ref_id} onChange={event => updateLine(line.key, { ref_id: event.target.value })}>
          <option value="">{services.length || parts.length ? "— Chọn —" : "Đang tải danh mục…"}</option>
          {line.item_type === "SERVICE"
            ? services.filter(service => !takenElsewhere("SERVICE", service.id, line.key)).map(service => <option key={service.id} value={service.id}>{service.name}</option>)
            : freeParts(line.key).map(part => <option key={part.id} value={part.id}>{part.name} · tồn {part.inventory?.quantity ?? 0}</option>)}
        </select><FieldError className="mt-1">{fieldErrors.errors[`${line.key}.ref`]}</FieldError></label>
        <div className="flex flex-col items-start text-xs font-semibold text-cs-muted">Số lượng<QuantityStepper label="Số lượng" size="md" max={9999} className="mt-2 w-28" value={Number(line.quantity) || 1} onChange={v => updateLine(line.key, { quantity: String(v ?? 1) })}/></div>
        <label className="text-xs font-semibold text-cs-muted">Đơn giá (₫)<Req/><input className={input} type="number" min="0" step="any" required aria-invalid={!!fieldErrors.errors[`${line.key}.price`] || undefined} value={line.unit_price} onChange={event => updateLine(line.key, { unit_price: event.target.value })}/><FieldError className="mt-1">{fieldErrors.errors[`${line.key}.price`]}</FieldError></label>
        <IconButton icon="trash" tone="danger" label="Xóa dòng báo giá" onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))}/>
        <label className="text-xs font-semibold text-cs-muted md:col-span-5">Mô tả cho khách (tùy chọn)<input className={input} value={line.description} onChange={event => updateLine(line.key, { description: event.target.value })} placeholder="Mặc định: tên hạng mục"/></label>
        <div className="md:col-span-5"><RequiredField required={!!line.required} reason={line.required_reason ?? ""} error={fieldErrors.errors[`${line.key}.reason`]} onChange={(required, required_reason) => updateLine(line.key, { required, required_reason })}/></div>
      </div>)}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="tonal" icon="plus" className="self-end" onClick={() => setLines(previous => [...previous, { key: Date.now(), item_type: "SERVICE", ref_id: "", quantity: "1", unit_price: "0", description: "" }])}>Thêm dòng</Button>
          <label className="text-xs font-semibold text-cs-muted">Giảm giá (₫)<input className={input} type="number" min="0" step="any" value={discount} onChange={event => setDiscount(event.target.value)}/></label>
        </div>
        <div className="text-right"><p className="text-sm text-cs-muted">Tổng dự kiến</p><p className="text-xl font-black text-cs-text">{formatVnd(draftTotal)}</p></div>
      </div>
      <OvernightField checked={overnight} onChange={setOvernight}/>
      <Button type="submit" variant="secondary" loading={working} loadingText="Đang lưu..." disabled={!lines.length}>Lưu báo giá nháp</Button>
    </form>}
  </section>;
}


export function RepairPanel({ order, onChanged }: PanelProps) {
  const { confirm } = useAppFeedback();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [waitDialog, setWaitDialog] = useState(false);
  const pendingParts = openPartRequests(order);
  // Báo giá gốc + phát sinh đã duyệt (khớp backend billableQuotationIds).
  const approvedParts = billableQuotations(order).flatMap(q => q.items ?? []).filter(item => item.item_type === "PART" && item.is_approved);
  // Mỗi phụ tùng: tổng khách duyệt (gốc + phát sinh) và đã xuất — không xuất vượt phần còn lại (máy chủ cũng chặn).
  const partStock = [...approvedParts.reduce((map, item) => {
    const key = Number(item.part_id);
    const row = map.get(key) ?? { part_id: key, name: item.description || `Phụ tùng #${key}`, approved: 0, used: 0 };
    row.approved += Number(item.quantity) || 0;
    return map.set(key, row);
  }, new Map<number, { part_id: number; name: string; approved: number; used: number }>()).values()]
    .map(row => ({ ...row, used: (order.used_parts ?? []).filter(u => Number(u.part_id) === row.part_id).reduce((sum, u) => sum + (Number(u.quantity) || 0), 0) }));
  const selectedStock = partStock.find(row => String(row.part_id) === partId);
  const remainingOf = (row: { approved: number; used: number }) => Math.max(0, row.approved - row.used);
  const canExport = partStock.some(row => remainingOf(row) > 0);
  const workItems = order.work_items ?? [];
  const unfinished = workItems.filter(item => ["PENDING", "IN_PROGRESS"].includes(item.status)).length;
  const inRepair = ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status);
  const fieldErrors = useFieldErrors();

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  async function exportPart(event: FormEvent) {
    event.preventDefault();
    const part = Number(partId); const amount = Number(quantity);
    setError("");
    if (fieldErrors.show(!Number.isSafeInteger(part) || part < 1 ? { part: "Chọn phụ tùng cần xuất." } : {})) return;
    if (!Number.isSafeInteger(amount) || amount < 1) { fieldErrors.general("Số lượng phải là số nguyên dương."); return; }
    await run(() => workflowApi.recordUsedPart(order.id, { part_id: part, quantity: amount }), "Đã ghi phụ tùng thực dùng và trừ tồn kho.");
    setPartId(""); setQuantity("1");
  }

  async function complete() {
    if (!await confirm({ title: "Hoàn thành sửa chữa", description: "Xác nhận xe đã sửa xong và chạy thử đạt. Sau bước này cố vấn lập hóa đơn để thu tiền.", confirmText: "Hoàn thành" })) return;
    await run(() => workflowApi.transition(order.id, "complete", note.trim() || undefined), "Phiếu đã hoàn thành. Tiếp theo: lập hóa đơn.");
  }

  if (!inRepair && !workItems.length) return null;
  return <section className={`${card} print:hidden`}>
    <h2 className="text-lg font-bold text-cs-text">Tiến độ sửa chữa</h2>
    <div className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>
    {order.status === "WAITING_FOR_PARTS" && (pendingParts.length
      ? <Notice>Đang chờ {pendingParts.length} phụ tùng — kho đặt hàng và nhập kho khi hàng về. Khi đủ phụ tùng, bấm Tiếp tục sửa chữa.</Notice>
      : order.part_requests?.some(r => r.status === "RECEIVED")
        ? <Notice tone="success">Phụ tùng đã về đủ. Có thể tiếp tục sửa chữa.</Notice>
        : <Notice>Phiếu đang chờ phụ tùng nhưng chưa ghi thiếu phụ tùng nào. Bấm "Báo thiếu phụ tùng" bên dưới để kho đặt hàng.</Notice>)}
    {order.estimated_ready_at && inRepair && <p className="mb-3 text-sm text-cs-text" data-testid="estimated-ready">Dự kiến xong: <strong>{formatDateTime(order.estimated_ready_at)}</strong> <span className="text-xs text-cs-muted">(theo phút chuẩn của các bước)</span></p>}

    <h3 className="mb-2 text-sm font-bold text-cs-text">Công việc ({workItems.length - unfinished}/{workItems.length} xong)</h3>
    {workItems.length ? <ul className="space-y-1">{workItems.map(item => <li key={item.id} data-testid="work-item" className="flex min-h-9 items-center justify-between gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-2"><p className="min-w-0 truncate font-semibold text-cs-text" title={item.service?.name || item.description || undefined}>{item.service?.name || item.description || `Công việc #${item.id}`}</p><StatusBadge domain="workItem" status={item.status} className="shrink-0"/></div>
      {inRepair && <div className="flex shrink-0 gap-2">
        {item.status === "PENDING" && <Button size="sm" variant="secondary" disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(item.id, "IN_PROGRESS"), "Đã bắt đầu công việc.")}>Bắt đầu</Button>}
        {item.status === "IN_PROGRESS" && <Button size="sm" variant="success" icon="check" disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(item.id, "COMPLETED"), "Đã hoàn thành công việc.")}>Xong</Button>}
      </div>}
    </li>)}</ul> : <p className="text-sm text-cs-muted">Báo giá không có dịch vụ nào được duyệt nên không có công việc.</p>}

    <PartRequestsPanel order={order} onChanged={onChanged}/>
    <h3 className="mb-2 mt-6 text-sm font-bold text-cs-text">Phụ tùng thực dùng (đã xuất kho)</h3>
    {order.used_parts?.length ? <ul className="space-y-1 text-sm text-cs-text">{order.used_parts.map(part => <li key={part.id}>• {part.part?.name || `Phụ tùng #${part.part_id}`} × {part.quantity} · {formatVnd(part.unit_price)}</li>)}</ul>
      : <p className="text-sm text-cs-muted">Chưa xuất phụ tùng nào.</p>}
    {order.status === "IN_PROGRESS" && partStock.length > 0 && (canExport
      ? <form noValidate className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-start" onSubmit={event => void exportPart(event)}>
        <label className="text-xs font-semibold text-cs-muted">Phụ tùng đã duyệt<Req/><select required className={input} aria-invalid={!!fieldErrors.errors.part || undefined} value={partId} onChange={event => { setPartId(event.target.value); setQuantity("1"); fieldErrors.clear("part"); }}>
          <option value="">— Chọn —</option>
          {partStock.map(row => <option key={row.part_id} value={row.part_id} disabled={!remainingOf(row)}>
            {row.name} — đã xuất {row.used}/{row.approved}{remainingOf(row) ? "" : " (đủ)"}</option>)}
        </select><FieldError className="mt-1">{fieldErrors.errors.part}</FieldError></label>
        <div className="flex flex-col items-start text-xs font-semibold text-cs-muted">Số lượng
          <QuantityStepper label="Số lượng xuất kho" size="md" min={1} max={selectedStock ? Math.max(1, remainingOf(selectedStock)) : 1} className="mt-2 w-28" value={Number(quantity) || 1} onChange={v => setQuantity(String(v ?? 1))}/></div>
        <Button type="submit" variant="success" icon="box" className="md:mt-5" disabled={working}>Xuất kho</Button>
        {selectedStock && <p className="text-caption text-cs-muted md:col-span-3">Còn xuất được <b className="text-cs-text">{remainingOf(selectedStock)}</b> theo số khách duyệt. Cần thêm thì lập báo giá phát sinh.</p>}
      </form>
      : <p className="mt-3 text-caption text-cs-muted">Đã xuất đủ phụ tùng khách duyệt. Cần thêm thì lập báo giá phát sinh.</p>)}

    {inRepair && <div className="mt-6 space-y-3 border-t border-cs-border pt-5">
      <label className="block text-xs font-semibold text-cs-muted">Ghi chú (tùy chọn)<input className={input} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: đã chạy thử 5 km, phanh ổn định"/></label>
      <div className="flex flex-wrap gap-3">
        {order.status === "IN_PROGRESS" && <Button variant="secondary" icon="clock" disabled={working} onClick={() => setWaitDialog(true)}>Chờ phụ tùng</Button>}
        {order.status === "WAITING_FOR_PARTS" && <Button variant="primary" iconRight="arrow-right" loading={working} onClick={() => void run(() => workflowApi.transition(order.id, "resume", note.trim() || undefined), "Tiếp tục sửa chữa.")}>Tiếp tục sửa chữa</Button>}
        {order.status === "IN_PROGRESS" && <Button variant="primary" iconRight="arrow-right" disabled={working || unfinished > 0} onClick={() => void complete()}>Hoàn thành sửa chữa</Button>}
      </div>
      {order.status === "IN_PROGRESS" && unfinished > 0 && <p className="text-xs text-cs-muted">Còn {unfinished} công việc chưa xong nên chưa thể hoàn thành phiếu.</p>}
      {order.status === "WAITING_FOR_PARTS" && pendingParts.length > 0 && <p className="text-xs text-cs-muted">Phụ tùng chưa về hết: muốn tiếp tục sửa (làm hạng mục khác trước) thì ghi lý do ở ô Ghi chú (ít nhất 5 ký tự).</p>}
    </div>}
    {waitDialog && <WaitForPartsModal order={order} open onClose={() => setWaitDialog(false)} onDone={onChanged}/>}
  </section>;
}


const paymentMethodText: Record<string, string> = { DIRECT: "Tiền mặt", TRANSFER: "Chuyển khoản", CARD: "Thẻ ngân hàng", EWALLET: "Ví điện tử", QR: "QR", VNPAY: "VNPay" };

/**
 * Hoá đơn trong chi tiết phiếu: chỉ xem (và in). Lập hoá đơn, thu tiền làm ở trang Thanh toán; bàn giao ở Kiểm tra & bàn giao
 * (PO 18/11: nút cùng tác dụng gộp về một nút vàng đồng, thao tác ở đúng trang của bước).
 */
export function PaymentPanel({ order }: { order: WorkflowOrder }) {
  const invoice = order.invoice;
  const paid = invoice?.payments?.filter(payment => payment.status === "SUCCESS").reduce((sum, payment) => sum + toNumber(payment.amount), 0) ?? 0;
  const remaining = Math.max(0, toNumber(invoice?.total_amount) - paid);
  const state = deliveryState(order);
  const next = order.status !== "COMPLETED" ? null
    : state === "payment" ? { to: `/advisor/payments?order=${order.id}`, label: invoice ? "Thu tiền" : "Lập hoá đơn", icon: "cash" as const }
    : state === "ready" || state === "check" ? { to: `/advisor/delivery?order=${order.id}`, label: state === "ready" ? "Bàn giao xe" : "Kiểm tra & bàn giao", icon: "car" as const }
    : null;

  if (!["COMPLETED", "HANDED_OVER"].includes(order.status)) return null;
  return <section className={card}>
    <h2 className="text-lg font-bold text-cs-text">Hóa đơn {invoice && <span className="ml-2 inline-flex items-center gap-2 text-sm font-semibold text-cs-muted">{invoice.invoice_code} <StatusBadge domain="invoice" status={invoice.status}/></span>}</h2>
    {!invoice && <p className="mt-3 text-sm text-cs-muted">Chưa lập hoá đơn. Hoá đơn được tính từ các hạng mục khách đã duyệt trong báo giá.</p>}
    {invoice && <div className="mt-4">
      <ul className="space-y-1 text-sm text-cs-text">{invoice.items?.map(item => <li key={item.id} className="flex justify-between gap-3"><span>{item.description} × {item.quantity}</span><span>{formatVnd(item.amount)}</span></li>)}</ul>
      <div className="mt-3 space-y-1 border-t border-cs-border pt-3 text-right text-sm text-cs-text">
        {toNumber(invoice.discount_amount) > 0 && <p>Giảm giá: −{formatVnd(invoice.discount_amount)}</p>}
        <p className="text-base font-black">Tổng cộng: {formatVnd(invoice.total_amount)}</p>
        <p>Đã thu: {formatVnd(paid)} · Còn lại: <strong>{formatVnd(remaining)}</strong></p>
      </div>
      {!!invoice.payments?.length && <ul className="mt-3 space-y-1 text-xs text-cs-muted">{invoice.payments.map(payment => <li key={payment.id}>{paymentMethodText[payment.payment_method] || payment.payment_method} {formatVnd(payment.amount)} · {payment.paid_at ? new Date(payment.paid_at).toLocaleString("vi-VN") : getStatus("payment", payment.status).label}</li>)}</ul>}
      {order.status === "HANDED_OVER" && <div className="mt-5"><Notice tone="success">Đã bàn giao xe. Khách có thể gửi đánh giá dịch vụ.</Notice></div>}
    </div>}
    {next && <div className="mt-5 flex justify-end print:hidden"><Link className="adv-btn-gold" to={next.to}><Icon name={next.icon} size={18}/>{next.label}<Icon name="arrow-right" size={18}/></Link></div>}
  </section>;
}
type CheckRow = { key: number; item_name: string; status: InspectionResult; condition_description: string };
type RecRow = { key: number; item_type: "SERVICE" | "PART"; ref_id: string; quantity: string; note: string };
const blankCheck = (key: number): CheckRow => ({ key, item_name: "", status: "PASSED", condition_description: "" });
const blankRec = (key: number, type: "SERVICE" | "PART" = "SERVICE"): RecRow => ({ key, item_type: type, ref_id: "", quantity: "1", note: "" });

/** Điền sẵn đề xuất từ những gì khách chọn khi đặt lịch: nội dung gói trước, dịch vụ lẻ sau. */
function recsFromCustomerRequest(order: WorkflowOrder): RecRow[] {
  const request = order.appointment;
  if (!request) return [];
  const rows: RecRow[] = [];
  const seen = new Set<string>();
  const push = (itemType: "SERVICE" | "PART", id: number, quantity: number | undefined, note: string) => {
    const dedupeKey = `${itemType}:${id}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push({ key: rows.length + 1, item_type: itemType, ref_id: String(id), quantity: String(quantity ?? 1), note });
  };
  request.packages?.forEach(pkg => {
    pkg.services?.forEach(service => push("SERVICE", service.id, service.pivot?.quantity, `Theo ${pkg.name}`));
    pkg.parts?.forEach(part => push("PART", part.id, part.pivot?.quantity, `Theo ${pkg.name}`));
  });
  request.services?.forEach(service => push("SERVICE", service.id, 1, "Khách yêu cầu"));
  return rows;
}

/** Bước 2: cố vấn ghi kết quả kiểm tra, đề xuất dịch vụ/phụ tùng và hoàn tất chẩn đoán. */
export function InspectionPanel({ order, onChanged }: PanelProps) {
  const { confirm } = useAppFeedback();
  const inspection = order.inspections?.[0] ?? null;
  const [services, setServices] = useState<CatalogService[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  // Kết quả kiểm tra do người kiểm tra tự ghi; ghi chú lúc tiếp nhận chỉ hiện để tham khảo, không chép vào đây.
  const [condition, setCondition] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [checks, setChecks] = useState<CheckRow[]>([blankCheck(1)]);
  // Chỉ điền sẵn khi chưa ghi kết quả kiểm tra; KTV vẫn quyết định giữ hay bỏ từng dòng.
  const [prefilledRecs] = useState<RecRow[]>(() => (order.inspections?.length ? [] : recsFromCustomerRequest(order)));
  const [recs, setRecs] = useState<RecRow[]>(prefilledRecs);

  useEffect(() => {
    let active = true;
    Promise.all([workflowApi.services(), workflowApi.parts()])
      .then(([serviceList, partList]) => { if (active) { setServices(serviceList); setParts(partList); } })
      .catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, []);

  const canRecord = !inspection && ["RECEIVED", "INSPECTING"].includes(order.status);
  const canFinish = !!inspection && !inspection.inspected_at && order.status === "INSPECTING";
  // Chẩn đoán đã hoàn tất nhưng chưa bắt đầu sửa → bổ sung đề xuất (bắt buộc lý do, ghi vết). Đã sửa → báo giá phát sinh.
  const canSupplement = !!inspection?.inspected_at && ["QUOTING", "WAITING_APPROVAL"].includes(order.status);
  const [supplementing, setSupplementing] = useState(false);
  const sentQuotation = latestQuotation(order)?.status === "SENT";
  const fieldErrors = useFieldErrors();

  /** Lỗi từng dòng đề xuất: chưa chọn hạng mục; bổ sung sau chẩn đoán thì bắt buộc lý do. */
  const recProblems = (rows: RecRow[], needReason: boolean): FieldErrors => Object.fromEntries(rows.flatMap(row => [
    ...(Number(row.ref_id) > 0 ? [] : [[`rec.${row.key}.ref`, row.item_type === "PART" ? "Chọn phụ tùng." : "Chọn dịch vụ."]]),
    ...(needReason && row.note.trim().length < 5 ? [[`rec.${row.key}.note`, "Ghi lý do bổ sung (ít nhất 5 ký tự)."]] : []),
  ]));

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  function toRecommendations(rows: RecRow[]): RecommendationInput[] | null {
    const result: RecommendationInput[] = [];
    for (const row of rows) {
      const refId = Number(row.ref_id); const quantity = Number(row.quantity);
      if (!Number.isSafeInteger(refId) || refId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) return null;
      result.push({
        item_type: row.item_type, ...(row.item_type === "PART" ? { part_id: refId } : { service_id: refId }),
        quantity, ...(row.note.trim() ? { note: row.note.trim() } : {}),
      });
    }
    return result;
  }

  async function record(event: FormEvent) {
    event.preventDefault();
    const items = checks.filter(row => row.item_name.trim()).map(row => ({
      item_name: row.item_name.trim(), status: row.status,
      ...(row.condition_description.trim() ? { condition_description: row.condition_description.trim() } : {}),
    }));
    setError("");
    const problems = recProblems(recs, false);
    if (!items.length) problems[`check.${checks[0].key}`] = "Ghi ít nhất một hạng mục đã kiểm tra.";
    if (fieldErrors.show(problems)) return;
    const recommendations = toRecommendations(recs);
    if (!recommendations) { fieldErrors.general("Số lượng đề xuất phải là số nguyên dương."); return; }
    await run(() => workflowApi.recordInspection(order.id, {
      ...(condition.trim() ? { condition_description: condition.trim() } : {}),
      ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
      inspection_items: items, recommendations,
    }), "Đã lưu kết quả kiểm tra. Rà soát đề xuất rồi hoàn tất chẩn đoán.");
  }

  async function addMore(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (fieldErrors.show(recProblems(recs, supplementing))) return;
    const recommendations = toRecommendations(recs);
    if (!recommendations?.length) { fieldErrors.general("Thêm ít nhất một đề xuất."); return; }
    await run(async () => { for (const rec of recommendations) await workflowApi.addRecommendation(order.id, rec); },
      supplementing ? "Đã bổ sung đề xuất. Có thể chọn trong báo giá." : "Đã thêm đề xuất.");
    setRecs([]); setSupplementing(false);
  }

  async function finish() {
    if (!await confirm({
      title: "Hoàn tất chẩn đoán", description: "Khóa kết quả kiểm tra và chuyển phiếu sang bước lập báo giá. Đề xuất sẽ được điền sẵn vào báo giá.",
      confirmText: "Hoàn tất chẩn đoán", checklist: ["Đã ghi đủ hạng mục kiểm tra và đề xuất cần làm."],
    })) return;
    await run(() => workflowApi.completeInspection(order.id), "Đã hoàn tất chẩn đoán. Tiếp theo: lập báo giá.");
  }

  // Không trùng đề xuất (máy chủ cũng chặn): bỏ khỏi danh sách mục đã chọn ở dòng khác hoặc đã có trong đề xuất đã lưu.
  const savedRecKeys = new Set((inspection?.recommendations ?? []).map(rec => `${rec.item_type}:${rec.item_type === "PART" ? rec.part_id : rec.service_id}`));
  const recTaken = (type: RecRow["item_type"], id: number, key: number) =>
    savedRecKeys.has(`${type}:${id}`) || recs.some(row => row.key !== key && row.item_type === type && Number(row.ref_id) === id);

  const recEditor = <div className="space-y-3">
    {recs.map(row => <div key={row.key} className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 md:grid-cols-[110px_minmax(0,2fr)_120px_minmax(0,1.5fr)_auto] md:items-end">
      <label className="text-xs font-semibold text-cs-muted">Loại<select className={input} value={row.item_type} onChange={event => { fieldErrors.clear(`rec.${row.key}.ref`); setRecs(previous => previous.map(item => item.key === row.key ? { ...item, item_type: event.target.value as "SERVICE" | "PART", ref_id: "" } : item)); }}><option value="SERVICE">Dịch vụ</option><option value="PART">Phụ tùng</option></select></label>
      <label className="text-xs font-semibold text-cs-muted">{row.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}<Req/><select required className={input} aria-invalid={!!fieldErrors.errors[`rec.${row.key}.ref`] || undefined} value={row.ref_id} onChange={event => { fieldErrors.clear(`rec.${row.key}.ref`); setRecs(previous => previous.map(item => item.key === row.key ? { ...item, ref_id: event.target.value } : item)); }}>
        <option value="">— Chọn —</option>
        {row.item_type === "SERVICE"
          ? services.filter(service => !recTaken("SERVICE", service.id, row.key)).map(service => <option key={service.id} value={service.id}>{service.name}</option>)
          : parts.filter(part => !recTaken("PART", part.id, row.key)).map(part => <option key={part.id} value={part.id}>{part.name} · tồn {part.inventory?.quantity ?? 0} {part.unit || ""}</option>)}
      </select><FieldError className="mt-1">{fieldErrors.errors[`rec.${row.key}.ref`]}</FieldError></label>
      <div className="flex flex-col items-start text-xs font-semibold text-cs-muted">Số lượng<QuantityStepper label="Số lượng đề xuất" size="md" max={9999} className="mt-2 w-28" value={Number(row.quantity) || 1} onChange={v => setRecs(previous => previous.map(item => item.key === row.key ? { ...item, quantity: String(v ?? 1) } : item))}/></div>
      <label className="text-xs font-semibold text-cs-muted">{supplementing ? <>Lý do bổ sung<Req/></> : "Lý do (tùy chọn)"}<input className={input} required={supplementing} minLength={supplementing ? 5 : undefined} aria-invalid={!!fieldErrors.errors[`rec.${row.key}.note`] || undefined} value={row.note} onChange={event => { fieldErrors.clear(`rec.${row.key}.note`); setRecs(previous => previous.map(item => item.key === row.key ? { ...item, note: event.target.value } : item)); }} placeholder="Ví dụ: má phanh còn 2mm"/><FieldError className="mt-1">{fieldErrors.errors[`rec.${row.key}.note`]}</FieldError></label>
      <IconButton icon="trash" tone="danger" label="Xóa đề xuất" onClick={() => setRecs(previous => previous.filter(item => item.key !== row.key))}/>
    </div>)}
    <div className="cs-btn-row">
      <Button size="sm" variant="tonal" icon="plus" onClick={() => setRecs(previous => [...previous, blankRec(Date.now())])}>Đề xuất dịch vụ</Button>
      <Button size="sm" variant="tonal" icon="plus" onClick={() => setRecs(previous => [...previous, blankRec(Date.now(), "PART")])}>Đề xuất phụ tùng</Button>
    </div>
  </div>;

  return <section className={card}>
    <h2 className="text-lg font-bold text-cs-text">Kiểm tra và chẩn đoán</h2>
    <div className="mt-4 print:hidden">{error && <Notice tone="error">{error}</Notice>}</div>

    {inspection && <div className="space-y-4 text-sm text-cs-text">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-cs-muted">Kết quả kiểm tra</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{inspection.condition_description || "—"}</dd></div>
        <div><dt className="text-xs text-cs-muted">Kết luận chẩn đoán</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{inspection.diagnosis || "—"}</dd></div>
      </dl>
      {!!inspection.items?.length && <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{inspection.items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-3 px-4 py-2.5">
        <span>{item.item_name}</span><StatusBadge domain="inspection" status={item.condition_status}/>
      </li>)}</ul>}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-cs-muted">Đề xuất cần làm</p>
          {canSupplement && !supplementing && <Button size="sm" variant="tonal" icon="plus" className="print:hidden"
            onClick={() => { setSupplementing(true); setError(""); setRecs([blankRec(Date.now(), "PART")]); }}>Bổ sung đề xuất</Button>}
        </div>
        {inspection.recommendations?.length ? <ul className="space-y-1.5">{inspection.recommendations.map(rec => <li key={rec.id}>
          • {rec.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}: <strong>{rec.part?.name || rec.service?.name || "—"}</strong> × {rec.quantity ?? 1}{rec.note ? <> · <span className="font-medium">{rec.note}</span></> : ""}
          {rec.added_after_completion && <span className="ml-2 inline-flex items-center rounded-full bg-cs-soft px-2 py-0.5 align-middle text-caption font-semibold text-cs-accent-text"
            title={`Bổ sung sau khi hoàn tất chẩn đoán${rec.added_by?.employee?.full_name ? ` · ${rec.added_by.employee.full_name}` : ""}${rec.created_at ? ` · ${new Date(rec.created_at).toLocaleString("vi-VN")}` : ""}`}>Bổ sung</span>}
        </li>)}</ul>
          : <p className="text-cs-muted">Chưa có đề xuất.</p>}
      </div>
      <p className="text-xs text-cs-muted">{inspection.recorded_by?.full_name ? `Người nhập: ${inspection.recorded_by.full_name} · ` : ""}{inspection.inspected_at ? `Hoàn tất ${new Date(inspection.inspected_at).toLocaleString("vi-VN")}` : "Chưa hoàn tất chẩn đoán"}</p>
      <div className="print:hidden"><PhotoUploader type="inspection" id={inspection.id} title="Ảnh chẩn đoán"/></div>
    </div>}

    {canSupplement && supplementing && <form noValidate className="mt-5 space-y-4 border-t border-cs-border pt-5 print:hidden" onSubmit={event => void addMore(event)}>
      <div>
        <h3 className="text-sm font-bold text-cs-text">Bổ sung đề xuất</h3>
        <p className="mt-1 text-caption text-cs-muted">Chẩn đoán đã hoàn tất — đề xuất bổ sung cần ghi lý do và được ghi lại người bổ sung.
          {sentQuotation ? " Báo giá đã gửi khách không tự thay đổi; muốn đưa đề xuất này vào thì lập báo giá mới." : " Lưu xong có thể chọn ngay trong báo giá."}</p>
      </div>
      {recEditor}
      <div className="cs-btn-row cs-btn-row-end">
        <Button variant="secondary" disabled={working} onClick={() => { setSupplementing(false); setRecs([]); setError(""); fieldErrors.reset(); }}>Huỷ</Button>
        <Button type="submit" variant="primary" icon="check" loading={working}>Lưu đề xuất bổ sung</Button>
      </div>
    </form>}

    {canFinish && <form noValidate className="mt-5 space-y-4 border-t border-cs-border pt-5 print:hidden" onSubmit={event => void addMore(event)}>
      <h3 className="text-sm font-bold text-cs-text">Bổ sung đề xuất</h3>
      {recEditor}
      <div className="cs-btn-row cs-btn-row-end">
        {recs.length > 0 && <Button type="submit" variant="secondary" disabled={working}>Lưu đề xuất bổ sung</Button>}
        <Button variant="primary" iconRight="arrow-right" loading={working} onClick={() => void finish()}>Hoàn tất chẩn đoán</Button>
      </div>
    </form>}

    {canRecord && <form noValidate className="space-y-5 print:hidden" onSubmit={event => void record(event)}>
      <div className="cs-info-panel grid gap-4 p-4 text-small md:grid-cols-2">
        <div className="min-w-0">
          <p className="font-bold text-cs-text">Khách yêu cầu</p>
          <div className="mt-1 space-y-1 whitespace-pre-wrap font-normal text-cs-text">
            {order.appointment?.symptom_description && <p><b className="font-semibold">Khi đặt lịch: </b>{order.appointment.symptom_description}</p>}
            {order.appointment?.note && <p><b className="font-semibold">Ghi chú đặt lịch: </b>{order.appointment.note}</p>}
            {order.customer_request && <p><b className="font-semibold">Tại quầy: </b>{order.customer_request}</p>}
            {!order.appointment?.symptom_description && !order.appointment?.note && !order.customer_request && <p className="text-cs-muted">Chưa ghi</p>}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-cs-text">Tình trạng xe khi nhận</p>
          <p className={`mt-1 whitespace-pre-wrap font-normal ${order.initial_condition ? "text-cs-text" : "text-cs-muted"}`}>{order.initial_condition || "Chưa ghi"}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-cs-muted">Kết quả kiểm tra<textarea className={`${input} min-h-20`} value={condition} onChange={event => setCondition(event.target.value)} placeholder="Ví dụ: phanh trước kêu khi dừng, đĩa phanh xước nhẹ"/></label>
        <label className="text-xs font-semibold text-cs-muted">Kết luận chẩn đoán<textarea className={`${input} min-h-20`} value={diagnosis} onChange={event => setDiagnosis(event.target.value)} placeholder="Ví dụ: má phanh trước mòn còn 2mm, cần thay"/></label>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-cs-text">Hạng mục đã kiểm tra</h3>
        {checks.map(row => <div key={row.key} className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 md:grid-cols-[minmax(0,2fr)_150px_minmax(0,2fr)_auto] md:items-end">
          <label className="text-xs font-semibold text-cs-muted">Hạng mục<Req/><input className={input} aria-invalid={!!fieldErrors.errors[`check.${row.key}`] || undefined} value={row.item_name} onChange={event => { fieldErrors.clear(`check.${row.key}`); setChecks(previous => previous.map(item => item.key === row.key ? { ...item, item_name: event.target.value } : item)); }} placeholder="Ví dụ: Má phanh trước"/><FieldError className="mt-1">{fieldErrors.errors[`check.${row.key}`]}</FieldError></label>
          <label className="text-xs font-semibold text-cs-muted">Kết quả<select className={input} value={row.status} onChange={event => setChecks(previous => previous.map(item => item.key === row.key ? { ...item, status: event.target.value as InspectionResult } : item))}>
            <option value="PASSED">Đạt</option><option value="WARNING">Cần lưu ý</option><option value="FAILED">Không đạt</option>
          </select></label>
          <label className="text-xs font-semibold text-cs-muted">Mô tả tình trạng (tùy chọn)<input className={input} value={row.condition_description} onChange={event => setChecks(previous => previous.map(item => item.key === row.key ? { ...item, condition_description: event.target.value } : item))} placeholder="Ví dụ: còn 2mm"/></label>
          <IconButton icon="trash" tone="danger" label="Xóa hạng mục" disabled={checks.length === 1} onClick={() => setChecks(previous => previous.filter(item => item.key !== row.key))}/>
        </div>)}
        <Button size="sm" variant="tonal" icon="plus" onClick={() => setChecks(previous => [...previous, blankCheck(Date.now())])}>Thêm hạng mục</Button>
      </div>
      <div className="space-y-3"><h3 className="text-sm font-bold text-cs-text">Đề xuất dịch vụ / phụ tùng</h3>
        {prefilledRecs.length > 0 && <Notice>Đã điền sẵn {prefilledRecs.length} dòng theo yêu cầu khi đặt lịch. Sau khi kiểm tra, bỏ dòng không cần và thêm phát sinh.</Notice>}
        {recEditor}
      </div>
      <div className="cs-btn-row cs-btn-row-end"><Button type="submit" variant="secondary" loading={working}>Lưu kết quả kiểm tra</Button></div>
    </form>}

    {!inspection && !canRecord && <p className="text-sm text-cs-muted">Phiếu không có kết quả kiểm tra.</p>}
  </section>;
}
