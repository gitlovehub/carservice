import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable, SearchInput, type Column } from "../../components/ui";
import { demoAuditLogs, type AuditAction, type DemoAuditLog } from "../../mocks/admin/operations";
import AdvisorActivity from "./AdvisorActivity";
import { AdminPage, FilterSelect, Person, Pill, Tabs, Toolbar } from "./kit/AdminKit";
import type { Tone } from "./kit/format";

const actionInfo: Record<AuditAction, { label: string; tone: Tone }> = {
  CREATE: { label: "Tạo mới", tone: "success" }, UPDATE: { label: "Cập nhật", tone: "info" }, DELETE: { label: "Xoá / huỷ", tone: "danger" },
  STATUS: { label: "Đổi trạng thái", tone: "warning" }, LOGIN: { label: "Đăng nhập", tone: "neutral" },
};
type Tab = "logs" | "advisors";

/**
 * Nhật ký hệ thống. Tab "Nhật ký thao tác" là DEMO (src/mocks/admin/operations.ts, bảng audit_logs);
 * tab "Hoạt động cố vấn" dùng API thật /admin/advisor-activity.
 */
export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "advisors" ? "advisors" : "logs";
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<"all" | AuditAction>("all");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoAuditLogs.filter(l => (action === "all" || l.action === action) && (!q || [l.actor, l.target, l.detail].some(v => v.toLowerCase().includes(q))));
  }, [query, action]);

  const columns: Column<DemoAuditLog>[] = [
    { key: "at", header: "Thời gian", render: l => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{l.at}</span> },
    { key: "actor", header: "Người thực hiện", primary: true, render: l => <Person name={l.actor} sub={l.role} size={32}/> },
    { key: "action", header: "Hành động", render: l => <Pill tone={actionInfo[l.action].tone}>{actionInfo[l.action].label}</Pill> },
    { key: "target", header: "Đối tượng", render: l => <span><b className="text-cs-text">{l.target}</b><span className="block text-caption text-cs-muted">{l.detail}</span></span> },
    { key: "ip", header: "IP", hideOnMobile: true, render: l => <span className="tabular-nums text-cs-muted">{l.ip}</span> },
  ];

  return <AdminPage title="Nhật ký hệ thống" description="Ai đã thay đổi gì, khi nào — phục vụ kiểm soát và truy vết" demo={tab === "logs"}>
    <div className="mb-4">
      <Tabs label="Loại nhật ký" value={tab} onChange={id => setParams(id === "logs" ? {} : { tab: id }, { replace: true })}
        items={[{ id: "logs", label: "Nhật ký thao tác", icon: "history" }, { id: "advisors", label: "Hoạt động cố vấn", icon: "users" }]}/>
    </div>
    {tab === "logs" ? <>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm người thực hiện, đối tượng…"/>
        <FilterSelect label="Hành động" value={action} onChange={setAction} options={[
          { value: "all", label: "Tất cả" }, ...(Object.keys(actionInfo) as AuditAction[]).map(a => ({ value: a, label: actionInfo[a].label })),
        ]}/>
      </Toolbar>
      <DataTable caption="Nhật ký thao tác" columns={columns} rows={rows} rowKey={l => l.id}/>
    </> : <AdvisorActivity embedded/>}
  </AdminPage>;
}
