import { useMemo, useState } from "react";
import { DataTable, IconButton, Pagination, SearchInput, type Column } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { demoRepairOrders, type DemoRepairOrder, type RepairStatus } from "../../mocks/admin/operations";
import { demoStaff } from "../../mocks/admin/people";
import { AdminPage, FilterSelect, InfoList, PaneSection, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { usePaged } from "./kit/usePaged";

type Group = "all" | "intake" | "quote" | "parts" | "repair" | "done";
const groups: Record<Exclude<Group, "all">, { label: string; statuses: RepairStatus[] }> = {
  intake: { label: "Tiếp nhận & kiểm tra", statuses: ["RECEIVED", "INSPECTING"] },
  quote: { label: "Báo giá", statuses: ["QUOTING", "WAITING_APPROVAL"] },
  parts: { label: "Chờ phụ tùng", statuses: ["WAITING_FOR_PARTS"] },
  repair: { label: "Đang sửa", statuses: ["IN_PROGRESS"] },
  done: { label: "Hoàn tất", statuses: ["COMPLETED", "HANDED_OVER"] },
};
const workItemLabel = { PENDING: "Chờ làm", IN_PROGRESS: "Đang làm", COMPLETED: "Hoàn thành" } as const;

/** Phiếu sửa chữa (Admin xem toàn xưởng) — DEMO: dữ liệu từ src/mocks/admin/operations.ts. Thao tác nghiệp vụ vẫn do Cố vấn thực hiện. */
export default function RepairOrders() {
  const [group, setGroup] = useState<Group>("all");
  const [query, setQuery] = useState("");
  const [tech, setTech] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(demoRepairOrders[0].id);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoRepairOrders.filter(o => (group === "all" || groups[group].statuses.includes(o.status))
      && (tech === "all" || o.technician === tech)
      && (!q || [o.code, o.customer, o.plate, o.vehicle].some(v => v.toLowerCase().includes(q))));
  }, [group, query, tech]);
  const { pageRows, pagination } = usePaged(rows, 10);
  const selected = demoRepairOrders.find(o => o.id === selectedId) ?? null;
  const inShop = demoRepairOrders.filter(o => o.status !== "HANDED_OVER").length;

  const columns: Column<DemoRepairOrder>[] = [
    { key: "code", header: "Mã phiếu", primary: true, render: o => <span className="whitespace-nowrap font-semibold text-cs-accent-text">{o.code}</span> },
    { key: "vehicle", header: "Xe / Khách", render: o => <span className="block min-w-36"><b className="block whitespace-nowrap text-cs-text">{o.vehicle}</b><span className="block whitespace-nowrap text-caption text-cs-muted">{o.plate} · {o.customer}</span></span> },
    { key: "promised", header: "Hẹn trả", render: o => <span className="whitespace-nowrap tabular-nums">{o.promisedAt.slice(11)}<span className="block text-caption text-cs-muted">{o.promisedAt.slice(0, 10)}</span></span> },
    { key: "tech", header: "Kỹ thuật viên", hideOnMobile: true, render: o => <span className="whitespace-nowrap">{o.technician ?? <span className="text-cs-muted">Chưa phân công</span>}</span> },
    { key: "estimate", header: "Dự kiến", align: "right", render: o => o.estimate ? <b className="tabular-nums">{vnd(o.estimate)}</b> : <span className="text-cs-muted">—</span> },
    { key: "status", header: "Trạng thái", render: o => <StatusBadge domain="repair" status={o.status}/> },
  ];

  const pane = selected && <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-subheading font-bold text-cs-accent-text">{selected.code}</span>
      <StatusBadge domain="repair" status={selected.status}/>
    </div>
    <PaneSection title="Xe & khách hàng" icon="car">
      <InfoList items={[
        { label: "Xe", value: <b>{selected.vehicle} · {selected.plate}</b> },
        { label: "Khách hàng", value: selected.customer },
        { label: "Điện thoại", value: selected.phone },
        { label: "Cố vấn", value: selected.advisor },
        { label: "Kỹ thuật viên", value: selected.technician ?? "Chưa phân công" },
        { label: "Hẹn trả xe", value: selected.promisedAt },
      ]}/>
    </PaneSection>
    <PaneSection title="Hạng mục công việc" icon="wrench">
      <ul className="flex flex-col gap-2 text-small">
        {selected.items.map(item => <li key={item.name} className="flex items-center gap-3">
          <Icon name={item.status === "COMPLETED" ? "check" : item.status === "IN_PROGRESS" ? "refresh" : "clock"} size={16}
            className={item.status === "COMPLETED" ? "text-success" : item.status === "IN_PROGRESS" ? "text-cs-accent-text" : "text-cs-muted"}/>
          <span className="min-w-0 flex-1 text-cs-text">{item.name}<span className="block text-caption text-cs-muted">{workItemLabel[item.status]}</span></span>
          <span className="tabular-nums text-cs-text-2">{vnd(item.price)}</span>
        </li>)}
      </ul>
    </PaneSection>
    <PaneSection title="Tiến trình" icon="history">
      <ol className="relative ml-1.5 border-l-2 border-cs-border pl-5">
        {selected.timeline.map((t, i) => <li key={t.label} className="relative pb-3 last:pb-0 text-small">
          <span className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 border-cs-accent ${i === selected.timeline.length - 1 ? "bg-cs-accent" : "bg-cs-surface"}`}/>
          <p className="font-semibold text-cs-text">{t.label}</p>
          <p className="text-caption text-cs-muted">{t.at} · {t.by}</p>
        </li>)}
      </ol>
    </PaneSection>
  </>;

  return <AdminPage title="Phiếu sửa chữa" description="Theo dõi toàn bộ xe trong xưởng: đang ở bước nào, ai phụ trách">
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="car" tone="brand" label="Xe trong xưởng" value={inShop}/>
      <StatCard icon="receipt" tone="warning" label="Chờ khách duyệt báo giá" value={demoRepairOrders.filter(o => o.status === "WAITING_APPROVAL").length}/>
      <StatCard icon="box" tone="violet" label="Chờ phụ tùng" value={demoRepairOrders.filter(o => o.status === "WAITING_FOR_PARTS").length}/>
      <StatCard icon="check" tone="success" label="Hoàn tất hôm nay" value={demoRepairOrders.filter(o => o.status === "COMPLETED").length}/>
    </div>
    <SplitView paneOpen={!!selected} onClose={() => setSelectedId(null)} paneTitle="Chi tiết phiếu" pane={pane}
      list={<>
        <div className="mb-4">
          <Tabs label="Lọc theo giai đoạn" variant="chips" value={group} onChange={setGroup} items={[
            { id: "all", label: "Tất cả", count: demoRepairOrders.length },
            ...(Object.entries(groups) as Array<[Exclude<Group, "all">, { label: string; statuses: RepairStatus[] }]>).map(([id, g]) => ({
              id, label: g.label, count: demoRepairOrders.filter(o => g.statuses.includes(o.status)).length,
            })),
          ]}/>
        </div>
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Tìm mã phiếu, khách, biển số…"/>
          <FilterSelect label="Kỹ thuật viên" value={tech} onChange={setTech} options={[
            { value: "all", label: "Tất cả" },
            ...demoStaff.filter(s => s.role === "TECHNICIAN").map(s => ({ value: s.name, label: s.name })),
          ]}/>
        </Toolbar>
        <DataTable caption="Danh sách phiếu sửa chữa" columns={columns} rows={pageRows} rowKey={o => o.id}
          onRowClick={o => setSelectedId(o.id)} rowClassName={o => o.id === selectedId ? "bg-cs-soft/60" : ""}
          actions={o => <IconButton icon="eye" label={`Xem phiếu ${o.code}`} size="sm" onClick={() => setSelectedId(o.id)}/>}
          footer={<Pagination {...pagination}/>}/>
        <p className="mt-3 flex items-center gap-2 text-caption text-cs-muted"><Icon name="info" size={14}/>Tiếp nhận, báo giá, phân công kỹ thuật viên do Cố vấn dịch vụ thực hiện; Admin theo dõi tại đây.</p>
      </>}/>
  </AdminPage>;
}
