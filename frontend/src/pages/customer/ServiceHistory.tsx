import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveRefresh } from "../../services/liveSync";
import { Link, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, Pagination, buttonClass } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import ServiceDetailModal from "./history/ServiceDetailModal";
import ServiceReviewDialog from "./ServiceReviewDialog";
import { formatDate, formatMoney, getMyRepairOrders, getMyReviews, getVehicleName, type CustomerReview, type CustomerRepairOrder } from "../../services/customerApi";
import { AccountCard, AccountPage, FilterBar, FilterSelect } from "./account/AccountKit";
import { PRIMARY_RED } from "./account/accountStyles";
import { userErrorMessage } from "../../services/apiError";

/** Phiếu đã sửa xong (CLOSED = đóng phiếu không làm → không phải một lần bảo dưỡng). */
const finished = new Set(["COMPLETED", "HANDED_OVER"]);
const PER_PAGE = 5;

/**
 * Lịch sử bảo dưỡng — cũng là nơi DUY NHẤT khách đánh giá dịch vụ: mỗi phiếu đã bàn giao có nút
 * "Đánh giá" (mở modal gửi) → gửi xong thành "Xem đánh giá" (modal xem + phản hồi của gara).
 * Link thông báo dẫn tới ?review=<repair_order_id> để mở thẳng modal của đúng phiếu.
 */
export default function ServiceHistory() {
  const { notify } = useAppFeedback();
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicleId") || "";
  const reviewParam = searchParams.get("review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    getMyReviews().then((data) => { if (active) { setReviews(data); setReviewError(false); } })
      .catch(() => { if (active) setReviewError(true); })
      .finally(() => { if (active) setReviewsLoading(false); });
    getMyRepairOrders().then((data) => { if (active) { setOrders(data.filter(row => finished.has(row.status))); setError(""); } })
      .catch((e: unknown) => { if (active) setError(userErrorMessage(e, "Không thể tải lịch sử bảo dưỡng.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const reloadAll = () => { setLoading(true); setReviewsLoading(true); setError(""); setReload((n) => n + 1); };
  useLiveRefresh(() => setReload((n) => n + 1));

  const reviewsByOrder = useMemo(() => new Map(reviews.map((review) => [Number(review.repair_order_id), review])), [reviews]);
  const vehicles = useMemo(() => [...new Map(orders.map((order) => [order.vehicle_id, `${getVehicleName(order.vehicle)}${order.vehicle?.license_plate ? ` · ${order.vehicle.license_plate}` : ""}`])).entries()], [orders]);
  const filtered = useMemo(() => orders
    .filter((order) => (!vehicleId || String(order.vehicle_id) === vehicleId)
      && [order.repair_order_code, getVehicleName(order.vehicle), order.vehicle?.license_plate].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase().trim())))
    .sort((a, b) => new Date(b.completed_at ?? b.received_at ?? 0).getTime() - new Date(a.completed_at ?? a.received_at ?? 0).getTime()), [orders, query, vehicleId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Deep link ?review=<id> (từ thông báo): sau khi tải xong phiếu + đánh giá, mở modal của đúng phiếu.
  const ready = !loading && !reviewsLoading && !error;
  const deepLinkOrder = reviewParam && ready ? orders.find((order) => String(order.id) === reviewParam) : undefined;
  const reviewOrder = reviewOrderId !== null ? orders.find((order) => order.id === reviewOrderId) : deepLinkOrder;
  const clearReviewParam = useCallback(() => setSearchParams((previous) => { const next = new URLSearchParams(previous); next.delete("review"); return next; }, { replace: true }), [setSearchParams]);
  // Link hỏng (phiếu không thuộc khách / không tồn tại): báo lỗi và bỏ tham số.
  useEffect(() => {
    if (!reviewParam || !ready || deepLinkOrder) return;
    notify("Không tìm thấy lần bảo dưỡng cần đánh giá.", "error");
    clearReviewParam();
  }, [reviewParam, ready, deepLinkOrder, notify, clearReviewParam]);

  const closeReview = () => { setReviewOrderId(null); if (reviewParam) clearReviewParam(); };
  const handleReviewed = (review: CustomerReview) => {
    setReviews((current) => [review, ...current.filter((row) => row.repair_order_id !== review.repair_order_id)]);
    closeReview();
    notify("Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận.", "success");
  };

  const setVehicle = (value: string) => {
    setPage(1);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set("vehicleId", value); else next.delete("vehicleId");
      return next;
    });
  };

  return (
    <AccountPage
      testId="customer-service-history"
      title="Lịch sử bảo dưỡng"
      description="Các lần bảo dưỡng, sửa chữa đã hoàn tất tại gara — kèm hóa đơn và đánh giá của bạn."
      actions={<Link to="/booking" className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}><Icon name="plus" size={16}/>Đặt lịch mới</Link>}
    >
      <FilterBar search={query} onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Tìm mã phiếu, tên xe, biển số…" count={loading ? undefined : `${filtered.length} lần`}>
        {vehicles.length > 1 && (
          <FilterSelect label="Lọc theo xe" value={vehicleId} onChange={setVehicle}>
            <option value="">Tất cả xe</option>
            {vehicles.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </FilterSelect>
        )}
      </FilterBar>

      {loading ? <AccountCard><LoadingState label="Đang tải lịch sử bảo dưỡng…"/></AccountCard>
        : error ? <AccountCard><ErrorState description={error} onRetry={() => reloadAll()}/></AccountCard>
        : filtered.length === 0 ? (
          <AccountCard>
            <EmptyState icon="history" title={query || vehicleId ? "Không tìm thấy lần bảo dưỡng phù hợp" : "Chưa có lịch sử bảo dưỡng"}
              description={query || vehicleId ? "Thử mã phiếu, biển số hoặc xe khác." : "Những lần bảo dưỡng đã hoàn tất sẽ hiển thị ở đây."}
              action={<Link to="/customer/appointments" className={buttonClass({ variant: "secondary" })}>Xem lịch hẹn</Link>}/>
          </AccountCard>
        ) : (
          <div className="space-y-4">
            {paged.map((order) => {
              const review = reviewsByOrder.get(order.id);
              return (
                <AccountCard key={order.id} as="article" className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={48}/>
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold tracking-[0.06em] text-cs-accent-text">{order.repair_order_code}</p>
                        <h2 className="break-words text-[17px] font-extrabold text-cs-text">{getVehicleName(order.vehicle)}</h2>
                        <p className="mt-0.5 text-[14px] text-cs-muted">
                          {order.vehicle?.license_plate ?? "Chưa có biển số"} · {order.completed_at ? `Hoàn thành ${formatDate(order.completed_at)}` : `Tiếp nhận ${formatDate(order.received_at)}`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge domain="repair" status={order.status} audience="customer"/>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cs-border pt-4">
                    <div>
                      <p className="text-[13px] font-semibold text-cs-muted">Tổng hóa đơn</p>
                      <p className="text-[20px] font-extrabold text-cs-text">{order.invoice ? formatMoney(order.invoice.total_amount) : "Chưa phát hành"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(order.status === "HANDED_OVER" || !!review) && (reviewsLoading ? <span className="text-[13px] text-cs-muted">Đang tải đánh giá…</span>
                        : reviewError ? <Button size="sm" variant="ghost" icon="refresh" onClick={() => reloadAll()}>Tải lại đánh giá</Button>
                        : review
                          ? <Button size="sm" variant="secondary" icon="star" onClick={() => setReviewOrderId(order.id)}>Xem đánh giá · {review.overall_rating}/5{review.reply ? " · Gara đã phản hồi" : ""}</Button>
                          : <Button size="sm" variant="primary" icon="star" className={PRIMARY_RED} onClick={() => setReviewOrderId(order.id)}>Đánh giá</Button>)}
                      <Button size="sm" variant="secondary" icon="eye" onClick={() => setDetailId(order.id)}>Chi tiết</Button>
                    </div>
                  </div>
                </AccountCard>
              );
            })}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PER_PAGE} onChange={setPage}/>
          </div>
        )}

      {/* Chi tiết đầy đủ của lần dịch vụ (dữ liệu GET /me/repair-orders/{id}). */}
      {detailId !== null && <ServiceDetailModal orderId={detailId} onClose={() => setDetailId(null)}/>}
      {/* Đánh giá của đúng phiếu: gửi mới (POST /me/reviews) hoặc xem lại kèm phản hồi của gara. */}
      {reviewOrder && <ServiceReviewDialog order={reviewOrder} review={reviewsByOrder.get(reviewOrder.id)} onClose={closeReview} onReviewed={handleReviewed}/>}
    </AccountPage>
  );
}
