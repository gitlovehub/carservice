import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { Dropdown } from "../../components/ui/Dropdown";
import { Icon, type IconName } from "../../components/ui/Icon";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { listHandovers, type HandoverListRow } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { dayTime, fullDayTime, vehicleName } from "./advisorListFormat";
import { HandoverSummary } from "./CheckInPanel";
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
  const open = (h: HandoverListRow) => {
    if (window.matchMedia(WIDE).matches) setParam({ handover: String(h.id) });
    else navigate(handoverPath(h));
  };

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
              <Dropdown label="Trạng thái biên bản" items={[{ status: "" as const, label: "Mọi trạng thái" }, ...STATS].map(s => ({ label: s.label, icon: s.status === status ? "check" : undefined, onSelect: () => { setParam({ status: s.status || null, handover: null }); setPage(1); } }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><span className="min-w-0 flex-1 truncate text-left">{status ? STATUS_BADGE[status].label : "Mọi trạng thái"}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
          </div>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ handover: null }); }} placeholder="Mã phiếu, biển số, tên khách, SĐT, người giao…" className="adv-ro-search"/>
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
        {selected ? <HandoverPreview key={selected.id} handover={selected}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một biên bản ở danh sách để xem nhanh.</section>}
      </div>
    </div>
  </main>;
}

function HandoverPreview({ handover: h }: { handover: HandoverListRow }) {
  const confirmation = h.confirmations?.[0];
  const action = h.status === "DRAFT" ? { label: "Tiếp tục lập biên bản", icon: "edit" as const }
    : h.status === "SUBMITTED" ? { label: "Khách xác nhận tại quầy", icon: "mail" as const }
    : { label: "Xem trong phiếu sửa chữa", icon: "clipboard" as const };

  return <section className="adv-card adv-ro-detail" aria-label={`Biên bản ${typeText(h.type).toLowerCase()} ${h.repair_order?.repair_order_code ?? ""}`}>
    <header className="flex flex-wrap items-start gap-4">
      <span className="adv-ro-doc-icon" aria-hidden="true"><Icon name="file" size={30}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-title text-cs-text">Biên bản {typeText(h.type).toLowerCase()}</h2>
        <p className="mt-0.5 flex flex-wrap gap-x-6 gap-y-1 text-small text-cs-text-2">
          <span>Phiếu sửa chữa: <Link className="font-semibold text-cs-text hover:text-cs-accent-text hover:underline" to={orderStepPath(h.repair_order_id)}>{h.repair_order?.repair_order_code ?? `#${h.repair_order_id}`}</Link></span>
          <span>Lập lúc: <span className="tabular-nums">{fullDayTime(h.created_at)}</span>{h.staff?.full_name ? ` · ${h.staff.full_name}` : ""}</span>
        </p>
      </div>
      <Badge tone={STATUS_BADGE[h.status].tone}>{STATUS_BADGE[h.status].label}</Badge>
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

    <HandoverSummary handover={h}/>
    {confirmation && <p className="text-caption text-cs-muted">Khách xác nhận {confirmation.method === "ACCOUNT" ? "trong tài khoản" : "bằng mã email tại quầy"} lúc {fullDayTime(confirmation.confirmed_at)}{confirmation.comment ? ` · "${confirmation.comment}"` : ""}.</p>}
    {h.status === "VOID" && h.void_reason && <p className="adv-notice text-small"><Icon name="info" size={18} className="shrink-0 text-danger"/><span className="min-w-0 flex-1">Lý do hủy: {h.void_reason}</span></p>}
    <PhotoUploader type="handover" id={h.id} readOnly title="Ảnh tình trạng xe"/>

    <footer className="adv-ro-footer justify-end!">
      <Link className="adv-btn-gold" to={handoverPath(h)}><Icon name={action.icon} size={18}/>{action.label}<Icon name="arrow-right" size={18}/></Link>
    </footer>
  </section>;
}
