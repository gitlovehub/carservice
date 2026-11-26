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