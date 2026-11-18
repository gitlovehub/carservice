import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { IconButton } from "../../components/ui/Button";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { Dropdown, type DropdownItem } from "../../components/ui/Dropdown";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import type { StatusTone } from "../../config/status";
import {
  formatVnd, latestQuotation, listRepairOrders, supplementQuotations, toNumber, workflowApi, type WorkflowOrder,
} from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { STEPS, currentStepIndex, nextAction, orderStepPath, stagePath } from "./repairOrderFlow";
import { RangePicker, Track } from "./advisorListKit";
import { dayTime, rangeDates, vehicleName as vehicleNameOf, type Range, type TrackStep } from "./advisorListFormat";
import { formatDateTime } from "./workflowFormat";
import "./advisorDashboard.css";

/**
 * Phiếu sửa chữa (cố vấn) — theo mockup PO 17/11/2026: 4 thẻ số liệu (bấm để lọc), danh sách phiếu dạng thẻ bên trái
 * (khoảng ngày nhận xe, bộ lọc trạng thái / phiếu của tôi, tìm kiếm) và khung xem nhanh phiếu đang chọn bên phải
 * (bước, xe + khách, hạng mục / báo giá / tiến độ / ghi chú, tổng chi phí, nút tới đúng bước của trang chi tiết).
 * Mọi thao tác nghiệp vụ vẫn làm ở trang chi tiết phiếu. Màn hình hẹp: bấm thẻ mở thẳng trang chi tiết.
 * Liên kết cũ `?status=X` / `?group=X` (menu, Tổng quan) tự chọn đúng nhóm.
 */

type Group = "open" | "intake" | "inspect" | "approval" | "quote" | "repair" | "parts" | "deliver" | "finished" | "closed" | "all";
const GROUPS: Array<{ id: Group; label: string; statuses: string[] }> = [
  { id: "open", label: "Đang xử lý", statuses: ["RECEIVED", "INSPECTING", "QUOTING", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED"] },
  { id: "intake", label: "Nhận xe", statuses: ["RECEIVED"] },
  { id: "inspect", label: "Chẩn đoán", statuses: ["INSPECTING"] },
  // Đứng trước "Báo giá" để liên kết `?status=WAITING_APPROVAL` chọn đúng nhóm này.
  { id: "approval", label: "Chờ phê duyệt", statuses: ["WAITING_APPROVAL"] },
  { id: "quote", label: "Báo giá", statuses: ["QUOTING", "WAITING_APPROVAL"] },
  { id: "repair", label: "Đang sửa", statuses: ["IN_PROGRESS"] },
  { id: "parts", label: "Chờ phụ tùng", statuses: ["WAITING_FOR_PARTS"] },
  { id: "deliver", label: "Chờ thanh toán & bàn giao", statuses: ["COMPLETED"] },
  { id: "finished", label: "Hoàn thành", statuses: ["HANDED_OVER"] },
  { id: "closed", label: "Đã đóng", statuses: ["CLOSED"] },
  { id: "all", label: "Tất cả", statuses: [] },
];
const LEGACY_GROUP: Record<string, Group> = { done: "finished" };
const groupOf = (status: string | null): Group => (status && GROUPS.find(g => g.id !== "open" && g.statuses.includes(status))?.id) || "open";

const STATS: Array<{ group: Group; label: string; icon: IconName; tone?: "success" }> = [
  { group: "all", label: "Tổng phiếu", icon: "wrench" },
  { group: "open", label: "Đang xử lý", icon: "refresh" },
  { group: "approval", label: "Chờ phê duyệt", icon: "clock" },
  { group: "finished", label: "Hoàn thành", icon: "check", tone: "success" },
];

const PER_PAGE = 8;
const WIDE = "(min-width: 1280px)";
const vehicleName = (o: WorkflowOrder) => vehicleNameOf(o.vehicle);

export default function AdvisorRepairOrders() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const groupParam = params.get("group");
  const group = GROUPS.find(g => g.id === (LEGACY_GROUP[groupParam ?? ""] ?? groupParam))?.id ?? groupOf(params.get("status"));
  const selectedParam = Number(params.get("order")) || null;
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [range, setRange] = useState<Range>("any");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 350);

  const statuses = GROUPS.find(g => g.id === group)?.statuses ?? [];
  const query = { page, statuses, search: term, mine, sort: "created", dir: "desc", perPage: PER_PAGE, ...rangeDates(range) };
  const list = useAdminQuery(`orders:${JSON.stringify(query)}`, signal => listRepairOrders(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const countOf = (id: Group) => {
    const g = GROUPS.find(item => item.id === id)!;
    return g.statuses.length ? g.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0) : Object.values(counts).reduce((sum, n) => sum + n, 0);
  };
  // Phiếu đang xem: theo `?order=`, mặc định phiếu đầu danh sách.
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const selectGroup = (id: Group) => { setParam({ group: id === "open" ? null : id, status: null, order: null }); setPage(1); };
  const filtersActive = search !== "" || mine || group !== "open" || range !== "any";
  const clearFilters = () => { setSearch(""); setMine(false); setRange("any"); selectGroup("open"); };
  const openOrder = (order: WorkflowOrder) => {
    if (window.matchMedia(WIDE).matches) setParam({ order: String(order.id) });
    else navigate(orderStepPath(order.id));
  };

  const filterItems: DropdownItem[] = [
    ...GROUPS.map(g => ({ label: `${g.label}${result ? ` (${countOf(g.id)})` : ""}`, icon: g.id === group ? "check" as const : undefined, onSelect: () => selectGroup(g.id) })),
    { type: "separator" },
    { label: "Chỉ phiếu của tôi", icon: mine ? "check" : "user", onSelect: () => { setMine(value => !value); setPage(1); setParam({ order: null }); } },
    ...(filtersActive ? [{ label: "Xoá bộ lọc", icon: "x" as const, onSelect: clearFilters }] : []),
  ];

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Phiếu sửa chữa</h1>
    <section className="adv-ro-stats" aria-label="Thống kê phiếu sửa chữa">
      {STATS.map(s => <button key={s.group} type="button" className="adv-card adv-ro-stat" aria-pressed={group === s.group} onClick={() => selectGroup(s.group)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{result ? countOf(s.group) : "–"}</span></span>
      </button>)}
      <Link to="/advisor/reception" className="adv-btn-gold adv-ro-create"><Icon name="plus" size={20}/>Tạo phiếu sửa chữa</Link>
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách phiếu sửa chữa">
        <header className="adv-ro-list-head"><h2>Danh sách phiếu sửa chữa</h2></header>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <RangePicker label="Khoảng ngày nhận xe" anyLabel="Mọi ngày nhận xe" value={range} onChange={r => { setRange(r); setPage(1); setParam({ order: null }); }}/>
            <Dropdown label="Lọc phiếu" items={filterItems}
              trigger={props => <IconButton {...props} icon="filter" label="Lọc theo trạng thái" className={group !== "open" || mine ? "adv-ro-filter-on" : ""}/>}/>
          </div>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); setParam({ order: null }); }} placeholder="Mã phiếu, biển số, tên hoặc SĐT…" className="adv-ro-search"/>
          {(group !== "open" || mine) && <p className="flex flex-wrap items-center gap-2 text-caption text-cs-text-2">
            Đang lọc: <b className="text-cs-text">{GROUPS.find(g => g.id === group)?.label}</b>{mine && <span>· phiếu của tôi</span>}
            <button type="button" className="font-semibold text-cs-accent-text hover:underline" onClick={clearFilters}>Bỏ lọc</button>
          </p>}
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải phiếu..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="clipboard" title={term ? "Không tìm thấy phiếu phù hợp" : "Không có phiếu ở nhóm này"}
                description={term ? "Thử tìm theo biển số, SĐT hoặc mã phiếu khác." : "Phiếu được tạo khi tiếp nhận xe theo lịch hẹn hoặc khách vãng lai."}/>
            : rows.map(o => <button key={o.id} type="button" className="adv-appt adv-ro-item" aria-current={o.id === selectedId} onClick={() => openOrder(o)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2"><b className="text-small tracking-wide text-cs-text">{o.repair_order_code || `Phiếu #${o.id}`}</b><StatusBadge domain="repair" status={o.status}/></span>
                <span className="flex items-center gap-2 text-small text-cs-text"><Icon name="user" size={15} className="shrink-0 text-cs-muted"/><span className="truncate">{o.customer?.full_name || "—"}</span></span>
                <span className="flex items-center gap-2 text-caption text-cs-text-2">
                  <Icon name="car" size={15} className="shrink-0 text-cs-muted"/>
                  <span className="min-w-0 flex-1 truncate">{vehicleName(o)} · <span className="tabular-nums">{o.vehicle?.license_plate || "xxx.xx"}</span></span>
                  <span className="shrink-0 tabular-nums">{dayTime(o.received_at)}</span>
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>)}
        </div>
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ order: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selectedId ? <OrderPreview key={selectedId} id={selectedId}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một phiếu ở danh sách để xem nhanh.</section>}
      </div>
    </div>
  </main>;
}

/* ---------------- Khung xem nhanh ---------------- */

/** 5 chặng hiển thị theo mockup (gộp Chẩn đoán + Báo giá; tách Hoàn thành = đã bàn giao). */
const STAGES: Array<{ label: string; statuses: string[] }> = [
  { label: "Tiếp nhận", statuses: ["RECEIVED"] },
  { label: "Kiểm tra & báo giá", statuses: ["INSPECTING", "QUOTING", "WAITING_APPROVAL"] },
  { label: "Sửa chữa", statuses: ["IN_PROGRESS", "WAITING_FOR_PARTS"] },
  { label: "Thanh toán & bàn giao", statuses: ["COMPLETED"] },
  { label: "Hoàn thành", statuses: ["HANDED_OVER"] },
];
const STAGE_OF_STEP = [0, 1, 1, 2, 3];
const ACTIVE_LABEL: Record<string, string> = {
  RECEIVED: "Đang thực hiện", INSPECTING: "Đang kiểm tra", QUOTING: "Đang lập báo giá", WAITING_APPROVAL: "Chờ khách duyệt",
  IN_PROGRESS: "Đang sửa", WAITING_FOR_PARTS: "Chờ phụ tùng", COMPLETED: "Chờ thu tiền",
};

function StageTrack({ order }: { order: WorkflowOrder }) {
  const closed = order.status === "CLOSED";
  const done = order.status === "HANDED_OVER";
  const current = done ? STAGES.length : closed ? STAGE_OF_STEP[currentStepIndex(order)] : STAGES.findIndex(s => s.statuses.includes(order.status));
  // Lịch sử API trả mới nhất trước → lần đầu vào chặng = mục cuối khớp.
  const history = order.status_history ?? [];
  const enteredAt = (index: number) => index === 0 ? order.received_at
    : [...history].reverse().find(h => h.status && STAGES[index].statuses.includes(h.status))?.created_at;

  return <Track label="Tiến trình phiếu sửa chữa" steps={STAGES.map((stage, index) => {
    const state: TrackStep["state"] = index < current || (done && index === STAGES.length - 1) ? "done" : index === current ? (closed ? "closed" : "active") : "todo";
    const note = state === "active" ? ACTIVE_LABEL[order.status] ?? "Đang thực hiện"
      : state === "closed" ? "Đã đóng phiếu"
      : state === "done" && enteredAt(index) ? dayTime(enteredAt(index)) : null;
    return { label: stage.label, state, note };
  })}/>;
}

type ItemRow = { key: string; name: string; icon: IconName; status: ReactNode; by: string };
const approvalBadge = (approved: boolean | null | undefined, quotationStatus: string): { tone: StatusTone; label: string } => {
  if (approved === true) return { tone: "success", label: "Đã phê duyệt" };
  if (quotationStatus === "SENT") return { tone: "warning", label: "Chờ phê duyệt" };
  if (quotationStatus === "DRAFT") return { tone: "neutral", label: "Bản nháp" };
  return approved === false ? { tone: "danger", label: "Khách từ chối" } : { tone: "neutral", label: "Chưa gửi khách" };
};

/** Hạng mục: công việc (khi đã sửa) → dòng báo giá (chờ / đã duyệt) → đề xuất sau chẩn đoán. */
function itemRows(order: WorkflowOrder): { rows: ItemRow[]; source: "work" | "quote" | "inspection" | "none" } {
  if (order.work_items?.length) return { source: "work", rows: order.work_items.map(w => ({
    key: `w${w.id}`, name: w.service?.name || w.description || "Công việc", icon: "wrench",
    status: <StatusBadge domain="workItem" status={w.status}/>, by: w.technician?.employee?.full_name || "—",
  })) };
  const quotations = [latestQuotation(order), ...supplementQuotations(order)].filter((q): q is NonNullable<typeof q> => !!q && q.status !== "CANCELLED");
  const quoteRows = quotations.flatMap(q => (q.items ?? []).map(item => {
    const badge = approvalBadge(item.is_approved, q.status);
    return { key: `q${item.id}`, name: item.description || "Hạng mục", icon: (item.item_type === "PART" ? "box" : "wrench") as IconName,
      status: <Badge tone={badge.tone}>{badge.label}</Badge>, by: "—" };
  }));
  if (quoteRows.length) return { source: "quote", rows: quoteRows };
  const recommendations = order.inspections?.[0]?.recommendations ?? [];
  if (recommendations.length) return { source: "inspection", rows: recommendations.map(r => ({
    key: `r${r.id}`, name: r.service?.name || r.part?.name || r.note || "Đề xuất", icon: (r.item_type === "PART" ? "box" : "wrench") as IconName,
    status: <Badge tone="info">Đề xuất</Badge>, by: "—",
  })) };
  return { source: "none", rows: [] };
}

type Tab = "items" | "quote" | "progress" | "notes";

function OrderPreview({ id }: { id: number }) {
  const [tab, setTab] = useState<Tab>("items");
  const detail = useAdminQuery(`order-preview:${id}`, () => workflowApi.order(id));
  const order = detail.data ?? (detail.stale?.id === id ? detail.stale : null);

  if (!order) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải phiếu..."/>}
  </section>;

  const items = itemRows(order);
  const next = nextAction(order);
  const quotation = latestQuotation(order);
  const supplementApproved = supplementQuotations(order).flatMap(q => q.items ?? []).filter(i => i.is_approved).reduce((sum, i) => sum + toNumber(i.amount), 0);
  const total = order.invoice ? { label: "Tổng hoá đơn", value: toNumber(order.invoice.total_amount) }
    : quotation ? { label: "Tổng chi phí dự kiến", value: toNumber(quotation.total_amount) + supplementApproved } : null;
  const ctaLabel = next.tone === "wait" ? `Xem bước ${STEPS[next.step].label.toLowerCase()}`
    : ["Lập biên bản nhận xe", "Ghi kết quả kiểm tra", "Xử lý báo giá", "Cập nhật sửa chữa", order.invoice ? "Thu tiền & bàn giao" : "Lập hoá đơn"][next.step];
  const finished = next.tone === "done" || next.tone === "closed";
  const stage = stagePath(order);
  const stagePage = stage?.split("?")[0] ?? "";
  const cta = !stage || stagePage.startsWith("/advisor/service-orders") ? { to: orderStepPath(order.id, next.step), label: ctaLabel }
    : { to: stage, label: ({ "/advisor/reception": "Lập biên bản nhận xe", "/advisor/quotations": "Xem báo giá chờ duyệt", "/advisor/repair-progress": "Cập nhật sửa chữa",
      "/advisor/payments": order.invoice ? "Thu tiền" : "Lập hoá đơn", "/advisor/delivery": "Kiểm tra & bàn giao" } as Record<string, string>)[stagePage] ?? ctaLabel };
  const TABS: Array<{ id: Tab; label: string; icon: IconName; count?: number }> = [
    { id: "items", label: "Hạng mục sửa chữa", icon: "wrench", count: items.rows.length },
    { id: "quote", label: "Báo giá", icon: "layers" },
    { id: "progress", label: "Tiến độ", icon: "clock" },
    { id: "notes", label: "Ghi chú", icon: "file" },
  ];

  return <section className="adv-card adv-ro-detail" aria-label={`Phiếu ${order.repair_order_code ?? ""}`}>
    <header className="flex flex-wrap items-start gap-4">
      <span className="adv-ro-doc-icon" aria-hidden="true"><Icon name="clipboard" size={30}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-title tracking-wide text-cs-text"><Link className="hover:text-cs-accent-text hover:underline" to={orderStepPath(order.id)} title="Mở phiếu đầy đủ">{order.repair_order_code || `Phiếu #${order.id}`}</Link></h2>
        <p className="mt-0.5 text-small text-cs-text-2">{order.appointment?.appointment_code ? `Tạo từ: Lịch hẹn ${order.appointment.appointment_code}` : "Tạo từ: Tiếp nhận khách vãng lai"}
          {order.flow_type === "QUICK" && <span className="ml-2 rounded-full bg-cs-soft px-2 py-0.5 text-caption font-semibold text-cs-on-soft">Dịch vụ nhanh</span>}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge domain="repair" status={order.status}/>
        <Dropdown label="Thao tác khác" items={[
          { label: "Làm mới", icon: "refresh", onSelect: detail.reload },
        ]}/>
      </div>
    </header>

    <StageTrack order={order}/>

    <div className="adv-ro-vehicle">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={64}/>
        <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(order)}</p>
          <p className="text-small tabular-nums tracking-wide text-cs-text-2">{order.vehicle?.license_plate || "xxx.xx"}{order.vehicle?.year ? ` · ${order.vehicle.year}` : ""}</p></div>
      </div>
      <div className="min-w-0 space-y-1.5 text-small">
        <p className="flex items-center gap-2 text-cs-text"><Icon name="user" size={16} className="shrink-0 text-cs-muted"/><span className="truncate font-semibold">{order.customer?.full_name || "—"}</span></p>
        <p className="flex items-center gap-2"><Icon name="phone" size={16} className="shrink-0 text-cs-muted"/>
          {order.customer?.phone ? <a className="tabular-nums text-cs-text hover:text-cs-accent-text hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : <span className="text-cs-muted">—</span>}</p>
      </div>
    </div>

    <div role="tablist" aria-label="Nội dung phiếu" className="adv-ro-tabs">
      {TABS.map(t => <button key={t.id} type="button" role="tab" id={`ro-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`ro-panel-${t.id}`} className="adv-ro-tab" onClick={() => setTab(t.id)}>
        <Icon name={t.icon} size={18}/><span>{t.label}{t.count ? ` (${t.count})` : ""}</span>
      </button>)}
    </div>

    <div role="tabpanel" id={`ro-panel-${tab}`} aria-labelledby={`ro-tab-${tab}`} className="min-h-[180px]">
      {tab === "items" && (items.rows.length ? <div className="overflow-x-auto rounded-xl border border-cs-border">
        <table className="w-full min-w-[520px] text-small">
          <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
            <th className="px-4 py-2.5 font-semibold">Hạng mục công việc</th>
            <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            <th className="px-4 py-2.5 font-semibold">{items.source === "work" ? "Thực hiện bởi" : ""}</th>
          </tr></thead>
          <tbody className="divide-y divide-cs-border">{items.rows.map(r => <tr key={r.key}>
            <td className="px-4 py-3"><span className="flex items-center gap-3 font-medium text-cs-text"><Icon name={r.icon} size={18} className="shrink-0 text-cs-muted"/>{r.name}</span></td>
            <td className="whitespace-nowrap px-4 py-3">{r.status}</td>
            <td className="whitespace-nowrap px-4 py-3 text-cs-text-2">{items.source === "work" ? r.by : ""}</td>
          </tr>)}</tbody>
        </table>
        {items.source === "inspection" && <p className="border-t border-cs-border px-4 py-2 text-caption text-cs-muted">Đề xuất sau chẩn đoán — chưa lập báo giá.</p>}
      </div> : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">Chưa có hạng mục. Hạng mục có sau khi kiểm tra xe và lập báo giá.</p>)}

      {tab === "quote" && (order.quotations?.length ? <ul className="space-y-3">{[...order.quotations].reverse().map(q => <li key={q.id} className="rounded-xl border border-cs-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2"><b className="text-small text-cs-text">{q.quotation_code || `Báo giá #${q.id}`}</b>
            {q.type === "SUPPLEMENT" && <Badge tone="info">Phát sinh</Badge>}<StatusBadge domain="quotation" status={q.status}/></span>
          <b className="tabular-nums text-cs-text">{formatVnd(q.total_amount)}</b>
        </div>
        <ul className="mt-2 space-y-1 text-small text-cs-text-2">{(q.items ?? []).map(i => <li key={i.id} className="flex justify-between gap-3">
          <span className="min-w-0 truncate">{i.description || "Hạng mục"} × {i.quantity}</span><span className="shrink-0 tabular-nums">{formatVnd(i.amount)}</span>
        </li>)}</ul>
      </li>)}</ul> : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">Chưa lập báo giá.</p>)}

      {tab === "progress" && ((order.status_history ?? []).length ? <ol className="space-y-0">{(order.status_history ?? []).map((h, index, all) => <li key={h.id} className="relative pb-4 pl-6 last:pb-0">
        {index < all.length - 1 && <span className="absolute bottom-0 left-[5px] top-3 w-0.5 bg-cs-border" aria-hidden="true"/>}
        <span className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${index === 0 ? "bg-cs-accent" : "bg-cs-border-strong"}`} aria-hidden="true"/>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge domain="repair" status={h.status || ""}/><span className="text-caption tabular-nums text-cs-muted">{formatDateTime(h.created_at)}</span></div>
        {h.note && <p className="mt-1 text-caption text-cs-text-2">{h.note}</p>}
      </li>)}</ol> : <p className="text-small text-cs-muted">Chưa có lịch sử.</p>)}

      {tab === "notes" && <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-caption text-cs-muted">Số km khi nhận</dt><dd className="mt-1 text-small font-semibold text-cs-text">{order.mileage_received == null ? "—" : `${order.mileage_received.toLocaleString("vi-VN")} km`}</dd></div>
        <div><dt className="text-caption text-cs-muted">Tình trạng ban đầu</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{order.initial_condition || "Chưa ghi"}</dd></div>
        {order.note && <div className="sm:col-span-2"><dt className="text-caption text-cs-muted">Ghi chú tiếp nhận</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{order.note}</dd></div>}
        {order.vehicle_change_reason && <div className="sm:col-span-2"><dt className="text-caption text-cs-muted">Lý do đổi xe so với lịch hẹn</dt><dd className="mt-1 text-small text-cs-text">{order.vehicle_change_reason}</dd></div>}
        {order.appointment && <div className="sm:col-span-2"><dt className="mb-2 text-caption text-cs-muted">Khách yêu cầu khi đặt lịch</dt><dd><CustomerRequestSummary request={order.appointment}/></dd></div>}
      </dl>}
    </div>

    {next.text && <p className="adv-notice text-small"><Icon name={next.tone === "wait" ? "clock" : next.tone === "action" ? "arrow-right" : "info"} size={18} className="shrink-0 text-cs-accent-text"/><span className="min-w-0 flex-1">{next.text}</span></p>}

    <footer className="adv-ro-footer">
      <span className="flex min-w-0 items-center gap-3">
        <Icon name="receipt" size={22} className="shrink-0 text-cs-muted"/>
        {total ? <span className="text-small text-cs-text-2">{total.label}: <b className="ml-1 text-xl tabular-nums text-danger">{formatVnd(total.value)}</b></span>
          : <span className="text-small text-cs-muted">Chưa có báo giá</span>}
      </span>
      <span className="cs-btn-row">
        {/* Một nút vàng đồng: tới đúng trang của việc kế tiếp (Tiếp nhận, Báo giá, Tiến độ, Thanh toán, Bàn giao) hoặc chi tiết phiếu. */}
        {finished ? <Link className="adv-btn-gold" to={orderStepPath(order.id)}><Icon name="clipboard" size={18}/>Mở phiếu đầy đủ</Link>
          : <Link className="adv-btn-gold" to={cta.to}>{cta.label}<Icon name="arrow-right" size={18}/></Link>}
      </span>
    </footer>
  </section>;
}

