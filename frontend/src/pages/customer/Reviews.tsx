function Reviews() {
  const reviews = [
    {
      id: 1,
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      rating: 5,
      comment: "Dịch vụ tốt, nhân viên tư vấn nhiệt tình.",
    },
    {
      id: 2,
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      rating: 4,
      comment: "Thời gian xử lý nhanh, chất lượng ổn.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            KHÁCH HÀNG / ĐÁNH GIÁ
          </p>

          <h1 className="text-[28px] font-bold">
            Đánh giá dịch vụ
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Xem và gửi đánh giá về dịch vụ của CarService.
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-[#e1e4e7] bg-white p-6">
            <p className="text-[10px] uppercase text-[#8a949e]">
              Tổng đánh giá
            </p>

            <p className="mt-3 text-[28px] font-bold">
              2
            </p>

            <p className="mt-1 text-[11px] text-[#8a949e]">
              đánh giá đã gửi
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-6">
            <p className="text-[10px] uppercase text-[#8a949e]">
              Điểm trung bình
            </p>

            <p className="mt-3 text-[28px] font-bold">
              4.5 / 5
            </p>

            <p className="mt-1 text-[11px] text-[#8a949e]">
              dựa trên các đánh giá
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-6">
            <p className="text-[10px] uppercase text-[#8a949e]">
              Trạng thái
            </p>

            <p className="mt-3 text-[15px] font-bold">
              Có thể đánh giá
            </p>

            <p className="mt-1 text-[11px] text-[#8a949e]">
              Sau khi hoàn thành dịch vụ
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white">
          <div className="border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Gửi đánh giá mới
            </h2>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-semibold">
                Chọn xe
              </label>

              <select className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]">
                <option>Toyota Vios - 30A-123.45</option>
                <option>Honda City - 30F-678.90</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold">
                Số sao
              </label>

              <select className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]">
                <option>5 sao</option>
                <option>4 sao</option>
                <option>3 sao</option>
                <option>2 sao</option>
                <option>1 sao</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[11px] font-semibold">
                Nội dung đánh giá
              </label>

              <textarea
                rows={4}
                placeholder="Nhập đánh giá của bạn..."
                className="w-full resize-none rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
              >
                Gửi đánh giá
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#e1e4e7] bg-white">
          <div className="border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Đánh giá đã gửi
            </h2>
          </div>

          <div>
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-[#eef0f2] p-6 last:border-b-0"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <p className="text-[12px] font-bold">
                      {review.car}
                    </p>

                    <p className="mt-1 text-[11px] text-[#8a949e]">
                      {review.service} · {review.date}
                    </p>
                  </div>

                  <div className="text-[12px] font-semibold">
                    {"★".repeat(review.rating)}
                    <span className="text-[#dfe3e6]">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-[12px] leading-6 text-[#68727c]">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>
      </main>
    </div>
  );
}

export default Reviews;