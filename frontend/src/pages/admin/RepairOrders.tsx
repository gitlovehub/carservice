import { useState } from "react";
import { DataTable, ErrorState, IconButton, LoadingState, Pagination, SearchInput, type Column } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { adminApi, fmtDate, fmtDateTime, fmtTime, type AdminOrder, type OrderGroup } from "../../services/adminApi";
import { getStatus } from "../../config/status";
import { AdminPage, FilterSelect, InfoList, PaneSection, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
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

  const params = { group, technician_id: tech, search: term, page };
  const list = useAdminQuery(`orders:${JSON.stringify(params)}`, signal => adminApi.repairOrders(params, signal));
  const detail = useAdminQuery(selectedId === null ? null : `order:${selectedId}`, signal => adminApi.repairOrder(selectedId as number, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const summary = result?.summary;
  const selected = detail.data;

  const resetPage = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(1); };

  const columns: Column<AdminOrder>[] = [
    { key: "code", header: "Mã phiếu", primary: true, render: o => <span className="whitespace-nowrap font-semibold text-cs-accent-text">{o.code}</span> },
    { key: "vehicle", header: "Xe / Khách", render: o => <span className="block min-w-36"><b className="block whitespace-nowrap text-cs-text">{o.vehicle || "—"}</b><span className="block whitespace-nowrap text-caption text-cs-muted">{o.plate ?? "Chưa có biển"} · {o.customer ?? "—"}</span></span> },
    { key: "promised", header: "Hẹn trả", render: o => o.estimated_ready_at ? <span className="whitespace-nowrap tabular-nums">{fmtTime(o.estimated_ready_at)}<span className="block text-caption text-cs-muted">{fmtDate(o.estimated_ready_at)}</span></span> : <span className="text-cs-muted">—</span> },
    { key: "tech", header: "Kỹ thuật viên", hideOnMobile: true, render: o => <span className="whitespace-nowrap">{o.technician ?? <span className="text-cs-muted">Chưa phân công</span>}</span> },
    { key: "estimate", header: "Dự kiến", align: "right", render: o => o.estimate ? <b className="tabular-nums">{vnd(o.estimate)}</b> : <span className="text-cs-muted">—</span> },
    { key: "status", header: "Trạng thái", render: o => <StatusBadge domain="repair" status={o.status}/> },
  ];

  const pane = selectedId === null ? null : !selected
    ? (detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact/>)
    : <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-subheading font-bold text-cs-accent-text">{selected.code}</span>
        <StatusBadge domain="repair" status={selected.status}/>
      </div>
      <PaneSection title="Xe & khách hàng" icon="car">
        <InfoList items={[
          { label: "Xe", value: <b>{selected.vehicle || "—"} · {selected.plate ?? "Chưa có biển"}</b> },
          { label: "Khách hàng", value: selected.customer ?? "—" },
          { label: "Điện thoại", value: selected.phone ?? "—" },
          { label: "Cố vấn", value: selected.advisor ?? "—" },
          { label: "Kỹ thuật viên", value: selected.technician ?? "Chưa phân công" },
          { label: "Tiếp nhận", value: fmtDateTime(selected.received_at) },
          { label: "Hẹn trả xe", value: fmtDateTime(selected.estimated_ready_at) },
        ]}/>
      </PaneSection>
      <PaneSection title="Hạng mục công việc" icon="wrench">
        {selected.items.length === 0
          ? <p className="text-small text-cs-muted">{selected.quotation_items.length ? "Báo giá chưa được duyệt, chưa tạo công việc." : "Chưa có báo giá."}</p>
          : <ul className="flex flex-col gap-2 text-small">
            {selected.items.map((item, i) => <li key={`${item.name}-${i}`} className="flex items-center gap-3">
              <Icon name={item.status === "COMPLETED" ? "check" : item.status === "IN_PROGRESS" ? "refresh" : "clock"} size={16}
                className={item.status === "COMPLETED" ? "text-success" : item.status === "IN_PROGRESS" ? "text-cs-accent-text" : "text-cs-muted"}/>
              <span className="min-w-0 flex-1 text-cs-text">{item.name}<span className="block text-caption text-cs-muted">{workItemLabel[item.status]}{item.technician ? ` · ${item.technician}` : ""}</span></span>
              {item.price > 0 && <span className="tabular-nums text-cs-text-2">{vnd(item.price)}</span>}
            </li>)}
          </ul>}
        {selected.estimate > 0 && <p className="mt-3 flex justify-between border-t border-cs-border pt-2 text-small font-semibold text-cs-text">Tổng báo giá<span className="tabular-nums">{vnd(selected.estimate)}</span></p>}
      </PaneSection>
      <PaneSection title="Tiến trình" icon="history">
        <ol className="relative ml-1.5 border-l-2 border-cs-border pl-5">
          {selected.timeline.map((t, i) => <li key={`${t.status}-${i}`} className="relative pb-3 last:pb-0 text-small">
            <span className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 border-cs-accent ${i === selected.timeline.length - 1 ? "bg-cs-accent" : "bg-cs-surface"}`}/>
            <p className="font-semibold text-cs-text">{getStatus("repair", t.status, "staff").label}</p>
            <p className="text-caption text-cs-muted">{fmtDateTime(t.at)} · {t.by}</p>
            {t.note && <p className="text-caption text-cs-text-2">{t.note}</p>}
          </li>)}
        </ol>
      </PaneSection>
    </>;

  return <AdminPage title="Phiếu sửa chữa" description="Theo dõi toàn bộ xe trong xưởng: đang ở bước nào, ai phụ trách" demo={false}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="car" tone="brand" label="Xe trong xưởng" value={summary?.in_shop ?? "—"}/>
      <StatCard icon="receipt" tone="warning" label="Báo giá / chờ duyệt" value={summary?.groups.quote ?? "—"}/>
      <StatCard icon="box" tone="violet" label="Chờ phụ tùng" value={summary?.groups.parts ?? "—"}/>
      <StatCard icon="check" tone="success" label="Đã hoàn tất" value={summary?.groups.done ?? "—"}/>
    </div>
    <SplitView paneOpen={selectedId !== null} onClose={() => setSelectedId(null)} paneTitle="Chi tiết phiếu" pane={pane}
      list={<>
        <div className="mb-4">
          <Tabs label="Lọc theo giai đoạn" variant="chips" value={group} onChange={resetPage(setGroup)} items={[
            { id: "all", label: "Tất cả", count: summary?.total },
            ...(Object.keys(groupLabels) as OrderGroup[]).map(id => ({ id, label: groupLabels[id], count: summary?.groups[id] })),
          ]}/>
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm mã phiếu, khách, SĐT, biển số…"/>
          <FilterSelect label="Kỹ thuật viên" value={tech} onChange={resetPage(setTech)} options={[
            { value: "all", label: "Tất cả" },
            ...(result?.technicians ?? []).map(t => ({ value: String(t.id), label: t.name ?? `KTV #${t.id}` })),
          ]}/>
        </Toolbar>
        <DataTable caption="Danh sách phiếu sửa chữa" columns={columns} rows={rows} rowKey={o => o.id}
          loading={list.loading} error={list.error || undefined} onRetry={list.reload}
          onRowClick={o => setSelectedId(o.id)} rowClassName={o => o.id === selectedId ? "bg-cs-soft/60" : ""}
          actions={o => <IconButton icon="eye" label={`Xem phiếu ${o.code}`} size="sm" onClick={() => setSelectedId(o.id)}/>}
          footer={result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}/>
        <p className="mt-3 flex items-center gap-2 text-caption text-cs-muted"><Icon name="info" size={14}/>Tiếp nhận, báo giá, phân công kỹ thuật viên do Cố vấn dịch vụ thực hiện; Admin theo dõi tại đây.</p>
      </>}/>
  </AdminPage>;
}
