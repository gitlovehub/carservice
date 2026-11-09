import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, DataTable, Field, IconButton, Input, Modal, Pagination, SearchInput, Select, Textarea, type Column } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoBrands, demoParts, demoStockMoves, partCategories, partUnits, type DemoPart, type DemoStockMove, type PartCategory } from "../../mocks/admin/catalog";
import { AdminPage, FilterSelect, Pill, Progress, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { num, vnd, type Tone } from "./kit/format";
import { usePaged } from "./kit/usePaged";

type Tab = "catalog" | "stock" | "moves";
const categoryTone: Record<PartCategory, Tone> = { "Động cơ": "warning", "Phanh": "violet", "Điều hoà": "info", "Điện": "success", "Lốp – mâm": "neutral", "Gầm": "brand" };
const stockLevel = (p: DemoPart) => p.stock === 0 ? "out" : p.stock < p.min ? "low" : "ok";
const moveInfo: Record<DemoStockMove["type"], { label: string; tone: Tone }> = { IN: { label: "Nhập kho", tone: "success" }, OUT: { label: "Xuất kho", tone: "info" }, ADJUST: { label: "Điều chỉnh", tone: "warning" } };
const allModels = demoBrands.flatMap(b => b.models.map(m => `${b.name} › ${m.name}`));

function Sku({ value }: { value: string }) {
  return <span className="whitespace-nowrap rounded-md border border-cs-border bg-cs-surface-2 px-2 py-0.5 font-mono text-caption text-cs-text-2">{value}</span>;
}
function PartName({ part }: { part: DemoPart }) {
  return <span className="flex min-w-0 items-center gap-3">
    <span className="grid size-10 shrink-0 place-items-center rounded-control bg-cs-surface-2 text-cs-muted" aria-hidden="true"><Icon name="box" size={20}/></span>
    <span className="min-w-0"><b className="block text-cs-text">{part.name}</b><span className="block truncate text-caption text-cs-muted">{part.description}</span></span>
  </span>;
}

/** Phụ tùng & kho — DEMO: dữ liệu từ src/mocks/admin/catalog.ts (parts, inventories, inventory_transactions, part_compatibilities). */
export default function Inventory() {
  const { notify } = useAppFeedback();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (["catalog", "stock", "moves"] as Tab[]).find(t => t === params.get("tab")) ?? "catalog";
  const [parts, setParts] = useState(demoParts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PartCategory>("all");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "INACTIVE" | "low" | "out">("all");
  const [editing, setEditing] = useState<DemoPart | null>(null);
  const [stockForm, setStockForm] = useState<{ type: "IN" | "OUT"; partId: number; qty: number; note: string } | null>(null);
  const [addModel, setAddModel] = useState(allModels[0]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter(p => (!q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      && (category === "all" || p.category === category)
      && (status === "all" || (status === "low" ? stockLevel(p) === "low" : status === "out" ? stockLevel(p) === "out" : p.status === status)));
  }, [parts, query, category, status]);
  const { pageRows, pagination } = usePaged(rows, 8);

  const startEdit = (part: DemoPart | null) => setEditing(part ?? { id: 0, sku: "", name: "", description: "", category: "Động cơ", unit: "Cái", cost: 0, price: 0, stock: 0, min: 5, updatedAt: "—", status: "ACTIVE", compat: [] });
  const saveEdit = () => {
    if (!editing) return;
    if (editing.id) setParts(list => list.map(p => p.id === editing.id ? editing : p));
    else setParts(list => [{ ...editing, id: Math.max(...list.map(p => p.id)) + 1, updatedAt: "08/11/2026 —" }, ...list]);
    setEditing(null);
    notify("Đã lưu phụ tùng (demo).", "success");
  };
  const saveStock = () => {
    if (!stockForm) return;
    setParts(list => list.map(p => p.id === stockForm.partId ? { ...p, stock: Math.max(0, p.stock + (stockForm.type === "IN" ? stockForm.qty : -stockForm.qty)), updatedAt: "08/11/2026 —" } : p));
    setStockForm(null);
    notify(stockForm.type === "IN" ? "Đã nhập kho (demo)." : "Đã xuất kho (demo).", "success");
  };

  const filters = <Toolbar>
    <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo SKU, tên phụ tùng…"/>
    <FilterSelect label="Danh mục" value={category} onChange={setCategory} options={[{ value: "all", label: "Tất cả" }, ...partCategories.map(c => ({ value: c, label: c }))]}/>
    <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={tab === "stock"
      ? [{ value: "all", label: "Tất cả" }, { value: "low", label: "Sắp hết" }, { value: "out", label: "Hết hàng" }]
      : [{ value: "all", label: "Tất cả" }, { value: "ACTIVE", label: "Đang áp dụng" }, { value: "INACTIVE", label: "Ngừng" }]}/>
  </Toolbar>;

  const catalogColumns: Column<DemoPart>[] = [
    { key: "sku", header: "SKU", render: p => <Sku value={p.sku}/> },
    { key: "name", header: "Tên phụ tùng", primary: true, render: p => <b className="text-cs-text">{p.name}</b> },
    { key: "category", header: "Danh mục", render: p => <Pill tone={categoryTone[p.category]}>{p.category}</Pill> },
    { key: "unit", header: "Đơn vị", hideOnMobile: true, render: p => p.unit },
    { key: "cost", header: "Giá vốn", align: "right", hideOnMobile: true, render: p => <span className="tabular-nums">{vnd(p.cost)}</span> },
    { key: "price", header: "Giá bán", align: "right", render: p => <span className="tabular-nums">{vnd(p.price)}</span> },
    { key: "margin", header: "Lợi nhuận", align: "right", hideOnMobile: true, render: p => <b className="tabular-nums text-success-fg">{num(Math.round(((p.price - p.cost) / p.price) * 1000) / 10)}%</b> },
    { key: "status", header: "Trạng thái", render: p => <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status === "ACTIVE" ? "Đang áp dụng" : "Ngừng"}</Badge> },
  ];
  const stockColumns: Column<DemoPart>[] = [
    { key: "sku", header: "SKU", render: p => <Sku value={p.sku}/> },
    { key: "name", header: "Tên phụ tùng", primary: true, render: p => <PartName part={p}/> },
    { key: "category", header: "Danh mục", hideOnMobile: true, render: p => <Pill tone={categoryTone[p.category]}>{p.category}</Pill> },
    { key: "unit", header: "Đơn vị", hideOnMobile: true, render: p => p.unit },
    { key: "stock", header: "Tồn hiện tại / Tối thiểu", render: p => {
      const pct = (p.stock / Math.max(1, p.min * 1.3)) * 100;
      return <span className="block min-w-36"><span className="mb-1 flex justify-between text-small"><b className="tabular-nums">{p.stock} / {p.min}</b>
        {stockLevel(p) !== "ok" && <span className={`text-caption font-semibold ${p.stock === 0 ? "text-danger-fg" : "text-warning-fg"}`}>{p.stock === 0 ? "Hết hàng" : "Sắp hết"}</span>}</span>
        <Progress value={pct} tone={p.stock === 0 || p.stock / p.min < 0.5 ? "danger" : p.stock < p.min ? "warning" : "success"} label={`Tồn kho ${p.name}`}/></span>;
    } },
    { key: "value", header: "Giá trị tồn", align: "right", hideOnMobile: true, render: p => <span className="tabular-nums">{vnd(p.stock * p.cost)}</span> },
    { key: "updated", header: "Cập nhật lần cuối", hideOnMobile: true, render: p => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{p.updatedAt}</span> },
  ];
  const moveColumns: Column<DemoStockMove>[] = [
    { key: "at", header: "Thời gian", render: m => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{m.at}</span> },
    { key: "type", header: "Loại", render: m => <Pill tone={moveInfo[m.type].tone}>{moveInfo[m.type].label}</Pill> },
    { key: "part", header: "Phụ tùng", primary: true, render: m => <span><b className="text-cs-text">{m.name}</b><span className="block text-caption text-cs-muted">{m.sku}</span></span> },
    { key: "qty", header: "Số lượng", align: "right", render: m => <b className={`tabular-nums ${m.type === "IN" ? "text-success-fg" : m.qty < 0 || m.type === "OUT" ? "text-danger-fg" : ""}`}>{m.type === "IN" ? "+" : m.type === "OUT" ? "−" : ""}{Math.abs(m.qty)}</b> },
    { key: "ref", header: "Chứng từ", render: m => <span><span className="font-medium">{m.ref}</span>{m.note && <span className="block text-caption text-cs-muted">{m.note}</span>}</span> },
    { key: "by", header: "Người thực hiện", hideOnMobile: true, render: m => m.by },
  ];

  const low = parts.filter(p => stockLevel(p) === "low").length;
  const out = parts.filter(p => stockLevel(p) === "out").length;
  const editPane = editing && <div className="flex flex-col gap-4">
    <Field label="SKU" required><Input value={editing.sku} onChange={e => setEditing({ ...editing, sku: e.target.value })}/></Field>
    <Field label="Tên phụ tùng" required><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}/></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Danh mục" required><Select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as PartCategory })}>{partCategories.map(c => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Đơn vị" required><Select value={editing.unit} onChange={e => setEditing({ ...editing, unit: e.target.value })}>{partUnits.map(u => <option key={u}>{u}</option>)}</Select></Field>
      <Field label="Giá vốn (₫)" required><Input inputMode="numeric" value={num(editing.cost)} onChange={e => setEditing({ ...editing, cost: Number(e.target.value.replace(/\D/g, "")) || 0 })}/></Field>
      <Field label="Giá bán (₫)" required><Input inputMode="numeric" value={num(editing.price)} onChange={e => setEditing({ ...editing, price: Number(e.target.value.replace(/\D/g, "")) || 0 })}/></Field>
      <Field label="Tồn tối thiểu"><Input inputMode="numeric" value={editing.min} onChange={e => setEditing({ ...editing, min: Number(e.target.value.replace(/\D/g, "")) || 0 })}/></Field>
      <Field label="Trạng thái"><Select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as DemoPart["status"] })}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Ngừng</option></Select></Field>
    </div>
    <Field label="Mô tả" hint={`${editing.description.length}/500`}><Textarea maxLength={500} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}/></Field>
    <div>
      <p className="mb-2 flex items-center gap-2 text-small font-semibold text-cs-text"><Icon name="car" size={17} className="text-cs-muted"/>Xe tương thích</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {editing.compat.length ? editing.compat.map(c => <span key={c} className="inline-flex items-center gap-1 rounded-full border border-cs-border bg-cs-surface-2 py-0.5 pl-3 pr-1 text-caption text-cs-text">
          {c}<button type="button" aria-label={`Bỏ ${c}`} onClick={() => setEditing({ ...editing, compat: editing.compat.filter(x => x !== c) })} className="grid size-5 cursor-pointer place-items-center rounded-full text-cs-muted hover:bg-cs-hover hover:text-cs-text"><Icon name="close" size={11}/></button>
        </span>) : <span className="text-caption text-cs-muted">Dùng chung mọi dòng xe.</span>}
      </div>
      <div className="flex gap-2">
        <Select aria-label="Chọn dòng xe" value={addModel} onChange={e => setAddModel(e.target.value)} className="flex-1">{allModels.filter(m => !editing.compat.includes(m)).map(m => <option key={m}>{m}</option>)}</Select>
        <Button variant="outline" icon="plus" onClick={() => { if (addModel && !editing.compat.includes(addModel)) setEditing({ ...editing, compat: [...editing.compat, addModel] }); }}>Thêm</Button>
      </div>
    </div>
  </div>;

  return <AdminPage title="Phụ tùng & kho" description="Danh mục phụ tùng, tồn kho, nhập/xuất và cảnh báo"
    actions={<>
      <Button variant="outline" icon="upload" onClick={() => setStockForm({ type: "OUT", partId: parts[0].id, qty: 1, note: "" })}>Xuất kho</Button>
      {tab === "catalog"
        ? <Button variant="primary" icon="plus" onClick={() => startEdit(null)}>Thêm phụ tùng</Button>
        : <Button variant="primary" icon="plus" onClick={() => setStockForm({ type: "IN", partId: parts[0].id, qty: 1, note: "" })}>Nhập kho</Button>}
    </>}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="box" tone="brand" label="Tổng mã phụ tùng" value={num(parts.length)}/>
      <StatCard icon="coins" tone="neutral" label="Giá trị tồn kho" value={vnd(parts.reduce((s, p) => s + p.stock * p.cost, 0))}/>
      <StatCard icon="alert" tone="warning" label="Sắp hết hàng" value={low}/>
      <StatCard icon="x-circle" tone="danger" label="Hết hàng" value={out}/>
    </div>
    <div className="mb-4">
      <Tabs label="Phụ tùng & kho" value={tab} onChange={id => { setParams(id === "catalog" ? {} : { tab: id }, { replace: true }); setStatus("all"); setEditing(null); }} items={[
        { id: "catalog", label: "Danh mục phụ tùng", icon: "tag" }, { id: "stock", label: "Tồn kho", icon: "box" }, { id: "moves", label: "Lịch sử nhập xuất", icon: "history" },
      ]}/>
    </div>

    {tab === "catalog" && <SplitView paneOpen={!!editing} onClose={() => setEditing(null)} paneWidth={420}
      paneTitle={<span className="flex items-center gap-2 text-cs-accent-text"><Icon name="edit" size={18}/>{editing?.id ? "Chỉnh sửa phụ tùng" : "Thêm phụ tùng"}</span>}
      paneFooter={<><Button onClick={() => setEditing(null)}>Huỷ</Button><Button variant="primary" onClick={saveEdit} disabled={!editing?.sku.trim() || !editing?.name.trim()}>Lưu thay đổi</Button></>}
      pane={editPane}
      list={<>{filters}<DataTable caption="Danh mục phụ tùng" columns={catalogColumns} rows={pageRows} rowKey={p => p.id}
        onRowClick={startEdit} rowClassName={p => p.id === editing?.id ? "bg-cs-soft/60" : ""}
        actions={p => <IconButton icon="edit" label={`Sửa ${p.name}`} size="sm" onClick={() => startEdit(p)}/>}
        footer={<Pagination {...pagination}/>}/></>}/>}

    {tab === "stock" && <>{filters}<DataTable caption="Tồn kho" columns={stockColumns} rows={pageRows} rowKey={p => p.id}
      rowClassName={p => stockLevel(p) === "out" ? "bg-danger-soft/40" : stockLevel(p) === "low" ? "bg-warning-soft/40" : ""}
      actions={p => <IconButton icon="plus" label={`Nhập thêm ${p.name}`} size="sm" onClick={() => setStockForm({ type: "IN", partId: p.id, qty: Math.max(1, p.min - p.stock), note: "" })}/>}
      footer={<Pagination {...pagination}/>}/></>}

    {tab === "moves" && <DataTable caption="Lịch sử nhập xuất" columns={moveColumns} rows={demoStockMoves} rowKey={m => m.id}/>}

    <Modal open={!!stockForm} onClose={() => setStockForm(null)} title={stockForm?.type === "IN" ? "Nhập kho" : "Xuất kho"}
      footer={<><Button onClick={() => setStockForm(null)}>Huỷ</Button><Button variant="primary" onClick={saveStock} disabled={!stockForm?.qty}>Xác nhận</Button></>}>
      {stockForm && <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Phụ tùng" required><Select value={stockForm.partId} onChange={e => setStockForm({ ...stockForm, partId: Number(e.target.value) })}>
          {parts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (tồn {p.stock})</option>)}
        </Select></Field>
        <Field label="Số lượng" required><Input inputMode="numeric" value={stockForm.qty} onChange={e => setStockForm({ ...stockForm, qty: Number(e.target.value.replace(/\D/g, "")) || 0 })}/></Field>
        <Field label={stockForm.type === "IN" ? "Nhà cung cấp / ghi chú" : "Lý do xuất"} optional className="sm:col-span-2"><Input value={stockForm.note} onChange={e => setStockForm({ ...stockForm, note: e.target.value })}/></Field>
      </div>}
    </Modal>
  </AdminPage>;
}
