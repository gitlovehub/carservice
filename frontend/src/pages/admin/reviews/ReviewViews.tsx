import type { KeyboardEvent, ReactNode } from "react";
import { Button, Drawer, IconButton } from "../../../components/ui";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { fmtDate, fmtDateTime, type AdminReview } from "../../../services/adminApi";
import { Avatar, InfoList, PaneSection, Pill, Stars } from "../kit/AdminKit";
import type { Tone } from "../kit/format";
import type { ReviewViewMode } from "./useReviewView";

export type ReviewActions = {
  /** Đang có thao tác hoặc đang tải lại: khoá nút để không gửi trùng. */
  disabled: boolean;
  busyId: number | null;
  onReply: (review: AdminReview) => void;
  /** Không truyền: vai trò không có quyền ẩn/hiện đánh giá. */
  onToggle?: (review: AdminReview) => void;
  /** Không truyền: vai trò không được xem lịch sử chỉnh sửa. */
  onHistory?: (review: AdminReview) => void;
  /** Mặc định được phản hồi và sửa mọi đánh giá. */
  canReply?: (review: AdminReview) => boolean;
  firstReplyLabel?: string;
  /** Card tối giản: bỏ dòng dịch vụ. */
  compactGrid?: boolean;
};

const VIEW_OPTIONS: Array<{ id: ReviewViewMode; label: string; icon: IconName }> = [{ id: "grid", label: "Xem dạng lưới", icon: "grid" }, { id: "list", label: "Xem dạng danh sách", icon: "list" }];

export function ReviewViewToggle({ view, onChange }: { view: ReviewViewMode; onChange: (view: ReviewViewMode) => void }) {
  return <div role="radiogroup" aria-label="Chế độ hiển thị" className="ml-auto inline-flex shrink-0 gap-1 rounded-control border border-cs-border bg-cs-surface p-1">
    {VIEW_OPTIONS.map(option => <button key={option.id} type="button" role="radio" aria-checked={view === option.id} aria-label={option.label} title={option.label} onClick={() => onChange(option.id)}
      className={`grid size-8 cursor-pointer place-items-center rounded-md transition-colors max-sm:size-9 ${view === option.id ? "bg-cs-accent text-cs-accent-contrast" : "text-cs-text-2 hover:bg-cs-hover hover:text-cs-text"}`}>
      <Icon name={option.icon} size={17}/>
    </button>)}
  </div>;
}

/** Nút Phản hồi / Sửa phản hồi; đánh giá đã có phản hồi của người khác thì chỉ hiện ghi chú. */
function ReplyButton({ review: r, actions, size = "sm", firstVariant = "tonal" }: { review: AdminReview; actions: ReviewActions; size?: "sm" | "md"; firstVariant?: "tonal" | "primary" }) {
  if (r.hidden) return null;
  if (actions.canReply && !actions.canReply(r)) return <span className="self-center text-caption text-cs-muted">Phản hồi do người khác gửi</span>;
  return <Button size={size} variant={r.reply ? "outline" : firstVariant} icon={r.reply ? "edit" : "reply"} disabled={actions.disabled} onClick={() => actions.onReply(r)}>{r.reply ? "Sửa phản hồi" : actions.firstReplyLabel ?? "Phản hồi"}</Button>;
}

/** Nhãn "Đã chỉnh sửa" kèm thời gian cập nhật, dùng chung cho Grid, List và ngăn chi tiết. */
function ReplyEdited({ review }: { review: AdminReview }) {
  if (!review.reply_edited_at) return null;
  return <span className="inline-flex flex-wrap items-center gap-1.5 text-caption text-cs-muted"><Pill tone="info" icon="edit">Đã chỉnh sửa</Pill><time className="tabular-nums">{fmtDateTime(review.reply_edited_at)}</time></span>;
}

function HistoryButton({ review, actions }: { review: AdminReview; actions: ReviewActions }) {
  const { onHistory } = actions;
  if (!review.reply || !onHistory) return null;
  return <Button size="sm" variant="ghost" icon="history" disabled={actions.disabled} onClick={() => onHistory(review)}>Lịch sử chỉnh sửa</Button>;
}

function replyStatus(r: AdminReview): { label: string; tone: Tone; icon?: IconName } {
  if (r.hidden) return { label: "Đã ẩn", tone: "neutral", icon: "eye-off" };
  if (r.reply) return { label: "Đã phản hồi", tone: "success" };
  return r.rating <= 3 ? { label: "Cần phản hồi", tone: "danger", icon: "alert" } : { label: "Chưa phản hồi", tone: "warning" };
}
const StatusPill = ({ review }: { review: AdminReview }) => { const s = replyStatus(review); return <Pill tone={s.tone} icon={s.icon}>{s.label}</Pill>; };
const customerName = (r: AdminReview) => r.customer ?? "Khách hàng";
const serviceSummary = (r: AdminReview) => r.services.length ? `${r.services[0]}${r.services.length > 1 ? ` +${r.services.length - 1}` : ""}` : "Chưa có dịch vụ";
const Comment = ({ review, className = "" }: { review: AdminReview; className?: string }) => review.comment
  ? <p className={`break-words text-cs-text ${className}`}>“{review.comment}”</p>
  : <p className={`text-cs-muted ${className}`}>Khách chỉ chấm sao, không để lại nhận xét.</p>;

function InfoLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <span className="flex min-w-0 items-center gap-1.5 text-caption text-cs-text-2"><Icon name={icon} size={14} className="shrink-0 text-cs-muted"/><span className="min-w-0 truncate">{children}</span></span>;
}

/** Grid: xem nhanh và phản hồi nhanh. Bấm card (trừ nút) để mở chi tiết. */
export function ReviewGrid({ rows, actions, onOpen }: { rows: AdminReview[]; actions: ReviewActions; onOpen: (review: AdminReview) => void }) {
  return <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {rows.map(r => {
      const onKey = (event: KeyboardEvent) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onOpen(r);
      };
      return <li key={r.id} className="flex min-w-0">
        <article tabIndex={0} aria-label={`Xem chi tiết đánh giá ${r.rating} sao của ${customerName(r)}`} onClick={() => onOpen(r)} onKeyDown={onKey}
          className={`flex w-full min-w-0 cursor-pointer flex-col rounded-card border border-cs-border bg-cs-surface p-4 shadow-card transition-colors hover:border-cs-border-strong hover:bg-cs-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cs-accent ${r.hidden ? "opacity-75" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} size={16}/>
            <StatusPill review={r}/>
            <time className="ml-auto text-caption tabular-nums text-cs-muted">{fmtDate(r.date)}</time>
          </div>
          <Comment review={r} className="mt-3 line-clamp-2 min-h-11 text-small font-medium leading-relaxed"/>
          <div className="mt-auto pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={customerName(r)} size={40}/>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-small text-cs-text">{customerName(r)}</b>
                <InfoLine icon="car">{r.vehicle || "Xe chưa rõ"}</InfoLine>
                {!actions.compactGrid && <InfoLine icon="wrench">{serviceSummary(r)}</InfoLine>}
              </div>
            </div>
            {r.reply_edited_at && <div className="mt-3"><ReplyEdited review={r}/></div>}
            <span className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-cs-border pt-3" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
              <HistoryButton review={r} actions={actions}/>
              {r.hidden && actions.onToggle && <Button size="sm" variant="outline" icon="eye" loading={actions.busyId === r.id} disabled={actions.disabled} onClick={() => actions.onToggle?.(r)}>Hiện lại</Button>}
              <ReplyButton review={r} actions={actions}/>
            </span>
          </div>
        </article>
      </li>;
    })}
  </ul>;
}

const LIST_COLUMNS = "xl:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1fr)_minmax(0,1.5fr)_172px]";

/** List: xem đủ nội dung và quản lý chi tiết; màn hẹp tự xếp thành các khối dọc. */
export function ReviewList({ rows, actions }: { rows: AdminReview[]; actions: ReviewActions }) {
  return <div className="overflow-hidden rounded-card border border-cs-border bg-cs-surface shadow-card">
    <div aria-hidden="true" className={`hidden gap-4 border-b border-cs-border bg-cs-surface-2 px-4 py-3 text-small font-semibold text-cs-text-2 xl:grid ${LIST_COLUMNS}`}>
      <span>Đánh giá</span><span>Khách hàng</span><span>Xe & dịch vụ</span><span>Phản hồi của gara</span><span className="text-right">Thao tác</span>
    </div>
    <ul className="divide-y divide-cs-border">
      {rows.map(r => <li key={r.id} className={`grid gap-4 p-4 transition-colors hover:bg-cs-hover/60 md:grid-cols-2 ${LIST_COLUMNS} ${r.hidden ? "opacity-75" : ""}`}>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-2"><Stars value={r.rating} size={16}/><StatusPill review={r}/></div>
          <Comment review={r} className="mt-2 whitespace-pre-wrap text-small leading-relaxed"/>
          <p className="mt-1.5 text-caption tabular-nums text-cs-muted">{fmtDateTime(r.date)}</p>
        </div>
        <div className="flex min-w-0 items-start gap-2.5">
          <Avatar name={customerName(r)} size={36}/>
          <div className="min-w-0">
            <b className="block break-words text-small text-cs-text">{customerName(r)}</b>
            {r.phone ? <a href={`tel:${r.phone}`} className="text-caption tabular-nums text-cs-text-2 hover:text-cs-accent-text hover:underline">{r.phone}</a> : <span className="text-caption text-cs-muted">Chưa có SĐT</span>}
          </div>
        </div>
        <div className="min-w-0 space-y-1 text-caption text-cs-text-2">
          <p className="flex items-start gap-1.5"><Icon name="car" size={14} className="mt-0.5 shrink-0 text-cs-muted"/><span className="min-w-0 break-words"><b className="font-semibold text-cs-text">{r.vehicle || "Xe chưa rõ"}</b>{r.plate ? ` · ${r.plate}` : ""}</span></p>
          <p className="flex items-start gap-1.5"><Icon name="wrench" size={14} className="mt-0.5 shrink-0 text-cs-muted"/><span className="min-w-0 break-words">{r.services.join(", ") || "Chưa có dịch vụ"}</span></p>
          {r.order_code && <p className="flex items-start gap-1.5"><Icon name="clipboard" size={14} className="mt-0.5 shrink-0 text-cs-muted"/><span className="min-w-0 break-all font-mono">{r.order_code}</span></p>}
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          {r.reply
            ? <div className="rounded-control bg-cs-soft/60 px-3 py-2 text-small">
              <p className="flex flex-wrap items-center justify-between gap-x-2 text-caption font-semibold text-cs-accent-text"><span className="inline-flex items-center gap-1.5"><Icon name="reply" size={13}/>Phản hồi của gara</span>{r.replied_at && <span className="font-normal tabular-nums text-cs-muted">{fmtDateTime(r.replied_at)}</span>}</p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-cs-text-2">{r.reply}</p>
              {r.reply_edited_at && <div className="mt-1.5"><ReplyEdited review={r}/></div>}
            </div>
            : <p className="rounded-control border border-dashed border-cs-border px-3 py-2 text-small text-cs-muted">Chưa có phản hồi.</p>}
        </div>
        <div className="flex flex-wrap content-start items-start justify-end gap-1.5 md:col-span-2 xl:col-span-1">
          {actions.onToggle && <IconButton icon={r.hidden ? "eye" : "eye-off"} size="sm" variant="outline" label={r.hidden ? "Hiện lại công khai" : "Ẩn khỏi trang công khai"} disabled={actions.disabled} onClick={() => actions.onToggle?.(r)}/>}
          <ReplyButton review={r} actions={actions}/>
          <HistoryButton review={r} actions={actions}/>
        </div>
      </li>)}
    </ul>
  </div>;
}

/** Ngăn chi tiết đầy đủ khi bấm card ở chế độ Grid. */
export function ReviewDetail({ review: r, actions, onClose }: { review: AdminReview | null; actions: ReviewActions; onClose: () => void }) {
  return <Drawer open={r !== null} onClose={onClose} title="Chi tiết đánh giá" width="lg"
    footer={r ? <>
      {actions.onToggle && <Button variant="ghost" icon={r.hidden ? "eye" : "eye-off"} loading={actions.busyId === r.id} disabled={actions.disabled} onClick={() => actions.onToggle?.(r)}>{r.hidden ? "Hiện lại" : "Ẩn công khai"}</Button>}
      <HistoryButton review={r} actions={actions}/>
      <ReplyButton review={r} actions={actions} size="md" firstVariant="primary"/>
    </> : undefined}>
    {r && <>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2"><Stars value={r.rating} size={18}/><StatusPill review={r}/></div>
        <Comment review={r} className="mt-3 whitespace-pre-wrap text-body leading-relaxed"/>
        <p className="mt-2 text-caption tabular-nums text-cs-muted">Đánh giá lúc {fmtDateTime(r.date)}</p>
      </div>
      <PaneSection title="Khách hàng" icon="user">
        <InfoList items={[{ label: "Họ tên", value: <b>{customerName(r)}</b> }, { label: "Số điện thoại", value: r.phone ? <a href={`tel:${r.phone}`} className="hover:text-cs-accent-text hover:underline">{r.phone}</a> : "—" }]}/>
      </PaneSection>
      <PaneSection title="Xe & dịch vụ" icon="car">
        <InfoList items={[
          { label: "Xe", value: r.vehicle || "—" }, { label: "Biển số", value: r.plate ?? "—" },
          { label: "Mã phiếu", value: r.order_code ? <span className="font-mono">{r.order_code}</span> : "—" }, { label: "Ngày làm", value: fmtDate(r.visit_date) },
          { label: "Dịch vụ", value: r.services.join(", ") || "—" },
        ]}/>
      </PaneSection>
      <PaneSection title="Phản hồi của gara" icon="reply">
        {r.reply
          ? <div className="rounded-control bg-cs-soft/60 p-3 text-small"><p className="whitespace-pre-wrap break-words leading-relaxed text-cs-text">{r.reply}</p>{r.replied_at && <p className="mt-1.5 text-caption tabular-nums text-cs-muted">{fmtDateTime(r.replied_at)}</p>}{r.reply_edited_at && <div className="mt-1.5"><ReplyEdited review={r}/></div>}</div>
          : <p className="text-small text-cs-muted">Chưa có phản hồi.</p>}
      </PaneSection>
    </>}
  </Drawer>;
}
