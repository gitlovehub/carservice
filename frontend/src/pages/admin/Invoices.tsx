import { useState } from "react";
import { Button, DataTable, ErrorState, LoadingState, Pagination, SearchInput, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, fmtDateTime, fmtTime, type AdminInvoice, type AdminPayment, type InvoiceStatus, type PaymentGroup } from "../../services/adminApi";
import { getStatus } from "../../config/status";
import { AdminPage, ClearFilters, FilterSelect, InfoList, PaneSection, SplitView, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

const methodInfo: Record<PaymentGroup, { label: string; icon: IconName }> = {
  CASH: { label: "Tiền mặt", icon: "cash" }, BANK_TRANSFER: { label: "Chuyển khoản", icon: "bank" }, VNPAY: { label: "VNPAY", icon: "qr" },
};
type View = "invoices" | "payments";

/** Xuất CSV (mở được bằng Excel, giữ tiếng Việt nhờ BOM UTF-8). */
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + rows.map(r => r.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/** Hoá đơn & thanh toán — dữ liệu thật từ /api/admin/invoices, /api/admin/payments. */
export default function Invoices() {
  const { notify } = useAppFeedback();
  const [view, setView] = useState<View>("invoices");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [page, setPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(search.trim());

  const invoiceSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const paymentSort = useTableSort(NEWEST_FIRST, () => setPaymentPage(1));
  const params = { status, search: term, page, ...invoiceSort.params };
  const invoices = useAdminQuery(view === "invoices" ? `invoices:${JSON.stringify(params)}` : null, signal => adminApi.invoices(params, signal));
  const payments = useAdminQuery(view === "payments" ? `payments:${term}:${paymentPage}:${paymentSort.sort.key}:${paymentSort.sort.dir}` : null, signal => adminApi.payments({ search: term, page: paymentPage, ...paymentSort.params }, signal));
  const detail = useAdminQuery(selectedId === null ? null : `invoice:${selectedId}`, signal => adminApi.invoice(selectedId as number, signal));
  const result = invoices.data ?? invoices.stale;
  const paymentResult = payments.data ?? payments.stale;
  const summary = result?.summary;
  const selected = detail.data;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: AdminInvoice[] = [];
      for (let p = 1, last = 1; p <= last && p <= 50; p++) {
        const chunk = await adminApi.invoices({ status, search: term, page: p, per_page: 100 });
        rows.push(...chunk.data);
        last = chunk.meta.last_page;
      }
      downloadCsv(`hoa-don-${new Date().toISOString().slice(0, 10)}.csv`, [
        ["Số hoá đơn", "Ngày lập", "Phiếu sửa chữa", "Khách hàng", "Biển số", "Tạm tính", "Giảm giá", "Tổng tiền", "Đã thu", "Còn nợ", "Trạng thái"],
        ...rows.map(i => [i.code, fmtDate(i.issued_at), i.order_code ?? "", i.customer ?? "", i.plate ?? "", i.subtotal, i.discount, i.total, i.paid,
          i.status === "CANCELLED" ? 0 : Math.max(0, i.total - i.paid), getStatus("invoice", i.status, "staff").label]),
      ]);
      notify(`Đã xuất ${rows.length} hoá đơn.`, "success");
    } catch (error) {
      notify(errorMessage(error, "Không xuất được file."), "error");
    } finally {
      setExporting(false);
    }
  };

  const invoiceColumns: Column<AdminInvoice>[] = [
    { key: "code", sortKey: "code", header: "Số hoá đơn", primary: true, render: i => <b className="block truncate text-cs-accent-text">{i.code}</b> },
    { key: "issued", sortKey: "created", header: "Ngày lập", render: i => <span className="block whitespace-nowrap tabular-nums"><span className="block text-cs-text">{fmtDate(i.issued_at)}</span><span className="block text-caption text-cs-muted">{fmtTime(i.issued_at)}</span></span> },
    { key: "customer", header: "Khách hàng", render: i => <span className="block min-w-0"><b className="block truncate text-cs-text">{i.customer ?? "—"}</b><span className="block truncate text-caption text-cs-muted">{i.plate ?? "—"} · {i.order_code ?? "—"}</span></span> },
    { key: "total", sortKey: "total", header: "Tổng tiền", align: "right", render: i => <b className="tabular-nums">{vnd(i.total)}</b> },
    { key: "due", header: "Còn nợ", align: "right", render: i => i.status === "CANCELLED" || i.paid >= i.total ? <span className="text-cs-muted">—</span> : <b className="tabular-nums text-danger-fg">{vnd(i.total - i.paid)}</b> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: i => <StatusBadge domain="invoice" status={i.status}/> },
  ];
  const paymentColumns: Column<AdminPayment>[] = [
    { key: "code", sortKey: "code", header: "Mã giao dịch", primary: true, render: p => <b>{p.code}</b> },
    { key: "invoice", header: "Hoá đơn", render: p => <span><span className="text-cs-accent-text">{p.invoice ?? "—"}</span><span className="block text-caption text-cs-muted">{p.customer ?? "—"}</span></span> },
    { key: "method", header: "Phương thức", render: p => <span className="inline-flex items-center gap-2"><Icon name={methodInfo[p.method].icon} size={16} className="text-cs-muted"/>{methodInfo[p.method].label}</span> },
    { key: "at", sortKey: "created", header: "Thời gian", hideOnMobile: true, render: p => <span className="block whitespace-nowrap tabular-nums"><span className="block text-cs-text">{fmtDate(p.at)}</span><span className="block text-caption text-cs-muted">{fmtTime(p.at)}</span></span> },
    { key: "amount", sortKey: "amount", header: "Số tiền", align: "right", render: p => <b className="tabular-nums">{vnd(p.amount)}</b> },
    { key: "status", sortKey: "status", header: "Trạng thái", render: p => <StatusBadge domain="payment" status={p.status}/> },
  ];

  const pane = selectedId === null ? null : !selected
    ? (detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact/>)
    : <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-subheading font-bold text-cs-accent-text">{selected.code}</span>
        <StatusBadge domain="invoice" status={selected.status}/>
      </div>
      <PaneSection title="Thông tin" icon="file">
        <InfoList items={[
          { label: "Khách hàng", value: <b>{selected.customer ?? "—"}</b> }, { label: "Biển số", value: selected.plate ?? "—" },
          { label: "Phiếu sửa chữa", value: selected.order_code ?? "—" }, { label: "Ngày lập", value: fmtDateTime(selected.issued_at) },
        ]}/>
      </PaneSection>
      <PaneSection title="Chi tiết" icon="list">
        <table className="w-full text-small">
          <tbody>
            {selected.lines.map((l, i) => <tr key={`${l.name}-${i}`} className="border-b border-cs-border last:border-0">
              <td className="py-2 pr-2 text-cs-text">{l.name}<span className="block text-caption text-cs-muted">{l.type === "PART" ? "Phụ tùng" : "Dịch vụ"} · SL {l.quantity} × {vnd(l.price)}</span></td>
              <td className="py-2 text-right tabular-nums">{vnd(l.amount)}</td>
            </tr>)}
          </tbody>
        </table>
        <dl className="mt-3 flex flex-col gap-1.5 rounded-control bg-cs-surface-2 p-3 text-small">
          {selected.discount > 0 && <>
            <div className="flex justify-between"><dt className="text-cs-muted">Tạm tính</dt><dd className="tabular-nums">{vnd(selected.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-cs-muted">Giảm giá</dt><dd className="tabular-nums">−{vnd(selected.discount)}</dd></div>
          </>}
          <div className="flex justify-between"><dt className="text-cs-muted">Tổng cộng</dt><dd className="font-semibold tabular-nums">{vnd(selected.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-cs-muted">Đã thanh toán</dt><dd className="tabular-nums text-success-fg">{vnd(selected.paid)}</dd></div>
          <div className="flex justify-between border-t border-cs-border pt-1.5 text-subheading"><dt>Còn lại</dt><dd className="font-bold tabular-nums text-cs-accent-text">{vnd(selected.status === "CANCELLED" ? 0 : Math.max(0, selected.total - selected.paid))}</dd></div>
        </dl>
      </PaneSection>
      <PaneSection title="Lịch sử thanh toán" icon="card">
        {selected.payments.length ? <ul className="flex flex-col gap-2 text-small">
          {selected.payments.map(p => <li key={p.id} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
            <Icon name={methodInfo[p.method].icon} size={18} className="text-cs-muted"/>
            <span className="min-w-0 flex-1"><b>{methodInfo[p.method].label}</b><span className="block text-caption text-cs-muted">{p.code} · {fmtDateTime(p.at)}</span></span>
            <span className="text-right"><b className="tabular-nums">{vnd(p.amount)}</b><span className="mt-0.5 block"><StatusBadge domain="payment" status={p.status}/></span></span>
          </li>)}
        </ul> : <p className="text-small text-cs-muted">Chưa có giao dịch.</p>}
      </PaneSection>
    </>;

  return <AdminPage title="Hoá đơn & thanh toán" description="Tra cứu hoá đơn, công nợ và giao dịch (tiền mặt, chuyển khoản, VNPAY)" demo={false}
    actions={<Button variant="outline" icon="download" loading={exporting} loadingText="Đang xuất..." onClick={() => void exportCsv()}>Xuất Excel (CSV)</Button>}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="coins" tone="success" label="Tổng đã thu" value={summary ? vnd(summary.collected) : "—"}/>
      <StatCard icon="invoice" tone="warning" label="Hoá đơn chưa thanh toán đủ" value={summary?.open ?? "—"}/>
      <StatCard icon="alert" tone="danger" label="Công nợ còn lại" value={summary ? vnd(summary.debt) : "—"}/>
      <StatCard icon="receipt" tone="neutral" label="Tổng số hoá đơn" value={summary?.total ?? "—"}/>
    </div>
    <div className="mb-4"><Tabs label="Chế độ xem" variant="segment" value={view} onChange={setView} items={[
      { id: "invoices", label: "Hoá đơn", icon: "invoice" }, { id: "payments", label: "Giao dịch", icon: "card" },
    ]}/></div>
    {view === "invoices" ? <SplitView paneOpen={selectedId !== null} onClose={() => setSelectedId(null)} paneTitle="Chi tiết hoá đơn" pane={pane}
      paneFooter={selected && selected.status !== "PAID" && selected.status !== "CANCELLED" ? <>
        <Button icon="printer" onClick={() => window.print()}>In</Button>
        <Button variant="primary" icon="cash" onClick={() => notify("Ghi nhận thanh toán do Cố vấn thực hiện khi bàn giao xe.", "info")}>Ghi nhận thu tiền</Button>
      </> : undefined}
      list={<>
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm số hoá đơn, mã phiếu, khách, biển số…"/>
          <FilterSelect label="Trạng thái" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[
            { value: "all", label: "Tất cả" }, { value: "UNPAID", label: "Chưa thanh toán" }, { value: "PARTIALLY_PAID", label: "Thanh toán một phần" },
            { value: "PAID", label: "Đã thanh toán" }, { value: "CANCELLED", label: "Đã huỷ" },
          ]}/>
          <ClearFilters active={search !== "" || status !== "all" || !invoiceSort.isDefault} onClear={() => { setSearch(""); setStatus("all"); invoiceSort.reset(); setPage(1); }}/>
        </Toolbar>
        <DataTable evenColumns sort={invoiceSort.sort} onSort={invoiceSort.toggle} caption="Danh sách hoá đơn" columns={invoiceColumns} rows={result?.data ?? []} rowKey={i => i.id}
          loading={invoices.loading} error={invoices.error || undefined} onRetry={invoices.reload}
          onRowClick={i => setSelectedId(i.id)} rowClassName={i => i.id === selectedId ? "bg-cs-soft/60" : ""}          footer={result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={invoices.loading} onChange={setPage}/>}/>
      </>}/>
      : <>
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPaymentPage(1); }} placeholder="Tìm mã giao dịch, số hoá đơn…"/>
          <ClearFilters active={search !== "" || !paymentSort.isDefault} onClear={() => { setSearch(""); paymentSort.reset(); setPaymentPage(1); }}/>
        </Toolbar>
        <DataTable evenColumns sort={paymentSort.sort} onSort={paymentSort.toggle} caption="Danh sách giao dịch" columns={paymentColumns} rows={paymentResult?.data ?? []} rowKey={p => p.id}
          loading={payments.loading} error={payments.error || undefined} onRetry={payments.reload}
          footer={paymentResult && <Pagination page={paymentResult.meta.current_page} totalPages={paymentResult.meta.last_page} totalItems={paymentResult.meta.total} pageSize={paymentResult.meta.per_page} disabled={payments.loading} onChange={setPaymentPage}/>}/>
      </>}
  </AdminPage>;
}
