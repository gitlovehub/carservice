import { useState } from "react";
import { Button } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { monthlyRevenue, paymentMethods, technicianPerformance, topParts, topServices } from "../../mocks/admin/operations";
import { AdminPage, FilterSelect, Panel, PanelLink, Person, Progress, StatCard, Stars, Tabs } from "./kit/AdminKit";
import { AreaChart, BarChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd } from "./kit/format";

type Tab = "revenue" | "services" | "parts" | "technicians";
const methodIcon: Record<string, IconName> = { CASH: "cash", BANK_TRANSFER: "bank", VNPAY: "qr" };

function RankTable({ head, rows }: { head: string[]; rows: Array<{ key: string; cells: React.ReactNode[]; share: number }> }) {
  return <div className="overflow-x-auto">
    <table className="w-full text-small">
      <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
        {head.map((h, i) => <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2.5 font-semibold first:rounded-l-control last:rounded-r-control ${i > 1 && i < head.length - 1 ? "text-right" : ""}`}>{h}</th>)}
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

/** Báo cáo — DEMO: số liệu lấy từ src/mocks/admin, chờ API thống kê theo kỳ. */
export default function Reports() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [month, setMonth] = useState("2026-11");
  const last = monthlyRevenue.labels.length - 1;
  const serviceTotal = topServices.reduce((s, r) => s + r.revenue, 0);
  const partTotal = topParts.reduce((s, r) => s + r.revenue, 0);
  const payTotal = paymentMethods.reduce((s, r) => s + r.revenue, 0);

  return <AdminPage title="Báo cáo" description="Phân tích doanh thu, dịch vụ và hiệu suất"
    actions={<>
      <FilterSelect label="Kỳ" value={month} onChange={setMonth} options={[
        { value: "2026-11", label: "Tháng 11/2026" }, { value: "2026-10", label: "Tháng 10/2026" }, { value: "2026-Q4", label: "Quý IV/2026" }, { value: "2026", label: "Năm 2026" },
      ]}/>
      <Button variant="outline" icon="download">Xuất PDF</Button>
    </>}>
    <div className="mb-5">
      <Tabs label="Loại báo cáo" variant="segment" value={tab} onChange={setTab} items={[
        { id: "revenue", label: "Doanh thu", icon: "chart" }, { id: "services", label: "Dịch vụ", icon: "wrench" },
        { id: "parts", label: "Phụ tùng", icon: "box" }, { id: "technicians", label: "Kỹ thuật viên", icon: "users" },
      ]}/>
    </div>

    {tab === "revenue" && <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon="coins" tone="brand" label="Tổng doanh thu" value={vnd(monthlyRevenue.service[last] + monthlyRevenue.parts[last])} delta={12} deltaLabel="so với tháng trước"/>
        <StatCard icon="wrench" tone="info" label="Doanh thu dịch vụ" value={vnd(monthlyRevenue.service[last])} delta={10} deltaLabel="so với tháng trước"/>
        <StatCard icon="box" tone="warning" label="Doanh thu phụ tùng" value={vnd(monthlyRevenue.parts[last])} delta={19} deltaLabel="so với tháng trước"/>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Doanh thu theo tháng" icon="chart"
          action={<Legend items={[{ label: "Dịch vụ", color: chartColor.brand }, { label: "Phụ tùng", color: chartColor.brandSoft }]}/>}>
          <BarChart title="Doanh thu theo tháng" labels={monthlyRevenue.labels} format={shortVnd}
            bars={[{ label: "Dịch vụ", values: monthlyRevenue.service, color: chartColor.brand }, { label: "Phụ tùng", values: monthlyRevenue.parts, color: chartColor.brandSoft }]}
            tooltipTitle={i => `${monthlyRevenue.labels[i]}/2026`}/>
        </Panel>
        <Panel title="Số phiếu sửa chữa" icon="clipboard">
          <AreaChart title="Số phiếu sửa chữa theo tháng" labels={monthlyRevenue.labels.map(l => l.replace("Tháng ", "T"))}
            series={{ label: "Số phiếu", values: monthlyRevenue.orders, color: chartColor.brand }}/>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Top 5 dịch vụ" icon="star" action={<button type="button" onClick={() => setTab("services")} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-small font-medium text-cs-accent-text hover:underline">Xem chi tiết<Icon name="arrow-right" size={14}/></button>}>
          <RankTable head={["#", "Tên dịch vụ", "Số lượt", "Doanh thu", "Tỷ trọng"]}
            rows={topServices.map((s, i) => ({ key: s.name, share: (s.revenue / serviceTotal) * 100, cells: [i + 1, s.name, s.count, vnd(s.revenue)] }))}/>
        </Panel>
        <Panel title="Phương thức thanh toán" icon="card" action={<PanelLink to="/admin/invoices">Hoá đơn</PanelLink>}>
          <RankTable head={["Phương thức", "", "Giao dịch", "Doanh thu", "Tỷ trọng"]}
            rows={paymentMethods.map(m => ({ key: m.method, share: (m.revenue / payTotal) * 100, cells: [
              <Icon key="i" name={methodIcon[m.method]} size={18} className="text-cs-muted"/>, <b key="b">{m.label}</b>, m.count, vnd(m.revenue)] }))}/>
          <p className="mt-3 flex items-center justify-between rounded-control bg-cs-soft px-4 py-3 font-semibold text-cs-accent-text">
            <span>Tổng cộng · {paymentMethods.reduce((s, m) => s + m.count, 0)} giao dịch</span><span className="tabular-nums">{vnd(payTotal)}</span>
          </p>
        </Panel>
      </div>
    </>}

    {tab === "services" && <Panel title="Doanh thu theo dịch vụ" icon="wrench" subtitle="Tháng 11/2026">
      <RankTable head={["#", "Tên dịch vụ", "Số lượt", "Doanh thu", "Tỷ trọng"]}
        rows={topServices.map((s, i) => ({ key: s.name, share: (s.revenue / serviceTotal) * 100, cells: [i + 1, s.name, s.count, vnd(s.revenue)] }))}/>
    </Panel>}

    {tab === "parts" && <Panel title="Phụ tùng bán chạy" icon="box" subtitle="Tháng 11/2026">
      <RankTable head={["#", "Phụ tùng", "Số lượng", "Doanh thu", "Tỷ trọng"]}
        rows={topParts.map((p, i) => ({ key: p.sku, share: (p.revenue / partTotal) * 100, cells: [i + 1, <span key="n"><b>{p.name}</b><span className="block text-caption text-cs-muted">{p.sku}</span></span>, p.qty, vnd(p.revenue)] }))}/>
    </Panel>}

    {tab === "technicians" && <Panel title="Hiệu suất kỹ thuật viên" icon="users" subtitle="Tháng 11/2026">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-small">
          <thead><tr className="bg-cs-surface-2 text-left text-cs-text-2">
            {["Kỹ thuật viên", "Chuyên môn", "Phiếu hoàn thành", "Giờ công", "Đánh giá"].map(h => <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:rounded-l-control last:rounded-r-control">{h}</th>)}
          </tr></thead>
          <tbody>
            {technicianPerformance.map(t => <tr key={t.name} className="border-b border-cs-border last:border-0">
              <td className="px-3 py-3"><Person name={t.name}/></td>
              <td className="px-3 py-3 text-cs-text-2">{t.specialty}</td>
              <td className="px-3 py-3 tabular-nums">{t.orders}</td>
              <td className="px-3 py-3 tabular-nums">{t.hours} giờ</td>
              <td className="px-3 py-3"><span className="flex items-center gap-2"><Stars value={t.rating} size={14}/><b className="tabular-nums">{t.rating}</b></span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </Panel>}
  </AdminPage>;
}
