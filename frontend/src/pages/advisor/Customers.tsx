import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, Modal, Pagination, SearchInput } from "../../components/ui";
import { Badge, ServiceStoppedTag, StatusBadge } from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown } from "../../components/ui/Dropdown";
import { Field, Input } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { dmy, hhmm } from "../../services/catalogAdminApi";
import { createAdvisorCustomer, updateAdvisorCustomer } from "../../services/customerApi";
import { customerDirectoryApi, formatVnd, type CustomerDetail, type CustomerRow, type CustomerSegment, type CustomerTier } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { vehicleTitle } from "./counterForms";
import { OpenOrderButton, PreviewDrawer } from "./advisorListKit";
import { useNarrowDrawer } from "./useNarrowDrawer";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { SendEmailChangeLink } from "./SendEmailChangeLink";
import "./advisorDashboard.css";

/**
 * Khách hàng (cố vấn) — theo mockup PO 17/11/2026: 4 thẻ số liệu (bấm để lọc), danh sách khách dạng thẻ
 * (tìm tên / SĐT / email / biển số), khung chi tiết: liên hệ, khách từ, số xe, tổng chi tiêu (hoá đơn đã thanh toán),
 * hạng khách; tab Xe · Lịch sử dịch vụ · Lịch hẹn · Đánh giá · Ghi chú. Ảnh khách không có trong hệ thống → chữ viết tắt.
 * "Thân thiết" = từ N lượt sửa đã bàn giao (backend `Customer::LOYAL_MIN_VISITS`), chỉ để hiển thị / lọc.
 */

const initials = (name?: string | null) => (name ?? "?").trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();
const TIER: Record<CustomerTier, { label: string; tone: "warning" | "info" | "neutral" }> = {
  LOYAL: { label: "Thân thiết", tone: "warning" }, RETURNING: { label: "Khách quen", tone: "info" }, NEW: { label: "Khách mới", tone: "neutral" },
};
const PER_PAGE = 6;

type FormState = { full_name: string; phone: string; email: string };
const emptyForm: FormState = { full_name: "", phone: "", email: "" };

export default function Customers() {
  const { notify } = useAppFeedback();
  const [params, setParams] = useSearchParams();
  const segment = (["new", "in_shop", "loyal"] as CustomerSegment[]).find(s => s === params.get("segment")) ?? null;
  const selectedParam = Number(params.get("customer")) || null;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CustomerRow | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const query = { search: term, page, per_page: PER_PAGE, segment };
  const list = useAdminQuery(`advisor-customers:${JSON.stringify(query)}:${version}`, signal => customerDirectoryApi.customers(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.page.data ?? [];
  const summary = result?.summary;
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const pickSegment = (next: CustomerSegment | null) => { setParam({ segment: next, customer: null }); setPage(1); };
  // Màn rộng: khung bên phải; màn hẹp: ngăn kéo xem nhanh (cùng cách các trang danh sách khác).
  const drawer = useNarrowDrawer();
  const select = (c: CustomerRow) => { setParam({ customer: String(c.id) }); drawer.show(); };
  const fieldErrors = useFieldErrors();

  function openForm(target: CustomerRow | "new") {
    setEditing(target);
    setForm(target === "new" ? emptyForm : { full_name: target.full_name, phone: target.phone ?? "", email: target.email ?? "" });
    setFormError("");
    fieldErrors.reset();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const problems: FieldErrors = {};
    if (form.full_name.trim().length < 2) problems.full_name = "Nhập họ tên khách.";
    if (!/^[0-9+\s.-]{8,20}$/.test(form.phone.trim())) problems.phone = "Nhập số điện thoại hợp lệ.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) problems.email = "Email không hợp lệ.";
    setFormError("");
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    const payload = { full_name: form.full_name.trim(), phone: form.phone.trim(), email: form.email.trim() || null };
    try {
      if (editing === "new") { await createAdvisorCustomer(payload); notify("Đã thêm khách hàng.", "success"); setPage(1); }
      // Không gửi địa chỉ để giữ nguyên địa chỉ khách tự nhập.
      else { await updateAdvisorCustomer(editing.id, payload); notify("Đã cập nhật khách hàng.", "success"); }
      setEditing(null);
      setVersion(v => v + 1);
    } catch (err) { fieldErrors.showApi(err, { full_name: "full_name", phone: "phone", email: "email" }); }
    finally { setSaving(false); }
  }

  const stats: Array<{ segment: CustomerSegment | null; label: string; icon: IconName; value?: number; tone?: "success" | "warning" }> = [
    { segment: null, label: "Tổng khách hàng", icon: "users", value: summary?.total },
    { segment: "new", label: "Khách hàng mới (30 ngày)", icon: "user", value: summary?.new_30_days, tone: "success" },
    { segment: "in_shop", label: "Có xe đang sửa", icon: "car", value: summary?.in_shop },
    { segment: "loyal", label: "Khách hàng thân thiết", icon: "star", value: summary?.loyal },
  ];
  const segmentLabel = segment ? stats.find(s => s.segment === segment)?.label : null;

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Khách hàng</h1>
    <section className="adv-ro-stats" aria-label="Thống kê khách hàng">
      {stats.map(s => <button key={s.label} type="button" className="adv-card adv-ro-stat" aria-pressed={segment === s.segment} onClick={() => pickSegment(s.segment)}
        title={s.segment === "loyal" && summary?.loyal_min_visits ? `Từ ${summary.loyal_min_visits} lượt sửa đã bàn giao` : undefined}>
        <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold leading-snug text-cs-text-2">{s.label}</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{s.value === undefined ? "–" : s.value.toLocaleString("vi-VN")}</span></span>
      </button>)}
      <button type="button" className="adv-btn-gold adv-ro-create" onClick={() => openForm("new")}><Icon name="plus" size={20}/>Thêm khách hàng</button>
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách khách hàng">
        <header className="adv-ro-list-head"><h2>Danh sách khách hàng</h2></header>
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ customer: null }); }} placeholder="Tìm theo tên, SĐT, email, biển số…" className="adv-ro-search"/>
            <Dropdown label="Lọc nhóm khách" items={[
              { label: "Tất cả khách hàng", icon: segment === null ? "check" : undefined, onSelect: () => pickSegment(null) },
              ...stats.filter(s => s.segment).map(s => ({ label: s.label, icon: segment === s.segment ? "check" as const : undefined, onSelect: () => pickSegment(s.segment) })),
            ]} trigger={props => <button type="button" {...props} aria-label="Lọc nhóm khách" className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border bg-cs-surface text-cs-text-2 hover:border-cs-accent ${segment ? "adv-ro-filter-on" : "border-cs-border"}`}><Icon name="filter" size={18}/></button>}/>
          </div>
          {segmentLabel && <p className="flex items-center gap-2 text-caption text-cs-text-2">Đang lọc: <b className="text-cs-text">{segmentLabel}</b>
            <button type="button" className="font-semibold text-cs-accent-text hover:underline" onClick={() => pickSegment(null)}>Bỏ lọc</button></p>}
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải khách hàng..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="users" title="Không tìm thấy khách hàng" description={term ? "Thử tên, SĐT, email hoặc biển số khác." : "Chưa có khách hàng ở nhóm này."}/>
            : rows.map(c => <button key={c.id} type="button" className="adv-appt adv-ro-item" aria-current={c.id === selectedId} onClick={() => select(c)}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="adv-avatar !h-11 !w-11 !text-[14px]" aria-hidden="true">{initials(c.full_name)}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-small text-cs-text">{c.full_name}</b><span className="block text-caption tabular-nums text-cs-text-2">{c.phone}</span></span>
                <span className="hidden shrink-0 items-center gap-1 text-caption text-cs-text-2 sm:flex"><Icon name="car" size={15}/>{c.vehicles_count} xe</span>
                <span className="w-24 shrink-0 text-right sm:w-28"><span className="block text-caption text-cs-muted">Tổng chi tiêu</span><b className="block text-small tabular-nums text-cs-text">{formatVnd(c.total_spent ?? 0)}</b></span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>)}
        </div>
        {result && result.page.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.page.current_page} totalPages={result.page.last_page} totalItems={result.page.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ customer: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selectedId ? <CustomerPreview key={`${selectedId}-${version}`} id={selectedId} loyalMin={summary?.loyal_min_visits} onEdit={openForm}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một khách ở danh sách.</section>}
      </div>
      {selectedId && <PreviewDrawer open={drawer.open} onClose={drawer.close} title="Hồ sơ khách hàng">
        <CustomerPreview key={`d-${selectedId}-${version}`} id={selectedId} loyalMin={summary?.loyal_min_visits} onEdit={c => { drawer.close(); openForm(c); }}/></PreviewDrawer>}
    </div>

    {editing && <Modal open onClose={() => setEditing(null)} dismissible={!saving} size="sm"
      title={editing === "new" ? "Thêm khách hàng" : "Sửa khách hàng"} description={editing === "new" ? "Khách vãng lai — khách có thể tự tạo tài khoản sau bằng cùng SĐT / email." : editing.full_name}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Huỷ</Button>
        <Button type="submit" form="advisor-customer-form" variant="primary" icon="check" loading={saving}>{editing === "new" ? "Thêm khách" : "Lưu"}</Button>
      </>}>
      <form id="advisor-customer-form" noValidate onSubmit={submit} className="space-y-3">
        <Field label="Họ tên" required error={fieldErrors.errors.full_name}><Input value={form.full_name} maxLength={100} required onChange={e => { setForm({ ...form, full_name: e.target.value }); fieldErrors.clear("full_name"); }}/></Field>
        <Field label="Số điện thoại" required error={fieldErrors.errors.phone}><Input inputMode="tel" value={form.phone} maxLength={20} required onChange={e => { setForm({ ...form, phone: e.target.value }); fieldErrors.clear("phone"); }}/></Field>
        {!(editing !== "new" && editing.has_account) && <Field label="Email" optional error={fieldErrors.errors.email} hint={editing !== "new" && editing?.email ? "Email đã xác minh chỉ quản trị viên được đổi." : "Sau khi lưu, xác minh email bằng mã ở bước lập biên bản nhận xe."}><Input type="email" value={form.email} maxLength={150} onChange={e => { setForm({ ...form, email: e.target.value }); fieldErrors.clear("email"); }}/></Field>}
        {formError && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-small text-danger-fg">{formError}</p>}
      </form>
      {editing !== "new" && editing.has_account && <div className="mt-3"><SendEmailChangeLink customerId={editing.id} currentEmail={editing.email ?? ""}/></div>}
    </Modal>}
  </main>;
}

type Tab = "vehicles" | "history" | "appointments" | "reviews" | "notes";

function serviceSummary(order: CustomerDetail["repair_orders"][number]) {
  const names = order.invoice?.items?.length ? order.invoice.items.map(i => i.description) : (order.work_items ?? []).map(w => w.service?.name || w.description);
  return names.filter(Boolean).join(", ") || "—";
}

function HistoryTable({ orders }: { orders: CustomerDetail["repair_orders"] }) {
  return <div className="overflow-x-auto rounded-xl border border-cs-border"><table className="w-full min-w-[760px] text-small">
    <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
      <th className="px-3 py-2.5 font-semibold">Ngày</th><th className="px-3 py-2.5 font-semibold">Phiếu sửa chữa</th><th className="px-3 py-2.5 font-semibold">Hạng mục</th>
      <th className="px-3 py-2.5 text-right font-semibold">Thành tiền</th><th className="px-3 py-2.5 font-semibold">Trạng thái</th><th className="px-3 py-2.5"><span className="sr-only">Mở phiếu</span></th>
    </tr></thead>
    <tbody className="divide-y divide-cs-border">{orders.map(o => <tr key={o.id} className="text-cs-text">
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{dmy(o.received_at)}</td>
      <td className="whitespace-nowrap px-3 py-2.5"><Link className="font-semibold hover:text-cs-accent-text hover:underline" to={`/advisor/service-orders/${o.id}`}>{o.repair_order_code}</Link>
        <span className="block text-caption text-cs-muted">{o.vehicle?.license_plate || "xxx.xx"}</span></td>
      <td className="max-w-72 px-3 py-2.5"><span className="line-clamp-2">{serviceSummary(o)}</span>
        {o.work_items?.some(w => w.service?.status === "INACTIVE") && <ServiceStoppedTag status="INACTIVE" className="mt-1"/>}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{o.invoice ? formatVnd(o.invoice.total_amount) : "—"}</td>
      <td className="whitespace-nowrap px-3 py-2.5"><StatusBadge domain="repair" status={o.status}/></td>
      <td className="px-3 py-2 text-right"><OpenOrderButton id={o.id}/></td>
    </tr>)}</tbody>
  </table></div>;
}

function CustomerPreview({ id, loyalMin, onEdit }: { id: number; loyalMin?: number; onEdit: (c: CustomerRow) => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("vehicles");
  const detail = useAdminQuery(`advisor-customer:${id}`, signal => customerDirectoryApi.customer(id, signal));
  const c = detail.data;
  if (!c) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải khách hàng..."/>}
  </section>;

  const tier = TIER[c.tier ?? "NEW"];
  const book = () => navigate("/advisor/create-booking", { state: { customer: { id: c.id, full_name: c.full_name, phone: c.phone, email: c.email } } });
  const fact = (icon: IconName, label: string, value: string, extra = "") => <div className={`adv-ro-vehicle !flex items-center gap-3 !p-3.5 ${extra}`}>
    <Icon name={icon} size={24} className="shrink-0 text-cs-muted"/><span className="min-w-0"><span className="block text-caption text-cs-muted">{label}</span><b className="block truncate tabular-nums text-cs-text">{value}</b></span>
  </div>;
  const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: "vehicles", label: `Xe (${c.vehicles.length})`, icon: "car" },
    { id: "history", label: "Lịch sử", icon: "wrench" },
    { id: "appointments", label: "Lịch hẹn", icon: "calendar" },
    { id: "reviews", label: "Đánh giá", icon: "star" },
    { id: "notes", label: "Ghi chú", icon: "file" },
  ];

  return <section className="adv-card adv-ro-detail" aria-label={`Khách hàng ${c.full_name}`}>
    <header className="flex flex-wrap items-start gap-4">
      <span className="adv-avatar !h-20 !w-20 !text-2xl" aria-hidden="true">{initials(c.full_name)}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-title text-cs-text">{c.full_name}</h2>
        <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-small">
          <a className="inline-flex items-center gap-2 tabular-nums text-cs-text hover:text-cs-accent-text" href={`tel:${c.phone}`}><Icon name="phone" size={16} className="text-cs-muted"/>{c.phone}</a>
          {c.email ? <a className="inline-flex min-w-0 items-center gap-2 text-cs-text hover:text-cs-accent-text" href={`mailto:${c.email}`}><Icon name="mail" size={16} className="text-cs-muted"/><span className="truncate">{c.email}</span></a>
            : <span className="inline-flex items-center gap-2 text-cs-muted"><Icon name="mail" size={16}/>Chưa có email</span>}
        </p>
        <p className="mt-1.5">{c.has_account ? <Badge tone="success">Có tài khoản — tự duyệt trên web</Badge> : <Badge tone="neutral">Khách vãng lai — xác nhận qua email</Badge>}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" icon="edit" onClick={() => onEdit(c)}>Chỉnh sửa</Button>
        <Dropdown label="Thao tác khác" items={[
          { label: "Đặt lịch hộ", icon: "calendar", onSelect: book },
          { label: "Quản lý xe của khách", icon: "car", onSelect: () => navigate(`/advisor/customer-cars?customerId=${c.id}`) },
        ]}/>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {fact("calendar", "Khách hàng từ", c.created_at ? new Date(c.created_at).toLocaleDateString("vi-VN") : "—")}
      {fact("car", "Số xe sở hữu", `${c.vehicles_count} xe`)}
      {fact("cash", "Tổng chi tiêu", formatVnd(c.total_spent ?? 0))}
      <div className="adv-ro-vehicle !flex items-center gap-3 !p-3.5 adv-tier" data-tier={c.tier} title={loyalMin ? `Thân thiết: từ ${loyalMin} lượt sửa đã bàn giao (${c.completed_visits ?? 0} lượt)` : undefined}>
        <Icon name="star" size={24} className="shrink-0"/><span className="min-w-0"><span className="block text-caption text-cs-muted">Hạng khách hàng</span><b className="block text-cs-text">{tier.label}</b></span>
      </div>
    </div>

    <div role="tablist" aria-label="Thông tin khách" className="adv-ro-tabs adv-ro-tabs-5">
      {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="adv-ro-tab" onClick={() => setTab(t.id)}><Icon name={t.icon} size={18}/><span>{t.label}</span></button>)}
    </div>

    <div role="tabpanel" className="min-h-[160px] space-y-4">
      {tab === "vehicles" && <>
        {c.vehicles.length ? <div className="grid gap-3 lg:grid-cols-2">{c.vehicles.slice(0, 6).map(v => <Link key={v.id} to={`/advisor/customer-cars?customerId=${c.id}`} className="adv-appt adv-ro-item">
          <span className="flex min-w-0 items-center gap-4">
            <VehicleBrandLogo brand={v.model?.brand?.name} size={52}/>
            <span className="min-w-0 space-y-1"><b className="block truncate text-small text-cs-text">{vehicleTitle(v)}</b>
              <span className="block text-caption tabular-nums text-cs-text-2">{v.license_plate || "xxx.xx"}</span>
              <span className="flex flex-wrap items-center gap-2 text-caption text-cs-muted">{v.year && <span>{v.year}</span>}
                {v.open_repair_order_code ? <Badge tone="success">Đang sửa chữa</Badge> : <Badge tone="neutral">Không ở xưởng</Badge>}</span></span>
          </span>
          <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
        </Link>)}</div> : <p className="text-small text-cs-muted">Khách chưa có xe nào.</p>}
        <div className="flex items-center justify-between gap-2"><h3 className="adv-section-title">Lịch sử dịch vụ gần nhất</h3>
          {c.repair_orders.length > 3 && <button type="button" className="inline-flex items-center gap-1 text-small font-semibold text-cs-accent-text hover:underline" onClick={() => setTab("history")}>Xem tất cả<Icon name="arrow-right" size={15}/></button>}</div>
        {c.repair_orders.length ? <HistoryTable orders={c.repair_orders.slice(0, 3)}/> : <p className="text-small text-cs-muted">Khách chưa sửa xe tại gara.</p>}
      </>}

      {tab === "history" && (c.repair_orders.length ? <>
        <HistoryTable orders={c.repair_orders}/>
        {c.repair_orders_count > c.repair_orders.length && <p className="text-caption text-cs-muted">Hiển thị {c.repair_orders.length} / {c.repair_orders_count} lần sửa gần nhất.</p>}
      </> : <p className="text-small text-cs-muted">Khách chưa sửa xe tại gara.</p>)}

      {tab === "appointments" && <div className="grid gap-4 lg:grid-cols-2">
        {([["Sắp tới", c.appointments], ["Gần đây", c.past_appointments ?? []]] as const).map(([title, items]) => <div key={title} className="rounded-xl border border-cs-border p-4">
          <h3 className="adv-section-title">{title}</h3>
          {items.length ? <ul className="mt-2 space-y-1.5">{items.map(a => <li key={a.id}><Link to={`/advisor/reception?appointment=${a.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-small hover:bg-cs-hover">
            <span className="tabular-nums text-cs-text"><b>{hhmm(a.appointment_time)}</b> - {dmy(a.appointment_date)}</span><StatusBadge domain="appointment" status={a.status}/>
          </Link></li>)}</ul> : <p className="mt-2 text-small text-cs-muted">Không có.</p>}
          {title === "Sắp tới" && <button type="button" className={`${buttonClass({ variant: "outline", size: "sm" })} mt-3`} onClick={book}><Icon name="calendar" size={15}/>Đặt lịch hộ</button>}
        </div>)}
      </div>}

      {tab === "reviews" && ((c.reviews ?? []).length ? <ul className="space-y-3">{(c.reviews ?? []).map(r => <li key={r.id} className="rounded-xl border border-cs-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-warning-fg" aria-label={`${r.overall_rating} sao`}>{"★".repeat(r.overall_rating)}<span className="text-cs-border-strong">{"★".repeat(Math.max(0, 5 - r.overall_rating))}</span></span>
          {r.repair_order && <Link className="text-caption font-semibold text-cs-accent-text hover:underline" to={`/advisor/service-orders/${r.repair_order.id}`}>{r.repair_order.repair_order_code}</Link>}
          <span className="text-caption text-cs-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : ""}</span>
          {r.repair_order && <span className="ml-auto"><OpenOrderButton id={r.repair_order.id}/></span>}
        </div>
        {r.comment && <p className="mt-1.5 text-small text-cs-text">{r.comment}</p>}
        {r.reply && <p className="mt-2 rounded-lg bg-cs-surface-2 px-3 py-2 text-caption text-cs-text-2"><b>Gara phản hồi:</b> {r.reply}</p>}
      </li>)}</ul> : <p className="text-small text-cs-muted">Khách chưa gửi đánh giá.</p>)}

      {tab === "notes" && <dl className="grid gap-4 rounded-xl border border-cs-border p-4 text-small sm:grid-cols-2">
        <div><dt className="text-caption text-cs-muted">Địa chỉ</dt><dd className="mt-1 text-cs-text">{c.address || "Chưa có"}</dd></div>
        <div><dt className="text-caption text-cs-muted">Lần ghé gần nhất</dt><dd className="mt-1 tabular-nums text-cs-text">{c.last_visit_at ? dmy(c.last_visit_at) : "Chưa ghé"}</dd></div>
        <div><dt className="text-caption text-cs-muted">Số lần ghé / đã bàn giao</dt><dd className="mt-1 tabular-nums text-cs-text">{c.repair_orders_count} / {c.completed_visits ?? 0}</dd></div>
        <div><dt className="text-caption text-cs-muted">Xác nhận báo giá, biên bản</dt><dd className="mt-1 text-cs-text">{c.has_account ? "Khách tự xác nhận trong tài khoản" : c.email ? "Mã OTP gửi email khách" : "Cần bổ sung email để gửi mã xác nhận"}</dd></div>
      </dl>}
    </div>
  </section>;
}
