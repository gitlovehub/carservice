import { useState, type ReactNode } from "react";
import { Button, EmptyState, ErrorState, LoadingState, StarIcon } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { adminApi, type ReportData } from "../../services/adminApi";
import { AdminPage, Panel, PanelLink, Progress, StatCard, Stars, Tabs } from "./kit/AdminKit";
import { AreaChart, BarChart, Legend } from "./kit/Charts";
import { chartColor, num, shortVnd, vnd, type Tone } from "./kit/format";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";

type Tab = "revenue" | "services" | "parts" | "operations";
const GRANULARITY_TEXT: Record<ReportData["granularity"], string> = { day: "ngày", week: "tuần", month: "tháng", year: "năm" };
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
  // Giữ nguyên khoảng thời gian khi chuyển giữa các tab báo cáo.
  const period = usePeriod("month");
  const params = period.params;
  const query = useAdminQuery(`reports:${JSON.stringify(params)}`, signal => adminApi.reports(params, signal));
  const data = query.data ?? query.stale;

  return <AdminPage title="Báo cáo" description="Doanh thu, dịch vụ và tình hình vận hành của ga-ra" demo={false}
    actions={<>
      <PeriodFilter period={period} allowAll={false}/>
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
