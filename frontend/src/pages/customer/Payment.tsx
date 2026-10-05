import Header from "../../components/Header";
import Footer from "../../components/Footer";

function Payment() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / THANH TOÁN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Thanh toán
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Kiểm tra thông tin hóa đơn và lựa chọn phương thức thanh toán.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
              <div className="border-b border-[#eef0f2] px-6 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  PAYMENT
                </p>

                <h2 className="mt-1 text-base font-bold">
                  Thông tin thanh toán
                </h2>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Hóa đơn
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        INV-001
                      </p>
                    </div>

                    <span className="rounded-full bg-[#f5f1e8] px-3 py-1.5 text-[10px] font-semibold text-[#876d35]">
                      Chưa thanh toán
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-[#e5e8ea] pt-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Khách hàng
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        Nguyễn Văn A
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Phương tiện
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        Toyota Vios
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Biển số
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        30A-123.45
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold">
                    Phương thức thanh toán
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-2xl border-2 border-[#20252b] bg-[#fafbfb] p-4 text-left transition hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20252b] text-xs font-bold text-white">
                          QR
                        </div>

                        <div>
                          <p className="text-xs font-bold">
                            Chuyển khoản QR
                          </p>

                          <p className="mt-1 text-[10px] text-[#8a949e]">
                            Thanh toán qua mã QR
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-[#e3e6e8] bg-white p-4 text-left transition hover:border-[#20252b] hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                          TM
                        </div>

                        <div>
                          <p className="text-xs font-bold">
                            Thanh toán tại gara
                          </p>

                          <p className="mt-1 text-[10px] text-[#8a949e]">
                            Thanh toán trực tiếp
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">
                        Chuyển khoản QR
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        Quét mã QR để thực hiện thanh toán.
                      </p>
                    </div>

                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#e3e6e8] bg-[#f7f8f9] text-[10px] font-bold">
                      QR CODE
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Lưu ý thanh toán
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Vui lòng kiểm tra đúng số tiền và mã hóa đơn trước
                    khi xác nhận thanh toán.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                ORDER SUMMARY
              </p>

              <h2 className="mt-1 text-base font-bold">
                Chi tiết thanh toán
              </h2>

              <div className="my-5 border-t border-[#eef0f2]" />

              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7b858f]">
                    Bảo dưỡng định kỳ
                  </span>

                  <span className="font-semibold">
                    500.000đ
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#7b858f]">
                    Dầu động cơ
                  </span>

                  <span className="font-semibold">
                    480.000đ
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#7b858f]">
                    Lọc dầu
                  </span>

                  <span className="font-semibold">
                    180.000đ
                  </span>
                </div>

                <div className="border-t border-[#eef0f2] pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-semibold">
                      Tổng thanh toán
                    </span>

                    <span className="text-2xl font-bold">
                      1.160.000đ
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
              >
                Xác nhận thanh toán
              </button>

              <p className="mt-3 text-center text-[10px] leading-5 text-[#8a949e]">
                Bằng việc xác nhận, bạn đồng ý với thông tin thanh toán
                trên.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Payment;