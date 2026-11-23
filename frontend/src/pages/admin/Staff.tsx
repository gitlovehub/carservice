import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, DataTable, Dropdown, Field, Input, Modal, NEWEST_FIRST, Pagination, SearchInput, Select, buttonClass, useTableSort, type Column } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, type AdminStaff, type StaffRole } from "../../services/adminApi";
import { AdminPage, ClearFilters, FilterSelect, Person, Pill, StatCard, Toggle, Toolbar } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { usePaged } from "./kit/usePaged";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";

const roleLabel: Record<StaffRole, string> = { ADVISOR: "Cố vấn dịch vụ", TECHNICIAN: "Kỹ thuật viên" };
/** Gợi ý bấm nhanh; chuyên môn vẫn nhập tay tự do (nhiều mục cách nhau bằng dấu phẩy). */
const SPECIALTY_TAGS = ["Bảo dưỡng tổng quát", "Động cơ", "Gầm - Phanh - Lốp", "Điện - Điều hòa", "Hộp số", "Đồng sơn"];
const SPECIALTY_MAX = 100;
const specialtyParts = (text: string) => text.split(",").map(part => part.trim()).filter(Boolean);

type Draft = { name: string; email: string; phone: string; role: StaffRole; specialty: string; status: "ACTIVE" | "INACTIVE"; sendInvite: boolean };
const emptyDraft: Draft = { name: "", email: "", phone: "", role: "TECHNICIAN", specialty: "", status: "ACTIVE", sendInvite: true };

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

  const fieldErrors = useFieldErrors();
  const setField = (patch: Partial<Draft>) => { fieldErrors.clear(...Object.keys(patch)); setDraft(current => current && { ...current, ...patch }); };
  const open = (person: AdminStaff | null) => {
    setEditing(person);
    setFormError("");
    fieldErrors.reset();
    setDraft(person ? {
      name: person.name, email: person.email ?? "", phone: person.phone ?? "", role: person.role,
      specialty: person.specialty ?? "", status: person.status, sendInvite: false,
    } : emptyDraft);
  };
  /** Bấm tag: chưa có thì thêm vào cuối, có rồi thì bỏ ra. */
  const toggleSpecialty = (tag: string) => {
    if (!draft) return;
    const parts = specialtyParts(draft.specialty);
    const exists = parts.some(part => part.toLowerCase() === tag.toLowerCase());
    const next = (exists ? parts.filter(part => part.toLowerCase() !== tag.toLowerCase()) : [...parts, tag]).join(", ");
    if (next.length > SPECIALTY_MAX) { fieldErrors.show({ specialty: `Chuyên môn tối đa ${SPECIALTY_MAX} ký tự.` }); return; }
    setField({ specialty: next });
  };

  const payload = (d: Draft) => ({
    name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), role: d.role, status: d.status,
    specialty: d.role === "TECHNICIAN" ? specialtyParts(d.specialty).join(", ") || null : null,
  });

  const save = async () => {
    if (!draft) return;
    const problems: FieldErrors = {};
    if (!draft.name.trim()) problems.name = "Nhập họ tên.";
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) problems.email = "Nhập email hợp lệ.";
    if (!/^0\d{9,10}$/.test(draft.phone.trim())) problems.phone = "Số điện thoại gồm 10–11 số, bắt đầu bằng 0.";
    setFormError("");
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    try {
      const response = editing
        ? await adminApi.updateStaff(editing.id, payload(draft))
        : await adminApi.createStaff({ ...payload(draft), send_invite: draft.sendInvite });
      notify(response.message + (!editing && draft.sendInvite ? " Đã gửi email để nhân viên tự đặt mật khẩu." : ""), "success");
      setDraft(null);
      list.reload();
    } catch (error) {
      fieldErrors.showApi(error, { name: "name", full_name: "name", email: "email", phone: "phone", role: "role", specialty: "specialty" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (person: AdminStaff) => {
    const leaving = person.status === "ACTIVE";
    if (leaving && !await confirm({ title: `Chuyển ${person.name} sang Nghỉ việc?`, description: "Nhân viên sẽ không được phân công phiếu mới; tài khoản đăng nhập bị tạm ngừng và các phiên đăng nhập bị thu hồi. Có thể cho đi làm lại bất cứ lúc nào.", confirmText: "Chuyển sang nghỉ việc", variant: "warning" })) return;
    try {
      const response = await adminApi.updateStaff(person.id, { ...payload({ ...emptyDraft, name: person.name, email: person.email ?? "", phone: person.phone ?? "", role: person.role, specialty: person.specialty ?? "", status: person.status }), status: leaving ? "INACTIVE" : "ACTIVE" });
      notify(response.message, "success");
      list.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const columns: Column<AdminStaff>[] = [
    { key: "name", header: "Nhân viên", primary: true, render: s => <Person name={s.name} sub={s.email ?? undefined}/> },
    { key: "phone", header: "Số điện thoại", render: s => <span className="whitespace-nowrap tabular-nums">{s.phone ?? "—"}</span> },
    { key: "role", sortKey: "role", header: "Vai trò", render: s => <Pill tone={s.role === "ADVISOR" ? "info" : "violet"}>{roleLabel[s.role]}</Pill> },
    { key: "specialty", sortKey: "specialty", header: "Chuyên môn", render: s => s.role === "TECHNICIAN" && s.specialty ? <span className="text-cs-text-2">{s.specialty}</span> : <span className="text-cs-muted">—</span> },
    { key: "joined", sortKey: "joined", header: "Ngày vào", hideOnMobile: true, render: s => <span className="tabular-nums text-cs-text-2">{fmtDate(s.joined_at)}</span> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: s => <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Đang làm" : "Nghỉ việc"}</Badge> },
  ];
  const chosenSpecialties = draft ? specialtyParts(draft.specialty).map(part => part.toLowerCase()) : [];

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
      <ClearFilters active={search !== "" || role !== "all" || status !== "all" || !tableSort.isDefault} onClear={() => { setSearch(""); setRole("all"); setStatus("all"); tableSort.reset(); }}/>
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
        <Field label="Họ tên" required error={fieldErrors.errors.name} className="sm:col-span-2"><Input value={draft.name} maxLength={100} onChange={e => setField({ name: e.target.value })}/></Field>
        <Field label="Email" required error={fieldErrors.errors.email} hint={editing ? "Đổi email sẽ đăng xuất nhân viên và báo tới cả email cũ, email mới." : "Dùng để đăng nhập."}><Input type="email" value={draft.email} onChange={e => setField({ email: e.target.value })}/></Field>
        <Field label="Số điện thoại" required error={fieldErrors.errors.phone}><Input inputMode="tel" maxLength={11} value={draft.phone} onChange={e => setField({ phone: e.target.value })}/></Field>
        <Field label="Vai trò" required error={fieldErrors.errors.role}><Select value={draft.role} onChange={e => setField({ role: e.target.value as StaffRole })}>
          <option value="ADVISOR">Cố vấn dịch vụ</option><option value="TECHNICIAN">Kỹ thuật viên</option>
        </Select></Field>
        {draft.role === "TECHNICIAN" && <div className="sm:col-span-2">
          <Field label="Chuyên môn" optional error={fieldErrors.errors.specialty} hint="Nhập tay hoặc bấm tag bên dưới. Nhiều chuyên môn cách nhau bằng dấu phẩy.">
            <Input value={draft.specialty} maxLength={SPECIALTY_MAX} placeholder="VD: Động cơ, Hộp số" onChange={e => setField({ specialty: e.target.value })}/>
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Tag chuyên môn">
            {SPECIALTY_TAGS.map(tag => {
              const on = chosenSpecialties.includes(tag.toLowerCase());
              return <button key={tag} type="button" aria-pressed={on} onClick={() => toggleSpecialty(tag)}
                className={`inline-flex min-h-8 cursor-pointer items-center rounded-full border px-3 text-caption font-medium transition-colors ${on ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-cs-border bg-cs-surface text-cs-text-2 hover:bg-cs-hover hover:text-cs-text"}`}>{tag}</button>;
            })}
          </div>
        </div>}
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
