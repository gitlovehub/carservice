import { useState } from "react";
import { Button, Dropdown, EmptyState, ErrorState, Icon, LoadingState, NEWEST_FIRST, Pagination, SearchInput, SortHeader, Switch, ariaSort, useTableSort, type IconName } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { errorMessage } from "../../services/adminApi";
import { CATEGORY_TONE, catalogAdminApi, money, serviceActivationProblems, type AdminService } from "../../services/catalogAdminApi";
import { AdminPage, ClearFilters, FilterSelect, Pill } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { CategoryDrawer, type CategoryFilter } from "./services/CategoryDrawer";
import { ServiceDetailModal, ServiceFormModal } from "./services/ServiceModals";

const PER_PAGE = 8;
type StatusFilter = "" | "ACTIVE" | "INACTIVE";

const iconOf = (s: AdminService): IconName => (s.service_category?.icon ?? "wrench") as IconName;

/** Cột bảng dịch vụ: [khoá sắp xếp | null, tiêu đề, căn lề]. */
const COLUMNS: Array<[string | null, string, "left" | "right" | "center"]> = [
  [null, "Tên dịch vụ", "left"], ["category", "Danh mục", "left"], ["price", "Giá cơ bản", "right"],
  ["minutes", "Thời gian", "center"], ["status", "Trạng thái", "left"],
];
const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/** Dịch vụ — thống kê, bộ lọc và bảng dịch vụ; danh mục mở trong ngăn kéo bên phải. */
export default function Services() {
  const { confirm, notify } = useAppFeedback();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminService | null | undefined>(undefined); // undefined = đóng, null = thêm mới
  const [viewing, setViewing] = useState<AdminService | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Partial<AdminService>>>({});
  const term = useDebounced(search.trim());
  const tableSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const { sort } = tableSort;

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
  const rows = (result?.data ?? []).map(s => ({ ...s, ...overrides[s.id] }));

  const reload = () => { setOverrides({}); list.reload(); cats.reload(); };
  const pick = (c: CategoryFilter) => { setCategory(c); setPage(1); };

  const patch = async (s: AdminService, change: Partial<Pick<AdminService, "is_visible" | "status">>, message: string) => {
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

  const stop = async (s: AdminService) => {
    const packages = s.active_packages_count ?? 0;
    const accepted = await confirm({
      title: `Ngừng áp dụng “${s.name}”?`,
      description: `Dịch vụ sẽ tắt cả 2 trạng thái, khách không đặt được và không thêm được vào báo giá mới.${packages ? ` ${packages} gói bảo dưỡng đang bán sẽ tự bỏ qua dịch vụ này.` : ""}`,
      confirmText: "Ngừng áp dụng", variant: "danger", confirmIcon: "ban",
    });
    if (accepted) await patch(s, { status: "INACTIVE", is_visible: false }, `Đã ngừng dịch vụ “${s.name}”.`);
  };

  const deleteBlocker = (s: AdminService) => s.status === "ACTIVE"
    ? (s.is_visible ? "tắt cả 2 trạng thái trước" : "tắt Đang áp dụng trước")
    : s.is_in_use ? "đã có trong lịch sử" : null;

  const removePermanently = async (s: AdminService) => {
    const accepted = await confirm({ title: `Xóa vĩnh viễn “${s.name}”?`, description: "Dịch vụ chưa từng được sử dụng nên không ảnh hưởng lịch sử. Thao tác này không thể hoàn tác.", confirmText: "Xóa vĩnh viễn", variant: "danger", confirmIcon: "trash" });
    if (!accepted) return;
    try {
      notify((await catalogAdminApi.deleteServicePermanently(s.id)).message, "success");
      if (rows.length === 1 && page > 1) setPage(page - 1);
      reload();
    } catch (e) {
      notify(errorMessage(e, "Không xóa được dịch vụ."), "error");
      reload();
    }
  };

  const currentCategoryId = typeof category === "number" ? category : null;
  const categoryOptions = [
    { value: "all", label: "Tất cả danh mục" }, ...categories.map(c => ({ value: String(c.id), label: c.name })),
    ...(meta?.uncategorized ? [{ value: "none", label: "Chưa phân loại" }] : []),
  ];

  return <AdminPage demo={false} title="Dịch vụ" description="Danh mục dịch vụ hiển thị khi khách đặt lịch"
    actions={<>
      <Button variant="outline" icon="tag" onClick={() => setShowCategories(true)}>Xem danh mục dịch vụ</Button>
      <Button variant="primary" icon="plus" onClick={() => setEditing(null)}>Thêm dịch vụ</Button>
    </>}>
    {meta && <dl className="mb-4 grid gap-3 sm:grid-cols-3">
      {([
        ["Tổng dịch vụ", meta.total, "grid"], ["Đang áp dụng", meta.active, "check"], ["Hiển thị cho khách", meta.visible, "eye"],
      ] as const).map(([label, value, icon]) => <div key={label} className="flex items-center gap-3 rounded-card border border-cs-border bg-cs-surface px-4 py-3 shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name={icon} size={18}/></span>
        <span className="min-w-0">
          <dt className="truncate text-caption text-cs-muted">{label}</dt>
          <dd className="text-subheading font-bold tabular-nums text-cs-text">{value ?? "—"}</dd>
        </span>
      </div>)}
    </dl>}

    <section aria-label="Danh sách dịch vụ" className="min-w-0 rounded-card border border-cs-border bg-cs-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-cs-border p-4">
        <SearchInput className="sm:max-w-sm" value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Tìm theo tên dịch vụ…"/>
        <FilterSelect label="Danh mục" value={String(category)} onChange={v => pick(v === "all" || v === "none" ? v : Number(v))} options={categoryOptions}/>
        <FilterSelect label="Trạng thái" value={status} onChange={v => { setStatus(v); setPage(1); }} options={[
          { value: "", label: "Tất cả trạng thái" }, { value: "ACTIVE", label: "Đang áp dụng" }, { value: "INACTIVE", label: "Nháp / Ngừng" },
        ]}/>
        <ClearFilters active={search !== "" || category !== "all" || status !== "" || !tableSort.isDefault}
          onClear={() => { setSearch(""); setCategory("all"); setStatus(""); tableSort.reset(); setPage(1); }}/>
      </div>

      {list.error ? <ErrorState description={list.error} onRetry={list.reload}/>
        : list.loading && !rows.length ? <LoadingState/>
        : !rows.length ? <EmptyState title="Không có dịch vụ" description={term || status ? "Thử đổi từ khoá hoặc bộ lọc." : "Bấm “Thêm dịch vụ” để tạo dịch vụ đầu tiên của danh mục này."}/>
        : <div className="overflow-x-auto" aria-busy={list.loading || undefined}>
          <table data-ui="table" className="w-full min-w-[760px] table-fixed border-collapse text-small">
            <caption className="sr-only">Danh sách dịch vụ — bấm tiêu đề cột để sắp xếp</caption>
            <colgroup><col className="w-[30%]"/><col/><col/><col/><col/><col className="w-[88px]"/></colgroup>
            <thead>
              <tr className="bg-cs-surface-2 text-cs-text-2">
                {COLUMNS.map(([key, label, align]) => <th key={label} scope="col" aria-sort={key ? ariaSort(sort, key) : undefined}
                  className={`whitespace-nowrap px-3 py-3 font-semibold ${alignClass[align]}`}>
                  {key ? <SortHeader label={label} sortKey={key} sort={sort} onSort={tableSort.toggle} align={align}/> : label}
                </th>)}
                <th scope="col" className="whitespace-nowrap px-3 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => {
                const active = s.status === "ACTIVE";
                const missing = serviceActivationProblems(s);
                const isDraft = !active && missing.length > 0;
                const blocker = deleteBlocker(s);
                const tone = CATEGORY_TONE[s.service_category?.icon ?? "wrench"] ?? "neutral";
                return <tr key={s.id} className={`border-t border-cs-border transition-colors hover:bg-cs-hover/60 ${active ? "" : "text-cs-muted"}`}>
                  <td className="px-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      {s.image_url
                        ? <img src={s.image_url} alt="" className={`size-10 shrink-0 rounded-control border border-cs-border object-cover ${active ? "" : "opacity-60"}`} loading="lazy"/>
                        : <span className={`grid size-10 shrink-0 place-items-center rounded-control ${active ? "bg-cs-soft text-cs-accent-text" : "bg-cs-surface-2 text-cs-muted"}`}><Icon name={iconOf(s)} size={20}/></span>}
                      <span className="min-w-0">
                        <button type="button" onClick={() => setViewing(s)} className="block max-w-full cursor-pointer truncate text-left font-semibold text-cs-text hover:underline">{s.name}</button>
                        <span className="block truncate text-caption text-cs-muted font-medium">{s.description || "Chưa có mô tả"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">{s.service_category ? <Pill tone={tone}>{s.service_category.name}</Pill> : <span className="text-caption text-cs-muted">Chưa phân loại</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-cs-text">{money(s.base_price)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-cs-text-2">{s.estimated_minutes ? `${s.estimated_minutes} phút` : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${active ? "bg-success-soft text-success-fg" : isDraft ? "bg-warning-soft text-warning-fg" : "bg-neutral-soft text-neutral-fg"}`}>
                        <span className={`size-1.5 rounded-full ${active ? "bg-success" : isDraft ? "bg-warning" : "bg-cs-muted"}`} aria-hidden="true"/>{active ? "Áp dụng" : isDraft ? "Nháp" : "Ngừng"}