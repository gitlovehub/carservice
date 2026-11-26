import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { advisorReviewApi } from "../../services/advisorReviewApi";
import type { AdminReview } from "../../services/adminApi";
import { ClearFilters, FilterSelect, Toolbar } from "../admin/kit/AdminKit";
import { num } from "../admin/kit/format";
import { PeriodFilter } from "../admin/kit/PeriodFilter";
import { usePeriod } from "../admin/kit/period";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { ReviewDetail, ReviewGrid, ReviewList, ReviewViewToggle, type ReviewActions } from "../admin/reviews/ReviewViews";
import { useReviewView } from "../admin/reviews/useReviewView";
import { useReviewReply } from "../admin/reviews/useReviewReply";
import "./advisorDashboard.css";

type StatusFilter = "all" | "unreplied" | "replied";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

const VIEW_KEY = "carservice-advisor-reviews-view";
/** 12 chia hết cho 2 và 3 cột, Grid luôn kín hàng. */
const PER_PAGE = 12;

/**
 * Phản hồi khách hàng của Cố vấn: chỉ đánh giá thuộc phiếu mình phụ trách.
 * Dùng chung giao diện và logic phản hồi với Admin; quyền thao tác do Backend quyết định.
 */
export default function AdvisorReviews() {
  const [view, changeView] = useReviewView(VIEW_KEY);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminReview | null>(null);
  const term = useDebounced(search.trim());

  const period = usePeriod("all", () => setPage(1));
  const params = { status, rating, search: term, page, per_page: PER_PAGE, ...period.params };
  const list = useAdminQuery(`advisor-reviews:${JSON.stringify(params)}`, signal => advisorReviewApi.list(params, signal));
  const result = list.data ?? list.stale;
  const summary = result?.summary;
  const rows = result?.data ?? [];

  const reply = useReviewReply({
    create: advisorReviewApi.reply,
    update: advisorReviewApi.editReply,
    firstReplyTitle: "Phản hồi nhanh",
    onSaved: saved => { setViewing(current => current?.id === saved.id ? saved : current); list.reload(); },
    onFailed: list.reload,
  });
  const actions: ReviewActions = {
    disabled: list.loading, busyId: null, onReply: reply.open, firstReplyLabel: "Phản hồi nhanh", compactGrid: true,
    canReply: review => !review.reply || !!review.can_edit_reply,
  };

  const changeStatus = (value: StatusFilter) => { setStatus(value); setPage(1); };
  const stats: Array<{ id: StatusFilter; label: string; value?: number; icon: IconName; tone?: "success" | "warning" }> = [
    { id: "all", label: "Tổng đánh giá liên quan", value: summary?.total, icon: "star" },
    { id: "unreplied", label: "Chưa phản hồi", value: summary?.unreplied, icon: "clock", tone: "warning" },
    { id: "replied", label: "Đã phản hồi", value: summary?.replied, icon: "check", tone: "success" },
  ];
  const statValue = (value?: number) => value === undefined ? "–" : num(value);

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Phản hồi khách hàng</h1>
    <section className="adv-ro-stats adv-ro-stats-4" aria-label="Thống kê đánh giá">
      <StatButton stat={stats[0]} value={statValue(stats[0].value)} active={status === "all"} onClick={() => changeStatus("all")}/>
      <div className="adv-card adv-ro-stat pointer-events-none">
        <span className="adv-ro-stat-icon" data-tone="warning" aria-hidden="true"><Icon name="trend-up" size={26}/></span>
        <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">Điểm trung bình</span>
          <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{summary?.average != null ? `${num(summary.average)} / 5` : "–"}</span></span>
      </div>
      {stats.slice(1).map(stat => <StatButton key={stat.id} stat={stat} value={statValue(stat.value)} active={status === stat.id} onClick={() => changeStatus(status === stat.id ? "all" : stat.id)}/>)}
    </section>

    <section className="adv-card p-4" aria-label="Danh sách đánh giá">
      <Toolbar>
        <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Tìm theo khách, xe, biển số, nội dung, mã phiếu…"/>
        <PeriodFilter period={period}/>
        <FilterSelect label="Số sao" value={rating} onChange={value => { setRating(value); setPage(1); }} options={[
          { value: "all", label: "Tất cả" }, { value: "5", label: "5 sao" }, { value: "4", label: "4 sao" }, { value: "3", label: "3 sao" }, { value: "2", label: "2 sao" }, { value: "1", label: "1 sao" },
        ]}/>
        <FilterSelect label="Trạng thái" value={status} onChange={changeStatus} options={[
          { value: "all", label: "Tất cả" }, { value: "unreplied", label: "Chưa phản hồi" }, { value: "replied", label: "Đã phản hồi" },
        ]}/>
        <ClearFilters active={search !== "" || rating !== "all" || status !== "all" || !period.isDefault}
          onClear={() => { setSearch(""); setRating("all"); setStatus("all"); period.reset(); setPage(1); }}/>
        <ReviewViewToggle view={view} onChange={changeView}/>
      </Toolbar>

      {list.error
        ? <ErrorState description={list.error} onRetry={list.reload}/>
        : !result
          ? <LoadingState label="Đang tải đánh giá..."/>
          : !rows.length
            ? <EmptyState icon="star" title={summary?.total ? "Không có đánh giá phù hợp" : "Chưa có đánh giá liên quan"}
              description={summary?.total ? "Thử đổi bộ lọc hoặc từ khoá tìm kiếm." : "Đánh giá của khách trên các phiếu bạn phụ trách sẽ hiển thị tại đây."}/>
            : <div aria-busy={list.loading || undefined}>
              {view === "grid" ? <ReviewGrid rows={rows} actions={actions} onOpen={setViewing}/> : <ReviewList rows={rows} actions={actions}/>}
            </div>}
      {result && !list.error && <Pagination page={result.meta.current_page} totalPages={result.meta.last_page} totalItems={result.meta.total} pageSize={result.meta.per_page} disabled={list.loading} onChange={setPage}/>}
    </section>

    <ReviewDetail review={viewing} actions={actions} onClose={() => setViewing(null)}/>
    {reply.modal}
  </main>;
}

function StatButton({ stat, value, active, onClick }: { stat: { label: string; icon: IconName; tone?: "success" | "warning" }; value: string; active: boolean; onClick: () => void }) {
  return <button type="button" className="adv-card adv-ro-stat" aria-pressed={active} onClick={onClick}>
    <span className="adv-ro-stat-icon" data-tone={stat.tone} aria-hidden="true"><Icon name={stat.icon} size={26}/></span>
    <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{stat.label}</span>
      <span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{value}</span></span>
  </button>;
}
