import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, Button, DataTable, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, SearchInput, Select, confirmDelete, useAppFeedback, type Column } from "../../components/ui";
import { SearchableSelect, type SelectOption } from "../../components/vehicle/SearchableSelect";
import {
  adminVehicleCatalogApi, type AdminLevel, type CatalogBrand, type CatalogModel, type CatalogStatus, type CatalogTrim, type Paginated,
} from "../../services/vehicleCatalog";

type Row = CatalogBrand | CatalogModel | CatalogTrim;
type Filters = { search: string; status: "" | CatalogStatus; brandId: number | null; modelId: number | null; page: number };
type FormState = { id: number | null; name: string; status: CatalogStatus; brandId: number | null; modelId: number | null; bodyType: string };

const LEVELS: Record<AdminLevel, { tab: string; noun: string; add: string }> = {
  brands: { tab: "Hãng xe", noun: "hãng xe", add: "Thêm hãng xe" },
  models: { tab: "Dòng xe", noun: "dòng xe", add: "Thêm dòng xe" },
  trims: { tab: "Phiên bản", noun: "phiên bản", add: "Thêm phiên bản" },
};
const BODY_TYPES: Record<string, string> = { SEDAN: "Sedan", SUV: "SUV", HATCHBACK: "Hatchback", MPV: "MPV", PICKUP: "Bán tải", OTHER: "Khác" };
const PER_PAGE = 15;
const emptyFilters: Filters = { search: "", status: "", brandId: null, modelId: null, page: 1 };
const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/** Tải danh sách theo khóa yêu cầu; "đang tải" = khóa hiện tại chưa có kết quả. */
function useAdminList(level: AdminLevel, filters: Filters, reload: number) {
  const params = useMemo(() => ({
    page: filters.page, per_page: PER_PAGE, search: filters.search, status: filters.status,
    brand_id: level !== "brands" ? filters.brandId ?? undefined : undefined,
    model_id: level === "trims" ? filters.modelId ?? undefined : undefined,
  }), [level, filters]);
  const key = `${level}|${JSON.stringify(params)}|${reload}`;
  const [state, setState] = useState<{ key: string; page: Paginated<Row> | null; error: string }>({ key: "", page: null, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    adminVehicleCatalogApi.list(level, params, controller.signal)
      .then(page => setState({ key, page: page as Paginated<Row>, error: "" }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ key, page: null, error: errorText(error, "Không tải được danh mục xe.") }); });
    return () => controller.abort();
  }, [key, level, params]);

  const ready = state.key === key;
  // Giữ dữ liệu cũ khi đổi trang/bộ lọc trong CÙNG cấp; đổi tab thì không hiện dữ liệu cấp khác.
  const sameLevel = state.key.startsWith(`${level}|`);
  return { page: ready ? state.page : null, loading: !ready, error: ready ? state.error : "", stale: sameLevel ? state.page : null };
}

/** Danh sách hãng / dòng xe để lọc và chọn cấp cha (tối đa 100 mục mỗi cấp). */
function useParentOptions(level: "brands" | "models", brandId: number | null, enabled: boolean, reload: number) {
  const key = enabled && (level === "brands" || brandId !== null) ? `${level}|${brandId}|${reload}` : null;
  const [state, setState] = useState<{ key: string | null; options: SelectOption[] }>({ key: null, options: [] });

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    adminVehicleCatalogApi.list(level, { per_page: 100, brand_id: level === "models" ? brandId ?? undefined : undefined }, controller.signal)
      .then(page => setState({ key, options: page.data.map(row => ({ value: row.id, label: row.name, hint: row.status === "INACTIVE" ? "Đã ẩn" : undefined })) }))
      .catch(() => { if (!controller.signal.aborted) setState({ key, options: [] }); });
    return () => controller.abort();
  }, [key, level, brandId]);

  return { options: state.key === key ? state.options : [], loading: key !== null && state.key !== key };
}

export default function VehicleCatalog() {
  const { confirm, notify } = useAppFeedback();
  const [level, setLevel] = useState<AdminLevel>("brands");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchText, setSearchText] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = useAdminList(level, filters, reload);
  const brandOptions = useParentOptions("brands", null, level !== "brands" || form !== null, reload);
  const modelFilterOptions = useParentOptions("models", filters.brandId, level === "trims", reload);
  const formModelOptions = useParentOptions("models", form?.brandId ?? null, form !== null && level === "trims" && form.id === null, reload);
  const rows = (list.page ?? list.stale)?.data ?? [];
  const page = list.page ?? list.stale;

  // Gõ tìm kiếm: chờ 300ms rồi mới gọi API.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(current => (current.search === searchText.trim() ? current : { ...current, search: searchText.trim(), page: 1 })), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const switchLevel = (next: AdminLevel, preset: Partial<Filters> = {}) => {
    setLevel(next);
    setSearchText("");
    setFilters({ ...emptyFilters, ...preset });
  };

  const openForm = (row?: Row) => {
    setFormError("");
    if (row) {
      setForm({ id: row.id, name: row.name, status: row.status ?? "ACTIVE", brandId: null, modelId: null, bodyType: (row as CatalogModel).body_type ?? "" });
    } else {
      setForm({ id: null, name: "", status: "ACTIVE", brandId: filters.brandId, modelId: filters.modelId, bodyType: "" });
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    if (!name) return setFormError("Vui lòng nhập tên.");
    if (form.id === null && level === "models" && !form.brandId) return setFormError("Vui lòng chọn hãng xe.");
    if (form.id === null && level === "trims" && !form.modelId) return setFormError("Vui lòng chọn dòng xe.");

    const body: Record<string, unknown> = { name, status: form.status };
    if (level === "models") body.body_type = form.bodyType || null;
    if (form.id === null && level === "models") body.brand_id = form.brandId;
    if (form.id === null && level === "trims") body.model_id = form.modelId;

    setSaving(true);
    setFormError("");
    try {
      const response = form.id === null
        ? await adminVehicleCatalogApi.create(level, body)
        : await adminVehicleCatalogApi.update(level, form.id, body);
      notify(response.message, "success");
      setForm(null);
      setReload(n => n + 1);
    } catch (error) {
      setFormError(errorText(error, "Không lưu được."));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: Row) {
    const next: CatalogStatus = row.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    setBusyId(row.id);
    try {
      await adminVehicleCatalogApi.update(level, row.id, { status: next });
      notify(next === "ACTIVE" ? `Đã hiển thị lại “${row.name}”.` : `Đã ẩn “${row.name}” khỏi bộ chọn xe.`, "success");
      setReload(n => n + 1);
    } catch (error) {
      notify(errorText(error, "Không đổi được trạng thái."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: Row) {
    const ok = await confirm(confirmDelete(`${LEVELS[level].noun} “${row.name}”`,
      "Chỉ xóa được khi phiên bản chưa gắn với hồ sơ xe nào. Nếu đang được dùng, hãy chuyển sang Ẩn."));
    if (!ok) return;
    setBusyId(row.id);
    try {
      const response = await adminVehicleCatalogApi.remove(level, row.id);
      notify(response.message, "success");
      if (rows.length === 1 && filters.page > 1) setFilters(current => ({ ...current, page: current.page - 1 }));
      else setReload(n => n + 1);
    } catch (error) {
      notify(errorText(error, "Không xóa được."), "error");
    } finally {
      setBusyId(null);
    }
  }

  const statusBadge = (row: Row) => row.status === "INACTIVE"
    ? <Badge tone="neutral">Đã ẩn</Badge>
    : <Badge tone="success">Đang hiển thị</Badge>;

  const columns: Column<Row>[] = level === "brands" ? [
    { key: "name", header: "Hãng xe", primary: true, render: row => <span className="font-semibold">{row.name}</span> },
    { key: "models", header: "Dòng xe", align: "right", render: row => (row as CatalogBrand).models_count ?? 0 },
    { key: "trims", header: "Phiên bản", align: "right", render: row => (row as CatalogBrand).trims_count ?? 0 },
    { key: "status", header: "Trạng thái", render: statusBadge },
  ] : level === "models" ? [
    { key: "name", header: "Dòng xe", primary: true, render: row => <span className="font-semibold">{row.name}</span> },
    { key: "brand", header: "Hãng", render: row => (row as CatalogModel).brand?.name ?? "—" },
    { key: "body", header: "Kiểu dáng", hideOnMobile: true, render: row => BODY_TYPES[(row as CatalogModel).body_type ?? ""] ?? "—" },
    { key: "trims", header: "Phiên bản", align: "right", render: row => (row as CatalogModel).trims_count ?? 0 },
    { key: "vehicles", header: "Xe khách", align: "right", render: row => (row as CatalogModel).vehicles_count ?? 0 },
    { key: "status", header: "Trạng thái", render: statusBadge },
  ] : [
    { key: "name", header: "Phiên bản", primary: true, render: row => <span className="font-semibold">{row.name}</span> },
    { key: "model", header: "Dòng xe", render: row => { const model = (row as CatalogTrim).model; return model ? `${model.brand?.name ?? ""} ${model.name}`.trim() : "—"; } },
    { key: "vehicles", header: "Xe khách", align: "right", render: row => (row as CatalogTrim).vehicles_count ?? 0 },
    { key: "status", header: "Trạng thái", render: statusBadge },
  ];

  const hasFilters = Boolean(filters.search || filters.status || filters.brandId || filters.modelId);

  return <main className="page-container" data-testid="admin-vehicle-catalog">
    <PageHeader title="Hãng & dòng xe" description="Hãng xe → Dòng xe → Phiên bản dùng cho bộ chọn xe khi khách đặt lịch và lưu hồ sơ xe. Dữ liệu khởi tạo từ CSV chưa chắc mọi phiên bản đều đang bán."
      actions={<Button variant="primary" icon="plus" onClick={() => openForm()}>{LEVELS[level].add}</Button>}/>

    <div role="tablist" aria-label="Cấp danh mục" className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-control border border-cs-border bg-cs-surface p-1">
      {(Object.keys(LEVELS) as AdminLevel[]).map(key => <button key={key} type="button" role="tab" aria-selected={level === key}
        onClick={() => switchLevel(key)}
        className={`cursor-pointer whitespace-nowrap rounded-control px-4 py-2 text-small font-semibold transition-colors max-sm:min-h-11 ${level === key ? "bg-cs-accent text-cs-accent-contrast" : "text-cs-muted hover:bg-cs-hover hover:text-cs-text"}`}>
        {LEVELS[key].tab}
      </button>)}
    </div>

    <section aria-label="Tìm kiếm và lọc" className="mb-4 grid gap-3 rounded-card border border-cs-border bg-cs-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-cs-text-2">Tìm theo tên</span>
        <SearchInput value={searchText} onChange={setSearchText} placeholder={`Tên ${LEVELS[level].noun}…`} className="sm:max-w-none"/>
      </div>
      <Field label="Trạng thái">
        <Select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value as Filters["status"], page: 1 }))}>
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang hiển thị</option>
          <option value="INACTIVE">Đã ẩn</option>
        </Select>
      </Field>
      {level !== "brands" && <SearchableSelect label="Hãng xe" placeholder="Tất cả hãng" options={brandOptions.options} loading={brandOptions.loading}
        value={filters.brandId} onChange={option => setFilters(current => ({ ...current, brandId: option?.value ?? null, modelId: null, page: 1 }))}/>}
      {level === "trims" && <SearchableSelect label="Dòng xe" placeholder="Tất cả dòng xe" options={modelFilterOptions.options} loading={modelFilterOptions.loading}
        value={filters.modelId} disabled={filters.brandId === null} disabledHint="Chọn hãng để lọc theo dòng xe."
        onChange={option => setFilters(current => ({ ...current, modelId: option?.value ?? null, page: 1 }))}/>}
    </section>

    <DataTable<Row>
      caption={`Danh sách ${LEVELS[level].noun}`}
      columns={columns}
      rows={rows}
      rowKey={row => row.id}
      loading={list.loading}
      error={list.error || undefined}
      onRetry={() => setReload(n => n + 1)}
      empty={<EmptyState title={hasFilters ? "Không có kết quả phù hợp" : `Chưa có ${LEVELS[level].noun}`}
        description={hasFilters ? "Thử đổi từ khóa hoặc bỏ bộ lọc." : undefined}
        action={hasFilters
          ? <Button variant="outline" icon="filter" onClick={() => switchLevel(level)}>Xóa bộ lọc</Button>
          : <Button variant="primary" icon="plus" onClick={() => openForm()}>{LEVELS[level].add}</Button>}/>}
      actions={row => <>
        {level === "brands" && <IconButton icon="arrow-right" label={`Xem dòng xe của ${row.name}`} onClick={() => switchLevel("models", { brandId: row.id })}/>}
        {level === "models" && <IconButton icon="arrow-right" label={`Xem phiên bản của ${row.name}`} onClick={() => switchLevel("trims", { brandId: (row as CatalogModel).brand_id, modelId: row.id })}/>}
        <IconButton icon={row.status === "INACTIVE" ? "eye" : "lock"} label={row.status === "INACTIVE" ? "Hiển thị lại" : "Ẩn khỏi bộ chọn xe"}
          loading={busyId === row.id} disabled={busyId !== null} onClick={() => void toggle(row)}/>
        <IconButton icon="edit" label="Chỉnh sửa" disabled={busyId !== null} onClick={() => openForm(row)}/>
        {level === "trims" && <IconButton icon="trash" tone="danger" label="Xóa phiên bản" disabled={busyId !== null} onClick={() => void remove(row)}/>}
      </>}
      footer={page && <Pagination page={page.current_page} totalPages={page.last_page} totalItems={page.total} pageSize={page.per_page}
        disabled={list.loading} onChange={next => setFilters(current => ({ ...current, page: next }))}/>}
    />

    <Modal open={form !== null} onClose={() => setForm(null)} dismissible={!saving}
      title={form?.id ? `Sửa ${LEVELS[level].noun}` : LEVELS[level].add}
      footer={<>
        <Button variant="secondary" disabled={saving} onClick={() => setForm(null)}>Hủy</Button>
        <Button type="submit" form="vehicle-catalog-form" variant="primary" icon="check" loading={saving} loadingText="Đang lưu...">Lưu</Button>
      </>}>
      {form && <form id="vehicle-catalog-form" onSubmit={event => void submit(event)} className="flex flex-col gap-4">
        {form.id === null && level !== "brands" && <SearchableSelect label="Hãng xe" placeholder="Chọn hãng xe…" required
          options={brandOptions.options} loading={brandOptions.loading} value={form.brandId}
          onChange={option => setForm(current => current && { ...current, brandId: option?.value ?? null, modelId: null })}/>}
        {form.id === null && level === "trims" && <SearchableSelect label="Dòng xe" placeholder="Chọn dòng xe…" required
          options={formModelOptions.options} loading={formModelOptions.loading} value={form.modelId}
          disabled={form.brandId === null} disabledHint="Chọn hãng xe trước."
          onChange={option => setForm(current => current && { ...current, modelId: option?.value ?? null })}/>}
        <Field label={`Tên ${LEVELS[level].noun}`} required hint="Không trùng tên trong cùng cấp cha (không phân biệt hoa/thường).">
          <Input value={form.name} maxLength={level === "trims" ? 150 : 100} autoFocus
            onChange={event => setForm(current => current && { ...current, name: event.target.value })}/>
        </Field>
        {level === "models" && <Field label="Kiểu dáng" optional>
          <Select value={form.bodyType} onChange={event => setForm(current => current && { ...current, bodyType: event.target.value })}>
            <option value="">Chưa phân loại</option>
            {Object.entries(BODY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>}
        <Field label="Trạng thái" hint="Đã ẩn: không xuất hiện trong bộ chọn xe, xe đã lưu vẫn giữ nguyên.">
          <Select value={form.status} onChange={event => setForm(current => current && { ...current, status: event.target.value as CatalogStatus })}>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="INACTIVE">Đã ẩn</option>
          </Select>
        </Field>
        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg">{formError}</p>}
      </form>}
    </Modal>
  </main>;
}
