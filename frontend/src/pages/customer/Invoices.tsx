import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / HÓA ĐƠN
            </p>

            <div className="mt-3">
              <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Hóa đơn của tôi
              </h1>

              <p className="mt-2 text-[12px] leading-6 text-[#66717C]">
                Theo dõi các hóa đơn và lịch sử thanh toán dịch vụ.
              </p>
            </div>
          </div>

          <div className="mb-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    Tổng hóa đơn
                  </p>

                  <p className="mt-3 text-2xl font-bold tracking-tight text-[#20252B]">
                    {invoices.length}
                  </p>

                  <p className="mt-1 text-[10px] text-[#66717C]">
                    Hóa đơn đã tạo
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-white">
                  HD
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    Đã thanh toán
                  </p>

                  <p className="mt-3 text-2xl font-bold tracking-tight text-[#20252B]">
                    1
                  </p>

                  <p className="mt-1 text-[10px] text-[#66717C]">
                    Hóa đơn hoàn tất
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                  ✓
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    Chưa thanh toán
                  </p>

                  <p className="mt-3 text-2xl font-bold tracking-tight text-[#20252B]">
                    1
                  </p>

                  <p className="mt-1 text-[10px] text-[#66717C]">
                    Cần xử lý
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F2] text-sm font-bold text-[#66717C]">
                  !
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="border-b border-[#E1E4E6] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                INVOICE HISTORY
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-bold text-[#20252B]">
                  Danh sách hóa đơn
                </h2>

                <span className="rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {invoices.length} hóa đơn
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-[#E1E4E6] bg-[#FAFAF9] p-5 transition hover:border-[#D6A85F] hover:shadow-[0_8px_25px_rgba(31,41,51,0.05)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-[10px] font-bold text-white">
                        HD
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#20252B]">
                            {invoice.id}
                          </p>

                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                              invoice.status === "Đã thanh toán"
                                ? "bg-[#F3E8D2] text-[#3A3020]"
                                : "bg-[#F3F4F2] text-[#66717C]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                invoice.status === "Đã thanh toán"
                                  ? "bg-[#D6A85F]"
                                  : "bg-[#8A949E]"
                              }`}
                            />

                            {invoice.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-[#20252B]">
                          {invoice.service}
                        </p>

                        <p className="mt-1 text-[10px] text-[#66717C]">
                          {invoice.car}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5 border-t border-[#E1E4E6] pt-4 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                          Ngày lập
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#20252B]">
                          {invoice.date}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                          Thành tiền
                        </p>

                        <p className="mt-1 text-xs font-bold text-[#20252B]">
                          {invoice.amount}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="rounded-xl border border-[#DDE1E4] bg-white px-3 py-2 text-[10px] font-semibold text-[#20252B] transition hover:border-[#1F2933] hover:bg-[#1F2933] hover:text-white"
                      >
                        Xem hóa đơn
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.03)]">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020]">
                i
              </div>

              <div>
                <p className="text-[12px] font-bold text-[#20252B]">
                  Lịch sử thanh toán
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#66717C]">
                  Bạn có thể xem lại thông tin các hóa đơn và trạng thái
                  thanh toán của từng lần sử dụng dịch vụ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Invoices;