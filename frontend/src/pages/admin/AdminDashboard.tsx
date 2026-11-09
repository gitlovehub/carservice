import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { adminApi, type DashboardData } from "../../services/adminApi";
import { AdminPage, Panel, PanelLink, StatCard, Tabs } from "./kit/AdminKit";
import { AreaChart, DonutChart } from "./kit/Charts";
import { chartColor, num, shortVnd, toneSoft, vnd, type Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";

type Range = DashboardData["range"];
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const todayLabel = () => new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

/**
 * Tổng quan Admin — bảng điều hành HÔM NAY (GET /api/admin/dashboard): việc cần xử lý, lịch sắp tới,
 * xe trong xưởng, dòng tiền gần đây. Phân tích theo kỳ (tháng/quý/năm, xếp hạng) nằm ở trang Báo cáo.
 */
export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("7d");
  const query = useAdminQuery(`dashboard:${range}`, signal => adminApi.dashboard(range, signal));
  const data = query.data ?? query.stale;

  return <AdminPage title="Tổng quan" description={`Điều hành xưởng hôm nay · ${todayLabel()}`} demo={false}
    actions={<PanelLink to="/admin/reports">Xem báo cáo theo kỳ</PanelLink>}>
    {!data
      ? (query.error ? <ErrorState description={query.error} onRetry={query.reload}/> : <LoadingState/>)
      : <DashboardBody data={data} range={range} setRange={setRange}/>}
  </AdminPage>;
}

type Task = { icon: IconName; tone: Tone; label: string; hint: string; count: number; to: string };

function DashboardBody({ data, range, setRange }: { data: DashboardData; range: Range; setRange: (range: Range) => void }) {
  const { kpis } = data;
  const tasks: Task[] = [
    { icon: "calendar", tone: "info", label: "Lịch hẹn chờ xác nhận", hint: "Cố vấn cần gọi xác nhận với khách", count: data.attention.pending_appointments, to: "/admin/appointments" },
    { icon: "receipt", tone: "warning", label: "Báo giá chờ khách duyệt", hint: "Nhắc khách phản hồi để bắt đầu sửa", count: data.repair_status.quoting, to: "/admin/repair-orders" },
    { icon: "box", tone: "violet", label: "Xe chờ phụ tùng", hint: "Theo dõi đơn đặt hàng phụ tùng", count: data.repair_status.waiting_parts, to: "/admin/repair-orders" },
    { icon: "invoice", tone: "danger", label: "Hoá đơn chưa thu đủ", hint: "Công nợ cần thu khi bàn giao", count: kpis.unpaid_invoices.value, to: "/admin/invoices" },
    { icon: "alert", tone: "warning", label: "Phụ tùng dưới mức tối thiểu", hint: data.low_stock.slice(0, 2).map(p => p.name).join(", ") || "Đủ hàng", count: data.low_stock.length, to: "/admin/inventory?tab=stock" },
    { icon: "star", tone: "brand", label: "Đánh giá thấp chưa phản hồi", hint: "Nên trả lời trong 24 giờ", count: data.attention.low_reviews_unreplied, to: "/admin/reviews" },
  ];
  const pending = tasks.filter(t => t.count > 0);
  const donut = [
    { label: "Đang kiểm tra", value: data.repair_status.inspecting, color: chartColor.blue },
    { label: "Chờ duyệt báo giá", value: data.repair_status.quoting, color: chartColor.yellow },
    { label: "Chờ phụ tùng", value: data.repair_status.waiting_parts, color: chartColor.violet },
    { label: "Đang sửa chữa", value: data.repair_status.in_progress, color: chartColor.green },
    { label: "Chờ thanh toán", value: data.repair_status.waiting_payment, color: chartColor.grey },
  ];
  const openTotal = donut.reduce((s, d) => s + d.value, 0);
  const revenueTotal = data.revenue_series.reduce((s, p) => s + p.revenue, 0);

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="calendar" tone="info" label="Lịch hẹn hôm nay" value={num(kpis.appointments_today.value)} delta={kpis.appointments_today.delta ?? undefined} deltaLabel="so với hôm qua"/>
      <StatCard icon="car" tone="success" label="Xe đang trong xưởng" value={num(kpis.in_shop.value)} delta={kpis.in_shop.delta ?? undefined} deltaLabel="so với cuối ngày hôm qua"/>
      <StatCard icon="invoice" tone="warning" label="Hoá đơn chưa thu đủ" value={num(kpis.unpaid_invoices.value)} delta={kpis.unpaid_invoices.delta ?? undefined} deltaLabel="so với tuần trước" invertDelta/>
      <StatCard icon="coins" tone="brand" label="Đã thu trong tháng" value={vnd(kpis.revenue_month.value)} delta={kpis.revenue_month.delta ?? undefined} deltaLabel="so với cùng kỳ tháng trước"/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Panel title="Việc cần xử lý" icon="check" subtitle={pending.length ? `${pending.length} việc đang chờ` : "Không có việc tồn đọng"}>
        <ul className="flex flex-col gap-2">
          {tasks.map(task => <li key={task.label}>
            <Link to={task.to} className={`group flex items-center gap-3 rounded-control border p-3 no-underline transition-colors hover:bg-cs-hover ${task.count ? "border-cs-border" : "border-transparent opacity-60"}`}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-control ${toneSoft[task.tone]}`}><Icon name={task.icon} size={18}/></span>
              <span className="min-w-0 flex-1">
                <span className="block text-small font-semibold text-cs-text">{task.label}</span>
                <span className="block truncate text-caption text-cs-muted">{task.hint}</span>
              </span>
              <b className={`min-w-9 rounded-full px-2.5 py-1 text-center text-small tabular-nums ${task.count ? toneSoft[task.tone] : "text-cs-muted"}`}>{num(task.count)}</b>
              <Icon name="chevron-right" size={16} className="shrink-0 text-cs-muted transition-transform group-hover:translate-x-0.5"/>
            </Link>
          </li>)}
        </ul>
      </Panel>

      <Panel title="Lịch hẹn sắp tới" icon="clock" action={<PanelLink to="/admin/appointments">Xem tất cả</PanelLink>}>
        {data.upcoming_appointments.length === 0
          ? <EmptyState compact icon="calendar" title="Chưa có lịch hẹn sắp tới"/>
          : <ol className="relative flex flex-col">
            {data.upcoming_appointments.map(a => <li key={a.id} className="flex gap-4 border-b border-cs-border py-3 first:pt-0 last:border-0 last:pb-0">
              <span className="w-16 shrink-0 text-right">
                <b className="block text-subheading tabular-nums text-cs-text">{a.start}</b>
                <span className="text-caption text-cs-muted">{dayLabel(a.date)}</span>
              </span>
              <span className="w-px shrink-0 self-stretch bg-cs-border" aria-hidden="true"/>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <b className="truncate text-small text-cs-text">{a.customer ?? "Khách hàng"}</b>
                  <StatusBadge domain="appointment" status={a.status}/>
                </span>
                <span className="block truncate text-caption text-cs-text-2">{a.vehicle || "Xe chưa rõ"} · {a.plate ?? "Chưa có biển"}</span>
                <span className="block truncate text-caption text-cs-muted">{a.services || "Kiểm tra theo mô tả"}{a.phone ? ` · ${a.phone}` : ""}</span>
              </span>
            </li>)}
          </ol>}
      </Panel>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Panel title="Dòng tiền gần đây" icon="chart" subtitle={`Đã thu ${vnd(revenueTotal)} trong ${range === "30d" ? "30" : "7"} ngày`}
        action={<Tabs label="Khoảng thời gian" variant="segment" value={range} onChange={setRange} items={[{ id: "7d", label: "7 ngày" }, { id: "30d", label: "30 ngày" }]}/>}>
        <AreaChart title="Tiền đã thu theo ngày" height={220} format={shortVnd}
          labels={data.revenue_series.map(p => dayLabel(p.date))}
          series={{ label: "Đã thu", values: data.revenue_series.map(p => p.revenue), color: chartColor.brand }}/>
      </Panel>
      <Panel title="Xe trong xưởng theo bước" icon="clipboard" action={<PanelLink to="/admin/repair-orders">Xem phiếu</PanelLink>}>
        {openTotal === 0
          ? <EmptyState compact icon="clipboard" title="Không có phiếu đang mở"/>
          : <DonutChart title="Phiếu sửa chữa theo trạng thái" segments={donut} centerValue={openTotal} centerLabel="Xe"/>}
      </Panel>
    </div>
  </>;
}
