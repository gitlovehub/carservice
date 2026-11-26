import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, Drawer, ErrorState, LoadingState, Pagination, SearchInput, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { ServiceStoppedTag, StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { adminApi, fmtDate, fmtDateTime, fmtTime, type AdminOrder, type OrderGroup } from "../../services/adminApi";
import { getStatus } from "../../config/status";
import { AdminPage, ClearFilters, FilterSelect, InfoList, PaneSection, Pill, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

type Group = "all" | OrderGroup;
const groupLabels: Record<OrderGroup, string> = {
  intake: "Tiếp nhận & kiểm tra", quote: "Báo giá", parts: "Chờ phụ tùng", repair: "Đang sửa", done: "Hoàn tất", closed: "Đã đóng",
};
const workItemLabel = { PENDING: "Chờ làm", IN_PROGRESS: "Đang làm", COMPLETED: "Hoàn thành", CANCELLED: "Đã huỷ" } as const;

/** Phiếu sửa chữa (Admin xem toàn xưởng) — dữ liệu thật từ /api/admin/repair-orders. Thao tác nghiệp vụ vẫn do Cố vấn thực hiện. */
export default function RepairOrders() {
  const [group, setGroup] = useState<Group>("all");
  const [search, setSearch] = useState("");
  const [tech, setTech] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const term = useDebounced(search.trim());

  const tableSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const period = usePeriod("all", () => setPage(1));