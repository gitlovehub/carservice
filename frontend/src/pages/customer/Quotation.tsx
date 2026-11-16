import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, Modal, Pagination } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { formatDate, formatMoney, getVehicleName, respondQuotation, type QuotationItem } from "../../services/customerApi";
import { AccountCard, AccountPage, DocumentHeader, FilterBar, HelpNote, InlineError, ModalFoot, ModalHead, SectionLabel, StatusTabs, Tag } from "./account/AccountKit";
import { MODAL_CLASS, PRIMARY_RED } from "./account/accountStyles";
import { useDeepLink } from "./account/useDeepLink";
import { awaitsResponse, matchesQuery, orderSearchValues, paginate, quotationRows, selectedItemsTotal, useDetailedOrders, type QuotationRow } from "./account/useDetailedOrders";

/**
 * Báo giá — trang để khách DUYỆT việc gara đề xuất (không thanh toán ở đây: thanh toán thuộc Hóa đơn).
 * Tab "Chờ bạn duyệt" mở mặc định khi có việc cần làm; sau khi phản hồi, mỗi hạng mục ghi rõ Đồng ý / Từ chối.
 */
const PER_PAGE = 5;
type TabKey = "pending" | "answered" | "all";

/** Trạng thái phản hồi của một hạng mục (sau khi khách đã trả lời). */
function ItemDecision({ item }: { item: QuotationItem }) {
  if (item.is_approved === true) return <Tag tone="success">Đồng ý</Tag>;
  if (item.is_approved === false) return <Tag tone="neutral">Từ chối</Tag>;
  return null;
}

export default function QuotationPage() {
  const { notify, confirm } = useAppFeedback();
  const { orders, loading, error, reload } = useDetailedOrders();
  const [tabChoice, setTabChoice] = useState<TabKey | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openedRow, setOpenedRow] = useState<QuotationRow | null>(null);
  /** Hạng mục khách đã bấm đổi (id → chọn/bỏ); mục chưa bấm dùng mặc định "chọn nếu chưa bị từ chối". */
  const [picks, setPicks] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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

  /* ---------- Modal duyệt ---------- */
  const isPending = !!selectedRow && awaitsResponse(selectedRow.quotation);
  const items = selectedRow?.quotation.items ?? [];
  const selectedItems: Record<number, boolean> = Object.fromEntries(items.map((item) => [item.id, picks[item.id] ?? item.is_approved !== false]));
  const chosenCount = items.filter((item) => selectedItems[item.id]).length;
  const chosenTotal = selectedRow ? selectedItemsTotal(selectedRow.quotation, selectedItems) : 0;
  const discount = Number(selectedRow?.quotation.discount_amount ?? 0);

  const openModal = (row: QuotationRow) => { setOpenedRow(row); setPicks({}); setSubmitError(""); };
  const closeModal = () => { setOpenedRow(null); setPicks({}); setSubmitError(""); link.clear(); };
  const toggleItem = (id: number) => setPicks((prev) => ({ ...prev, [id]: !selectedItems[id] }));
  const selectAll = (value: boolean) => setPicks(Object.fromEntries(items.map((item) => [item.id, value])));

  const handleRespond = async (rejectAll = false) => {
    if (!selectedRow) return;
    if (rejectAll && !(await confirm({
      title: "Từ chối toàn bộ báo giá?",
      description: "Gara sẽ không thực hiện hạng mục nào trong báo giá này. Bạn có thể liên hệ gara nếu muốn lập lại báo giá.",
      confirmText: "Từ chối toàn bộ", cancelText: "Quay lại", variant: "danger", reference: selectedRow.quotation.quotation_code,
    }))) return;
    setSubmitting(true);
    setSubmitError("");
    const responses = items.map((item) => ({ item_id: item.id, is_approved: rejectAll ? false : Boolean(selectedItems[item.id]) }));
    try {
      await respondQuotation(selectedRow.quotation.id, responses);
      notify(rejectAll ? "Đã từ chối báo giá." : "Đã gửi phản hồi — gara sẽ làm các hạng mục bạn đồng ý.", "success");
      closeModal();
      setTabChoice(null);
      reload();
    } catch (e) {
      const err = e as { message?: string; data?: { message?: string } };
      setSubmitError(err?.data?.message || err?.message || "Không thể gửi phản hồi báo giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveLabel = chosenCount === 0 ? "Chọn ít nhất 1 hạng mục" : chosenCount === items.length ? "Đồng ý toàn bộ" : `Đồng ý ${chosenCount}/${items.length} hạng mục`;

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
                    <Button size="sm" variant={pending ? "primary" : "secondary"} className={pending ? PRIMARY_RED : ""} iconRight="arrow-right" onClick={() => openModal(row)}>{pending ? "Xem và duyệt" : "Xem chi tiết"}</Button>
                  </div>
                </AccountCard>
              );
            })}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PER_PAGE} onChange={setPage}/>
          </div>
        )}

      <HelpNote icon={null}>Gara chỉ làm và tính tiền những hạng mục bạn đồng ý.</HelpNote>

      {selectedRow && (
        <Modal bare open onClose={closeModal} dismissible={!submitting} title="Chi tiết báo giá" className={`${MODAL_CLASS} max-w-3xl`}>
          <ModalHead icon="dollar" eyebrow={selectedRow.quotation.type === "SUPPLEMENT" ? "Báo giá phát sinh" : "Chi tiết báo giá"} title={selectedRow.quotation.quotation_code}
            subtitle={`${getVehicleName(selectedRow.order.vehicle)} · ${selectedRow.order.vehicle?.license_plate ?? "Chưa có biển số"} · Phiên bản ${selectedRow.quotation.version}`}
            badge={<StatusBadge domain="quotation" status={selectedRow.quotation.status} audience="customer"/>} onClose={closeModal} disabled={submitting}/>
          <div className="space-y-4 p-5 sm:p-6">
            {selectedRow.quotation.type === "SUPPLEMENT" && <p className="rounded-xl bg-warning-soft px-4 py-3 text-[14px] text-warning-fg"><strong>Phát sinh trong lúc sửa</strong>{selectedRow.quotation.reason ? `: ${selectedRow.quotation.reason}` : ""}.</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>{isPending ? `Chọn hạng mục đồng ý làm (${chosenCount}/${items.length})` : "Hạng mục & phản hồi của bạn"}</SectionLabel>
              {isPending && items.length > 1 && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon="check" onClick={() => selectAll(true)}>Chọn tất cả</Button>
                  <Button size="sm" variant="ghost" icon="x" onClick={() => selectAll(false)}>Bỏ chọn</Button>
                </div>
              )}
            </div>
            <div className="divide-y divide-cs-border overflow-hidden rounded-xl border border-cs-border">
              {items.map((item) => {
                const checked = Boolean(selectedItems[item.id]);
                const Row = isPending ? "label" : "div";
                const dimmed = isPending ? !checked : item.is_approved === false;
                return (
                  <Row key={item.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${isPending ? "cursor-pointer hover:bg-cs-surface-2" : ""} ${dimmed ? "opacity-60" : ""}`}>
                    {isPending && <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} className="size-5 shrink-0 accent-[#e11d2e]"/>}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-cs-muted">{item.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}{!isPending && <ItemDecision item={item}/>}</p>
                      <p className={`font-semibold text-cs-text ${!isPending && item.is_approved === false ? "line-through" : ""}`}>{item.description || "Hạng mục sửa chữa"}</p>
                      <p className="text-[13px] text-cs-muted">SL {Number(item.quantity)} × {formatMoney(item.unit_price)}</p>
                    </div>
                    <b className="shrink-0 tabular-nums text-cs-text">{formatMoney(item.amount)}</b>
                  </Row>
                );
              })}
              {!items.length && <p className="px-4 py-6 text-center text-[14px] text-cs-muted">Chưa có chi tiết hạng mục.</p>}
            </div>

            {/* Tổng: khi đang duyệt = tổng các mục đã chọn; sau phản hồi = tổng gara chốt (đã gồm giảm trừ). */}
            <dl className="space-y-1.5 rounded-xl bg-cs-surface-2 px-4 py-3">
              {isPending ? <>
                <div className="flex items-center justify-between"><dt className="text-[14px] font-semibold text-cs-muted">Tổng các hạng mục đã chọn</dt><dd className="text-[20px] font-extrabold tabular-nums text-cs-text">{formatMoney(chosenTotal)}</dd></div>
                {discount > 0 && <p className="text-[12px] text-cs-muted">Chưa gồm giảm trừ {formatMoney(discount)} — số tiền cuối cùng ghi trên hóa đơn.</p>}
              </> : <>
                {discount > 0 && <div className="flex items-center justify-between text-[14px]"><dt className="text-cs-muted">Giảm trừ</dt><dd className="font-semibold text-cs-accent-text">-{formatMoney(discount)}</dd></div>}
                <div className="flex items-center justify-between"><dt className="text-[14px] font-semibold text-cs-muted">Tổng báo giá</dt><dd className="text-[20px] font-extrabold tabular-nums text-cs-text">{formatMoney(selectedRow.quotation.total_amount)}</dd></div>
              </>}
            </dl>

            {selectedRow.quotation.customer_response_at && <p className="text-[13px] text-cs-muted">Bạn đã phản hồi ngày {formatDate(selectedRow.quotation.customer_response_at)}.</p>}
            {selectedRow.order.invoice && (
              <p className="flex flex-wrap items-center gap-1.5 text-[14px] text-cs-muted"><Icon name="receipt" size={15}/>Phiếu sửa chữa này đã có hóa đơn <b className="font-mono text-cs-text">{selectedRow.order.invoice.invoice_code}</b> ·
                <Link to="/invoices" className="font-bold text-cs-accent-text hover:underline">Xem hóa đơn</Link></p>
            )}
            {submitError && <InlineError>{submitError}</InlineError>}
          </div>
          <ModalFoot>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Đóng</Button>
            {isPending && <>
              <Button variant="danger-outline" icon="x" disabled={submitting} onClick={() => void handleRespond(true)}>Từ chối toàn bộ</Button>
              <Button variant="success" size="lg" icon="check" loading={submitting} loadingText="Đang gửi..." disabled={chosenCount === 0} onClick={() => void handleRespond(false)}>{approveLabel}</Button>
            </>}
          </ModalFoot>
        </Modal>
      )}
    </AccountPage>
  );
}
