import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { fetchApi } from "../../services/api";
import type { PartRequestRow, WorkflowOrder } from "../../services/workflowService";
import { input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

const STATUS_TEXT: Record<PartRequestRow["status"], string> = { REQUESTED: "Cần đặt", ORDERED: "Đã đặt", RECEIVED: "Đã về", CANCELLED: "Đã hủy" };

/**
 * Phụ tùng chờ (P6): tự tạo khi khách đã duyệt phụ tùng mà kho thiếu. Cố vấn ghi đặt hàng + ngày dự kiến về,
 * bấm "Đã về" để nhập kho và báo khách, hoặc hủy kèm lý do.
 */
export function PartRequestsPanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const rows = order.part_requests ?? [];
  const [eta, setEta] = useState<Record<number, string>>({});
  const [note, setNote] = useState<Record<number, string>>({});
  const [cancelReason, setCancelReason] = useState<Record<number, string | undefined>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  if (!rows.length) return null;

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }
  const post = (path: string, body: object) => fetchApi(path, { method: "POST", body: JSON.stringify(body) });
  const today = new Date().toISOString().slice(0, 10);

  return <div className="mt-6" data-testid="part-requests">
    <h3 className="mb-2 text-sm font-bold text-cs-text">Phụ tùng chờ đặt hàng</h3>
    {error && <div className="mb-2"><Notice tone="error">{error}</Notice></div>}
    <ul className="space-y-2">{rows.map(row => {
      const open = ["REQUESTED", "ORDERED"].includes(row.status);
      const overdue = open && row.eta_date && row.eta_date < today;
      return <li key={row.id} className="rounded-xl border border-cs-border bg-cs-surface-2 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-cs-text">{row.part?.name ?? `Phụ tùng #${row.part_id}`} × {row.quantity}</span>
          <span className={`text-xs font-bold ${overdue ? "text-cs-danger" : "text-cs-muted"}`}>{STATUS_TEXT[row.status]}{row.eta_date ? ` · dự kiến ${new Date(row.eta_date).toLocaleDateString("vi-VN")}` : ""}{overdue ? " · quá hạn" : ""}</span>
        </div>
        {row.supplier_note && <p className="mt-1 text-xs text-cs-muted">Nhà cung cấp: {row.supplier_note}</p>}
        {open && <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-cs-muted">Ngày dự kiến về<input className={`${input} mt-1`} type="date" min={today} value={eta[row.id] ?? row.eta_date ?? ""} onChange={e => setEta({ ...eta, [row.id]: e.target.value })}/></label>
          <label className="min-w-40 flex-1 text-xs font-semibold text-cs-muted">Ghi chú nhà cung cấp<input className={`${input} mt-1`} maxLength={1000} value={note[row.id] ?? row.supplier_note ?? ""} onChange={e => setNote({ ...note, [row.id]: e.target.value })}/></label>
          <Button size="sm" variant="secondary" disabled={working || !(eta[row.id] ?? row.eta_date)} onClick={() => void run(() => post(`/part-requests/${row.id}/order`, { eta_date: eta[row.id] ?? row.eta_date, supplier_note: note[row.id] ?? row.supplier_note ?? null }), "Đã ghi đặt hàng và ngày dự kiến về.")}>Lưu đặt hàng</Button>
          <Button size="sm" variant="success" icon="check" disabled={working} onClick={() => void run(() => post(`/part-requests/${row.id}/receive`, {}), "Phụ tùng đã về: đã nhập kho và báo khách.")}>Đã về</Button>
          {cancelReason[row.id] === undefined
            ? <Button size="sm" variant="ghost" tone="danger" icon="x" disabled={working} onClick={() => setCancelReason({ ...cancelReason, [row.id]: "" })}>Hủy</Button>
            : <span className="flex flex-wrap items-end gap-2">
              <input className={`${input} mt-0 w-56`} aria-label="Lý do hủy" placeholder="Lý do hủy (≥ 5 ký tự)" minLength={5} value={cancelReason[row.id]} onChange={e => setCancelReason({ ...cancelReason, [row.id]: e.target.value })}/>
              <Button size="sm" variant="danger-outline" icon="x" disabled={working || (cancelReason[row.id] ?? "").trim().length < 5} onClick={() => void run(() => post(`/part-requests/${row.id}/cancel`, { reason: cancelReason[row.id] }), "Đã hủy yêu cầu phụ tùng.")}>Xác nhận hủy</Button>
            </span>}
        </div>}
      </li>;
    })}</ul>
  </div>;
}
