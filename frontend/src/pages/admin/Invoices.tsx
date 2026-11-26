import { useState } from "react";
import { Button, DataTable, Drawer, ErrorState, LoadingState, Pagination, SearchInput, type Column, NEWEST_FIRST, useTableSort } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, fmtDateTime, fmtTime, type AdminInvoice, type AdminPayment, type InvoiceStatus, type PaymentGroup } from "../../services/adminApi";
import { getStatus } from "../../config/status";
import { AdminPage, ClearFilters, FilterSelect, InfoList, PaneSection, StatCard, Tabs, Toolbar } from "./kit/AdminKit";
import { vnd } from "./kit/format";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

const methodInfo: Record<PaymentGroup, { label: string; icon: IconName }> = {
  CASH: { label: "Tiền mặt", icon: "cash" }, BANK_TRANSFER: { label: "Chuyển khoản", icon: "bank" }, CARD: { label: "Thẻ ngân hàng", icon: "card" }, EWALLET: { label: "Ví điện tử", icon: "coins" }, VNPAY: { label: "VNPAY", icon: "qr" },
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
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(search.trim());

  const invoiceSort = useTableSort(NEWEST_FIRST, () => setPage(1));
  const paymentSort = useTableSort(NEWEST_FIRST, () => setPaymentPage(1));
  // Kỳ dùng chung cho hai tab và bốn thẻ số liệu.
  const period = usePeriod("all", () => { setPage(1); setPaymentPage(1); });
  const params = { status, search: term, page, ...period.params, ...invoiceSort.params };
  const paymentParams = { search: term, page: paymentPage, ...period.params, ...paymentSort.params };
  // Luôn tải hoá đơn để thẻ số liệu đúng kỳ cả khi đang ở tab Giao dịch.
  const invoices = useAdminQuery(`invoices:${JSON.stringify(params)}`, signal => adminApi.invoices(params, signal));
  const payments = useAdminQuery(view === "payments" ? `payments:${JSON.stringify(paymentParams)}` : null, signal => adminApi.payments(paymentParams, signal));
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
        const chunk = await adminApi.invoices({ status, search: term, ...period.params, page: p, per_page: 100 });
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
    { key: "code", sortKey: "code", header: "Số hoá đơn", primary: true, width: "17%", render: i => <b className="block truncate text-cs-accent-text">{i.code}</b> },
    { key: "issued", sortKey: "created", header: "Ngày lập", width: "12%", render: i => <span className="block whitespace-nowrap tabular-nums"><span className="block text-cs-text">{fmtDate(i.issued_at)}</span><span className="block text-caption text-cs-muted">{fmtTime(i.issued_at)}</span></span> },
    { key: "customer", header: "Khách hàng", render: i => <span className="block min-w-0"><b className="block truncate text-cs-text">{i.customer ?? "—"}</b><span className="block truncate text-caption text-cs-muted">{i.plate ?? "—"} · {i.order_code ?? "—"}</span></span> },
    { key: "total", sortKey: "total", header: "Tổng tiền", align: "right", width: "14%", render: i => <b className="tabular-nums">{vnd(i.total)}</b> },
    { key: "due", header: "Còn nợ", align: "right", width: "14%", render: i => i.status === "CANCELLED" || i.paid >= i.total ? <span className="text-cs-muted">—</span> : <b className="tabular-nums text-danger-fg">{vnd(i.total - i.paid)}</b> },
    { key: "status", sortKey: "status", header: "Trạng thái", align: "right", width: "19%", render: i => <StatusBadge domain="invoice" status={i.status}/> },
  ];
  const paymentColumns: Column<AdminPayment>[] = [