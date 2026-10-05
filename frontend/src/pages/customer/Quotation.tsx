import Header from "../../components/Header";
import Footer from "../../components/Footer";

const quotationItems = [
  {
    name: "Dầu động cơ",
    quantity: "4 lít",
    price: "480.000đ",
  },
  {
    name: "Lọc dầu động cơ",
    quantity: "1 cái",
    price: "180.000đ",
  },
  {
    name: "Kiểm tra và bảo dưỡng",
    quantity: "1 lần",
    price: "350.000đ",
  },
];

function Quotation() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / BÁO GIÁ
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Báo giá sửa chữa
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Xem các hạng mục sửa chữa và chi phí dự kiến cho xe của bạn.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white">
                BG
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold">
                    Báo giá #BG-001
                  </h2>

                  <span className="rounded-full bg-[#f5f1e8] px-3 py-1.5 text-[10px] font-semibold text-[#876d35]">
                    Chờ xác nhận
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#7b858f]">
                  Toyota Vios · 30A-123.45
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Mã phiếu
                </p>

                <p className="mt-1 text-xs font-semibold">
                  PSC-001
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Ngày báo giá
                </p>

                <p className="mt-1 text-xs font-semibold">
                  12/10/2026
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Cố vấn
                </p>

                <p className="mt-1 text-xs font-semibold">
                  Nguyễn Văn C
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                QUOTATION DETAILS
              </p>

              <h2 className="mt-1 text-base font-bold">
                Chi tiết báo giá
              </h2>
            </div>

            <div className="space-y-3 p-5">
              {quotationItems.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-[10px] font-bold">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div>
                        <p className="text-xs font-semibold">
                          {item.name}
                        </p>

                        <p className="mt-1 text-[10px] text-[#8a949e]">
                          Số lượng: {item.quantity}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs font-bold">
                      {item.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] leading-5 text-[#8a949e]">
                Chi phí trên là chi phí dự kiến. Giá thực tế có thể
                thay đổi sau khi kỹ thuật viên kiểm tra tình trạng xe.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                TOTAL
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tổng chi phí dự kiến
              </h2>

              <div className="my-5 border-t border-[#eef0f2]" />

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b858f]">
                    Tiền phụ tùng
                  </span>

                  <span className="font-semibold">
                    660.000đ
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#7b858f]">
                    Công dịch vụ
                  </span>

                  <span className="font-semibold">
                    350.000đ
                  </span>
                </div>

                <div className="border-t border-[#eef0f2] pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-semibold">
                      Tổng cộng
                    </span>

                    <span className="text-xl font-bold">
                      1.010.000đ
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
              >
                Xác nhận báo giá
              </button>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Lưu ý
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Bạn cần xác nhận báo giá trước khi gara tiến hành
                    các hạng mục sửa chữa phát sinh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Quotation;