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