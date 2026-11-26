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