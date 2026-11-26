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