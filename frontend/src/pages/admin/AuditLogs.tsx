import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable, EmptyState, Pagination, SearchInput, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { adminApi, fmtDateTime, type AdminAuditLog, type AuditCategory } from "../../services/adminApi";
import AdvisorActivity from "./AdvisorActivity";
import { AdminPage, FilterSelect, Person, Pill, Tabs, Toolbar } from "./kit/AdminKit";
import type { Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

const categoryInfo: Record<AuditCategory, { label: string; tone: Tone }> = {
  CREATE: { label: "Tạo mới", tone: "success" }, UPDATE: { label: "Cập nhật", tone: "info" },
  DELETE: { label: "Xoá / huỷ", tone: "danger" }, STATUS: { label: "Đổi trạng thái", tone: "warning" },
};
type Tab = "logs" | "advisors";

/** Nhật ký hệ thống: nhật ký thao tác thật (/api/admin/audit-logs) và hoạt động cố vấn (/api/admin/advisor-activity). */
export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "advisors" ? "advisors" : "logs";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | AuditCategory>("all");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim());

  const tableSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const query = { category, search: term, page, ...tableSort.params };
  const list = useAdminQuery(tab === "logs" ? `audit:${JSON.stringify(query)}` : null, signal => adminApi.auditLogs(query, signal));
  const result = list.data ?? list.stale;

  const columns: Column<AdminAuditLog>[] = [
    { key: "at", sortKey: "created", header: "Thời gian", render: l => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{fmtDateTime(l.at)}</span> },
    { key: "actor", header: "Người thực hiện", primary: true, render: l => <Person name={l.actor} sub={l.role} size={32}/> },
    { key: "action", header: "Hành động", render: l => <Pill tone={categoryInfo[l.category].tone}>{categoryInfo[l.category].label}</Pill> },
    { key: "target", header: "Đối tượng", render: l => <span><b className="text-cs-text">{l.target}</b><span className="block text-caption text-cs-muted">{l.detail || l.label}</span></span> },
    { key: "ip", header: "IP", hideOnMobile: true, render: l => <span className="tabular-nums text-cs-muted">{l.ip ?? "—"}</span> },
  ];

  return <AdminPage title="Nhật ký hệ thống" description="Ai đã thay đổi gì, khi nào — phục vụ kiểm soát và truy vết" demo={false}>
    <div className="mb-4">
      <Tabs label="Loại nhật ký" value={tab} onChange={id => setParams(id === "logs" ? {} : { tab: id }, { replace: true })}
        items={[{ id: "logs", label: "Nhật ký thao tác", icon: "history" }, { id: "advisors", label: "Hoạt động cố vấn", icon: "users" }]}/>
    </div>
    {tab === "logs" ? <>
      <Toolbar>
        <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm người thực hiện, lý do…"/>
        <FilterSelect label="Hành động" value={category} onChange={value => { setCategory(value); setPage(1); }} options={[
          { value: "all", label: "Tất cả" }, ...(Object.keys(categoryInfo) as AuditCategory[]).map(a => ({ value: a, label: categoryInfo[a].label })),
        ]}/>
      </Toolbar>
      <DataTable sort={tableSort.sort} onSort={tableSort.toggle} caption="Nhật ký thao tác" columns={columns} rows={result?.data ?? []} rowKey={l => l.id}
        loading={list.loading} error={list.error || undefined} onRetry={list.reload}
        empty={<EmptyState icon="history" title="Chưa có thao tác nào phù hợp"/>}
        footer={result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}/>
    </> : <AdvisorActivity embedded/>}
  </AdminPage>;
}
