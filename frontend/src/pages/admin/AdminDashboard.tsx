import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { adminApi, type DashboardData } from "../../services/adminApi";
import { AdminPage, Panel, PanelLink, Progress, StatCard, Tabs } from "./kit/AdminKit";
import { BarChart, DonutChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";

type Range = DashboardData["range"];
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Tổng quan Admin — số liệu thật từ GET /api/admin/dashboard. */
export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const query = useAdminQuery(`dashboard:${range}`, signal => adminApi.dashboard(range, signal));
  const data = query.data ?? query.stale;

  const content = !data
    ? (query.error ? <ErrorState description={query.error} onRetry={query.reload}/> : <LoadingState/>)
    : <DashboardBody data={data} range={range}/>;

  return <AdminPage title="Tổng quan" description="Tình hình hoạt động của xưởng" demo={false}
    actions={<Tabs label="Khoảng thời gian" variant="segment" value={range} onChange={setRange}
      items={[{ id: "today", label: "Hôm nay" }, { id: "7d", label: "7 ngày" }, { id: "30d", label: "30 ngày" }]}/>}>
    {content}
  </AdminPage>;
}

function DashboardBody({ data, range }: { data: DashboardData; range: Range }) {
  const { kpis } = data;
  const labels = data.revenue_series.map(p => dayLabel(p.date));
  const donut = [
    { label: "Đang kiểm tra", value: data.repair_status.inspecting, color: chartColor.blue },
    { label: "Chờ khách duyệt báo giá", value: data.repair_status.quoting, color: chartColor.yellow },
    { label: "Chờ phụ tùng", value: data.repair_status.waiting_parts, color: chartColor.violet },
    { label: "Đang sửa chữa", value: data.repair_status.in_progress, color: chartColor.green },
    { label: "Chờ thanh toán", value: data.repair_status.waiting_payment, color: chartColor.grey },
  ];
  const openTotal = donut.reduce((s, d) => s + d.value, 0);

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="coins" tone="brand" label="Doanh thu tháng (đã thu)" value={vnd(kpis.revenue_month.value)} delta={kpis.revenue_month.delta ?? undefined} deltaLabel="so với cùng kỳ tháng trước"/>
      <StatCard icon="calendar" tone="info" label="Lịch hẹn hôm nay" value={num(kpis.appointments_today.value)} delta={kpis.appointments_today.delta ?? undefined} deltaLabel="so với hôm qua"/>
      <StatCard icon="car" tone="success" label="Xe đang trong xưởng" value={num(kpis.in_shop.value)} delta={kpis.in_shop.delta ?? undefined} deltaLabel="so với hôm qua"/>
      <StatCard icon="invoice" tone="warning" label="Hoá đơn chưa thanh toán" value={num(kpis.unpaid_invoices.value)} delta={kpis.unpaid_invoices.delta ?? undefined} deltaLabel="so với tuần trước" invertDelta/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Panel title={`Doanh thu ${range === "30d" ? "30 ngày" : "7 ngày"}`} icon="chart"
        action={<Legend items={[{ label: "Doanh thu", color: chartColor.brandSoft }, { label: "Trung bình 7 ngày", color: chartColor.brand, line: true }]}/>}>
        <BarChart title="Biểu đồ doanh thu theo ngày" labels={labels} tickEvery={labels.length > 10 ? 3 : 1} format={shortVnd}
          bars={[{ label: "Doanh thu", values: data.revenue_series.map(p => p.revenue), color: chartColor.brandSoft }]}
          line={{ label: "Trung bình 7 ngày", values: data.revenue_series.map(p => p.avg7), color: chartColor.brand }}
          tooltipTitle={i => `${labels[i]}/${data.revenue_series[i].date.slice(0, 4)}`}/>
      </Panel>
      <Panel title="Phiếu sửa chữa đang mở" icon="clipboard" action={<PanelLink to="/admin/repair-orders">Xem phiếu</PanelLink>}>
        {openTotal === 0
          ? <EmptyState compact icon="clipboard" title="Không có phiếu đang mở"/>
          : <DonutChart title="Phiếu sửa chữa theo trạng thái" segments={donut} centerValue={openTotal} centerLabel="Phiếu"/>}
      </Panel>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <Panel title="Lịch hẹn sắp tới" icon="calendar" action={<PanelLink to="/admin/appointments">Xem tất cả</PanelLink>} bodyClassName="px-2 pb-2 pt-3">
        {data.upcoming_appointments.length === 0
          ? <EmptyState compact icon="calendar" title="Chưa có lịch hẹn sắp tới"/>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-small">
              <caption className="sr-only">Lịch hẹn sắp tới</caption>
              <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
                {["Giờ hẹn", "Khách hàng", "Xe / Biển số", "Dịch vụ", "Trạng thái"].map(h => <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:rounded-l-control last:rounded-r-control">{h}</th>)}
              </tr></thead>
              <tbody>
                {data.upcoming_appointments.map(a => <tr key={a.id} className="border-b border-cs-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-3 text-cs-text">
                    <span className="inline-flex items-center gap-2"><Icon name="clock" size={15} className="text-cs-accent-text"/>{a.start} - {a.end}</span>
                    <span className="block pl-6 text-caption text-cs-muted">{dayLabel(a.date)}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3"><p className="font-semibold text-cs-text">{a.customer ?? "—"}</p>{a.phone && <p className="flex items-center gap-1 text-caption text-cs-muted"><Icon name="phone" size={12}/>{a.phone}</p>}</td>
                  <td className="whitespace-nowrap px-3 py-3"><p className="font-semibold text-cs-text">{a.vehicle || "—"}</p><p className="text-caption text-cs-muted">{a.plate ?? "Chưa có biển"}</p></td>
                  <td className="px-3 py-3 text-cs-text-2">{a.services || "Kiểm tra theo mô tả"}</td>
                  <td className="px-3 py-3"><StatusBadge domain="appointment" status={a.status}/></td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </Panel>
      <Panel title="Cảnh báo tồn kho thấp" icon="alert" action={<PanelLink to="/admin/inventory?tab=stock">Xem kho</PanelLink>} bodyClassName="px-2 pb-2 pt-3">
        {data.low_stock.length === 0
          ? <EmptyState compact icon="box" title="Không có phụ tùng dưới mức tối thiểu"/>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-small">
              <caption className="sr-only">Phụ tùng dưới mức tối thiểu</caption>
              <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
                <th scope="col" className="rounded-l-control px-3 py-2.5 font-semibold">Phụ tùng</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Tồn / Tối thiểu</th>
                <th scope="col" className="rounded-r-control px-3 py-2.5 font-semibold">Mức tồn</th>
              </tr></thead>
              <tbody>
                {data.low_stock.map(p => {
                  const pct = (p.quantity / Math.max(1, p.min_quantity)) * 100;
                  return <tr key={p.part_id} className="border-b border-cs-border last:border-0">
                    <td className="px-3 py-3"><p className="font-semibold text-cs-text">{p.name}</p><p className="text-caption text-cs-muted">{p.sku}</p></td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-cs-text">{num(p.quantity)} / {num(p.min_quantity)}</td>
                    <td className="px-3 py-3"><span className="flex items-center gap-2.5"><Progress value={pct} label={`Mức tồn ${p.name}`}/><b className={`w-10 text-right tabular-nums ${pct < 35 ? "text-danger-fg" : "text-warning-fg"}`}>{Math.round(pct)}%</b></span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
      </Panel>
    </div>
  </>;
}
