import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, Modal, RatingInput, RatingStars } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { controlClass } from "../../components/ui/fieldContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { formatDate, getMyRepairOrderDetail, getVehicleName, submitReview, type CustomerRepairOrder, type CustomerReview } from "../../services/customerApi";
import { MAX_SUGGESTIONS, buildSuggestions, composeComment, serviceNamesOf } from "./reviewSuggestions";
import { InlineError, ModalFoot, ModalHead } from "./account/AccountKit";
import { MODAL_CLASS, PRIMARY_RED } from "./account/accountStyles";

type Props = {
  order: CustomerRepairOrder;
  review?: CustomerReview;
  onClose: () => void;
  onReviewed: (review: CustomerReview) => void;
};

const scoreLabels = ["", "Rất chưa hài lòng", "Chưa hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

/**
 * Modal đánh giá của MỘT phiếu sửa chữa (mở từ Lịch sử bảo dưỡng hoặc link thông báo):
 * chưa đánh giá → form gửi (POST /me/reviews); đã đánh giá → xem lại kèm phản hồi của gara.
 * Khách chấm MỘT điểm chung cho gara (overall_rating) — đúng điểm mà admin, báo cáo và trang chủ dùng.
 */
export default function ServiceReviewDialog({ order, review, onClose, onReviewed }: Props) {
  const [overall, setOverall] = useState(0);
  const [preview, setPreview] = useState(0);
  const [comment, setComment] = useState("");
  const [pickedChips, setPickedChips] = useState<string[]>([]);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = !review && order.status === "HANDED_OVER";

  // Dịch vụ / gói của đúng phiếu (danh sách phiếu không kèm) → gợi ý sát với lần bảo dưỡng; lỗi thì dùng gợi ý chung.
  useEffect(() => {
    if (!canSubmit) return;
    let active = true;
    getMyRepairOrderDetail(order.id).then((detail) => { if (active) setServiceNames(serviceNamesOf(detail)); }).catch(() => {});
    return () => { active = false; };
  }, [canSubmit, order.id]);

  const suggestions = useMemo(() => buildSuggestions(serviceNames, overall), [serviceNames, overall]);
  // Đổi từ khen sang góp ý (hoặc ngược lại): gợi ý đã chọn mà không còn trong danh sách thì không tính.
  const chips = pickedChips.filter((chip) => suggestions.includes(chip));
  const toggleChip = (text: string) => setPickedChips(chips.includes(text)
    ? chips.filter((chip) => chip !== text)
    : chips.length >= MAX_SUGGESTIONS ? chips : [...chips, text]);
  const chipsLength = chips.length ? chips.join(". ").length + 2 : 0;
  const finalComment = composeComment(chips, comment);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || sending) return;
    if (overall < 1) { setError("Vui lòng chọn số sao đánh giá."); return; }
    setSending(true);
    setError("");
    try {
      const response = await submitReview({
        repair_order_id: order.id,
        overall_rating: overall,
        comment: finalComment.slice(0, 1000),
      });
      // Chỉ cập nhật giao diện khi Backend đã trả về bản ghi đánh giá thực.
      if (!response?.data?.id) throw new Error("Hệ thống chưa xác nhận đã lưu đánh giá. Vui lòng tải lại trang trước khi gửi lại.");
      onReviewed(response.data as CustomerReview);
    } catch (cause: unknown) {
      const apiError = cause as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const validation = Object.values(apiError?.data?.errors ?? {}).flat()[0];
      setError(validation || apiError?.data?.message || apiError?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal bare open onClose={onClose} dismissible={!sending} title={review ? "Đánh giá của bạn" : "Đánh giá dịch vụ"} className={`${MODAL_CLASS} max-w-xl`}>
      <ModalHead icon="star" eyebrow={review ? "Đánh giá của bạn" : "Đánh giá dịch vụ"} title={order.repair_order_code}
        subtitle={order.handed_over_at ? `Bàn giao ngày ${formatDate(order.handed_over_at)}` : undefined} onClose={onClose} disabled={sending}/>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-cs-border p-4">
          <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={44}/>
          <div className="min-w-0">
            <p className="font-bold text-cs-text">{getVehicleName(order.vehicle)}</p>
            <p className="font-mono text-[13px] text-cs-muted">{order.vehicle?.license_plate ?? "Chưa có biển số"}</p>
          </div>
        </div>

        {review ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <RatingStars value={review.overall_rating} size={26}/>
              <span className="text-[15px] font-bold text-cs-text">{scoreLabels[review.overall_rating] ?? ""}</span>
            </div>
            {review.comment
              ? <p className="whitespace-pre-wrap rounded-xl bg-cs-surface-2 px-4 py-3 text-[14px] leading-relaxed text-cs-text">“{review.comment}”</p>
              : <p className="text-[14px] text-cs-muted">Bạn đã chấm sao mà không viết nhận xét.</p>}
            {review.reply
              ? <div className="rounded-xl border-l-[3px] border-cs-accent bg-cs-soft px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-cs-accent-text"><Icon name="reply" size={15}/>Phản hồi từ CarService{review.replied_at && <span className="font-normal text-cs-muted">· {formatDate(review.replied_at)}</span>}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] text-cs-text">{review.reply}</p>
                </div>
              : <p className="text-[13px] text-cs-muted">Gara chưa phản hồi đánh giá này.</p>}
            <p className="text-[13px] text-cs-muted">Gửi ngày {formatDate(review.created_at)} · Mỗi phiếu chỉ đánh giá một lần.</p>
          </>
        ) : canSubmit ? (
          <form id="service-review-form" onSubmit={send} className="space-y-5">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-cs-surface-2 px-4 py-5 text-center">
              <p className="text-[15px] font-bold text-cs-text">Bạn hài lòng với lần bảo dưỡng này thế nào?</p>
              <RatingInput label="Số sao đánh giá" value={overall} onPreview={setPreview} onChange={(value) => { setOverall(value); setError(""); }}/>
              <p className={`min-h-6 text-[15px] font-bold transition-colors duration-200 ${preview || overall ? "text-warning-fg" : "text-cs-muted"}`} aria-live="polite">
                {scoreLabels[preview || overall] || "Chạm vào sao để chấm điểm"}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[14px] font-bold text-cs-text">Nhận xét nhanh <span className="font-normal text-cs-muted">(chọn tối đa {MAX_SUGGESTIONS})</span></p>
                <span className="text-xs text-cs-muted">{chips.length}/{MAX_SUGGESTIONS}</span>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Gợi ý nhận xét">
                {suggestions.map((text) => {
                  const picked = chips.includes(text);
                  const full = !picked && chips.length >= MAX_SUGGESTIONS;
                  return (
                    <button key={text} type="button" aria-pressed={picked} disabled={full} onClick={() => toggleChip(text)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${picked ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-cs-border bg-cs-surface text-cs-text-2 hover:-translate-y-px hover:border-cs-accent/60"}`}>
                      {picked && <Icon name="check" size={14}/>}{text}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-[14px] font-bold text-cs-text">
                <span>Viết thêm <span className="font-normal text-cs-muted">(không bắt buộc)</span></span>
                <span className="text-xs font-normal text-cs-muted">{finalComment.length}/1000</span>
              </span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={Math.max(0, 1000 - chipsLength)} rows={3}
                placeholder="Chia sẻ thêm trải nghiệm của bạn…" className={`${controlClass} resize-none`}/>
            </label>
            {error && <InlineError>{error}</InlineError>}
          </form>
        ) : (
          <InlineError>Chỉ đánh giá được sau khi gara bàn giao xe.</InlineError>
        )}
      </div>

      <ModalFoot>
        {canSubmit ? <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>Để sau</Button>
          <Button type="submit" form="service-review-form" variant="primary" icon="send" className={PRIMARY_RED} loading={sending} loadingText="Đang gửi..." disabled={overall < 1}>Gửi đánh giá</Button>
        </> : <Button variant="secondary" onClick={onClose}>Đóng</Button>}
      </ModalFoot>
    </Modal>
  );
}
