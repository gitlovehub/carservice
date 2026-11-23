import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, KmInput, LoadingState, Modal, Pagination, SearchInput } from "../../components/ui";
import { Badge, ServiceStoppedTag, StatusBadge } from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown } from "../../components/ui/Dropdown";
import { Field, Input, Select, Textarea, FieldError } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { SearchableSelect, type SelectOption } from "../../components/vehicle/SearchableSelect";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { createAdvisorVehicle, deleteAdvisorVehicle, updateAdvisorVehicle } from "../../services/advisorVehicleService";
import { dmy, hhmm } from "../../services/catalogAdminApi";
import { emptySelection, vehicleCatalogApi, type CatalogBrand, type VehicleSelection } from "../../services/vehicleCatalog";
import { customerDirectoryApi, formatVnd, type VehicleDetail, type VehicleRow, type VehicleSegment } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { vehicleTitle } from "./counterForms";
import { PreviewDrawer } from "./advisorListKit";
import { useNarrowDrawer } from "./useNarrowDrawer";
import { orderStepPath } from "./repairOrderFlow";
import { errorText } from "./workflowFormat";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import "./advisorDashboard.css";

/**
 * Xe của khách hàng (cố vấn) — theo mockup PO 17/11/2026: thẻ số liệu (tổng, đang sửa, có lịch hẹn sắp tới,
 * xe từng đặt gói bảo dưỡng định kỳ — bấm để lọc), danh sách xe dạng thẻ, khung chi tiết: thông số có trong hồ sơ
 * (hãng, dòng, phiên bản, năm, ODO, VIN — hệ thống không lưu động cơ / nhiên liệu / hộp số), tab Lịch sử dịch vụ ·
 * Lịch hẹn · Thông tin xe · Hình ảnh · Ghi chú; nút Tạo lịch hẹn / Tạo phiếu / Lập báo giá / Xem phiếu gần nhất.
 * Thêm / sửa / xoá xe giữ như ADV-09 (xe đang ở xưởng không xoá được).
 */

type FormState = { customerId: number | null; customerLabel: string; selection: VehicleSelection; plate: string; year: string; mileage: string; vin: string; note: string };
const emptyForm: FormState = { customerId: null, customerLabel: "", selection: emptySelection, plate: "", year: "", mileage: "", vin: "", note: "" };
const PER_PAGE = 6;
const SEGMENT_LABEL: Record<VehicleSegment, string> = { in_shop: "Đang ở xưởng", upcoming: "Có lịch hẹn sắp tới", maintenance: "Bảo dưỡng định kỳ" };

function formFrom(v: VehicleRow): FormState {
  return {
    customerId: v.customer_id, customerLabel: v.customer ? `${v.customer.full_name} · ${v.customer.phone ?? ""}` : "",
    selection: {
      brandId: v.model?.brand?.id ?? null, brandName: v.model?.brand?.name ?? "",
      modelId: v.model?.id ?? null, modelName: v.model?.name ?? "",
      trimId: v.trim?.id ?? null, trimName: v.trim?.name ?? "",
    },
    plate: v.license_plate ?? "", year: v.year ? String(v.year) : "", mileage: v.mileage != null ? String(v.mileage) : "", vin: v.vin ?? "", note: v.note ?? "",
  };
}

const modelName = (v: VehicleRow) => [v.model?.brand?.name, v.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";
function stateBadge(v: VehicleRow): { tone: "success" | "info" | "neutral"; icon: IconName; label: string } {
  if (v.open_repair_order_code) return { tone: "success", icon: "wrench", label: "Đang ở xưởng" };
  if (v.next_appointment_date) return { tone: "info", icon: "calendar", label: "Có lịch hẹn" };
  return { tone: "neutral", icon: "clock", label: "Hoạt động" };
}

export default function CustomerCars() {
  const { confirm, notify } = useAppFeedback();
  const [params, setParams] = useSearchParams();
  const customerId = Number(params.get("customerId")) || null;
  const segment = (Object.keys(SEGMENT_LABEL) as VehicleSegment[]).find(s => s === params.get("segment")) ?? null;
  const selectedParam = Number(params.get("vehicle")) || null;
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("all");
  const [page, setPage] = useState(1);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [customerOptions, setCustomerOptions] = useState<SelectOption[] | null>(null);
  const [editing, setEditing] = useState<VehicleRow | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const fieldErrors = useFieldErrors();
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  useEffect(() => {
    let active = true;
    vehicleCatalogApi.brands().then(list => { if (active) setBrands(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const query = { search: term, brand_id: brandId, customer_id: customerId, segment, page, per_page: PER_PAGE };
  const list = useAdminQuery(`advisor-vehicles:${JSON.stringify(query)}:${version}`, signal => customerDirectoryApi.vehiclePage(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.page.data ?? [];
  const summary = result?.summary;
  const owner = customerId ? rows[0]?.customer : null;
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const pickSegment = (next: VehicleSegment | null) => { setParam({ segment: next, vehicle: null }); setPage(1); };
  // Màn rộng: khung bên phải; màn hẹp: ngăn kéo xem nhanh (cùng cách các trang danh sách khác).
  const drawer = useNarrowDrawer();
  const select = (v: VehicleRow) => { setParam({ vehicle: String(v.id) }); drawer.show(); };

  function loadCustomers() {
    if (customerOptions) return;
    customerDirectoryApi.customers({ per_page: 100 })
      .then(r => setCustomerOptions(r.page.data.map(c => ({ value: c.id, label: c.full_name, hint: c.phone ?? undefined }))))
      .catch(() => setCustomerOptions([]));
  }

  function openForm(target: VehicleRow | "new") {
    loadCustomers();
    setEditing(target);
    setForm(target === "new" ? { ...emptyForm, customerId, customerLabel: owner ? owner.full_name : "" } : formFrom(target));
    setFormError("");
    fieldErrors.reset();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const problems: FieldErrors = {};
    if (!form.customerId) problems.customer = "Chọn chủ xe.";
    if (!form.selection.modelId) problems.model = "Chọn hãng và dòng xe.";
    setFormError("");
    if (fieldErrors.show(problems) || !form.customerId || !form.selection.modelId) return;
    setSaving(true);
    const payload = {
      customer_id: form.customerId, model_id: form.selection.modelId, trim_id: form.selection.trimId,
      license_plate: form.plate.trim().toUpperCase() || null, year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null, vin: form.vin.trim() || null, note: form.note.trim() || null,
    };
    try {
      if (editing === "new") { await createAdvisorVehicle(payload); notify("Đã thêm xe.", "success"); setPage(1); }
      else { await updateAdvisorVehicle(editing.id, payload); notify("Đã cập nhật xe.", "success"); }
      setEditing(null);
      setVersion(v => v + 1);
    } catch (err) {
      fieldErrors.showApi(err, { customer_id: "customer", model_id: "model", trim_id: "model", license_plate: "plate", year: "year", mileage: "mileage", vin: "vin", note: "note" });
    }
    finally { setSaving(false); }
  }

  async function remove(v: VehicleRow) {
    const approved = await confirm({
      title: "Xoá xe khỏi danh sách", reference: v.license_plate || "xxx.xx", variant: "danger", confirmText: "Xoá xe",
      description: `Xe ${vehicleTitle(v)} của ${v.customer?.full_name ?? "khách"} sẽ bị ẩn khỏi danh sách. Lịch sử sửa chữa vẫn được lưu.`,
    });
    if (!approved) return;
    try { await deleteAdvisorVehicle(v.id); notify("Đã xoá xe.", "success"); setParam({ vehicle: null }); setVersion(n => n + 1); }
    catch (err) { notify(errorText(err), "error"); }
  }

  const stats: Array<{ segment: VehicleSegment | null; label: string; icon: IconName; value?: number; tone?: "success"; title?: string }> = [
    { segment: null, label: "Tổng số xe", icon: "car", value: summary?.total },
    { segment: "in_shop", label: "Đang ở xưởng", icon: "wrench", value: summary?.in_shop, tone: "success" },
    { segment: "upcoming", label: "Lịch hẹn sắp tới", icon: "calendar", value: summary?.upcoming },
    { segment: "maintenance", label: "Xe bảo dưỡng định kỳ", icon: "star", value: summary?.maintenance, title: "Xe từng đặt gói bảo dưỡng định kỳ tại gara" },
  ];

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Xe của khách hàng</h1>
    <section className="adv-ro-stats" aria-label="Thống kê xe">
      {stats.map(s => <button key={s.label} type="button" title={s.title} className="adv-card adv-ro-stat" aria-pressed={segment === s.segment} onClick={() => pickSegment(s.segment)}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold leading-snug text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{s.value === undefined ? "–" : s.value.toLocaleString("vi-VN")}</span></span>
      </button>)}
      <button type="button" className="adv-btn-gold adv-ro-create" onClick={() => openForm("new")}><Icon name="plus" size={20}/>Thêm xe</button>
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách xe">
        <header className="adv-ro-list-head"><h2>Danh sách xe</h2></header>
        <div className="space-y-2.5 p-4">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ vehicle: null }); }} placeholder="Tìm theo biển số, khách hàng, mẫu xe, VIN…" className="adv-ro-search"/>
          <div className="grid grid-cols-2 gap-2">
            <Select aria-label="Hãng xe" value={brandId} onChange={e => { setBrandId(e.target.value); setPage(1); setParam({ vehicle: null }); }}>
              <option value="all">Tất cả hãng xe</option>{brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </Select>
            <Select aria-label="Tình trạng xe" value={segment ?? ""} onChange={e => pickSegment((e.target.value || null) as VehicleSegment | null)}>
              <option value="">Tất cả trạng thái</option>{(Object.keys(SEGMENT_LABEL) as VehicleSegment[]).map(s => <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>)}
            </Select>
          </div>
          {customerId && <p className="flex flex-wrap items-center gap-2 text-caption text-cs-text-2"><Icon name="user" size={14}/>Chủ xe: <b className="text-cs-text">{owner?.full_name ?? `#${customerId}`}</b>
            <button type="button" className="font-semibold text-cs-accent-text hover:underline" onClick={() => { setParam({ customerId: null, vehicle: null }); setPage(1); }}>Bỏ lọc</button></p>}
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải xe..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="car" title="Không tìm thấy xe" description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc."/>
            : rows.map(v => { const b = stateBadge(v); return <button key={v.id} type="button" className="adv-appt adv-ro-item" aria-current={v.id === selectedId} onClick={() => select(v)}>
              <span className="flex min-w-0 items-center gap-3">
                <VehicleBrandLogo brand={v.model?.brand?.name} size={48}/>
                <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{modelName(v)}</b>
                  <span className="block text-caption tabular-nums tracking-wide text-cs-text">{v.license_plate || "xxx.xx"}</span>
                  <span className="block truncate text-caption text-cs-text-2">{v.customer?.full_name ?? "—"}</span></span>
                <Badge tone={b.tone} className="shrink-0">{b.label}</Badge>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>; })}
        </div>
        {result && result.page.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.page.current_page} totalPages={result.page.last_page} totalItems={result.page.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ vehicle: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selectedId ? <VehiclePreview key={`${selectedId}-${version}`} id={selectedId} onEdit={openForm} onDelete={v => void remove(v)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một xe ở danh sách.</section>}
      </div>
      {selectedId && <PreviewDrawer open={drawer.open} onClose={drawer.close} title="Hồ sơ xe">
        <VehiclePreview key={`d-${selectedId}-${version}`} id={selectedId} onEdit={v => { drawer.close(); openForm(v); }} onDelete={v => { drawer.close(); void remove(v); }}/></PreviewDrawer>}
    </div>

    {editing && <Modal open onClose={() => setEditing(null)} dismissible={!saving} size="lg"
      title={editing === "new" ? "Thêm xe" : "Sửa thông tin xe"} description={editing === "new" ? "Chọn chủ xe và dòng xe từ danh mục." : editing.license_plate || "xxx.xx"}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Huỷ</Button>
        <Button type="submit" form="advisor-vehicle-form" variant="primary" icon="check" loading={saving}>{editing === "new" ? "Thêm xe" : "Lưu"}</Button>
      </>}>
      <form id="advisor-vehicle-form" noValidate onSubmit={submit} className="space-y-4">
        <SearchableSelect label="Chủ xe" required error={fieldErrors.errors.customer} placeholder="Tìm tên hoặc SĐT khách…" value={form.customerId}
          options={customerOptions ?? []} loading={customerOptions === null} fallbackLabel={form.customerLabel}
          onChange={option => { setForm({ ...form, customerId: option?.value ?? null, customerLabel: option?.label ?? "" }); fieldErrors.clear("customer"); }}/>
        <div role="group" aria-label="Hãng và dòng xe" aria-invalid={!!fieldErrors.errors.model || undefined} className={fieldErrors.errors.model ? "rounded-xl border border-danger p-3" : undefined}>
          <VehicleSelector value={form.selection} onChange={selection => { setForm({ ...form, selection }); fieldErrors.clear("model"); }}/>
          <FieldError className="mt-1.5">{fieldErrors.errors.model}</FieldError>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Biển số" optional error={fieldErrors.errors.plate}><Input value={form.plate} maxLength={20} className="uppercase" placeholder="VD: 51K-123.45" onChange={e => { setForm({ ...form, plate: e.target.value }); fieldErrors.clear("plate"); }}/></Field>
          <Field label="Năm sản xuất" optional error={fieldErrors.errors.year}><Input inputMode="numeric" maxLength={4} value={form.year} placeholder="VD: 2020" onChange={e => { setForm({ ...form, year: e.target.value.replace(/\D/g, "") }); fieldErrors.clear("year"); }}/></Field>
          <Field label="Số km (ODO)" optional error={fieldErrors.errors.mileage}><KmInput label="Số km (ODO)" value={form.mileage} onChange={mileage => { setForm({ ...form, mileage }); fieldErrors.clear("mileage"); }}/></Field>
        </div>
        <Field label="Số khung (VIN)" optional error={fieldErrors.errors.vin}><Input value={form.vin} maxLength={50} className="uppercase" onChange={e => { setForm({ ...form, vin: e.target.value }); fieldErrors.clear("vin"); }}/></Field>
        <Field label="Ghi chú" optional error={fieldErrors.errors.note}><Textarea rows={2} value={form.note} onChange={e => { setForm({ ...form, note: e.target.value }); fieldErrors.clear("note"); }}/></Field>
        {formError && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-small text-danger-fg">{formError}</p>}
      </form>
    </Modal>}
  </main>;
}

type Tab = "history" | "appointments" | "info" | "photos" | "notes";

function serviceSummary(order: VehicleDetail["repair_orders"][number]) {
  const names = order.invoice?.items?.length ? order.invoice.items.map(i => i.description) : (order.work_items ?? []).map(w => w.service?.name || w.description);
  return names.filter(Boolean).join(", ") || "—";
}

function VehiclePreview({ id, onEdit, onDelete }: { id: number; onEdit: (v: VehicleRow) => void; onDelete: (v: VehicleRow) => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("history");
  const detail = useAdminQuery(`advisor-vehicle:${id}`, signal => customerDirectoryApi.vehicle(id, signal));
  const v = detail.data;
  if (!v) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải xe..."/>}
  </section>;

  const open = v.open_repair_order;
  const latest = v.repair_orders[0];
  const status = open ? { tone: "success" as const, label: "Đang ở xưởng" } : v.upcoming_appointments.length ? { tone: "info" as const, label: "Có lịch hẹn" } : { tone: "neutral" as const, label: "Hoạt động" };
  const book = () => navigate("/advisor/create-booking", { state: { customer: v.customer ? { id: v.customer.id, full_name: v.customer.full_name, phone: v.customer.phone, email: v.customer.email } : undefined } });
  const facts: Array<[IconName, string, ReactNode]> = [
    ["tag", "Hãng xe", v.model?.brand?.name ?? "—"], ["car", "Dòng xe", v.model?.name ?? "—"], ["layers", "Phiên bản", v.trim?.name || v.variant || "—"],
    ["calendar", "Năm", v.year ?? "—"], ["gauge", "ODO", v.mileage != null ? `${v.mileage.toLocaleString("vi-VN")} km` : "—"], ["key", "VIN", v.vin || "—"],
  ];
  const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: "history", label: "Lịch sử", icon: "clock" }, { id: "appointments", label: "Lịch hẹn", icon: "calendar" },
    { id: "info", label: "Thông tin xe", icon: "car" }, { id: "photos", label: "Hình ảnh", icon: "eye" }, { id: "notes", label: "Ghi chú", icon: "file" },
  ];

  return <section className="adv-card adv-ro-detail" aria-label={`Xe ${v.license_plate ?? ""}`}>
    <header className="flex flex-wrap items-start gap-4">
      <span className="grid h-24 w-28 shrink-0 place-items-center rounded-2xl border border-cs-border bg-cs-surface-2" aria-hidden="true"><VehicleBrandLogo brand={v.model?.brand?.name} size={72}/></span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-title text-cs-text">{modelName(v)}</h2><Badge tone={status.tone}>{status.label}</Badge></div>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small">
          <span className="inline-flex items-center gap-2 rounded-lg border border-cs-border px-3 py-1 font-semibold tabular-nums tracking-wide text-cs-text"><Icon name="car" size={16} className="text-cs-muted"/>{v.license_plate || "xxx.xx"}</span>
          {v.customer && <Link to={`/advisor/customers?customer=${v.customer.id}`} className="inline-flex items-center gap-2 text-cs-text hover:text-cs-accent-text hover:underline"><Icon name="user" size={16} className="text-cs-muted"/>Khách hàng: {v.customer.full_name}</Link>}
          {v.customer?.phone && <a href={`tel:${v.customer.phone}`} className="inline-flex items-center gap-2 tabular-nums text-cs-text hover:text-cs-accent-text"><Icon name="phone" size={16} className="text-cs-muted"/>{v.customer.phone}</a>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" icon="edit" onClick={() => onEdit(v)}>Chỉnh sửa</Button>
        <Dropdown label="Thao tác khác" items={[
          { label: "Xem hồ sơ khách", icon: "user", onSelect: () => navigate(`/advisor/customers?customer=${v.customer_id}`) },
          { type: "separator" },
          { label: open ? "Xoá xe (đang ở xưởng — không xoá được)" : "Xoá xe", icon: "trash", danger: true, disabled: !!open, onSelect: () => onDelete(v) },
        ]}/>
      </div>
    </header>

    <div className="adv-veh-facts">{facts.map(([icon, label, value]) => <div key={label} className="flex min-w-0 items-center gap-3">
      <Icon name={icon} size={22} className="shrink-0 text-cs-muted"/><span className="min-w-0"><span className="block text-caption text-cs-muted">{label}</span><b className="block truncate tabular-nums text-cs-text">{value}</b></span>
    </div>)}</div>

    <div role="tablist" aria-label="Thông tin xe" className="adv-ro-tabs adv-ro-tabs-5">
      {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="adv-ro-tab" onClick={() => setTab(t.id)}><Icon name={t.icon} size={18}/><span>{t.label}</span></button>)}
    </div>

    <div role="tabpanel" className="min-h-[200px]">
      {tab === "history" && (v.repair_orders.length ? <ul className="space-y-2">{v.repair_orders.map(o => <li key={o.id}>
        <Link to={orderStepPath(o.id)} className={`adv-veh-row ${open?.id === o.id ? "adv-veh-row-open" : ""}`}>
          <Icon name="clock" size={18} className="shrink-0 text-cs-muted"/>
          <span className="w-24 shrink-0 tabular-nums text-cs-text">{dmy(o.received_at)}</span>
          <span className="w-36 shrink-0 font-semibold text-cs-text" title={o.repair_order_code}>{o.repair_order_code}</span>
          <span className="min-w-0 flex-1 truncate text-cs-text-2" title={serviceSummary(o)}>{serviceSummary(o)}</span>
          {o.work_items?.some(w => w.service?.status === "INACTIVE") && <ServiceStoppedTag status="INACTIVE"/>}
          <b className="w-28 shrink-0 text-right tabular-nums text-cs-text">{o.invoice ? formatVnd(o.invoice.total_amount) : "—"}</b>
          <span className="w-40 shrink-0 text-right"><StatusBadge domain="repair" status={o.status}/></span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-cs-muted"/>
        </Link>
      </li>)}{v.repair_orders_count > v.repair_orders.length && <li className="text-caption text-cs-muted">Hiển thị {v.repair_orders.length} / {v.repair_orders_count} lần sửa gần nhất.</li>}</ul>
        : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">Xe chưa sửa tại gara.</p>)}

      {tab === "appointments" && <div className="grid gap-4 lg:grid-cols-2">
        {([["Sắp tới", v.upcoming_appointments], ["Gần đây", v.past_appointments]] as const).map(([title, items]) => <div key={title} className="rounded-xl border border-cs-border p-4">
          <h3 className="adv-section-title">{title}</h3>
          {items.length ? <ul className="mt-2 space-y-1.5">{items.map(a => <li key={a.id}><Link to={`/advisor/reception?appointment=${a.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-small hover:bg-cs-hover">
            <span className="min-w-0"><span className="tabular-nums text-cs-text"><b>{hhmm(a.appointment_time)}</b> - {dmy(a.appointment_date)}</span>
              {a.packages?.length ? <span className="block truncate text-caption text-cs-muted">{a.packages.map(p => p.name).join(", ")}</span> : null}</span>
            <StatusBadge domain="appointment" status={a.status}/>
          </Link></li>)}</ul> : <p className="mt-2 text-small text-cs-muted">Không có.</p>}
        </div>)}
      </div>}

      {tab === "info" && <dl className="grid gap-4 rounded-xl border border-cs-border p-4 text-small sm:grid-cols-2">
        {[["Hãng / dòng / phiên bản", vehicleTitle(v)], ["Biển số", v.license_plate || "xxx.xx"], ["Năm sản xuất", v.year ?? "—"],
          ["Số km (ODO) ghi nhận", v.mileage != null ? `${v.mileage.toLocaleString("vi-VN")} km` : "—"], ["Số khung (VIN)", v.vin || "—"],
          ["Chủ xe", v.customer ? `${v.customer.full_name} · ${v.customer.phone ?? ""}` : "—"], ["Số lần sửa tại gara", v.repair_orders_count],
          ["Thêm vào hệ thống", v.created_at ? new Date(v.created_at).toLocaleDateString("vi-VN") : "—"]].map(([label, value]) =>
          <div key={String(label)}><dt className="text-caption text-cs-muted">{label}</dt><dd className="mt-1 tabular-nums text-cs-text">{value}</dd></div>)}
        <p className="text-caption text-cs-muted sm:col-span-2">Động cơ, nhiên liệu, hộp số chưa có trong hồ sơ xe.</p>
      </dl>}

      {tab === "photos" && (latest ? <PhotoUploader type="repair_order" id={latest.id} readOnly title={`Ảnh lần sửa gần nhất (${latest.repair_order_code})`}/>
        : <p className="text-small text-cs-muted">Chưa có ảnh — ảnh được chụp trong các lần sửa tại gara.</p>)}

      {tab === "notes" && <div className="rounded-xl border border-cs-border p-4 text-small">
        <p className="whitespace-pre-wrap text-cs-text font-medium">{v.note || "Chưa có ghi chú cho xe này."}</p>
        <button type="button" className={`${buttonClass({ variant: "ghost", size: "sm" })} mt-3`} onClick={() => onEdit(v)}><Icon name="edit" size={15}/>Sửa ghi chú</button>
      </div>}
    </div>

    <footer className="adv-ro-footer justify-end!">
      <span className="cs-btn-row">
        <Button variant="outline" icon="calendar" onClick={book}>Tạo lịch hẹn</Button>
        {!open && <Link className={buttonClass({ variant: "outline" })} to="/advisor/reception?mode=walk-in"><Icon name="clipboard" size={16}/>Tạo phiếu sửa chữa</Link>}
        {latest && <Link className="adv-btn-gold" to={orderStepPath((open ?? latest).id)}><Icon name="arrow-right" size={18}/>{open ? "Xem phiếu đang sửa" : "Xem chi tiết phiếu gần nhất"}</Link>}
      </span>
    </footer>
  </section>;
}
