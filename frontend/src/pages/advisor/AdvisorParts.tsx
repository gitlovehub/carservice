import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import type { AdminPartRequest } from "../../services/adminApi";
import { advisorPartsApi, type AdvisorPart } from "../../services/advisorPartsApi";
import { formatVnd, listRepairOrders, workflowApi } from "../../services/workflowService";
import type { VehicleSelection } from "../../services/vehicleCatalog";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { dayTime, fullDayTime } from "./advisorListFormat";
import { orderStepPath } from "./repairOrderFlow";
import { Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";
import "./advisorDashboard.css";

/**
 * Phụ tùng (cố vấn) — theo mockup PO 17/11/2026, **chỉ xem** theo D-020 (PO xác nhận lại 17/11): không có Nhập kho /
 * Xuất kho / Điều chỉnh tồn — việc của Admin (kho). Cố vấn: xem tồn kho, yêu cầu đặt hàng, lịch sử nhập/xuất,
 * phụ tùng theo dòng xe; **Báo thiếu phụ tùng** cho một phiếu đang sửa (kho đặt hàng). Xuất kho vẫn làm trong phiếu.
 */

type Tab = "stock" | "requests" | "moves" | "vehicle";
type Level = "all" | "ok" | "low" | "out" | "requested";
const LEVELS: Array<{ id: Level; label: string }> = [
  { id: "all", label: "Tất cả trạng thái" }, { id: "ok", label: "Còn hàng" }, { id: "low", label: "Sắp hết" },
  { id: "out", label: "Hết hàng" }, { id: "requested", label: "Đang chờ về" },
];
const STATS: Array<{ level: Level; key: "total" | "ok" | "low" | "out"; label: string; icon: IconName; tone?: "success" | "warning" | "danger" }> = [
  { level: "all", key: "total", label: "Tổng phụ tùng", icon: "box" },
  { level: "ok", key: "ok", label: "Còn hàng", icon: "layers", tone: "success" },
  { level: "low", key: "low", label: "Sắp hết hàng", icon: "alert", tone: "warning" },
  { level: "out", key: "out", label: "Hết hàng", icon: "x-circle", tone: "danger" },
];
const LEVEL_BADGE = { ok: { tone: "success", label: "Còn hàng" }, low: { tone: "warning", label: "Sắp hết" }, out: { tone: "danger", label: "Hết hàng" } } as const;
const REQUEST_BADGE: Record<string, { tone: "warning" | "info" | "success" | "neutral"; label: string }> = {
  REQUESTED: { tone: "warning", label: "Chờ kho đặt" }, ORDERED: { tone: "info", label: "Kho đã đặt" },
  RECEIVED: { tone: "success", label: "Đã về" }, CANCELLED: { tone: "neutral", label: "Đã huỷ" },
};
const PER_PAGE = 8;
const EMPTY_VEHICLE: VehicleSelection = { brandId: null, brandName: "", modelId: null, modelName: "", trimId: null, trimName: "" };
const dmyDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "";

function PartThumb({ part, size = 40 }: { part: AdvisorPart; size?: number }) {
  return part.image_url
    ? <img src={part.image_url} alt="" className="shrink-0 rounded-lg border border-cs-border bg-white object-contain" style={{ width: size, height: size }}/>
    : <span className="grid shrink-0 place-items-center rounded-lg bg-cs-surface-2 text-cs-muted" style={{ width: size, height: size }} aria-hidden="true"><Icon name="box" size={size / 2}/></span>;
}

export default function AdvisorParts() {
  const [params, setParams] = useSearchParams();
  const tab = (["stock", "requests", "moves", "vehicle"] as Tab[]).find(t => t === params.get("tab")) ?? "stock";
  const [level, setLevel] = useState<Level>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [vehicle, setVehicle] = useState<VehicleSelection>(EMPTY_VEHICLE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [moveSearch, setMoveSearch] = useState("");
  const [report, setReport] = useState<{ part?: AdvisorPart } | null>(null);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const listParams = tab === "vehicle"
    ? { model_id: vehicle.modelId, search: term, page, per_page: PER_PAGE }
    : { status: level, category, search: term, page, per_page: PER_PAGE };
  const list = useAdminQuery(tab === "stock" || (tab === "vehicle" && vehicle.modelId) ? `parts:${JSON.stringify(listParams)}#${version}` : null,
    signal => advisorPartsApi.parts(listParams, signal));
  // Số liệu thẻ + số yêu cầu đang mở (không theo bộ lọc).
  const summary = useAdminQuery(`parts-summary#${version}`, signal => advisorPartsApi.parts({ per_page: 5 }, signal));
  const totals = (summary.data ?? summary.stale)?.summary;
  const categories = (summary.data ?? summary.stale)?.categories ?? [];
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const selected = rows.find(p => p.id === selectedId) ?? rows[0] ?? null;

  const setTab = (next: Tab, extra: Record<string, string> = {}) => { setParams(next === "stock" ? extra : { tab: next, ...extra }, { replace: true }); setPage(1); };
  const pickLevel = (next: Level) => { setLevel(next); setPage(1); setSelectedId(null); if (tab !== "stock") setTab("stock"); };
  const showPreview = tab === "stock" || tab === "vehicle";

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Phụ tùng</h1>
    <section className="adv-ro-stats" aria-label="Thống kê phụ tùng">
      {STATS.map(s => <button key={s.key} type="button" className="adv-card adv-ro-stat" aria-pressed={tab === "stock" && level === s.level} onClick={() => pickLevel(s.level)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{totals ? totals[s.key].toLocaleString("vi-VN") : "–"}</span></span>
      </button>)}
      <button type="button" className="adv-btn-gold adv-ro-create" onClick={() => setReport({})}><Icon name="plus" size={20}/>Báo thiếu phụ tùng</button>
    </section>

    <div className={showPreview ? "adv-parts-layout" : ""}>
      <section className="adv-card min-w-0 overflow-hidden" aria-label="Phụ tùng">
        <div role="tablist" aria-label="Phụ tùng" className="adv-parts-tabs">
          {([["stock", "Tồn kho", "box"], ["requests", "Yêu cầu đặt hàng", "receipt"], ["moves", "Lịch sử nhập/xuất", "history"], ["vehicle", "Phụ tùng theo xe", "car"]] as Array<[Tab, string, IconName]>).map(([id, label, icon]) =>
            <button key={id} type="button" role="tab" aria-selected={tab === id} className="adv-ro-tab" onClick={() => setTab(id)}>
              <Icon name={icon} size={18}/><span>{label}</span>
              {id === "requests" && !!totals?.requests_open && <span className="rounded-full bg-danger-solid px-1.5 text-caption font-bold text-on-solid">{totals.requests_open}</span>}
            </button>)}
        </div>

        <div className="p-4">
          {tab === "stock" && <div className="adv-parts-filters mb-4">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setSelectedId(null); }} placeholder="Tìm mã, tên phụ tùng…" className="adv-ro-search"/>
            <Select aria-label="Danh mục" value={category} onChange={e => { setCategory(e.target.value); setPage(1); setSelectedId(null); }}>
              <option value="all">Tất cả danh mục</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select aria-label="Trạng thái tồn kho" value={level} onChange={e => pickLevel(e.target.value as Level)}>
              {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </div>}

          {tab === "vehicle" && <div className="mb-4 space-y-3">
            <p className="text-small text-cs-text-2">Chọn hãng và dòng xe để xem phụ tùng tương thích (theo khai báo của kho).</p>
            <VehicleSelector value={vehicle} onChange={next => { setVehicle(next); setPage(1); setSelectedId(null); }}/>
            {vehicle.modelId && <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Lọc theo mã, tên phụ tùng…"/>}
          </div>}

          {(tab === "stock" || tab === "vehicle") && (tab === "vehicle" && !vehicle.modelId
            ? <EmptyState compact icon="car" title="Chưa chọn dòng xe" description="Chọn hãng → dòng xe ở trên."/>
            : list.loading && !result ? <LoadingState compact label="Đang tải phụ tùng..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="box" title="Không có phụ tùng phù hợp" description={tab === "vehicle" ? "Kho chưa khai báo phụ tùng tương thích dòng xe này." : "Thử đổi bộ lọc hoặc từ khoá."}/>
            : <PartTable rows={rows} selectedId={selected?.id ?? null} onSelect={p => setSelectedId(p.id)}/>)}
          {(tab === "stock" || tab === "vehicle") && result && result.meta.last_page > 1 && <div className="mt-3">
            <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setSelectedId(null); }}/>
          </div>}

          {tab === "requests" && <RequestsTab version={version} onChanged={() => setVersion(v => v + 1)}/>}
          {tab === "moves" && <MovesTab search={moveSearch} onSearch={setMoveSearch}/>}
        </div>
      </section>

      {showPreview && <aside className="adv-parts-preview">
        {selected ? <PartPreview part={selected} onReport={() => setReport({ part: selected })} onHistory={() => { setMoveSearch(selected.sku); setTab("moves"); }}/>
          : <section className="adv-card grid min-h-[280px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một phụ tùng để xem chi tiết.</section>}
      </aside>}
    </div>

    {report && <ReportShortageModal preset={report.part} onClose={() => setReport(null)} onDone={() => { setReport(null); setVersion(v => v + 1); }}/>}
  </main>;
}

function PartTable({ rows, selectedId, onSelect }: { rows: AdvisorPart[]; selectedId: number | null; onSelect: (p: AdvisorPart) => void }) {
  return <div className="overflow-x-auto rounded-xl border border-cs-border">
    <table className="w-full min-w-[640px] text-small">
      <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
        <th className="px-3 py-2.5 font-semibold">SKU</th><th className="px-3 py-2.5 font-semibold">Tên phụ tùng</th>
        <th className="px-3 py-2.5 font-semibold">Danh mục</th><th className="px-3 py-2.5 text-right font-semibold">Tồn kho</th>
        <th className="px-3 py-2.5 text-right font-semibold">Tối thiểu</th><th className="px-3 py-2.5 font-semibold">Trạng thái</th>
      </tr></thead>
      <tbody className="divide-y divide-cs-border">{rows.map(p => <tr key={p.id} tabIndex={0} aria-selected={p.id === selectedId} className="adv-parts-row"
        onClick={() => onSelect(p)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p); } }}>
        <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-cs-text">{p.sku}</td>
        <td className="px-3 py-2.5"><span className="flex items-center gap-3"><PartThumb part={p} size={36}/><span className="font-medium text-cs-text">{p.name}</span></span></td>
        <td className="px-3 py-2.5">{p.category ? <span className="adv-kind" data-kind="part">{p.category}</span> : <span className="text-cs-muted">—</span>}</td>
        <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${p.level === "out" ? "text-danger" : "text-cs-text"}`}>{p.stock}
          {p.requested > 0 && <span className="block text-caption font-normal text-cs-muted">+{p.requested} chờ về</span>}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-cs-text-2">{p.min}</td>
        <td className="whitespace-nowrap px-3 py-2.5"><Badge tone={LEVEL_BADGE[p.level].tone}>{LEVEL_BADGE[p.level].label}</Badge></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function PartPreview({ part, onReport, onHistory }: { part: AdvisorPart; onReport: () => void; onHistory: () => void }) {
  const fact = (icon: IconName, label: string, value: string) => <div className="flex items-center gap-3">
    <Icon name={icon} size={22} className="shrink-0 text-cs-muted"/><span><span className="block text-caption text-cs-muted">{label}</span><b className="text-cs-text">{value}</b></span>
  </div>;
  return <section className="adv-card adv-ro-detail" aria-label={`Phụ tùng ${part.name}`}>
    <header className="flex items-start gap-4">
      <PartThumb part={part} size={88}/>
      <div className="min-w-0 flex-1">
        <h2 className="text-subheading font-bold text-cs-text">{part.name}</h2>
        <p className="text-small text-cs-text-2">SKU: <span className="tabular-nums">{part.sku}</span></p>
        <Badge tone={LEVEL_BADGE[part.level].tone} className="mt-2">{LEVEL_BADGE[part.level].label}</Badge>
      </div>
    </header>
    <div className="adv-ro-vehicle grid-cols-2! gap-4">
      {fact("tag", "Danh mục", part.category || "—")}
      {fact("box", "Tồn kho hiện tại", `${part.stock} ${part.unit}`)}
      {fact("layers", "Tồn tối thiểu", `${part.min} ${part.unit}`)}
      {fact("clock", "Đang chờ về", part.requested ? `${part.requested} ${part.unit}` : "Không")}
    </div>
    <dl className="space-y-3 rounded-2xl border border-cs-border p-4 text-small">
      <h3 className="adv-section-title">Thông tin bổ sung</h3>
      <div className="flex gap-3"><dt className="w-28 shrink-0 text-cs-muted">Giá bán</dt><dd className="font-semibold tabular-nums text-cs-text">{formatVnd(part.price)}</dd></div>
      <div className="flex gap-3"><dt className="w-28 shrink-0 text-cs-muted">Dòng xe tương thích</dt><dd className="text-cs-text">{part.compat.length ? part.compat.map(c => c.name).join(", ") : "Chưa khai báo"}</dd></div>
      <div className="flex gap-3"><dt className="w-28 shrink-0 text-cs-muted">Mô tả</dt><dd className="whitespace-pre-wrap text-cs-text">{part.description || "—"}</dd></div>
      <div className="flex gap-3"><dt className="w-28 shrink-0 text-cs-muted">Cập nhật tồn</dt><dd className="tabular-nums text-cs-text-2">{fullDayTime(part.updated_at)}</dd></div>
    </dl>
    <p className="text-caption text-cs-muted">Nhập kho, điều chỉnh tồn do kho (Admin) thực hiện. Xuất kho cho xe làm trong phiếu sửa chữa.</p>
    <footer className="cs-btn-row justify-end">
      <Button variant="outline" icon="history" onClick={onHistory}>Lịch sử nhập/xuất</Button>
      <button type="button" className="adv-btn-gold" onClick={onReport}><Icon name="alert" size={18}/>Báo thiếu cho phiếu</button>
    </footer>
  </section>;
}

function RequestsTab({ version, onChanged }: { version: number; onChanged: () => void }) {
  const { notify } = useAppFeedback();
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<AdminPartRequest | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const reqParams = { status, page, per_page: 10 };
  const list = useAdminQuery(`part-requests:${JSON.stringify(reqParams)}#${version}`, signal => advisorPartsApi.requests(reqParams, signal));
  const result = list.data ?? list.stale;

  async function cancel() {
    if (!cancelling || reason.trim().length < 5) return;
    setWorking(true);
    try { await workflowApi.cancelPartRequest(cancelling.id, reason.trim()); notify("Đã rút lại báo thiếu phụ tùng.", "success"); setCancelling(null); setReason(""); onChanged(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }

  return <div className="space-y-3">
    <div className="adv-parts-filters">
      <Select aria-label="Trạng thái yêu cầu" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        <option value="OPEN">Đang chờ (chưa về)</option><option value="REQUESTED">Chờ kho đặt</option><option value="ORDERED">Kho đã đặt</option>
        <option value="RECEIVED">Đã về</option><option value="CANCELLED">Đã huỷ</option><option value="">Tất cả</option>
      </Select>
      <p className="text-caption text-cs-muted">Kho (Admin) đặt hàng và nhập kho khi hàng về. Cố vấn chỉ rút lại được khi kho chưa đặt.</p>
    </div>
    {list.loading && !result ? <LoadingState compact/> : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
      : !result?.data.length ? <EmptyState compact icon="receipt" title="Không có yêu cầu" description="Báo thiếu phụ tùng cho phiếu đang sửa để kho đặt hàng."/>
      : <ul className="space-y-2.5">{result.data.map(r => { const b = REQUEST_BADGE[r.status]; return <li key={r.id} className="adv-appt cursor-default! grid-cols-[minmax(0,1fr)_auto] items-center">
        <span className="min-w-0 space-y-1">
          <span className="flex flex-wrap items-center gap-2"><b className="text-small text-cs-text">{r.part?.name ?? `Phụ tùng #${r.part_id}`} × {r.quantity}</b>
            <Badge tone={b.tone}>{b.label}{r.status === "ORDERED" && r.eta_date ? ` · về ${dmyDate(r.eta_date)}` : ""}</Badge>
            <span className="text-caption text-cs-muted">Tồn kho: {r.part?.inventory?.quantity ?? 0}</span></span>
          <span className="block text-caption text-cs-text-2">
            {r.repair_order ? <Link className="font-semibold text-cs-accent-text hover:underline" to={orderStepPath(r.repair_order.id, 3)}>{r.repair_order.repair_order_code}</Link> : "—"}
            {r.repair_order?.vehicle?.license_plate ? ` · ${r.repair_order.vehicle.license_plate}` : ""} · báo bởi {r.created_by?.employee?.full_name || r.created_by?.email || "hệ thống"} · {dayTime(r.created_at)}</span>
          {(r.request_note || r.supplier_note) && <span className="block text-caption text-cs-muted">{r.request_note}{r.supplier_note ? ` · Kho: ${r.supplier_note}` : ""}</span>}
        </span>
        {r.status === "REQUESTED" && <Button size="sm" variant="outline" icon="x" onClick={() => { setCancelling(r); setReason(""); }}>Rút lại</Button>}
      </li>; })}</ul>}
    {result && result.last_page > 1 && <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={10} disabled={list.loading} onChange={setPage}/>}
    {cancelling && <Modal open onClose={() => setCancelling(null)} dismissible={!working} size="sm" title="Rút lại báo thiếu phụ tùng"
      description={`${cancelling.part?.name ?? "Phụ tùng"} × ${cancelling.quantity} — ${cancelling.repair_order?.repair_order_code ?? ""}`}
      footer={<><Button variant="secondary" disabled={working} onClick={() => setCancelling(null)}>Đóng</Button><Button variant="danger" icon="x" loading={working} disabled={reason.trim().length < 5} onClick={() => void cancel()}>Rút lại</Button></>}>
      <Field label="Lý do" required hint="Ít nhất 5 ký tự."><Textarea rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ví dụ: đã tìm được phụ tùng thay thế trong kho"/></Field>
    </Modal>}
  </div>;
}

function MovesTab({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 350);
  const moveParams = { type, search: term, page, per_page: 12 };
  const list = useAdminQuery(`moves:${JSON.stringify(moveParams)}`, signal => advisorPartsApi.moves(moveParams, signal));
  const result = list.data ?? list.stale;
  return <div className="space-y-3">
    <div className="adv-parts-filters">
      <SearchInput value={search} onChange={v => { onSearch(v); setPage(1); }} placeholder="SKU, tên phụ tùng, mã phiếu, ghi chú…" className="adv-ro-search"/>
      <Select aria-label="Loại giao dịch" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
        <option value="all">Nhập & xuất</option><option value="IN">Nhập kho</option><option value="OUT">Xuất kho</option>
      </Select>
    </div>
    {list.loading && !result ? <LoadingState compact/> : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
      : !result?.data.length ? <EmptyState compact icon="history" title="Chưa có giao dịch phù hợp"/>
      : <div className="overflow-x-auto rounded-xl border border-cs-border"><table className="w-full min-w-[680px] text-small">
        <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
          <th className="px-3 py-2.5 font-semibold">Thời gian</th><th className="px-3 py-2.5 font-semibold">Loại</th><th className="px-3 py-2.5 font-semibold">Phụ tùng</th>
          <th className="px-3 py-2.5 text-right font-semibold">SL</th><th className="px-3 py-2.5 font-semibold">Chứng từ</th><th className="px-3 py-2.5 font-semibold">Người làm</th>
        </tr></thead>
        <tbody className="divide-y divide-cs-border">{result.data.map(m => <tr key={m.id} className="text-cs-text">
          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-cs-text-2">{fullDayTime(m.at)}</td>
          <td className="px-3 py-2.5"><Badge tone={m.type === "IN" ? "success" : "warning"}>{m.type === "IN" ? "Nhập" : "Xuất"}</Badge></td>
          <td className="px-3 py-2.5"><span className="font-medium">{m.name}</span> <span className="text-caption text-cs-muted">{m.sku}</span>{m.note && <span className="block text-caption text-cs-muted">{m.note}</span>}</td>
          <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${m.type === "IN" ? "text-success-fg" : "text-cs-text"}`}>{m.type === "IN" ? "+" : "−"}{m.quantity} {m.unit}</td>
          <td className="whitespace-nowrap px-3 py-2.5">{m.ref}</td>
          <td className="px-3 py-2.5 text-cs-text-2">{m.by}</td>
        </tr>)}</tbody>
      </table></div>}
    {result && result.meta.last_page > 1 && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={12} disabled={list.loading} onChange={setPage}/>}
  </div>;
}

/** Báo thiếu phụ tùng cho một phiếu đang sửa / chờ phụ tùng (POST /repair-orders/{id}/part-requests) — kho đặt hàng. */
function ReportShortageModal({ preset, onClose, onDone }: { preset?: AdvisorPart; onClose: () => void; onDone: () => void }) {
  const { notify } = useAppFeedback();
  const orders = useAdminQuery("shortage-orders", signal => listRepairOrders({ statuses: ["IN_PROGRESS", "WAITING_FOR_PARTS"], perPage: 100, sort: "ready", dir: "asc" }, signal));
  const catalog = useAdminQuery(preset ? null : "shortage-parts", () => workflowApi.parts());
  const [orderId, setOrderId] = useState("");
  const [partId, setPartId] = useState(preset ? String(preset.id) : "");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const qty = Number(quantity);
    if (!orderId || !partId) { setError("Chọn phiếu sửa chữa và phụ tùng."); return; }
    if (!Number.isSafeInteger(qty) || qty < 1) { setError("Số lượng phải là số nguyên dương."); return; }
    setWorking(true); setError("");
    try {
      await workflowApi.reportPartShortage(Number(orderId), { part_id: Number(partId), quantity: qty, ...(note.trim() ? { note: note.trim() } : {}) });
      notify("Đã báo thiếu phụ tùng. Kho sẽ đặt hàng và cập nhật ngày về.", "success");
      onDone();
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  const orderRows = orders.data?.data ?? [];
  return <Modal open onClose={onClose} dismissible={!working} size="md" title="Báo thiếu phụ tùng"
    description="Gửi kho (Admin) đặt hàng cho một phiếu đang sửa. Muốn tạm dừng sửa để chờ hàng, dùng nút Báo thiếu ở trang Tiến độ sửa chữa."
    footer={<><Button variant="secondary" disabled={working} onClick={onClose}>Huỷ</Button><Button variant="primary" icon="send" loading={working} onClick={() => void submit()}>Gửi kho</Button></>}>
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Phiếu sửa chữa" required hint={orders.loading ? "Đang tải phiếu…" : !orderRows.length ? "Không có phiếu đang sửa / chờ phụ tùng." : undefined}>
        <Select value={orderId} onChange={e => setOrderId(e.target.value)} disabled={orders.loading}>
          <option value="">— Chọn phiếu —</option>
          {orderRows.map(o => <option key={o.id} value={o.id}>{o.repair_order_code} · {o.vehicle?.license_plate || "xxx.xx"} · {o.customer?.full_name}</option>)}
        </Select>
      </Field>
      <Field label="Phụ tùng" required>
        {preset ? <Input value={`${preset.sku} · ${preset.name} (tồn ${preset.stock})`} disabled/>
          : <Select value={partId} onChange={e => setPartId(e.target.value)} disabled={catalog.loading}>
            <option value="">{catalog.loading ? "Đang tải…" : "— Chọn phụ tùng —"}</option>
            {(catalog.data ?? []).map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name} (tồn {p.inventory?.quantity ?? 0})</option>)}
          </Select>}
      </Field>
      <Field label="Số lượng" required><Input type="number" min={1} max={999} value={quantity} onChange={e => setQuantity(e.target.value)} className="w-32"/></Field>
      <Field label="Lý do / ghi chú cho kho" optional><Textarea rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: má phanh mòn hết, cần hàng chính hãng"/></Field>
    </div>
  </Modal>;
}
