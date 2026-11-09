import { useState } from "react";
import { IconButton } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { demoParts } from "../../mocks/admin/catalog";
import { demoRepairOrders, movingAverage, revenue30d, upcomingAppointments } from "../../mocks/admin/operations";
import { AdminPage, Panel, PanelLink, Progress, StatCard, Tabs } from "./kit/AdminKit";
import { BarChart, DonutChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd } from "./kit/format";

type Range = "today" | "7d" | "30d";

/** Tổng quan Admin — DEMO: số liệu lấy từ src/mocks/admin, chờ API thống kê. */
export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const days = range === "today" ? 1 : range === "7d" ? 7 : 31;
  const labels = revenue30d.labels.slice(-Math.max(days, 7));
  const values = revenue30d.values.slice(-Math.max(days, 7));
  const avg = movingAverage(revenue30d.values).slice(-Math.max(days, 7));

  const statusCount = (statuses: string[]) => demoRepairOrders.filter(o => statuses.includes(o.status)).length;
  const donut = [
    { label: "Đang kiểm tra", value: statusCount(["RECEIVED", "INSPECTING"]) + 4, color: chartColor.blue },
    { label: "Chờ khách duyệt báo giá", value: statusCount(["QUOTING", "WAITING_APPROVAL"]) + 6, color: chartColor.yellow },
    { label: "Chờ phụ tùng", value: statusCount(["WAITING_FOR_PARTS"]) + 3, color: chartColor.violet },
    { label: "Đang sửa chữa", value: statusCount(["IN_PROGRESS"]) + 13, color: chartColor.green },
    { label: "Chờ thanh toán", value: statusCount(["COMPLETED"]) + 6, color: chartColor.grey },
  ];
  const lowStock = demoParts.filter(p => p.stock < p.min).sort((a, b) => a.stock / a.min - b.stock / b.min).slice(0, 5);

  return <AdminPage title="Tổng quan" description="Tình hình hoạt động của xưởng hôm nay"
    actions={<Tabs label="Khoảng thời gian" variant="segment" value={range} onChange={setRange}
      items={[{ id: "today", label: "Hôm nay" }, { id: "7d", label: "7 ngày" }, { id: "30d", label: "30 ngày" }]}/>}>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="coins" tone="brand" label="Doanh thu tháng" value={vnd(186_400_000)} delta={12} deltaLabel="so với tháng trước"/>
      <StatCard icon="calendar" tone="info" label="Lịch hẹn hôm nay" value="18" delta={20} deltaLabel="so với hôm qua"/>
      <StatCard icon="car" tone="success" label="Xe đang trong xưởng" value="11" delta={10} deltaLabel="so với hôm qua"/>
      <StatCard icon="invoice" tone="warning" label="Hoá đơn chưa thanh toán" value="5" delta={-17} deltaLabel="so với tuần trước" invertDelta/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Panel title={`Doanh thu ${range === "today" ? "7 ngày gần nhất" : range === "7d" ? "7 ngày" : "30 ngày"}`} icon="chart"
        action={<Legend items={[{ label: "Doanh thu", color: chartColor.brandSoft }, { label: "Trung bình 7 ngày", color: chartColor.brand, line: true }]}/>}>
        <BarChart title="Biểu đồ doanh thu theo ngày" labels={labels} tickEvery={labels.length > 10 ? 3 : 1} format={shortVnd}
          bars={[{ label: "Doanh thu", values, color: chartColor.brandSoft }]}
          line={{ label: "Trung bình 7 ngày", values: avg, color: chartColor.brand }}
          tooltipTitle={i => `${labels[i]}/2026`}/>
      </Panel>
      <Panel title="Phiếu sửa chữa theo trạng thái" icon="clipboard" action={<PanelLink to="/admin/repair-orders">Xem phiếu</PanelLink>}>
        <DonutChart title="Phiếu sửa chữa theo trạng thái" segments={donut} centerValue={donut.reduce((s, d) => s + d.value, 0)} centerLabel="Phiếu"/>
      </Panel>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <Panel title="Lịch hẹn sắp tới" icon="calendar" action={<PanelLink to="/admin/appointments">Xem tất cả</PanelLink>} bodyClassName="px-2 pb-2 pt-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-small">
            <caption className="sr-only">Lịch hẹn sắp tới</caption>
            <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
              {["Giờ hẹn", "Khách hàng", "Xe / Biển số", "Dịch vụ", "Trạng thái"].map(h => <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:rounded-l-control">{h}</th>)}
              <th scope="col" className="rounded-r-control px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr></thead>
            <tbody>
              {upcomingAppointments.map(a => <tr key={a.time} className="border-b border-cs-border last:border-0">
                <td className="whitespace-nowrap px-3 py-3 text-cs-text"><span className="inline-flex items-center gap-2"><Icon name="clock" size={15} className="text-cs-accent-text"/>{a.time}</span></td>
                <td className="whitespace-nowrap px-3 py-3"><p className="font-semibold text-cs-text">{a.customer}</p><p className="flex items-center gap-1 text-caption text-cs-muted"><Icon name="phone" size={12}/>{a.phone}</p></td>
                <td className="whitespace-nowrap px-3 py-3"><p className="font-semibold text-cs-text">{a.vehicle}</p><p className="text-caption text-cs-muted">{a.plate}</p></td>
                <td className="px-3 py-3 text-cs-text-2">{a.service}</td>
                <td className="px-3 py-3"><StatusBadge domain="appointment" status={a.status}/></td>
                <td className="px-2 py-3 text-right"><IconButton icon="more" label={`Thao tác lịch hẹn của ${a.customer}`} size="sm"/></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Cảnh báo tồn kho thấp" icon="alert" action={<PanelLink to="/admin/inventory?tab=stock">Xem kho</PanelLink>} bodyClassName="px-2 pb-2 pt-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-small">
            <caption className="sr-only">Phụ tùng dưới mức tối thiểu</caption>
            <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
              <th scope="col" className="rounded-l-control px-3 py-2.5 font-semibold">Phụ tùng</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Tồn / Tối thiểu</th>
              <th scope="col" className="rounded-r-control px-3 py-2.5 font-semibold">Mức tồn</th>
            </tr></thead>
            <tbody>
              {lowStock.map(p => {
                const pct = (p.stock / p.min) * 100;
                return <tr key={p.id} className="border-b border-cs-border last:border-0">
                  <td className="px-3 py-3"><p className="font-semibold text-cs-text">{p.name}</p><p className="text-caption text-cs-muted">{p.sku}</p></td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-cs-text">{num(p.stock)} / {num(p.min)}</td>
                  <td className="px-3 py-3"><span className="flex items-center gap-2.5"><Progress value={pct} label={`Mức tồn ${p.name}`}/><b className={`w-10 text-right tabular-nums ${pct < 35 ? "text-danger-fg" : "text-warning-fg"}`}>{Math.round(pct)}%</b></span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  </AdminPage>;
}
