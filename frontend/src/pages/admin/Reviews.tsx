import { useMemo, useState } from "react";
import { Button, Field, Modal, SearchInput, Textarea } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { demoReviews, type DemoReview } from "../../mocks/admin/operations";
import { AdminPage, FilterSelect, Panel, Person, Pill, Progress, Stars, Toolbar } from "./kit/AdminKit";

type RatingFilter = "all" | "5" | "4" | "low" | "hidden";

/** Đánh giá của khách — DEMO: dữ liệu từ src/mocks/admin/operations.ts (bảng reviews). */
export default function Reviews() {
  const { notify } = useAppFeedback();
  const [reviews, setReviews] = useState(demoReviews);
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [replying, setReplying] = useState<DemoReview | null>(null);
  const [reply, setReply] = useState("");

  const visible = reviews.filter(r => !r.hidden);
  const avg = visible.reduce((s, r) => s + r.rating, 0) / Math.max(1, visible.length);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter(r => (!q || [r.customer, r.comment, r.orderCode, r.technician].some(v => v.toLowerCase().includes(q)))
      && (rating === "all" ? !r.hidden : rating === "hidden" ? r.hidden : rating === "low" ? !r.hidden && r.rating <= 3 : !r.hidden && r.rating === Number(rating)));
  }, [reviews, query, rating]);

  const toggleHidden = (review: DemoReview) => {
    setReviews(list => list.map(r => r.id === review.id ? { ...r, hidden: !r.hidden } : r));
    notify(review.hidden ? "Đã hiện lại đánh giá (demo)." : "Đã ẩn đánh giá khỏi trang công khai (demo).", "success");
  };
  const sendReply = () => {
    if (!replying) return;
    setReviews(list => list.map(r => r.id === replying.id ? { ...r, reply: reply.trim() } : r));
    setReplying(null);
    notify("Đã gửi phản hồi (demo).", "success");
  };

  return <AdminPage title="Đánh giá" description="Phản hồi của khách sau mỗi lần sửa chữa">
    <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Tổng quan đánh giá" icon="star" className="xl:sticky xl:top-[84px]">
        <div className="flex items-end gap-3">
          <span className="text-[2.6rem] font-bold leading-none text-cs-text tabular-nums">{avg.toFixed(1)}</span>
          <span className="pb-1"><Stars value={avg}/><span className="block text-caption text-cs-muted">{visible.length} đánh giá hiển thị</span></span>
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-small">
          {[5, 4, 3, 2, 1].map(star => {
            const n = visible.filter(r => r.rating === star).length;
            return <li key={star} className="flex items-center gap-2.5">
              <span className="flex w-8 items-center gap-0.5 text-cs-text-2">{star}<Icon name="star" size={12} className="text-warning"/></span>
              <Progress value={(n / Math.max(1, visible.length)) * 100} tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"} label={`${star} sao`}/>
              <span className="w-6 text-right tabular-nums text-cs-muted">{n}</span>
            </li>;
          })}
        </ul>
        <p className="mt-4 rounded-control bg-cs-surface-2 p-3 text-caption text-cs-text-2">
          {visible.filter(r => r.rating <= 3 && !r.reply).length} đánh giá thấp chưa được phản hồi. Nên trả lời trong vòng 24 giờ.
        </p>
      </Panel>

      <div className="min-w-0">
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo khách, nội dung, mã phiếu…"/>
          <FilterSelect label="Lọc" value={rating} onChange={setRating} options={[
            { value: "all", label: "Tất cả" }, { value: "5", label: "5 sao" }, { value: "4", label: "4 sao" },
            { value: "low", label: "Từ 3 sao trở xuống" }, { value: "hidden", label: "Đã ẩn" },
          ]}/>
        </Toolbar>
        {!rows.length && <p className="rounded-card border border-cs-border bg-cs-surface p-8 text-center text-small text-cs-muted">Không có đánh giá phù hợp.</p>}
        <ul className="flex flex-col gap-3">
          {rows.map(r => <li key={r.id} className={`rounded-card border border-cs-border bg-cs-surface p-5 shadow-card ${r.hidden ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Person name={r.customer} sub={`${r.vehicle} · ${r.orderCode}`}/>
              <div className="flex items-center gap-2">
                {r.hidden && <Pill tone="neutral" icon="eye-off">Đã ẩn</Pill>}
                {!r.hidden && r.rating <= 3 && !r.reply && <Pill tone="danger">Cần phản hồi</Pill>}
                <span className="text-caption text-cs-muted">{r.date}</span>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2"><Stars value={r.rating}/><b className="text-small">{r.rating.toFixed(1)}</b>
              {r.technician !== "—" && <span className="text-caption text-cs-muted">· KTV {r.technician}</span>}</p>
            <p className="mt-2 text-body text-cs-text">{r.comment}</p>
            {r.reply && <div className="mt-3 border-l-2 border-cs-accent bg-cs-surface-2 px-3.5 py-2.5 text-small">
              <p className="mb-0.5 font-semibold text-cs-text">CarService phản hồi</p><p className="text-cs-text-2">{r.reply}</p>
            </div>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" icon={r.hidden ? "eye" : "eye-off"} onClick={() => toggleHidden(r)}>{r.hidden ? "Hiện lại" : "Ẩn"}</Button>
              {!r.hidden && <Button size="sm" variant={r.reply ? "outline" : "tonal"} icon="reply" onClick={() => { setReplying(r); setReply(r.reply ?? ""); }}>{r.reply ? "Sửa phản hồi" : "Phản hồi"}</Button>}
            </div>
          </li>)}
        </ul>
      </div>
    </div>

    <Modal open={!!replying} onClose={() => setReplying(null)} title="Phản hồi đánh giá" description={replying ? `${replying.customer} · ${replying.rating} sao` : undefined}
      footer={<><Button onClick={() => setReplying(null)}>Huỷ</Button><Button variant="primary" icon="send" onClick={sendReply} disabled={!reply.trim()}>Gửi phản hồi</Button></>}>
      {replying && <p className="mb-4 rounded-control bg-cs-surface-2 p-3 text-small italic text-cs-text-2">“{replying.comment}”</p>}
      <Field label="Nội dung phản hồi" hint="Hiển thị công khai dưới đánh giá của khách."><Textarea rows={4} value={reply} onChange={e => setReply(e.target.value)}/></Field>
    </Modal>
  </AdminPage>;
}
