import { ErrorState, PageHeader } from "../../components/ui";
import { fmtDateTime } from "../../services/adminApi";
import { fetchApi } from "../../services/api";
import { ClearFilters, Toolbar } from "./kit/AdminKit";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";

type Row = {
  account_id: number; name: string; email: string; role: string;
  created: number; confirmed: number; checked_in: number; rescheduled: number; cancelled: number; repair_orders: number; last_action_at: string | null;
};

/** Admin: mỗi cố vấn đã tạo / xác nhận / tiếp nhận / đổi / hủy bao nhiêu lịch và lập bao nhiêu phiếu trong kỳ đang chọn. */
export default function AdvisorActivity({ embedded = false }: { embedded?: boolean } = {}) {
  const period = usePeriod("all");
  const search = new URLSearchParams(period.params).toString();
  const list = useAdminQuery(`advisor-activity:${search}`, signal => fetchApi<{ data: Row[] }>(`/admin/advisor-activity${search ? `?${search}` : ""}`, { signal }));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];

  const cell = "px-4 py-3 text-right tabular-nums";
  const Wrapper = embedded ? "div" : "main";
  return <Wrapper className={embedded ? "" : "page-container"}>
    {!embedded && <PageHeader title="Hoạt động cố vấn" description="Ai tiếp nhận, xác nhận, đổi hay hủy lịch cho khách, và lập bao nhiêu phiếu sửa chữa."/>}
    <Toolbar>
      <PeriodFilter period={period}/>
      <ClearFilters active={!period.isDefault} onClear={period.reset}/>
    </Toolbar>
    <div aria-busy={list.loading || undefined} className="overflow-x-auto rounded-2xl border border-cs-border bg-cs-surface" data-testid="advisor-activity">
      {list.error ? <ErrorState description={list.error} onRetry={list.reload}/> : <table className="w-full min-w-[760px] text-sm text-cs-text">
        <thead><tr className="border-b border-cs-border text-left text-xs text-cs-muted">
          <th className="px-4 py-3">Cố vấn</th><th className="px-4 py-3 text-right">Tạo hộ</th><th className="px-4 py-3 text-right">Xác nhận</th><th className="px-4 py-3 text-right">Tiếp nhận</th>
          <th className="px-4 py-3 text-right">Đổi lịch</th><th className="px-4 py-3 text-right">Hủy</th><th className="px-4 py-3 text-right">Phiếu sửa chữa</th><th className="px-4 py-3">Thao tác gần nhất</th>
        </tr></thead>
        <tbody>
          {!result ? <tr><td colSpan={8} className="px-4 py-6 text-center text-cs-muted">Đang tải…</td></tr>
            : !rows.length ? <tr><td colSpan={8} className="px-4 py-6 text-center text-cs-muted">Chưa có cố vấn nào.</td></tr>
              : rows.map(row => <tr key={row.account_id} className="border-b border-cs-border/60 last:border-0">
                <td className="px-4 py-3"><p className="font-semibold">{row.name}</p><p className="text-xs text-cs-muted">{row.email}{row.role === "ADMIN" ? " · Admin" : ""}</p></td>
                <td className={cell}>{row.created}</td><td className={cell}>{row.confirmed}</td><td className={cell}>{row.checked_in}</td>
                <td className={cell}>{row.rescheduled}</td><td className={cell}>{row.cancelled}</td><td className={cell}>{row.repair_orders}</td>
                <td className="px-4 py-3 text-xs text-cs-muted">{row.last_action_at ? fmtDateTime(row.last_action_at) : "—"}</td>
              </tr>)}
        </tbody>
      </table>}
    </div>
  </Wrapper>;
}
