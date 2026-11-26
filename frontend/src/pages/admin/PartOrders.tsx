import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { useMemo, useState } from "react";
import { Button, DataTable, DateInput, EmptyState, Field, Input, SearchInput, type Column } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, fmtDateTime, type AdminPartRequest } from "../../services/adminApi";
import { ClearFilters, FilterSelect, Pill, SplitView, Toolbar } from "./kit/AdminKit";
import { num, type Tone } from "./kit/format";

/**
 * Phụ tùng & kho → "Cần đặt hàng" (ADV-01 / D-020).
 * Cố vấn báo thiếu phụ tùng cho phiếu; kho (Admin) gom theo phụ tùng, đặt hàng (ngày dự kiến về),
 * và "Đã về" = nhập kho QUA yêu cầu (một lần). Hàng đã nhập bằng phiếu nhập thường → "Đã có trong kho" (không cộng lần nữa).
 */

type Stage = "REQUESTED" | "OVERDUE" | "ORDERED";
type Group = {
  partId: number; name: string; sku: string | null; unit: string | null; stock: number;
  needed: number; requests: AdminPartRequest[]; stage: Stage; eta: string | null;
};
type Filter = "all" | Stage;

const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";
const isOverdue = (r: AdminPartRequest) => r.status === "ORDERED" && !!r.eta_date && r.eta_date < today();
const STAGE: Record<Stage, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Cần đặt", tone: "warning" },
  OVERDUE: { label: "Quá hạn", tone: "danger" },
  ORDERED: { label: "Đã đặt", tone: "info" },
};

function groupByPart(rows: AdminPartRequest[]): Group[] {
  const groups = new Map<number, Group>();
  for (const r of rows) {
    const g = groups.get(r.part_id) ?? {
      partId: r.part_id, name: r.part?.name ?? `Phụ tùng #${r.part_id}`, sku: r.part?.sku ?? null, unit: r.part?.unit ?? null,
      stock: r.part?.inventory?.quantity ?? 0, needed: 0, requests: [], stage: "ORDERED" as Stage, eta: null,
    };
    g.needed += r.quantity;
    g.requests.push(r);
    groups.set(r.part_id, g);
  }
  // Mức cần xử lý: còn yêu cầu chưa đặt > đã đặt nhưng quá hạn > đã đặt. Ngày về sớm nhất trong các yêu cầu đã đặt.
  return [...groups.values()].map(g => {
    const stage: Stage = g.requests.some(r => r.status === "REQUESTED") ? "REQUESTED" : g.requests.some(isOverdue) ? "OVERDUE" : "ORDERED";
    const eta = g.requests.map(r => r.eta_date).filter((d): d is string => !!d).sort()[0] ?? null;
    return { ...g, stage, eta };
  }).sort((a, b) => ["REQUESTED", "OVERDUE", "ORDERED"].indexOf(a.stage) - ["REQUESTED", "OVERDUE", "ORDERED"].indexOf(b.stage) || a.name.localeCompare(b.name, "vi"));
}

function RequestCard({ request, stock, onChanged }: { request: AdminPartRequest; stock: number; onChanged: (message: string) => void }) {
  const [eta, setEta] = useState(request.eta_date ?? "");
  const [supplier, setSupplier] = useState(request.supplier_note ?? "");
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const fieldErrors = useFieldErrors();
  const { confirm } = useAppFeedback();
  const order = request.repair_order;
  const unit = request.part?.unit ?? "";

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true);
    try { await task(); onChanged(message); }
    catch (err) { fieldErrors.showApi(err, { eta_date: "eta", supplier_note: "supplier", reason: "reason", cancel_reason: "reason" }); }
    finally { setWorking(false); }
  }
  function saveOrder() {
    if (fieldErrors.show(eta ? {} : { eta: "Chọn ngày dự kiến về." })) return;
    void run(() => adminApi.orderPartRequest(request.id, { eta_date: eta, supplier_note: supplier.trim() || null }), request.status === "ORDERED" ? "Đã cập nhật ngày dự kiến về." : "Đã ghi đặt hàng.");
  }
  function cancelRequest(reason: string) {
    if (fieldErrors.show(reason.trim().length < 5 ? { reason: "Ghi lý do huỷ (ít nhất 5 ký tự)." } : {})) return;
    void run(() => adminApi.cancelPartRequest(request.id, reason.trim()), "Đã huỷ yêu cầu phụ tùng.");
  }
  async function receive(alreadyInStock: boolean) {
    const ok = await confirm(alreadyInStock ? {
      title: "Đóng yêu cầu — hàng đã có trong kho", reference: order?.repair_order_code,
      description: `Dùng khi ${request.quantity} ${unit} đã được nhập bằng phiếu nhập thường. Tồn kho KHÔNG cộng thêm; khách được báo phụ tùng đã về.`,
      confirmText: "Đóng yêu cầu", variant: "success",
    } : {
      title: "Hàng đã về — nhập kho", reference: order?.repair_order_code,
      description: `Nhập ${request.quantity} ${unit} "${request.part?.name}" vào kho (một phiếu nhập gắn phiếu sửa chữa) và báo khách phụ tùng đã về.`,
      confirmText: "Nhập kho", variant: "success", checklist: ["Đã kiểm đếm đủ số lượng, đúng mã phụ tùng."],
    });
    if (ok) await run(() => adminApi.receivePartRequest(request.id, alreadyInStock), alreadyInStock ? "Đã đóng yêu cầu (hàng đã có trong kho)." : "Đã nhập kho và báo khách phụ tùng đã về.");
  }

  return <li className="rounded-card border border-cs-border bg-cs-surface p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-semibold text-cs-text">{order?.repair_order_code ?? "—"} <span className="font-normal text-cs-muted">· {order?.vehicle?.license_plate ?? "—"}</span></p>
        <p className="text-caption text-cs-muted">Cố vấn {order?.advisor?.full_name ?? request.created_by?.employee?.full_name ?? "—"} · báo {fmtDateTime(request.created_at)}</p>
      </div>
      <b className="tabular-nums text-cs-text">× {num(request.quantity)} {unit}</b>
    </div>
    <p className="mt-2 text-small text-cs-text-2 font-medium">{request.request_note ?? (request.quotation_item_id ? "Khách đã duyệt báo giá nhưng kho không đủ hàng." : "—")}</p>
    {request.status === "ORDERED" && <p className="mt-1 text-caption text-cs-muted">Đã đặt {fmtDateTime(request.ordered_at)}{request.supplier_note ? <> · <span className="font-medium">{request.supplier_note}</span></> : ""}</p>}

    <div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <Field label="Ngày dự kiến về" required error={fieldErrors.errors.eta}><DateInput min={today()} value={eta} onChange={e => { setEta(e.target.value); fieldErrors.clear("eta"); }}/></Field>
      <Field label="Nhà cung cấp" error={fieldErrors.errors.supplier}><Input maxLength={1000} value={supplier} onChange={e => { setSupplier(e.target.value); fieldErrors.clear("supplier"); }} placeholder="Không bắt buộc"/></Field>
      <Button variant="outline" icon="calendar" className="sm:col-span-2 sm:justify-self-end" disabled={working} onClick={saveOrder}>
        {request.status === "ORDERED" ? "Cập nhật" : "Đã đặt hàng"}
      </Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button variant="success" icon="box" disabled={working} onClick={() => void receive(false)}>Hàng đã về — nhập kho</Button>
      {stock >= request.quantity && <Button variant="ghost" size="sm" disabled={working} onClick={() => void receive(true)}>Đã có trong kho</Button>}
      <span className="flex-1"/>
      {cancelReason === null
        ? <Button variant="ghost" size="sm" tone="danger" icon="x" disabled={working} onClick={() => setCancelReason("")}>Huỷ yêu cầu</Button>
        : <span className="flex w-full flex-wrap items-start gap-2">
          <Field label="Lý do huỷ" required error={fieldErrors.errors.reason} className="min-w-48 flex-1"><Input minLength={5} maxLength={1000} value={cancelReason} onChange={e => { setCancelReason(e.target.value); fieldErrors.clear("reason"); }} placeholder="VD: khách tự mua, ngừng sản xuất"/></Field>
          <Button size="sm" className="mt-6" disabled={working} onClick={() => { setCancelReason(null); fieldErrors.clear("reason"); }}>Đóng</Button>
          <Button size="sm" variant="danger-outline" icon="x" className="mt-6" disabled={working} onClick={() => cancelRequest(cancelReason)}>Huỷ yêu cầu</Button>
        </span>}
    </div>
  </li>;
}

export function PartOrders({ rows, loading, error, onRetry, onChanged }: {
  rows: AdminPartRequest[]; loading: boolean; error?: string; onRetry: () => void; onChanged: () => void;
}) {
  const { notify } = useAppFeedback();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openPart, setOpenPart] = useState<number | null>(null);
  const groups = useMemo(() => groupByPart(rows), [rows]);
  const needle = search.trim().toLowerCase();
  const shown = groups.filter(g => (filter === "all" || g.stage === filter)
    && (!needle || `${g.name} ${g.sku ?? ""} ${g.requests.map(r => `${r.repair_order?.repair_order_code} ${r.repair_order?.vehicle?.license_plate}`).join(" ")}`.toLowerCase().includes(needle)));