import { ToastError } from "../../components/ui/ToastError";
import { useEffect, useState } from "react";
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    setFormError(""); partErrors.reset(); setCompatPick(emptySelection); setImageFile(null); setImagePreview(null);
    setEditing(part ? { ...part, description: part.description ?? "" } : { ...blankPart });
  };
  // Revoke browser object URLs to avoid leaking memory while the editor stays open.
  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
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
          throw new Error(`Đã lưu thông tin phụ tùng nhưng ảnh chưa được tải lên: ${errorMessage(error)}. Bấm Lưu thay đổi để thử lại.`);
        }
      }
      notify(imageFile ? "Đã lưu phụ tùng và ảnh." : response.message, "success");
      setImageFile(null); setImagePreview(null); setEditing(null);
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