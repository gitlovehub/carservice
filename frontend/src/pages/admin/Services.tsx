import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Button, Dropdown, EmptyState, ErrorState, Icon, IconButton, LoadingState, NEWEST_FIRST, Pagination, SearchInput, SortHeader, SortStatus, Switch, ariaSort, useTableSort, type IconName } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { errorMessage } from "../../services/adminApi";
import { CATEGORY_TONE, catalogAdminApi, money, type AdminService } from "../../services/catalogAdminApi";
import { AdminPage, FilterSelect, Pill } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { CategoryManagerModal } from "./services/CategoryManagerModal";
import { ServiceDetailModal, ServiceFormModal } from "./services/ServiceModals";

const PER_PAGE = 8;
type CategoryFilter = "all" | "none" | number;
type StatusFilter = "" | "ACTIVE" | "INACTIVE";

const iconOf = (s: AdminService): IconName => (s.service_category?.icon ?? "wrench") as IconName;

/** Dịch vụ — danh mục bên trái, bảng dịch vụ kéo thả thứ tự, bật/tắt hiển thị cho khách ngay trên dòng. */
export default function Services() {
  const { notify } = useAppFeedback();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminService | null | undefined>(undefined); // undefined = đóng, null = thêm mới
  const [viewing, setViewing] = useState<AdminService | null>(null);
  const [managing, setManaging] = useState(false);
  const [order, setOrder] = useState<number[] | null>(null); // thứ tự tạm khi vừa kéo thả
  const [overrides, setOverrides] = useState<Record<number, Partial<AdminService>>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const term = useDebounced(search.trim());
  // Mặc định mới tạo lên đầu. Kéo thả chỉ dùng được khi xếp theo "Thứ tự hiển thị" (thứ tự khách thấy khi đặt lịch).
  const tableSort = useTableSort(NEWEST_FIRST, () => { setPage(1); setOrder(null); });
  const { sort } = tableSort;
  const canDrag = sort.key === "order" && sort.dir === "asc";

  const params = {
    page, per_page: PER_PAGE, search: term, status: status || undefined,
    category_id: typeof category === "number" ? category : undefined,
    uncategorized: category === "none" ? 1 : undefined,
    ...tableSort.params,
  };
  const cats = useAdminQuery("service-categories", signal => catalogAdminApi.categories(signal));
  const list = useAdminQuery(`services:${JSON.stringify(params)}`, signal => catalogAdminApi.services(params, signal));
  const result = list.data ?? list.stale;
  const categories = (cats.data ?? cats.stale)?.data ?? [];
  const meta = (cats.data ?? cats.stale)?.meta;
  const base = (result?.data ?? []).map(s => ({ ...s, ...overrides[s.id] }));
  const rows = order ? order.map(id => base.find(s => s.id === id)).filter((s): s is AdminService => Boolean(s)) : base;
  const visibleRows = rows;

  const reload = () => { setOrder(null); setOverrides({}); list.reload(); cats.reload(); };
  const pick = (c: CategoryFilter) => { setCategory(c); setPage(1); setOrder(null); };

  const patch = async (s: AdminService, change: Partial<Pick<AdminService, "is_visible" | "is_popular" | "status">>, message: string) => {
    setOverrides(o => ({ ...o, [s.id]: { ...o[s.id], ...change } }));
    try {
      await catalogAdminApi.updateService(s.id, change);
      notify(message, "success");
      cats.reload();
    } catch (e) {
      setOverrides(o => { const next = { ...o }; delete next[s.id]; return next; });
      notify(errorMessage(e, "Không cập nhật được dịch vụ."), "error");
    }
  };

  const saveOrder = async (ids: number[], moved: AdminService) => {
    setOrder(ids);
    try {
      await catalogAdminApi.reorderServices(ids);
      notify(`Đã đổi thứ tự “${moved.name}” — khách thấy theo thứ tự mới khi đặt lịch.`, "success");
    } catch (e) {
      setOrder(null);
      notify(errorMessage(e, "Không lưu được thứ tự."), "error");
    }
  };
  const move = (from: number, to: number) => {
    const ids = visibleRows.map(s => s.id);
    if (to < 0 || to >= ids.length || from === to) return;
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    void saveOrder(ids, visibleRows[from]);
  };
  const onDrop = (e: DragEvent, targetId: number) => {
    e.preventDefault();
    const from = visibleRows.findIndex(s => s.id === dragId);
    const to = visibleRows.findIndex(s => s.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from >= 0 && to >= 0) move(from, to);
  };
  const onHandleKey = (e: KeyboardEvent, index: number) => {
    if (e.key === "ArrowUp") { e.preventDefault(); move(index, index - 1); }
    if (e.key === "ArrowDown") { e.preventDefault(); move(index, index + 1); }
  };

  const categoryItems: Array<{ id: CategoryFilter; name: string; icon: IconName; count: number }> = [
    { id: "all", name: "Tất cả dịch vụ", icon: "grid", count: meta?.total ?? 0 },
    ...categories.map(c => ({ id: c.id as CategoryFilter, name: c.name, icon: c.icon as IconName, count: c.services_count })),
    ...(meta?.uncategorized ? [{ id: "none" as CategoryFilter, name: "Chưa phân loại", icon: "tag" as IconName, count: meta.uncategorized }] : []),
  ];
  const currentCategoryId = typeof category === "number" ? category : null;

  return <AdminPage demo={false} title="Dịch vụ" description="Danh mục dịch vụ hiển thị khi khách đặt lịch"
    actions={<Button variant="primary" icon="plus" onClick={() => setEditing(null)}>Thêm dịch vụ</Button>}>
    <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Cột danh mục */}
      <nav aria-label="Danh mục dịch vụ" className="rounded-card border border-cs-border bg-cs-surface p-3 shadow-card lg:sticky lg:top-[84px]">
        <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
          <h2 className="flex items-center gap-2 text-subheading font-semibold text-cs-text"><Icon name="tag" size={18} className="text-cs-muted"/>Danh mục dịch vụ</h2>
          <IconButton icon="edit" size="sm" label="Quản lý danh mục" onClick={() => setManaging(true)}/>
        </div>
        {cats.loading && !categories.length ? <LoadingState compact/> : <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {categoryItems.map(c => {
            const active = category === c.id;
            return <li key={String(c.id)} className="shrink-0">
              <button type="button" aria-current={active ? "true" : undefined} onClick={() => pick(c.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-left text-small transition-colors ${active ? "bg-cs-soft font-semibold text-cs-accent-text" : "text-cs-text hover:bg-cs-hover"}`}>
                <Icon name={c.icon} size={18} className={active ? "" : "text-cs-text-2"}/>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-caption font-semibold tabular-nums ${active ? "bg-cs-surface text-cs-accent-text" : "bg-cs-surface-2 text-cs-text-2"}`}>{c.count}</span>
              </button>
            </li>;
          })}
        </ul>}
      </nav>

      {/* Bảng dịch vụ */}
      <section aria-label="Danh sách dịch vụ" className="min-w-0 rounded-card border border-cs-border bg-cs-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-cs-border p-4">
          <SearchInput className="sm:max-w-sm" value={search} onChange={v => { setSearch(v); setPage(1); setOrder(null); }} placeholder="Tìm theo tên dịch vụ…"/>
          <FilterSelect label="Danh mục" value={String(category)} onChange={v => pick(v === "all" || v === "none" ? v : Number(v))} options={[
            { value: "all", label: "Tất cả danh mục" }, ...categories.map(c => ({ value: String(c.id), label: c.name })),
          ]}/>
          <FilterSelect label="Trạng thái" value={status} onChange={v => { setStatus(v); setPage(1); setOrder(null); }} options={[
            { value: "", label: "Tất cả trạng thái" }, { value: "ACTIVE", label: "Đang áp dụng" }, { value: "INACTIVE", label: "Ngừng" },
          ]}/>
        </div>
        <SortStatus className="px-4 pt-3" sort={sort} onReset={() => tableSort.toggle("created", "desc")} label={({
          created: sort.dir === "desc" ? "Mới tạo nhất" : "Cũ nhất", order: "Thứ tự hiển thị (kéo thả được)", name: "Tên dịch vụ", category: "Danh mục",
          price: "Giá cơ bản", minutes: "Thời gian", popular: "Phổ biến", status: "Trạng thái", visible: "Hiển thị",
        } as Record<string, string>)[sort.key] ?? sort.key}/>

        {list.error ? <ErrorState description={list.error} onRetry={list.reload}/>
          : list.loading && !visibleRows.length ? <LoadingState/>
          : !visibleRows.length ? <EmptyState title="Không có dịch vụ" description={term || status ? "Thử đổi từ khoá hoặc bộ lọc." : "Bấm “Thêm dịch vụ” để tạo dịch vụ đầu tiên của danh mục này."}/>
          : <div className="overflow-x-auto" aria-busy={list.loading || undefined}>
            <table data-ui="table" className="w-full min-w-[860px] border-collapse text-small">
              <caption className="sr-only">Danh sách dịch vụ — bấm tiêu đề cột để sắp xếp; khi xếp theo thứ tự hiển thị, kéo biểu tượng ⋮⋮ hoặc dùng phím mũi tên lên/xuống để đổi thứ tự</caption>
              <thead>
                <tr className="bg-cs-surface-2 text-left text-cs-text-2">
                  <th scope="col" className="w-8 px-1 py-3 text-center" aria-sort={ariaSort(sort, "order")}>
                    <button type="button" onClick={() => tableSort.toggle("order", "asc")} aria-label="Xếp theo thứ tự hiển thị (để kéo thả)"
                      title={canDrag ? "Đang xếp theo thứ tự hiển thị — kéo ⋮⋮ để đổi" : "Xếp theo thứ tự hiển thị để kéo thả"}
                      className={`grid size-7 cursor-pointer place-items-center rounded-md transition-colors hover:bg-cs-hover ${canDrag ? "text-cs-accent-text" : "text-cs-muted"}`}>
                      <Icon name="drag" size={15}/>
                    </button>
                  </th>
                  {([
                    ["name", "Tên dịch vụ", "left"], ["category", "Danh mục", "left"], ["price", "Giá cơ bản", "right"], ["minutes", "Thời gian", "left"],
                    ["popular", "Phổ biến", "left"], ["status", "Trạng thái", "left"], ["visible", "Hiển thị", "center"],
                  ] as const).map(([key, label, align]) => <th key={key} scope="col" aria-sort={ariaSort(sort, key)}
                    className={`px-2.5 py-3 font-semibold ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""}`}>
                    <SortHeader label={label} sortKey={key} sort={sort} onSort={tableSort.toggle} align={align}/>
                  </th>)}
                  <th scope="col" className="w-14 px-2.5 py-3 text-center font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((s, index) => {
                  const active = s.status === "ACTIVE";
                  const tone = CATEGORY_TONE[s.service_category?.icon ?? "wrench"] ?? "neutral";
                  return <tr key={s.id} draggable={dragId === s.id}
                    onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(s.id)); }}
                    onDragOver={e => { if (dragId !== null) { e.preventDefault(); setOverId(s.id); } }}
                    onDrop={e => onDrop(e, s.id)} onDragEnd={() => { setDragId(null); setOverId(null); }}
                    className={`border-t border-cs-border transition-colors ${overId === s.id && dragId !== s.id ? "bg-cs-soft" : "hover:bg-cs-hover/60"} ${dragId === s.id ? "opacity-50" : ""} ${active ? "" : "text-cs-muted"}`}>
                    <td className="px-1 py-3 text-center">
                      <button type="button" disabled={!canDrag}
                        aria-label={canDrag ? `Đổi thứ tự “${s.name}” (vị trí ${index + 1}) — kéo thả hoặc phím mũi tên` : "Xếp theo thứ tự hiển thị để kéo thả"}
                        title={canDrag ? "Kéo để đổi thứ tự" : "Bấm biểu tượng ⋮⋮ trên tiêu đề để xếp theo thứ tự hiển thị rồi kéo thả"}
                        onMouseDown={() => { if (canDrag) setDragId(s.id); }} onMouseUp={() => setDragId(null)}
                        onKeyDown={e => { if (canDrag) onHandleKey(e, index); }}
                        className="grid size-8 cursor-grab place-items-center rounded-md text-cs-muted hover:bg-cs-hover hover:text-cs-text active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent">
                        <Icon name="drag" size={16}/>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-control ${active ? "bg-cs-soft text-cs-accent-text" : "bg-cs-surface-2 text-cs-muted"}`}><Icon name={iconOf(s)} size={20}/></span>
                        <span className="min-w-0">
                          <button type="button" onClick={() => setViewing(s)} className="block max-w-[180px] cursor-pointer truncate text-left font-semibold text-cs-text hover:underline">{s.name}</button>
                          <span className="block max-w-[180px] truncate text-caption text-cs-muted">{s.description || "Chưa có mô tả"}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">{s.service_category ? <Pill tone={tone}>{s.service_category.name}</Pill> : <span className="text-caption text-cs-muted">Chưa phân loại</span>}</td>
                    <td className="whitespace-nowrap px-2.5 py-3 text-right font-semibold tabular-nums text-cs-text">{money(s.base_price)}</td>
                    <td className="whitespace-nowrap px-2.5 py-3"><span className="inline-flex items-center gap-1.5 text-cs-text-2"><Icon name="clock" size={15} className="text-cs-muted"/>{s.estimated_minutes ? `${s.estimated_minutes} phút` : "—"}</span></td>
                    <td className="px-3 py-3">{s.is_popular ? <Pill tone="warning" icon="star">Phổ biến</Pill> : <span className="text-cs-muted">—</span>}</td>
                    <td className="whitespace-nowrap px-2.5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${active ? "bg-success-soft text-success-fg" : "bg-neutral-soft text-neutral-fg"}`}>
                        <span className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-cs-muted"}`} aria-hidden="true"/>{active ? "Đang áp dụng" : "Ngừng"}
                      </span>
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      <Switch checked={active && s.is_visible} disabled={!active} label={active ? `Hiển thị “${s.name}” cho khách khi đặt lịch` : `“${s.name}” đang ngừng — bật lại để hiển thị`}
                        onChange={v => void patch(s, { is_visible: v }, v ? `“${s.name}” đã hiện trên trang đặt lịch của khách.` : `Đã ẩn “${s.name}” khỏi trang đặt lịch (nhân viên vẫn dùng được khi báo giá).`)}/>
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      <Dropdown label={`Thao tác dịch vụ ${s.name}`} items={[
                        { label: "Chi tiết & bước chuẩn", icon: "eye", onSelect: () => setViewing(s) },
                        { label: "Chỉnh sửa", icon: "edit", onSelect: () => setEditing(s) },
                        { label: s.is_popular ? "Bỏ khỏi nhóm Phổ biến" : "Đánh dấu Phổ biến", icon: "star",
                          onSelect: () => void patch(s, { is_popular: !s.is_popular }, s.is_popular ? `Đã bỏ “${s.name}” khỏi nhóm Phổ biến.` : `Đã đưa “${s.name}” vào nhóm Phổ biến.`) },
                        { type: "separator" },
                        active
                          ? { label: "Ngừng áp dụng", icon: "ban", danger: true, onSelect: () => void patch(s, { status: "INACTIVE" }, `Đã ngừng dịch vụ “${s.name}” — khách không đặt được và không dùng trong báo giá mới.`) }
                          : { label: "Áp dụng lại", icon: "check", onSelect: () => void patch(s, { status: "ACTIVE" }, `Đã áp dụng lại dịch vụ “${s.name}”.`) },
                      ]}/>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 pb-4">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={result.per_page}
            disabled={list.loading} onChange={p => { setPage(p); setOrder(null); }}/>
        </div>}
        {result && result.last_page <= 1 && visibleRows.length > 0 && <p className="border-t border-cs-border px-4 py-3 text-caption text-cs-muted">Hiển thị {visibleRows.length} dịch vụ · {canDrag ? "kéo ⋮⋮ để đổi thứ tự khách thấy khi đặt lịch" : "bấm ⋮⋮ trên tiêu đề để xếp theo thứ tự hiển thị và kéo thả"}</p>}
      </section>
    </div>

    {editing !== undefined && <ServiceFormModal open key={editing?.id ?? "new"} service={editing} categories={categories} defaultCategoryId={currentCategoryId}
      onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }}/>}
    <ServiceDetailModal service={viewing} onClose={() => setViewing(null)}
      onMinutes={minutes => { if (viewing && minutes !== null) { setViewing({ ...viewing, estimated_minutes: minutes }); setOverrides(o => ({ ...o, [viewing.id]: { ...o[viewing.id], estimated_minutes: minutes } })); } }}/>
    {managing && <CategoryManagerModal open categories={categories} icons={meta?.icons ?? []} onClose={() => setManaging(false)} onChanged={() => { cats.reload(); list.reload(); }}/>}
  </AdminPage>;
}
