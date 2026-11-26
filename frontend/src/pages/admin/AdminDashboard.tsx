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