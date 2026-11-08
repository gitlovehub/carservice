import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui";
import { fetchApi } from "../../services/api";

type Row = {
  account_id: number; name: string; email: string; role: string;
  created: number; confirmed: number; checked_in: number; rescheduled: number; cancelled: number; repair_orders: number; last_action_at: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/** Admin: mỗi cố vấn đã tạo / xác nhận / tiếp nhận / đổi / hủy bao nhiêu lịch và lập bao nhiêu phiếu. */
export default function AdvisorActivity() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchApi<{ data: Row[] }>(`/admin/advisor-activity?from=${from}&to=${to}`)
      .then(response => { if (active) { setRows(response.data); setError(""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Không tải được dữ liệu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const cell = "px-4 py-3 text-right tabular-nums";
  return <main className="page-container">
    <PageHeader title="Hoạt động cố vấn" description="Ai tiếp nhận, xác nhận, đổi hay hủy lịch cho khách, và lập bao nhiêu phiếu sửa chữa."/>
    <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
      <label className="text-xs font-semibold text-cs-muted">Từ ngày<input className="mt-1 block rounded-xl border border-cs-border bg-cs-surface px-3 py-2" type="date" value={from} max={to} onChange={e => { setLoading(true); setFrom(e.target.value); }}/></label>
      <label className="text-xs font-semibold text-cs-muted">Đến ngày<input className="mt-1 block rounded-xl border border-cs-border bg-cs-surface px-3 py-2" type="date" value={to} min={from} onChange={e => { setLoading(true); setTo(e.target.value); }}/></label>
    </div>
    {error && <p role="alert" className="mb-3 text-sm font-semibold text-cs-danger">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-cs-border bg-cs-surface" data-testid="advisor-activity">
      <table className="w-full min-w-[760px] text-sm text-cs-text">
        <thead><tr className="border-b border-cs-border text-left text-xs text-cs-muted">
          <th className="px-4 py-3">Cố vấn</th><th className="px-4 py-3 text-right">Tạo hộ</th><th className="px-4 py-3 text-right">Xác nhận</th><th className="px-4 py-3 text-right">Tiếp nhận</th>
          <th className="px-4 py-3 text-right">Đổi lịch</th><th className="px-4 py-3 text-right">Hủy</th><th className="px-4 py-3 text-right">Phiếu sửa chữa</th><th className="px-4 py-3">Thao tác gần nhất</th>
        </tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="px-4 py-6 text-center text-cs-muted">Đang tải…</td></tr>
            : !rows.length ? <tr><td colSpan={8} className="px-4 py-6 text-center text-cs-muted">Chưa có cố vấn nào.</td></tr>
              : rows.map(row => <tr key={row.account_id} className="border-b border-cs-border/60 last:border-0">
                <td className="px-4 py-3"><p className="font-semibold">{row.name}</p><p className="text-xs text-cs-muted">{row.email}{row.role === "ADMIN" ? " · Admin" : ""}</p></td>
                <td className={cell}>{row.created}</td><td className={cell}>{row.confirmed}</td><td className={cell}>{row.checked_in}</td>
                <td className={cell}>{row.rescheduled}</td><td className={cell}>{row.cancelled}</td><td className={cell}>{row.repair_orders}</td>
                <td className="px-4 py-3 text-xs text-cs-muted">{row.last_action_at ? new Date(row.last_action_at).toLocaleString("vi-VN") : "—"}</td>
              </tr>)}
        </tbody>
      </table>
    </div>
  </main>;
}
