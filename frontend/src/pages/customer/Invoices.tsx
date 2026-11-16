import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, Modal, Pagination, buttonClass } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { formatDate, formatMoney, getVehicleName } from "../../services/customerApi";
import { useGarageHotline } from "../../services/garageService";
import { AccountCard, AccountPage, DocumentHeader, FilterBar, HelpNote, InfoTile, LineItemsTable, ModalFoot, ModalHead, PaidProgress, PaymentHistory, SectionLabel, StatusTabs } from "./account/AccountKit";
import { MODAL_CLASS, PRIMARY_RED } from "./account/accountStyles";
import { useDeepLink } from "./account/useDeepLink";
import {
  invoiceDiscount, invoiceIssuedAt, invoiceLineItems, invoiceRows, isPayable, matchesQuery, orderSearchValues, paginate,
  paidAmount, payLink, paymentHistoryItems, remainingAmount, useDetailedOrders, type InvoiceRow,
} from "./account/useDetailedOrders";

/**
 * Hóa đơn — nơi XEM chứng từ và lịch sử trả tiền. Bấm "Thanh toán" → trang Thanh toán của đúng hóa đơn đó.
 * Tab "Cần thanh toán" mở mặc định khi còn nợ; mỗi thẻ ghi số còn phải trả thay vì chỉ tổng tiền.
 */
const PER_PAGE = 5;
type TabKey = "unpaid" | "paid" | "all";

export default function InvoicesPage() {
  const { orders, loading, error, reload } = useDetailedOrders();
  const hotline = useGarageHotline();
  const [tabChoice, setTabChoice] = useState<TabKey | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<InvoiceRow | null>(null);
  const link = useDeepLink("order");

  const rows = useMemo(() => invoiceRows(orders), [orders]);
  // Link từ thông báo (?order=<phiếu>): mở thẳng hóa đơn của phiếu đó.
  const linked = link.value && !loading ? rows.find((row) => String(row.order.id) === link.value) : undefined;
  const selected = opened ?? linked ?? null;
  const setSelected = (row: InvoiceRow | null) => { setOpened(row); if (!row) link.clear(); };
  const unpaid = rows.filter((row) => isPayable(row.invoice));
  const unpaidTotal = unpaid.reduce((sum, row) => sum + remainingAmount(row.invoice), 0);
  const tab: TabKey = tabChoice ?? (unpaid.length > 0 ? "unpaid" : "all");

  const filtered = useMemo(() => rows.filter(({ invoice, order }) =>
    (tab === "all" || (tab === "unpaid") === isPayable(invoice))
    && matchesQuery(search, [invoice.invoice_code, ...orderSearchValues(order, getVehicleName(order.vehicle))])), [rows, tab, search]);
  const { paged, currentPage, totalPages } = paginate(filtered, page, PER_PAGE);

  return (
    <AccountPage testId="customer-invoices" title="Hóa đơn" description="Hóa đơn của các lần bảo dưỡng, sửa chữa cùng lịch sử thanh toán.">
      {/* Tổng còn nợ: một dòng duy nhất, chỉ hiện khi còn hóa đơn cần trả. */}
      {!loading && unpaid.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-warning/50 bg-warning-soft px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-warning-fg">Còn phải thanh toán · {unpaid.length} hóa đơn</p>
            <p className="text-[24px] font-extrabold leading-tight text-cs-text">{formatMoney(unpaidTotal)}</p>
          </div>
          <Link to={unpaid.length === 1 ? payLink(unpaid[0].invoice) : "/payment"} className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}><Icon name="card" size={16}/>Thanh toán ngay</Link>
        </div>
      )}

      <FilterBar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm mã hóa đơn, mã phiếu, biển số…" count={loading ? undefined : `${filtered.length} hóa đơn`}>
        <StatusTabs label="Lọc hóa đơn" value={tab} onChange={(key) => { setTabChoice(key); setPage(1); }} tabs={[
          { key: "unpaid", label: "Cần thanh toán", count: unpaid.length, attention: true },
          { key: "paid", label: "Đã thanh toán" },
          { key: "all", label: "Tất cả" },
        ]}/>
      </FilterBar>

      {loading ? <AccountCard><LoadingState label="Đang tải hóa đơn…"/></AccountCard>
        : error ? <AccountCard><ErrorState description={error} onRetry={reload}/></AccountCard>
        : filtered.length === 0 ? (
          <AccountCard>
            <EmptyState icon={tab === "unpaid" ? "check" : "receipt"}
              title={!rows.length ? "Chưa có hóa đơn nào" : tab === "unpaid" && !search ? "Không còn hóa đơn cần thanh toán" : "Không có hóa đơn phù hợp"}
              description={!rows.length ? "Khi gara hoàn tất sửa chữa, hóa đơn sẽ hiện tại đây." : tab === "unpaid" && !search ? "Bạn đã thanh toán đủ tất cả hóa đơn." : "Thử đổi tab hoặc từ khóa."}/>
          </AccountCard>
        ) : (
          <div className="space-y-4">
            {paged.map((row) => {
              const { invoice, order } = row;
              const payable = isPayable(invoice);
              const paid = paidAmount(invoice);
              const total = Number(invoice.total_amount);
              return (
                <AccountCard key={invoice.id} as="article" className="p-5">
                  <DocumentHeader brand={order.vehicle?.model?.brand?.name} code={invoice.invoice_code} title={getVehicleName(order.vehicle)}
                    meta={`${order.vehicle?.license_plate ?? "Chưa có biển số"} · Phiếu sửa chữa ${order.repair_order_code} · Lập ngày ${formatDate(invoiceIssuedAt(row))}`}
                    badge={<StatusBadge domain="invoice" status={invoice.status} audience="customer"/>}/>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-cs-border pt-4">
                    <div className="min-w-48">
                      <p className="text-[13px] font-semibold text-cs-muted">{payable ? "Còn phải trả" : "Tổng tiền"}</p>
                      <p className="text-[20px] font-extrabold text-cs-text">{formatMoney(payable ? remainingAmount(invoice) : total)}</p>
                      {payable && paid > 0 && <PaidProgress paid={paid} total={total} label={`Đã trả ${formatMoney(paid)} / ${formatMoney(total)}`}/>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" icon="eye" onClick={() => setSelected(row)}>Chi tiết</Button>
                      {payable && <Link to={payLink(invoice)} className={`${buttonClass({ variant: "primary", size: "sm" })} ${PRIMARY_RED}`}><Icon name="card" size={15}/>Thanh toán</Link>}
                    </div>
                  </div>
                </AccountCard>
              );
            })}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PER_PAGE} onChange={setPage}/>
          </div>
        )}

      <HelpNote icon={null}>Cần xuất hóa đơn VAT cho doanh nghiệp hoặc tra soát giao dịch?{" "}
        {hotline
          ? <>Gọi hotline gara <a href={`tel:${hotline.tel}`} className="font-bold text-cs-text hover:underline">{hotline.display}</a>.</>
          : <>Liên hệ gara qua <Link to="/contact" className="font-bold text-cs-text hover:underline">trang Liên hệ</Link>.</>}
      </HelpNote>

      {selected && (
        <Modal bare open onClose={() => setSelected(null)} title="Chi tiết hóa đơn" className={`${MODAL_CLASS} max-w-3xl`}>
          <ModalHead icon="receipt" eyebrow="Chi tiết hóa đơn" title={selected.invoice.invoice_code}
            subtitle={`${getVehicleName(selected.order.vehicle)} · ${selected.order.vehicle?.license_plate ?? "Chưa có biển số"} · Phiếu sửa chữa ${selected.order.repair_order_code}`}
            badge={<StatusBadge domain="invoice" status={selected.invoice.status} audience="customer"/>} onClose={() => setSelected(null)}/>
          <div className="space-y-5 p-5 sm:p-6">
            <dl className="grid gap-3 sm:grid-cols-3">
              <InfoTile label="Ngày lập" value={formatDate(invoiceIssuedAt(selected))}/>
              <InfoTile label="Đã thanh toán" value={formatMoney(paidAmount(selected.invoice))}/>
              <InfoTile label="Còn lại" value={formatMoney(remainingAmount(selected.invoice))}/>
            </dl>
            <div>
              <SectionLabel>Hạng mục</SectionLabel>
              <LineItemsTable items={invoiceLineItems(selected.invoice)} discount={invoiceDiscount(selected.invoice)} total={formatMoney(selected.invoice.total_amount)}/>
            </div>
            <div>
              <SectionLabel>Lịch sử thanh toán</SectionLabel>
              <PaymentHistory payments={paymentHistoryItems(selected.invoice)}/>
            </div>
          </div>
          <ModalFoot>
            <Button variant="secondary" onClick={() => setSelected(null)}>Đóng</Button>
            {isPayable(selected.invoice) && <Link to={payLink(selected.invoice)} className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}><Icon name="card" size={16}/>Thanh toán {formatMoney(remainingAmount(selected.invoice))}</Link>}
          </ModalFoot>
        </Modal>
      )}
    </AccountPage>
  );
}
