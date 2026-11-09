import { useState } from "react";
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, Pagination, SearchInput, Textarea } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, fmtDate, type AdminReview } from "../../services/adminApi";
import { AdminPage, FilterSelect, Panel, Person, Pill, Progress, Stars, Toolbar } from "./kit/AdminKit";
import { num } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";

type RatingFilter = "all" | "5" | "4" | "low" | "hidden";

/** Đánh giá của khách — dữ liệu thật từ /api/admin/reviews (trả lời, ẩn / hiện). */
export default function Reviews() {
  const { notify } = useAppFeedback();
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const term = useDebounced(search.trim());

  const params = { rating, search: term, page };
  const list = useAdminQuery(`reviews:${JSON.stringify(params)}`, signal => adminApi.reviews(params, signal));
  const result = list.data ?? list.stale;
  const summary = result?.summary;
  const rows = result?.data ?? [];

  const toggleHidden = async (review: AdminReview) => {
    setBusyId(review.id);
    try {
      const response = await adminApi.hideReview(review.id, !review.hidden);
      notify(response.message, "success");
      list.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  };
  const sendReply = async () => {
    if (!replying || !reply.trim()) return;
    setSending(true);
    try {
      const response = await adminApi.replyReview(replying.id, reply.trim());
      notify(response.message, "success");
      setReplying(null);
      list.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setSending(false);
    }
  };

  return <AdminPage title="Đánh giá" description="Phản hồi của khách sau mỗi lần sửa chữa" demo={false}>
    <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Tổng quan đánh giá" icon="star" className="xl:sticky xl:top-[84px]">
        {!summary ? <LoadingState compact/> : <>
          <div className="flex items-end gap-3">
            <span className="text-[2.6rem] font-bold leading-none text-cs-text tabular-nums">{summary.visible ? num(summary.average) : "—"}</span>
            <span className="pb-1"><Stars value={summary.average}/><span className="block text-caption text-cs-muted">{num(summary.visible)} đánh giá hiển thị · {num(summary.hidden)} đã ẩn</span></span>
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-small">
            {[5, 4, 3, 2, 1].map(star => {
              const n = summary.distribution[String(star)] ?? 0;
              return <li key={star} className="flex items-center gap-2.5">
                <span className="flex w-8 items-center gap-0.5 text-cs-text-2">{star}<Icon name="star" size={12} className="text-warning"/></span>
                <Progress value={(n / Math.max(1, summary.visible)) * 100} tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"} label={`${star} sao`}/>
                <span className="w-8 text-right tabular-nums text-cs-muted">{n}</span>
              </li>;
            })}
          </ul>
          <p className="mt-4 rounded-control bg-cs-surface-2 p-3 text-caption text-cs-text-2">
            {summary.low_unreplied
              ? `${summary.low_unreplied} đánh giá thấp chưa được phản hồi. Nên trả lời trong vòng 24 giờ.`
              : `Mọi đánh giá thấp đã được phản hồi. Còn ${summary.unreplied} đánh giá chưa trả lời.`}
          </p>
        </>}
      </Panel>

      <div className="min-w-0">
        <Toolbar>
          <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo khách, nội dung, mã phiếu…"/>
          <FilterSelect label="Lọc" value={rating} onChange={value => { setRating(value); setPage(1); }} options={[
            { value: "all", label: "Tất cả" }, { value: "5", label: "5 sao" }, { value: "4", label: "4 sao" },
            { value: "low", label: "Từ 3 sao trở xuống" }, { value: "hidden", label: "Đã ẩn" },
          ]}/>
        </Toolbar>
        {!result
          ? (list.error ? <ErrorState description={list.error} onRetry={list.reload}/> : <LoadingState/>)
          : !rows.length
            ? <div className="rounded-card border border-cs-border bg-cs-surface"><EmptyState icon="star" title="Không có đánh giá phù hợp"/></div>
            : <ul className={`flex flex-col gap-3 ${list.loading ? "opacity-70" : ""}`} aria-busy={list.loading || undefined}>
              {rows.map(r => <li key={r.id} className={`rounded-card border border-cs-border bg-cs-surface p-5 shadow-card ${r.hidden ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Person name={r.customer ?? "Khách hàng"} sub={`${r.vehicle || "—"} · ${r.order_code ?? "—"}`}/>
                  <div className="flex items-center gap-2">
                    {r.hidden && <Pill tone="neutral" icon="eye-off">Đã ẩn</Pill>}
                    {!r.hidden && r.rating <= 3 && !r.reply && <Pill tone="danger">Cần phản hồi</Pill>}
                    <span className="text-caption text-cs-muted">{fmtDate(r.date)}</span>
                  </div>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2"><Stars value={r.rating}/><b className="text-small">{r.rating.toFixed(1)}</b>
                  {r.technician && <span className="text-caption text-cs-muted">· KTV {r.technician}</span>}</p>
                <p className="mt-2 text-body text-cs-text">{r.comment || <span className="text-cs-muted">Khách không để lại nhận xét.</span>}</p>
                {r.reply && <div className="mt-3 border-l-2 border-cs-accent bg-cs-surface-2 px-3.5 py-2.5 text-small">
                  <p className="mb-0.5 font-semibold text-cs-text">CarService phản hồi{r.replied_at && <span className="ml-2 font-normal text-cs-muted">{fmtDate(r.replied_at)}</span>}</p><p className="text-cs-text-2">{r.reply}</p>
                </div>}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="ghost" icon={r.hidden ? "eye" : "eye-off"} loading={busyId === r.id} disabled={busyId !== null} onClick={() => void toggleHidden(r)}>{r.hidden ? "Hiện lại" : "Ẩn"}</Button>
                  {!r.hidden && <Button size="sm" variant={r.reply ? "outline" : "tonal"} icon="reply" onClick={() => { setReplying(r); setReply(r.reply ?? ""); }}>{r.reply ? "Sửa phản hồi" : "Phản hồi"}</Button>}
                </div>
              </li>)}
            </ul>}
        {result && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}
      </div>
    </div>

    <Modal open={!!replying} onClose={() => setReplying(null)} dismissible={!sending} title="Phản hồi đánh giá" description={replying ? `${replying.customer ?? "Khách hàng"} · ${replying.rating} sao` : undefined}
      footer={<><Button disabled={sending} onClick={() => setReplying(null)}>Huỷ</Button><Button variant="primary" icon="send" loading={sending} loadingText="Đang gửi..." onClick={() => void sendReply()} disabled={!reply.trim()}>Gửi phản hồi</Button></>}>
      {replying && <p className="mb-4 rounded-control bg-cs-surface-2 p-3 text-small italic text-cs-text-2">“{replying.comment}”</p>}
      <Field label="Nội dung phản hồi" hint="Hiển thị dưới đánh giá của khách."><Textarea rows={4} maxLength={2000} value={reply} onChange={e => setReply(e.target.value)}/></Field>
    </Modal>
  </AdminPage>;
}
