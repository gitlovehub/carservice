import { useMemo, useState } from "react";
import { Button, DataTable, Dropdown, Field, Input, Modal, Pagination, SearchInput, type Column } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoCustomers, type DemoCustomer } from "../../mocks/admin/people";
import { AdminPage, FilterSelect, InfoList, PaneSection, Person, Pill, SplitView, Stars, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { usePaged } from "./kit/usePaged";

type CarFilter = "all" | "has" | "none";
type Sort = "recent" | "spent" | "name";
const carColor = { white: "text-cs-muted", red: "text-cs-accent", grey: "text-cs-text-2", black: "text-cs-text" } as const;

/** Khách hàng — DEMO: dữ liệu từ src/mocks/admin/people.ts. */
export default function AdminCustomers() {
  const { notify, confirm } = useAppFeedback();
  const [locked, setLocked] = useState<number[]>([]);
  const [customers, setCustomers] = useState(demoCustomers);
  const [query, setQuery] = useState("");
  const [cars, setCars] = useState<CarFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selectedId, setSelectedId] = useState<number | null>(demoCustomers[0].id);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", address: "" });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter(c => (!q || [c.name, c.phone, c.email].some(v => v.toLowerCase().includes(q)))
      && (cars === "all" || (cars === "has" ? c.vehicles.length > 0 : c.vehicles.length === 0)));
    const key = (d: string) => d.split("/").reverse().join("");
    return [...list].sort((a, b) => sort === "spent" ? b.totalSpent - a.totalSpent : sort === "name" ? a.name.localeCompare(b.name, "vi") : key(b.lastVisit).localeCompare(key(a.lastVisit)));
  }, [customers, query, cars, sort]);
  const { pageRows, pagination } = usePaged(rows, 10);
  const selected = customers.find(c => c.id === selectedId) ?? null;

  const columns: Column<DemoCustomer>[] = [
    { key: "name", header: "Khách hàng", primary: true, render: c => <span className="flex items-center gap-2"><Person name={c.name} sub={c.email}/>{c.vip && <Icon name="star" size={14} className="shrink-0 text-warning"/>}{locked.includes(c.id) && <Icon name="lock" size={14} className="shrink-0 text-danger"/>}</span> },
    { key: "phone", header: "SĐT", render: c => <span className="whitespace-nowrap tabular-nums">{c.phone}</span> },
    { key: "city", header: "Địa chỉ", hideOnMobile: true, render: c => <span className="whitespace-nowrap">{c.city}</span> },
    { key: "cars", header: "Số xe", render: c => <span className="whitespace-nowrap">{c.vehicles.length} xe</span> },
    { key: "last", header: "Lần sửa gần nhất", hideOnMobile: true, render: c => <span className="tabular-nums">{c.lastVisit}</span> },
    { key: "spent", header: "Tổng chi tiêu", align: "right", render: c => <b className="whitespace-nowrap tabular-nums">{vnd(c.totalSpent)}</b> },
  ];

  const toggleLock = async (customer: DemoCustomer) => {
    const isLocked = locked.includes(customer.id);
    if (!isLocked && !await confirm({ title: `Khóa khách hàng ${customer.name}?`, description: "Khách sẽ không đăng nhập và đặt lịch online được. Lịch sử sửa chữa vẫn được giữ nguyên.", confirmText: "Khóa khách hàng", variant: "danger", confirmIcon: "lock", phone: customer.phone })) return;
    setLocked(list => isLocked ? list.filter(id => id !== customer.id) : [...list, customer.id]);
    notify(isLocked ? "Đã mở khóa khách hàng (demo)." : "Đã khóa khách hàng (demo).", "success");
  };

  const save = () => {
    if (!draft.name.trim() || !draft.phone.trim()) return;
    const id = Math.max(...customers.map(c => c.id)) + 1;
    setCustomers([{ id, ...draft, city: draft.address.split(",").pop()?.trim() || "—", vehicles: [], lastVisit: "—", totalSpent: 0, history: [] }, ...customers]);
    setSelectedId(id); setFormOpen(false); setDraft({ name: "", phone: "", email: "", address: "" });
    notify("Đã thêm khách hàng (demo).", "success");
  };

  const pane = selected && <>
    <div className="mb-4 flex items-center gap-3">
      <Person name={selected.name} size={52} sub={selected.vip ? "Khách hàng thân thiết" : "Khách hàng"}/>
      {selected.vip && <span className="ml-auto"><Pill tone="warning" icon="star">VIP</Pill></span>}
    </div>
    <PaneSection title="Thông tin liên hệ" icon="user" action={<Button variant="ghost" size="sm" icon="edit">Chỉnh sửa</Button>}>
      <InfoList items={[{ icon: "phone", value: selected.phone }, { icon: "mail", value: selected.email }, { icon: "pin", value: selected.address }]}/>
    </PaneSection>
    <PaneSection title={`Danh sách xe (${selected.vehicles.length})`} icon="car" action={<Button variant="ghost" size="sm" icon="plus">Thêm xe</Button>}>
      {selected.vehicles.length ? <ul className="flex flex-col gap-2">
        {selected.vehicles.map(v => <li key={v.id} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-control bg-cs-surface-2 ${carColor[v.color]}`}><Icon name="car" size={24}/></span>
          <span className="min-w-0 flex-1 text-small">
            <b className="block text-cs-text">{v.brand} {v.model}</b>
            <span className="text-cs-muted">Biển số: <span className="text-cs-text">{v.plate}</span> · Năm {v.year}</span>
          </span>
          <Icon name="chevron-right" size={16} className="text-cs-muted"/>
        </li>)}
      </ul> : <p className="text-small text-cs-muted">Khách chưa đăng ký xe.</p>}
    </PaneSection>
    <PaneSection title="Lịch sử dịch vụ" icon="history">
      {selected.history.length ? <ol className="relative ml-1.5 border-l-2 border-cs-border pl-5">
        {selected.history.map((h, i) => <li key={h.date + h.title} className="relative pb-3.5 last:pb-0">
          <span className={`absolute -left-[27px] top-1 size-3 rounded-full border-2 ${i ? "border-cs-accent bg-cs-surface" : "border-cs-accent bg-cs-accent"}`}/>
          <div className="flex items-start justify-between gap-3 text-small">
            <div className="min-w-0"><p className="text-caption text-cs-muted">{h.date}</p><p className="font-semibold text-cs-text">{h.title}</p><p className="text-caption text-cs-muted">{h.vehicle}</p></div>
            <b className="shrink-0 tabular-nums text-cs-text">{vnd(h.amount)}</b>
          </div>
        </li>)}
      </ol> : <p className="text-small text-cs-muted">Chưa có lần sửa chữa nào.</p>}
    </PaneSection>
    {selected.lastReview && <PaneSection title="Đánh giá gần nhất" icon="star" action={<span className="text-caption text-cs-muted">{selected.lastReview.date}</span>}>
      <div className="rounded-control bg-cs-surface-2 p-3.5">
        <p className="mb-1.5 flex items-center gap-2"><Stars value={selected.lastReview.rating}/><b className="text-small">{selected.lastReview.rating.toFixed(1)}</b></p>
        <p className="text-small italic text-cs-text-2">“{selected.lastReview.comment}”</p>
      </div>
    </PaneSection>}
  </>;

  return <AdminPage title="Khách hàng" description="Hồ sơ khách và xe đã đăng ký"
    actions={<Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>Thêm khách hàng</Button>}>
    <SplitView paneOpen={!!selected} onClose={() => setSelectedId(null)} paneTitle="Hồ sơ khách hàng" pane={pane}
      list={<>
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo tên, số điện thoại, email…"/>
          <FilterSelect label="Xe" value={cars} onChange={setCars} options={[{ value: "all", label: "Tất cả" }, { value: "has", label: "Có xe" }, { value: "none", label: "Chưa có xe" }]}/>
          <FilterSelect label="Sắp xếp" value={sort} onChange={setSort} options={[{ value: "recent", label: "Mới nhất" }, { value: "spent", label: "Chi tiêu cao" }, { value: "name", label: "Tên A–Z" }]}/>
        </Toolbar>
        <DataTable caption="Danh sách khách hàng" columns={columns} rows={pageRows} rowKey={c => c.id}
          onRowClick={c => setSelectedId(c.id)} rowClassName={c => c.id === selectedId ? "bg-cs-soft/60" : ""}
          actions={c => <Dropdown label={`Thao tác cho ${c.name}`} items={[
            { label: "Xem hồ sơ", icon: "eye", onSelect: () => setSelectedId(c.id) },
            { type: "separator" },
            locked.includes(c.id)
              ? { label: "Mở khóa khách hàng", icon: "key", onSelect: () => { void toggleLock(c); } }
              : { label: "Khóa khách hàng", icon: "lock", danger: true, onSelect: () => { void toggleLock(c); } },
          ]}/>}
          footer={<Pagination {...pagination}/>}/>
      </>}/>

    <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Thêm khách hàng" description="Khách sẽ nhận email kích hoạt tài khoản (khi có API)."
      footer={<><Button onClick={() => setFormOpen(false)}>Huỷ</Button><Button variant="primary" onClick={save} disabled={!draft.name.trim() || !draft.phone.trim()}>Lưu</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ tên" required className="sm:col-span-2"><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field>
        <Field label="Số điện thoại" required><Input inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></Field>
        <Field label="Email" optional><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field>
        <Field label="Địa chỉ" optional className="sm:col-span-2"><Input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="Quận/Huyện, Tỉnh/Thành"/></Field>
      </div>
    </Modal>
  </AdminPage>;
}
