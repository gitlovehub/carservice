import { ToastError } from "../../components/ui/ToastError";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, DataTable, EmptyState, Field, IconButton, Input, Modal, NEWEST_FIRST, PageHeader, Pagination, SearchInput, Select, Switch, confirmDelete, useAppFeedback, useTableSort, type Column, type SortState } from "../../components/ui";
import { SearchableSelect, type SelectOption } from "../../components/vehicle/SearchableSelect";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { Icon } from "../../components/ui/Icon";
import { useAdminQuery } from "./kit/useAdminQuery";
import { fmtDate, fmtDateTime } from "../../services/adminApi";
import {
  adminVehicleCatalogApi, brandLogoUrl, loadBrandLogos, type AdminLevel, type CatalogBrand, type CatalogModel, type CatalogStatus, type CatalogTrim, type Paginated,
} from "../../services/vehicleCatalog";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { userErrorMessage } from "../../services/apiError";

type Row = CatalogBrand | CatalogModel | CatalogTrim;
type Filters = { search: string; status: "" | CatalogStatus; brandId: number | null; modelId: number | null; page: number };
type FormState = {
  id: number | null; name: string; status: CatalogStatus; brandId: number | null; modelId: number | null; bodyType: string;
  /** Logo hãng: link Admin dán, ảnh mới đã xử lý (base64), logo đang lưu (phiên bản), có bỏ logo không. */
  logoLink: string; logoPng: string | null; logoVersion: number | null;
};
const emptyLogo = { logoLink: "", logoPng: null, logoVersion: null };
/** Logo hãng cạnh tên trong ô chọn hãng. */
const brandIcon = (name: string) => <VehicleBrandLogo brand={name} size={24}/>;

const LEVELS: Record<AdminLevel, { tab: string; noun: string; add: string }> = {
  brands: { tab: "Hãng xe", noun: "hãng xe", add: "Thêm hãng xe" },
  models: { tab: "Dòng xe", noun: "dòng xe", add: "Thêm dòng xe" },
  trims: { tab: "Phiên bản", noun: "phiên bản", add: "Thêm phiên bản" },
};
const BODY_TYPES: Record<string, string> = { SEDAN: "Sedan", SUV: "SUV", HATCHBACK: "Hatchback", MPV: "MPV", PICKUP: "Bán tải", OTHER: "Khác" };
const PER_PAGE = 15;
const emptyFilters: Filters = { search: "", status: "", brandId: null, modelId: null, page: 1 };
const errorText = (error: unknown, fallback: string) => (userErrorMessage(error, fallback));

/** Tải danh sách theo khóa yêu cầu; "đang tải" = khóa hiện tại chưa có kết quả. */
function useAdminList(level: AdminLevel, filters: Filters, reload: number, sort: SortState) {
  const params = useMemo(() => ({
    page: filters.page, per_page: PER_PAGE, search: filters.search, status: filters.status,
    brand_id: level !== "brands" ? filters.brandId ?? undefined : undefined,
    model_id: level === "trims" ? filters.modelId ?? undefined : undefined,
    sort: sort.key, dir: sort.dir,
  }), [level, filters, sort]);
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
    adminVehicleCatalogApi.list(level, { per_page: 100, sort: "name", dir: "asc", brand_id: level === "models" ? brandId ?? undefined : undefined }, controller.signal)
      .then(page => setState({ key, options: page.data.map(row => ({ value: row.id, label: row.name, hint: row.status === "INACTIVE" ? "Đã ẩn" : undefined })) }))
      .catch(() => { if (!controller.signal.aborted) setState({ key, options: [] }); });
    return () => controller.abort();
  }, [key, level, brandId]);

  return { options: state.key === key ? state.options : [], loading: key !== null && state.key !== key };
}

/**
 * Logo hãng trong modal: dán link ảnh → "Xử lý ảnh" (server tách nền thành PNG trong suốt, cắt gọn 256²)
 * → xem trước trên nền sáng và nền tối → bấm Lưu mới ghi. Chưa có logo tải lên thì dùng logo có sẵn / chữ cái đầu.
 */
function BrandLogoField({ form, busy, error, onLink, onProcess }: {
  form: FormState; busy: boolean; error: string;
  onLink: (link: string) => void; onProcess: (file?: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFile = (file: File | null | undefined) => { if (file) onProcess(file); };
  const preview = form.logoPng
    ? `data:image/png;base64,${form.logoPng}`
    : form.id !== null && form.logoVersion ? brandLogoUrl(form.id, form.logoVersion) : null;
  const status = form.logoPng ? "Logo mới — bấm Lưu để áp dụng"
    : preview ? "Logo đang dùng — tải ảnh khác để thay"
    : form.id === null ? "Bắt buộc — chưa có logo" : "Chưa có logo tải lên — đang dùng logo có sẵn hoặc chữ cái đầu";

  // Bắt buộc khi thêm hãng mới; hãng có sẵn (nhập từ CSV) chưa có logo vẫn sửa / ẩn được.
  return <Field label="Logo hãng" required={form.id === null} error={error} hint="Tải ảnh lên, dán link hoặc dán ảnh (Ctrl+V) — PNG, JPG, WebP… tối đa 5MB. Hệ thống tự tách nền thành PNG trong suốt và cắt gọn vào khung vuông.">
    <div className="flex flex-col gap-3"
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); pickFile(event.dataTransfer.files[0]); }}>
      <div className="flex items-center gap-3">
        {/* Xem trên nền sáng và nền tối để soi viền sót màu nền. */}
        {[["bg-white", "Nền sáng"], ["bg-[#1f2329]", "Nền tối"]].map(([bg, label]) => (
          <span key={label} title={label} className={`flex size-16 shrink-0 items-center justify-center rounded-control border border-cs-border ${bg}`}>
            {preview
              ? <img src={preview} alt={`Logo ${form.name}`} className="size-full object-contain p-1.5"/>
              : bg === "bg-white" ? <VehicleBrandLogo brand={form.name} size={52}/> : <Icon name="tag" size={20} className="text-white/40"/>}
          </span>
        ))}
        <div className="min-w-0 flex-1">
          <p className={`text-small ${!preview && form.id === null ? "font-semibold text-danger-fg" : "text-cs-text-2"}`}>{status}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <Input value={form.logoLink} placeholder="Dán link https://…/logo.png hoặc dán ảnh" inputMode="url" onChange={event => onLink(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onProcess(); } }}
            // Dán ảnh đã sao chép (chụp màn hình, "Copy image") thẳng vào ô này.
            onPaste={event => { const file = [...event.clipboardData.files].find(f => f.type.startsWith("image/")); if (file) { event.preventDefault(); pickFile(file); } }}/>
        </div>
        <Button variant="secondary" icon="refresh" loading={busy && !!form.logoLink.trim()} loadingText="Đang xử lý..." disabled={busy || !form.logoLink.trim()} onClick={() => onProcess()} className="shrink-0">Xử lý link</Button>
        <Button variant="secondary" icon="upload" loading={busy && !form.logoLink.trim()} loadingText="Đang xử lý..." disabled={busy} onClick={() => fileRef.current?.click()} className="shrink-0">Tải ảnh lên</Button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif" hidden
          onChange={event => { pickFile(event.target.files?.[0]); event.target.value = ""; }}/>
      </div>
    </div>
  </Field>;
}

export default function VehicleCatalog() {
  const { confirm, notify } = useAppFeedback();
  const [level, setLevel] = useState<AdminLevel>("brands");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [searchText, setSearchText] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const fieldErrors = useFieldErrors();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");

  // Mặc định mới tạo lên đầu; đổi cột sắp xếp thì về trang 1.
  const tableSort = useTableSort(NEWEST_FIRST, () => setFilters(current => ({ ...current, page: 1 })));
  const list = useAdminList(level, filters, reload, tableSort.sort);
  const brandOptions = useParentOptions("brands", null, level !== "brands" || form !== null, reload);
  const modelFilterOptions = useParentOptions("models", filters.brandId, level === "trims", reload);
  const formModelOptions = useParentOptions("models", form?.brandId ?? null, form !== null && level === "trims" && form.id === null, reload);
  const summaryQuery = useAdminQuery(`vehicle-catalog-summary:${reload}`, signal => adminVehicleCatalogApi.summary(signal));
  const summary = summaryQuery.data ?? summaryQuery.stale;
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
    tableSort.setSort(NEWEST_FIRST);
  };

  const openForm = (row?: Row) => {
    setFormError("");
    fieldErrors.reset();
    setLogoError("");
    if (row) {
      setForm({ id: row.id, name: row.name, status: row.status ?? "ACTIVE", brandId: null, modelId: null, bodyType: (row as CatalogModel).body_type ?? "",
        ...emptyLogo, logoVersion: (row as CatalogBrand).logo_version ?? null });
    } else {
      setForm({ id: null, name: "", status: "ACTIVE", brandId: filters.brandId, modelId: filters.modelId, bodyType: "", ...emptyLogo });
    }
  };

  /** Dán link / tải file ảnh → server tách nền + cắt gọn → xem trước (chưa lưu, bấm Lưu mới ghi vào hãng). */
  async function processLogo(file?: File) {
    const link = form?.logoLink.trim();
    if (!file && !link) return setLogoError("Dán link hoặc tải ảnh logo lên trước.");
    if (file && file.size > 5 * 1024 * 1024) return setLogoError("Ảnh không được lớn hơn 5MB.");
    setLogoBusy(true);
    setLogoError("");
    try {
      const png = file ? await adminVehicleCatalogApi.previewBrandLogoFile(file) : await adminVehicleCatalogApi.previewBrandLogo(link!);
      // Ảnh từ file: xóa link cũ (nếu có) để không bị bắt "Xử lý ảnh" lại khi Lưu.
      setForm(current => current && { ...current, logoPng: png, logoLink: file ? "" : current.logoLink });
    } catch (error) {
      setLogoError(errorText(error, "Không xử lý được ảnh này."));
    } finally {
      setLogoBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    const problems: FieldErrors = {};
    if (!name) problems.name = "Vui lòng nhập tên.";
    if (form.id === null && level !== "brands" && !form.brandId) problems.brand = "Vui lòng chọn hãng xe.";
    if (form.id === null && level === "trims" && !form.modelId) problems.model = "Vui lòng chọn dòng xe.";
    if (level === "brands" && form.logoLink.trim() && !form.logoPng) problems.logo = "Bấm “Xử lý link” để xem trước logo, hoặc xóa link.";
    else if (level === "brands" && form.id === null && !form.logoPng) problems.logo = "Vui lòng tải lên hoặc dán link logo hãng.";
    setFormError("");
    if (fieldErrors.show(problems)) return;

    const body: Record<string, unknown> = { name, status: form.status };
    if (level === "brands" && form.logoPng) body.logo_png = form.logoPng;
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
      // Đổi logo → tải lại danh sách logo để mọi nơi (khách / admin / cố vấn) hiện logo mới ngay.
      if (level === "brands" && form.logoPng) void loadBrandLogos(true);
      setForm(null);
      setReload(n => n + 1);
    } catch (error) {
      fieldErrors.showApi(error, { name: "name", brand_id: "brand", model_id: "model", logo_png: "logo", body_type: "bodyType" });
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
      if (rows.length === 1 && filters.page > 1) { setFilters(current => ({ ...current, page: current.page - 1 })); summaryQuery.reload(); }
      else setReload(n => n + 1);
    } catch (error) {
      notify(errorText(error, "Không xóa được."), "error");
    } finally {
      setBusyId(null);
    }
  }

  /** Cột trạng thái: nút gạt kiểu iOS — gạt là ẩn / hiện ngay (thay nút con mắt cũ). */
  const statusBadge = (row: Row) => <Switch size="sm" checked={row.status !== "INACTIVE"} disabled={busyId !== null}
    label={row.status === "INACTIVE" ? `Hiển thị lại “${row.name}”` : `Ẩn “${row.name}” khỏi bộ chọn xe`}
    onChange={() => void toggle(row)}/>;

  /** Ngày tạo (hãng / dòng xe) — dữ liệu nhập từ CSV ban đầu cùng một ngày; thêm tay sau đó sẽ khác. */
  const createdCell = (row: Row) => <span className="tabular-nums text-cs-text-2" title={fmtDateTime((row as CatalogBrand | CatalogModel).created_at)}>{fmtDate((row as CatalogBrand | CatalogModel).created_at)}</span>;

  const columns: Column<Row>[] = level === "brands" ? [
    { key: "name", sortKey: "name", header: "Hãng xe", primary: true, render: row => <span className="inline-flex items-center gap-2.5"><VehicleBrandLogo brand={row.name} size={32}/><span className="font-semibold">{row.name}</span></span> },
    { key: "models", sortKey: "models", header: "Dòng xe", align: "center", render: row => <span className="tabular-nums">{(row as CatalogBrand).models_count ?? 0}</span> },
    { key: "trims", sortKey: "trims", header: "Phiên bản", align: "center", render: row => <span className="tabular-nums">{(row as CatalogBrand).trims_count ?? 0}</span> },
    { key: "created", sortKey: "created", header: "Ngày tạo", hideOnMobile: true, render: createdCell },
    { key: "status", sortKey: "status", header: "Trạng thái", align: "center", render: statusBadge },
  ] : level === "models" ? [
    { key: "name", sortKey: "name", header: "Dòng xe", primary: true, render: row => <span className="font-semibold">{row.name}</span> },
    { key: "brand", sortKey: "brand", header: "Hãng", render: row => { const brand = (row as CatalogModel).brand?.name; return brand ? <span className="inline-flex items-center gap-2"><VehicleBrandLogo brand={brand} size={24}/>{brand}</span> : "—"; } },
    { key: "body", sortKey: "body", header: "Kiểu dáng", hideOnMobile: true, render: row => BODY_TYPES[(row as CatalogModel).body_type ?? ""] ?? "—" },
    { key: "trims", sortKey: "trims", header: "Phiên bản", align: "center", render: row => <span className="tabular-nums">{(row as CatalogModel).trims_count ?? 0}</span> },
    { key: "vehicles", sortKey: "vehicles", header: "Xe khách", align: "center", render: row => <span className="tabular-nums">{(row as CatalogModel).vehicles_count ?? 0}</span> },
    { key: "created", sortKey: "created", header: "Ngày tạo", hideOnMobile: true, render: createdCell },
    { key: "status", sortKey: "status", header: "Trạng thái", align: "center", render: statusBadge },
  ] : [
    { key: "name", sortKey: "name", header: "Phiên bản", primary: true, render: row => <span className="font-semibold">{row.name}</span> },
    { key: "model", sortKey: "model", header: "Dòng xe", render: row => { const model = (row as CatalogTrim).model; return model ? <span className="inline-flex items-center gap-2">{model.brand?.name && <VehicleBrandLogo brand={model.brand.name} size={24}/>}{`${model.brand?.name ?? ""} ${model.name}`.trim()}</span> : "—"; } },
    { key: "vehicles", sortKey: "vehicles", header: "Xe khách", align: "center", render: row => <span className="tabular-nums">{(row as CatalogTrim).vehicles_count ?? 0}</span> },
    { key: "status", sortKey: "status", header: "Trạng thái", align: "center", render: statusBadge },
  ];

  const hasFilters = Boolean(filters.search || filters.status || filters.brandId || filters.modelId);

  return <main className="page-container" data-testid="admin-vehicle-catalog">
    <PageHeader title="Hãng & dòng xe" description="Hãng xe → Dòng xe → Phiên bản dùng cho bộ chọn xe khi khách đặt lịch và lưu hồ sơ xe. Dữ liệu khởi tạo từ CSV chưa chắc mọi phiên bản đều đang bán."
      actions={<Button variant="primary" icon="plus" onClick={() => openForm()}>{LEVELS[level].add}</Button>}/>

    <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([
        ["Hãng xe", "tag", summary?.brands.total, summary?.brands.hidden],
        ["Dòng xe", "car", summary?.models.total, summary?.models.hidden],
        ["Phiên bản", "list", summary?.trims.total, summary?.trims.hidden],
        ["Xe khách đã đăng ký", "users", summary?.vehicles, undefined],
      ] as const).map(([label, icon, value, hidden]) => <div key={label} className="flex items-center gap-3 rounded-card border border-cs-border bg-cs-surface px-4 py-3 shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name={icon} size={18}/></span>
        <span className="min-w-0">
          <dt className="truncate text-caption text-cs-muted">{label}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-subheading font-bold tabular-nums text-cs-text">{value === undefined ? "—" : value.toLocaleString("vi-VN")}</span>
            {hidden ? <span className="text-caption text-cs-muted">{hidden.toLocaleString("vi-VN")} đang ẩn</span> : null}
          </dd>
        </span>
      </div>)}
    </dl>

    <div role="tablist" aria-label="Cấp danh mục" className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-control border border-cs-border bg-cs-surface p-1">
      {(Object.keys(LEVELS) as AdminLevel[]).map(key => <button key={key} type="button" role="tab" aria-selected={level === key}
        onClick={() => switchLevel(key)}
        className={`cursor-pointer whitespace-nowrap rounded-control px-4 py-2 text-small font-semibold transition-colors max-sm:min-h-11 ${level === key ? "bg-cs-accent text-cs-accent-contrast hover:bg-cs-accent-hover" : "text-cs-muted hover:bg-cs-soft-hover hover:text-cs-on-soft"}`}>
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
      {level !== "brands" && <SearchableSelect label="Hãng xe" placeholder="Tất cả hãng" options={brandOptions.options} loading={brandOptions.loading} renderIcon={brandIcon}
        value={filters.brandId} onChange={option => setFilters(current => ({ ...current, brandId: option?.value ?? null, modelId: null, page: 1 }))}/>}
      {level === "trims" && <SearchableSelect label="Dòng xe" placeholder="Tất cả dòng xe" options={modelFilterOptions.options} loading={modelFilterOptions.loading}
        value={filters.modelId} disabled={filters.brandId === null} disabledHint="Chọn hãng để lọc theo dòng xe."
        onChange={option => setFilters(current => ({ ...current, modelId: option?.value ?? null, page: 1 }))}/>}    </section>

    <DataTable<Row>
      evenColumns actionsWidth="176px"
      sort={tableSort.sort} onSort={tableSort.toggle}
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
      {form && <form id="vehicle-catalog-form" noValidate onSubmit={event => void submit(event)} className="flex flex-col gap-4">
        {form.id === null && level !== "brands" && <SearchableSelect label="Hãng xe" placeholder="Chọn hãng xe…" required error={fieldErrors.errors.brand} renderIcon={brandIcon}
          options={brandOptions.options} loading={brandOptions.loading} value={form.brandId}
          onChange={option => { fieldErrors.clear("brand", "model"); setForm(current => current && { ...current, brandId: option?.value ?? null, modelId: null }); }}/>}
        {form.id === null && level === "trims" && <SearchableSelect label="Dòng xe" placeholder="Chọn dòng xe…" required error={fieldErrors.errors.model}
          options={formModelOptions.options} loading={formModelOptions.loading} value={form.modelId}
          disabled={form.brandId === null} disabledHint="Chọn hãng xe trước."
          onChange={option => { fieldErrors.clear("model"); setForm(current => current && { ...current, modelId: option?.value ?? null }); }}/>}
        <Field label={`Tên ${LEVELS[level].noun}`} required error={fieldErrors.errors.name} hint="Không trùng tên trong cùng cấp cha (không phân biệt hoa/thường).">
          <Input value={form.name} maxLength={level === "trims" ? 150 : 100} autoFocus
            onChange={event => { fieldErrors.clear("name"); setForm(current => current && { ...current, name: event.target.value }); }}/>
        </Field>
        {level === "brands" && <BrandLogoField form={form} busy={logoBusy} error={logoError || fieldErrors.errors.logo}
          onLink={link => { setLogoError(""); fieldErrors.clear("logo"); setForm(current => current && { ...current, logoLink: link, logoPng: null }); }}
          onProcess={file => { fieldErrors.clear("logo"); void processLogo(file); }}/>}
        {level === "models" && <Field label="Kiểu dáng" optional error={fieldErrors.errors.bodyType}>
          <Select value={form.bodyType} onChange={event => { fieldErrors.clear("bodyType"); setForm(current => current && { ...current, bodyType: event.target.value }); }}>
            <option value="">Chưa phân loại</option>
            {Object.entries(BODY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>}
        {/* Trạng thái: nút gạt kiểu iOS — bật = hiển thị trong bộ chọn xe. */}
        <div className="flex items-center justify-between gap-4 rounded-control border border-cs-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-small font-semibold text-cs-text">{form.status === "ACTIVE" ? "Đang hiển thị" : "Đã ẩn"}</p>
            <p className="text-caption text-cs-muted">Đã ẩn: không xuất hiện trong bộ chọn xe, xe đã lưu vẫn giữ nguyên.</p>
          </div>
          <Switch checked={form.status === "ACTIVE"} label="Hiển thị trong bộ chọn xe"
            onChange={on => setForm(current => current && { ...current, status: on ? "ACTIVE" : "INACTIVE" })}/>
        </div>
        <ToastError message={formError}/>
      </form>}
    </Modal>
  </main>;
}
