import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  formatDate,
  getVehicleName,
  submitReview,
  type CustomerRepairOrder,
  type CustomerReview,
} from "../../services/customerApi";

type Props = {
  order: CustomerRepairOrder;
  review?: CustomerReview;
  onClose: () => void;
  onReviewed: (review: CustomerReview) => void;
};

function RatingInput({ label, optional, value, onChange }: {
  label: string;
  optional?: boolean;
  value: number;
  onChange: (value: number) => void;
}) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold text-[var(--cs-text,#191919)]">
      {label} {optional && <span className="font-normal text-[var(--cs-muted,#666)]">(không bắt buộc)</span>}
    </legend>
    <div className="flex flex-wrap items-center gap-1.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map(star => <button
        key={star}
        type="button"
        aria-label={`${label}: ${star} sao`}
        aria-pressed={value === star}
        title={`${star} sao`}
        onClick={() => onChange(value === star && optional ? 0 : star)}
        className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border text-[27px] leading-none transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ce2735] ${star <= value ? "border-[#f4c369] bg-[#fff4d9] text-[#cb8615]" : "border-[var(--cs-border,#ddd)] bg-[var(--cs-surface,#fff)] text-[#9ca3af] hover:border-[#cf2935]"}`}
      >★</button>)}
      <span className="ml-2 text-xs text-[var(--cs-muted,#666)]">{value ? `${value}/5 sao` : "Chưa chọn"}</span>
    </div>
  </fieldset>;
}

function ReadonlyStars({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <span className="text-xs text-[var(--cs-muted,#666)]">Không đánh giá</span>;
  return <span aria-label={`${rating} trên 5 sao`} className="text-lg tracking-[0.12em] text-[#cf8c19]">
    {"★".repeat(Math.max(0, Math.min(5, rating)))}<span className="text-[#c6cbd0]">{"★".repeat(Math.max(0, 5 - rating))}</span>
  </span>;
}

/** Hộp thoại đánh giá chỉ dành cho phiếu đã bàn giao, sử dụng API POST /me/reviews hiện có. */
export default function ServiceReviewDialog({ order, review, onClose, onReviewed }: Props) {
  const [overall, setOverall] = useState(0);
  const [advisor, setAdvisor] = useState(0);
  const [technician, setTechnician] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const canSubmit = !review && order.status === "HANDED_OVER";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, sending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || sending) return;
    if (overall < 1) {
      setError("Vui lòng chọn số sao đánh giá tổng thể.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await submitReview({
        repair_order_id: order.id,
        overall_rating: overall,
        ...(advisor > 0 ? { advisor_rating: advisor } : {}),
        ...(technician > 0 ? { technician_rating: technician } : {}),
        comment: comment.trim(),
      });
      // Chỉ cập nhật giao diện khi Backend đã trả về bản ghi đánh giá thực.
      if (!response?.data?.id) throw new Error("Hệ thống chưa xác nhận đã lưu đánh giá. Vui lòng kiểm tra lịch sử trước khi gửi lại.");
      onReviewed(response.data as CustomerReview);
    } catch (cause: unknown) {
      const apiError = cause as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const validation = Object.values(apiError?.data?.errors ?? {}).flat()[0];
      setError(validation || apiError?.data?.message || apiError?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return <div
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 px-3 py-5 backdrop-blur-[3px] sm:px-6"
    onMouseDown={event => { if (event.target === event.currentTarget && !sending) onClose(); }}
  >
    <section role="dialog" aria-modal="true" aria-labelledby="service-review-title"
      className="max-h-[min(90dvh,800px)] w-full max-w-[590px] overflow-y-auto rounded-[22px] border border-[var(--cs-border,#eee)] bg-[var(--cs-surface,#fff)] p-5 text-[var(--cs-text,#191919)] shadow-2xl sm:p-7">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--cs-border,#eee)] pb-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#d12b37]">CarService · Trải nghiệm khách hàng</p>
          <h2 id="service-review-title" className="text-xl font-extrabold tracking-normal sm:text-2xl">{review ? "Đánh giá đã gửi" : "Đánh giá dịch vụ"}</h2>
          <p className="mt-1 text-xs text-[var(--cs-muted,#666)]">{review ? "Cảm ơn bạn đã chia sẻ trải nghiệm." : "Chia sẻ cảm nhận sau khi nhận lại xe từ gara."}</p>
        </div>
        <button ref={closeRef} type="button" disabled={sending} onClick={onClose} aria-label="Đóng đánh giá"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--cs-border,#ddd)] text-xl hover:border-[#cf2935] hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] disabled:opacity-50">×</button>
      </header>
      <div className="mt-4 rounded-2xl border border-[var(--cs-border,#e8e8e8)] bg-[var(--cs-bg,#f7f7f6)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm">{getVehicleName(order.vehicle)}</strong>
          <span className="rounded-full bg-[#e5f5e9] px-2.5 py-1 text-[11px] font-bold text-[#237342]">Đã bàn giao</span>
        </div>
        <p className="mt-1 text-xs text-[var(--cs-muted,#666)]">{order.vehicle?.license_plate ?? "Chưa có biển số"} · {order.repair_order_code}</p>
        {order.handed_over_at && <p className="mt-1 text-xs text-[var(--cs-muted,#666)]">Bàn giao: {formatDate(order.handed_over_at)}</p>}
      </div>
      {review ? <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3"><strong className="text-sm">Đánh giá tổng thể</strong><ReadonlyStars rating={review.overall_rating}/></div>
        {review.advisor_rating != null && <div className="flex items-center justify-between gap-3"><span className="text-sm">Tư vấn, chăm sóc khách hàng</span><ReadonlyStars rating={review.advisor_rating}/></div>}
        {review.technician_rating != null && <div className="flex items-center justify-between gap-3"><span className="text-sm">Chất lượng bảo dưỡng / sửa chữa</span><ReadonlyStars rating={review.technician_rating}/></div>}
        {review.comment && <div className="rounded-xl bg-[var(--cs-bg,#f7f7f6)] p-4 text-sm leading-6">{review.comment}</div>}
        {review.reply && <div className="rounded-xl border border-[#f2d3d5] bg-[#fff1f1] p-4 text-sm text-[#85202c]"><strong>Phản hồi từ CarService</strong><p className="mt-1 leading-6">{review.reply}</p></div>}
        <p className="text-xs text-[var(--cs-muted,#666)]">Mỗi phiếu sửa chữa chỉ được đánh giá một lần.</p>
        <button type="button" onClick={onClose} className="min-h-11 w-full cursor-pointer rounded-xl border border-[var(--cs-border,#ddd)] px-5 text-sm font-bold hover:border-[#cf2935]">Đóng</button>
      </div> : canSubmit ? <form onSubmit={send} className="mt-5 space-y-5">
        <RatingInput label="Mức độ hài lòng tổng thể *" value={overall} onChange={setOverall}/>
        <div className="grid gap-5 border-t border-[var(--cs-border,#eee)] pt-4 sm:grid-cols-2">
          <RatingInput label="Tư vấn và chăm sóc" optional value={advisor} onChange={setAdvisor}/>
          <RatingInput label="Chất lượng sửa chữa" optional value={technician} onChange={setTechnician}/>
        </div>
        <div>
          <label htmlFor="review-comment" className="mb-2 block text-sm font-semibold">Nhận xét của bạn (không bắt buộc)</label>
          <textarea id="review-comment" rows={3} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)}
            placeholder="Ví dụ: Nhân viên tư vấn rõ ràng, bảo dưỡng đúng hẹn, xe hoạt động tốt..."
            className="w-full resize-y rounded-xl border border-[var(--cs-border,#ddd)] bg-[var(--cs-surface,#fff)] p-3 text-sm leading-6 outline-[#cf2935]" />
          <p className="mt-1 text-right text-xs text-[var(--cs-muted,#666)]">{comment.length}/1000 ký tự</p>
        </div>
        {error && <p role="alert" className="rounded-xl border border-[#f5c4c8] bg-[#fff0f1] p-3 text-sm text-[#a22530]">{error}</p>}
        <p className="text-xs leading-5 text-[var(--cs-muted,#666)]">Đánh giá được lưu theo đúng phiếu sửa chữa và không thể gửi thêm lần thứ hai.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={sending} onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-[var(--cs-border,#ddd)] px-5 text-sm font-bold hover:border-[#cf2935] disabled:opacity-50">Để sau</button>
          <button type="submit" disabled={sending || overall < 1}
            className="min-h-11 cursor-pointer rounded-xl bg-[#cf2935] px-6 text-sm font-bold text-white transition-colors hover:bg-[#ad1e2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? "Đang gửi..." : "★ Gửi đánh giá"}
          </button>
        </div>
      </form> : <div className="mt-5 rounded-xl border border-[#f1d8d8] bg-[#fff1f1] p-4 text-sm text-[#942633]">Chỉ đánh giá được sau khi phiếu sửa chữa chuyển sang trạng thái Đã bàn giao.</div>}
    </section>
  </div>;
}
