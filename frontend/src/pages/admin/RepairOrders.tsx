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
  const params = { group, technician_id: tech, search: term, page, ...period.params, ...tableSort.params };
  const list = useAdminQuery(`orders:${JSON.stringify(params)}`, signal => adminApi.repairOrders(params, signal));
  const detail = useAdminQuery(selectedId === null ? null : `order:${selectedId}`, signal => adminApi.repairOrder(selectedId as number, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const summary = result?.summary;
  const selected = detail.data;

  const resetPage = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(1); };

  const columns: Column<AdminOrder>[] = [
    { key: "code", sortKey: "code", header: "Mã phiếu", primary: true, render: o => <span className="whitespace-nowrap font-semibold text-cs-accent-text">{o.code}</span> },
    { key: "vehicle", header: "Xe / Khách", render: o => <span className="block min-w-36"><b className="block whitespace-nowrap text-cs-text">{o.vehicle || "—"}</b><span className="block whitespace-nowrap text-caption text-cs-muted">{o.plate ?? "Chưa có biển"} · {o.customer ?? "—"}</span></span> },
    { key: "promised", sortKey: "promised", header: "Hẹn trả", render: o => o.estimated_ready_at ? <span className="whitespace-nowrap tabular-nums">{fmtTime(o.estimated_ready_at)}<span className="block text-caption text-cs-muted">{fmtDate(o.estimated_ready_at)}</span></span> : <span className="text-cs-muted">—</span> },
    { key: "tech", header: "Kỹ thuật viên", hideOnMobile: true, render: o => <span className="whitespace-nowrap">{o.technician ?? <span className="text-cs-muted">Chưa phân công</span>}</span> },
    { key: "estimate", header: "Dự kiến", align: "right", render: o => o.estimate ? <b className="tabular-nums">{vnd(o.estimate)}</b> : <span className="text-cs-muted">—</span> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: o => <StatusBadge domain="repair" status={o.status}/> },
  ];

  const pane = selectedId === null ? null : !selected
    ? (detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact/>)
    : <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-subheading font-bold text-cs-accent-text">{selected.code}</span>
        <StatusBadge domain="repair" status={selected.status}/>
      </div>
      <PaneSection title="Xe & khách hàng" icon="car">
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <InfoList items={[
            { label: "Xe", value: <b>{selected.vehicle || "—"}</b> },
            { label: "Biển số", value: <b className="tabular-nums">{selected.plate ?? "Chưa có biển"}</b> },