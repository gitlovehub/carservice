import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDate, formatMoney, getMyRepairOrders, getMyReviews, getVehicleName, repairStatusLabel, type CustomerReview, type CustomerRepairOrder } from "../../services/customerApi";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";

const finished = new Set(["COMPLETED", "HANDED_OVER", "CLOSED"]);

function InlineHistoryReview({ review, vehicle }: { review: CustomerReview; vehicle: string }) {
  const score = Math.max(0, Math.min(5, Math.round(review.overall_rating)));
  return <section className="mt-4 overflow-hidden rounded-2xl border border-[#f1d5d8] bg-[#fff9f8]" aria-label={`Đánh giá của ${vehicle}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1e2e3] px-4 py-3">
      <strong className="flex items-center gap-2 text-[13px] text-[#b42634]"><Icon name="star" size={17}/> Nhận xét của bạn về {vehicle}</strong>
      <time className="text-xs text-[#818a93]" dateTime={review.created_at ?? undefined}>{formatDate(review.created_at)}</time>
    </div>
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center gap-2"><span className="tracking-widest text-[#efa71d]" aria-label={`${score} trên 5 sao`}>{'★'.repeat(score)}<span className="text-[#d3d7db]">{'★'.repeat(5-score)}</span></span><b className="text-sm">{score}/5</b></div>
      {review.comment ? <p className="whitespace-pre-wrap text-sm leading-7 text-[#4b5561]">“{review.comment}”</p> : <p className="text-sm text-[#77828d]">Bạn đã chấm sao mà không viết nhận xét.</p>}
      {(review.advisor_rating || review.technician_rating) && <div className="flex flex-wrap gap-2 text-xs text-[#68727b]">
        {!!review.advisor_rating && <span className="rounded-full bg-white px-3 py-1.5">Tư vấn: {review.advisor_rating}/5 ★</span>}
        {!!review.technician_rating && <span className="rounded-full bg-white px-3 py-1.5">Chất lượng: {review.technician_rating}/5 ★</span>}
      </div>}
      {review.reply ? <div className="rounded-xl border-l-[3px] border-[#d02a37] bg-white p-4">
        <strong className="flex items-center gap-2 text-[12px] text-[#b92430]"><Icon name="reply" size={15}/> Phản hồi từ CarService</strong>
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[#5c666f]">{review.reply}</p>
      </div> : <p className="text-xs text-[#83909a]">Gara chưa phản hồi đánh giá này.</p>}
    </div>
  </section>;
}


export default function ServiceHistory() {
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewId, setShowReviewId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleId = searchParams.get('vehicleId') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReviewsLoading(true);
    getMyReviews().then(data => {
      if (active) { setReviews(data); setReviewError(false); }
    }).catch(() => { if (active) setReviewError(true); }).finally(() => { if (active) setReviewsLoading(false); });
    getMyRepairOrders().then(data => {
      if (active) { setOrders(data.filter(row => finished.has(row.status))); setError(""); }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Không thể tải lịch sử sửa chữa.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const reviewsByOrder = useMemo(() => new Map(reviews.map(review => [Number(review.repair_order_id), review])), [reviews]);
  const vehicles = useMemo(() => [...new Map(orders.map(order => [order.vehicle_id, `${getVehicleName(order.vehicle)} · ${order.vehicle?.license_plate ?? ''}`])).entries()], [orders]);
  const filtered = useMemo(() => orders.filter(order => (!vehicleId || String(order.vehicle_id) === vehicleId) && [order.repair_order_code, getVehicleName(order.vehicle), order.vehicle?.license_plate]
    .some(value => String(value ?? "").toLowerCase().includes(query.toLowerCase().trim()))), [orders, query, vehicleId]);

  return <section className="min-h-[calc(100dvh-180px)] px-5 py-12 sm:px-6 sm:pb-16 bg-[var(--cs-bg,#f7f7f6)] text-[var(--cs-text,#191919)] "><div className="mx-auto w-full max-w-[1200px]">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-5 [&_h1]:text-[clamp(29px,4vw,46px)] [&_h1]:font-extrabold [&_h1]:tracking-normal [&_h1]:leading-[1.16] [&_p:not(:first-child)]:mt-2.5 [&_p:not(:first-child)]:text-sm [&_p:not(:first-child)]:text-[var(--cs-muted,#757575)]"><div>
      <h1>Lịch sử chăm sóc xe</h1>
      <p>Tra cứu các lần bảo dưỡng, sửa chữa đã hoàn tất tại gara.</p>
    </div><Link to="/customer/booking" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cf2935] bg-[#cf2935] px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-[#af1f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]">+ Đặt lịch mới</Link></header>
    <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-3 ">
      <div className="flex min-h-[137px] flex-col items-start rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] p-6 [&_span]:text-xs [&_span]:font-extrabold [&_span]:tracking-[0.06em] [&_span]:text-[var(--cs-muted,#757575)] [&_strong]:my-2 [&_strong]:text-3xl [&_strong]:font-extrabold [&_small]:text-xs [&_small]:text-[var(--cs-muted,#757575)]"><span>LẦN CHĂM SÓC</span><strong>{loading ? "—" : orders.length}</strong><small>Phiếu đã hoàn thành</small></div>
      <div className="flex min-h-[137px] flex-col items-start rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] p-6 [&_span]:text-xs [&_span]:font-extrabold [&_span]:tracking-[0.06em] [&_span]:text-[var(--cs-muted,#757575)] [&_strong]:my-2 [&_strong]:text-3xl [&_strong]:font-extrabold [&_small]:text-xs [&_small]:text-[var(--cs-muted,#757575)]"><span>XE ĐÃ CHĂM SÓC</span><strong>{loading ? "—" : new Set(orders.map(item=>item.vehicle_id)).size}</strong><small>Phương tiện trong lịch sử</small></div>
      <div className="flex min-h-[137px] flex-col items-start rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] p-6 [&_span]:text-xs [&_span]:font-extrabold [&_span]:tracking-[0.06em] [&_span]:text-[var(--cs-muted,#757575)] [&_strong]:my-2 [&_strong]:text-3xl [&_strong]:font-extrabold [&_small]:text-xs [&_small]:text-[var(--cs-muted,#757575)]"><span>TỔNG HÓA ĐƠN</span><strong>{loading ? "—" : orders.filter(item => Boolean(item.invoice)).length}</strong><small>Hóa đơn đã phát hành</small></div>
    </div>
    <div className="my-6 flex flex-wrap items-center gap-3 [&_label]:text-xs [&_label]:font-bold [&_input]:min-h-11 [&_input]:min-w-[190px] [&_input]:flex-1 [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--cs-border,#e9e9e6)] [&_input]:bg-[var(--cs-surface,#fff)] [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-[var(--cs-text,#191919)] [&_input]:outline-[#cf2935]"><label htmlFor="history-search">Tìm lịch sử</label>
      <input id="history-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Mã phiếu, tên xe, biển số..."/>
      <label htmlFor="history-vehicle" className="sr-only">Lọc xe</label>
      <select id="history-vehicle" value={vehicleId} onChange={event => setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        if (event.target.value) next.set('vehicleId', event.target.value);
        else next.delete('vehicleId');
        return next;
      })} className="min-h-11 rounded-xl border border-[var(--cs-border,#e9e9e6)] bg-[var(--cs-surface,#fff)] px-4 text-sm">
        <option value="">Tất cả xe</option>
        {vehicles.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
      </select></div>
    {loading && <div className="my-4 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] px-5 py-12 text-center text-[var(--cs-muted,#757575)] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-[var(--cs-text,#191919)] [&_a]:mt-5">Đang tải lịch sử chăm sóc xe...</div>}
    {error && <div role="alert" className="my-3.5 flex items-center justify-between gap-4 rounded-xl border border-[#426c4d] bg-[#20362a] px-4 py-3 text-[#b8eac3] [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-current [&_button]:px-3 [&_button]:py-1.5 border-[#a64753] bg-[#45272d] text-[#ffb1b9]"><span>{error}</span><button onClick={() => setReload(n => n+1)}>Thử lại</button></div>}
    {!loading && !error && filtered.length === 0 && <div className="my-4 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] px-5 py-12 text-center text-[var(--cs-muted,#757575)] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-[var(--cs-text,#191919)] [&_a]:mt-5"><h2>{query ? "Không tìm thấy phiếu phù hợp" : "Chưa có lịch sử sửa chữa"}</h2>
      <p>{query ? "Thử một mã phiếu hoặc biển số khác." : "Những phiếu đã hoàn tất sẽ hiển thị ở đây."}</p><Link to="/customer/appointments" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--cs-border,#e9e9e6)] px-4 py-2.5 text-xs font-bold text-[var(--cs-text,#191919)] transition-colors hover:border-[#cf2935] hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]">Xem lịch hẹn</Link></div>}
    {!loading && !error && filtered.map(order => <article className="mb-4 rounded-[18px] border bg-[var(--cs-surface,#fff)] border-[var(--cs-border,#e9e9e6)] p-5 shadow-[0_16px_55px_#00000006] sm:p-7" key={order.id}>
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[var(--cs-border,#e9e9e6)] pb-6 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-normal"><div>
        <p className="mb-2 text-[13px] font-extrabold tracking-[0.11em] text-cs-accent-text">{order.repair_order_code}</p>
        <h2>{getVehicleName(order.vehicle)}</h2>
        <p className="mt-1 text-[13px] text-[var(--cs-muted,#757575)]">{order.vehicle?.license_plate ?? "Chưa có biển số"} · {order.completed_at ? `Hoàn thành ${formatDate(order.completed_at)}` : order.received_at ? `Tiếp nhận ${formatDate(order.received_at)}` : "Phiếu đã hoàn tất"}</p>
      </div><StatusBadge domain="repair" status={order.status} audience="customer" className="shrink-0"/></div>
      <div className="flex flex-wrap items-center justify-between gap-5 pt-6 [&_span]:text-[12px] [&_span]:font-extrabold [&_span]:tracking-wider [&_span]:text-[var(--cs-muted,#757575)] [&_strong]:text-[22px] [&_strong]:font-extrabold [&_button]:mt-0"><div><span>Tổng hóa đơn</span><strong>{order.invoice ? formatMoney(order.invoice.total_amount) : "Chưa phát hành"}</strong></div>
        <div className="flex flex-wrap items-center gap-2">
          {(order.status === 'HANDED_OVER' || !!reviewsByOrder.get(order.id)) && (reviewsLoading ? <span className="text-xs text-[#76818c]">Đang tải đánh giá...</span> : reviewError ?
            <span className="text-xs text-[#a64f59]">Không tải được đánh giá <button type="button" className="underline" onClick={() => setReload(n => n+1)}>Thử lại</button></span>
            : reviewsByOrder.get(order.id) ?
              <button type="button" aria-expanded={showReviewId === order.id} onClick={() => setShowReviewId(id => id === order.id ? null : order.id)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#f1dadd] bg-[#fff5f5] px-4 text-xs font-bold text-[#bb2937] hover:bg-[#ffe9eb]">
                <Icon name="star" size={16}/>{showReviewId === order.id ? 'Ẩn đánh giá' : `Xem đánh giá · ${reviewsByOrder.get(order.id)?.overall_rating}/5`}
              </button>
              : <Link to={`/reviews?orderId=${order.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#f1dadd] bg-[#fff5f5] px-4 text-xs font-bold text-[#bb2937] no-underline hover:bg-[#ffe9eb]"><Icon name="star" size={16}/> Đánh giá lần này</Link>)}
          <button type="button" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--cs-border,#e9e9e6)] px-4 py-2.5 text-xs font-bold text-[var(--cs-text,#191919)] transition-colors hover:border-[#cf2935] hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]" onClick={() => setExpandedId(id => id === order.id ? null : order.id)} aria-expanded={expandedId === order.id}>{expandedId === order.id ? "Thu gọn" : "Chi tiết"} →</button>
        </div></div>
      {showReviewId === order.id && reviewsByOrder.get(order.id) && <InlineHistoryReview review={reviewsByOrder.get(order.id)!} vehicle={getVehicleName(order.vehicle)}/>}
      {expandedId === order.id && <div className="mt-5 grid grid-cols-1 gap-5 border-t border-[var(--cs-border,#e9e9e6)] pt-5 sm:grid-cols-2 [&>div]:grid [&>div]:min-w-0 [&>div]:gap-1.5 [&_span]:text-xs [&_span]:text-[var(--cs-muted,#757575)] [&_strong]:break-words [&_strong]:text-[13px] [&_p]:col-span-full [&_p]:text-[13px] [&_p]:text-[var(--cs-muted,#757575)] [&_a]:col-span-full [&_a]:w-fit">
        <div><span>Mã phiếu</span><strong>{order.repair_order_code}</strong></div>
        <div><span>Trạng thái</span><strong>{repairStatusLabel[order.status] ?? order.status}</strong></div>
        {order.invoice && <><div><span>Mã hóa đơn</span><strong>{order.invoice.invoice_code}</strong></div><div><span>Thanh toán</span><strong>{order.invoice.status === "PAID" ? "Đã thanh toán" : "Chưa hoàn tất thanh toán"}</strong></div></>}
        {order.note && <p>{order.note}</p>}
        {order.invoice && <Link className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--cs-border,#e9e9e6)] px-4 py-2.5 text-xs font-bold text-[var(--cs-text,#191919)] transition-colors hover:border-[#cf2935] hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]" to="/invoices">Xem hóa đơn →</Link>}
      </div>}
    </article>)}
  </div></section>;
}
