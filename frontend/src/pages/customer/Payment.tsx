import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, buttonClass } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { createVnpayPayment, formatDate, formatMoney, getVehicleName } from "../../services/customerApi";
import { useGarageHotline } from "../../services/garageService";
import { AccountCard, AccountPage, DocumentHeader, LineItemsTable, PaidProgress, PaymentHistory, SectionLabel } from "./account/AccountKit";
import { PRIMARY_RED } from "./account/accountStyles";
import {
  invoiceDiscount, invoiceIssuedAt, invoiceLineItems, invoiceRows, isPayable, paidAmount, paymentHistoryItems, remainingAmount, useDetailedOrders,
} from "./account/useDetailedOrders";

/**
 * Thanh toán — trang "trả tiền" cho MỘT hóa đơn (chọn qua ?invoice_id, mặc định hóa đơn cần trả mới nhất).
 * Bố cục: [chọn hóa đơn nếu có nhiều] → chứng từ + giao dịch của chính hóa đơn đó | khung trả tiền bên phải.
 * Xem toàn bộ hóa đơn / lịch sử ở trang Hóa đơn.
 */
export default function Payment() {
  const { notify } = useAppFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetInvoiceId = searchParams.get("invoice_id");
  const { orders, loading, error, reload } = useDetailedOrders();
  const [redirecting, setRedirecting] = useState(false);
  const hotline = useGarageHotline();

  const rows = useMemo(() => invoiceRows(orders), [orders]);
  const payable = useMemo(() => rows.filter((row) => isPayable(row.invoice)), [rows]);
  // Hóa đơn đang xem: theo ?invoice_id (kể cả đã trả — để xem lại sau VNPay), không có thì hóa đơn cần trả đầu tiên.
  const selected = rows.find((row) => String(row.invoice.id) === targetInvoiceId) ?? payable[0] ?? null;
  const selectInvoice = (id: number) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("invoice_id", String(id)); return next; });

  const invoice = selected?.invoice;
  const canPay = !!invoice && isPayable(invoice);
  const remaining = invoice ? remainingAmount(invoice) : 0;
  const paid = invoice ? paidAmount(invoice) : 0;

  const handleVnpay = async () => {
    if (!invoice || redirecting) return;
    setRedirecting(true);
    try {
      const { payment_url } = await createVnpayPayment(invoice.id);
      window.location.assign(payment_url);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Không thể khởi tạo thanh toán VNPay.", "error");
      setRedirecting(false);
    }
  };

  return (
    <AccountPage testId="customer-payment" title="Thanh toán" description="Thanh toán hóa đơn trực tuyến qua VNPay hoặc tiền mặt tại quầy khi nhận xe."
      actions={<Link to="/invoices" className={buttonClass({ variant: "secondary" })}><Icon name="receipt" size={16}/>Tất cả hóa đơn</Link>}>
      {loading ? <AccountCard><LoadingState label="Đang tải thông tin thanh toán…"/></AccountCard>
        : error ? <AccountCard><ErrorState description={error} onRetry={reload}/></AccountCard>
        : !selected || !invoice ? (
          <AccountCard>
            {/* Chưa từng có hóa đơn ≠ đã trả hết: hai câu khác nhau cho đúng sự thật. */}
            <EmptyState icon="check" title={rows.length ? "Bạn đã thanh toán hết" : "Chưa có hóa đơn"}
              description="Hóa đơn mới sẽ hiện ở đây để bạn thanh toán."
              action={rows.length ? <Link to="/invoices" className={buttonClass({ variant: "secondary" })}>Xem hóa đơn</Link> : undefined}/>
          </AccountCard>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              {/* Bước 1 — chọn hóa đơn (chỉ khi còn nhiều hơn một hóa đơn cần trả). */}
              {payable.length > 1 && (
                <section>
                  <SectionLabel>Chọn hóa đơn cần thanh toán ({payable.length})</SectionLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {payable.map((row) => {
                      const active = row.invoice.id === invoice.id;
                      return (
                        <button key={row.invoice.id} type="button" onClick={() => selectInvoice(row.invoice.id)} aria-pressed={active}
                          className={`flex cursor-pointer items-center gap-3 rounded-[18px] border p-4 text-left transition-colors ${active ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:border-cs-accent/50"}`}>
                          <VehicleBrandLogo brand={row.order.vehicle?.model?.brand?.name} size={40}/>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[13px] font-bold text-cs-text">{row.invoice.invoice_code}</p>
                            <p className="truncate text-[13px] text-cs-muted">{getVehicleName(row.order.vehicle)}</p>
                          </div>
                          <b className="shrink-0 tabular-nums text-cs-text">{formatMoney(remainingAmount(row.invoice))}</b>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Bước 2 — chứng từ của hóa đơn đang chọn. */}
              <AccountCard as="section" className="overflow-hidden">
                <div className="border-b border-cs-border p-5 sm:p-6">
                  <DocumentHeader brand={selected.order.vehicle?.model?.brand?.name} code={invoice.invoice_code} title={getVehicleName(selected.order.vehicle)}
                    meta={`${selected.order.vehicle?.license_plate ?? "Chưa có biển số"} · Phiếu sửa chữa ${selected.order.repair_order_code} · Lập ngày ${formatDate(invoiceIssuedAt(selected))}`}
                    badge={<StatusBadge domain="invoice" status={invoice.status} audience="customer"/>}/>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                  <LineItemsTable items={invoiceLineItems(invoice)} discount={invoiceDiscount(invoice)} total={formatMoney(invoice.total_amount)} totalLabel="Tổng thanh toán"/>
                  {(invoice.payments ?? []).length > 0 && (
                    <div>
                      <SectionLabel>Giao dịch của hóa đơn này</SectionLabel>
                      <PaymentHistory payments={paymentHistoryItems(invoice)}/>
                    </div>
                  )}
                </div>
              </AccountCard>
            </div>

            {/* Bước 3 — khung trả tiền (dính khi cuộn trên màn rộng). */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              <AccountCard className="overflow-hidden">
                <div className={`space-y-2 p-5 ${canPay ? "bg-cs-soft" : "bg-success-soft"}`}>
                  <p className="text-[13px] font-bold text-cs-muted">{canPay ? "Số tiền cần thanh toán" : "Trạng thái"}</p>
                  <p className={`text-[28px] font-extrabold leading-tight tabular-nums ${canPay ? "text-cs-text" : "text-success-fg"}`}>{canPay ? formatMoney(remaining) : "Đã thanh toán"}</p>
                  {canPay && paid > 0 && <PaidProgress paid={paid} total={Number(invoice.total_amount)} label={`Đã trả ${formatMoney(paid)} / ${formatMoney(invoice.total_amount)}`}/>}
                </div>
                <div className="space-y-4 p-5">
                  {canPay ? <>
                    <Button variant="primary" size="lg" block icon="card" className={PRIMARY_RED} loading={redirecting} loadingText="Đang chuyển sang VNPay..." onClick={() => void handleVnpay()}>Thanh toán qua VNPay</Button>
                    <p className="text-[13px] leading-relaxed text-cs-muted">Thẻ ATM/tài khoản ngân hàng, thẻ quốc tế hoặc VNPay QR. Trạng thái tự cập nhật khi VNPay xác nhận.</p>
                    <div className="rounded-xl bg-cs-surface-2 p-4">
                      <p className="flex items-center gap-2 font-bold text-cs-text"><Icon name="cash" size={17}/>Hoặc tiền mặt tại quầy</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-cs-muted">Đọc mã <b className="font-mono text-cs-text">{invoice.invoice_code}</b> cho cố vấn khi nhận xe; trạng thái cập nhật ngay khi cố vấn xác nhận.</p>
                    </div>
                  </> : <>
                    <p className="text-[14px] text-cs-muted">Gara đã xác nhận nhận đủ tiền cho hóa đơn này. Cảm ơn quý khách!</p>
                    {payable.length > 0 && <Button variant="secondary" block icon="card" onClick={() => selectInvoice(payable[0].invoice.id)}>Hóa đơn tiếp theo cần trả</Button>}
                  </>}
                </div>
              </AccountCard>
              <p className="px-1 text-[13px] text-cs-muted">Hỗ trợ thanh toán:{" "}
                {hotline
                  ? <a href={`tel:${hotline.tel}`} className="font-bold text-cs-text hover:underline">{hotline.display}</a>
                  : <Link to="/contact" className="font-bold text-cs-text hover:underline">Liên hệ gara</Link>}
              </p>
            </aside>
          </div>
        )}
    </AccountPage>
  );
}
