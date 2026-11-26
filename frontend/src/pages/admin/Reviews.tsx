import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput, StarIcon } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, type AdminReview } from "../../services/adminApi";
import { AdminPage, ClearFilters, FilterSelect, Panel, Progress, StatCard, Stars, Tabs, Toolbar } from "./kit/AdminKit";
import { num } from "./kit/format";
import { PeriodFilter } from "./kit/PeriodFilter";
import { usePeriod } from "./kit/period";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { ReplyHistoryModal } from "./reviews/ReplyHistoryModal";
import { ReviewDetail, ReviewGrid, ReviewList, ReviewViewToggle, type ReviewActions } from "./reviews/ReviewViews";
import { useReviewReply } from "./reviews/useReviewReply";
import { useReviewView } from "./reviews/useReviewView";

type StatusFilter = "all" | "unreplied" | "replied" | "hidden";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

const VIEW_KEY = "carservice-admin-reviews-view";
/** 12 chia hết cho 2 và 3 cột, Grid luôn kín hàng. */
const PER_PAGE = 12;
const pct = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${num(value)}%`;

/**
 * Đánh giá ga-ra: Grid để xem và phản hồi nhanh, List để đọc đủ và quản lý chi tiết.
 * Hai chế độ dùng chung dữ liệu từ /api/admin/reviews, đổi chế độ không gọi lại API.
 */
export default function Reviews() {
  const { notify } = useAppFeedback();
  const [view, changeView] = useReviewView(VIEW_KEY);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminReview | null>(null);
  const [historyOf, setHistoryOf] = useState<AdminReview | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const term = useDebounced(search.trim());

  const period = usePeriod("all", () => setPage(1));
  const params = { status, rating, search: term, page, per_page: PER_PAGE, ...period.params };
  const list = useAdminQuery(`reviews:${JSON.stringify(params)}`, signal => adminApi.reviews(params, signal));
  const result = list.data ?? list.stale;
  const summary = result?.summary;
  const rows = result?.data ?? [];

  const changeStatus = (value: StatusFilter) => { setStatus(value); setPage(1); };
  const changeRating = (value: RatingFilter) => { setRating(value); setPage(1); };

  const toggleHidden = async (review: AdminReview) => {
    if (busyId !== null) return;
    setBusyId(review.id);
    try {
      const response = await adminApi.hideReview(review.id, !review.hidden);
      notify(review.hidden
        ? `Đã hiện lại đánh giá ${review.rating} sao của ${review.customer ?? "khách hàng"}.`
        : `Đã ẩn đánh giá ${review.rating} sao của ${review.customer ?? "khách hàng"} khỏi trang công khai.`, "success");
      setViewing(current => current?.id === review.id ? response.data : current);
      list.reload();
    } catch (error) {
      notify(errorMessage(error, "Không cập nhật được trạng thái hiển thị của đánh giá."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const reply = useReviewReply({
    create: adminApi.replyReview,
    update: adminApi.editReviewReply,
    firstReplyTitle: "Phản hồi",
    confirmFirstReply: true,
    onSaved: saved => { setViewing(current => current?.id === saved.id ? saved : current); list.reload(); },
    onFailed: list.reload,
  });

  const actions: ReviewActions = { disabled: busyId !== null || list.loading, busyId, onReply: reply.open, onToggle: review => void toggleHidden(review), onHistory: setHistoryOf };

  return <AdminPage title="Đánh giá của khách hàng" description="Khách chấm điểm CarService sau mỗi lần bảo dưỡng, sửa chữa xe" demo={false}>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="star" tone="warning" label="Điểm đánh giá trung bình" value={summary?.visible ? `${num(summary.average)} / 5` : "—"}/>
      <StatCard icon="check" tone="success" label="Khách hài lòng" value={pct(summary?.positive_rate)}/>
      <StatCard icon="alert" tone="danger" label="Đánh giá thấp chưa phản hồi" value={summary ? num(summary.low_unreplied) : "—"}/>
      <StatCard icon="reply" tone="info" label="Tỷ lệ đã phản hồi" value={pct(summary?.reply_rate)}/>
    </div>

    <Panel title="Mức độ hài lòng" icon="star" className="mb-5">
      {!summary ? <LoadingState compact/> : <div className="grid items-center gap-5 lg:grid-cols-[190px_minmax(0,1fr)_minmax(220px,300px)]">
        <div>
          <div className="flex items-end gap-3">
            <span className="text-[2.4rem] font-bold leading-none tabular-nums text-cs-text">{summary.visible ? num(summary.average) : "—"}</span>
            <Stars value={summary.average} size={15}/>
          </div>
          <p className="mt-1.5 text-caption text-cs-muted">{num(summary.visible)} lượt đánh giá</p>
          {summary.recent_average !== null && <p className="mt-0.5 text-caption text-cs-text-2">30 ngày gần đây: <b className="tabular-nums text-cs-text">{num(summary.recent_average)}</b> <StarIcon size={12} className="inline align-[-1px]"/></p>}
        </div>
        <ul className="grid gap-0.5">
          {[5, 4, 3, 2, 1].map(star => {
            const n = summary.distribution[String(star)] ?? 0;
            const active = rating === String(star);
            return <li key={star}>
              <button type="button" aria-pressed={active} onClick={() => changeRating(active ? "all" : String(star) as RatingFilter)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-control border px-2 py-1 text-small transition-colors ${active ? "border-cs-accent/50 bg-cs-soft" : "border-transparent hover:border-cs-border hover:bg-cs-hover"}`}>
                <span className="flex w-8 shrink-0 items-center gap-0.5 text-cs-text-2">{star}<StarIcon size={12}/></span>
                <Progress value={(n / Math.max(1, summary.visible)) * 100} tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"} label={`${star} sao`}/>
                <span className="w-10 shrink-0 text-right tabular-nums text-cs-muted">{num(n)}</span>
              </button>
            </li>;
          })}
        </ul>
        <p className={`rounded-control p-3 text-caption ${summary.low_unreplied ? "bg-warning-soft text-warning-fg" : "bg-cs-surface-2 text-cs-text-2"}`}>
          {summary.low_unreplied
            ? `Có ${summary.low_unreplied} đánh giá từ 3 sao trở xuống chưa được phản hồi. Nên liên hệ khách và trả lời trong 24 giờ.`
            : summary.unreplied ? `Mọi đánh giá thấp đã được phản hồi. Còn ${summary.unreplied} đánh giá tốt chưa trả lời.` : "Mọi đánh giá đều đã được phản hồi."}
        </p>
      </div>}
    </Panel>

    <div className="mb-4">
      <Tabs label="Trạng thái phản hồi" value={status} onChange={changeStatus} items={[
        { id: "all", label: "Tất cả", count: summary?.visible },
        { id: "unreplied", label: "Chưa phản hồi", count: summary?.unreplied, tone: "warning" },
        { id: "replied", label: "Đã phản hồi", count: summary ? summary.visible - summary.unreplied : undefined },
        { id: "hidden", label: "Đã ẩn", count: summary?.hidden },
      ]}/>
    </div>
    <Toolbar>
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo khách, xe, biển số, nội dung, mã phiếu…"/>
      <PeriodFilter period={period}/>
      <FilterSelect label="Số sao" value={rating} onChange={changeRating} options={[
        { value: "all", label: "Tất cả" }, { value: "5", label: "5 sao" }, { value: "4", label: "4 sao" }, { value: "3", label: "3 sao" },
        { value: "2", label: "2 sao" }, { value: "1", label: "1 sao" },
      ]}/>
      <ClearFilters active={search !== "" || rating !== "all" || status !== "all" || !period.isDefault}
        onClear={() => { setSearch(""); setRating("all"); setStatus("all"); period.reset(); setPage(1); }}/>
      <ReviewViewToggle view={view} onChange={changeView}/>
    </Toolbar>

    {list.error
      ? <div className="rounded-card border border-cs-border bg-cs-surface"><ErrorState description={list.error} onRetry={list.reload}/></div>
      : !result
      ? <LoadingState/>
      : !rows.length
        ? <div className="rounded-card border border-cs-border bg-cs-surface"><EmptyState icon="star" title="Không có đánh giá phù hợp" description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm."/></div>
        : <div aria-busy={list.loading || undefined}>
          {view === "grid" ? <ReviewGrid rows={rows} actions={actions} onOpen={setViewing}/> : <ReviewList rows={rows} actions={actions}/>}
        </div>}
    {result && !list.error && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}

    <ReviewDetail review={viewing} actions={actions} onClose={() => setViewing(null)}/>

    {reply.modal}

    {historyOf && <ReplyHistoryModal key={historyOf.id} review={historyOf} onClose={() => setHistoryOf(null)}/>}
  </AdminPage>;
}
