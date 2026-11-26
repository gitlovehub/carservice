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