import { useMemo, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingState, Pagination } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { formatMoney, getVehicleName } from "../../services/customerApi";
import { AccountCard, AccountPage, DocumentHeader, FilterBar, HelpNote, StatusTabs, Tag } from "./account/AccountKit";
import { PRIMARY_RED } from "./account/accountStyles";
import { useDeepLink } from "./account/useDeepLink";
import { awaitsResponse, matchesQuery, orderSearchValues, paginate, quotationRows, useDetailedOrders, type QuotationRow } from "./account/useDetailedOrders";
import { QuotationDetailModal } from "./QuotationDetailModal";

/**
 * Báo giá — trang để khách DUYỆT việc gara đề xuất (không thanh toán ở đây: thanh toán thuộc Hóa đơn).
 * Tab "Chờ bạn duyệt" mở mặc định khi có việc cần làm; sau khi phản hồi, mỗi hạng mục ghi rõ Đồng ý / Từ chối.
 * Modal chi tiết / duyệt dùng chung với nút "Xem báo giá" ở Tra cứu tiến độ (QuotationDetailModal).
 */
const PER_PAGE = 5;
type TabKey = "pending" | "answered" | "all";

export default function QuotationPage() {
  const { orders, loading, error, reload } = useDetailedOrders();
  const [tabChoice, setTabChoice] = useState<TabKey | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openedRow, setOpenedRow] = useState<QuotationRow | null>(null);
  const link = useDeepLink("order");

  const rows = useMemo(() => quotationRows(orders), [orders]);
  // Link từ thông báo (?order=<phiếu>): mở báo giá đang chờ duyệt của phiếu đó, không có thì báo giá mới nhất.
  const linkedRow = link.value && !loading
    ? rows.find((row) => String(row.order.id) === link.value && awaitsResponse(row.quotation)) ?? rows.find((row) => String(row.order.id) === link.value)
    : undefined;
  const selectedRow = openedRow ?? linkedRow ?? null;
  const pendingCount = rows.filter((row) => awaitsResponse(row.quotation)).length;
  // Chưa chọn tab: có báo giá chờ duyệt thì mở tab đó, không thì xem tất cả.
  const tab: TabKey = tabChoice ?? (pendingCount > 0 ? "pending" : "all");

  const filtered = useMemo(() => rows.filter(({ quotation, order }) =>
    (tab === "all" || (tab === "pending") === awaitsResponse(quotation))
    && matchesQuery(search, [quotation.quotation_code, ...orderSearchValues(order, getVehicleName(order.vehicle))])), [rows, tab, search]);
  const { paged, currentPage, totalPages } = paginate(filtered, page, PER_PAGE);

  const closeModal = () => { setOpenedRow(null); link.clear(); };

  return (
    <AccountPage testId="customer-quotations" title="Báo giá" description="Xem từng hạng mục gara đề xuất và chọn những việc bạn đồng ý thực hiện.">
      <FilterBar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm mã báo giá, biển số, tên xe…" count={loading ? undefined : `${filtered.length} báo giá`}>
        <StatusTabs label="Lọc báo giá" value={tab} onChange={(key) => { setTabChoice(key); setPage(1); }} tabs={[
          { key: "pending", label: "Chờ bạn duyệt", count: pendingCount, attention: true },
          { key: "answered", label: "Đã phản hồi" },
          { key: "all", label: "Tất cả" },
        ]}/>
      </FilterBar>

      {loading ? <AccountCard><LoadingState label="Đang tải báo giá…"/></AccountCard>
        : error ? <AccountCard><ErrorState description={error} onRetry={reload}/></AccountCard>
        : filtered.length === 0 ? (
          <AccountCard>
            <EmptyState icon={tab === "pending" ? "check" : "dollar"}
              title={!rows.length ? "Chưa có báo giá nào" : tab === "pending" && !search ? "Không có báo giá nào chờ bạn duyệt" : "Không có báo giá phù hợp"}
              description={!rows.length ? "Khi gara lập báo giá cho xe của bạn, báo giá sẽ hiện tại đây để bạn duyệt." : tab === "pending" && !search ? "Bạn đã phản hồi tất cả báo giá." : "Thử đổi tab hoặc từ khóa."}/>
          </AccountCard>
        ) : (
          <div className="space-y-4">
            {paged.map((row) => {
              const { quotation, order } = row;
              const pending = awaitsResponse(quotation);
              const total = quotation.items?.length ?? 0;
              const approved = (quotation.items ?? []).filter((item) => item.is_approved === true).length;
              return (
                <AccountCard key={quotation.id} as="article" className={`p-5 ${pending ? "border-warning/60 ring-1 ring-warning/30" : ""}`}>
                  <DocumentHeader brand={order.vehicle?.model?.brand?.name} code={quotation.quotation_code}
                    tag={quotation.type === "SUPPLEMENT" && <Tag>Phát sinh</Tag>}
                    title={getVehicleName(order.vehicle)} meta={`${order.vehicle?.license_plate ?? "Chưa có biển số"} · Phiếu sửa chữa ${order.repair_order_code}`}
                    badge={<StatusBadge domain="quotation" status={quotation.status} audience="customer"/>}/>
                  {quotation.type === "SUPPLEMENT" && quotation.reason && <p className="mt-2 text-[13px] text-cs-muted">Lý do phát sinh: {quotation.reason}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cs-border pt-4">
                    <div>
                      <p className="text-[13px] font-semibold text-cs-muted">{pending ? `Tổng dự kiến · ${total} hạng mục` : `Đã đồng ý ${approved}/${total} hạng mục`}</p>
                      <p className="text-[20px] font-extrabold text-cs-text">{formatMoney(quotation.total_amount)}</p>
                    </div>
                    <Button size="sm" variant={pending ? "primary" : "secondary"} className={pending ? PRIMARY_RED : ""} iconRight="arrow-right" onClick={() => setOpenedRow(row)}>{pending ? "Xem và duyệt" : "Xem chi tiết"}</Button>
                  </div>
                </AccountCard>
              );
            })}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PER_PAGE} onChange={setPage}/>
          </div>
        )}

      <HelpNote icon={null}>Gara chỉ làm và tính tiền những hạng mục bạn đồng ý.</HelpNote>

      {selectedRow && <QuotationDetailModal key={selectedRow.quotation.id} row={selectedRow} onClose={closeModal}
        onResponded={() => { setTabChoice(null); reload(); }}/>}
    </AccountPage>
  );
}
