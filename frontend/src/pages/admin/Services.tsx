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