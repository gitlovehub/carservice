import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { adminApi, type DashboardData, type Kpi, type ReportData } from "../../services/adminApi";
import { AdminPage, Panel, PanelLink, Progress, StatCard } from "./kit/AdminKit";
import { ComboChart, CompareChart, DonutChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, toneSoft, vnd, type Tone } from "./kit/format";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";

const slotDate = (date: string) => date.slice(0, 10).split("-").reverse().join("/");
const todayLabel = () => {
  const text = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const GROUP_COLORS = [chartColor.brand, chartColor.blue, chartColor.violet, chartColor.yellow, chartColor.grey];
const percent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

/** Kỳ dài theo ngày thì gom mỗi 7 ngày thành một cột (T1, T2…) cho dễ đọc. */
function revenueBuckets(series: ReportData["series"]) {
  const points = series.map(p => ({ key: p.key, label: p.label, title: p.title, revenue: p.service + p.parts, orders: p.orders }));
  if (points.length <= 14) return points;
  const buckets = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    const first = chunk[0], last = chunk[chunk.length - 1];
    buckets.push({
      key: first.key, label: `T${buckets.length + 1} (${Number(first.key.slice(8, 10))}-${Number(last.key.slice(8, 10))})`,
      title: `${slotDate(first.key)} – ${slotDate(last.key)}`,
      revenue: chunk.reduce((sum, p) => sum + p.revenue, 0), orders: chunk.reduce((sum, p) => sum + p.orders, 0),
    });
  }
  return buckets;
}

/**
 * Tổng quan Admin: số liệu điều hành hôm nay (GET /api/admin/dashboard) và phân tích theo kỳ đang chọn (GET /api/admin/reports).
 * Doanh thu trên trang này tính theo giá trị hoá đơn phát hành, cùng cách tính với trang Báo cáo.
 */
export default function AdminDashboard() {
  const period = usePeriod("month");
  const today = useAdminQuery("dashboard:today", signal => adminApi.dashboard("7d", signal));
  const reportQuery = useAdminQuery(`dashboard-report:${JSON.stringify(period.params)}`, signal => adminApi.reports(period.params, signal));
  const data = today.data ?? today.stale;
  const report = reportQuery.data ?? reportQuery.stale;

  return <AdminPage title="Tổng quan" description={`Tình hình hoạt động hôm nay · ${todayLabel()}`} demo={false}
    actions={<PeriodFilter period={period} allowAll={false}/>}>
    {!data
      ? (today.error ? <ErrorState description={today.error} onRetry={today.reload}/> : <LoadingState/>)
      : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="calendar" tone="info" label="Lịch hẹn hôm nay" value={num(data.kpis.appointments_today.value)} delta={data.kpis.appointments_today.delta ?? undefined} deltaLabel="so với hôm qua"/>
          <StatCard icon="car" tone="success" label="Xe đang trong xưởng" value={num(data.kpis.in_shop.value)} delta={data.kpis.in_shop.delta ?? undefined} deltaLabel="so với hôm qua"/>
          <StatCard icon="invoice" tone="warning" label="Hoá đơn chờ thu" value={num(data.kpis.unpaid_invoices.value)} delta={data.kpis.unpaid_invoices.delta ?? undefined} deltaLabel="so với tuần trước" invertDelta/>
          <StatCard icon="coins" tone="brand" label={report ? `Doanh thu · ${report.label}` : "Doanh thu"} value={report ? vnd(report.revenue.total.value) : "—"} delta={report?.revenue.total.delta ?? undefined} deltaLabel="so với kỳ trước"/>
        </div>
        {reportQuery.error && !report
          ? <div className="mt-5"><ErrorState description={reportQuery.error} onRetry={reportQuery.reload}/></div>
          : report ? <PeriodPanels report={report}/> : <div className="mt-5"><LoadingState/></div>}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <UpcomingPanel data={data}/>
          <TasksPanel data={data}/>
        </div>
        {report && <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <EfficiencyPanel report={report}/>
          <LowStockPanel data={data}/>
        </div>}
      </>}
  </AdminPage>;
}

function PeriodPanels({ report }: { report: ReportData }) {
  const buckets = revenueBuckets(report.series);
  const status = report.operations.order_status;
  const statusSegments = [
    { label: "Hoàn thành", value: status.completed, color: chartColor.green },
    { label: "Đang sửa chữa", value: status.in_progress, color: chartColor.blue },
    { label: "Chờ phụ tùng", value: status.waiting_parts, color: chartColor.yellow },
    { label: "Chờ khách duyệt", value: status.waiting_approval, color: chartColor.violet },
    { label: "Tiếp nhận, kiểm tra", value: status.inspecting, color: chartColor.brandSoft },
    { label: "Đã đóng", value: status.closed, color: chartColor.grey },
  ];
  const statusTotal = statusSegments.reduce((sum, s) => sum + s.value, 0);
  const total = report.revenue.total.value;
  const groups = report.revenue_groups.map((g, i) => ({ label: g.name, value: g.revenue, color: GROUP_COLORS[i % GROUP_COLORS.length] }));

  const serviceTotal = report.revenue.service.value;
  const topServices = report.top_services.slice(0, 4);
  const otherServices = Math.max(0, serviceTotal - topServices.reduce((sum, s) => sum + s.revenue, 0));
  const serviceRows = [...topServices.map(s => ({ name: s.name, revenue: s.revenue })), ...(otherServices >= 1 ? [{ name: "Dịch vụ khác", revenue: otherServices }] : [])];

  const ops = report.operations;
  const trends: Array<{ label: string; kpi: Kpi | null; invert?: boolean }> = [
    { label: "Doanh thu", kpi: report.revenue.total },
    { label: "Số phiếu", kpi: ops.received },
    { label: "Thời gian xử lý", kpi: ops.turnaround_hours, invert: true },
    { label: "Đánh giá KH", kpi: ops.satisfaction.average },
  ];

  return <>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Panel title="Doanh thu theo thời gian" icon="chart" subtitle={`Tổng ${vnd(total)} · ${report.label} · theo hoá đơn phát hành`}
        action={<Legend items={[{ label: "Doanh thu", color: chartColor.brand }, { label: "Số phiếu", color: "var(--cs-text)", line: true }]}/>}>
        <ComboChart title="Doanh thu và số phiếu theo thời gian" format={shortVnd} labels={buckets.map(b => b.label)} titles={buckets.map(b => b.title)}
          bars={{ label: "Doanh thu", values: buckets.map(b => b.revenue), color: chartColor.brand }}
          line={{ label: "Số phiếu", values: buckets.map(b => b.orders), color: "var(--cs-text)" }}/>
      </Panel>
      <Panel title="Tình trạng phiếu sửa chữa" icon="clipboard" subtitle="Phiếu nhận trong kỳ" action={<PanelLink to="/admin/repair-orders">Xem phiếu</PanelLink>}>
        {statusTotal === 0 ? <EmptyState compact icon="clipboard" title="Chưa có phiếu trong kỳ"/>
          : <DonutChart title="Phiếu sửa chữa theo tình trạng" segments={statusSegments.filter(s => s.value > 0)} centerValue={statusTotal} centerLabel="phiếu"/>}
      </Panel>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      <Panel title="Doanh thu theo dịch vụ" icon="wrench" action={<PanelLink to="/admin/reports">Báo cáo</PanelLink>}>
        {serviceRows.length === 0 ? <EmptyState compact icon="wrench" title="Chưa có doanh thu dịch vụ"/>
          : <ul className="flex flex-col gap-3.5">{serviceRows.map((s, index) => {
            const share = percent(s.revenue, serviceTotal);
            // Hai dịch vụ khác nhau có thể cùng tên trên hoá đơn cũ → key kèm vị trí (giống trang Báo cáo).
            return <li key={`${s.name}-${index}`} title={vnd(s.revenue)}>
              <span className="mb-1.5 flex items-center justify-between gap-3 text-small">
                <span className="min-w-0 truncate text-cs-text">{s.name}</span>
                <b className="shrink-0 tabular-nums text-cs-text-2">{share}%</b>
              </span>
              <Progress value={share} tone="brand" label={`${s.name}: ${share}%`}/>
            </li>;
          })}</ul>}
      </Panel>
      <Panel title="Doanh thu theo nhóm" icon="layers">
        {total <= 0 ? <EmptyState compact icon="layers" title="Chưa có doanh thu"/>
          : <DonutChart title="Doanh thu theo nhóm" segments={groups} centerValue={<span className="text-[1.35rem]">{shortVnd(total)}</span>} centerLabel="doanh thu" formatValue={shortVnd}/>}
      </Panel>
      <Panel title="Xu hướng hoạt động" icon="trend-up" subtitle="So với kỳ trước" className="lg:col-span-2 2xl:col-span-1">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-2">{trends.map(t => <TrendTile key={t.label} {...t}/>)}</dl>
        <div className="mt-4">
          <Legend items={[{ label: "Kỳ này", color: chartColor.brand }, { label: "Kỳ trước", color: chartColor.grey }]}/>
          <div className="mt-2">
            <CompareChart title="Doanh thu kỳ này so với kỳ trước" format={vnd}
              current={{ label: "Kỳ này", values: report.series.map(p => p.service + p.parts), color: chartColor.brand }}
              previous={{ label: "Kỳ trước", values: report.previous_series.map(p => p.revenue), color: chartColor.grey }}/>
          </div>
        </div>
      </Panel>
    </div>
  </>;
}

function TrendTile({ label, kpi, invert = false }: { label: string; kpi: Kpi | null; invert?: boolean }) {
  const delta = kpi?.delta ?? null;
  const good = delta === null || delta === 0 ? null : invert ? delta < 0 : delta > 0;
  const tone = good === null ? "bg-cs-surface-2 text-cs-muted" : good ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg";
  return <div className={`rounded-control px-3 py-2.5 text-center ${tone}`}>
    <dd className="inline-flex items-center gap-1 text-small font-bold tabular-nums">
      {delta !== null && delta !== 0 && <Icon name={delta > 0 ? "trend-up" : "trend-down"} size={14}/>}
      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${num(delta)}%`}
    </dd>
    <dt className="mt-0.5 truncate text-caption text-cs-text-2">{label}</dt>
  </div>;
}

function UpcomingPanel({ data }: { data: DashboardData }) {
  return <Panel title="Lịch hẹn sắp tới" icon="calendar" action={<PanelLink to="/admin/appointments">Xem tất cả</PanelLink>} bodyClassName="!pt-3">
    {data.upcoming_appointments.length === 0
      ? <EmptyState compact icon="calendar" title="Chưa có lịch hẹn sắp tới"/>
      : <div className="overflow-x-auto rounded-control border border-cs-border">
        <table className="w-full min-w-[720px] text-small">
          <caption className="sr-only">Lịch hẹn sắp tới</caption>
          <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
            {["Thời gian", "Khách hàng", "Xe / Biển số", "Dịch vụ"].map(h => <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Trạng thái</th>
          </tr></thead>
          <tbody className="divide-y divide-cs-border">{data.upcoming_appointments.map(a => <tr key={a.id} className="text-cs-text">
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums"><b>{a.start}</b><span className="text-cs-muted"> - {slotDate(a.date)}</span></td>
            <td className="max-w-40 truncate px-3 py-2.5 font-medium">{a.customer ?? "Khách hàng"}</td>
            <td className="max-w-52 truncate px-3 py-2.5 text-cs-text-2">{a.vehicle || "Xe chưa rõ"} · {a.plate ?? "xxx.xx"}</td>
            <td className="max-w-44 truncate px-3 py-2.5 text-cs-text-2" title={a.services || undefined}>{a.services || "Kiểm tra theo mô tả"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-right"><StatusBadge domain="appointment" status={a.status}/></td>
          </tr>)}</tbody>
        </table>
      </div>}
  </Panel>;
}

function TasksPanel({ data }: { data: DashboardData }) {
  const tasks: Array<{ icon: IconName; tone: Tone; label: string; count: number; to: string }> = [
    { icon: "calendar", tone: "info", label: "Lịch hẹn chờ xác nhận", count: data.attention.pending_appointments, to: "/admin/appointments" },
    { icon: "dollar", tone: "warning", label: "Báo giá chờ khách duyệt", count: data.repair_status.quoting, to: "/admin/repair-orders" },
    { icon: "box", tone: "violet", label: "Xe chờ phụ tùng", count: data.repair_status.waiting_parts, to: "/admin/repair-orders" },
    { icon: "invoice", tone: "danger", label: "Hoá đơn chưa thu đủ", count: data.kpis.unpaid_invoices.value, to: "/admin/invoices" },
    { icon: "star", tone: "neutral", label: "Đánh giá thấp chưa phản hồi", count: data.attention.low_reviews_unreplied, to: "/admin/reviews" },
  ];
  const sorted = [...tasks].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
  return <Panel title="Việc cần xử lý" icon="clipboard" subtitle={tasks.some(t => t.count) ? `${tasks.filter(t => t.count).length} nhóm việc đang chờ` : "Không có việc tồn đọng"} bodyClassName="!pt-3">
    <ul className="flex flex-col gap-2">{sorted.map(task => <li key={task.label}>
      <Link to={task.to} className={`group flex items-center gap-3 rounded-control border border-cs-border px-3 py-2 no-underline transition-colors hover:bg-cs-hover ${task.count ? "" : "opacity-60"}`}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-control ${toneSoft[task.tone]}`}><Icon name={task.icon} size={17}/></span>
        <span className="min-w-0 flex-1 truncate text-small font-semibold text-cs-text">{task.label}</span>
        <b className={`min-w-8 rounded-full px-2 py-0.5 text-center text-small tabular-nums ${task.count ? toneSoft[task.tone] : "text-cs-muted"}`}>{num(task.count)}</b>
        <Icon name="chevron-right" size={16} className="shrink-0 text-cs-muted transition-colors group-hover:text-cs-accent-text"/>
      </Link>
    </li>)}</ul>
  </Panel>;
}

/** Bổ sung cho gara: tiền còn phải thu và các tỷ lệ vận hành của kỳ. */
function EfficiencyPanel({ report }: { report: ReportData }) {
  const { collection, operations: ops } = report;
  const rates: Array<{ label: string; value: number | null; hint: string }> = [
    { label: "Tỷ lệ thu tiền", value: collection.collection_rate, hint: `${vnd(collection.collected)} / ${vnd(collection.billed)}` },
    { label: "Khách đến đúng hẹn", value: ops.appointments.show_rate, hint: `${ops.appointments.arrived} đến · ${ops.appointments.no_show} không đến · ${ops.appointments.cancelled} huỷ` },
    { label: "Báo giá được duyệt", value: ops.quotations.approval_rate, hint: `${ops.quotations.approved}/${ops.quotations.decided} báo giá` },
    { label: "Khách quay lại", value: ops.customers.return_rate, hint: `${ops.customers.returning} cũ · ${ops.customers.new} mới` },
  ];
  const facts: Array<[string, string]> = [
    ["Công nợ trong kỳ", vnd(collection.outstanding)],
    ["Giá trị TB / hoá đơn", vnd(collection.average_invoice.value)],
    ["Xe đã bàn giao", num(ops.delivered)],
    ["Thời gian xử lý TB", ops.turnaround_hours ? `${num(ops.turnaround_hours.value)} giờ` : "—"],
  ];
  return <Panel title="Hiệu quả vận hành" icon="gauge" subtitle={report.label} action={<PanelLink to="/admin/reports">Xem báo cáo</PanelLink>}>
    <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{facts.map(([label, value]) => <div key={label} className="rounded-control bg-cs-surface-2 px-3 py-2.5">
      <dt className="truncate text-caption text-cs-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-bold tabular-nums text-cs-text">{value}</dd>
    </div>)}</dl>
    <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">{rates.map(r => <li key={r.label}>
      <span className="mb-1.5 flex items-center justify-between gap-3 text-small"><span className="text-cs-text">{r.label}</span><b className="tabular-nums text-cs-text">{r.value === null ? "—" : `${num(r.value)}%`}</b></span>
      <Progress value={r.value ?? 0} label={r.label}/>
      <span className="mt-1 block truncate text-caption text-cs-muted">{r.value === null ? "Chưa có dữ liệu trong kỳ" : r.hint}</span>
    </li>)}</ul>
  </Panel>;
}

function LowStockPanel({ data }: { data: DashboardData }) {
  return <Panel title="Phụ tùng sắp hết" icon="box" action={<PanelLink to="/admin/inventory?tab=stock">Kho</PanelLink>}>
    {data.low_stock.length === 0 ? <EmptyState compact icon="box" title="Tồn kho đang đủ"/>
      : <ul className="flex flex-col gap-3.5">{data.low_stock.map(p => <li key={p.part_id}>
        <span className="mb-1.5 flex items-center justify-between gap-3 text-small">
          <span className="min-w-0 truncate text-cs-text" title={p.name ?? undefined}>{p.name ?? p.sku ?? "Phụ tùng"}</span>
          <span className="shrink-0 tabular-nums text-cs-muted"><b className="text-danger-fg">{num(p.quantity)}</b> / {num(p.min_quantity)}</span>
        </span>
        <Progress value={percent(p.quantity, p.min_quantity)} tone="danger" label={`${p.name ?? "Phụ tùng"}: còn ${p.quantity}, tối thiểu ${p.min_quantity}`}/>
      </li>)}</ul>}
  </Panel>;
}
