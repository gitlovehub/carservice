import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge, ServiceStoppedTag, StatusBadge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown, type DropdownItem } from "../../components/ui/Dropdown";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Icon, type IconName } from "../../components/ui/Icon";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { formatVnd, listRepairOrders, openPartRequests, workflowApi, type WorkflowOrder } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { dayTime, fullDayTime, vehicleName } from "./advisorListFormat";
import { OpenOrderButton, PreviewDrawer } from "./advisorListKit";
import { ReceptionNotes } from "./ReceptionFields";
import { useNarrowDrawer } from "./useNarrowDrawer";
import { WaitForPartsModal } from "./PartRequestsPanel";
import { orderStepPath, stagePath } from "./repairOrderFlow";
import { useStageRedirect } from "./useStageRedirect";
import { errorText } from "./workflowFormat";
import "./advisorDashboard.css";

/**
 * Tiến độ sửa chữa (cố vấn) — theo mockup PO 17/11/2026. Thẻ số liệu (đang sửa, chờ phụ tùng, xong sửa hôm nay,
 * dự kiến xong hôm nay — bấm để lọc), danh sách phiếu kèm thanh % công việc đã xong, khung xem nhanh: quy trình,
 * hạng mục đang làm (Bắt đầu / Xong ngay tại chỗ), KTV, thời gian dự kiến còn lại, công việc chi tiết, vật tư,
 * ảnh quá trình sửa, ghi chú; nút Báo thiếu phụ tùng (hộp thoại chung) và Hoàn thành sửa chữa (khi mọi việc đã xong).
 * % = số công việc đã xong / tổng (trừ đã huỷ) — hệ thống không ghi % từng việc.
 */

type Filter = "active" | "repair" | "parts" | "deliver" | "done_today" | "ready_today";
const FILTERS: Array<{ id: Filter; label: string; statuses?: string[]; today?: "completedOn" | "readyOn" }> = [
  { id: "active", label: "Đang sửa & chờ phụ tùng", statuses: ["IN_PROGRESS", "WAITING_FOR_PARTS"] },
  { id: "repair", label: "Đang sửa chữa", statuses: ["IN_PROGRESS"] },
  { id: "parts", label: "Chờ phụ tùng", statuses: ["WAITING_FOR_PARTS"] },
  { id: "deliver", label: "Sửa xong, chờ bàn giao", statuses: ["COMPLETED"] },
  { id: "done_today", label: "Xong sửa hôm nay", today: "completedOn" },
  { id: "ready_today", label: "Dự kiến xong hôm nay", today: "readyOn" },
];
const STATS: Array<{ filter: Filter; label: string; icon: IconName; tone?: "success" }> = [
  { filter: "repair", label: "Đang sửa chữa", icon: "wrench" },
  { filter: "parts", label: "Chờ phụ tùng", icon: "clock" },
  { filter: "done_today", label: "Hoàn thành hôm nay", icon: "check", tone: "success" },
  { filter: "ready_today", label: "Dự kiến xong hôm nay", icon: "calendar" },
];
const PER_PAGE = 8;
const ACTIVE = ["IN_PROGRESS", "WAITING_FOR_PARTS"];
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const percentOf = (done?: number, total?: number) => total ? Math.round(((done ?? 0) / total) * 100) : null;
const overdue = (o: WorkflowOrder) => !!o.estimated_ready_at && ACTIVE.includes(o.status) && new Date(o.estimated_ready_at) < new Date();

function ProgressBar({ percent, label }: { percent: number | null; label: string }) {
  return <span className="flex min-w-0 items-center gap-2">
    <span className="adv-bar" role="progressbar" aria-label={label} aria-valuenow={percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
      <span data-full={percent === 100 || undefined} style={{ width: `${percent ?? 0}%` }}/>
    </span>
    <b className="w-10 shrink-0 text-right text-caption tabular-nums text-cs-text">{percent === null ? "—" : `${percent}%`}</b>
  </span>;
}

export default function AdvisorRepairProgress() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find(f => f.id === params.get("filter"))?.id ?? "active";
  const selectedParam = Number(params.get("order")) || null;
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<"ready" | "created">("ready");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const def = FILTERS.find(f => f.id === filter)!;
  const query = {
    page, statuses: def.statuses ?? [], search: term, mine, perPage: PER_PAGE, withProgress: true,
    sort, dir: sort === "ready" ? "asc" : "desc", ...(def.today ? { [def.today]: todayIso() } : {}),
  };
  const list = useAdminQuery(`progress:${JSON.stringify(query)}#${version}`, signal => listRepairOrders(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const statValue = (f: Filter) => f === "done_today" ? result?.progress?.completed_today
    : f === "ready_today" ? result?.progress?.ready_today
    : (FILTERS.find(x => x.id === f)?.statuses ?? []).reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const selectFilter = (id: Filter) => { setParam({ filter: id === "active" ? null : id, order: null }); setPage(1); };
  // Màn rộng: khung bên phải; màn hẹp: ngăn kéo xem nhanh (cùng cách các trang danh sách khác).
  const drawer = useNarrowDrawer();
  const open = (o: WorkflowOrder) => { setParam({ order: String(o.id) }); drawer.show(); };
  const options: DropdownItem[] = [
    { label: "Dự kiến xong sớm nhất trước", icon: sort === "ready" ? "check" : "clock", onSelect: () => { setSort("ready"); setPage(1); } },
    { label: "Mới nhận xe gần nhất trước", icon: sort === "created" ? "check" : "calendar", onSelect: () => { setSort("created"); setPage(1); } },
    { type: "separator" },
    { label: "Chỉ phiếu của tôi", icon: mine ? "check" : "user", onSelect: () => { setMine(v => !v); setPage(1); setParam({ order: null }); } },
  ];

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Tiến độ sửa chữa</h1>
    <section className="adv-ro-stats adv-ro-stats-4" aria-label="Thống kê tiến độ">
      {STATS.map(s => <button key={s.filter} type="button" className="adv-card adv-ro-stat" aria-pressed={filter === s.filter} onClick={() => selectFilter(s.filter)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{result ? statValue(s.filter) ?? 0 : "–"}</span></span>
      </button>)}
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách phiếu theo tiến độ">
        <header className="adv-ro-list-head flex items-center gap-3"><h2>Danh sách phiếu theo tiến độ</h2>
          {result && <span className="rounded-full bg-[#f2cf86] px-2.5 py-0.5 text-small font-bold text-[#1e1810]">{result.total}</span>}</header>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 [&>span]:w-full">
              <Dropdown label="Lọc theo tiến độ" align="start" items={FILTERS.map(f => ({ label: f.label, icon: f.id === filter ? "check" : undefined, onSelect: () => selectFilter(f.id) }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><Icon name="filter" size={17} className="text-cs-accent-text"/><span className="min-w-0 flex-1 truncate text-left">{def.label}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
            <Dropdown label="Sắp xếp và phụ trách" items={options}
              trigger={props => <IconButton {...props} icon="sort" label="Sắp xếp và phụ trách" className={mine || sort !== "ready" ? "adv-ro-filter-on" : ""}/>}/>
          </div>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); setParam({ order: null }); }} placeholder="Mã phiếu, biển số, tên hoặc SĐT…" className="adv-ro-search"/>
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải phiếu..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="wrench" title={term ? "Không tìm thấy phiếu phù hợp" : "Không có phiếu ở nhóm này"} description="Phiếu có ở đây sau khi khách duyệt báo giá và bắt đầu sửa."/>
            : rows.map(o => <button key={o.id} type="button" className="adv-appt adv-ro-item" aria-current={o.id === selectedId} onClick={() => open(o)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2"><b className="text-small tracking-wide text-cs-text">{o.repair_order_code || `Phiếu #${o.id}`}</b>
                  <StatusBadge domain="repair" status={o.status}/></span>
                <span className="flex items-center gap-2 text-small text-cs-text"><Icon name="user" size={15} className="shrink-0 text-cs-muted"/><span className="min-w-0 flex-1 truncate">{o.customer?.full_name || "—"}</span>
                  {overdue(o) && <span className="shrink-0 text-caption font-semibold text-danger">Quá hạn</span>}</span>
                <span className="grid grid-cols-[minmax(0,1fr)_minmax(110px,0.8fr)] items-center gap-3 text-caption text-cs-text-2">
                  <span className="flex min-w-0 items-center gap-2"><Icon name="car" size={15} className="shrink-0 text-cs-muted"/><span className="truncate">{vehicleName(o.vehicle)} · <span className="tabular-nums">{o.vehicle?.license_plate || "xxx.xx"}</span></span></span>
                  <ProgressBar percent={percentOf(o.work_done, o.work_total)} label={`Tiến độ ${o.repair_order_code ?? ""}`}/>
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
        {selectedId ? <ProgressPreview key={`${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một phiếu ở danh sách để xem tiến độ.</section>}
      </div>
      {selectedId && <PreviewDrawer open={drawer.open} onClose={drawer.close} title="Tiến độ sửa chữa">
        <ProgressPreview key={`d-${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/></PreviewDrawer>}
    </div>
  </main>;
}

/* ---------------- Khung xem nhanh ---------------- */

function remaining(order: WorkflowOrder): { text: string; late: boolean } | null {
  if (!order.estimated_ready_at || !ACTIVE.includes(order.status)) return null;
  const minutes = Math.round((new Date(order.estimated_ready_at).getTime() - Date.now()) / 60000);
  const span = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h >= 24 ? `${Math.floor(h / 24)} ngày ${h % 24} giờ` : h ? `${h} giờ${r ? ` ${r} phút` : ""}` : `${r} phút`; };
  return minutes >= 0 ? { text: `≈ ${span(minutes)}`, late: false } : { text: `Quá hạn ${span(-minutes)}`, late: true };
}

/** Quy trình dọc: ngày vào từng chặng lấy từ lịch sử trạng thái (cũ → mới). */
function ProcessTimeline({ order }: { order: WorkflowOrder }) {
  const history = [...(order.status_history ?? [])].reverse();
  const at = (statuses: string[]) => history.find(h => h.status && statuses.includes(h.status))?.created_at;
  const approvedAt = order.quotations?.map(q => q.customer_response_at).filter(Boolean).sort()[0];
  const flow = ["RECEIVED", "INSPECTING", "QUOTING", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "HANDED_OVER"];
  const reached = flow.indexOf(order.status);
  const steps: Array<{ label: string; date?: string | null; done: boolean; active?: boolean; hint?: string }> = [
    { label: "Tiếp nhận xe", date: order.received_at, done: true },
    { label: "Kiểm tra & báo giá", date: at(["INSPECTING", "QUOTING"]), done: reached >= 3 },
    { label: "Khách phê duyệt", date: approvedAt, done: reached >= 4 },
    { label: order.status === "WAITING_FOR_PARTS" ? "Chờ phụ tùng" : "Đang sửa chữa", date: at(["IN_PROGRESS"]), done: reached >= 6, active: ACTIVE.includes(order.status), hint: "Thực hiện các hạng mục đã duyệt" },
    { label: "Thanh toán & bàn giao", date: at(["COMPLETED"]), done: reached >= 7, active: order.status === "COMPLETED", hint: "Thu tiền, lập biên bản trả xe" },
    { label: "Hoàn thành", date: at(["HANDED_OVER"]), done: reached >= 7 },
  ];
  return <ol className="adv-vtrack" aria-label="Quy trình sửa chữa">
    {steps.map(s => { const state = s.active ? "active" : s.done ? "done" : "todo"; return <li key={s.label} data-state={state} aria-current={state === "active" ? "step" : undefined}>
      <span className="adv-track-dot" aria-hidden="true">{state === "done" ? <Icon name="check" size={14}/> : null}</span>
      <span className="min-w-0"><b>{s.label}</b>
        {state === "active" ? <small>{s.hint}</small> : s.date && state === "done" ? <small className="tabular-nums">{dayTime(s.date)}</small> : null}</span>
    </li>; })}
  </ol>;
}

type Tab = "progress" | "work" | "parts" | "photos" | "notes";

function ProgressPreview({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { confirm, notify } = useAppFeedback();
  const [tab, setTab] = useState<Tab>("progress");
  const [working, setWorking] = useState(false);
  const [waitDialog, setWaitDialog] = useState(false);
  const redirect = useStageRedirect();
  const detail = useAdminQuery(`progress-order:${id}`, () => workflowApi.order(id));
  const order = detail.data;

  if (!order) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải phiếu..."/>}
  </section>;

  const items = (order.work_items ?? []).filter(w => w.status !== "CANCELLED");
  const done = items.filter(w => w.status === "COMPLETED").length;
  const unfinished = items.length - done;
  const percent = percentOf(done, items.length);
  const inRepair = ACTIVE.includes(order.status);
  const left = remaining(order);
  const technicians = [...new Set(items.map(w => w.technician?.employee?.full_name).filter((n): n is string => !!n))];
  const waitingParts = openPartRequests(order);
  const inspection = order.inspections?.[0];
  const notesFromHistory = (order.status_history ?? []).filter(h => h.note).slice(0, 4);

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true);
    try { await task(); notify(message, "success"); onChanged(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }
  async function complete() {
    if (!order || !await confirm({ title: "Hoàn thành sửa chữa", reference: order.repair_order_code, description: "Xác nhận xe đã sửa xong và chạy thử đạt. Sau bước này cố vấn lập hóa đơn để thu tiền.", confirmText: "Hoàn thành" })) return;
    setWorking(true);
    try {
      await workflowApi.transition(order.id, "complete");
      notify("Phiếu đã hoàn thành sửa chữa. Tiếp theo: kiểm tra sau sửa chữa và thu tiền.", "success");
      // Sửa xong → tự sang trang Kiểm tra & bàn giao.
      if (!(await redirect(order))) onChanged();
    } catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }

  const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: "progress", label: "Tiến độ xử lý", icon: "chart" },
    { id: "work", label: "Công việc", icon: "list" },
    { id: "parts", label: "Phụ tùng", icon: "box" },
    { id: "photos", label: "Hình ảnh", icon: "eye" },
    { id: "notes", label: "Ghi chú", icon: "file" },
  ];
  const workActions = (w: (typeof items)[number]): ReactNode => !inRepair ? null
    : w.status === "PENDING" ? <Button size="sm" variant="secondary" disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(w.id, "IN_PROGRESS"), "Đã bắt đầu công việc.")}>Bắt đầu</Button>
    : w.status === "IN_PROGRESS" ? <Button size="sm" variant="success" icon="check" disabled={working} onClick={() => void run(() => workflowApi.updateWorkItem(w.id, "COMPLETED"), "Đã hoàn thành công việc.")}>Xong</Button>
    : null;

  return <section className="adv-card adv-ro-detail" aria-label={`Tiến độ phiếu ${order.repair_order_code ?? ""}`}>
    {/* Đầu khung cùng kiểu các trang khác (Phiếu, Báo giá, Thanh toán, Biên bản): ô biểu tượng + vạch vàng + ánh nền. */}
    <header className="adv-hv-head relative -mx-5.5 -mt-5.5 flex flex-wrap items-center gap-4 rounded-t-[18px] px-5.5 py-4 max-sm:-mx-4 max-sm:-mt-4 max-sm:px-4">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="wrench" size={30}/></span>
      <span className="adv-hv-rule" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.45rem] font-bold leading-tight tracking-wide text-cs-text"><Link className="adv-hv-code hover:text-cs-accent-text hover:underline" to={orderStepPath(order.id)} title="Mở phiếu đầy đủ">{order.repair_order_code || `Phiếu #${order.id}`}</Link></h2>
        <p className="mt-1 text-small text-cs-text-2">Khách hàng <b className="text-cs-text">{order.customer?.full_name || "—"}</b></p>
        <p className="mt-0.5 text-caption text-cs-muted">{order.appointment?.appointment_code ? `Tạo từ lịch hẹn ${order.appointment.appointment_code}` : "Tạo từ khách vãng lai"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge domain="repair" status={order.status}/><OpenOrderButton id={order.id}/></div>
    </header>

    <div className="adv-prog-top">
      <div className="adv-ro-vehicle !grid-cols-1">
        <div className="flex min-w-0 items-center gap-4">
          <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={60}/>
          <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(order.vehicle)}</p>
            <p className="text-small tabular-nums tracking-wide text-cs-text-2">{order.vehicle?.license_plate || "xxx.xx"}</p></div>
        </div>
      </div>
      <div className="adv-ro-vehicle !grid-cols-1">
        <p className="flex items-center gap-3"><Icon name="calendar" size={22} className="shrink-0 text-cs-muted"/>
          <span><span className="block text-caption text-cs-muted">Dự kiến xong</span>
            <b className={`tabular-nums ${left?.late ? "text-danger" : "text-cs-text"}`}>{order.estimated_ready_at ? fullDayTime(order.estimated_ready_at) : "Chưa có"}</b></span></p>
      </div>
      <div className="adv-ro-vehicle !grid-cols-1">
        <StatusBadge domain="repair" status={order.status}/>
        <ProgressBar percent={percent} label="Tiến độ công việc"/>
      </div>
    </div>

    <div role="tablist" aria-label="Nội dung tiến độ" className="adv-ro-tabs adv-ro-tabs-5">
      {TABS.map(t => <button key={t.id} type="button" role="tab" id={`p-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`p-panel-${t.id}`} className="adv-ro-tab" onClick={() => setTab(t.id)}>
        <Icon name={t.icon} size={18}/><span>{t.label}</span>
      </button>)}
    </div>

    <div role="tabpanel" id={`p-panel-${tab}`} aria-labelledby={`p-tab-${tab}`} className="min-h-[200px]">
      {tab === "progress" && <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]">
        <div><h3 className="adv-section-title mb-3">Quy trình sửa chữa</h3><ProcessTimeline order={order}/></div>
        <div className="space-y-4">
          <div className="rounded-xl border border-cs-border">
            <h3 className="adv-section-title border-b border-cs-border bg-cs-surface-2 px-4 py-3">Hạng mục công việc ({done}/{items.length} xong)</h3>
            {items.length ? <ul className="divide-y divide-cs-border">{items.map(w => <li key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Icon name={w.status === "COMPLETED" ? "check" : w.status === "IN_PROGRESS" ? "refresh" : "clock"} size={18} className={w.status === "COMPLETED" ? "text-success-fg" : "text-cs-muted"}/>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-medium text-cs-text">{w.service?.name || w.description || `Công việc #${w.id}`}<ServiceStoppedTag status={w.service?.status}/></span>
                {w.technician?.employee?.full_name && <span className="text-caption text-cs-muted">{w.technician.employee.full_name}</span>}</span>
              <StatusBadge domain="workItem" status={w.status}/>
              {workActions(w)}
            </li>)}</ul> : <p className="px-4 py-6 text-small text-cs-muted">Chưa có công việc. Công việc được tạo khi bắt đầu sửa từ các dịch vụ khách đã duyệt.</p>}
          </div>
          <div className="adv-ro-vehicle sm:!grid-cols-2">
            <p className="flex items-center gap-3"><span className="adv-avatar" aria-hidden="true"><Icon name="user" size={18}/></span>
              <span className="min-w-0"><span className="block text-caption text-cs-muted">Kỹ thuật viên phụ trách</span><b className="block truncate text-cs-text">{technicians.length ? technicians.join(", ") : "Chưa ghi"}</b></span></p>
            <p className="flex items-center gap-3"><Icon name="clock" size={26} className="shrink-0 text-cs-muted"/>
              <span><span className="block text-caption text-cs-muted">Thời gian dự kiến còn lại</span><b className={left?.late ? "text-danger" : "text-cs-text"}>{left?.text ?? "—"}</b></span></p>
          </div>
        </div>
      </div>}

      {tab === "work" && (items.length ? <div className="overflow-x-auto rounded-xl border border-cs-border">
        <table className="w-full min-w-[620px] text-small">
          <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
            <th className="px-3 py-2.5 font-semibold">Công việc</th><th className="px-3 py-2.5 font-semibold">Kỹ thuật viên</th>
            <th className="px-3 py-2.5 font-semibold">Bắt đầu</th><th className="px-3 py-2.5 font-semibold">Xong</th>
            <th className="px-3 py-2.5 text-right font-semibold">Phút chuẩn</th><th className="px-3 py-2.5 font-semibold">Trạng thái</th>
          </tr></thead>
          <tbody className="divide-y divide-cs-border">{items.map(w => <tr key={w.id} className="text-cs-text">
            <td className="px-3 py-2.5 font-medium"><span className="flex flex-wrap items-center gap-2">{w.service?.name || w.description}<ServiceStoppedTag status={w.service?.status}/></span></td>
            <td className="px-3 py-2.5 text-cs-text-2">{w.technician?.employee?.full_name || "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-cs-text-2">{w.started_at ? dayTime(w.started_at) : "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-cs-text-2">{w.completed_at ? dayTime(w.completed_at) : "—"}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{w.standard_minutes ?? "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5"><StatusBadge domain="workItem" status={w.status}/></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">Chưa có công việc.</p>)}

      {tab === "parts" && <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-cs-border p-4">
          <h3 className="adv-section-title"><Icon name="box" size={16}/>Đã xuất kho cho phiếu</h3>
          {order.used_parts?.length ? <ul className="mt-2 divide-y divide-cs-border text-small">{order.used_parts.map(p => <li key={p.id} className="flex justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-cs-text">{p.part?.name || `Phụ tùng #${p.part_id}`} × {p.quantity}</span><span className="shrink-0 tabular-nums text-cs-text-2">{formatVnd(p.unit_price)}</span>
          </li>)}</ul> : <p className="mt-2 text-small text-cs-muted">Chưa xuất phụ tùng nào.</p>}
        </div>
        <div className="rounded-xl border border-cs-border p-4">
          <h3 className="adv-section-title"><Icon name="clock" size={16}/>Phụ tùng đang chờ ({waitingParts.length})</h3>
          {(order.part_requests ?? []).length ? <ul className="mt-2 divide-y divide-cs-border text-small">{(order.part_requests ?? []).map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0 text-cs-text">{r.part?.name || `Phụ tùng #${r.part_id}`} × {r.quantity}</span>
            <Badge tone={r.status === "RECEIVED" ? "success" : r.status === "CANCELLED" ? "neutral" : "warning"}>
              {r.status === "REQUESTED" ? "Chờ kho đặt" : r.status === "ORDERED" ? `Đã đặt${r.eta_date ? ` · về ${new Date(r.eta_date).toLocaleDateString("vi-VN")}` : ""}` : r.status === "RECEIVED" ? "Đã về" : "Đã huỷ"}</Badge>
          </li>)}</ul> : <p className="mt-2 text-small text-cs-muted">Không có phụ tùng phải đặt.</p>}
        </div>
      </div>}

      {tab === "photos" && <div className="space-y-4">
        <PhotoUploader type="repair_order" id={order.id} readOnly={!inRepair} title="Ảnh quá trình sửa chữa"/>
        {(order.handovers ?? []).filter(h => h.type === "CHECK_IN" && h.status !== "DRAFT" && h.status !== "VOID").map(h => <PhotoUploader key={h.id} type="handover" id={h.id} readOnly title="Ảnh tình trạng xe lúc nhận"/>)}
      </div>}

      {tab === "notes" && <div className="space-y-4">
        <ReceptionNotes order={order}/>
        <dl className="grid gap-4">
          <div><dt className="text-caption text-cs-muted">Kết quả kiểm tra</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{inspection?.condition_description || "Chưa ghi"}</dd></div>
          <div><dt className="text-caption text-cs-muted">Kết luận chẩn đoán</dt><dd className="mt-1 whitespace-pre-wrap text-small text-cs-text">{inspection?.diagnosis || "Chưa ghi"}</dd></div>
          {notesFromHistory.length > 0 && <div><dt className="text-caption text-cs-muted">Ghi chú khi đổi trạng thái</dt>
            <dd><ul className="mt-1 space-y-1.5">{notesFromHistory.map(h => <li key={h.id} className="flex flex-wrap items-center gap-2 text-small text-cs-text"><StatusBadge domain="repair" status={h.status || ""}/><span className="tabular-nums text-caption text-cs-muted">{dayTime(h.created_at)}</span><span className="font-medium">{h.note}</span></li>)}</ul></dd></div>}
        </dl>
      </div>}
    </div>

    <footer className="adv-ro-footer !justify-end">
      <span className="cs-btn-row">
        {order.status === "IN_PROGRESS" && <>
          <Link className={buttonClass({ variant: "outline" })} to={orderStepPath(order.id, 3)}><Icon name="edit" size={16}/>Cập nhật tiến độ</Link>
          <Button variant="outline" icon="box" disabled={working} onClick={() => setWaitDialog(true)}>Báo thiếu phụ tùng</Button>
          <button type="button" className="adv-btn-gold" disabled={working || unfinished > 0}
            title={unfinished > 0 ? `Còn ${unfinished} công việc chưa xong` : undefined} onClick={() => void complete()}><Icon name="check" size={18}/>Hoàn thành sửa chữa</button>
        </>}
        {order.status === "WAITING_FOR_PARTS" && <Link className="adv-btn-gold" to={orderStepPath(order.id, 3)}>Tiếp tục sửa chữa<Icon name="arrow-right" size={18}/></Link>}
        {order.status === "COMPLETED" && <Link className="adv-btn-gold" to={stagePath(order) ?? `/advisor/delivery?order=${order.id}`}>Kiểm tra & bàn giao<Icon name="arrow-right" size={18}/></Link>}
        {!["IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED"].includes(order.status) && <Link className="adv-btn-gold" to={orderStepPath(order.id, 3)}>Xem chi tiết phiếu<Icon name="arrow-right" size={18}/></Link>}
      </span>
    </footer>
    {order.status === "IN_PROGRESS" && unfinished > 0 && <p className="-mt-2 text-right text-caption text-cs-muted">Còn {unfinished} công việc chưa xong nên chưa thể hoàn thành phiếu.</p>}
    {waitDialog && <WaitForPartsModal order={order} open onClose={() => setWaitDialog(false)} onDone={async message => { notify(message, "success"); onChanged(); }}/>}
  </section>;
}
