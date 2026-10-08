import { useState } from "react";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / ĐÁNH GIÁ
            </p>

            <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
              Đánh giá dịch vụ
            </h1>

            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
              Chia sẻ trải nghiệm của bạn sau khi sử dụng dịch vụ tại
              CarService.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                REVIEW FORM
              </p>

              <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                Gửi đánh giá
              </h2>

              <p className="mt-2 text-[11px] leading-5 text-[#66717C]">
                Đánh giá của bạn giúp CarService cải thiện chất lượng dịch vụ.
              </p>

              <div className="mt-6">
                <label className="mb-3 block text-[13px] font-semibold text-[#20252B]">
                  Mức độ hài lòng
                </label>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRating(item)}
                      className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-sm transition ${
                        item <= rating
                          ? "bg-[#D6A85F] text-[#3A3020]"
                          : "border border-[#DDE1E4] bg-white text-[#8A949E] hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-[11px] text-[#8A949E]">
                  {rating > 0
                    ? `${rating}/5 sao`
                    : "Chưa chọn mức đánh giá"}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                  Nội dung đánh giá
                </label>

                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập cảm nhận của bạn..."
                  className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-white px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="mt-5 w-full cursor-pointer rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md"
              >
                Gửi đánh giá
              </button>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    REVIEW HISTORY
                  </p>

                  <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                    Đánh giá của tôi
                  </h2>
                </div>

                <div className="rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#66717C]">
                  {reviews.length} đánh giá
                </div>
              </div>

              <div className="space-y-4 p-5">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF9] p-5 transition hover:border-[#D6A85F]"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[11px] font-bold text-white">
                          RV
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-bold text-[#20252B]">
                              {review.id}
                            </p>

                            <span className="rounded-full bg-[#EEF7F0] px-3 py-1.5 text-[11px] font-medium text-[#39734A]">
                              Đã gửi
                            </span>
                          </div>

                          <p className="mt-2 text-[13px] font-semibold text-[#20252B]">
                            {review.service}
                          </p>

                          <p className="mt-1 text-[11px] text-[#7B858F]">
                            {review.car}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-sm tracking-[0.15em]">
                          <span className="text-[#D6A85F]">
                            {"★".repeat(review.rating)}
                          </span>

                          <span className="text-[#DFE3E6]">
                            {"★".repeat(5 - review.rating)}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] text-[#8A949E]">
                          {review.date}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-[11px] leading-5 text-[#6F7881]">
                        “{review.content}”
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.03)]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Góp ý của bạn rất quan trọng
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[#7B858F]">
                  Hãy đánh giá trung thực để CarService có thể nâng cao chất
                  lượng phục vụ và trải nghiệm khách hàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Reviews;