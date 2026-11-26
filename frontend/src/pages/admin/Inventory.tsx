import { ToastError } from "../../components/ui/ToastError";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, DataTable, EmptyState, Field, Input, Modal, Pagination, QuantityStepper, SearchInput, Select, Textarea, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { SearchableSelect } from "../../components/vehicle/SearchableSelect";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { adminApi, errorMessage, fmtDateTime, type AdminPart, type PartPayload, type StockMove } from "../../services/adminApi";
import { emptySelection, type VehicleSelection } from "../../services/vehicleCatalog";
import { AdminPage, ClearFilters, FilterSelect, Pill, Progress, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { PartOrders } from "./PartOrders";
import { num, vnd, type Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";

type Tab = "catalog" | "stock" | "orders" | "moves";
type StatusFilter = "all" | "ACTIVE" | "INACTIVE" | "low" | "out";
type Editing = Omit<AdminPart, "updated_at" | "level" | "stock" | "requested"> & { stock: number };
type StockForm = { type: "IN" | "OUT"; partId: number | null; qty: number; note: string };

const TONES: Tone[] = ["warning", "violet", "info", "success", "brand", "neutral"];
const categoryTone = (category: string | null): Tone => category ? TONES[[...category].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length] : "neutral";
const DEFAULT_UNITS = ["Cái", "Bộ", "Can", "Chai", "Lít", "Bình", "Cặp"];
const moveInfo: Record<StockMove["type"], { label: string; tone: Tone }> = { IN: { label: "Nhập kho", tone: "success" }, OUT: { label: "Xuất kho", tone: "info" } };
const blankPart: Editing = { image_url: null, id: 0, sku: "", name: "", description: "", category: null, unit: "Cái", cost: 0, price: 0, stock: 0, min: 5, status: "ACTIVE", compat: [] };

function Sku({ value }: { value: string | null }) {
  return <span className="whitespace-nowrap rounded-md border border-cs-border bg-cs-surface-2 px-2 py-0.5 font-mono text-caption text-cs-text-2">{value ?? "—"}</span>;
}
function PartName({ part }: { part: AdminPart }) {
  return <span className="flex min-w-0 items-center gap-3">
    {part.image_url ? <img className="size-12 shrink-0 rounded-control border border-cs-border object-cover" src={part.image_url} alt={`Ảnh ${part.name}`}/>
      : <span className="grid size-12 shrink-0 place-items-center rounded-control bg-cs-surface-2 text-cs-muted" aria-hidden="true"><Icon name="box" size={20}/></span>}
    <span className="min-w-0"><b className="block text-cs-text">{part.name}</b>{part.description && <span className="block truncate text-caption text-cs-muted font-medium">{part.description}</span>}</span>
  </span>;
}

/** Phụ tùng & kho — dữ liệu thật từ /api/admin/parts và /api/admin/stock-moves. */
export default function Inventory() {
  const { notify } = useAppFeedback();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (["catalog", "stock", "orders", "moves"] as Tab[]).find(t => t === params.get("tab")) ?? "catalog";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [movePage, setMovePage] = useState(1);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [compatPick, setCompatPick] = useState<VehicleSelection>(emptySelection);
  const [stockForm, setStockForm] = useState<StockForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const term = useDebounced(search.trim());

  const partSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const moveSort = useTableSort(NEWEST_FIRST, () => setMovePage(1));
  const partParams = { search: term, category, status, page, ...partSort.params };
  const parts = useAdminQuery(tab !== "moves" ? `parts:${JSON.stringify(partParams)}` : null, signal => adminApi.parts(partParams, signal));
  // ADV-01: yêu cầu phụ tùng đang mở (cố vấn báo thiếu) — dùng cho tab "Cần đặt hàng" và số trên tab.
  const [requestsVersion, setRequestsVersion] = useState(0);
  const requests = useAdminQuery(`part-requests:${requestsVersion}`, signal => adminApi.partRequests({ status: "OPEN", per_page: 100 }, signal));
  const openRequests = (requests.data ?? requests.stale)?.data ?? [];
  const moves = useAdminQuery(tab === "moves" ? `moves:${term}:${movePage}:${moveSort.sort.key}:${moveSort.sort.dir}` : null, signal => adminApi.stockMoves({ search: term, page: movePage, ...moveSort.params }, signal));
  const partOptions = useAdminQuery(stockForm ? "parts:all" : null, signal => adminApi.parts({ per_page: 100, sort: "name", dir: "asc" }, signal));
  const result = parts.data ?? parts.stale;
  const moveResult = moves.data ?? moves.stale;
  const summary = result?.summary;
  const units = [...new Set([...(result?.units ?? []), ...DEFAULT_UNITS])];

  const partErrors = useFieldErrors();
  const stockErrors = useFieldErrors();
  const patchPart = (patch: Partial<Editing>) => { partErrors.clear(...Object.keys(patch)); setEditing(current => current && { ...current, ...patch }); };
  const switchTab = (id: Tab) => { setParams(id === "catalog" ? {} : { tab: id }, { replace: true }); setStatus("all"); setPage(1); setEditing(null); };
  const startEdit = (part: AdminPart | null) => {
    setFormError(""); partErrors.reset(); setCompatPick(emptySelection); setImageFile(null);
    setEditing(part ? { ...part, description: part.description ?? "" } : { ...blankPart });
  };
  // Ảnh xem trước suy ra từ file đã chọn; thu hồi object URL cũ khi đổi file / đóng form để không rò bộ nhớ.
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const removeSavedImage = async () => {
    if (!editing?.id || !editing.image_url) return;
    setSaving(true); setFormError("");
    try {
      const response = await adminApi.deletePartImage(editing.id);
      setEditing(prev => prev ? { ...prev, image_url: response.data.image_url } : prev);
      setImageFile(null); notify(response.message, "success"); parts.reload();
    } catch (error) { partErrors.showApi(error); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const problems: FieldErrors = {};
    if (!editing.sku.trim()) problems.sku = "Nhập mã SKU.";
    if (!editing.name.trim()) problems.name = "Nhập tên phụ tùng.";
    if (editing.price < editing.cost) problems.price = "Giá bán không được thấp hơn giá vốn.";
    setFormError("");
    if (partErrors.show(problems)) return;
    const body: PartPayload = {
      sku: editing.sku.trim(), name: editing.name.trim(), category: editing.category?.trim() || null, unit: editing.unit, cost_price: editing.cost, sell_price: editing.price,
      description: editing.description?.trim() || null, status: editing.status, min_quantity: editing.min, compat_model_ids: editing.compat.map(c => c.id),
    };
    setSaving(true);
    try {
      const response = editing.id ? await adminApi.updatePart(editing.id, body) : await adminApi.createPart(body);
      if (imageFile) {
        // Save metadata before upload. If upload fails, keep this item open for retry.
        setEditing({ ...editing, id: response.data.id, image_url: response.data.image_url });
        try {
          await adminApi.uploadPartImage(response.data.id, imageFile);
        } catch (error) {
          parts.reload();
          throw new Error(`Đã lưu thông tin phụ tùng nhưng ảnh chưa được tải lên: ${errorMessage(error)}. Bấm Lưu thay đổi để thử lại.`, { cause: error });
        }
      }
      notify(imageFile ? "Đã lưu phụ tùng và ảnh." : response.message, "success");
      setImageFile(null); setEditing(null);
      parts.reload();
    } catch (error) {
      partErrors.showApi(error, { sku: "sku", name: "name", category: "category", unit: "unit", cost_price: "cost", sell_price: "price", description: "description", min_quantity: "min", image: "image" });
    } finally {
      setSaving(false);
    }
  };

  const saveStock = async () => {
    if (!stockForm) return;
    const problems: FieldErrors = {};
    if (!stockForm.partId) problems.part = "Chọn phụ tùng.";
    if (stockForm.qty < 1) problems.qty = "Nhập số lượng lớn hơn 0.";
    setFormError("");
    if (stockErrors.show(problems) || !stockForm.partId) return;
    setSaving(true);
    try {
      const response = await adminApi.adjustStock(stockForm.partId, { type: stockForm.type, quantity: stockForm.qty, note: stockForm.note.trim() || null });
      notify(response.message, "success");
      setStockForm(null);
      parts.reload(); moves.reload(); partOptions.reload(); setRequestsVersion(n => n + 1);
    } catch (error) {
      stockErrors.showApi(error, { quantity: "qty", note: "note" });
    } finally {
      setSaving(false);
    }
  };
  const openStock = (type: "IN" | "OUT", part?: AdminPart) => { setFormError(""); stockErrors.reset(); setStockForm({ type, partId: part?.id ?? null, qty: part && type === "IN" ? Math.max(1, part.min - part.stock) : 1, note: "" }); };

  const filters = <Toolbar>
    <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); setMovePage(1); }} placeholder={tab === "moves" ? "Tìm phụ tùng, mã phiếu, ghi chú…" : "Tìm theo SKU, tên phụ tùng…"}/>
    {tab !== "moves" && <>
      <FilterSelect label="Danh mục" value={category} onChange={value => { setCategory(value); setPage(1); }} options={[{ value: "all", label: "Tất cả" }, ...(result?.categories ?? []).map(c => ({ value: c, label: c }))]}/>
      <FilterSelect label="Trạng thái" value={status} onChange={value => { setStatus(value); setPage(1); }} options={tab === "stock"
        ? [{ value: "all", label: "Tất cả" }, { value: "low", label: "Sắp hết" }, { value: "out", label: "Hết hàng" }]
        : [{ value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang áp dụng" }, { value: "INACTIVE", label: "Ngừng" }]}/>
    </>}
    {tab === "moves"
      ? <ClearFilters active={search !== "" || !moveSort.isDefault} onClear={() => { setSearch(""); moveSort.reset(); setMovePage(1); }}/>
      : <ClearFilters active={search !== "" || category !== "all" || status !== "all" || !partSort.isDefault}
        onClear={() => { setSearch(""); setCategory("all"); setStatus("all"); partSort.reset(); setPage(1); }}/>}
  </Toolbar>;
  const pager = result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={parts.loading} onChange={setPage}/>;

  const catalogColumns: Column<AdminPart>[] = [
    { key: "sku", sortKey: "sku", header: "SKU", render: p => <Sku value={p.sku}/> },
    { key: "name", sortKey: "name", header: "Tên phụ tùng", primary: true, render: p => <PartName part={p}/> },
    { key: "category", sortKey: "category", header: "Danh mục", render: p => p.category ? <Pill tone={categoryTone(p.category)}>{p.category}</Pill> : <span className="text-cs-muted">—</span> },
    { key: "unit", sortKey: "unit", header: "Đơn vị", hideOnMobile: true, render: p => p.unit },
    { key: "cost", sortKey: "cost", header: "Giá vốn", align: "right", hideOnMobile: true, render: p => <span className="tabular-nums">{vnd(p.cost)}</span> },
    { key: "price", sortKey: "price", header: "Giá bán", align: "right", render: p => <span className="tabular-nums">{vnd(p.price)}</span> },
    { key: "margin", sortKey: "margin", header: "Lợi nhuận", align: "right", hideOnMobile: true, render: p => p.price > 0 ? <b className="tabular-nums text-success-fg">{num(Math.round(((p.price - p.cost) / p.price) * 1000) / 10)}%</b> : <span className="text-cs-muted">—</span> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: p => <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status === "ACTIVE" ? "Đang áp dụng" : "Ngừng"}</Badge> },
  ];
  const stockColumns: Column<AdminPart>[] = [
    { key: "sku", sortKey: "sku", header: "SKU", render: p => <Sku value={p.sku}/> },
    { key: "name", sortKey: "name", header: "Tên phụ tùng", primary: true, render: p => <PartName part={p}/> },
    { key: "category", sortKey: "category", header: "Danh mục", hideOnMobile: true, render: p => p.category ? <Pill tone={categoryTone(p.category)}>{p.category}</Pill> : <span className="text-cs-muted">—</span> },
    { key: "unit", sortKey: "unit", header: "Đơn vị", hideOnMobile: true, render: p => p.unit },
    { key: "stock", sortKey: "stock", header: "Tồn hiện tại / Tối thiểu", render: p => {
      const pct = (p.stock / Math.max(1, p.min * 1.3)) * 100;
      return <span className="block min-w-36"><span className="mb-1 flex justify-between text-small"><b className="tabular-nums">{num(p.stock)} / {num(p.min)}</b>
        {p.requested > 0 && <span className="text-caption font-semibold text-info-fg">Chờ về {num(p.requested)}</span>}
        {p.level !== "ok" && <span className={`text-caption font-semibold ${p.level === "out" ? "text-danger-fg" : "text-warning-fg"}`}>{p.level === "out" ? "Hết hàng" : "Sắp hết"}</span>}</span>
        <Progress value={pct} tone={p.level === "out" || p.stock / Math.max(1, p.min) < 0.5 ? "danger" : p.level === "low" ? "warning" : "success"} label={`Tồn kho ${p.name}`}/></span>;
    } },
    { key: "value", sortKey: "value", header: "Giá trị tồn", align: "right", hideOnMobile: true, render: p => <span className="tabular-nums">{vnd(Math.max(0, p.stock) * p.cost)}</span> },
    { key: "updated", sortKey: "updated", header: "Cập nhật lần cuối", hideOnMobile: true, render: p => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{fmtDateTime(p.updated_at)}</span> },
  ];
  const moveColumns: Column<StockMove>[] = [
    { key: "at", sortKey: "created", header: "Thời gian", render: m => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{fmtDateTime(m.at)}</span> },
    { key: "type", sortKey: "type", header: "Loại", render: m => <Pill tone={moveInfo[m.type].tone}>{moveInfo[m.type].label}</Pill> },
    { key: "part", header: "Phụ tùng", primary: true, render: m => <span><b className="text-cs-text">{m.name ?? "—"}</b><span className="block text-caption text-cs-muted">{m.sku}</span></span> },
    { key: "qty", sortKey: "qty", header: "Số lượng", align: "right", render: m => <b className={`tabular-nums ${m.type === "IN" ? "text-success-fg" : "text-danger-fg"}`}>{m.type === "IN" ? "+" : "−"}{num(m.quantity)}{m.unit ? ` ${m.unit}` : ""}</b> },
    { key: "ref", header: "Chứng từ", render: m => <span><span className="font-medium">{m.ref}</span>{m.note && <span className="block text-caption text-cs-muted font-medium">{m.note}</span>}</span> },
    { key: "by", header: "Người thực hiện", hideOnMobile: true, render: m => m.by },
  ];

  const editPane = editing && <div className="flex flex-col gap-4">
    <Field label="SKU" required error={partErrors.errors.sku} hint="Chữ, số, dấu chấm, gạch ngang."><Input value={editing.sku} maxLength={50} className="uppercase" onChange={e => patchPart({ sku: e.target.value })}/></Field>
    <Field label="Tên phụ tùng" required error={partErrors.errors.name}><Input value={editing.name} maxLength={150} onChange={e => patchPart({ name: e.target.value })}/></Field>
    <div className="rounded-xl border border-cs-border bg-cs-surface-2 p-3">
      <div className="mb-3 flex items-start gap-3">
        {imagePreview || editing.image_url ? <img src={imagePreview ?? editing.image_url ?? undefined} alt="Xem trước ảnh phụ tùng" className="h-28 w-32 rounded-lg border border-cs-border bg-cs-surface object-cover"/>
          : <div className="grid h-28 w-32 place-items-center rounded-lg border border-dashed border-cs-border bg-cs-surface text-cs-muted"><Icon name="box" size={36}/></div>}
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-cs-text">Ảnh phụ tùng</p>
          <p className="mt-1 text-caption text-cs-muted">JPG, PNG, WebP · tối đa 4 MB. Chọn ảnh rồi bấm Lưu thay đổi.</p>
          {editing.image_url && !imageFile && <button type="button" className="mt-2 text-caption font-semibold text-danger-fg underline" disabled={saving} onClick={() => void removeSavedImage()}>Xóa ảnh hiện tại</button>}
        </div>
      </div>
      <input aria-label="Chọn ảnh phụ tùng" aria-invalid={!!partErrors.errors.image || undefined} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} className="block w-full cursor-pointer text-small text-cs-text file:mr-3 file:rounded-lg file:border-0 file:bg-cs-soft file:px-3 file:py-2 file:font-semibold file:text-cs-accent-text" onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { partErrors.mark({ image: "Chỉ nhận ảnh JPG, PNG hoặc WebP." }); event.currentTarget.value = ""; return; }
        if (file.size > 4 * 1024 * 1024) { partErrors.mark({ image: "Ảnh quá 4 MB, vui lòng chọn ảnh nhỏ hơn." }); event.currentTarget.value = ""; return; }
        setFormError(""); partErrors.clear("image"); setImageFile(file);
      }}/>
      <FieldError className="mt-1">{partErrors.errors.image}</FieldError>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Danh mục" error={partErrors.errors.category}><Input list="part-categories" value={editing.category ?? ""} maxLength={100} placeholder="VD: Phanh" onChange={e => patchPart({ category: e.target.value })}/></Field>
      <datalist id="part-categories">{(result?.categories ?? []).map(c => <option key={c} value={c}/>)}</datalist>
      <Field label="Đơn vị" required error={partErrors.errors.unit}><Select value={editing.unit} onChange={e => patchPart({ unit: e.target.value })}>{(units.includes(editing.unit) ? units : [...units, editing.unit]).map(u => <option key={u}>{u}</option>)}</Select></Field>
      <Field label="Giá vốn (₫)" required error={partErrors.errors.cost}><Input inputMode="numeric" value={num(editing.cost)} onChange={e => { partErrors.clear("price"); patchPart({ cost: Number(e.target.value.replace(/\D/g, "")) || 0 }); }}/></Field>
      <Field label="Giá bán (₫)" required error={partErrors.errors.price}><Input inputMode="numeric" value={num(editing.price)} onChange={e => patchPart({ price: Number(e.target.value.replace(/\D/g, "")) || 0 })}/></Field>
      <Field label="Tồn tối thiểu" error={partErrors.errors.min}><QuantityStepper label="Tồn tối thiểu" size="md" className="w-full" min={0} max={99999} unit={editing.unit} value={editing.min} onChange={v => patchPart({ min: v ?? 0 })}/></Field>
      <Field label="Trạng thái"><Select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Editing["status"] })}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Ngừng</option></Select></Field>
    </div>
    {editing.id > 0 && <p className="rounded-control bg-cs-surface-2 px-3 py-2 text-small text-cs-text-2">Tồn hiện tại: <b className="tabular-nums text-cs-text">{num(editing.stock)} {editing.unit}</b> — nhập / xuất ở tab Tồn kho.</p>}
    <Field label="Mô tả" error={partErrors.errors.description} hint={`${(editing.description ?? "").length}/500`}><Textarea maxLength={500} value={editing.description ?? ""} onChange={e => patchPart({ description: e.target.value })}/></Field>
    <div>
      <p className="mb-2 flex items-center gap-2 text-small font-semibold text-cs-text"><Icon name="car" size={17} className="text-cs-muted"/>Xe tương thích</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {editing.compat.length ? editing.compat.map(c => <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-cs-border bg-cs-surface-2 py-0.5 pl-3 pr-1 text-caption text-cs-text">
          {c.name}<button type="button" aria-label={`Bỏ ${c.name}`} onClick={() => setEditing({ ...editing, compat: editing.compat.filter(x => x.id !== c.id) })} className="grid size-5 cursor-pointer place-items-center rounded-full text-cs-muted hover:bg-cs-hover hover:text-cs-text"><Icon name="close" size={11}/></button>
        </span>) : <span className="text-caption text-cs-muted">Dùng chung mọi dòng xe.</span>}
      </div>
      <VehicleSelector columns={1} value={compatPick} onChange={setCompatPick}/>
      <Button variant="outline" icon="plus" className="mt-2" disabled={compatPick.modelId === null || editing.compat.some(c => c.id === compatPick.modelId)}
        onClick={() => { if (compatPick.modelId !== null) { setEditing({ ...editing, compat: [...editing.compat, { id: compatPick.modelId, name: `${compatPick.brandName} ${compatPick.modelName}` }] }); setCompatPick(emptySelection); } }}>Thêm dòng xe</Button>
    </div>
    <ToastError message={formError}/>
  </div>;

  const selectedStockPart = partOptions.data?.data.find(p => p.id === stockForm?.partId);

  return <AdminPage title="Phụ tùng & kho" description="Danh mục phụ tùng, tồn kho, nhập/xuất và cảnh báo" demo={false}
    actions={<>
      <Button variant="outline" icon="upload" onClick={() => openStock("OUT")}>Xuất kho</Button>
      {tab === "catalog"
        ? <Button variant="primary" icon="plus" onClick={() => startEdit(null)}>Thêm phụ tùng</Button>
        : <Button variant="primary" icon="plus" onClick={() => openStock("IN")}>Nhập kho</Button>}
    </>}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="box" tone="brand" label="Tổng mã phụ tùng" value={summary ? num(summary.total) : "—"}/>
      <StatCard icon="coins" tone="neutral" label="Giá trị tồn kho (giá vốn)" value={summary ? vnd(summary.stock_value) : "—"}/>
      <StatCard icon="alert" tone="warning" label="Sắp hết hàng" value={summary?.low ?? "—"}/>
      <StatCard icon="x-circle" tone="danger" label="Hết hàng" value={summary?.out ?? "—"}/>
    </div>
    <div className="mb-4">
      <Tabs label="Phụ tùng & kho" value={tab} onChange={switchTab} items={[
        { id: "catalog", label: "Danh mục phụ tùng", icon: "tag" }, { id: "stock", label: "Tồn kho", icon: "box" },
        { id: "orders", label: "Cần đặt hàng", icon: "clock", count: openRequests.length || undefined, tone: "warning" },
        { id: "moves", label: "Lịch sử nhập xuất", icon: "history" },
      ]}/>
    </div>

    {tab === "catalog" && <SplitView paneOpen={!!editing} onClose={() => setEditing(null)} paneWidth={420}
      paneTitle={<span className="flex items-center gap-2 text-cs-accent-text"><Icon name="edit" size={18}/>{editing?.id ? "Chỉnh sửa phụ tùng" : "Thêm phụ tùng"}</span>}
      paneFooter={<><Button disabled={saving} onClick={() => setEditing(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void saveEdit()}>Lưu thay đổi</Button></>}
      pane={editPane}
      list={<>{filters}<DataTable sort={partSort.sort} onSort={partSort.toggle} caption="Danh mục phụ tùng" columns={catalogColumns} rows={result?.data ?? []} rowKey={p => p.id}
        loading={parts.loading} error={parts.error || undefined} onRetry={parts.reload}
        onRowClick={startEdit} rowClassName={p => p.id === editing?.id ? "bg-cs-soft/60" : ""}
        footer={pager}/></>}/>}

    {tab === "stock" && <>{filters}<DataTable sort={partSort.sort} onSort={partSort.toggle} caption="Tồn kho" columns={stockColumns} rows={result?.data ?? []} rowKey={p => p.id}
      loading={parts.loading} error={parts.error || undefined} onRetry={parts.reload}
      empty={<EmptyState icon="box" title={status === "all" ? "Chưa có phụ tùng" : "Không có phụ tùng ở mức này"}/>}
      rowClassName={p => p.level === "out" ? "bg-danger-soft/40" : p.level === "low" ? "bg-warning-soft/40" : ""}
      onRowClick={p => openStock("IN", p)}
      footer={pager}/></>}

    {tab === "orders" && <PartOrders rows={openRequests} loading={requests.loading && !requests.stale} error={requests.error || undefined} onRetry={requests.reload}
      onChanged={() => { setRequestsVersion(n => n + 1); moves.reload(); }}/>}

    {tab === "moves" && <>{filters}<DataTable sort={moveSort.sort} onSort={moveSort.toggle} caption="Lịch sử nhập xuất" columns={moveColumns} rows={moveResult?.data ?? []} rowKey={m => m.id}
      loading={moves.loading} error={moves.error || undefined} onRetry={moves.reload}
      empty={<EmptyState icon="history" title="Chưa có giao dịch nhập xuất"/>}
      footer={moveResult && <Pagination page={moveResult.meta.current_page} totalPages={moveResult.meta.last_page} totalItems={moveResult.meta.total} pageSize={moveResult.meta.per_page} disabled={moves.loading} onChange={setMovePage}/>}/></>}

    <Modal open={!!stockForm} onClose={() => setStockForm(null)} dismissible={!saving} title={stockForm?.type === "IN" ? "Nhập kho" : "Xuất kho"}
      footer={<><Button disabled={saving} onClick={() => setStockForm(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void saveStock()}>Xác nhận</Button></>}>
      {stockForm && <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <SearchableSelect label="Phụ tùng" placeholder="Tìm SKU, tên phụ tùng…" required error={stockErrors.errors.part} loading={partOptions.loading} loadError={partOptions.error} onRetry={partOptions.reload}
          options={(partOptions.data?.data ?? []).map(p => ({ value: p.id, label: `${p.sku} — ${p.name}`, hint: `tồn ${num(p.stock)}` }))}
          value={stockForm.partId} onChange={option => { stockErrors.clear("part"); setStockForm({ ...stockForm, partId: option?.value ?? null }); }}/>
        <Field label="Số lượng" required error={stockErrors.errors.qty} hint={stockForm.type === "OUT" && selectedStockPart ? `Tối đa ${num(selectedStockPart.stock)}` : undefined}>
          <QuantityStepper label="Số lượng" size="md" className="w-full" min={1} max={stockForm.type === "OUT" && selectedStockPart ? Math.max(1, selectedStockPart.stock) : 99999} value={stockForm.qty || 1} onChange={v => { stockErrors.clear("qty"); setStockForm({ ...stockForm, qty: v ?? 1 }); }}/>
        </Field>
        {stockForm.type === "IN" && selectedStockPart && selectedStockPart.requested > 0 && <div role="note" className="rounded-control border border-warning/40 bg-warning-soft p-3 text-small text-warning-fg sm:col-span-2">
          Phụ tùng này đang có <b>{num(selectedStockPart.requested)} {selectedStockPart.unit}</b> chờ về cho phiếu sửa chữa. Nếu đây là hàng đặt cho phiếu, hãy nhập ở tab <b>Cần đặt hàng</b> (bấm "Hàng đã về") để không cộng kho hai lần và khách được báo.
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { setStockForm(null); switchTab("orders"); }}>Mở Cần đặt hàng</Button>
        </div>}
        <Field label={stockForm.type === "IN" ? "Nhà cung cấp / ghi chú" : "Lý do xuất"} optional error={stockErrors.errors.note} className="sm:col-span-2"><Input value={stockForm.note} maxLength={255} onChange={e => { stockErrors.clear("note"); setStockForm({ ...stockForm, note: e.target.value }); }}/></Field>
        <ToastError message={formError}/>
      </div>}
    </Modal>
  </AdminPage>;
}
