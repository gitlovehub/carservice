import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown } from "../../components/ui/Dropdown";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Icon, type IconName } from "../../components/ui/Icon";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { formatVnd, listRepairOrders, toNumber, workflowApi, type DeliveryState, type WorkflowOrder } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { OpenOrderButton, PreviewDrawer, Track } from "./advisorListKit";
import { useNarrowDrawer } from "./useNarrowDrawer";
import { dayTime, fullDayTime, vehicleName } from "./advisorListFormat";
import { QualityCheckPanel } from "./QualityCheckPanel";
import { HandoverEditor, HandoverViewModal } from "./CheckInPanel";
import { comparedCheckIn } from "./handoverText";
import { printHandover } from "./handoverPrint";
import { checkoutStage, deliveryState, hasHandover, orderStepPath } from "./repairOrderFlow";
import { errorText } from "./workflowFormat";
import { useStageRedirect } from "./useStageRedirect";
import "./advisorDashboard.css";

/**
 * Kiểm tra & bàn giao (cố vấn) — theo mockup PO 17/11/2026. Xe đã sửa xong đi qua: kiểm tra sau sửa chữa
 * (bắt buộc — PO 17/11) → thu tiền → biên bản trả xe do **chủ xe** xác nhận (tài khoản / mã email, D-008/D-012 —
 * không có ô tick + chữ ký do nhân viên làm thay như mockup) → bàn giao. Điều kiện khớp backend `handOver`.
 */

type Filter = "waiting" | DeliveryState | "handed";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "waiting", label: "Tất cả xe chờ bàn giao" },
  { id: "check", label: "Chờ kiểm tra" },
  { id: "payment", label: "Chờ thanh toán" },
  { id: "checkout", label: "Chờ biên bản trả xe" },
  { id: "ready", label: "Đủ điều kiện bàn giao" },
  { id: "late", label: "Trễ hẹn" },
  { id: "handed_today", label: "Đã bàn giao hôm nay" },
  { id: "handed", label: "Đã bàn giao (tất cả)" },
];
const STATS: Array<{ filter: DeliveryState; label: string; icon: IconName; tone?: "success" | "danger" }> = [
  { filter: "check", label: "Chờ kiểm tra", icon: "clipboard" },
  { filter: "ready", label: "Đủ điều kiện bàn giao", icon: "check", tone: "success" },
  { filter: "handed_today", label: "Đã bàn giao hôm nay", icon: "car" },
  { filter: "late", label: "Bàn giao trễ hẹn", icon: "clock", tone: "danger" },
];
const STATE_BADGE: Record<ReturnType<typeof deliveryState>, { tone: "warning" | "info" | "success" | "neutral"; label: string }> = {
  check: { tone: "warning", label: "Chờ kiểm tra" },
  payment: { tone: "warning", label: "Chờ thanh toán" },
  checkout: { tone: "warning", label: "Chờ lập biên bản" },
  ready: { tone: "success", label: "Đủ điều kiện" },
  done: { tone: "success", label: "Đã bàn giao" },
  other: { tone: "neutral", label: "Chưa sửa xong" },
};
const PER_PAGE = 8;
/** Nhãn bàn giao; ở bước biên bản trả xe thì nói rõ đang nháp hay đã gửi chủ xe. */
function deliveryBadge(order: WorkflowOrder) {
  const state = deliveryState(order);
  if (state !== "checkout") return STATE_BADGE[state];
  const stage = checkoutStage(order);
  return stage === "sent" ? { tone: "info" as const, label: "Chờ khách xác nhận" }
    : stage === "draft" ? { tone: "warning" as const, label: "Chờ hoàn tất biên bản" } : STATE_BADGE.checkout;
}
const StateBadge = ({ order }: { order: WorkflowOrder }) => { const b = deliveryBadge(order); return <Badge tone={b.tone}>{b.label}</Badge>; };

export default function AdvisorDelivery() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find(f => f.id === params.get("filter"))?.id ?? "waiting";
  const selectedParam = Number(params.get("order")) || null;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const query = {
    page, search: term, perPage: PER_PAGE, withDelivery: true,
    statuses: filter === "waiting" ? ["COMPLETED"] : filter === "handed" ? ["HANDED_OVER"] : [],
    ...(filter !== "waiting" && filter !== "handed" ? { delivery: filter } : {}),
    sort: filter === "handed" || filter === "handed_today" ? "created" : "ready", dir: filter === "handed" || filter === "handed_today" ? "desc" : "asc",
  };
  const list = useAdminQuery(`delivery:${JSON.stringify(query)}#${version}`, signal => listRepairOrders(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const selectFilter = (id: Filter) => { setParam({ filter: id === "waiting" ? null : id, order: null }); setPage(1); };
  // Màn rộng: khung bên phải; màn hẹp: ngăn kéo xem nhanh (cùng cách các trang danh sách khác).
  const drawer = useNarrowDrawer();
  const open = (o: WorkflowOrder) => { setParam({ order: String(o.id) }); drawer.show(); };

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Kiểm tra & bàn giao</h1>
    <section className="adv-ro-stats adv-ro-stats-4" aria-label="Thống kê bàn giao">
      {STATS.map(s => <button key={s.filter} type="button" className="adv-card adv-ro-stat" aria-pressed={filter === s.filter} onClick={() => selectFilter(s.filter)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{result?.delivery ? result.delivery[s.filter] : "–"}</span></span>
      </button>)}
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách xe chờ bàn giao">
        <header className="adv-ro-list-head"><h2>Danh sách xe chờ bàn giao</h2></header>
        <div className="space-y-3 p-4">
          <div className="[&>span]:w-full">
            <Dropdown label="Lọc tình trạng bàn giao" align="start" items={FILTERS.map(f => ({ label: f.label, icon: f.id === filter ? "check" : undefined, onSelect: () => selectFilter(f.id) }))}
              trigger={props => <button type="button" {...props} className="adv-ro-range"><Icon name="filter" size={17} className="text-cs-accent-text"/><span className="min-w-0 flex-1 truncate text-left">{FILTERS.find(f => f.id === filter)?.label}</span><Icon name="chevron-down" size={16}/></button>}/>
          </div>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ order: null }); }} placeholder="Mã phiếu, biển số, tên hoặc SĐT…" className="adv-ro-search"/>
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="car" title="Không có xe ở nhóm này" description="Xe xuất hiện ở đây sau khi hoàn thành sửa chữa."/>
            : rows.map(o => { const handed = o.status === "HANDED_OVER"; return <button key={o.id} type="button" className="adv-appt adv-ro-item" aria-current={o.id === selectedId} onClick={() => open(o)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2"><b className="text-small tracking-wide text-cs-text">{o.repair_order_code}</b><StateBadge order={o}/></span>
                <span className="flex items-center gap-3">
                  <VehicleBrandLogo brand={o.vehicle?.model?.brand?.name} size={34}/>
                  <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{vehicleName(o.vehicle)}</b><span className="block text-caption tabular-nums text-cs-text-2">{o.vehicle?.license_plate || "xxx.xx"}</span></span>
                  <span className="shrink-0 text-right text-caption text-cs-text-2"><span className="block">{handed ? "Bàn giao:" : "Dự kiến:"}</span>
                    <b className={`tabular-nums ${!handed && o.estimated_ready_at && new Date(o.estimated_ready_at) < new Date() ? "text-danger" : "text-cs-text"}`}>{dayTime(handed ? o.handed_over_at : o.estimated_ready_at)}</b></span>
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>; })}
        </div>
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ order: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selectedId ? <DeliveryPreview key={`${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một xe ở danh sách.</section>}
      </div>
      {selectedId && <PreviewDrawer open={drawer.open} onClose={drawer.close} title="Kiểm tra & bàn giao xe">
        <DeliveryPreview key={`d-${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/></PreviewDrawer>}
    </div>
  </main>;
}

function Condition({ ok, wait, label, detail, action, view }: { ok: boolean; wait?: boolean; label: string; detail?: ReactNode; action?: ReactNode; view?: ReactNode }) {
  return <li className="flex flex-wrap items-center gap-3 py-2.5">
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? "bg-success-solid text-on-solid" : wait ? "bg-warning-soft text-warning-fg" : "border border-cs-border-strong text-cs-muted"}`} aria-hidden="true">
      <Icon name={ok ? "check" : wait ? "clock" : "minus"} size={13}/></span>
    <span className="min-w-0 flex-1"><b className="block text-small text-cs-text">{label}</b>{detail && <span className="block text-caption text-cs-text-2">{detail}</span>}</span>
    {!ok && action}
    {view}
  </li>;
}

type Tab = "photos" | "notes";

function DeliveryPreview({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { confirm, notify } = useAppFeedback();
  const [tab, setTab] = useState<Tab>("photos");
  const [working, setWorking] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState(false);
  const redirect = useStageRedirect();
  const detail = useAdminQuery(`delivery-order:${id}`, () => workflowApi.order(id));
  const order = detail.data ?? (detail.error ? null : detail.stale);

  if (!order) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải phiếu..."/>}
  </section>;

  const state = deliveryState(order);
  const invoice = order.invoice;
  const paid = invoice?.payments?.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + toNumber(p.amount), 0) ?? 0;
  const checkoutOk = hasHandover(order, "CHECK_OUT");
  const checkoutSent = hasHandover(order, "CHECK_OUT", "SUBMITTED");
  const checkoutDraft = checkoutStage(order) === "draft";
  const handed = order.status === "HANDED_OVER";
  const history = [...(order.status_history ?? [])].reverse();
  const at = (s: string) => history.find(h => h.status === s)?.created_at;
  const step4 = orderStepPath(order.id, 4);
  // Biên bản trả xe gần nhất (bỏ bản đã hủy) — xem bằng cùng modal với chi tiết phiếu / trang Biên bản.
  const checkout = [...(order.handovers ?? [])].reverse().find(h => h.type === "CHECK_OUT" && h.status !== "VOID") ?? null;
  async function print() {
    if (order && checkout && !await printHandover(order, checkout)) notify("Trình duyệt chặn cửa sổ in. Cho phép pop-up với trang này rồi bấm lại.", "error");
  }
  const notes = [order.quality_check?.note && `Kiểm tra sau sửa: ${order.quality_check.note}`,
    ...(order.status_history ?? []).filter(h => h.note && ["COMPLETED", "HANDED_OVER"].includes(h.status ?? "")).map(h => `${dayTime(h.created_at)} · ${h.note}`)].filter((n): n is string => !!n);

  async function handOver() {
    if (!order || !await confirm({ title: "Xác nhận bàn giao xe", reference: order.repair_order_code, description: "Khách đã nhận lại xe. Phiếu kết thúc và khách được mời đánh giá dịch vụ.", confirmText: "Bàn giao xe" })) return;
    setWorking(true);
    try { await workflowApi.transition(order.id, "hand-over"); notify("Đã bàn giao xe cho khách.", "success"); onChanged(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }

  return <section className="adv-card adv-ro-detail" aria-label={`Bàn giao ${order.repair_order_code ?? ""}`}>
    {/* Đầu khung cùng kiểu modal xem biên bản: ô biểu tượng + vạch vàng + ánh nền. */}
    <header className="adv-hv-head relative -mx-5.5 -mt-5.5 flex flex-wrap items-center gap-4 rounded-t-[18px] px-5.5 py-4 max-sm:-mx-4 max-sm:-mt-4 max-sm:px-4">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="car" size={30}/></span>
      <span className="adv-hv-rule" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.45rem] font-bold leading-tight text-cs-text">Kiểm tra & bàn giao xe</h2>
        <p className="mt-1 text-small text-cs-text-2">Phiếu <Link className="adv-hv-code font-semibold text-cs-text hover:text-cs-accent-text hover:underline" to={orderStepPath(order.id)}>{order.repair_order_code}</Link></p>
        <p className="mt-0.5 text-caption text-cs-muted">{handed ? "Đã bàn giao" : "Hoàn thành sửa chữa"} <span className="tabular-nums">{fullDayTime(handed ? order.handed_over_at : order.completed_at ?? at("COMPLETED"))}</span></p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><StateBadge order={order}/><OpenOrderButton id={order.id}/></div>
    </header>

    <div className="adv-ro-vehicle">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={60}/>
        <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(order.vehicle)}</p>
          <p className="text-small tabular-nums tracking-wide text-cs-text-2">{order.vehicle?.license_plate || "xxx.xx"}</p></div>
      </div>
      <div className="min-w-0 space-y-1.5 text-small">
        <p className="flex items-center gap-2 text-cs-text"><Icon name="user" size={16} className="shrink-0 text-cs-muted"/><span className="truncate font-semibold">{order.customer?.full_name || "—"}</span></p>
        <p className="flex items-center gap-2"><Icon name="phone" size={16} className="shrink-0 text-cs-muted"/>
          {order.customer?.phone ? <a className="tabular-nums text-cs-text hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : "—"}</p>
      </div>
    </div>

    <Track label="Tiến trình phiếu" steps={[
      { label: "Tiếp nhận xe", state: "done", note: dayTime(order.received_at) },
      { label: "Báo giá & phê duyệt", state: "done", note: at("WAITING_APPROVAL") ? dayTime(at("WAITING_APPROVAL")) : null },
      { label: "Sửa chữa", state: "done", note: dayTime(order.completed_at ?? at("COMPLETED")) },
      handed ? { label: "Kiểm tra & bàn giao", state: "done", note: dayTime(order.handed_over_at) } : { label: "Kiểm tra & bàn giao", state: "active", note: deliveryBadge(order).label },
      { label: "Hoàn tất", state: handed ? "done" : "todo" },
    ]}/>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* Kiểm tra xong mà chưa thu tiền → tự sang trang Thanh toán. */}
      <QualityCheckPanel key={`${order.quality_checked_at ?? ""}`} order={order} onChanged={async () => { if (!(await redirect(order))) onChanged(); }}/>
      <div className="min-w-0 space-y-4">
        <div role="tablist" aria-label="Nội dung bàn giao" className="adv-ro-tabs adv-ro-tabs-3 grid-cols-2!">
          <button type="button" role="tab" aria-selected={tab === "photos"} className="adv-ro-tab" onClick={() => setTab("photos")}><Icon name="eye" size={18}/><span>Hình ảnh</span></button>
          <button type="button" role="tab" aria-selected={tab === "notes"} className="adv-ro-tab" onClick={() => setTab("notes")}><Icon name="file" size={18}/><span>Ghi chú</span></button>
        </div>
        <div role="tabpanel" className="min-h-[120px]">
          {tab === "photos" ? <PhotoUploader type="repair_order" id={order.id} readOnly={order.status !== "COMPLETED"} title="Ảnh xe sau sửa chữa"/>
            : notes.length ? <ul className="list-disc space-y-1 pl-5 text-small font-medium text-cs-text">{notes.map(n => <li key={n}>{n}</li>)}</ul>
            : <p className="text-small text-cs-muted">Không có ghi chú.</p>}
        </div>

        <section className="rounded-2xl border border-cs-border p-4" aria-label="Điều kiện bàn giao">
          <h3 className="adv-section-title">Xác nhận bàn giao</h3>
          <ul className="mt-1 divide-y divide-cs-border">
            <Condition ok={!!order.quality_checked_at} label="Kiểm tra sau sửa chữa"
              detail={order.quality_checked_at ? `${order.quality_inspector?.employee?.full_name ?? "Cố vấn"} · ${fullDayTime(order.quality_checked_at)}` : handed ? "Không có — xe bàn giao trước khi có bước kiểm tra." : "Tick đủ checklist bên trái rồi lưu."}/>
            <Condition ok={invoice?.status === "PAID"} wait={!!invoice} label="Thanh toán"
              detail={!invoice ? "Chưa lập hoá đơn." : invoice.status === "PAID" ? `Đã thu đủ ${formatVnd(invoice.total_amount)}` : `Đã thu ${formatVnd(paid)} / ${formatVnd(invoice.total_amount)}`}/>
            {order.requires_check_in
              ? <Condition ok={checkoutOk} wait={checkoutSent} label="Chủ xe xác nhận biên bản trả xe"
                  detail={checkoutOk ? "Chủ xe đã xác nhận nhận lại xe." : checkoutSent ? "Đã gửi — chờ chủ xe xác nhận trong tài khoản hoặc bằng mã email tại quầy." : checkoutDraft ? "Đang là bản nháp, chưa gửi chủ xe." : "Chưa lập biên bản trả xe."}
                  view={checkout && <button type="button" className={buttonClass({ variant: "outline", size: "sm" })} onClick={() => setViewing(true)}><Icon name="eye" size={15}/>Xem biên bản</button>}/>
              : <Condition ok label="Biên bản trả xe" detail="Không cần — xe không nhận theo biên bản."/>}
          </ul>
          <p className="mt-2 text-caption text-cs-muted">Chủ xe (hoặc người được uỷ quyền) tự xác nhận nhận xe — nhân viên không tick hay ký thay.</p>
        </section>
      </div>
    </div>

    <footer className="adv-ro-footer justify-end!">
      <span className="cs-btn-row">
        {/* Một nút vàng đồng cho việc còn thiếu: thu tiền (trang Thanh toán) → biên bản trả xe (chi tiết phiếu) → bàn giao. */}
        {state === "payment" && <Link className="adv-btn-gold" to={`/advisor/payments?order=${order.id}`}><Icon name="cash" size={18}/>{invoice ? "Thu tiền" : "Lập hoá đơn & thu tiền"}</Link>}
        {state === "checkout" && checkoutSent && <Link className="adv-btn-gold" to={step4}><Icon name="file" size={18}/>Chủ xe xác nhận biên bản tại quầy</Link>}
        {state === "checkout" && !checkoutSent && <button type="button" className="adv-btn-gold" onClick={() => setEditingCheckout(true)}><Icon name={checkoutDraft ? "edit" : "file"} size={18}/>{checkoutDraft ? "Tiếp tục lập biên bản" : "Lập biên bản trả xe"}</button>}
        {(state === "check" || state === "ready") && <button type="button" className="adv-btn-gold" disabled={working || state !== "ready"}
          title={state !== "ready" ? "Tick đủ checklist kiểm tra sau sửa chữa trước" : undefined} onClick={() => void handOver()}><Icon name="check" size={18}/>Xác nhận bàn giao</button>}
        {handed && <Link className={buttonClass({ variant: "outline" })} to={step4}><Icon name="receipt" size={16}/>Hoá đơn & biên bản</Link>}
      </span>
    </footer>
    {editingCheckout && <HandoverEditor order={order} handover={checkout} type="CHECK_OUT"
      onClose={() => { setEditingCheckout(false); onChanged(); }}
      onChanged={async message => { notify(message, "success"); detail.reload(); }}/>}
    {viewing && checkout && <HandoverViewModal code={order.repair_order_code} handover={checkout} checkIn={comparedCheckIn(checkout, order.handovers)} onClose={() => setViewing(false)} onPrint={() => void print()}
      extra={<Link className={buttonClass({ variant: "outline" })} to={step4}><Icon name="clipboard" size={16}/>Mở trong phiếu</Link>}/>}
  </section>;
}
