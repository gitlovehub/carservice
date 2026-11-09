import { useState } from "react";
import { Button, DataTable, Dropdown, Field, Input, Modal, Pagination, SearchInput, Select, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDateTime, type AccountRole, type AccountStatus, type AdminAccount } from "../../services/adminApi";
import { AdminPage, FilterSelect, Person, Pill, Tabs, Toggle, Toolbar } from "./kit/AdminKit";
import type { Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

const roleInfo: Record<AccountRole, { label: string; tone: Tone }> = {
  ADMIN: { label: "Quản trị", tone: "brand" },
  ADVISOR: { label: "Cố vấn dịch vụ", tone: "info" },
  TECHNICIAN: { label: "Kỹ thuật viên", tone: "violet" },
  CUSTOMER: { label: "Khách hàng", tone: "neutral" },
};
type RoleTab = "all" | AccountRole;
type Draft = { email: string; name: string; phone: string; role: Exclude<AccountRole, "CUSTOMER">; sendInvite: boolean };
const emptyDraft: Draft = { email: "", name: "", phone: "", role: "ADVISOR", sendInvite: true };

/** Tài khoản — dữ liệu thật từ /api/admin/accounts (tạo tài khoản nội bộ, khoá / kích hoạt, gửi email đặt lại mật khẩu). */
export default function Accounts() {
  const { notify, confirm } = useAppFeedback();
  const [tab, setTab] = useState<RoleTab>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const term = useDebounced(search.trim());

  const tableSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const params = { role: tab, status, search: term, page, ...tableSort.params };
  const list = useAdminQuery(`accounts:${JSON.stringify(params)}`, signal => adminApi.accounts(params, signal));
  const result = list.data ?? list.stale;
  const counts = result?.summary ?? {};
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

  const setStatusOf = async (account: AdminAccount, next: "ACTIVE" | "LOCKED") => {
    if (next === "LOCKED" && !await confirm({ title: `Khoá tài khoản ${account.email}?`, description: "Người dùng sẽ bị đăng xuất và không đăng nhập được cho tới khi mở khoá.", confirmText: "Khoá tài khoản", variant: "danger", confirmIcon: "lock" })) return;
    try {
      const response = await adminApi.setAccountStatus(account.id, next);
      notify(response.message, "success");
      list.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };
  const resetPassword = async (account: AdminAccount) => {
    if (!await confirm({ title: `Gửi email đặt lại mật khẩu?`, description: `Mã OTP (hiệu lực 5 phút) sẽ được gửi tới ${account.email}. Người dùng nhập mã ở trang Quên mật khẩu để đặt mật khẩu mới.`, confirmText: "Gửi email", variant: "info", confirmIcon: "send" })) return;
    try {
      notify((await adminApi.resetPassword(account.id)).message, "success");
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };
  const create = async () => {
    if (!draft) return;
    if (!draft.email.includes("@") || !draft.name.trim()) return setFormError("Nhập email và họ tên.");
    if (draft.phone.trim() && !/^0\d{9,10}$/.test(draft.phone.trim())) return setFormError("Số điện thoại không hợp lệ.");
    setSaving(true); setFormError("");
    try {
      const response = await adminApi.createAccount({ email: draft.email.trim(), name: draft.name.trim(), phone: draft.phone.trim() || null, role: draft.role, send_invite: draft.sendInvite });
      notify(response.message, "success");
      setDraft(null);
      list.reload();
    } catch (error) {
      setFormError(errorMessage(error, "Không tạo được tài khoản."));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AdminAccount>[] = [
    { key: "email", sortKey: "email", header: "Tài khoản", primary: true, render: a => <Person name={a.name} sub={a.email}/> },
    { key: "role", sortKey: "role", header: "Vai trò", render: a => <Pill tone={roleInfo[a.role].tone}>{roleInfo[a.role].label}</Pill> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: a => <StatusBadge domain="account" status={a.status}/> },
    { key: "verified", header: "Email", hideOnMobile: true, render: a => a.verified
      ? <span className="inline-flex items-center gap-1 text-success-fg"><Icon name="check" size={15}/>Đã xác thực</span>
      : <span className="text-cs-muted">Chưa xác thực</span> },
    { key: "login", sortKey: "login", header: "Đăng nhập gần nhất", hideOnMobile: true, render: a => <span className="tabular-nums text-cs-text-2">{a.last_login_at ? fmtDateTime(a.last_login_at) : "Chưa đăng nhập"}</span> },
  ];

  return <AdminPage title="Tài khoản" description="Quản lý đăng nhập và trạng thái tài khoản" demo={false}
    actions={<Button variant="primary" icon="plus" onClick={() => { setFormError(""); setDraft(emptyDraft); }}>Tạo tài khoản</Button>}>
    <div className="mb-4">
      <Tabs label="Lọc theo vai trò" value={tab} onChange={id => { setTab(id); setPage(1); }} items={([
        ["all", "Tất cả"], ["ADMIN", "Quản trị"], ["ADVISOR", "Cố vấn dịch vụ"], ["TECHNICIAN", "Kỹ thuật viên"], ["CUSTOMER", "Khách hàng"],
      ] as Array<[RoleTab, string]>).map(([id, label]) => ({ id, label, count: result ? (id === "all" ? total : counts[id] ?? 0) : undefined }))}/>
    </div>
    <Toolbar>
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo email, họ tên…"/>
      <FilterSelect label="Trạng thái" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[
        { value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang hoạt động" }, { value: "PENDING", label: "Chờ kích hoạt" },
        { value: "LOCKED", label: "Đã khoá" }, { value: "INACTIVE", label: "Ngừng hoạt động" },
      ]}/>
    </Toolbar>
    <DataTable sort={tableSort.sort} onSort={tableSort.toggle} caption="Danh sách tài khoản" columns={columns} rows={result?.data ?? []} rowKey={a => a.id}
      loading={list.loading} error={list.error || undefined} onRetry={list.reload}
      actions={a => <Dropdown label={`Thao tác cho ${a.email}`} items={[
        { label: "Gửi email đặt lại mật khẩu", icon: "key", onSelect: () => { void resetPassword(a); } },
        { type: "separator" },
        a.status === "ACTIVE"
          ? { label: "Khoá tài khoản", icon: "lock", danger: true, onSelect: () => { void setStatusOf(a, "LOCKED"); }, disabled: a.role === "ADMIN" }
          : { label: "Kích hoạt", icon: "check", onSelect: () => { void setStatusOf(a, "ACTIVE"); } },
      ]}/>}
      footer={result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}/>

    <Modal open={draft !== null} onClose={() => setDraft(null)} dismissible={!saving} title="Tạo tài khoản nội bộ"
      description="Tạo kèm hồ sơ nhân viên. Mật khẩu do người dùng tự đặt qua email OTP."
      footer={<><Button disabled={saving} onClick={() => setDraft(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang tạo..." onClick={() => void create()}>Tạo tài khoản</Button></>}>
      {draft && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" required className="sm:col-span-2"><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field>
        <Field label="Họ tên" required><Input value={draft.name} maxLength={100} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field>
        <Field label="Số điện thoại" optional><Input inputMode="tel" maxLength={11} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></Field>
        <Field label="Vai trò" required className="sm:col-span-2"><Select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Draft["role"] })}>
          <option value="ADVISOR">Cố vấn dịch vụ</option><option value="TECHNICIAN">Kỹ thuật viên</option><option value="ADMIN">Quản trị</option>
        </Select></Field>
        <label className="flex items-center gap-3 text-small text-cs-text sm:col-span-2">
          <Toggle checked={draft.sendInvite} onChange={v => setDraft({ ...draft, sendInvite: v })} label="Gửi email kích hoạt"/>Gửi email kích hoạt (mã OTP đặt mật khẩu)
        </label>
        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg sm:col-span-2">{formError}</p>}
      </div>}
    </Modal>
  </AdminPage>;
}
