import { useState } from "react";
import { Button, DataTable, ErrorState, Field, Input, LoadingState, Modal, Pagination, SearchInput, type Column } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { adminApi, errorMessage, fmtDate, type AdminCustomer } from "../../services/adminApi";
import { emptySelection, type VehicleSelection } from "../../services/vehicleCatalog";
import { getStatus } from "../../config/status";
import { AdminPage, ClearFilters, FilterSelect, InfoList, PaneSection, Person, Pill, SplitView, Stars, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

type CarFilter = "all" | "has" | "none";
type Draft = { name: string; phone: string; email: string; address: string };
const emptyDraft: Draft = { name: "", phone: "", email: "", address: "" };

/** Khách hàng — dữ liệu thật: /api/admin/customers (danh sách, hồ sơ, khoá), /api/customers và /api/vehicles (thêm/sửa). */
export default function AdminCustomers() {
  const { notify, confirm } = useAppFeedback();
  const [search, setSearch] = useState("");
  const [cars, setCars] = useState<CarFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [vehicleForm, setVehicleForm] = useState<{ selection: VehicleSelection; mileage: string; year: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const term = useDebounced(search.trim());

  const params = { search: term, cars, page }; // không sắp xếp theo cột: mặc định khách mới tạo lên đầu
  const list = useAdminQuery(`customers:${JSON.stringify(params)}`, signal => adminApi.customers(params, signal));
  const detail = useAdminQuery(selectedId === null ? null : `customer:${selectedId}`, signal => adminApi.customer(selectedId as number, signal));
  const result = list.data ?? list.stale;
  const selected = detail.data;
  const refresh = () => { list.reload(); detail.reload(); };

  const columns: Column<AdminCustomer>[] = [
    { key: "name", header: "Khách hàng", primary: true, render: c => <span className="flex items-center gap-2"><Person name={c.name} sub={c.email ?? (c.has_account ? undefined : "Khách vãng lai")}/>{c.locked && <Icon name="lock" size={14} className="shrink-0 text-danger"/>}</span> },
    { key: "phone", header: "SĐT", render: c => <span className="whitespace-nowrap tabular-nums">{c.phone ?? "—"}</span> },
    { key: "cars", header: "Số xe", render: c => <span className="whitespace-nowrap">{c.vehicles_count} xe</span> },
    { key: "last", header: "Lần sửa gần nhất", hideOnMobile: true, render: c => <span className="tabular-nums">{fmtDate(c.last_visit)}</span> },
    { key: "spent", header: "Tổng chi tiêu", align: "right", render: c => <b className="whitespace-nowrap tabular-nums">{vnd(c.total_spent)}</b> },
  ];

  const toggleLock = async (customer: AdminCustomer) => {
    if (!customer.locked && !await confirm({ title: `Khóa khách hàng ${customer.name}?`, description: "Khách sẽ không đăng nhập và đặt lịch online được, mọi phiên đăng nhập bị thu hồi. Lịch sử sửa chữa vẫn được giữ nguyên.", confirmText: "Khóa khách hàng", variant: "danger", confirmIcon: "lock", phone: customer.phone ?? undefined })) return;
    try {
      const response = await adminApi.lockCustomer(customer.id, !customer.locked);
      notify(response.message, "success");
      refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  const saveCustomer = async () => {
    if (!form) return;
    const { draft } = form;
    if (!draft.name.trim() || !/^0\d{9,10}$/.test(draft.phone.trim())) return setFormError("Nhập họ tên và số điện thoại hợp lệ (10–11 số, bắt đầu bằng 0).");
    setSaving(true); setFormError("");
    const body = { full_name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim() || null, address: draft.address.trim() || null };
    try {
      const response = form.id === null ? await adminApi.createCustomer(body) : await adminApi.updateCustomer(form.id, body);
      notify(form.id === null ? "Đã thêm khách hàng." : "Đã cập nhật khách hàng.", "success");
      setForm(null);
      setSelectedId(response.data.id);
      refresh();
    } catch (error) {
      setFormError(errorMessage(error, "Không lưu được khách hàng."));
    } finally {
      setSaving(false);
    }
  };

  const saveVehicle = async () => {
    if (!vehicleForm || selectedId === null) return;
    const odo = vehicleForm.mileage.trim();
    if (vehicleForm.selection.modelId === null) return setFormError("Chọn hãng và dòng xe.");
    if (odo && (!/^\d+$/.test(odo) || Number(odo) > 9_999_999)) return setFormError("ODO phải là số km (số nguyên không âm).");
    setSaving(true); setFormError("");
    try {
      await adminApi.addVehicle({ customer_id: selectedId, model_id: vehicleForm.selection.modelId, trim_id: vehicleForm.selection.trimId, mileage: odo ? Number(odo) : null, year: vehicleForm.year ? Number(vehicleForm.year) : null });
      notify("Đã thêm xe cho khách hàng.", "success");
      setVehicleForm(null);
      refresh();
    } catch (error) {
      setFormError(errorMessage(error, "Không thêm được xe."));
    } finally {
      setSaving(false);
    }
  };

  const pane = selectedId === null ? null : !selected
    ? (detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact/>)
    : <>
      <div className="mb-4 flex items-center gap-3">
        <Person name={selected.name} size={52} sub={selected.has_account ? "Khách hàng có tài khoản" : "Khách vãng lai"}/>
        <span className="ml-auto flex gap-1.5">{selected.locked && <Pill tone="danger" icon="lock">Đã khoá</Pill>}</span>
      </div>
      {(selected.has_account || selected.locked) && <div className="mb-4">
        {selected.locked
          ? <Button variant="outline" size="sm" icon="key" onClick={() => void toggleLock(selected)}>Mở khóa khách hàng</Button>
          : <Button variant="outline" size="sm" icon="lock" onClick={() => void toggleLock(selected)}>Khóa khách hàng</Button>}
      </div>}
      <PaneSection title="Thông tin liên hệ" icon="user" action={<Button variant="ghost" size="sm" icon="edit"
        onClick={() => { setFormError(""); setForm({ id: selected.id, draft: { name: selected.name, phone: selected.phone ?? "", email: selected.email ?? "", address: selected.address ?? "" } }); }}>Chỉnh sửa</Button>}>
        <InfoList items={[{ icon: "phone", value: selected.phone ?? "—" }, { icon: "mail", value: selected.email ?? "—" },
          { label: "Khách từ", value: fmtDate(selected.created_at) }, { label: "Số lần sửa", value: `${selected.visits} lần · ${vnd(selected.total_spent)}` }]}/>
      </PaneSection>
      <PaneSection title={`Danh sách xe (${selected.vehicles.length})`} icon="car" action={<Button variant="ghost" size="sm" icon="plus"
        onClick={() => { setFormError(""); setVehicleForm({ selection: emptySelection, mileage: "", year: "" }); }}>Thêm xe</Button>}>
        {selected.vehicles.length ? <ul className="flex flex-col gap-2">
          {selected.vehicles.map(v => <li key={v.id} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-cs-surface-2 text-cs-accent-text"><Icon name="car" size={24}/></span>
            <span className="min-w-0 flex-1 text-small">
              <b className="block text-cs-text">{[v.brand, v.model, v.trim].filter(Boolean).join(" ") || "Xe chưa rõ dòng"}</b>
              <span className="text-cs-muted">Biển số: <span className="text-cs-text">{v.plate ?? "—"}</span>{v.year ? ` · Năm ${v.year}` : ""}{v.mileage ? ` · ${v.mileage.toLocaleString("vi-VN")} km` : ""}</span>
            </span>
          </li>)}
        </ul> : <p className="text-small text-cs-muted">Khách chưa đăng ký xe.</p>}
      </PaneSection>
      <PaneSection title="Lịch sử dịch vụ" icon="history">
        {selected.history.length ? <ol className="relative ml-1.5 border-l-2 border-cs-border pl-5">
          {selected.history.map((h, i) => <li key={h.id} className="relative pb-3.5 last:pb-0">
            <span className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 ${i ? "border-cs-accent bg-cs-surface" : "border-cs-accent bg-cs-accent"}`}/>
            <div className="flex items-start justify-between gap-3 text-small">
              <div className="min-w-0"><p className="text-caption text-cs-muted">{fmtDate(h.date)} · {h.code} · {getStatus("repair", h.status, "staff").label}</p><p className="font-semibold text-cs-text">{h.title}</p><p className="text-caption text-cs-muted">{h.vehicle}</p></div>
              <b className="shrink-0 tabular-nums text-cs-text">{h.amount ? vnd(h.amount) : "—"}</b>
            </div>
          </li>)}
        </ol> : <p className="text-small text-cs-muted">Chưa có lần sửa chữa nào.</p>}
      </PaneSection>
      {selected.last_review && <PaneSection title="Đánh giá gần nhất" icon="star" action={<span className="text-caption text-cs-muted">{fmtDate(selected.last_review.date)}</span>}>
        <div className="rounded-control bg-cs-surface-2 p-3.5">
          <p className="mb-1.5 flex items-center gap-2"><Stars value={selected.last_review.rating}/><b className="text-small">{selected.last_review.rating.toFixed(1)}</b></p>
          {selected.last_review.comment && <p className="text-small italic text-cs-text-2">“{selected.last_review.comment}”</p>}
        </div>
      </PaneSection>}
    </>;

  const setDraft = (patch: Partial<Draft>) => setForm(current => current && { ...current, draft: { ...current.draft, ...patch } });

  return <AdminPage title="Khách hàng" description="Hồ sơ khách và xe đã đăng ký" demo={false}
    actions={<Button variant="primary" icon="plus" onClick={() => { setFormError(""); setForm({ id: null, draft: emptyDraft }); }}>Thêm khách hàng</Button>}>
    <SplitView paneOpen={selectedId !== null} onClose={() => setSelectedId(null)} paneTitle="Hồ sơ khách hàng" pane={pane}
      list={<>
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên, SĐT, email, biển số…"/>
          <FilterSelect label="Xe" value={cars} onChange={value => { setCars(value); setPage(1); }} options={[{ value: "all", label: "Tất cả" }, { value: "has", label: "Có xe" }, { value: "none", label: "Chưa có xe" }]}/>
          <ClearFilters active={search !== "" || cars !== "all"} onClear={() => { setSearch(""); setCars("all"); setPage(1); }}/>
        </Toolbar>
        <DataTable caption="Danh sách khách hàng" columns={columns} rows={result?.data ?? []} rowKey={c => c.id}
          loading={list.loading} error={list.error || undefined} onRetry={list.reload}
          onRowClick={c => setSelectedId(c.id)} rowClassName={c => c.id === selectedId ? "bg-cs-soft/60" : ""}
          footer={result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}/>
      </>}/>

    <Modal open={form !== null} onClose={() => setForm(null)} dismissible={!saving} title={form?.id ? "Sửa thông tin khách hàng" : "Thêm khách hàng"}
      description={form?.id ? undefined : "Hồ sơ khách tại quầy (khách tự tạo tài khoản khi đăng ký online)."}
      footer={<><Button disabled={saving} onClick={() => setForm(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void saveCustomer()}>Lưu</Button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ tên" required className="sm:col-span-2"><Input value={form.draft.name} maxLength={100} onChange={e => setDraft({ name: e.target.value })}/></Field>
        <Field label="Số điện thoại" required><Input inputMode="tel" value={form.draft.phone} maxLength={11} onChange={e => setDraft({ phone: e.target.value })}/></Field>
        <Field label="Email" optional><Input type="email" value={form.draft.email} onChange={e => setDraft({ email: e.target.value })}/></Field>        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg sm:col-span-2">{formError}</p>}
      </div>}
    </Modal>

    <Modal open={vehicleForm !== null} onClose={() => setVehicleForm(null)} dismissible={!saving} title="Thêm xe cho khách" description={selected?.name}
      footer={<><Button disabled={saving} onClick={() => setVehicleForm(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void saveVehicle()}>Lưu xe</Button></>}>
      {vehicleForm && <div className="flex flex-col gap-4">
        <VehicleSelector columns={1} value={vehicleForm.selection} disabled={saving} onChange={selection => setVehicleForm(current => current && { ...current, selection })}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ODO hiện tại (km)" optional><Input type="number" inputMode="numeric" min={0} step={1} value={vehicleForm.mileage} placeholder="VD: 45000" onChange={e => setVehicleForm(current => current && { ...current, mileage: e.target.value })}/></Field>
          <Field label="Năm sản xuất" optional><Input type="number" min={1990} max={new Date().getFullYear() + 1} value={vehicleForm.year} onChange={e => setVehicleForm(current => current && { ...current, year: e.target.value })}/></Field>
        </div>
        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg">{formError}</p>}
      </div>}
    </Modal>
  </AdminPage>;
}
