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

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / ĐÁNH GIÁ
              </p>

              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                Đánh giá dịch vụ
              </h1>

              <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
                Chia sẻ trải nghiệm của bạn sau khi sử dụng dịch vụ tại
                CarService.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <section className="h-fit rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  REVIEW FORM
                </p>

                <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                  Gửi đánh giá
                </h2>

                <p className="mt-2 text-[11px] leading-5 text-[#66717C]">
                  Đánh giá của bạn giúp CarService cải thiện chất lượng dịch
                  vụ.
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
                        aria-label={`${item} sao`}
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-sm transition duration-200 hover:-translate-y-0.5 ${
                          item <= rating
                            ? "bg-[#D6A85F] text-[#3A3020] shadow-[0_6px_14px_rgba(214,168,95,0.18)]"
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
                    className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-white px-4 py-3 text-[13px] text-[#20252B] outline-none transition duration-200 placeholder:text-[#A0A8AF] hover:border-[#D6A85F] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#F3E8D2]"
                  />

                  <div className="mt-2 flex justify-end">
                    <span className="text-[10px] text-[#9AA2A9]">
                      {content.length} ký tự
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-3 w-full cursor-pointer rounded-xl bg-[#1F2933] px-5 py-3.5 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_22px_rgba(31,41,51,0.15)]"
                >
                  Gửi đánh giá
                </button>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
                <div className="flex flex-col justify-between gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      REVIEW HISTORY
                    </p>

                    <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                      Đánh giá của tôi
                    </h2>
                  </div>

                  <div className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-bold text-[#6F5527]">
                    {reviews.length} đánh giá
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="group rounded-2xl border border-[#E1E4E6] bg-[#FAFAF9] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:bg-white hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[11px] font-bold text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                            RV
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-bold text-[#20252B]">
                                {review.id}
                              </p>

                              <span className="rounded-full border border-[#CFE5D3] bg-[#EAF4EC] px-3 py-1.5 text-[10px] font-semibold text-[#3F6B47] transition duration-200 hover:-translate-y-0.5">
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
                          <div className="text-sm tracking-[0.15em] transition duration-200 group-hover:scale-105">
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

                      <div className="mt-4 rounded-xl bg-white p-4 transition duration-200 group-hover:bg-[#FDFDFB]">
                        <p className="text-[11px] leading-5 text-[#6F7881]">
                          “{review.content}”
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="group mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
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
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Reviews;