import { useState } from "react";
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, Pagination, SearchInput, Textarea } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, type AdminReview } from "../../services/adminApi";
import { AdminPage, ClearFilters, FilterSelect, Panel, Person, Pill, Progress, StatCard, Stars, Tabs, Toolbar } from "./kit/AdminKit";
import { num, type Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

type StatusFilter = "all" | "unreplied" | "replied" | "hidden";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

const sentiment: Record<number, { label: string; tone: Tone }> = {
  5: { label: "Rất hài lòng", tone: "success" }, 4: { label: "Hài lòng", tone: "success" }, 3: { label: "Bình thường", tone: "warning" },
  2: { label: "Chưa hài lòng", tone: "danger" }, 1: { label: "Rất không hài lòng", tone: "danger" },
};
const pct = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${num(value)}%`;

/**
 * Đánh giá ga-ra — khách chấm điểm CarService sau mỗi lần bảo dưỡng / sửa chữa (theo phiếu sửa chữa).
 * Dữ liệu thật từ /api/admin/reviews: lọc theo trạng thái phản hồi / số sao, trả lời, ẩn / hiện.
 */
export default function Reviews() {
  const { notify } = useAppFeedback();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const term = useDebounced(search.trim());

  const params = { status, rating, search: term, page };
  const list = useAdminQuery(`reviews:${JSON.stringify(params)}`, signal => adminApi.reviews(params, signal));
  const result = list.data ?? list.stale;
  const summary = result?.summary;
  const rows = result?.data ?? [];

  const changeStatus = (value: StatusFilter) => { setStatus(value); setPage(1); };
  const changeRating = (value: RatingFilter) => { setRating(value); setPage(1); };

  const toggleHidden = async (review: AdminReview) => {
    setBusyId(review.id);
    try {
      await adminApi.hideReview(review.id, !review.hidden);
      notify(review.hidden
        ? `Đã hiện lại đánh giá ${review.rating}★ của ${review.customer ?? "khách hàng"}.`
        : `Đã ẩn đánh giá ${review.rating}★ của ${review.customer ?? "khách hàng"} khỏi trang công khai.`, "success");
      list.reload();
    } catch (error) {
      notify(errorMessage(error, "Không cập nhật được trạng thái hiển thị của đánh giá."), "error");
    } finally {
      setBusyId(null);
    }
  };
  const sendReply = async () => {
    if (!replying || !reply.trim()) return;
    setSending(true);
    try {
      await adminApi.replyReview(replying.id, reply.trim());
      notify(`${replying.reply ? "Đã cập nhật phản hồi" : "Đã gửi phản hồi"} cho đánh giá của ${replying.customer ?? "khách hàng"}.`, "success");
      setReplying(null);
      list.reload();
    } catch (error) {
      notify(errorMessage(error, "Không gửi được phản hồi."), "error");
    } finally {
      setSending(false);
    }
  };

  return <AdminPage title="Đánh giá ga-ra" description="Khách chấm điểm CarService sau mỗi lần bảo dưỡng, sửa chữa xe" demo={false}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="star" tone="warning" label="Điểm đánh giá trung bình" value={summary?.visible ? `${num(summary.average)} / 5` : "—"}/>
      <StatCard icon="check" tone="success" label="Khách hài lòng" value={pct(summary?.positive_rate)}/>
      <StatCard icon="alert" tone="danger" label="Đánh giá thấp chưa phản hồi" value={summary ? num(summary.low_unreplied) : "—"}/>
      <StatCard icon="reply" tone="info" label="Tỷ lệ đã phản hồi" value={pct(summary?.reply_rate)}/>
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel title="Phân bố số sao" icon="star" className="xl:sticky xl:top-[84px]">
        {!summary ? <LoadingState compact/> : <>
          <div className="flex items-end gap-3">
            <span className="text-[2.6rem] font-bold leading-none tabular-nums text-cs-text">{summary.visible ? num(summary.average) : "—"}</span>
            <span className="pb-1"><Stars value={summary.average}/><span className="block text-caption text-cs-muted">{num(summary.visible)} lượt đánh giá</span></span>
          </div>
          {summary.recent_average !== null && <p className="mt-2 text-caption text-cs-text-2">30 ngày gần đây: <b className="tabular-nums text-cs-text">{num(summary.recent_average)}★</b></p>}
          <ul className="mt-4 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map(star => {
              const n = summary.distribution[String(star)] ?? 0;
              const active = rating === String(star);
              return <li key={star}>
                <button type="button" aria-pressed={active} onClick={() => changeRating(active ? "all" : String(star) as RatingFilter)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-control border px-2 py-1.5 text-small transition-colors ${active ? "border-cs-accent/50 bg-cs-soft" : "border-transparent hover:border-cs-border hover:bg-cs-hover"}`}>
                  <span className="flex w-8 items-center gap-0.5 text-cs-text-2">{star}<Icon name="star" size={12} className="text-warning"/></span>
                  <Progress value={(n / Math.max(1, summary.visible)) * 100} tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"} label={`${star} sao`}/>
                  <span className="w-8 text-right tabular-nums text-cs-muted">{n}</span>
                </button>
              </li>;
            })}
          </ul>
          <p className={`mt-4 rounded-control p-3 text-caption ${summary.low_unreplied ? "bg-warning-soft text-warning-fg" : "bg-cs-surface-2 text-cs-text-2"}`}>
            {summary.low_unreplied
              ? `Có ${summary.low_unreplied} đánh giá từ 3★ trở xuống chưa được phản hồi. Nên liên hệ khách và trả lời trong 24 giờ.`
              : summary.unreplied ? `Mọi đánh giá thấp đã được phản hồi. Còn ${summary.unreplied} đánh giá tốt chưa trả lời.` : "Mọi đánh giá đều đã được phản hồi."}
          </p>
        </>}
      </Panel>

      <div className="min-w-0">
        <div className="mb-4">
          <Tabs label="Trạng thái phản hồi" value={status} onChange={changeStatus} items={[
            { id: "all", label: "Tất cả" },
            { id: "unreplied", label: "Chưa phản hồi", count: summary?.unreplied, tone: "warning" },
            { id: "replied", label: "Đã phản hồi" },
            { id: "hidden", label: "Đã ẩn", count: summary?.hidden },
          ]}/>
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo khách, nội dung, mã phiếu…"/>
          <FilterSelect label="Số sao" value={rating} onChange={changeRating} options={[
            { value: "all", label: "Tất cả" }, { value: "5", label: "5 sao" }, { value: "4", label: "4 sao" }, { value: "3", label: "3 sao" },
            { value: "2", label: "2 sao" }, { value: "1", label: "1 sao" },
          ]}/>
          <ClearFilters active={search !== "" || rating !== "all" || status !== "all"}
            onClear={() => { setSearch(""); setRating("all"); setStatus("all"); setPage(1); }}/>
        </Toolbar>
        {!result
          ? (list.error ? <ErrorState description={list.error} onRetry={list.reload}/> : <LoadingState/>)
          : !rows.length
            ? <div className="rounded-card border border-cs-border bg-cs-surface"><EmptyState icon="star" title="Không có đánh giá phù hợp" description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm."/></div>
            : <ul className={`flex flex-col gap-3 ${list.loading ? "opacity-70" : ""}`} aria-busy={list.loading || undefined}>
              {rows.map(r => <ReviewCard key={r.id} review={r} busy={busyId === r.id} disabled={busyId !== null}
                onToggle={() => void toggleHidden(r)} onReply={() => { setReplying(r); setReply(r.reply ?? ""); }}/>)}
            </ul>}
        {result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}
      </div>
    </div>

    <Modal open={!!replying} onClose={() => setReplying(null)} dismissible={!sending} title={replying?.reply ? "Sửa phản hồi" : "Phản hồi đánh giá"}
      description={replying ? `${replying.customer ?? "Khách hàng"} · ${replying.rating}★ · ${replying.order_code ?? ""}` : undefined}
      footer={<><Button disabled={sending} onClick={() => setReplying(null)}>Huỷ</Button><Button variant="primary" icon="send" loading={sending} loadingText="Đang gửi..." onClick={() => void sendReply()} disabled={!reply.trim()}>Gửi phản hồi</Button></>}>
      {replying && <div className="mb-4 rounded-control bg-cs-surface-2 p-3 text-small">
        <Stars value={replying.rating} size={14}/>
        <p className="mt-1.5 italic text-cs-text-2">{replying.comment ? `“${replying.comment}”` : "Khách không để lại nhận xét."}</p>
      </div>}
      <Field label="Nội dung phản hồi" hint="Hiển thị dưới đánh giá của khách."><Textarea rows={4} maxLength={2000} value={reply} onChange={e => setReply(e.target.value)}/></Field>
    </Modal>
  </AdminPage>;
}

function ReviewCard({ review: r, busy, disabled, onToggle, onReply }: { review: AdminReview; busy: boolean; disabled: boolean; onToggle: () => void; onReply: () => void }) {
  const mood = sentiment[r.rating] ?? sentiment[3];
  const needsReply = !r.hidden && r.rating <= 3 && !r.reply;

  return <li className={`overflow-hidden rounded-card border bg-cs-surface shadow-card ${needsReply ? "border-danger/40" : "border-cs-border"} ${r.hidden ? "opacity-70" : ""}`}>
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Stars value={r.rating} size={18}/>
          <Pill tone={mood.tone}>{mood.label}</Pill>
          {r.hidden && <Pill tone="neutral" icon="eye-off">Đã ẩn</Pill>}
          {needsReply && <Pill tone="danger" icon="alert">Cần phản hồi</Pill>}
        </div>
        <span className="text-caption text-cs-muted">Đánh giá ngày {fmtDate(r.date)}</span>
      </div>

      <p className="mt-3 text-body text-cs-text">{r.comment ? `“${r.comment}”` : <span className="text-cs-muted">Khách chỉ chấm sao, không để lại nhận xét.</span>}</p>

      <div className="mt-4 grid gap-3 rounded-control bg-cs-surface-2 p-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Person name={r.customer ?? "Khách hàng"} sub={r.phone ?? undefined} size={32}/>
        <div className="min-w-0 text-small">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-cs-text-2">
            <Icon name="car" size={15} className="text-cs-muted"/>
            <span className="font-medium text-cs-text">{r.vehicle || "—"}</span>
            {r.plate && <span className="rounded border border-cs-border bg-cs-surface px-1.5 font-mono text-caption">{r.plate}</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-cs-muted">
            <Icon name="wrench" size={13}/>Lần làm dịch vụ {fmtDate(r.visit_date)}{r.order_code && <> · Phiếu <span className="font-mono">{r.order_code}</span></>}
          </p>
        </div>
        {r.services.length > 0 && <div className="flex flex-wrap gap-1.5 sm:col-span-2">
          {r.services.slice(0, 6).map(s => <span key={s} className="rounded-full border border-cs-border bg-cs-surface px-2.5 py-0.5 text-caption text-cs-text-2">{s}</span>)}
          {r.services.length > 6 && <span className="px-1 text-caption text-cs-muted">+{r.services.length - 6} dịch vụ</span>}
        </div>}
      </div>

      {r.reply && <div className="mt-3 border-l-2 border-cs-accent bg-cs-soft/50 px-3.5 py-2.5 text-small">
        <p className="mb-0.5 font-semibold text-cs-text">CarService phản hồi{r.replied_at && <span className="ml-2 font-normal text-cs-muted">{fmtDate(r.replied_at)}</span>}</p>
        <p className="text-cs-text-2">{r.reply}</p>
      </div>}
    </div>
    <div className="flex flex-wrap justify-end gap-2 border-t border-cs-border px-5 py-3">
      <Button size="sm" variant="ghost" icon={r.hidden ? "eye" : "eye-off"} loading={busy} disabled={disabled} onClick={onToggle}>{r.hidden ? "Hiện lại" : "Ẩn khỏi trang công khai"}</Button>
      {!r.hidden && <Button size="sm" variant={r.reply ? "outline" : "primary"} icon="reply" onClick={onReply}>{r.reply ? "Sửa phản hồi" : "Phản hồi khách"}</Button>}
    </div>
  </li>;
}
