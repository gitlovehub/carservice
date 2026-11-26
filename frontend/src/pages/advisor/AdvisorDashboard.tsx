import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { useAuthSession } from "../../contexts/authSession";
import { advisorDashboardApi, customerUpdatesApi, type AdvisorDashboard as Data, type CustomerUpdate, type DashboardAppointment } from "../../services/workflowService";
import { getUserDisplayName } from "../auth/auth";
import { DonutChart } from "../admin/kit/Charts";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import "./advisorDashboard.css";

/**
 * Tổng quan cố vấn (ADV-10) — theo mockup PO 16/11/2026. Mọi số liệu lấy từ GET /api/advisor/dashboard (số thật):
 * banner chào + lối tắt, 4 chỉ số kèm xu hướng 7 ngày, lịch hẹn hôm nay / sắp tới, phiếu đang mở theo bước (donut),
 * việc cần xử lý, phiếu gần đây.
 */

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayLabel = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${WEEKDAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Đồng hồ chạy theo phút cho banner. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}


/**
 * Xu hướng 7 ngày trong thẻ chỉ số: một chuỗi, đường 2px màu nhạt, hôm nay chấm màu nhấn (có viền nền).
 * Rê chuột từng ngày để xem số (title); giá trị đầy đủ cũng có cho trình đọc màn hình.
 */
function Sparkline({ values, days, label }: { values: number[]; days: string[]; label: string }) {
  const w = 112, h = 44, pad = 5;
  const max = Math.max(1, ...values);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" role="img" aria-label={`${label}: ${values.map((v, i) => `${dayLabel(days[i])} ${v}`).join(", ")}`}>
    <path d={`${path} L${x(last)} ${h - pad} L${x(0)} ${h - pad} Z`} fill="var(--cs-accent)" opacity="0.1"/>
    <path d={path} fill="none" stroke="var(--cs-accent)" strokeOpacity="0.55" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    <circle cx={x(last)} cy={y(values[last])} r="4" fill="var(--cs-accent)" stroke="var(--cs-surface)" strokeWidth="2"/>
    {values.map((v, i) => <rect key={i} x={x(i) - 8} y="0" width="16" height={h} fill="transparent"><title>{`${dayLabel(days[i])}: ${v}`}</title></rect>)}
  </svg>;
}

function Delta({ value, previous }: { value: number; previous: number }) {
  if (previous === 0 && value === 0) return <span className="adv-delta" data-dir="flat">=</span>;
  if (previous === 0) return <span className="adv-delta" data-dir="up"><Icon name="trend-up" size={12}/>+{value}</span>;
  const pct = Math.round(((value - previous) / previous) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return <span className="adv-delta" data-dir={dir}>{dir === "up" ? <Icon name="trend-up" size={12}/> : dir === "down" ? <Icon name="trend-down" size={12}/> : null}{pct > 0 ? "+" : ""}{pct}%</span>;
}

function Kpi({ to, icon, label, value, extra, caption, series, days, seriesLabel }: {
  to: string; icon: IconName; label: string; value: number; extra?: ReactNode; caption: string; series: number[]; days: string[]; seriesLabel: string;
}) {
  return <Link to={to} className="adv-card adv-kpi">
    <div className="flex items-center gap-3">
      <span className="adv-kpi-icon" aria-hidden="true"><Icon name={icon} size={22}/></span>
      <p className="min-w-0 flex-1 text-small font-semibold text-cs-text">{label}</p>
    </div>
    <div className="flex items-end justify-between gap-3">
      <p className="flex flex-wrap items-center gap-2"><span className="adv-kpi-value">{value.toLocaleString("vi-VN")}</span>{extra}</p>
      <Sparkline values={series} days={days} label={seriesLabel}/>
    </div>
    <p className="text-caption text-cs-muted">{caption}</p>
  </Link>;
}

function Panel({ title, icon, action, children, className = "" }: { title: ReactNode; icon?: IconName; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`adv-card min-w-0 overflow-hidden ${className}`}>
    <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
      <h2 className="flex items-center gap-2 text-subheading font-semibold text-cs-text">{icon && <Icon name={icon} size={18} className="text-cs-accent-text"/>}{title}</h2>
      {action}
    </header>
    {children}
  </section>;
}

const seeAll = (to: string) => <Link to={to} className="inline-flex items-center gap-1 text-caption font-semibold text-cs-text-2 hover:text-cs-accent-text">Xem tất cả<Icon name="arrow-right" size={14}/></Link>;

type AppointmentTab = "yesterday" | "today" | "upcoming";
const appointmentTabs = [
  { id: "yesterday", label: "Hôm qua", key: "appointments_yesterday", empty: "Hôm qua không có lịch hẹn" },
  { id: "today", label: "Hôm nay", key: "appointments_today", empty: "Hôm nay chưa có lịch hẹn" },
  { id: "upcoming", label: "Sắp tới", key: "appointments_upcoming", empty: "Chưa có lịch trong 7 ngày tới" },
] as const satisfies ReadonlyArray<{ id: AppointmentTab; label: string; key: keyof Data; empty: string }>;

function AppointmentRows({ items, tab }: { items: DashboardAppointment[]; tab: AppointmentTab }) {
  const navigate = useNavigate();
  const showDate = tab === "upcoming";
  if (!items.length) return <EmptyState compact icon="calendar" title={appointmentTabs.find(t => t.id === tab)!.empty} description="Lịch khách đặt và lịch đặt hộ sẽ hiện ở đây."/>;
  const open = (a: DashboardAppointment) => navigate(`/advisor/reception?appointment=${a.id}`);
  return <ul className="adv-timeline space-y-0.5 px-2 pb-3">
    {items.map(a => <li key={a.id} className="adv-timeline-row" role="link" tabIndex={0} onClick={() => open(a)}
      onKeyDown={(e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(a); } }}>
      <span className="adv-time">{showDate ? <span className="text-center text-[11px] leading-tight"><b className="text-small">{a.time}</b><br/>{dayLabel(a.date)}</span> : a.time}</span>
      <VehicleBrandLogo brand={a.brand} size={36}/>
      <span className="min-w-0"><b className="block truncate text-small text-cs-text">{a.customer || "Khách hàng"}</b>
        <span className="block truncate text-caption text-cs-muted">{a.plate || "xxx.xx"}{a.brand || a.model ? ` · ${[a.brand, a.model].filter(Boolean).join(" ")}` : ""}</span></span>
      <span className="adv-request flex min-w-0 items-center gap-1.5 text-caption text-cs-text-2"><Icon name="wrench" size={14} className="shrink-0 text-cs-accent-text"/><span className="truncate">{a.request || "Chưa chọn dịch vụ"}{a.more ? ` +${a.more}` : ""}</span></span>
      <span className="adv-status"><StatusBadge domain="appointment" status={a.status}/></span>
      <span onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <Dropdown label={`Thao tác lịch ${a.code}`} items={[
          { label: a.status === "PENDING" ? "Xác nhận với khách" : a.status === "CONFIRMED" ? "Tiếp nhận xe" : "Mở lịch hẹn", icon: a.status === "CONFIRMED" ? "car" : "calendar", onSelect: () => open(a) },
          { label: "Danh sách lịch hẹn", icon: "list", onSelect: () => navigate("/advisor/appointments") },
        ]}/>
      </span>
    </li>)}
  </ul>;
}

const UPDATE_TYPES: Record<CustomerUpdate["type"], { label: string; icon: IconName; tone: string }> = {
  BOOKED: { label: "Đặt lịch mới", icon: "plus", tone: "bg-info-soft text-info-fg" },
  RESCHEDULED: { label: "Tự đổi lịch", icon: "refresh", tone: "bg-warning-soft text-warning-fg" },
  CONFIRMED: { label: "Xác nhận qua email", icon: "check", tone: "bg-success-soft text-success-fg" },
  CANCELLED: { label: "Tự hủy lịch", icon: "x", tone: "bg-danger-soft text-danger-fg" },
};
const slotDate = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
/** "vừa xong", "15 phút trước", "3 giờ trước", quá 1 ngày → HH:mm - dd/mm/yyyy. */
function ago(iso: string | null, now: Date) {
  if (!iso) return "";
  const at = new Date(iso);
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")} - ${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}/${at.getFullYear()}`;
}

/** Cập nhật từ khách: khu nhân viên chưa có chuông thông báo — những việc khách tự làm với lịch hẹn hiện ở đây. Bấm dòng → mở lịch. */
function CustomerUpdates({ now }: { now: Date }) {
  const navigate = useNavigate();
  const query = useAdminQuery("advisor-customer-updates", signal => customerUpdatesApi(signal));
  const items = query.data ?? query.stale;
  const open = (u: CustomerUpdate) => navigate(["PENDING", "CONFIRMED"].includes(u.appointment.status)
    ? `/advisor/reception?appointment=${u.appointment.id}` : "/advisor/appointments");
  return <Panel title="Cập nhật từ khách" icon="bell">
    {!items ? (query.error ? <ErrorState compact description={query.error} onRetry={query.reload}/> : <LoadingState compact/>)
      : !items.length ? <EmptyState compact icon="bell" title="Chưa có cập nhật" description="Khi khách đặt, đổi, xác nhận hoặc hủy lịch, thông tin sẽ hiện ở đây."/>
      : <ul className="space-y-0.5 px-2 pb-3">
        {items.map(u => {
          const t = UPDATE_TYPES[u.type];
          const a = u.appointment;
          const when = u.type === "RESCHEDULED" && u.old_date && u.old_time
            ? `${u.old_time} - ${slotDate(u.old_date)} → ${a.appointment_time} - ${slotDate(a.appointment_date)}`
            : `${a.appointment_time} - ${slotDate(a.appointment_date)}`;
          return <li key={u.key}><button type="button" onClick={() => open(u)} className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cs-hover">
            <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${t.tone}`} aria-hidden="true"><Icon name={t.icon} size={15}/></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2"><b className="truncate text-small text-cs-text">{u.customer_name || "Khách hàng"}</b><span className="shrink-0 text-caption text-cs-muted">{ago(u.at, now)}</span></span>
              <span className="block truncate text-caption text-cs-text-2">{t.label} · <span className="tabular-nums">{when}</span></span>
              <span className="block truncate text-caption text-cs-muted">{[a.vehicle, a.license_plate || "xxx.xx"].filter(Boolean).join(" · ")}</span>
            </span>
          </button></li>;
        })}
      </ul>}
  </Panel>;
}

function TodoRow({ to, icon, label, count, highlight }: { to: string; icon: IconName; label: string; count: number; highlight?: boolean }) {
  return <li><Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cs-hover">
    <Icon name={icon} size={18} className="shrink-0 text-cs-accent-text"/>
    <span className="min-w-0 flex-1 truncate text-small text-cs-text">{label}</span>
    <span className={`min-w-8 rounded-full px-2.5 py-0.5 text-center text-small font-semibold ${count > 0 && highlight ? "bg-cs-accent text-cs-accent-contrast" : count > 0 ? "bg-cs-soft text-cs-on-soft" : "bg-cs-surface-2 text-cs-muted"}`}>{count}</span>
  </Link></li>;
}

function DashboardBody({ data, name }: { data: Data; name: string }) {
  const [tab, setTab] = useState<AppointmentTab>("today");
  const now = useNow();
  const { kpis, todo, days } = data;
  const openOrders = data.stages.reduce((sum, s) => sum + s.value, 0);
  const tabClass = (on: boolean) => `relative -mb-px cursor-pointer border-b-2 px-1 pb-2.5 text-small font-semibold transition-colors ${on ? "border-cs-accent text-cs-accent-text" : "border-transparent text-cs-muted hover:text-cs-text"}`;

  return <>
    <section className="adv-hero mb-5" aria-label="Chào mừng">
      <div className="min-w-0 max-w-xl">
        <h1>{greeting(now.getHours())}, {name}!</h1>
        <p className="mt-2 text-small">Cùng quản lý lịch hẹn, tiếp nhận xe và theo dõi tiến độ sửa chữa hôm nay.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/advisor/reception" className="adv-btn-gold"><Icon name="plus" size={18}/>Tiếp nhận xe mới</Link>
          <Link to="/advisor/appointments" className="adv-btn-ghost"><Icon name="calendar" size={18}/>Xem lịch hẹn</Link>
        </div>
      </div>    </section>

    <section aria-label="Chỉ số chính" className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <Kpi to="/advisor/reception" icon="calendar" label="Lịch chờ xác nhận" value={kpis.pending.value}
        caption={`${kpis.pending.series.reduce((a, b) => a + b, 0)} lịch mới đặt trong 7 ngày`} series={kpis.pending.series} days={days} seriesLabel="Lịch mới đặt mỗi ngày"/>
      <Kpi to="/advisor/appointments" icon="clock" label="Lịch hẹn hôm nay" value={kpis.today.value} extra={<Delta value={kpis.today.value} previous={kpis.today.previous}/>}
        caption={`So với hôm qua (${kpis.today.previous} lịch)`} series={kpis.today.series} days={days} seriesLabel="Số lịch hẹn mỗi ngày"/>
      <Kpi to="/advisor/repair-progress" icon="wrench" label="Đang sửa chữa" value={kpis.repairing.value}
        caption={kpis.repairing.waiting_parts ? `Trong đó ${kpis.repairing.waiting_parts} xe chờ phụ tùng` : "Không có xe chờ phụ tùng"} series={kpis.repairing.series} days={days} seriesLabel="Xe bắt đầu sửa mỗi ngày"/>
      <Kpi to="/advisor/service-orders?group=deliver" icon="check" label="Chờ thanh toán & bàn giao" value={kpis.delivery.value}
        caption={`Đã bàn giao hôm nay: ${kpis.delivery.handed_today} xe`} series={kpis.delivery.series} days={days} seriesLabel="Xe bàn giao mỗi ngày"/>
    </section>

    <div className="adv-main">
      <section className="adv-card adv-area-apt min-w-0 overflow-hidden">
        <header className="flex items-end justify-between gap-3 border-b border-cs-border px-5 pt-4">
          <div className="flex gap-5 sm:gap-6" role="tablist" aria-label="Lịch hẹn">
            {appointmentTabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tabClass(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label} <span className="text-cs-muted">({data[t.key].length})</span>
            </button>)}
          </div>
          <span className="pb-2.5">{seeAll("/advisor/appointments")}</span>
        </header>
        <div className="pt-2" role="tabpanel">
          <AppointmentRows tab={tab} items={data[appointmentTabs.find(t => t.id === tab)!.key]}/>
        </div>
      </section>

      <div className="adv-area-side grid min-w-0 gap-5">
        <Panel title="Phiếu đang mở theo bước" action={seeAll("/advisor/service-orders")}>
          <div className="px-5 pb-5 pt-2">
            {openOrders === 0 ? <EmptyState compact icon="clipboard" title="Không có phiếu đang mở"/>
              : <DonutChart size="lg" title="Phiếu sửa chữa đang mở theo bước" centerValue={openOrders} centerLabel="phiếu đang mở"
                segments={data.stages.map((s, i) => ({ label: s.label, value: s.value, color: `var(--adv-stage-${i + 1})` }))}/>}
          </div>
        </Panel>
        <Panel title="Cần xử lý" icon="check" action={seeAll("/advisor/service-orders")}>
          <ul className="space-y-0.5 px-2 pb-3">
            {todo.parts_ready > 0 && <TodoRow to="/advisor/repair-progress?filter=parts" icon="box" label="Phụ tùng đã về đủ — tiếp tục sửa" count={todo.parts_ready} highlight/>}
            <TodoRow to="/advisor/reception" icon="calendar" label="Lịch chờ xác nhận với khách" count={todo.pending_appointments}/>
            <TodoRow to="/advisor/reception" icon="car" label="Đã xác nhận hôm nay, chờ xe đến" count={todo.confirmed_today}/>
            <TodoRow to="/advisor/service-orders?group=intake" icon="clipboard" label="Xe mới nhận — lập biên bản, kiểm tra" count={todo.received}/>
            <TodoRow to="/advisor/service-orders?status=QUOTING" icon="receipt" label="Lập báo giá" count={todo.quoting}/>
            <TodoRow to="/advisor/quotations?status=sent" icon="clock" label="Chờ khách duyệt báo giá" count={todo.waiting_approval}/>
            <TodoRow to="/advisor/repair-progress?filter=parts" icon="box" label="Chờ phụ tùng về" count={todo.waiting_parts}/>
            <TodoRow to="/advisor/service-orders?group=deliver" icon="cash" label="Thu tiền & bàn giao xe" count={todo.ready_delivery}/>
          </ul>
        </Panel>
        <CustomerUpdates now={now}/>
      </div>

      <Panel title="Phiếu sửa chữa gần đây" icon="history" action={seeAll("/advisor/service-orders")} className="adv-area-recent">
        {data.recent_orders.length ? <ul className="space-y-0.5 px-2 pb-3">
          {data.recent_orders.map(o => <li key={o.id}><Link to={`/advisor/service-orders/${o.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-cs-hover">
            <VehicleBrandLogo brand={o.brand} size={32}/>
            <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{o.code}</b><span className="block truncate text-caption text-cs-muted">{o.customer || "Khách hàng"} · {o.plate || "xxx.xx"}</span></span>
            <StatusBadge domain="repair" status={o.status}/>
          </Link></li>)}
        </ul> : <EmptyState compact icon="clipboard" title="Chưa có phiếu sửa chữa"/>}
      </Panel>
    </div>
  </>;
}

export default function AdvisorDashboard() {
  const session = useAuthSession();
  const name = getUserDisplayName(session.status === "authenticated" ? session.account : null);
  const query = useAdminQuery("advisor-dashboard", signal => advisorDashboardApi(signal));
  const data = query.data ?? query.stale;
  return <div className="page-container adv-dash">
    {!data && query.loading ? <LoadingState label="Đang tải tổng quan..."/>
      : !data ? <ErrorState description={query.error || "Không tải được tổng quan."} onRetry={query.reload}/>
      : <DashboardBody data={data} name={name}/>}
  </div>;
}
