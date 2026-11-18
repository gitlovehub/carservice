import { useEffect, useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { SearchableSelect } from "../../components/vehicle/SearchableSelect";
import { openPartRequests, workflowApi, type CatalogPart, type PartRequestRow, type ShortagePartInput, type WorkflowOrder } from "../../services/workflowService";
import { Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Phụ tùng thiếu (P6 + ADV-01 / D-020).
 * Cố vấn chỉ BÁO THIẾU: tự tạo khi khách duyệt mà kho không đủ, hoặc báo tay kèm lý do.
 * Admin / kho đặt hàng (ngày dự kiến về) và nhận hàng ở "Phụ tùng & kho → Cần đặt hàng".
 * Cố vấn rút lại được báo thiếu khi kho chưa đặt hàng.
 */

const REPORTABLE = ["IN_PROGRESS", "WAITING_FOR_PARTS"];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "";

function statusBadge(row: PartRequestRow) {
  const overdue = row.status === "ORDERED" && !!row.eta_date && row.eta_date < today();
  if (overdue) return <Badge tone="danger">Quá hạn · dự kiến {fmtDate(row.eta_date)}</Badge>;
  switch (row.status) {
    case "REQUESTED": return <Badge tone="warning">Chờ kho đặt hàng</Badge>;
    case "ORDERED": return <Badge tone="info">Kho đã đặt{row.eta_date ? ` · dự kiến ${fmtDate(row.eta_date)}` : ""}</Badge>;
    case "RECEIVED": return <Badge tone="success">Đã về kho</Badge>;
    default: return <Badge tone="neutral">Đã hủy</Badge>;
  }
}

/** Danh mục phụ tùng cho ô chọn (dùng chung cache 30 giây của workflowApi). */
function usePartCatalog(enabled: boolean) {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    workflowApi.parts().then(list => { if (active) { setParts(list); setError(""); } }).catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, [enabled, reload]);
  return { parts, error, loading: enabled && !parts.length && !error, retry: () => setReload(n => n + 1) };
}

type Line = { key: number; partId: number | null; quantity: number; note: string };
const blankLine = (): Line => ({ key: Date.now() + Math.random(), partId: null, quantity: 1, note: "" });

function ShortageLine({ line, parts, catalog, onChange, onRemove }: {
  line: Line; parts: CatalogPart[]; catalog: ReturnType<typeof usePartCatalog>; onChange: (patch: Partial<Line>) => void; onRemove?: () => void;
}) {
  const part = parts.find(p => p.id === line.partId);
  return <div className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_128px_auto] sm:items-end">
    <SearchableSelect label="Phụ tùng thiếu" placeholder="Tìm tên hoặc mã phụ tùng…" required loading={catalog.loading} loadError={catalog.error} onRetry={catalog.retry}
      options={parts.map(p => ({ value: p.id, label: p.name, hint: `${p.sku} · tồn ${p.inventory?.quantity ?? 0}${p.unit ? ` ${p.unit}` : ""}` }))}
      value={line.partId} onChange={option => onChange({ partId: option?.value ?? null })}/>
    <Field label="Số lượng" required><QuantityStepper label="Số lượng thiếu" size="md" className="w-full" min={1} max={999} unit={part?.unit ?? undefined} value={line.quantity} onChange={v => onChange({ quantity: v ?? 1 })}/></Field>
    {onRemove ? <IconButton icon="trash" tone="danger" label="Bỏ dòng" onClick={onRemove}/> : <span className="hidden sm:block"/>}
    <Field label="Lý do / ghi chú cho kho" optional className="sm:col-span-3"><Input maxLength={500} value={line.note} placeholder="Ví dụ: phát hiện rách khi tháo, cần hàng chính hãng" onChange={e => onChange({ note: e.target.value })}/></Field>
  </div>;
}

const toInput = (lines: Line[]): ShortagePartInput[] => lines.filter(l => l.partId).map(l => ({ part_id: l.partId as number, quantity: l.quantity, ...(l.note.trim() ? { note: l.note.trim() } : {}) }));

export function PartRequestsPanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const rows = order.part_requests ?? [];
  const canReport = REPORTABLE.includes(order.status);
  const [reporting, setReporting] = useState(false);
  const catalog = usePartCatalog(reporting);
  const [line, setLine] = useState<Line>(blankLine);
  const [withdraw, setWithdraw] = useState<{ id: number; reason: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  if (!rows.length && !canReport) return null;

  async function run(task: () => Promise<unknown>, message: string, after?: () => void) {
    setWorking(true); setError("");
    try { await task(); after?.(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  const open = rows.filter(r => ["REQUESTED", "ORDERED"].includes(r.status));
  return <div className="mt-6 border-t border-cs-border pt-5" data-testid="part-requests">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-cs-text">Phụ tùng thiếu {open.length > 0 && <span className="font-normal text-cs-muted">· {open.length} đang chờ</span>}</h3>
      {canReport && !reporting && <Button size="sm" variant="tonal" icon="plus" onClick={() => { setLine(blankLine()); setReporting(true); }}>Báo thiếu phụ tùng</Button>}
    </div>
    <p className="mb-3 text-xs text-cs-muted">Cố vấn báo thiếu; kho (quản trị viên) đặt hàng, cập nhật ngày dự kiến và nhập kho khi hàng về. Khách thấy tình trạng chờ trong tài khoản.</p>
    {error && <Notice tone="error">{error}</Notice>}

    {rows.length > 0 && <ul className="space-y-2">{rows.map(row => <li key={row.id} className="rounded-xl border border-cs-border bg-cs-surface-2 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-cs-text">{row.part?.name ?? `Phụ tùng #${row.part_id}`} × {row.quantity}{row.part?.unit ? ` ${row.part.unit}` : ""}</span>
        {statusBadge(row)}
      </div>
      <p className="mt-1 text-xs text-cs-muted">{row.request_note ? `Lý do: ${row.request_note}` : row.quotation_item_id ? "Tự tạo: khách đã duyệt nhưng kho không đủ hàng." : ""}{row.cancel_reason ? ` · Hủy: ${row.cancel_reason}` : ""}</p>
      {row.status === "REQUESTED" && (withdraw?.id === row.id
        ? <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void run(() => workflowApi.cancelPartRequest(row.id, withdraw.reason.trim()), "Đã rút lại báo thiếu phụ tùng.", () => setWithdraw(null)); }}>
          <Field label="Lý do rút lại" required className="min-w-56 flex-1"><Input minLength={5} maxLength={1000} required value={withdraw.reason} onChange={e => setWithdraw({ id: row.id, reason: e.target.value })} placeholder="Ví dụ: khách tự mua phụ tùng"/></Field>
          <Button variant="secondary" disabled={working} onClick={() => setWithdraw(null)}>Đóng</Button>
          <Button type="submit" variant="danger-outline" icon="x" loading={working} disabled={withdraw.reason.trim().length < 5}>Rút lại</Button>
        </form>
        : <Button size="sm" variant="ghost" tone="danger" icon="x" className="mt-1" disabled={working} onClick={() => setWithdraw({ id: row.id, reason: "" })}>Rút lại báo thiếu</Button>)}
    </li>)}</ul>}

    {reporting && <form className="mt-3 space-y-3" onSubmit={e => {
      e.preventDefault();
      const [input] = toInput([line]);
      if (!input) { setError("Chọn phụ tùng thiếu."); return; }
      void run(() => workflowApi.reportPartShortage(order.id, input), "Đã báo thiếu phụ tùng cho kho.", () => setReporting(false));
    }}>
      <ShortageLine line={line} parts={catalog.parts} catalog={catalog} onChange={patch => setLine(previous => ({ ...previous, ...patch }))}/>
      <div className="cs-btn-row cs-btn-row-end">
        <Button size="sm" variant="secondary" disabled={working} onClick={() => setReporting(false)}>Huỷ</Button>
        <Button type="submit" size="sm" variant="primary" icon="send" loading={working} disabled={!line.partId}>Gửi kho</Button>
      </div>
    </form>}
  </div>;
}

/**
 * "Chờ phụ tùng": bắt buộc nói rõ thiếu gì (D-020). Phiếu đã có yêu cầu đang mở → chỉ xác nhận;
 * chưa có → chọn phụ tùng + số lượng ngay tại đây (gửi kho cùng lúc chuyển trạng thái).
 */
export function WaitForPartsModal({ order, open, onClose, onDone }: { order: WorkflowOrder; open: boolean; onClose: () => void; onDone: (message: string) => Promise<void> }) {
  const pending = openPartRequests(order);
  const needsLines = pending.length === 0;
  const catalog = usePartCatalog(open);
  const [lines, setLines] = useState<Line[]>(() => [blankLine()]);
  // Đã có yêu cầu đang mở: chỉ hiện ô báo thiếu thêm khi cố vấn bấm "Báo thiếu thêm".
  const [extra, setExtra] = useState(false);
  const showLines = needsLines || extra;
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const removeLine = (key: number) => {
    if (lines.length > 1) setLines(previous => previous.filter(l => l.key !== key));
    else { setLines([blankLine()]); setExtra(false); }
  };

  async function submit() {
    const parts = showLines ? toInput(lines) : [];
    if (needsLines && !parts.length) { setError("Chọn ít nhất một phụ tùng đang thiếu."); return; }
    setWorking(true); setError("");
    try {
      await workflowApi.waitForParts(order.id, parts, note.trim() || undefined);
      onClose();
      await onDone("Phiếu chuyển sang chờ phụ tùng. Kho sẽ đặt hàng và cập nhật ngày dự kiến.");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <Modal open={open} onClose={onClose} dismissible={!working} size="lg" title="Chuyển sang chờ phụ tùng"
    description="Xe tạm dừng sửa vì thiếu phụ tùng. Khách thấy phụ tùng đang chờ và ngày dự kiến trong tài khoản."
    footer={<><Button variant="secondary" disabled={working} onClick={onClose}>Huỷ</Button><Button variant="primary" icon="clock" loading={working} onClick={() => void submit()}>Chuyển sang chờ phụ tùng</Button></>}>
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {needsLines
        ? <p className="text-small text-cs-text-2">Phiếu chưa có phụ tùng nào đang chờ. Chọn phụ tùng thiếu để kho đặt hàng:</p>
        : <div>
          <p className="mb-2 text-small text-cs-text-2">Đang chờ {pending.length} phụ tùng:</p>
          <ul className="space-y-1.5">{pending.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cs-surface-2 px-3 py-2 text-small">
            <span className="font-medium text-cs-text">{row.part?.name} × {row.quantity}</span>{statusBadge(row)}
          </li>)}</ul>
        </div>}
      {showLines && lines.map(line => <ShortageLine key={line.key} line={line} parts={catalog.parts} catalog={catalog}
        onChange={patch => setLines(previous => previous.map(l => l.key === line.key ? { ...l, ...patch } : l))}
        onRemove={lines.length > 1 || !needsLines ? () => removeLine(line.key) : undefined}/>)}
      {showLines
        ? <Button size="sm" variant="tonal" icon="plus" onClick={() => setLines(previous => [...previous, blankLine()])}>Thêm phụ tùng</Button>
        : <Button size="sm" variant="tonal" icon="plus" onClick={() => setExtra(true)}>Báo thiếu thêm phụ tùng khác</Button>}
      <Field label="Ghi chú tiến độ" optional><Textarea rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: đã tháo bơm cũ, chờ hàng về lắp"/></Field>
    </div>
  </Modal>;
}
