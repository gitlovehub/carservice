import Header from "../../components/Header";
import Footer from "../../components/Footer";

const invoices = [
  {
    id: "INV-001",
    date: "12/10/2026",
    car: "Toyota Vios · 30A-123.45",
    service: "Bảo dưỡng định kỳ",
    amount: "1.160.000đ",
    status: "Chưa thanh toán",
  },
  {
    id: "INV-002",
    date: "20/09/2026",
    car: "Honda City · 30F-678.90",
    service: "Thay dầu động cơ",
    amount: "650.000đ",
    status: "Đã thanh toán",
  },
];

function Invoices() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / HÓA ĐƠN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Hóa đơn của tôi
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi các hóa đơn và lịch sử thanh toán dịch vụ.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tổng hóa đơn
            </p>

            <p className="mt-3 text-2xl font-bold">
              {invoices.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Hóa đơn đã tạo
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đã thanh toán
            </p>

            <p className="mt-3 text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Hóa đơn hoàn tất
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Chưa thanh toán
            </p>

            <p className="mt-3 text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cần xử lý
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="border-b border-[#eef0f2] px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              INVOICE HISTORY
            </p>

            <h2 className="mt-1 text-base font-bold">
              Danh sách hóa đơn
            </h2>
          </div>

          <div className="space-y-4 p-5">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      HD
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">
                          {invoice.id}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            invoice.status === "Đã thanh toán"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : "bg-[#f5f1e8] text-[#876d35]"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {invoice.service}
                      </p>

                      <p className="mt-1 text-[10px] text-[#7b858f]">
                        {invoice.car}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 border-t border-[#e5e8ea] pt-4 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ngày lập
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {invoice.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Thành tiền
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {invoice.amount}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-3 py-2 text-[10px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                    >
                      Xem hóa đơn
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
              i
            </div>

            <div>
              <p className="text-xs font-semibold">
                Lịch sử thanh toán
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Bạn có thể xem lại thông tin các hóa đơn và trạng thái
                thanh toán của từng lần sử dụng dịch vụ.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Invoices;