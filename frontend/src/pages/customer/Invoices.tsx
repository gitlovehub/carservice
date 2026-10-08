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
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "Đã thanh toán",
  ).length;

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === "Chưa thanh toán",
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / HÓA ĐƠN
              </p>

              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                Hóa đơn của tôi
              </h1>

              <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
                Theo dõi các hóa đơn và lịch sử thanh toán dịch vụ.
              </p>
            </div>

            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      Tổng hóa đơn
                    </p>

                    <p className="mt-3 text-[25px] font-bold tracking-tight text-[#20252B]">
                      {invoices.length}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Hóa đơn đã tạo
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-[11px] font-bold text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                    HD
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      Đã thanh toán
                    </p>

                    <p className="mt-3 text-[25px] font-bold tracking-tight text-[#3F6B47]">
                      {paidInvoices}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Hóa đơn hoàn tất
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4EC] text-sm font-bold text-[#3F6B47] transition duration-300 group-hover:scale-105">
                    ✓
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      Chưa thanh toán
                    </p>

                    <p className="mt-3 text-[25px] font-bold tracking-tight text-[#8A6A32]">
                      {unpaidInvoices}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Cần xử lý
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F1E3] text-sm font-bold text-[#8A6A32] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                    !
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
              <div className="border-b border-[#E1E4E6] px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  INVOICE HISTORY
                </p>

                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <h2 className="text-[17px] font-bold text-[#20252B]">
                    Danh sách hóa đơn
                  </h2>

                  <span className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-bold text-[#6F5527]">
                    {invoices.length} hóa đơn
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="group rounded-2xl border border-[#E1E4E6] bg-[#FAFAF9] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:bg-white hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-[11px] font-bold text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                          HD
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-bold text-[#20252B]">
                              {invoice.id}
                            </p>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold transition duration-200 hover:-translate-y-0.5 ${
                                invoice.status === "Đã thanh toán"
                                  ? "border border-[#CFE5D3] bg-[#EAF4EC] text-[#3F6B47]"
                                  : "border border-[#EAD8B4] bg-[#F8F1E3] text-[#8A6A32]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  invoice.status === "Đã thanh toán"
                                    ? "bg-[#5D9168]"
                                    : "bg-[#D6A85F]"
                                }`}
                              />

                              {invoice.status}
                            </span>
                          </div>

                          <p className="mt-2 text-[13px] font-semibold text-[#20252B]">
                            {invoice.service}
                          </p>

                          <p className="mt-1 text-[11px] text-[#66717C]">
                            {invoice.car}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5 border-t border-[#E1E4E6] pt-4 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                            Ngày lập
                          </p>

                          <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                            {invoice.date}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                            Thành tiền
                          </p>

                          <p className="mt-1 text-[13px] font-bold text-[#20252B]">
                            {invoice.amount}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#20252B] transition duration-300 hover:-translate-y-0.5 hover:border-[#1F2933] hover:bg-[#1F2933] hover:text-white hover:shadow-[0_8px_18px_rgba(31,41,51,0.12)]"
                        >
                          Xem hóa đơn
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="group mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                  i
                </div>

                <div>
                  <p className="text-[14px] font-bold text-[#20252B]">
                    Lịch sử thanh toán
                  </p>

                  <p className="mt-1.5 text-[11px] leading-5 text-[#66717C]">
                    Bạn có thể xem lại thông tin các hóa đơn và trạng thái
                    thanh toán của từng lần sử dụng dịch vụ.
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

export default Invoices;