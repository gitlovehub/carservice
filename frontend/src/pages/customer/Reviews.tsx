import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const reviews = [
  {
    id: "RV-001",
    car: "Toyota Vios · 30A-123.45",
    service: "Bảo dưỡng định kỳ",
    date: "12/10/2026",
    rating: 5,
    content: "Nhân viên tư vấn nhiệt tình, thời gian xử lý nhanh.",
  },
  {
    id: "RV-002",
    car: "Honda City · 30F-678.90",
    service: "Thay dầu động cơ",
    date: "20/09/2026",
    rating: 4,
    content: "Dịch vụ tốt, nhân viên hỗ trợ khá nhanh.",
  },
];

function Reviews() {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!rating || !content.trim()) {
      alert("Vui lòng chọn số sao và nhập nội dung đánh giá.");
      return;
    }

    alert("Gửi đánh giá thành công!");
    setRating(0);
    setContent("");
  };

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / ĐÁNH GIÁ
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Đánh giá dịch vụ
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Chia sẻ trải nghiệm của bạn sau khi sử dụng dịch vụ tại CarService.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              REVIEW FORM
            </p>

            <h2 className="mt-1 text-base font-bold">
              Gửi đánh giá
            </h2>

            <p className="mt-2 text-[10px] leading-5 text-[#7b858f]">
              Đánh giá của bạn giúp CarService cải thiện chất lượng dịch vụ.
            </p>

            <div className="mt-6">
              <label className="mb-3 block text-xs font-semibold">
                Mức độ hài lòng
              </label>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRating(item)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm transition ${
                      item <= rating
                        ? "bg-[#20252b] text-white"
                        : "border border-[#dfe3e6] bg-white text-[#8a949e] hover:bg-[#f5f6f7]"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <p className="mt-2 text-[10px] text-[#8a949e]">
                {rating > 0
                  ? `${rating}/5 sao`
                  : "Chưa chọn mức đánh giá"}
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold">
                Nội dung đánh giá
              </label>

              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập cảm nhận của bạn..."
                className="w-full resize-none rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="mt-5 w-full rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
            >
              Gửi đánh giá
            </button>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  REVIEW HISTORY
                </p>

                <h2 className="mt-1 text-base font-bold">
                  Đánh giá của tôi
                </h2>
              </div>

              <div className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
                {reviews.length} đánh giá
              </div>
            </div>

            <div className="space-y-4 p-5">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                        RV
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">
                            {review.id}
                          </p>

                          <span className="rounded-full bg-[#eef7f0] px-3 py-1.5 text-[10px] font-medium text-[#39734a]">
                            Đã gửi
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-semibold">
                          {review.service}
                        </p>

                        <p className="mt-1 text-[10px] text-[#7b858f]">
                          {review.car}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm tracking-[0.15em]">
                        {"★".repeat(review.rating)}
                        <span className="text-[#dfe3e6]">
                          {"★".repeat(5 - review.rating)}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {review.date}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-[10px] leading-5 text-[#6f7881]">
                      “{review.content}”
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
              i
            </div>

            <div>
              <p className="text-xs font-semibold">
                Góp ý của bạn rất quan trọng
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Hãy đánh giá trung thực để CarService có thể nâng cao
                chất lượng phục vụ và trải nghiệm khách hàng.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Reviews;