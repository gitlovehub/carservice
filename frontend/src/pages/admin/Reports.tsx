import { useState, type ReactNode } from "react";
import { Button, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { adminApi, type PaymentGroup, type ReportData } from "../../services/adminApi";
import { AdminPage, FilterSelect, Panel, PanelLink, Person, Progress, StatCard, Stars, Tabs } from "./kit/AdminKit";
import { AreaChart, BarChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";

type Tab = "revenue" | "services" | "parts" | "technicians";
const methodInfo: Record<PaymentGroup, { label: string; icon: IconName }> = {
  CASH: { label: "Tiền mặt", icon: "cash" }, BANK_TRANSFER: { label: "Chuyển khoản", icon: "bank" }, VNPAY: { label: "VNPAY", icon: "qr" },
};
const monthLabel = (month: string) => `Tháng ${Number(month.slice(5, 7))}`;
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

function RankTable({ head, rows, empty }: { head: string[]; rows: Array<{ key: string; cells: ReactNode[]; share: number }>; empty: string }) {
  if (!rows.length) return <EmptyState compact icon="chart" title={empty}/>;
  return <div className="overflow-x-auto">
    <table className="w-full text-small">
      <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
        {head.map((h, i) => <th key={h || i} scope="col" className={`whitespace-nowrap px-3 py-2.5 font-semibold first:rounded-l-control last:rounded-r-control ${i > 1 && i < head.length - 1 ? "text-right" : ""}`}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map(row => <tr key={row.key} className="border-b border-cs-border last:border-0">
          {row.cells.map((cell, i) => <td key={i} className={`px-3 py-2.5 text-cs-text ${i > 1 ? "whitespace-nowrap text-right tabular-nums" : ""}`}>{cell}</td>)}
          <td className="px-3 py-2.5"><span className="flex items-center gap-2"><span className="w-16 lg:w-24"><Progress value={row.share} tone="brand"/></span><span className="w-12 text-right tabular-nums text-cs-text-2">{num(Math.round(row.share * 10) / 10)}%</span></span></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

/** Báo cáo — số liệu thật từ GET /api/admin/reports?period=. */
export default function Reports() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [period, setPeriod] = useState(currentMonth);
  const query = useAdminQuery(`reports:${period}`, signal => adminApi.reports(period, signal));
  const data = query.data ?? query.stale;

  return <AdminPage title="Báo cáo" description="Phân tích doanh thu, dịch vụ và hiệu suất" demo={false}
    actions={<>
      <FilterSelect label="Kỳ" value={period} onChange={setPeriod}
        options={data?.periods.length ? data.periods : [{ value: period, label: period }]}/>
      <Button variant="outline" icon="printer" onClick={() => window.print()}>In báo cáo</Button>
    </>}>
    <div className="mb-5">
      <Tabs label="Loại báo cáo" variant="segment" value={tab} onChange={setTab} items={[
        { id: "revenue", label: "Doanh thu", icon: "chart" }, { id: "services", label: "Dịch vụ", icon: "wrench" },
        { id: "parts", label: "Phụ tùng", icon: "box" }, { id: "technicians", label: "Kỹ thuật viên", icon: "users" },
      ]}/>
    </div>
    {!data ? (query.error ? <ErrorState description={query.error} onRetry={query.reload}/> : <LoadingState/>) : <ReportBody data={data} tab={tab} setTab={setTab}/>}
  </AdminPage>;
}

function ReportBody({ data, tab, setTab }: { data: ReportData; tab: Tab; setTab: (tab: Tab) => void }) {
  const serviceTotal = data.top_services.reduce((s, r) => s + r.revenue, 0) || 1;
  const partTotal = data.top_parts.reduce((s, r) => s + r.revenue, 0) || 1;
  const payTotal = data.payment_methods.reduce((s, r) => s + r.revenue, 0);
  const labels = data.monthly.map(m => monthLabel(m.month));
  const serviceRows = data.top_services.map((s, i) => ({ key: `${s.name}-${i}`, share: (s.revenue / serviceTotal) * 100, cells: [i + 1, s.name, num(s.count), vnd(s.revenue)] }));

  if (tab === "services") {
    return <Panel title="Doanh thu theo dịch vụ" icon="wrench" subtitle={data.label}>
      <RankTable head={["#", "Tên dịch vụ", "Số lượt", "Doanh thu", "Tỷ trọng"]} rows={serviceRows} empty="Chưa có doanh thu dịch vụ trong kỳ"/>
    </Panel>;
  }
  if (tab === "parts") {
    return <Panel title="Phụ tùng bán chạy" icon="box" subtitle={data.label}>
      <RankTable head={["#", "Phụ tùng", "Số lượng", "Doanh thu", "Tỷ trọng"]} empty="Chưa bán phụ tùng nào trong kỳ"
        rows={data.top_parts.map((p, i) => ({ key: `${p.sku ?? p.name}-${i}`, share: (p.revenue / partTotal) * 100, cells: [i + 1, <span key="n"><b>{p.name}</b>{p.sku && <span className="block text-caption text-cs-muted">{p.sku}</span>}</span>, num(p.quantity), vnd(p.revenue)] }))}/>
    </Panel>;
  }
  if (tab === "technicians") {
    return <Panel title="Hiệu suất kỹ thuật viên" icon="users" subtitle={data.label}>
      {data.technicians.length === 0 ? <EmptyState compact icon="users" title="Chưa có công việc hoàn thành trong kỳ"/> : <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-small">
          <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
            {["Kỹ thuật viên", "Chuyên môn", "Phiếu hoàn thành", "Giờ công", "Đánh giá"].map(h => <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:rounded-l-control last:rounded-r-control">{h}</th>)}
          </tr></thead>
          <tbody>
            {data.technicians.map(t => <tr key={t.id} className="border-b border-cs-border last:border-0">
              <td className="px-3 py-3"><Person name={t.name ?? "—"}/></td>
              <td className="px-3 py-3 text-cs-text-2">{t.specialty ?? "—"}</td>
              <td className="px-3 py-3 tabular-nums">{num(t.orders)}</td>
              <td className="px-3 py-3 tabular-nums">{num(t.hours)} giờ</td>
              <td className="px-3 py-3">{t.rating === null ? <span className="text-cs-muted">Chưa có</span> : <span className="flex items-center gap-2"><Stars value={t.rating} size={14}/><b className="tabular-nums">{num(t.rating)}</b></span>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </Panel>;
  }

  const { revenue } = data;
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard icon="coins" tone="brand" label={`Tổng doanh thu · ${data.label}`} value={vnd(revenue.total.value)} delta={revenue.total.delta ?? undefined} deltaLabel="so với kỳ trước"/>
      <StatCard icon="wrench" tone="info" label="Doanh thu dịch vụ" value={vnd(revenue.service.value)} delta={revenue.service.delta ?? undefined} deltaLabel="so với kỳ trước"/>
      <StatCard icon="box" tone="warning" label="Doanh thu phụ tùng" value={vnd(revenue.parts.value)} delta={revenue.parts.delta ?? undefined} deltaLabel="so với kỳ trước"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Panel title="Doanh thu theo tháng" icon="chart"
        action={<Legend items={[{ label: "Dịch vụ", color: chartColor.brand }, { label: "Phụ tùng", color: chartColor.brandSoft }]}/>}>
        <BarChart title="Doanh thu theo tháng" labels={labels} format={shortVnd}
          bars={[{ label: "Dịch vụ", values: data.monthly.map(m => m.service), color: chartColor.brand }, { label: "Phụ tùng", values: data.monthly.map(m => m.parts), color: chartColor.brandSoft }]}
          tooltipTitle={i => `${labels[i]}/${data.monthly[i].month.slice(0, 4)}`}/>
      </Panel>
      <Panel title="Số phiếu sửa chữa" icon="clipboard">
        <AreaChart title="Số phiếu sửa chữa theo tháng" labels={labels.map(l => l.replace("Tháng ", "T"))}
          series={{ label: "Số phiếu", values: data.monthly.map(m => m.orders), color: chartColor.brand }}/>
      </Panel>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Panel title="Top 5 dịch vụ" icon="star" action={<button type="button" onClick={() => setTab("services")} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-small font-medium text-cs-accent-text hover:underline">Xem chi tiết<Icon name="arrow-right" size={14}/></button>}>
        <RankTable head={["#", "Tên dịch vụ", "Số lượt", "Doanh thu", "Tỷ trọng"]} rows={serviceRows.slice(0, 5)} empty="Chưa có doanh thu dịch vụ trong kỳ"/>
      </Panel>
      <Panel title="Phương thức thanh toán" icon="card" action={<PanelLink to="/admin/invoices">Hoá đơn</PanelLink>}>
        <RankTable head={["Phương thức", "", "Giao dịch", "Đã thu", "Tỷ trọng"]} empty="Chưa có giao dịch trong kỳ"
          rows={payTotal === 0 ? [] : data.payment_methods.map(m => ({ key: m.method, share: (m.revenue / payTotal) * 100, cells: [
            <Icon key="i" name={methodInfo[m.method].icon} size={18} className="text-cs-muted"/>, <b key="b">{methodInfo[m.method].label}</b>, num(m.count), vnd(m.revenue)] }))}/>
        {payTotal > 0 && <p className="mt-3 flex items-center justify-between rounded-control bg-cs-soft px-4 py-3 font-semibold text-cs-accent-text">
          <span>Tổng cộng · {num(data.payment_methods.reduce((s, m) => s + m.count, 0))} giao dịch</span><span className="tabular-nums">{vnd(payTotal)}</span>
        </p>}
      </Panel>
    </div>
  </>;
}
