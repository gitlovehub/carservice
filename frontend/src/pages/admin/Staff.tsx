import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, DataTable, Dropdown, Field, Input, Modal, Pagination, SearchInput, Select, buttonClass, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, type AdminStaff, type StaffRole } from "../../services/adminApi";
import { AdminPage, FilterSelect, Person, Pill, StatCard, Toggle, Toolbar } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { usePaged } from "./kit/usePaged";

const roleLabel: Record<StaffRole, string> = { ADVISOR: "Cố vấn dịch vụ", TECHNICIAN: "Kỹ thuật viên" };
const SPECIALTIES = ["Bảo dưỡng tổng quát", "Động cơ", "Gầm - Phanh - Lốp", "Điện - Điều hòa", "Hộp số", "Đồng sơn"];

type Draft = { name: string; email: string; phone: string; role: StaffRole; specialty: string; status: "ACTIVE" | "INACTIVE"; sendInvite: boolean };
const emptyDraft: Draft = { name: "", email: "", phone: "", role: "TECHNICIAN", specialty: SPECIALTIES[0], status: "ACTIVE", sendInvite: true };

/** Nhân sự — dữ liệu thật từ /api/admin/staff (employees + accounts + technician_profiles). */
export default function Staff() {
  const { notify, confirm } = useAppFeedback();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | StaffRole>("all");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [editing, setEditing] = useState<AdminStaff | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const term = useDebounced(search.trim());

  const tableSort = useTableSort(NEWEST_FIRST);
  const params = { search: term, role, status, ...tableSort.params };
  const list = useAdminQuery(`staff:${JSON.stringify(params)}`, signal => adminApi.staff(params, signal));
  const result = list.data ?? list.stale;
  const { pageRows, pagination } = usePaged(result?.data ?? [], 10);

  const open = (person: AdminStaff | null) => {
    setEditing(person);
    setFormError("");
    setDraft(person ? {
      name: person.name, email: person.email ?? "", phone: person.phone ?? "", role: person.role,
      specialty: person.specialty ?? SPECIALTIES[0], status: person.status, sendInvite: false,
    } : emptyDraft);
  };

  const payload = (d: Draft) => ({
    name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), role: d.role, status: d.status,
    specialty: d.role === "TECHNICIAN" ? d.specialty : null,
  });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.email.trim() || !/^0\d{9,10}$/.test(draft.phone.trim())) return setFormError("Nhập họ tên, email và số điện thoại hợp lệ.");
    setSaving(true); setFormError("");
    try {
      const response = editing
        ? await adminApi.updateStaff(editing.id, payload(draft))
        : await adminApi.createStaff({ ...payload(draft), send_invite: draft.sendInvite });
      notify(response.message + (!editing && draft.sendInvite ? " Đã gửi email để nhân viên tự đặt mật khẩu." : ""), "success");
      setDraft(null);
      list.reload();
    } catch (error) {
      setFormError(errorMessage(error, "Không lưu được nhân viên."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (person: AdminStaff) => {
    const leaving = person.status === "ACTIVE";
    if (leaving && !await confirm({ title: `Chuyển ${person.name} sang Nghỉ việc?`, description: "Nhân viên sẽ không được phân công phiếu mới; tài khoản đăng nhập bị tạm ngừng và các phiên đăng nhập bị thu hồi. Có thể cho đi làm lại bất cứ lúc nào.", confirmText: "Chuyển sang nghỉ việc", variant: "warning" })) return;
    try {
      const response = await adminApi.updateStaff(person.id, { ...payload({ ...emptyDraft, name: person.name, email: person.email ?? "", phone: person.phone ?? "", role: person.role, specialty: person.specialty ?? SPECIALTIES[0], status: person.status }), status: leaving ? "INACTIVE" : "ACTIVE" });
      notify(response.message, "success");
      list.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const columns: Column<AdminStaff>[] = [
    { key: "name", sortKey: "name", header: "Nhân viên", primary: true, render: s => <Person name={s.name} sub={s.email ?? undefined}/> },
    { key: "phone", sortKey: "phone", header: "Số điện thoại", render: s => <span className="whitespace-nowrap tabular-nums">{s.phone ?? "—"}</span> },
    { key: "role", sortKey: "role", header: "Vai trò", render: s => <Pill tone={s.role === "ADVISOR" ? "info" : "violet"}>{roleLabel[s.role]}</Pill> },
    { key: "specialty", header: "Chuyên môn", render: s => s.role === "TECHNICIAN" && s.specialty ? <span className="text-cs-text-2">{s.specialty}</span> : <span className="text-cs-muted">—</span> },
    { key: "joined", sortKey: "joined", header: "Ngày vào", hideOnMobile: true, render: s => <span className="tabular-nums text-cs-text-2">{fmtDate(s.joined_at)}</span> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: s => <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Đang làm" : "Nghỉ việc"}</Badge> },
  ];
  const specialtyOptions = draft && !SPECIALTIES.includes(draft.specialty) ? [...SPECIALTIES, draft.specialty] : SPECIALTIES;

  return <AdminPage title="Nhân sự" description="Danh sách cố vấn dịch vụ và kỹ thuật viên" demo={false}
    actions={<>
      <Link to="/admin/audit-logs?tab=advisors" className={buttonClass({ variant: "outline", className: "max-sm:hidden" })}>Hoạt động cố vấn</Link>
      <Button variant="primary" icon="plus" onClick={() => open(null)}>Thêm nhân viên</Button>
    </>}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="users" tone="brand" label="Tổng nhân viên" value={result?.summary.total ?? "—"}/>
      <StatCard icon="check" tone="success" label="Đang làm" value={result?.summary.active ?? "—"}/>
      <StatCard icon="user" tone="info" label="Cố vấn dịch vụ" value={result?.summary.advisors ?? "—"}/>
      <StatCard icon="wrench" tone="violet" label="Kỹ thuật viên" value={result?.summary.technicians ?? "—"}/>
    </div>
    <Toolbar>
      <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên, SĐT, email…"/>
      <FilterSelect label="Vai trò" value={role} onChange={setRole} options={[{ value: "all", label: "Tất cả" }, { value: "ADVISOR", label: "Cố vấn dịch vụ" }, { value: "TECHNICIAN", label: "Kỹ thuật viên" }]}/>
      <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang làm" }, { value: "INACTIVE", label: "Nghỉ việc" }]}/>
    </Toolbar>
    <DataTable sort={tableSort.sort} onSort={tableSort.toggle} caption="Danh sách nhân viên" columns={columns} rows={pageRows} rowKey={s => s.id}
      loading={list.loading} error={list.error || undefined} onRetry={list.reload}
      actions={s => <>
        <Dropdown label={`Thao tác khác cho ${s.name}`} items={[
          { label: "Chỉnh sửa", icon: "edit", onSelect: () => open(s) },
          { label: s.status === "ACTIVE" ? "Chuyển sang nghỉ việc" : "Cho đi làm lại", icon: s.status === "ACTIVE" ? "lock" : "refresh", onSelect: () => { void toggleStatus(s); } },
        ]}/>
      </>}
      footer={<Pagination {...pagination}/>}/>

    <Modal open={draft !== null} onClose={() => setDraft(null)} dismissible={!saving} title={editing ? "Sửa nhân viên" : "Thêm nhân viên"}
      footer={<><Button disabled={saving} onClick={() => setDraft(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void save()}>Lưu</Button></>}>
      {draft && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ tên" required className="sm:col-span-2"><Input value={draft.name} maxLength={100} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field>
        <Field label="Email" required hint="Dùng để đăng nhập."><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field>
        <Field label="Số điện thoại" required><Input inputMode="tel" maxLength={11} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></Field>
        <Field label="Vai trò" required><Select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as StaffRole })}>
          <option value="ADVISOR">Cố vấn dịch vụ</option><option value="TECHNICIAN">Kỹ thuật viên</option>
        </Select></Field>
        {draft.role === "TECHNICIAN" && <Field label="Chuyên môn"><Select value={draft.specialty} onChange={e => setDraft({ ...draft, specialty: e.target.value })}>
          {specialtyOptions.map(s => <option key={s}>{s}</option>)}
        </Select></Field>}
        <div className="flex items-center gap-3 sm:col-span-2">
          <Toggle checked={draft.status === "ACTIVE"} onChange={v => setDraft({ ...draft, status: v ? "ACTIVE" : "INACTIVE" })} label="Đang làm"/>
          <span className="text-small text-cs-text">{draft.status === "ACTIVE" ? "Đang làm" : "Nghỉ việc (tài khoản tạm ngừng)"}</span>
        </div>
        {!editing && <div className="flex items-center gap-3 sm:col-span-2">
          <Toggle checked={draft.sendInvite} onChange={v => setDraft({ ...draft, sendInvite: v })} label="Gửi email kích hoạt"/>
          <span className="text-small text-cs-text">Gửi email mã OTP để nhân viên tự đặt mật khẩu</span>
        </div>}
        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg sm:col-span-2">{formError}</p>}
      </div>}
    </Modal>
  </AdminPage>;
}
