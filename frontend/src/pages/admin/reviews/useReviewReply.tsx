import { useRef, useState } from "react";
import { Button, Field, Modal, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { apiFieldErrors } from "../../../components/ui/formValidation";
import { errorMessage, type AdminReview } from "../../../services/adminApi";
import { Stars } from "../kit/AdminKit";
import { num } from "../kit/format";

const REPLY_MAX = 2000;
const normalizeReply = (value: string) => value.replace(/\r\n/g, "\n").trim();

type Saved = { data: AdminReview };
type Options = {
  create: (id: number, reply: string) => Promise<Saved>;
  update: (id: number, reply: string, expectedReply: string) => Promise<Saved>;
  /** Gọi sau khi lưu thành công. */
  onSaved: (review: AdminReview) => void;
  /** Lưu lỗi (phản hồi có thể vừa bị đổi ở phiên khác): tải lại danh sách, vẫn giữ nội dung đang nhập. */
  onFailed: () => void;
  firstReplyTitle: string;
  /** Hỏi xác nhận cả khi gửi phản hồi đầu tiên; sửa phản hồi luôn hỏi xác nhận. */
  confirmFirstReply?: boolean;
};

/** Modal gửi / sửa phản hồi dùng chung cho Admin và Cố vấn: validation, xác nhận, loading, chống gửi trùng. */
export function useReviewReply({ create, update, onSaved, onFailed, firstReplyTitle, confirmFirstReply = false }: Options) {
  const { notify, confirm } = useAppFeedback();
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const open = (review: AdminReview) => { setReplying(review); setReply(review.reply ?? ""); setReplyError(""); };
  const trimmedReply = normalizeReply(reply);
  const isEditing = !!replying?.reply;
  const unchanged = !!replying?.reply && trimmedReply === normalizeReply(replying.reply);

  const send = async () => {
    if (!replying || sendingRef.current) return;
    if (!trimmedReply) { setReplyError("Vui lòng nhập nội dung phản hồi."); return; }
    if (trimmedReply.length > REPLY_MAX) { setReplyError(`Phản hồi tối đa ${num(REPLY_MAX)} ký tự.`); return; }
    if (unchanged) { setReplyError("Nội dung phản hồi chưa có thay đổi."); return; }
    sendingRef.current = true;
    try {
      if (replying.reply) {
        const accepted = await confirm({ title: "Lưu thay đổi phản hồi?", description: "Khách hàng sẽ thấy nội dung mới kèm nhãn “Đã chỉnh sửa”. Nội dung cũ được lưu trong lịch sử chỉnh sửa.", confirmText: "Lưu thay đổi", cancelText: "Xem lại", variant: "info", confirmIcon: "check" });
        if (!accepted) return;
      } else if (confirmFirstReply) {
        const accepted = await confirm({ title: "Gửi phản hồi cho khách?", description: "Khách hàng sẽ nhận được thông báo và thấy phản hồi này dưới đánh giá của mình.", confirmText: "Gửi phản hồi", cancelText: "Xem lại", variant: "info", confirmIcon: "send" });
        if (!accepted) return;
      }
      setSending(true);
      setReplyError("");
      const response = replying.reply
        ? await update(replying.id, trimmedReply, replying.reply)
        : await create(replying.id, trimmedReply);
      notify(`${replying.reply ? "Đã cập nhật phản hồi" : "Đã gửi phản hồi"} cho đánh giá của ${replying.customer ?? "khách hàng"}.`, "success");
      setReplying(null);
      onSaved(response.data);
    } catch (error) {
      // Lỗi của ô nhập hiện tại ô; lỗi lưu hiện bằng Toast. Nội dung đang nhập luôn được giữ để gửi lại.
      const fieldError = apiFieldErrors(error).reply;
      if (fieldError) setReplyError(fieldError);
      else notify(errorMessage(error, "Không lưu được phản hồi. Vui lòng thử lại."), "error");
      onFailed();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const modal = <Modal open={!!replying} onClose={() => setReplying(null)} dismissible={!sending} size="sm" title={isEditing ? "Sửa phản hồi" : firstReplyTitle}
    description={replying ? `${replying.customer ?? "Khách hàng"} · ${replying.rating} sao` : undefined}
    footer={<><Button disabled={sending} onClick={() => setReplying(null)}>Hủy</Button><Button variant="primary" icon={isEditing ? "check" : "send"} loading={sending} loadingText="Đang lưu..." onClick={() => void send()} disabled={!trimmedReply || unchanged}>{isEditing ? "Lưu thay đổi" : "Gửi phản hồi"}</Button></>}>
    {replying && <div className="mb-4 rounded-control bg-cs-surface-2 p-3 text-small">
      <Stars value={replying.rating} size={14}/>
      <p className="mt-1.5 line-clamp-3 break-words italic text-cs-text-2">{replying.comment ? `“${replying.comment}”` : "Khách không để lại nhận xét."}</p>
    </div>}
    <Field label="Nội dung phản hồi" required error={replyError} hint={`Đại diện gara CarService · ${num(reply.length)}/${num(REPLY_MAX)} ký tự`}>
      <Textarea rows={4} maxLength={REPLY_MAX} value={reply} disabled={sending} onChange={e => { setReply(e.target.value); setReplyError(""); }}/>
    </Field>
  </Modal>;

  return { open, modal };
}
