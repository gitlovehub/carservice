import { useMemo, useState } from "react";
import { Button, DataTable, Dropdown, Field, Input, Modal, Pagination, SearchInput, Select, type Column } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoAccounts, type AccountRole, type DemoAccount } from "../../mocks/admin/people";
import { AdminPage, FilterSelect, Person, Pill, Tabs, Toggle, Toolbar } from "./kit/AdminKit";
import type { Tone } from "./kit/format";
import { usePaged } from "./kit/usePaged";

const roleInfo: Record<AccountRole, { label: string; tone: Tone }> = {
  ADMIN: { label: "Quản trị", tone: "brand" },
  ADVISOR: { label: "Cố vấn dịch vụ", tone: "info" },
  TECHNICIAN: { label: "Kỹ thuật viên", tone: "violet" },
  CUSTOMER: { label: "Khách hàng", tone: "neutral" },
};
type RoleTab = "all" | AccountRole;

/** Tài khoản — DEMO: dữ liệu từ src/mocks/admin/people.ts (bảng accounts). */
export default function Accounts() {
  const { notify, confirm } = useAppFeedback();
  const [accounts, setAccounts] = useState(demoAccounts);
  const [tab, setTab] = useState<RoleTab>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DemoAccount["status"]>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", phone: "", role: "ADVISOR" as AccountRole, sendInvite: true });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(a => (tab === "all" || a.role === tab) && (status === "all" || a.status === status)
      && (!q || a.email.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)));
  }, [accounts, tab, status, query]);
  const { pageRows, pagination } = usePaged(rows, 10);
  const count = (role: RoleTab) => role === "all" ? accounts.length : accounts.filter(a => a.role === role).length;

  const setStatusOf = async (account: DemoAccount, next: DemoAccount["status"]) => {
    if (next === "LOCKED" && !await confirm({ title: `Khoá tài khoản ${account.email}?`, description: "Người dùng sẽ bị đăng xuất và không đăng nhập được cho tới khi mở khoá.", confirmText: "Khoá tài khoản", variant: "danger", confirmIcon: "lock" })) return;
    setAccounts(list => list.map(a => a.id === account.id ? { ...a, status: next } : a));
    notify(next === "LOCKED" ? "Đã khoá tài khoản (demo)." : "Đã kích hoạt tài khoản (demo).", "success");
  };
  const create = () => {
    setAccounts(list => [{ id: Math.max(...list.map(a => a.id)) + 1, email: draft.email, name: draft.name, role: draft.role, status: "PENDING", verified: false, lastLogin: "—" }, ...list]);
    setFormOpen(false); setDraft({ email: "", name: "", phone: "", role: "ADVISOR", sendInvite: true });
    notify("Đã tạo tài khoản (demo).", "success");
  };

  const columns: Column<DemoAccount>[] = [
    { key: "email", header: "Tài khoản", primary: true, render: a => <Person name={a.name} sub={a.email}/> },
    { key: "role", header: "Vai trò", render: a => <Pill tone={roleInfo[a.role].tone}>{roleInfo[a.role].label}</Pill> },
    { key: "status", header: "Trạng thái", render: a => <StatusBadge domain="account" status={a.status}/> },
    { key: "verified", header: "Email", hideOnMobile: true, render: a => a.verified
      ? <span className="inline-flex items-center gap-1 text-success-fg"><Icon name="check" size={15}/>Đã xác thực</span>
      : <span className="text-cs-muted">Chưa xác thực</span> },
    { key: "login", header: "Đăng nhập gần nhất", hideOnMobile: true, render: a => <span className="tabular-nums text-cs-text-2">{a.lastLogin}</span> },
  ];

  return <AdminPage title="Tài khoản" description="Quản lý đăng nhập và phân quyền"
    actions={<Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>Tạo tài khoản</Button>}>
    <div className="mb-4">
      <Tabs label="Lọc theo vai trò" value={tab} onChange={setTab} items={([
        ["all", "Tất cả"], ["ADMIN", "Quản trị"], ["ADVISOR", "Cố vấn dịch vụ"], ["TECHNICIAN", "Kỹ thuật viên"], ["CUSTOMER", "Khách hàng"],
      ] as Array<[RoleTab, string]>).map(([id, label]) => ({ id, label, count: count(id) }))}/>
    </div>
    <Toolbar>
      <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo email, họ tên…"/>
      <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={[
        { value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang hoạt động" }, { value: "PENDING", label: "Chờ kích hoạt" },
        { value: "LOCKED", label: "Đã khoá" }, { value: "INACTIVE", label: "Ngừng hoạt động" },
      ]}/>
    </Toolbar>
    <DataTable caption="Danh sách tài khoản" columns={columns} rows={pageRows} rowKey={a => a.id}
      actions={a => <Dropdown label={`Thao tác cho ${a.email}`} items={[
        { label: "Đổi vai trò", icon: "users", onSelect: () => notify("Đổi vai trò sẽ dùng API phân quyền.", "info"), disabled: a.role === "CUSTOMER" },
        { label: "Đặt lại mật khẩu", icon: "key", onSelect: () => notify(`Đã gửi email đặt lại mật khẩu tới ${a.email} (demo).`, "success") },
        { type: "separator" },
        a.status === "LOCKED" || a.status === "PENDING" || a.status === "INACTIVE"
          ? { label: "Kích hoạt", icon: "check", onSelect: () => { void setStatusOf(a, "ACTIVE"); } }
          : { label: "Khoá tài khoản", icon: "lock", danger: true, onSelect: () => { void setStatusOf(a, "LOCKED"); }, disabled: a.role === "ADMIN" },
      ]}/>}
      footer={<Pagination {...pagination}/>}/>

    <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Tạo tài khoản" description="Tài khoản nhân viên mới ở trạng thái Chờ kích hoạt cho tới khi người dùng đặt mật khẩu."
      footer={<><Button onClick={() => setFormOpen(false)}>Huỷ</Button><Button variant="primary" onClick={create} disabled={!draft.email.includes("@") || !draft.name.trim()}>Tạo tài khoản</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" required className="sm:col-span-2"><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field>
        <Field label="Họ tên" required><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field>
        <Field label="Số điện thoại" optional><Input inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></Field>
        <Field label="Vai trò" required className="sm:col-span-2"><Select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as AccountRole })}>
          <option value="ADVISOR">Cố vấn dịch vụ</option><option value="TECHNICIAN">Kỹ thuật viên</option><option value="ADMIN">Quản trị</option>
        </Select></Field>
        <label className="flex items-center gap-3 text-small text-cs-text sm:col-span-2">
          <Toggle checked={draft.sendInvite} onChange={v => setDraft({ ...draft, sendInvite: v })} label="Gửi email kích hoạt"/>Gửi email kích hoạt cho người dùng
        </label>
      </div>
    </Modal>
  </AdminPage>;
}
