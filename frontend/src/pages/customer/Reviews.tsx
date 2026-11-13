import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import { useAuthSession } from "../../contexts/authSession";
import { getUserDisplayName, getUserInitials } from "../auth/auth";
import { Icon } from "../../components/ui/Icon";
import {
  formatDate,
  getMyRepairOrders,
  getMyReviews,
  getVehicleName,
  submitReview,
  type CustomerRepairOrder,
  type CustomerReview,
} from "../../services/customerApi";

type RatingFieldProps = {
  title: string;
  description?: string;
  value: number;
  onChange: (rating: number) => void;
  optional?: boolean;
};

const scoreLabels = ["", "Rất chưa hài lòng", "Chưa hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

function RatingField({ title, description, value, onChange, optional = false }: RatingFieldProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[14px] font-bold text-[#18202a] sm:text-[15px]">
        {title} {optional && <span className="text-[12px] font-normal text-[#7a818d]">(tùy chọn)</span>}
      </legend>
      {description && <p className="mt-1 text-[12px] leading-5 text-[#6d7581]">{description}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label={title}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              aria-label={`${title}: ${star} sao`}
              aria-pressed={value === star}
              title={`${star} sao`}
              onClick={() => onChange(optional && value === star ? 0 : star)}
              className={`flex size-[43px] cursor-pointer items-center justify-center rounded-xl border text-[29px] leading-none transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cc2936] sm:size-[48px] ${star <= value ? "border-[#ffe0a2] bg-[#fff5df] text-[#efa30a] hover:bg-[#ffecc4]" : "border-[#e6e8eb] bg-white text-[#d0d5dc] hover:border-[#efc66e] hover:text-[#e5a430]"}`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-[12px] font-semibold text-[#966523] sm:text-[13px]" aria-live="polite">
          {value > 0 ? `${scoreLabels[value]} · ${value}/5` : optional ? "Bạn có thể bỏ qua" : "Chọn số sao"}
        </span>
      </div>
    </fieldset>
  );
}

function ReadonlyStars({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <span className="text-xs text-[#88909a]">Chưa đánh giá</span>;
  const score = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${score} trên 5 sao`}>
      <span className="tracking-[0.09em] text-[#e4a127]">{"★".repeat(score)}<span className="text-[#d9dde2]">{"★".repeat(5 - score)}</span></span>
      <span className="text-xs font-bold text-[#343b45]">{score}.0</span>
    </span>
  );
}

/** Trang trải nghiệm dành cho Customer. Không dùng sidebar quản lý của cố vấn. */
export default function Reviews() {
  const session = useAuthSession();
  const account = session.status === 'authenticated' ? session.account : null;
  const displayName = getUserDisplayName(account);
  const initials = getUserInitials(account);
  const [reviewVehicleFilter, setReviewVehicleFilter] = useState('');
  const [searchParams] = useSearchParams();
  const targetOrderId = searchParams.get("orderId");
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [overall, setOverall] = useState(0);
  const [advisor, setAdvisor] = useState(0);
  const [technician, setTechnician] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [reviewData, orderData] = await Promise.all([getMyReviews(), getMyRepairOrders()]);
      setReviews(reviewData);
      setOrders(orderData.filter(order => order.status === "HANDED_OVER"));
      const reviewed = new Set(reviewData.map(review => review.repair_order_id));
      const available = orderData.filter(order => order.status === "HANDED_OVER" && !reviewed.has(order.id));
      setSelectedOrderId(current => targetOrderId && available.some(order => String(order.id) === targetOrderId)
        ? targetOrderId
        : available.some(order => String(order.id) === current) ? current
        : available.length > 0 ? String(available[0].id) : "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu đánh giá.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [targetOrderId]);

  const reviewedIds = useMemo(() => new Set(reviews.map(review => review.repair_order_id)), [reviews]);
  const unreviewedOrders = useMemo(() => orders.filter(order => !reviewedIds.has(order.id)), [orders, reviewedIds]);
  const selectedOrder = unreviewedOrders.find(order => String(order.id) === selectedOrderId);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length : null;
  const reviewVehicles = useMemo(() => [...new Map(reviews.map(review => {
    const order = review.repair_order ?? review.repairOrder;
    return [Number(order?.vehicle_id ?? 0), `${getVehicleName(order?.vehicle)} · ${order?.vehicle?.license_plate ?? ''}`] as const;
  }).filter(([id]) => id > 0)).entries()], [reviews]);
  const visibleReviews = useMemo(() => reviews.filter(review => !reviewVehicleFilter || String((review.repair_order ?? review.repairOrder)?.vehicle_id) === reviewVehicleFilter), [reviews, reviewVehicleFilter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || reviewedIds.has(selectedOrder.id)) {
      setSubmitError("Vui lòng chọn một lần bảo dưỡng đã bàn giao và chưa đánh giá.");
      return;
    }
    if (overall < 1) {
      setSubmitError("Bạn hãy chọn từ 1 đến 5 sao cho trải nghiệm tổng thể.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const result = await submitReview({
        repair_order_id: selectedOrder.id,
        overall_rating: overall,
        ...(advisor ? { advisor_rating: advisor } : {}),
        ...(technician ? { technician_rating: technician } : {}),
        comment: comment.trim(),
      });
      if (!result?.data?.id) {
        // Nếu phản hồi bất thường, không kết luận đã lưu; tải lại để đối chiếu với DB.
        const latest = await getMyReviews();
        if (!latest.some(review => review.repair_order_id === selectedOrder.id)) {
          throw new Error("Chưa xác nhận được đánh giá đã được lưu. Hãy tải lại trang trước khi gửi lại.");
        }
      }
      setOverall(0);
      setAdvisor(0);
      setTechnician(0);
      setComment("");
      setToast({ message: "Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận.", type: "success" });
      await loadData();
    } catch (cause) {
      const apiError = cause as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const validation = Object.values(apiError?.data?.errors ?? {}).flat()[0];
      setSubmitError(validation || apiError?.data?.message || apiError?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="at-customer-reviews min-h-[calc(100dvh-160px)] bg-[#faf9f7] pb-16 text-[#19212b]" data-testid="customer-reviews-standalone">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Banner thân thiện với khách hàng, không phải màn hình quản trị. */}
      <section
        className="relative isolate flex min-h-[235px] items-center overflow-hidden bg-[#151c22] py-12 text-white sm:min-h-[270px]"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(17,22,29,.94) 0%, rgba(17,22,29,.88) 42%, rgba(17,22,29,.22) 100%), url('/showcase/mechanic-banner.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="mx-auto w-full max-w-[1220px] px-5 sm:px-8">
          <div className="mb-5 flex items-center gap-2 text-[12px] text-white/75">
            <Link to="/" className="font-medium text-white/80 no-underline transition hover:text-white">Trang chủ</Link>
            <Icon name="chevron-right" size={14}/>
            <span className="text-white">Đánh giá dịch vụ</span>
          </div>
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
            CarService · Tiếng nói khách hàng
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.15] tracking-[-0.025em] text-white sm:text-[43px]">Trải nghiệm của bạn,<br/><span className="text-[#ff8b8b]">động lực của chúng tôi.</span></h1>
          <p className="mt-3 max-w-[600px] text-[13px] leading-6 text-white/85 sm:text-[15px]">
            Sau mỗi lần chăm sóc xe, hãy chia sẻ cảm nhận của bạn. Mỗi lời góp ý đều giúp CarService phục vụ tốt hơn.
          </p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-[1220px] flex-col px-5 pt-8 sm:px-8 sm:pt-10">
        <section className="order-0 mb-5 flex flex-wrap items-center gap-4 rounded-[20px] border border-[#f0e5e5] bg-white px-5 py-4 shadow-sm" aria-label="Hồ sơ người đánh giá">
          {account?.avatar ? <img src={account.avatar} alt="Ảnh đại diện của bạn" className="size-14 rounded-full border-2 border-white object-cover shadow-md"/>
          : <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#d12736] text-lg font-extrabold text-white">{initials}</span>}
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#9a6368]">Góc chia sẻ của khách hàng</p><h2 className="truncate text-[18px] font-extrabold text-[#26303a] sm:text-[21px]">{displayName}</h2><p className="text-[12px] text-[#79848f]">Đánh giá và lịch sử trải nghiệm của bạn tại CarService</p></div>
          <Link to="/customer/service-history" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#efdee0] px-4 text-[12px] font-bold text-[#b92835] no-underline hover:bg-[#fff5f5]"><Icon name="car" size={16}/> Lịch sử xe</Link>
        </section>
        <section aria-label="Tổng quan đánh giá của bạn" className="order-0 mb-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#e9e9e9] bg-white px-5 py-4 shadow-[0_4px_22px_#20252b05]">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fff1ee] text-[#cb2b36]"><Icon name="car" size={24}/></span>
            <div><p className="text-[12px] text-[#68727c]">Lần đã nhận xe</p><p className="mt-0.5 text-[25px] font-extrabold">{loading ? "—" : orders.length}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#e9e9e9] bg-white px-5 py-4 shadow-[0_4px_22px_#20252b05]">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fff6e8] text-[#bd821e]"><Icon name="star" size={24}/></span>
            <div><p className="text-[12px] text-[#68727c]">Đánh giá bạn đã gửi</p><p className="mt-0.5 text-[25px] font-extrabold">{loading ? "—" : reviews.length}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#e9e9e9] bg-white px-5 py-4 shadow-[0_4px_22px_#20252b05]">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf8ef] text-[#27854b]"><Icon name="check" size={24}/></span>
            <div><p className="text-[12px] text-[#68727c]">Lần chưa đánh giá</p><p className="mt-0.5 text-[25px] font-extrabold">{loading ? "—" : unreviewedOrders.length}</p></div>
          </div>
        </section>

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()} className="cursor-pointer font-bold underline">Thử tải lại</button>
          </div>
        )}

        <section className={`overflow-hidden rounded-[22px] border border-[#ebe8e4] bg-white shadow-[0_15px_45px_#22222208] ${!loading && unreviewedOrders.length === 0 ? 'order-3 mt-6' : 'order-1'}`} aria-labelledby="new-review-title">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[#f0ece8] bg-gradient-to-r from-[#fff7f5] to-white p-6 sm:p-8">
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#cf2935]">Chia sẻ trải nghiệm</span>
              <h2 id="new-review-title" className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[29px]">Đánh giá lần bảo dưỡng của bạn</h2>
              <p className="mt-2 max-w-[650px] text-[13px] leading-6 text-[#69737f]">Bạn đã hài lòng với dịch vụ chưa? Hãy kể cho chúng tôi nghe nhé!</p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#cb2937] shadow-sm"><Icon name="star" size={25}/></span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-[#78828e]">Đang kiểm tra những lần chăm sóc xe của bạn...</div>
          ) : unreviewedOrders.length === 0 ? (
            <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-7">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#edf8f1] text-[#24905a]"><Icon name="check" size={23}/></span>
              <div className="min-w-0 flex-1"><h3 className="text-[16px] font-bold">Bạn đã đánh giá tất cả các lần bàn giao xe</h3>
                <p className="mt-1 text-[12px] leading-5 text-[#6c7680]">Các nhận xét đã gửi được hiển thị ngay phía trên. Khi có lần bảo dưỡng mới, form đánh giá sẽ tự xuất hiện.</p></div>
              <Link to="/customer/service-history" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e4e6e8] px-4 text-[12px] font-bold text-[#3c4650] no-underline hover:border-[#cf2935] hover:text-[#cf2935]">Lịch sử xe <Icon name="arrow-right" size={15}/></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7 p-6 sm:p-8">
              <div>
                <label htmlFor="review-order" className="block text-[14px] font-bold text-[#19212b]">1. Chọn lần bảo dưỡng đã bàn giao</label>
                <p className="mt-1 text-xs text-[#7b848e]">Mỗi phiếu sửa chữa chỉ có thể đánh giá một lần.</p>
                <select id="review-order" value={selectedOrderId} onChange={event => { setSelectedOrderId(event.target.value); setSubmitError(""); }}
                  className="mt-3 min-h-12 w-full cursor-pointer rounded-xl border border-[#dedfe1] bg-[#fff] px-4 py-3 text-[13px] font-semibold text-[#27313a] outline-none transition focus:border-[#cf2935] focus:ring-2 focus:ring-[#f8c9ce] sm:max-w-[680px]">
                  {unreviewedOrders.map(order => <option key={order.id} value={String(order.id)}>{getVehicleName(order.vehicle)} · {order.vehicle?.license_plate ?? "Chưa có biển số"} · {order.repair_order_code}</option>)}
                </select>
                {selectedOrder && <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#61707b]"><span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ef] px-3 py-1.5 font-semibold text-[#22854a]"><Icon name="check" size={13}/> Đã bàn giao</span><span>{selectedOrder.handed_over_at ? `Ngày ${formatDate(selectedOrder.handed_over_at)}` : "Đủ điều kiện đánh giá"}</span></div>}
              </div>

              <div className="border-t border-[#f0eeee] pt-6">
                <span className="mb-4 block text-[14px] font-bold text-[#19212b]">2. Chấm điểm trải nghiệm</span>
                <RatingField title="Bạn hài lòng với dịch vụ tổng thể đến mức nào? *" description="Đánh giá chung về lần bảo dưỡng hoặc sửa chữa xe." value={overall} onChange={setOverall}/>
                <div className="mt-6 grid gap-6 rounded-2xl bg-[#faf9f7] p-5 md:grid-cols-2 md:p-6">
                  <RatingField title="Tư vấn và chăm sóc khách hàng" optional value={advisor} onChange={setAdvisor}/>
                  <RatingField title="Chất lượng bảo dưỡng / sửa chữa" optional value={technician} onChange={setTechnician}/>
                </div>
              </div>

              <div className="border-t border-[#f0eeee] pt-6">
                <label htmlFor="customer-review-comment" className="block text-[14px] font-bold text-[#19212b]">3. Chia sẻ thêm cảm nhận <span className="font-normal text-[#86909b]">(không bắt buộc)</span></label>
                <textarea id="customer-review-comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} rows={4}
                  placeholder="Ví dụ: Nhân viên tư vấn nhiệt tình, báo giá rõ ràng, hoàn thành đúng hẹn, xe vận hành tốt..."
                  className="mt-3 w-full resize-y rounded-xl border border-[#e0e2e4] bg-white p-4 text-[13px] leading-6 text-[#283440] outline-none transition placeholder:text-[#a2aab2] focus:border-[#cf2935] focus:ring-2 focus:ring-[#f8c9ce]"/>
                <p className="mt-1 text-right text-[11px] text-[#7d8790]">{comment.length}/1000 ký tự</p>
              </div>

              {submitError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-[#a52c37]">{submitError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f0eeee] pt-5">
                <p className="max-w-[600px] text-[12px] leading-5 text-[#72808a]">Chỉ đánh giá những lần xe đã bàn giao; phản hồi được lưu theo đúng phiếu của bạn.</p>
                <button type="submit" disabled={submitting || overall < 1 || !selectedOrderId || loading || !!error}
                  className="inline-flex min-h-12 min-w-[185px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#d02937] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_#d0293726] transition hover:bg-[#b51e2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] disabled:cursor-not-allowed disabled:bg-[#d7d9dc] disabled:text-[#797d85] disabled:shadow-none">
                  <Icon name="send" size={17}/>{submitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className={`${!loading && unreviewedOrders.length === 0 ? 'order-1 mt-2' : 'order-2 mt-12'}`} aria-labelledby="my-reviews-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#d02c39]">Những lần đã chia sẻ</span>
              <h2 id="my-reviews-title" className="text-[25px] font-extrabold tracking-[-0.02em] text-[#1d2731] sm:text-[29px]">Đánh giá của bạn</h2>
              <p className="mt-1 text-[13px] text-[#75808a]">Những trải nghiệm bạn đã gửi tới CarService, cùng phản hồi từ gara.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reviewVehicles.length > 1 && <label><span className="sr-only">Lọc đánh giá theo xe</span><select className="min-h-11 rounded-xl border border-[#e6e6e6] bg-white px-3 text-[12px] font-semibold" value={reviewVehicleFilter} onChange={event => setReviewVehicleFilter(event.target.value)}>
                <option value="">Tất cả xe</option>{reviewVehicles.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
              </select></label>}
              {average != null && <span className="inline-flex items-center gap-2 rounded-xl border border-[#f1e2c7] bg-[#fff9ed] px-4 py-3 text-[13px] text-[#a66a12]"><Icon name="star" size={18}/><strong>{average.toFixed(1)}/5</strong><span>· Trung bình của bạn</span></span>}
            </div>
          </div>
          {loading ? <p className="rounded-2xl bg-white p-10 text-center text-sm text-[#7d8790]">Đang tải đánh giá...</p> : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e3e4e7] bg-white px-5 py-12 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#fff8eb] text-[#ce962d]"><Icon name="star" size={27}/></span>
              <h3 className="mt-3 text-[17px] font-bold">Chưa có đánh giá nào</h3>
              <p className="mt-1 text-sm text-[#78828d]">Hãy bắt đầu bằng lần bảo dưỡng bạn vừa hoàn tất ở phía trên.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleReviews.length === 0 && <div className="rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm text-[#7a8590]">Xe này chưa có đánh giá nào được gửi.</div>}
              {visibleReviews.map(review => {
                const order = review.repair_order ?? review.repairOrder;
                return <article key={review.id} className="flex min-w-0 flex-col rounded-2xl border border-[#e9e7e3] bg-white p-5 shadow-[0_5px_26px_#1d212b07] sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {account?.avatar ? <img src={account.avatar} alt="" className="size-11 shrink-0 rounded-full object-cover"/>
                        : <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#d42b3a] text-sm font-bold text-white">{initials}</span>}
                      <div className="min-w-0"><strong className="block truncate text-[14px] text-[#29323a]">{displayName}</strong>
                        <span className="block text-[12px] text-[#7b858f]">Đã đánh giá lần bảo dưỡng · {formatDate(review.created_at)}</span></div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#edf8f0] px-2.5 py-1.5 text-[11px] font-bold text-[#237b47]"><Icon name="check" size={13}/> Đã gửi</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#f9f9f8] px-4 py-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-[#c42b39]"><Icon name="car" size={22}/></span>
                    <div className="min-w-0"><h3 className="text-[15px] font-bold text-[#212a32]">{getVehicleName(order?.vehicle)}</h3>
                      <p className="text-[12px] text-[#7b858f]">{order?.vehicle?.license_plate ?? "Chưa có biển số"} · {order?.repair_order_code ?? `Phiếu #${review.repair_order_id}`}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f0ee] pt-4">
                    <ReadonlyStars rating={review.overall_rating}/>
                    <time className="text-[12px] text-[#8b929b]" dateTime={review.created_at ?? undefined}>{formatDate(review.created_at)}</time>
                  </div>
                  {review.comment && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#faf9f7] px-4 py-3 text-[13px] leading-6 text-[#454d55]">“{review.comment}”</p>}
                  {(review.advisor_rating || review.technician_rating) && <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#6d7780]">
                    {!!review.advisor_rating && <span className="rounded-full bg-[#f7f7f7] px-3 py-1.5">Tư vấn: <strong>{review.advisor_rating}/5 ★</strong></span>}
                    {!!review.technician_rating && <span className="rounded-full bg-[#f7f7f7] px-3 py-1.5">Chất lượng: <strong>{review.technician_rating}/5 ★</strong></span>}
                  </div>}
                  {review.reply && <div className="mt-4 rounded-xl border-l-[3px] border-[#d12d3b] bg-[#fff6f5] px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#bb2633]"><Icon name="reply" size={15}/> Phản hồi từ CarService</p>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-[#5f4345]">{review.reply}</p>
                  </div>}
                </article>;
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
