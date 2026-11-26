import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingState, Modal } from "../../../components/ui";
import { Icon } from "../../../components/ui/Icon";
import { adminApi, errorMessage, fmtDateTime, type AdminReview, type ReviewReplyVersion } from "../../../services/adminApi";
import { Pill } from "../kit/AdminKit";

type HistoryState = { versions: ReviewReplyVersion[] | null; error: string };

/** Lịch sử phản hồi (chỉ Admin), từ mới đến cũ. Render theo `key` của đánh giá nên mỗi lần mở đều tải dữ liệu mới. */
export function ReplyHistoryModal({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  const [state, setState] = useState<HistoryState>({ versions: null, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    adminApi.reviewReplyHistory(review.id, controller.signal)
      .then(versions => setState({ versions, error: "" }))
      .catch(error => { if (!controller.signal.aborted) setState({ versions: null, error: errorMessage(error, "Không tải được lịch sử chỉnh sửa.") }); });
    return () => controller.abort();
  }, [review.id, attempt]);

  const retry = () => { setState({ versions: null, error: "" }); setAttempt(value => value + 1); };

  return <Modal open onClose={onClose} title="Lịch sử chỉnh sửa" description={`${review.customer ?? "Khách hàng"} · ${review.rating} sao`} footer={<Button onClick={onClose}>Đóng</Button>}>
    {state.error
      ? <ErrorState description={state.error} onRetry={retry}/>
      : !state.versions
        ? <LoadingState compact/>
        : !state.versions.length
          ? <EmptyState icon="history" title="Chưa có lịch sử" description="Đánh giá này chưa có phản hồi."/>
          : <ol className="grid gap-3">
            {state.versions.map((item, index) => <li key={item.version} className="rounded-control border border-cs-border bg-cs-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-small text-cs-text">Phiên bản {item.version}</b>
                {index === 0 && <Pill tone="success">Hiện tại</Pill>}
                {item.old_content === null && <Pill tone="neutral">Bản gốc</Pill>}
                <time className="ml-auto text-caption tabular-nums text-cs-muted">{fmtDateTime(item.edited_at)}</time>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-caption text-cs-text-2"><Icon name="user" size={13} className="shrink-0 text-cs-muted"/>{item.edited_by ?? "Không ghi nhận người gửi"}</p>
              {item.old_content !== null && <div className="mt-2">
                <p className="text-caption font-semibold text-cs-muted">Nội dung cũ</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-small leading-relaxed text-cs-text-2">{item.old_content}</p>
              </div>}
              <div className="mt-2">
                <p className="text-caption font-semibold text-cs-muted">{item.old_content === null ? "Nội dung" : "Nội dung mới"}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-small leading-relaxed text-cs-text">{item.content}</p>
              </div>
            </li>)}
          </ol>}
  </Modal>;
}
