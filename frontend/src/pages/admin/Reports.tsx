import { useState, type ReactNode } from "react";
import { Button, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { adminApi, type ReportData } from "../../services/adminApi";
import { AdminPage, FilterSelect, Panel, PanelLink, Progress, StatCard, Stars, Tabs } from "./kit/AdminKit";
import { AreaChart, BarChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd, type Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";

type Tab = "revenue" | "services" | "parts" | "operations";
const monthLabel = (month: string) => `Tháng ${Number(month.slice(5, 7))}`;
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const pct = (value: number | null) => value === null ? "—" : `${num(value)}%`;
const share = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0;
/** 30 giờ → "1 ngày 6 giờ"; dưới 1 ngày giữ số giờ. */
const duration = (hours: number) => hours < 24 ? `${num(hours)} giờ` : `${Math.floor(hours / 24)} ngày${Math.round(hours % 24) ? ` ${Math.round(hours % 24)} giờ` : ""}`;

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

/** Một dòng chỉ số: nhãn, giá trị, thanh tỷ trọng. */
function MetricRow({ label, value, percent, tone = "brand", hint }: { label: ReactNode; value: ReactNode; percent: number; tone?: Tone; hint?: string }) {
  return <div className="py-2.5">
    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-small">
      <span className="text-cs-text-2">{label}</span>
      <span className="tabular-nums font-semibold text-cs-text">{value}{hint && <span className="ml-1.5 font-normal text-cs-muted">{hint}</span>}</span>
    </div>
    <Progress value={percent} tone={tone}/>
  </div>;
}

/** Ô số lớn có chú thích, dùng trong panel. */
function Figure({ icon, label, value, sub, tone = "brand" }: { icon: IconName; label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  const tint: Record<Tone, string> = {
    brand: "bg-cs-soft text-cs-accent-text", info: "bg-info-soft text-info", success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger", violet: "bg-cs-soft text-cs-accent-text", neutral: "bg-cs-surface-2 text-cs-text-2",
  };
  return <div className="flex items-start gap-3 rounded-control border border-cs-border p-3.5">
    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tint[tone]}`} aria-hidden="true"><Icon name={icon} size={17}/></span>
    <div className="min-w-0">
      <p className="text-caption text-cs-muted">{label}</p>
      <p className="mt-0.5 text-body font-semibold tabular-nums text-cs-text">{value}</p>
      {sub && <p className="mt-0.5 text-caption text-cs-text-2">{sub}</p>}
    </div>
  </div>;
}

/** Báo cáo — số liệu thật từ GET /api/admin/reports?period=. */
export default function Reports() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [period, setPeriod] = useState(currentMonth);
  const query = useAdminQuery(`reports:${period}`, signal => adminApi.reports(period, signal));
  const data = query.data ?? query.stale;

  return <AdminPage title="Báo cáo" description="Doanh thu, dịch vụ và tình hình vận hành của ga-ra" demo={false}
    actions={<>
      <FilterSelect label="Kỳ" value={period} onChange={setPeriod}
        options={data?.periods.length ? data.periods : [{ value: period, label: period }]}/>
      <Button variant="outline" icon="printer" onClick={() => window.print()}>In báo cáo</Button>
    </>}>
    <div className="mb-5">
      <Tabs label="Loại báo cáo" variant="segment" value={tab} onChange={setTab} items={[
        { id: "revenue", label: "Doanh thu", icon: "chart" }, { id: "services", label: "Dịch vụ", icon: "wrench" },
        { id: "parts", label: "Phụ tùng", icon: "box" }, { id: "operations", label: "Vận hành", icon: "dashboard" },
      ]}/>
    </div>
    {!data ? (query.error ? <ErrorState description={query.error} onRetry={query.reload}/> : <LoadingState/>) : <ReportBody data={data} tab={tab} setTab={setTab}/>}
  </AdminPage>;
}

function ReportBody({ data, tab, setTab }: { data: ReportData; tab: Tab; setTab: (tab: Tab) => void }) {
  const serviceTotal = data.top_services.reduce((s, r) => s + r.revenue, 0) || 1;
  const partTotal = data.top_parts.reduce((s, r) => s + r.revenue, 0) || 1;
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
  if (tab === "operations") return <Operations data={data}/>;

  const { revenue, collection } = data;
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard icon="coins" tone="brand" label={`Tổng doanh thu · ${data.label}`} value={vnd(revenue.total.value)} delta={revenue.total.delta ?? undefined}/>
      <StatCard icon="wrench" tone="info" label="Doanh thu dịch vụ" value={vnd(revenue.service.value)} delta={revenue.service.delta ?? undefined}/>
      <StatCard icon="box" tone="warning" label="Doanh thu phụ tùng" value={vnd(revenue.parts.value)} delta={revenue.parts.delta ?? undefined}/>
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
      <Panel title="Hiệu quả thu tiền" icon="receipt" subtitle="Hoá đơn phát hành trong kỳ" action={<PanelLink to="/admin/invoices">Hoá đơn</PanelLink>}>
        {collection.invoices.value === 0 ? <EmptyState compact icon="receipt" title="Chưa phát hành hoá đơn nào trong kỳ"/> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Figure icon="invoice" label="Số hoá đơn" value={num(collection.invoices.value)}
              sub={collection.invoices.delta === null ? "Kỳ trước chưa có" : `${collection.invoices.delta >= 0 ? "+" : ""}${num(collection.invoices.delta)}% so với kỳ trước`}/>
            <Figure icon="coins" tone="info" label="Giá trị trung bình / hoá đơn" value={vnd(collection.average_invoice.value)}
              sub={collection.average_invoice.delta === null ? "Kỳ trước chưa có" : `${collection.average_invoice.delta >= 0 ? "+" : ""}${num(collection.average_invoice.delta)}% so với kỳ trước`}/>
          </div>
          <div className="mt-3">
            <MetricRow label="Đã thu / tổng phát hành" value={pct(collection.collection_rate)} hint={`${vnd(collection.collected)} / ${vnd(collection.billed)}`}
              percent={collection.collection_rate ?? 0} tone={(collection.collection_rate ?? 0) >= 90 ? "success" : (collection.collection_rate ?? 0) >= 70 ? "warning" : "danger"}/>
          </div>
          <p className={`mt-2 flex items-center justify-between gap-3 rounded-control px-4 py-3 text-small font-semibold ${collection.outstanding > 0 ? "bg-warning-soft text-warning-fg" : "bg-success-soft text-success-fg"}`}>
            <span>{collection.outstanding > 0 ? `Còn phải thu · ${num(collection.unpaid_invoices)} hoá đơn` : "Đã thu đủ toàn bộ hoá đơn trong kỳ"}</span>
            {collection.outstanding > 0 && <span className="tabular-nums">{vnd(collection.outstanding)}</span>}
          </p>
        </>}
      </Panel>
    </div>
  </>;
}

/** Tab Vận hành: nhìn chung tình hình thực tế của ga-ra trong kỳ. */
function Operations({ data }: { data: ReportData }) {
  const { operations: ops } = data;
  const { appointments: apt, customers, quotations, satisfaction } = ops;
  const stars = [5, 4, 3, 2, 1] as const;

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="car" tone="brand" label={`Lượt xe tiếp nhận · ${data.label}`} value={num(ops.received.value)} delta={ops.received.delta ?? undefined}/>
      <StatCard icon="clock" tone="info" label="Thời gian xử lý trung bình" value={ops.turnaround_hours ? duration(ops.turnaround_hours.value) : "—"}
        delta={ops.turnaround_hours?.delta ?? undefined} invertDelta/>
      <StatCard icon="star" tone="warning" label="Điểm hài lòng trung bình" value={satisfaction.average ? `${num(satisfaction.average.value)} / 5` : "—"} delta={satisfaction.average?.delta ?? undefined}/>
      <StatCard icon="users" tone="success" label="Tỷ lệ khách quay lại" value={pct(customers.return_rate)}/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      <Panel title="Luồng xe" icon="wrench" subtitle={data.label} action={<PanelLink to="/admin/repair-orders">Phiếu sửa chữa</PanelLink>}>
        <div className="grid gap-3">
          <Figure icon="car" label="Xe đã nhận" value={num(ops.received.value)} sub={ops.received.delta === null ? undefined : `Kỳ trước: ${num(ops.received.previous)}`}/>
          <Figure icon="check" tone="success" label="Xe đã bàn giao" value={num(ops.delivered)}/>
          <Figure icon="clipboard" tone="warning" label="Xe đang trong xưởng (cuối kỳ)" value={num(ops.in_shop)}/>
        </div>
      </Panel>

      <Panel title="Lịch hẹn" icon="calendar" subtitle={`${num(apt.total)} lịch trong kỳ`} action={<PanelLink to="/admin/appointments">Lịch hẹn</PanelLink>}>
        {apt.total === 0 ? <EmptyState compact icon="calendar" title="Chưa có lịch hẹn trong kỳ"/> : <>
          <p className="mb-1 text-small text-cs-text-2">Tỷ lệ khách đến đúng hẹn <b className="ml-1 text-section tabular-nums text-cs-text">{pct(apt.show_rate)}</b></p>
          <MetricRow label="Đã đến xưởng" value={num(apt.arrived)} percent={share(apt.arrived, apt.total)} tone="success"/>
          <MetricRow label="Đã huỷ" value={num(apt.cancelled)} percent={share(apt.cancelled, apt.total)} tone="warning"/>
          <MetricRow label="Không đến" value={num(apt.no_show)} percent={share(apt.no_show, apt.total)} tone="danger"/>
          <MetricRow label="Chờ đến (đã đặt / đã xác nhận)" value={num(apt.upcoming)} percent={share(apt.upcoming, apt.total)} tone="info"/>
        </>}
      </Panel>

      <Panel title="Khách hàng & báo giá" icon="users" subtitle={data.label}>
        <MetricRow label="Khách quay lại" value={num(customers.returning)} hint={`/ ${num(customers.total)} khách`} percent={share(customers.returning, customers.total)} tone="success"/>
        <MetricRow label="Khách mới" value={num(customers.new)} percent={share(customers.new, customers.total)} tone="brand"/>
        <div className="my-2 border-t border-cs-border"/>
        {quotations.decided === 0 ? <p className="py-2.5 text-small text-cs-muted">Chưa có báo giá được khách phản hồi trong kỳ.</p>
          : <MetricRow label="Báo giá được khách duyệt" value={pct(quotations.approval_rate)} hint={`${num(quotations.approved)} / ${num(quotations.decided)}`}
            percent={quotations.approval_rate ?? 0} tone={(quotations.approval_rate ?? 0) >= 70 ? "success" : (quotations.approval_rate ?? 0) >= 50 ? "warning" : "danger"}/>}
      </Panel>
    </div>

    <div className="mt-5">
      <Panel title="Mức hài lòng của khách" icon="star" subtitle={`${num(satisfaction.count)} lượt đánh giá sau bảo dưỡng`} action={<PanelLink to="/admin/reviews">Đánh giá</PanelLink>}>
        {satisfaction.count === 0 ? <EmptyState compact icon="star" title="Chưa có đánh giá trong kỳ"/> : <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:items-center">
          <div className="text-center md:border-r md:border-cs-border md:pr-6">
            <p className="text-title font-bold tabular-nums text-cs-text">{satisfaction.average ? num(satisfaction.average.value) : "—"}</p>
            {satisfaction.average && <Stars value={satisfaction.average.value} size={18}/>}
            <p className="mt-2 text-small text-cs-text-2"><b className="text-success">{pct(satisfaction.positive_rate)}</b> khách hài lòng (4–5★)</p>
          </div>
          <div>
            {stars.map(star => <MetricRow key={star} label={<span className="inline-flex items-center gap-1">{star}<Icon name="star" size={13} className="text-warning"/></span>}
              value={num(satisfaction.distribution[star])} percent={share(satisfaction.distribution[star], satisfaction.count)} tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"}/>)}
          </div>
        </div>}
      </Panel>
    </div>
  </>;
}
