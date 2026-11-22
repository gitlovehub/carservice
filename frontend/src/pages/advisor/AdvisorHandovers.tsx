import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { buttonClass } from "../../components/ui/buttonClass";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Dropdown } from "../../components/ui/Dropdown";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { listHandovers, workflowApi, type HandoverListRow } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { dayTime, fullDayTime, vehicleName } from "./advisorListFormat";
import { HandoverSummary, HandoverViewModal } from "./CheckInPanel";
import { printHandover } from "./handoverPrint";
import { errorText } from "./workflowFormat";
import { OpenOrderButton } from "./advisorListKit";
import { orderStepPath } from "./repairOrderFlow";
import "./advisorDashboard.css";

/**
 * Biên bản giao nhận (cố vấn, PO 18/11/2026): mọi biên bản nhận xe / trả xe ở một chỗ — lọc theo trạng thái, loại,
 * tìm theo mã phiếu / biển số / khách. Khung xem nhanh chỉ để xem; lập, gửi khách, mã OTP tại quầy vẫn làm trong phiếu
 * (một nút vàng đồng mở đúng biên bản trong phiếu sửa chữa).
 */

type Status = "DRAFT" | "SUBMITTED" | "CONFIRMED" | "VOID";
type TypeFilter = "" | "CHECK_IN" | "CHECK_OUT";
const STATS: Array<{ status: Status; label: string; icon: IconName; tone?: "success" | "danger" }> = [
  { status: "DRAFT", label: "Bản nháp", icon: "edit" },
  { status: "SUBMITTED", label: "Chờ khách xác nhận", icon: "clock" },
  { status: "CONFIRMED", label: "Khách đã xác nhận", icon: "check", tone: "success" },
  { status: "VOID", label: "Đã hủy", icon: "x-circle", tone: "danger" },
];
const STATUS_BADGE: Record<Status, { tone: "neutral" | "warning" | "success" | "danger"; label: string }> = {
  DRAFT: { tone: "neutral", label: "Bản nháp" },
  SUBMITTED: { tone: "warning", label: "Chờ khách xác nhận" },
  CONFIRMED: { tone: "success", label: "Đã xác nhận" },
  VOID: { tone: "danger", label: "Đã hủy" },
};
const TYPES: Array<{ id: TypeFilter; label: string }> = [
  { id: "", label: "Nhận xe & trả xe" }, { id: "CHECK_IN", label: "Biên bản nhận xe" }, { id: "CHECK_OUT", label: "Biên bản trả xe" },
];
const typeText = (type: HandoverListRow["type"]) => type === "CHECK_IN" ? "Nhận xe" : "Trả xe";
const PER_PAGE = 8;
const WIDE = "(min-width: 1280px)";

/** Mở đúng biên bản trong phiếu: nhận xe ở bước Nhận xe, trả xe ở bước Bàn giao. */
const handoverPath = (h: HandoverListRow) => orderStepPath(h.repair_order_id, h.type === "CHECK_IN" ? 0 : 4);

export default function AdvisorHandovers() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (STATS.find(s => s.status === params.get("status"))?.status ?? "") as Status | "";
  const type = (TYPES.find(t => t.id === params.get("type"))?.id ?? "") as TypeFilter;
  const selectedParam = Number(params.get("handover")) || null;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 350);

  const query = { page, status, type, search: term, perPage: PER_PAGE };
  const list = useAdminQuery(`handovers:${JSON.stringify(query)}`, signal => listHandovers(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const total = Object.values(counts).reduce((sum, n) => sum + Number(n), 0);
  const selected = rows.find(r => r.id === selectedParam) ?? (selectedParam ? null : rows[0] ?? null);

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace: true });
  };
  // Bấm thẻ: chọn biên bản (khung xem nhanh màn rộng) + mở modal xem biên bản (cùng modal trang chi tiết phiếu).
  const [viewing, setViewing] = useState<HandoverListRow | null>(null);
  const open = (h: HandoverListRow) => {
    if (window.matchMedia(WIDE).matches) setParam({ handover: String(h.id) });
    setViewing(h);
  };
  const { notify } = useAppFeedback();
  async function print(h: HandoverListRow) {
    try {
      const order = await workflowApi.order(h.repair_order_id);
      if (!await printHandover(order, h)) notify("Trình duyệt chặn cửa sổ in. Cho phép pop-up với trang này rồi bấm lại.", "error");
    } catch (err) { notify(errorText(err), "error"); }
  }

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Biên bản giao nhận</h1>
    <section className="adv-ro-stats adv-ro-stats-4" aria-label="Thống kê biên bản">
      {STATS.map(s => <button key={s.status} type="button" className="adv-card adv-ro-stat" aria-pressed={status === s.status}
        onClick={() => { setParam({ status: status === s.status ? null : s.status, handover: null }); setPage(1); }}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{result ? Number(counts[s.status] ?? 0) : "–"}</span></span>
      </button>)}
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách biên bản">
        <header className="adv-ro-list-head flex items-center gap-3"><h2>Biên bản giao nhận</h2>
          {result && <span className="rounded-full bg-[#f2cf86] px-2.5 py-0.5 text-small font-bold text-[#1e1810]">{status ? result.total : total}</span>}</header>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 [&>span]:w-full">
              <Dropdown label="Loại biên bản" align="start" items={TYPES.map(t => ({ label: t.label, icon: t.id === type ? "check" : undefined, onSelect: () => { setParam({ type: t.id || null, handover: null }); setPage(1); } }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><Icon name="filter" size={17} className="text-cs-accent-text"/><span className="min-w-0 flex-1 truncate text-left">{TYPES.find(t => t.id === type)?.label}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
            <div className="min-w-0 flex-1 [&>span]:w-full">
              <Dropdown label="Trạng thái biên bản" items={[{ status: "" as const, label: "Tất cả" }, ...STATS].map(s => ({ label: s.label, icon: s.status === status ? "check" : undefined, onSelect: () => { setParam({ status: s.status || null, handover: null }); setPage(1); } }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><span className="min-w-0 flex-1 truncate text-left">{status ? STATUS_BADGE[status].label : "Tất cả"}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
          </div>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ handover: null }); }} placeholder="Mã phiếu, biển số, tên xe, tên khách, SĐT…" className="adv-ro-search"/>
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải biên bản..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="file" title={term ? "Không tìm thấy biên bản phù hợp" : "Không có biên bản ở nhóm này"}
                description="Biên bản nhận xe được lập ngay sau khi tạo phiếu; biên bản trả xe lập khi sửa xong."/>
            : rows.map(h => <button key={h.id} type="button" className="adv-appt adv-ro-item" aria-current={h.id === selected?.id} onClick={() => open(h)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-small tracking-wide text-cs-text">{h.repair_order?.repair_order_code ?? `Phiếu #${h.repair_order_id}`}</b>
                  <Badge tone={h.type === "CHECK_IN" ? "info" : "neutral"}>{typeText(h.type)}</Badge>
                  <Badge tone={STATUS_BADGE[h.status].tone}>{STATUS_BADGE[h.status].label}</Badge>
                </span>
                <span className="flex items-center gap-3">
                  <VehicleBrandLogo brand={h.vehicle?.model?.brand?.name} size={34}/>
                  <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{h.repair_order?.customer?.full_name || h.person_name}</b>
                    <span className="block truncate text-caption tabular-nums text-cs-text-2">{vehicleName(h.vehicle)} · {h.vehicle?.license_plate || "xxx.xx"}</span></span>
                  <span className="shrink-0 text-caption tabular-nums text-cs-text-2">{dayTime(h.created_at)}</span>
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>)}
        </div>
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ handover: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selected ? <HandoverPreview key={selected.id} handover={selected} onPrint={() => void print(selected)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một biên bản ở danh sách để xem nhanh.</section>}
      </div>
    </div>
    {viewing && <HandoverViewModal code={viewing.repair_order?.repair_order_code} handover={viewing} onClose={() => setViewing(null)} onPrint={() => void print(viewing)}
      extra={(() => { const a = handoverAction(viewing); return <Button variant="outline" icon={a.icon} onClick={() => navigate(handoverPath(viewing))}>{a.label}</Button>; })()}/>}
  </main>;
}

/** Việc tiếp theo với biên bản — mở đúng bước trong phiếu sửa chữa. */
function handoverAction(h: HandoverListRow) {
  return h.status === "DRAFT" ? { label: "Tiếp tục lập biên bản", icon: "edit" as const }
    : h.status === "SUBMITTED" ? { label: "Khách xác nhận tại quầy", icon: "mail" as const }
    : { label: "Xem trong phiếu sửa chữa", icon: "clipboard" as const };
}

/** Khung xem nhanh — cùng kiểu modal xem biên bản (đầu: ô biểu tượng + vạch + mã · trạng thái; thân: HandoverSummary; chân: việc tiếp theo + In). */
function HandoverPreview({ handover: h, onPrint }: { handover: HandoverListRow; onPrint: () => void }) {
  const action = handoverAction(h);

  return <section className="adv-card adv-ro-detail" aria-label={`Biên bản ${typeText(h.type).toLowerCase()} ${h.repair_order?.repair_order_code ?? ""}`}>
    <header className="adv-hv-head relative -mx-5.5 -mt-5.5 flex flex-wrap items-center gap-4 rounded-t-[18px] px-5.5 py-4 max-sm:-mx-4 max-sm:-mt-4 max-sm:px-4">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="car" size={30}/></span>
      <span className="adv-hv-rule" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.45rem] font-bold leading-tight text-cs-text">Biên bản {typeText(h.type).toLowerCase()}</h2>
        <p className="mt-1 text-small text-cs-text-2">
          Phiếu <Link className="adv-hv-code font-semibold text-cs-text hover:text-cs-accent-text hover:underline" to={orderStepPath(h.repair_order_id)}>{h.repair_order?.repair_order_code ?? `#${h.repair_order_id}`}</Link>
        </p>
        <p className="mt-0.5 text-caption text-cs-muted">Lập lúc <span className="tabular-nums">{fullDayTime(h.created_at)}</span>{h.staff?.full_name ? ` · ${h.staff.full_name}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_BADGE[h.status].tone}>{STATUS_BADGE[h.status].label}</Badge><OpenOrderButton id={h.repair_order_id}/></div>
    </header>

    <div className="adv-ro-vehicle">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={h.vehicle?.model?.brand?.name} size={60}/>
        <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(h.vehicle)}</p>
          <p className="text-small tabular-nums tracking-wide text-cs-text-2">{h.vehicle?.license_plate || "xxx.xx"}</p></div>
      </div>
      <div className="min-w-0 space-y-1.5 text-small">
        <p className="flex items-center gap-2 text-cs-text"><Icon name="user" size={16} className="shrink-0 text-cs-muted"/><span className="truncate font-semibold">{h.repair_order?.customer?.full_name || "—"}</span></p>
        <p className="flex items-center gap-2"><Icon name="phone" size={16} className="shrink-0 text-cs-muted"/>
          {h.repair_order?.customer?.phone ? <a className="tabular-nums text-cs-text hover:text-cs-accent-text hover:underline" href={`tel:${h.repair_order.customer.phone}`}>{h.repair_order.customer.phone}</a> : "—"}</p>
      </div>
    </div>

    {/* Cùng nội dung với modal xem biên bản (gồm xác nhận, lý do hủy, ảnh). */}
    <HandoverSummary handover={h}/>

    <footer className="adv-ro-footer justify-end! gap-3">
      <Link className={`${buttonClass({ variant: "outline" })}`} to={handoverPath(h)}><Icon name={action.icon} size={18}/>{action.label}</Link>
      <button type="button" className="adv-btn-gold" onClick={onPrint}><Icon name="printer" size={18}/>In biên bản</button>
    </footer>
  </section>;
}
