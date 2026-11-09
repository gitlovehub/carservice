import { useMemo, useState } from "react";
import { Button, DataTable, IconButton, Pagination, SearchInput, type Column } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoInvoices, type DemoInvoice, type InvoiceStatus, type PaymentMethod } from "../../mocks/admin/operations";
import { AdminPage, FilterSelect, InfoList, PaneSection, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { usePaged } from "./kit/usePaged";

const methodInfo: Record<PaymentMethod, { label: string; icon: IconName }> = {
  CASH: { label: "Tiền mặt", icon: "cash" }, BANK_TRANSFER: { label: "Chuyển khoản", icon: "bank" }, VNPAY: { label: "VNPAY", icon: "qr" },
};
type View = "invoices" | "payments";
type PaymentRow = DemoInvoice["payments"][number] & { invoice: string; customer: string };

/** Hoá đơn & thanh toán — DEMO: dữ liệu từ src/mocks/admin/operations.ts (bảng invoices, payments). */
export default function Invoices() {
  const { notify } = useAppFeedback();
  const [view, setView] = useState<View>("invoices");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [selectedId, setSelectedId] = useState<number | null>(demoInvoices[2].id);

  const invoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoInvoices.filter(i => (status === "all" || i.status === status) && (!q || [i.code, i.orderCode, i.customer, i.plate].some(v => v.toLowerCase().includes(q))));
  }, [query, status]);
  const payments: PaymentRow[] = useMemo(() => demoInvoices.flatMap(i => i.payments.map(p => ({ ...p, invoice: i.code, customer: i.customer }))), []);
  const { pageRows, pagination } = usePaged(invoices, 10);
  const selected = demoInvoices.find(i => i.id === selectedId) ?? null;

  const open = demoInvoices.filter(i => i.status === "UNPAID" || i.status === "PARTIALLY_PAID");
  const debt = open.reduce((s, i) => s + i.total - i.paid, 0);
  const collected = demoInvoices.reduce((s, i) => s + i.paid, 0);

  const invoiceColumns: Column<DemoInvoice>[] = [
    { key: "code", header: "Số hoá đơn", primary: true, render: i => <span className="whitespace-nowrap"><b className="text-cs-accent-text">{i.code}</b><span className="block text-caption text-cs-muted">{i.issuedAt.slice(0, 10)}</span></span> },
    { key: "customer", header: "Khách hàng", render: i => <span className="whitespace-nowrap"><b className="text-cs-text">{i.customer}</b><span className="block text-caption text-cs-muted">{i.plate} · {i.orderCode}</span></span> },
    { key: "total", header: "Tổng tiền", align: "right", render: i => <b className="tabular-nums">{vnd(i.total)}</b> },
    { key: "due", header: "Còn nợ", align: "right", render: i => i.status === "CANCELLED" || i.total === i.paid ? <span className="text-cs-muted">—</span> : <b className="tabular-nums text-danger-fg">{vnd(i.total - i.paid)}</b> },
    { key: "status", header: "Trạng thái", render: i => <StatusBadge domain="invoice" status={i.status}/> },
  ];
  const paymentColumns: Column<PaymentRow>[] = [
    { key: "code", header: "Mã giao dịch", primary: true, render: p => <b>{p.code}</b> },
    { key: "invoice", header: "Hoá đơn", render: p => <span><span className="text-cs-accent-text">{p.invoice}</span><span className="block text-caption text-cs-muted">{p.customer}</span></span> },
    { key: "method", header: "Phương thức", render: p => <span className="inline-flex items-center gap-2"><Icon name={methodInfo[p.method].icon} size={16} className="text-cs-muted"/>{methodInfo[p.method].label}</span> },
    { key: "at", header: "Thời gian", hideOnMobile: true, render: p => <span className="tabular-nums text-cs-text-2">{p.at}</span> },
    { key: "amount", header: "Số tiền", align: "right", render: p => <b className="tabular-nums">{vnd(p.amount)}</b> },
    { key: "status", header: "Trạng thái", render: p => <StatusBadge domain="payment" status={p.status}/> },
  ];

  const pane = selected && <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-subheading font-bold text-cs-accent-text">{selected.code}</span>
      <StatusBadge domain="invoice" status={selected.status}/>
    </div>
    <PaneSection title="Thông tin" icon="file">
      <InfoList items={[
        { label: "Khách hàng", value: <b>{selected.customer}</b> }, { label: "Biển số", value: selected.plate },
        { label: "Phiếu sửa chữa", value: selected.orderCode }, { label: "Ngày lập", value: selected.issuedAt },
      ]}/>
    </PaneSection>
    <PaneSection title="Chi tiết" icon="list">
      <table className="w-full text-small">
        <tbody>
          {selected.lines.map(l => <tr key={l.name} className="border-b border-cs-border last:border-0">
            <td className="py-2 pr-2 text-cs-text">{l.name}<span className="block text-caption text-cs-muted">SL {l.qty}</span></td>
            <td className="py-2 text-right tabular-nums">{vnd(l.price * l.qty)}</td>
          </tr>)}
        </tbody>
      </table>
      <dl className="mt-3 flex flex-col gap-1.5 rounded-control bg-cs-surface-2 p-3 text-small">
        <div className="flex justify-between"><dt className="text-cs-muted">Tổng cộng</dt><dd className="font-semibold tabular-nums">{vnd(selected.total)}</dd></div>
        <div className="flex justify-between"><dt className="text-cs-muted">Đã thanh toán</dt><dd className="tabular-nums text-success-fg">{vnd(selected.paid)}</dd></div>
        <div className="flex justify-between border-t border-cs-border pt-1.5 text-subheading"><dt>Còn lại</dt><dd className="font-bold tabular-nums text-cs-accent-text">{vnd(selected.status === "CANCELLED" ? 0 : selected.total - selected.paid)}</dd></div>
      </dl>
    </PaneSection>
    <PaneSection title="Lịch sử thanh toán" icon="card">
      {selected.payments.length ? <ul className="flex flex-col gap-2 text-small">
        {selected.payments.map(p => <li key={p.code} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
          <Icon name={methodInfo[p.method].icon} size={18} className="text-cs-muted"/>
          <span className="min-w-0 flex-1"><b>{methodInfo[p.method].label}</b><span className="block text-caption text-cs-muted">{p.code} · {p.at}</span></span>
          <span className="text-right"><b className="tabular-nums">{vnd(p.amount)}</b><span className="mt-0.5 block"><StatusBadge domain="payment" status={p.status}/></span></span>
        </li>)}
      </ul> : <p className="text-small text-cs-muted">Chưa có giao dịch.</p>}
    </PaneSection>
  </>;

  return <AdminPage title="Hoá đơn & thanh toán" description="Tra cứu hoá đơn, công nợ và giao dịch (tiền mặt, chuyển khoản, VNPAY)"
    actions={<Button variant="outline" icon="download" onClick={() => notify("Xuất Excel sẽ có khi nối API.", "info")}>Xuất Excel</Button>}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="coins" tone="success" label="Đã thu trong tháng" value={vnd(collected)} delta={8} deltaLabel="so với tháng trước"/>
      <StatCard icon="invoice" tone="warning" label="Hoá đơn chưa thanh toán" value={open.length}/>
      <StatCard icon="alert" tone="danger" label="Công nợ còn lại" value={vnd(debt)}/>
      <StatCard icon="x-circle" tone="neutral" label="Giao dịch lỗi / chờ" value={payments.filter(p => p.status !== "SUCCESS").length}/>
    </div>
    <div className="mb-4"><Tabs label="Chế độ xem" variant="segment" value={view} onChange={setView} items={[
      { id: "invoices", label: "Hoá đơn", icon: "invoice" }, { id: "payments", label: "Giao dịch", icon: "card" },
    ]}/></div>
    {view === "invoices" ? <SplitView paneOpen={!!selected} onClose={() => setSelectedId(null)} paneTitle="Chi tiết hoá đơn" pane={pane}
      paneFooter={selected && selected.status !== "PAID" && selected.status !== "CANCELLED" ? <>
        <Button icon="printer" onClick={() => window.print()}>In</Button>
        <Button variant="primary" icon="cash" onClick={() => notify("Ghi nhận thanh toán do Cố vấn thực hiện khi bàn giao xe.", "info")}>Ghi nhận thu tiền</Button>
      </> : undefined}
      list={<>
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Tìm số hoá đơn, mã phiếu, khách, biển số…"/>
          <FilterSelect label="Trạng thái" value={status} onChange={setStatus} options={[
            { value: "all", label: "Tất cả" }, { value: "UNPAID", label: "Chưa thanh toán" }, { value: "PARTIALLY_PAID", label: "Thanh toán một phần" },
            { value: "PAID", label: "Đã thanh toán" }, { value: "CANCELLED", label: "Đã huỷ" },
          ]}/>
        </Toolbar>
        <DataTable caption="Danh sách hoá đơn" columns={invoiceColumns} rows={pageRows} rowKey={i => i.id}
          onRowClick={i => setSelectedId(i.id)} rowClassName={i => i.id === selectedId ? "bg-cs-soft/60" : ""}
          actions={i => <IconButton icon="eye" label={`Xem hoá đơn ${i.code}`} size="sm" onClick={() => setSelectedId(i.id)}/>}
          footer={<Pagination {...pagination}/>}/>
      </>}/>
      : <DataTable caption="Danh sách giao dịch" columns={paymentColumns} rows={payments} rowKey={p => p.code}/>}
  </AdminPage>;
}
