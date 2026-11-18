import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown } from "../../components/ui/Dropdown";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import {
  formatVnd, listQuotations, listRepairOrders, toNumber, workflowApi,
  type QuotationListRow, type WorkflowOrder, type WorkflowQuotation,
} from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { RangePicker, Track } from "./advisorListKit";
import { dayTime, fullDayTime, rangeDates, vehicleName, type Range, type TrackStep } from "./advisorListFormat";
import { orderStepPath, stagePath } from "./repairOrderFlow";
import { errorText } from "./workflowFormat";
import "./advisorDashboard.css";

/**
 * Báo giá & phê duyệt (cố vấn) — theo mockup PO 17/11/2026: 4 thẻ số liệu theo trạng thái báo giá (bấm để lọc),
 * danh sách báo giá dạng thẻ (khoảng ngày lập, trạng thái, tìm kiếm) và khung xem nhanh báo giá đang chọn
 * (tiến trình, xe + khách, chi tiết dòng + tổng, lịch sử khách duyệt, ghi chú).
 * Chỉ khách được duyệt / từ chối (D-008, D-012): mockup có nút nhân viên tự đánh dấu duyệt — không làm; khách đang ở quầy thì
 * xác nhận bằng mã gửi email chủ xe ở bước Báo giá của trang chi tiết phiếu.
 */

type Filter = "all" | "draft" | "sent" | "approved" | "rejected" | "cancelled";
const FILTERS: Array<{ id: Filter; label: string; statuses: string[] }> = [
  { id: "all", label: "Tất cả trạng thái", statuses: [] },
  { id: "draft", label: "Bản nháp", statuses: ["DRAFT"] },
  { id: "sent", label: "Chờ phê duyệt", statuses: ["SENT"] },
  { id: "approved", label: "Đã phê duyệt", statuses: ["APPROVED", "PARTIALLY_APPROVED"] },
  { id: "rejected", label: "Từ chối", statuses: ["REJECTED"] },
  { id: "cancelled", label: "Đã thay bằng bản mới", statuses: ["CANCELLED"] },
];
const STATS: Array<{ filter: Filter; label: string; icon: IconName; tone?: "success" | "danger" }> = [
  { filter: "all", label: "Tổng báo giá", icon: "receipt" },
  { filter: "sent", label: "Chờ phê duyệt", icon: "clock" },
  { filter: "approved", label: "Đã phê duyệt", icon: "check", tone: "success" },
  { filter: "rejected", label: "Từ chối", icon: "x-circle", tone: "danger" },
];
const PER_PAGE = 8;
const WIDE = "(min-width: 1280px)";

/** Nhãn ngắn cho cố vấn (badge chung ghi "Đã gửi khách" cho SENT). */
const STATUS_TEXT: Record<string, { label: string; tone: "warning" | "success" | "info" | "danger" | "neutral" }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  SENT: { label: "Chờ phê duyệt", tone: "warning" },
  APPROVED: { label: "Đã phê duyệt", tone: "success" },
  PARTIALLY_APPROVED: { label: "Duyệt một phần", tone: "info" },
  REJECTED: { label: "Từ chối", tone: "danger" },
  CANCELLED: { label: "Đã thay bản mới", tone: "neutral" },
};
const QuoteBadge = ({ status }: { status: string }) => {
  const s = STATUS_TEXT[status];
  return s ? <Badge tone={s.tone}>{s.label}</Badge> : <StatusBadge domain="quotation" status={status}/>;
};

export default function AdvisorQuotations() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find(f => f.id === params.get("status"))?.id ?? "all";
  const selectedParam = Number(params.get("quotation")) || null;
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("any");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const query = { page, statuses: FILTERS.find(f => f.id === filter)?.statuses ?? [], search: term, perPage: PER_PAGE, ...rangeDates(range) };
  const list = useAdminQuery(`quotations:${JSON.stringify(query)}#${version}`, signal => listQuotations(query, signal));
  // Phiếu đã chẩn đoán xong, chưa có báo giá → số trên nút "Lập báo giá".
  const toQuote = useAdminQuery(`orders-quoting#${version}`, signal => listRepairOrders({ statuses: ["QUOTING"], perPage: 5 }, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const countOf = (id: Filter) => {
    const f = FILTERS.find(item => item.id === id)!;
    return f.statuses.length ? f.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0) : Object.values(counts).reduce((sum, n) => sum + n, 0);
  };
  const selected = rows.find(r => r.id === selectedParam) ?? (selectedParam ? null : rows[0] ?? null);
  const quoting = (toQuote.data ?? toQuote.stale)?.total ?? 0;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const selectFilter = (id: Filter) => { setParam({ status: id === "all" ? null : id, quotation: null }); setPage(1); };
  const open = (row: QuotationListRow) => {
    if (window.matchMedia(WIDE).matches) setParam({ quotation: String(row.id) });
    else navigate(orderStepPath(row.repair_order_id, 2));
  };

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Báo giá & phê duyệt</h1>
    <section className="adv-ro-stats" aria-label="Thống kê báo giá">
      {STATS.map(s => <button key={s.filter} type="button" className="adv-card adv-ro-stat" aria-pressed={filter === s.filter} onClick={() => selectFilter(s.filter)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{result ? countOf(s.filter) : "–"}</span></span>
      </button>)}
      <Link to="/advisor/service-orders?status=QUOTING" className="adv-btn-gold adv-ro-create" title="Phiếu đã chẩn đoán xong, chờ lập báo giá">
        <Icon name="plus" size={20}/>Lập báo giá{quoting > 0 && <span className="rounded-full bg-[#1e1810] px-2 py-0.5 text-caption font-bold text-[#f2cf86]">{quoting}</span>}
      </Link>
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách báo giá">
        <header className="adv-ro-list-head"><h2>Danh sách báo giá</h2></header>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <RangePicker label="Khoảng ngày lập báo giá" anyLabel="Mọi ngày lập" value={range} onChange={r => { setRange(r); setPage(1); setParam({ quotation: null }); }}/>
            <div className="min-w-0 flex-1 [&>span]:w-full">
              <Dropdown label="Trạng thái báo giá" items={FILTERS.map(f => ({ label: `${f.label}${result ? ` (${countOf(f.id)})` : ""}`, icon: f.id === filter ? "check" : undefined, onSelect: () => selectFilter(f.id) }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><span className="min-w-0 flex-1 truncate text-left">{FILTERS.find(f => f.id === filter)?.label}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
          </div>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); setParam({ quotation: null }); }} placeholder="Mã báo giá, mã phiếu, biển số, tên, SĐT…" className="adv-ro-search"/>
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải báo giá..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="receipt" title={term ? "Không tìm thấy báo giá phù hợp" : "Chưa có báo giá ở nhóm này"}
                description={term ? "Thử tìm theo biển số, SĐT hoặc mã khác." : "Báo giá được lập ở bước Báo giá của phiếu sửa chữa, sau khi chẩn đoán."}/>
            : rows.map(q => <button key={q.id} type="button" className="adv-appt adv-ro-item" aria-current={q.id === selected?.id} onClick={() => open(q)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2"><b className="text-small tracking-wide text-cs-text">{q.quotation_code || `Báo giá #${q.id}`}</b>
                  <QuoteBadge status={q.status}/>{q.type === "SUPPLEMENT" && <Badge tone="info">Phát sinh</Badge>}</span>
                <span className="flex items-center gap-2 text-small text-cs-text"><Icon name="user" size={15} className="shrink-0 text-cs-muted"/><span className="min-w-0 flex-1 truncate">{q.repair_order?.customer?.full_name || "—"}</span>
                  <b className="shrink-0 tabular-nums">{formatVnd(q.total_amount)}</b></span>
                <span className="flex items-center gap-2 text-caption text-cs-text-2"><Icon name="car" size={15} className="shrink-0 text-cs-muted"/>
                  <span className="min-w-0 flex-1 truncate">{vehicleName(q.repair_order?.vehicle)} · <span className="tabular-nums">{q.repair_order?.vehicle?.license_plate || "xxx.xx"}</span></span>
                  <span className="shrink-0 tabular-nums">{dayTime(q.created_at)}</span></span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>)}
        </div>
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ quotation: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selected ? <QuotationPreview key={`${selected.id}-${version}`} row={selected} onChanged={() => setVersion(v => v + 1)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một báo giá ở danh sách để xem nhanh.</section>}
      </div>
    </div>
  </main>;
}

/* ---------------- Khung xem nhanh ---------------- */

const REPAIR_STARTED = ["IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "HANDED_OVER"];
const REPAIR_DONE = ["COMPLETED", "HANDED_OVER"];

function quotationTrack(order: WorkflowOrder, q: WorkflowQuotation): TrackStep[] {
  const history = [...(order.status_history ?? [])].reverse(); // cũ → mới
  const firstAt = (statuses: string[]) => history.find(h => h.status && statuses.includes(h.status))?.created_at;
  const inspection = order.inspections?.[0];
  const approved = ["APPROVED", "PARTIALLY_APPROVED"].includes(q.status);
  const response: TrackStep = q.status === "SENT" ? { label: "Khách phê duyệt", state: "active", note: "Chờ khách duyệt" }
    : approved ? { label: "Khách phê duyệt", state: "done", note: q.customer_response_at ? dayTime(q.customer_response_at) : null }
    : q.status === "REJECTED" ? { label: "Khách phê duyệt", state: "rejected", note: "Khách từ chối" }
    : q.status === "CANCELLED" ? { label: "Khách phê duyệt", state: "closed", note: "Đã thay bản mới" }
    : { label: "Khách phê duyệt", state: "todo" };
  const started = approved && REPAIR_STARTED.includes(order.status);
  const finished = approved && REPAIR_DONE.includes(order.status);
  return [
    q.type === "SUPPLEMENT"
      ? { label: "Phát sinh khi sửa", state: "done", note: dayTime(q.created_at) }
      : { label: "Chẩn đoán", state: "done", note: inspection?.inspected_at ? dayTime(inspection.inspected_at) : order.flow_type === "QUICK" ? "Dịch vụ nhanh" : dayTime(firstAt(["INSPECTING"])) },
    q.status === "DRAFT" ? { label: "Lập báo giá", state: "active", note: "Bản nháp" } : { label: "Lập báo giá", state: "done", note: dayTime(q.created_at) },
    response,
    finished ? { label: "Thực hiện", state: "done", note: dayTime(firstAt(["IN_PROGRESS"])) }
      : started ? { label: "Thực hiện", state: "active", note: order.status === "WAITING_FOR_PARTS" ? "Chờ phụ tùng" : "Đang sửa" }
      : { label: "Thực hiện", state: "todo" },
    finished ? { label: "Hoàn thành", state: "done", note: dayTime(firstAt(REPAIR_DONE)) } : { label: "Hoàn thành", state: "todo" },
  ];
}

type Tab = "items" | "history" | "notes";

function QuotationPreview({ row, onChanged }: { row: QuotationListRow; onChanged: () => void }) {
  const { confirm, notify } = useAppFeedback();
  const [tab, setTab] = useState<Tab>("items");
  const [sending, setSending] = useState(false);
  const detail = useAdminQuery(`quotation-order:${row.repair_order_id}`, () => workflowApi.order(row.repair_order_id));
  const order = detail.data;
  const q = order?.quotations?.find(item => item.id === row.id);

  if (!order || !q) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/>
      : order ? <ErrorState compact description="Không tìm thấy báo giá trong phiếu." onRetry={detail.reload}/> : <LoadingState compact label="Đang tải báo giá..."/>}
  </section>;

  const items = q.items ?? [];
  const serviceTotal = items.filter(i => i.item_type !== "PART").reduce((sum, i) => sum + toNumber(i.amount), 0);
  const partTotal = items.filter(i => i.item_type === "PART").reduce((sum, i) => sum + toNumber(i.amount), 0);
  const responded = items.some(i => i.is_approved != null);
  const approvedTotal = items.filter(i => i.is_approved).reduce((sum, i) => sum + toNumber(i.amount), 0);
  const inspection = order.inspections?.[0];
  const notes = [
    q.reason && `Lý do phát sinh: ${q.reason}`,
    inspection?.diagnosis && `Chẩn đoán: ${inspection.diagnosis}`,
    ...(inspection?.recommendations ?? []).filter(r => r.note).map(r => `${r.service?.name || r.part?.name || "Đề xuất"}: ${r.note}`),
  ].filter((n): n is string => !!n);
  const quotationPath = orderStepPath(order.id, q.type === "SUPPLEMENT" ? 3 : 2);

  // Mỗi lần khách xác nhận (tài khoản hoặc mã email tại quầy) là một mục; gom các dòng theo lần xác nhận.
  const responses = items.flatMap(item => (item.responses ?? []).map(r => ({ ...r, label: item.description || `#${item.id}` })));
  const groups = [...responses.reduce((map, r) => map.set(r.confirmation?.id ?? -r.id, [...(map.get(r.confirmation?.id ?? -r.id) ?? []), r]), new Map<number, typeof responses>()).values()]
    .sort((a, b) => (b[0].confirmation?.confirmed_at ?? b[0].created_at ?? "").localeCompare(a[0].confirmation?.confirmed_at ?? a[0].created_at ?? ""));

  async function send() {
    if (!q || !await confirm({ title: "Gửi báo giá cho khách", reference: q.quotation_code, description: `Khách sẽ thấy báo giá ${formatVnd(q.total_amount)} trong tài khoản và duyệt từng hạng mục.`, confirmText: "Gửi báo giá" })) return;
    setSending(true);
    try { await workflowApi.sendQuotation(q.id); notify("Đã gửi báo giá cho khách. Đang chờ khách duyệt.", "success"); onChanged(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setSending(false); }
  }

  const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: "items", label: "Chi tiết báo giá", icon: "layers" },
    { id: "history", label: `Lịch sử phê duyệt${groups.length ? ` (${groups.length})` : ""}`, icon: "clock" },
    { id: "notes", label: "Ghi chú", icon: "file" },
  ];

  return <section className="adv-card adv-ro-detail" aria-label={`Báo giá ${q.quotation_code ?? ""}`}>
    <header className="flex flex-wrap items-start gap-4">
      <span className="adv-ro-doc-icon" aria-hidden="true"><Icon name="receipt" size={30}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-title tracking-wide text-cs-text">Báo giá: {q.quotation_code || `#${q.id}`}
          {q.type === "SUPPLEMENT" && <Badge tone="info" className="ml-2 align-middle">Phát sinh</Badge>}</h2>
        <p className="mt-0.5 flex flex-wrap gap-x-8 gap-y-1 text-small text-cs-text-2">
          <span>Phiếu sửa chữa: <Link className="font-semibold text-cs-text hover:text-cs-accent-text hover:underline" to={orderStepPath(order.id)}>{order.repair_order_code}</Link></span>
          <span>Ngày lập: <span className="tabular-nums">{fullDayTime(q.created_at)}</span></span>
          {q.version && q.version > 1 && <span>Lần báo giá thứ {q.version}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <QuoteBadge status={q.status}/>
        <Dropdown label="Thao tác khác" items={[
          { label: "Làm mới", icon: "refresh", onSelect: detail.reload },
        ]}/>
      </div>
    </header>

    <Track label="Tiến trình báo giá" steps={quotationTrack(order, q)}/>

    <div className="adv-ro-vehicle">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={64}/>
        <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(order.vehicle)}</p>
          <p className="text-small tabular-nums tracking-wide text-cs-text-2">{order.vehicle?.license_plate || "xxx.xx"}</p></div>
      </div>
      <div className="min-w-0 space-y-1.5 text-small">
        <p className="flex items-center gap-2 text-cs-text"><Icon name="user" size={16} className="shrink-0 text-cs-muted"/><span className="truncate font-semibold">{order.customer?.full_name || "—"}</span></p>
        <p className="flex items-center gap-2"><Icon name="phone" size={16} className="shrink-0 text-cs-muted"/>
          {order.customer?.phone ? <a className="tabular-nums text-cs-text hover:text-cs-accent-text hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : <span className="text-cs-muted">—</span>}</p>
      </div>
    </div>

    <div role="tablist" aria-label="Nội dung báo giá" className="adv-ro-tabs adv-ro-tabs-3">
      {TABS.map(t => <button key={t.id} type="button" role="tab" id={`q-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`q-panel-${t.id}`} className="adv-ro-tab" onClick={() => setTab(t.id)}>
        <Icon name={t.icon} size={18}/><span>{t.label}</span>
      </button>)}
    </div>

    <div role="tabpanel" id={`q-panel-${tab}`} aria-labelledby={`q-tab-${tab}`} className="min-h-[180px]">
      {tab === "items" && <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-cs-border">
          <table className="w-full min-w-[640px] text-small">
            <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
              <th className="w-12 px-3 py-2.5 text-center font-semibold">STT</th>
              <th className="px-3 py-2.5 font-semibold">Hạng mục / Phụ tùng</th>
              <th className="px-3 py-2.5 font-semibold">Loại</th>
              <th className="px-3 py-2.5 text-center font-semibold">SL</th>
              <th className="px-3 py-2.5 text-right font-semibold">Đơn giá</th>
              <th className="px-3 py-2.5 text-right font-semibold">Thành tiền</th>
              {responded && <th className="px-3 py-2.5 font-semibold">Khách</th>}
            </tr></thead>
            <tbody className="divide-y divide-cs-border">{items.map((item, index) => <tr key={item.id} className={item.is_approved === false ? "text-cs-muted" : "text-cs-text"}>
              <td className="px-3 py-2.5 text-center tabular-nums">{index + 1}</td>
              <td className="px-3 py-2.5 font-medium">{item.description || "Hạng mục"}</td>
              <td className="px-3 py-2.5">{item.item_type === "PART"
                ? <span className="adv-kind" data-kind="part"><Icon name="box" size={14}/>Phụ tùng</span>
                : <span className="adv-kind" data-kind="service"><Icon name="wrench" size={14}/>Dịch vụ</span>}</td>
              <td className="px-3 py-2.5 text-center tabular-nums">{item.quantity}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{formatVnd(item.unit_price)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{formatVnd(item.amount)}</td>
              {responded && <td className="whitespace-nowrap px-3 py-2.5">{item.is_approved == null ? <span className="text-cs-muted">—</span>
                : item.is_approved ? <Badge tone="success">Đồng ý</Badge> : <Badge tone="danger">Từ chối</Badge>}</td>}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
          <div className="rounded-xl border border-cs-border p-4">
            <p className="flex items-center gap-2 text-small font-semibold text-cs-text"><Icon name="clipboard" size={16} className="text-cs-muted"/>Ghi chú:</p>
            {notes.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-cs-text-2">{notes.slice(0, 4).map(n => <li key={n}>{n}</li>)}</ul>
              : <p className="mt-2 text-small text-cs-muted">Không có ghi chú.</p>}
          </div>
          <dl className="adv-quote-total">
            <div><dt>Tổng tiền dịch vụ</dt><dd>{formatVnd(serviceTotal)}</dd></div>
            <div><dt>Tổng tiền phụ tùng</dt><dd>{formatVnd(partTotal)}</dd></div>
            {toNumber(q.discount_amount) > 0 && <div><dt>Giảm giá</dt><dd>−{formatVnd(q.discount_amount)}</dd></div>}
            <div className="adv-quote-grand"><dt>Tổng chi phí dự kiến</dt><dd>{formatVnd(q.total_amount)}</dd></div>
            {responded && <div><dt>Khách đồng ý</dt><dd className="text-success-fg">{formatVnd(approvedTotal)}</dd></div>}
          </dl>
        </div>
      </div>}

      {tab === "history" && (groups.length ? <ol className="space-y-3">{groups.map(group => {
        const c = group[0].confirmation;
        return <li key={c?.id ?? group[0].id} className="rounded-xl border border-cs-border p-4">
          <p className="flex flex-wrap items-center gap-2 text-small"><Icon name={c?.method === "EMAIL_OTP" ? "mail" : "user"} size={16} className="text-cs-accent-text"/>
            <b className="text-cs-text">{c?.method === "EMAIL_OTP" ? "Khách xác nhận tại quầy bằng mã email" : "Khách tự duyệt trong tài khoản"}</b>
            <span className="tabular-nums text-cs-muted">{c?.confirmed_at || group[0].created_at ? new Date((c?.confirmed_at ?? group[0].created_at)!).toLocaleString("vi-VN") : ""}</span></p>
          <ul className="mt-2 flex flex-wrap gap-2">{group.map(r => <li key={r.id}><Badge tone={r.decision === "APPROVED" ? "success" : "danger"}>{r.decision === "APPROVED" ? "Đồng ý" : "Từ chối"} · {r.label}</Badge></li>)}</ul>
        </li>;
      })}</ol> : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">
        {q.status === "DRAFT" ? "Báo giá chưa gửi khách." : q.status === "SENT" ? "Khách chưa trả lời báo giá." : "Chưa có lần xác nhận nào."}</p>)}

      {tab === "notes" && <dl className="grid gap-4 sm:grid-cols-2">
        {q.reason && <div className="sm:col-span-2"><dt className="text-caption text-cs-muted">Lý do báo giá phát sinh</dt><dd className="mt-1 text-small text-cs-text">{q.reason}</dd></div>}
        <div><dt className="text-caption text-cs-muted">Kết luận chẩn đoán</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{inspection?.diagnosis || "Chưa ghi"}</dd></div>
        <div><dt className="text-caption text-cs-muted">Tình trạng xe</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{inspection?.condition_description || order.initial_condition || "Chưa ghi"}</dd></div>
        {q.valid_until && <div><dt className="text-caption text-cs-muted">Hiệu lực đến</dt><dd className="mt-1 text-small text-cs-text">{new Date(q.valid_until).toLocaleDateString("vi-VN")}</dd></div>}
        {(inspection?.recommendations ?? []).some(r => r.note) && <div className="sm:col-span-2"><dt className="text-caption text-cs-muted">Ghi chú đề xuất</dt>
          <dd><ul className="mt-1 list-disc space-y-1 pl-5 text-small text-cs-text">{inspection!.recommendations!.filter(r => r.note).map(r => <li key={r.id}>{r.service?.name || r.part?.name}: {r.note}</li>)}</ul></dd></div>}
      </dl>}
    </div>

    {q.status === "SENT" && <p className="adv-notice text-small"><Icon name="info" size={18} className="shrink-0 text-cs-accent-text"/>
      <span className="min-w-0 flex-1">Chỉ khách được đồng ý hoặc từ chối từng hạng mục — trong tài khoản, hoặc tại quầy bằng mã gửi email chủ xe.</span></p>}

    <footer className="adv-ro-footer">
      <span className="text-small text-cs-text-2">Tổng chi phí dự kiến: <b className="ml-1 text-xl tabular-nums text-danger">{formatVnd(q.total_amount)}</b></span>
      <span className="cs-btn-row">
        {q.status === "DRAFT" && <>
          <Link className={buttonClass({ variant: "outline" })} to={quotationPath}><Icon name="edit" size={16}/>Điều chỉnh báo giá</Link>
          <button type="button" className="adv-btn-gold" disabled={sending} aria-busy={sending || undefined} onClick={() => void send()}><Icon name="send" size={18}/>{sending ? "Đang gửi..." : "Gửi cho khách"}</button>
        </>}
        {q.status === "SENT" && <Link className="adv-btn-gold" to={quotationPath}><Icon name="mail" size={18}/>Khách xác nhận tại quầy</Link>}
        {q.status === "REJECTED" && order.status === "WAITING_APPROVAL" && <Link className="adv-btn-gold" to={quotationPath}><Icon name="edit" size={18}/>Lập báo giá mới</Link>}
        {["APPROVED", "PARTIALLY_APPROVED"].includes(q.status) && <Link className="adv-btn-gold" to={order.status === "WAITING_APPROVAL" ? quotationPath : stagePath(order) ?? orderStepPath(order.id, 3)}>
          {order.status === "WAITING_APPROVAL" ? "Bắt đầu sửa chữa" : "Xem tiến độ sửa chữa"}<Icon name="arrow-right" size={18}/></Link>}
        {(q.status === "CANCELLED" || (q.status === "REJECTED" && order.status !== "WAITING_APPROVAL")) && <Link className="adv-btn-gold" to={orderStepPath(order.id)}><Icon name="clipboard" size={18}/>Mở phiếu</Link>}
      </span>
    </footer>
  </section>;
}
