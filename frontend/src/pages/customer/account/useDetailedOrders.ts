import { useCallback, useEffect, useState } from "react";
import {
  formatDate, formatMoney, getMyBillingOrders, paymentMethodLabel, paymentStatusLabel,
  type CustomerQuotation, type CustomerRepairOrder,
} from "../../../services/customerApi";
import { useLiveRefresh } from "../../../services/liveSync";

/**
 * Dữ liệu + quy tắc nghiệp vụ dùng chung cho 3 trang Báo giá / Hóa đơn / Thanh toán.
 * Trang chỉ lo hiển thị; mọi phép tính tiền, lọc, xác định "cần xử lý" nằm ở đây để sửa một chỗ.
 */

/**
 * Bản nhớ tạm trong phiên (dùng chung cho 3 trang): chuyển qua lại Báo giá ↔ Hóa đơn ↔ Thanh toán hiện ngay
 * dữ liệu lần trước, đồng thời tải lại ngầm để luôn đúng với DB. Đăng xuất / tải lại trình duyệt → mất.
 */
let cache: { session: string | null; orders: CustomerRepairOrder[] } | null = null;

/** Phiên đăng nhập hiện tại — bản nhớ tạm chỉ dùng lại khi CÙNG phiên (đổi tài khoản → không lộ dữ liệu người trước). */
function currentSession(): string | null {
  try { return localStorage.getItem("token"); } catch { return null; }
}
const readCache = () => (cache && cache.session === currentSession() ? cache.orders : null);

/**
 * Tải phiếu của khách kèm báo giá, hóa đơn, thanh toán bằng MỘT request (GET /me/repair-orders?include=billing).
 * Lần đầu: hiện "đang tải"; các lần sau: hiện dữ liệu nhớ tạm ngay, làm mới ngầm (không nháy trạng thái tải).
 */
export function useDetailedOrders() {
  const [orders, setOrders] = useState<CustomerRepairOrder[]>(() => readCache() ?? []);
  const [loading, setLoading] = useState(() => readCache() === null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const session = currentSession();
    getMyBillingOrders()
      .then((list) => { cache = { session, orders: list }; if (active) { setOrders(list); setError(""); } })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Không thể tải dữ liệu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  // Bấm "Thử lại" hoặc vừa gửi phản hồi báo giá: tải lại ngay (giữ dữ liệu cũ trên màn hình nếu đã có).
  const reload = useCallback(() => { if (readCache() === null) setLoading(true); setError(""); setVersion((v) => v + 1); }, []);
  // Gara vừa gửi báo giá / lập hóa đơn / nhận tiền… → tự tải lại ngầm.
  useLiveRefresh(() => setVersion((v) => v + 1));
  return { orders, loading, error, reload };
}

/* ------------------------------------------------------------------ Tìm kiếm & phân trang */

/** Từ khóa khớp (không phân biệt hoa thường) với bất kỳ giá trị nào; từ khóa rỗng = khớp tất cả. */
export function matchesQuery(query: string, values: Array<string | number | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  return !q || values.some((value) => String(value ?? "").toLowerCase().includes(q));
}

/** Các trường khách hay tìm của một phiếu: mã phiếu, biển số, tên xe. */
export const orderSearchValues = (order: CustomerRepairOrder, vehicleName: string) => [order.repair_order_code, order.vehicle?.license_plate, vehicleName];

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(page, totalPages);
  return { totalPages, currentPage, paged: items.slice((currentPage - 1) * perPage, currentPage * perPage) };
}

/* ------------------------------------------------------------------ Báo giá */

export type QuotationRow = { quotation: CustomerQuotation; order: CustomerRepairOrder };

/** Mỗi báo giá một dòng (gốc + phát sinh), mới nhất trước. Backend chỉ trả báo giá đã gửi khách. */
export function quotationRows(orders: CustomerRepairOrder[]): QuotationRow[] {
  return orders.flatMap((order) => (order.quotations ?? []).map((quotation) => ({ quotation, order })))
    .sort((a, b) => b.quotation.id - a.quotation.id);
}

/** Báo giá đang chờ khách phản hồi. */
export const awaitsResponse = (quotation: CustomerQuotation) => quotation.status === "SENT";

/** Tổng tiền các hạng mục được chọn (chưa gồm giảm trừ). */
export function selectedItemsTotal(quotation: CustomerQuotation, selected: Record<number, boolean>): number {
  return (quotation.items ?? []).reduce((sum, item) => sum + (selected[item.id] ? Number(item.amount) : 0), 0);
}

/* ------------------------------------------------------------------ Hóa đơn & thanh toán */

export type InvoiceOf = NonNullable<CustomerRepairOrder["invoice"]>;
export type PaymentOf = NonNullable<InvoiceOf["payments"]>[number];
export type InvoiceRow = { order: CustomerRepairOrder; invoice: InvoiceOf };

/** Danh sách hóa đơn (mới nhất trước) từ các phiếu đã tải. */
export function invoiceRows(orders: CustomerRepairOrder[]): InvoiceRow[] {
  return orders.filter((order) => order.invoice).map((order) => ({ order, invoice: order.invoice as InvoiceOf }))
    .sort((a, b) => b.invoice.id - a.invoice.id);
}

/** Số tiền đã trả thành công của một hóa đơn. */
export function paidAmount(invoice: InvoiceOf): number {
  return (invoice.payments ?? []).filter((p) => p.status === "SUCCESS").reduce((sum, p) => sum + Number(p.amount), 0);
}

/** Số tiền còn phải trả. */
export const remainingAmount = (invoice: InvoiceOf) => Math.max(0, Number(invoice.total_amount) - paidAmount(invoice));

/** Hóa đơn còn phải trả (chưa thanh toán đủ, chưa hủy). */
export const isPayable = (invoice: InvoiceOf) => invoice.status !== "PAID" && invoice.status !== "CANCELLED";

/** Ngày lập hóa đơn (bản ghi cũ thiếu created_at → ngày xong phiếu). */
export const invoiceIssuedAt = ({ invoice, order }: InvoiceRow) => invoice.created_at ?? order.completed_at ?? order.received_at ?? null;

/** Thời điểm của một giao dịch. */
export const paymentTime = (payment: PaymentOf) => payment.paid_at ?? payment.payment_date ?? payment.created_at ?? null;

/** Giao dịch của hóa đơn, mới nhất trước. */
export const sortedPayments = (invoice: InvoiceOf) => [...(invoice.payments ?? [])]
  .sort((a, b) => new Date(paymentTime(b) ?? 0).getTime() - new Date(paymentTime(a) ?? 0).getTime());

/** Hạng mục hóa đơn ở dạng bảng (LineItemsTable). */
export function invoiceLineItems(invoice: InvoiceOf) {
  return (invoice.items ?? []).map((item) => ({
    id: item.id,
    label: item.description || (item.item_type === "PART" ? "Phụ tùng thay thế" : "Tiền công dịch vụ"),
    kind: item.item_type === "PART" ? "Phụ tùng" : "Dịch vụ",
    quantity: Number(item.quantity),
    unitPrice: formatMoney(item.unit_price),
    amount: formatMoney(item.amount),
  }));
}

/** Đường dẫn trang Thanh toán của đúng hóa đơn. */
export const payLink = (invoice: InvoiceOf) => `/payment?invoice_id=${invoice.id}`;

/** Lịch sử giao dịch của một hóa đơn ở dạng hiển thị (PaymentHistory). */
export const paymentHistoryItems = (invoice: InvoiceOf) => sortedPayments(invoice).map((payment) => ({
  id: payment.id,
  method: paymentMethodLabel[payment.payment_method ?? "DIRECT"] ?? payment.payment_method ?? "Thanh toán",
  time: formatDate(paymentTime(payment)),
  status: paymentStatusLabel[payment.status] ?? payment.status,
  amount: formatMoney(payment.amount),
  success: payment.status === "SUCCESS",
}));

/** Giảm trừ của hóa đơn (null nếu không có) — cho LineItemsTable. */
export const invoiceDiscount = (invoice: InvoiceOf) => Number(invoice.discount_amount ?? 0) > 0 ? formatMoney(invoice.discount_amount) : null;
