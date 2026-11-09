import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, DataTable, Dropdown, Field, IconButton, Input, Modal, Pagination, SearchInput, Select, buttonClass, type Column } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoStaff, staffSpecialties, type DemoStaff, type StaffRole } from "../../mocks/admin/people";
import { AdminPage, FilterSelect, Person, Pill, Toggle, Toolbar } from "./kit/AdminKit";
import { usePaged } from "./kit/usePaged";

const roleLabel: Record<StaffRole, string> = { ADVISOR: "Cố vấn dịch vụ", TECHNICIAN: "Kỹ thuật viên" };
type Draft = Omit<DemoStaff, "id" | "joinedAt">;
const emptyDraft: Draft = { name: "", email: "", phone: "", role: "TECHNICIAN", specialty: staffSpecialties[0], level: "JUNIOR", status: "ACTIVE" };

/** Nhân sự — DEMO: dữ liệu từ src/mocks/admin/people.ts (bảng employees + technician_profiles). */
export default function Staff() {
  const { notify, confirm } = useAppFeedback();
  const [staff, setStaff] = useState(demoStaff);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | StaffRole>("all");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [editing, setEditing] = useState<DemoStaff | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter(s => (!q || [s.name, s.phone, s.email].some(v => v.toLowerCase().includes(q)))
      && (role === "all" || s.role === role) && (status === "all" || s.status === status));
  }, [staff, query, role, status]);
  const { pageRows, pagination } = usePaged(rows, 8);

  const open = (person: DemoStaff | null) => {
    setEditing(person);
    setDraft(person ? { name: person.name, email: person.email, phone: person.phone, role: person.role, specialty: person.specialty ?? staffSpecialties[0], level: person.level ?? "JUNIOR", status: person.status } : emptyDraft);
    setFormOpen(true);
  };
  const save = () => {
    const clean = { ...draft, specialty: draft.role === "TECHNICIAN" ? draft.specialty : undefined, level: draft.role === "TECHNICIAN" ? draft.level : undefined };
    if (editing) setStaff(list => list.map(s => s.id === editing.id ? { ...s, ...clean } : s));
    else setStaff(list => [{ id: Math.max(...list.map(s => s.id)) + 1, joinedAt: "11/2026", ...clean }, ...list]);
    setFormOpen(false);
    notify(editing ? "Đã cập nhật nhân viên (demo)." : "Đã thêm nhân viên (demo).", "success");
  };
  const toggleStatus = async (person: DemoStaff) => {
    const leaving = person.status === "ACTIVE";
    if (leaving && !await confirm({ title: `Chuyển ${person.name} sang Nghỉ việc?`, description: "Nhân viên sẽ không được phân công phiếu mới. Tài khoản đăng nhập vẫn giữ nguyên cho tới khi bạn khoá ở trang Tài khoản.", confirmText: "Chuyển sang nghỉ việc", variant: "warning" })) return;
    setStaff(list => list.map(s => s.id === person.id ? { ...s, status: leaving ? "INACTIVE" : "ACTIVE" } : s));
  };

  const columns: Column<DemoStaff>[] = [
    { key: "name", header: "Nhân viên", primary: true, render: s => <Person name={s.name} sub={s.email}/> },
    { key: "phone", header: "Số điện thoại", render: s => <span className="whitespace-nowrap tabular-nums">{s.phone}</span> },
    { key: "role", header: "Vai trò", render: s => <Pill tone={s.role === "ADVISOR" ? "info" : "violet"}>{roleLabel[s.role]}</Pill> },
    { key: "specialty", header: "Chuyên môn", render: s => s.specialty ? <span className="text-cs-text-2">{s.specialty}{s.level && <span className="ml-1.5 text-caption text-cs-muted">· {s.level === "MASTER" ? "Chuyên gia" : s.level === "SENIOR" ? "Chính" : "Phụ"}</span>}</span> : <span className="text-cs-muted">—</span> },
    { key: "status", header: "Trạng thái", render: s => <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Đang làm" : "Nghỉ việc"}</Badge> },
  ];

  return <AdminPage title="Nhân sự" description="Danh sách cố vấn dịch vụ và kỹ thuật viên"
    actions={<>
      <Link to="/admin/audit-logs?tab=advisors" className={buttonClass({ variant: "outline", className: "max-sm:hidden" })}>Hoạt động cố vấn</Link>
      <Button variant="primary" icon="plus" onClick={() => open(null)}>Thêm nhân viên</Button>
    </>}>
    <Toolbar>
      <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo tên, SĐT…"/>
      <FilterSelect label="Vai trò" value={role} onChange={setRole} options={[{ value: "all", label: "Tất cả" }, { value: "ADVISOR", label: "Cố vấn dịch vụ" }, { value: "TECHNICIAN", label: "Kỹ thuật viên" }]}/>
      <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={[{ value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang làm" }, { value: "INACTIVE", label: "Nghỉ việc" }]}/>
    </Toolbar>
    <DataTable caption="Danh sách nhân viên" columns={columns} rows={pageRows} rowKey={s => s.id}
      actions={s => <>
        <IconButton icon="edit" label={`Sửa ${s.name}`} size="sm" onClick={() => open(s)}/>
        <Dropdown label={`Thao tác khác cho ${s.name}`} items={[
          { label: "Chỉnh sửa", icon: "edit", onSelect: () => open(s) },
          { label: s.status === "ACTIVE" ? "Chuyển sang nghỉ việc" : "Cho đi làm lại", icon: s.status === "ACTIVE" ? "lock" : "refresh", onSelect: () => { void toggleStatus(s); } },
        ]}/>
      </>}
      footer={<Pagination {...pagination}/>}/>

    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Sửa nhân viên" : "Thêm nhân viên"}
      footer={<><Button onClick={() => setFormOpen(false)}>Huỷ</Button><Button variant="primary" onClick={save} disabled={!draft.name.trim() || !draft.phone.trim()}>Lưu</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ tên" required className="sm:col-span-2"><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field>
        <Field label="Email" required><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field>
        <Field label="Số điện thoại" required><Input inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></Field>
        <Field label="Vai trò" required><Select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as StaffRole })}>
          <option value="ADVISOR">Cố vấn dịch vụ</option><option value="TECHNICIAN">Kỹ thuật viên</option>
        </Select></Field>
        {draft.role === "TECHNICIAN" && <Field label="Chuyên môn"><Select value={draft.specialty} onChange={e => setDraft({ ...draft, specialty: e.target.value })}>
          {staffSpecialties.map(s => <option key={s}>{s}</option>)}
        </Select></Field>}
        {draft.role === "TECHNICIAN" && <Field label="Cấp bậc"><Select value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value as Draft["level"] })}>
          <option value="JUNIOR">Thợ phụ</option><option value="SENIOR">Thợ chính</option><option value="MASTER">Chuyên gia</option>
        </Select></Field>}
        <div className="flex items-center gap-3 sm:col-span-2">
          <Toggle checked={draft.status === "ACTIVE"} onChange={v => setDraft({ ...draft, status: v ? "ACTIVE" : "INACTIVE" })} label="Đang làm"/>
          <span className="text-small text-cs-text">{draft.status === "ACTIVE" ? "Đang làm" : "Nghỉ việc"}</span>
        </div>
      </div>
    </Modal>
  </AdminPage>;
}
