import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Modal } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { formatDate, formatMoney, getVehicleName, respondQuotation, type QuotationItem } from "../../services/customerApi";
import { InlineError, ModalFoot, ModalHead, SectionLabel, Tag } from "./account/AccountKit";
import { MODAL_CLASS } from "./account/accountStyles";
import { awaitsResponse, quotationRoundLabel, selectedItemsTotal, type QuotationRow } from "./account/useDetailedOrders";

/** Trạng thái phản hồi của một hạng mục (sau khi khách đã trả lời). */
function ItemDecision({ item }: { item: QuotationItem }) {
  if (item.is_approved === true) return <Tag tone="success">Đồng ý</Tag>;
  if (item.is_approved === false) return <Tag tone="neutral">Từ chối</Tag>;
  return null;
}

/**
 * Modal chi tiết / duyệt báo giá phía khách — dùng chung cho trang Báo giá và nút "Xem báo giá" ở Tra cứu tiến độ.
 * Báo giá đang chờ: chọn hạng mục đồng ý (bỏ hạng mục bắt buộc = từ chối toàn bộ), gửi phản hồi.
 * Đã phản hồi: mỗi hạng mục ghi rõ Đồng ý / Từ chối.
 */
export function QuotationDetailModal({ row, onClose, onResponded }: { row: QuotationRow; onClose: () => void; onResponded: () => void }) {
  const { notify, confirm } = useAppFeedback();
  /** Hạng mục khách đã bấm đổi (id → chọn/bỏ); mục chưa bấm dùng mặc định "chọn nếu chưa bị từ chối". */
  const [picks, setPicks] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const round = quotationRoundLabel(row.order, row.quotation);
  const isPending = awaitsResponse(row.quotation);
  const items = row.quotation.items ?? [];
  const selectedItems: Record<number, boolean> = Object.fromEntries(items.map((item) => [item.id, picks[item.id] ?? item.is_approved !== false]));
  // Bỏ chọn hạng mục bắt buộc = từ chối toàn bộ (máy chủ cũng xử lý như vậy) → tổng đã chọn về 0, hiện cảnh báo.
  const rejectsRequired = items.some((item) => item.is_required && !selectedItems[item.id]);
  const chosenCount = rejectsRequired ? 0 : items.filter((item) => selectedItems[item.id]).length;
  const chosenTotal = !rejectsRequired ? selectedItemsTotal(row.quotation, selectedItems) : 0;
  const discount = Number(row.quotation.discount_amount ?? 0);

  const toggleItem = (id: number) => setPicks((prev) => ({ ...prev, [id]: !selectedItems[id] }));
  const selectAll = (value: boolean) => setPicks(Object.fromEntries(items.map((item) => [item.id, value])));

  const handleRespond = async (rejectAll = false) => {
    if (rejectAll && !(await confirm({
      title: "Từ chối toàn bộ báo giá?",
      description: "Gara sẽ không thực hiện hạng mục nào trong báo giá này. Bạn có thể liên hệ gara nếu muốn lập lại báo giá.",
      confirmText: "Từ chối toàn bộ", cancelText: "Quay lại", variant: "danger", reference: row.quotation.quotation_code,
    }))) return;
    setSubmitting(true);
    setSubmitError("");
    const responses = items.map((item) => ({ item_id: item.id, is_approved: rejectAll ? false : Boolean(selectedItems[item.id]) }));
    try {
      await respondQuotation(row.quotation.id, responses);
      notify(rejectAll ? "Đã từ chối báo giá." : "Đã gửi phản hồi — gara sẽ làm các hạng mục bạn đồng ý.", "success");
      onClose();
      onResponded();
    } catch (e) {
      const err = e as { message?: string; data?: { message?: string } };
      setSubmitError(err?.data?.message || err?.message || "Không thể gửi phản hồi báo giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveLabel = rejectsRequired ? "Cần chọn hạng mục bắt buộc" : chosenCount === 0 ? "Chọn ít nhất 1 hạng mục" : chosenCount === items.length ? "Đồng ý toàn bộ" : `Đồng ý ${chosenCount}/${items.length} hạng mục`;

  return <Modal bare open onClose={onClose} dismissible={!submitting} title="Chi tiết báo giá" className={`${MODAL_CLASS} max-w-3xl`}>
    <ModalHead icon="dollar" eyebrow={row.quotation.type === "SUPPLEMENT" ? "Báo giá phát sinh" : "Chi tiết báo giá"} title={row.quotation.quotation_code}
      subtitle={`${getVehicleName(row.order.vehicle)} · ${row.order.vehicle?.license_plate ?? "Chưa có biển số"}${round ? ` · Báo giá${round}` : ""}`}
      badge={<StatusBadge domain="quotation" status={row.quotation.status} audience="customer"/>} onClose={onClose} disabled={submitting}/>
    <div className="space-y-4 p-5 sm:p-6">
      {row.quotation.type === "SUPPLEMENT" && <p className="rounded-xl bg-warning-soft px-4 py-3 text-[14px] text-warning-fg"><strong>Phát sinh trong lúc sửa</strong>{row.quotation.reason ? `: ${row.quotation.reason}` : ""}.</p>}
      {row.quotation.stays_overnight && <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-[14px] text-warning-fg"><Icon name="moon" size={16} className="mt-0.5 shrink-0"/><span><strong>Xe cần lưu xưởng qua đêm</strong> để hoàn thành các hạng mục này. Gara không tính thêm phí lưu xe.</span></p>}

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
                <p className={`font-semibold text-cs-text ${!isPending && item.is_approved === false ? "line-through" : ""}`}>{item.description || "Hạng mục sửa chữa"}
                  {item.is_required && <span className="ml-2 inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 align-middle text-[11px] font-bold text-warning-fg">Bắt buộc</span>}</p>
                <p className="text-[13px] text-cs-muted">Số lượng {Number(item.quantity)} × {formatMoney(item.unit_price)}</p>
                {item.is_required && item.required_reason && <p className="mt-0.5 text-[13px] text-warning-fg">Lý do bắt buộc: {item.required_reason}</p>}
              </div>
              <b className="shrink-0 tabular-nums text-cs-text">{formatMoney(item.amount)}</b>
            </Row>
          );
        })}
        {!items.length && <p className="px-4 py-6 text-center text-[14px] text-cs-muted">Chưa có chi tiết hạng mục.</p>}
      </div>

      {isPending && rejectsRequired && <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-[14px] text-warning-fg">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0"/>
        <span>Bạn đang bỏ chọn hạng mục <strong>bắt buộc</strong> — gara không thể chỉ làm các hạng mục còn lại, nên báo giá sẽ được ghi nhận là <strong>từ chối toàn bộ</strong>.</span></p>}

      {/* Tổng: khi đang duyệt = tổng các mục đã chọn; sau phản hồi = tổng gara chốt (đã gồm giảm trừ). */}
      <dl className="space-y-1.5 rounded-xl bg-cs-surface-2 px-4 py-3">
        {isPending ? <>
          <div className="flex items-center justify-between"><dt className="text-[14px] font-semibold text-cs-muted">Tổng các hạng mục đã chọn</dt><dd className="text-[20px] font-extrabold tabular-nums text-cs-text">{formatMoney(chosenTotal)}</dd></div>
          {discount > 0 && <p className="text-[12px] text-cs-muted">Chưa gồm giảm trừ {formatMoney(discount)} — số tiền cuối cùng ghi trên hóa đơn.</p>}
        </> : <>
          {discount > 0 && <div className="flex items-center justify-between text-[14px]"><dt className="text-cs-muted">Giảm trừ</dt><dd className="font-semibold text-cs-accent-text">-{formatMoney(discount)}</dd></div>}
          <div className="flex items-center justify-between"><dt className="text-[14px] font-semibold text-cs-muted">Tổng báo giá</dt><dd className="text-[20px] font-extrabold tabular-nums text-cs-text">{formatMoney(row.quotation.total_amount)}</dd></div>
        </>}
      </dl>

      {row.quotation.customer_response_at && <p className="text-[13px] text-cs-muted">Bạn đã phản hồi ngày {formatDate(row.quotation.customer_response_at)}.</p>}
      {row.order.invoice && (
        <p className="flex flex-wrap items-center gap-1.5 text-[14px] text-cs-muted"><Icon name="receipt" size={15}/>Phiếu sửa chữa này đã có hóa đơn <b className="font-mono text-cs-text">{row.order.invoice.invoice_code}</b> ·
          <Link to="/invoices" className="font-bold text-cs-accent-text hover:underline">Xem hóa đơn</Link></p>
      )}
      {submitError && <InlineError>{submitError}</InlineError>}
    </div>
    <ModalFoot>
      <Button variant="secondary" onClick={onClose} disabled={submitting}>Đóng</Button>
      {isPending && <>
        <Button variant="danger-outline" icon="x" disabled={submitting} onClick={() => void handleRespond(true)}>Từ chối toàn bộ</Button>
        <Button variant="success" size="lg" icon="check" loading={submitting} loadingText="Đang gửi..." disabled={chosenCount === 0} onClick={() => void handleRespond(false)}>{approveLabel}</Button>
      </>}
    </ModalFoot>
  </Modal>;
}
