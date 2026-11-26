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