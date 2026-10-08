import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Quotation() {
  const quotations = [
    {
      code: "BG-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      amount: "1.500.000 VNĐ",
      status: "Chờ duyệt",
    },
    {
      code: "BG-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      amount: "850.000 VNĐ",
      status: "Đã duyệt",
    },
  ];

  const pendingQuotations = quotations.filter(
    (quotation) => quotation.status === "Chờ duyệt",
  ).length;

  const approvedQuotations = quotations.filter(
    (quotation) => quotation.status === "Đã duyệt",
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  KHÁCH HÀNG / BÁO GIÁ
                </p>

                <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                  Báo giá dịch vụ
                </h1>

                <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
                  Xem và xác nhận các báo giá dịch vụ sửa chữa, bảo dưỡng.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white px-5 py-4 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                  TỔNG BÁO GIÁ
                </p>

                <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                  {quotations.length}
                </p>
              </div>
            </div>

            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      TỔNG BÁO GIÁ
                    </p>

                    <p className="mt-2 text-[25px] font-bold text-[#20252B]">
                      {quotations.length}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Các báo giá dịch vụ hiện có.
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2933] text-sm font-bold text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                    $
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      CHỜ DUYỆT
                    </p>

                    <p className="mt-2 text-[25px] font-bold text-[#8A6A32]">
                      {pendingQuotations}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Báo giá cần được xem xét.
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F1E3] text-sm font-bold text-[#8A6A32] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                    !
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      ĐÃ DUYỆT
                    </p>

                    <p className="mt-2 text-[25px] font-bold text-[#3F6B47]">
                      {approvedQuotations}
                    </p>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Báo giá đã được xác nhận.
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4EC] text-sm font-bold text-[#3F6B47] transition duration-300 group-hover:scale-105">
                    ✓
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
              <div className="flex flex-col gap-3 border-b border-[#E5E7E9] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    QUOTATIONS
                  </p>

                  <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                    Danh sách báo giá
                  </h2>
                </div>

                <span className="w-fit rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-bold text-[#6F5527]">
                  {quotations.length} kết quả
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead>
                    <tr className="border-b border-[#E5E7E9] bg-[#FAFAF9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                      <th className="px-6 py-4">STT</th>
                      <th className="px-6 py-4">Mã báo giá</th>
                      <th className="px-6 py-4">Xe</th>
                      <th className="px-6 py-4">Dịch vụ</th>
                      <th className="px-6 py-4">Ngày</th>
                      <th className="px-6 py-4">Tổng tiền</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {quotations.map((quotation, index) => (
                      <tr
                        key={quotation.code}
                        className="border-b border-[#EEF0F2] last:border-b-0 transition duration-200 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[11px] font-bold text-[#20252B] transition duration-200 hover:bg-[#F3E8D2]">
                            {quotation.code}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2933] text-xs text-white transition duration-300 hover:scale-105 hover:bg-[#D6A85F] hover:text-[#1F2933]">
                              🚗
                            </div>

                            <p className="text-[13px] font-semibold text-[#20252B]">
                              {quotation.car}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[12px] text-[#66717C]">
                            {quotation.service}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[12px] text-[#66717C]">
                            {quotation.date}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[13px] font-bold text-[#20252B]">
                            {quotation.amount}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {quotation.status === "Đã duyệt" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE5D3] bg-[#EAF4EC] px-3 py-1.5 text-[10px] font-semibold text-[#3F6B47] transition duration-200 hover:-translate-y-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#5D9168]" />
                              {quotation.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#EAD8B4] bg-[#F8F1E3] px-3 py-1.5 text-[10px] font-semibold text-[#8A6A32] transition duration-200 hover:-translate-y-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                              {quotation.status}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="cursor-pointer rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[11px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_8px_18px_rgba(31,41,51,0.14)]"
                            >
                              Xem chi tiết
                            </button>

                            {quotation.status === "Chờ duyệt" && (
                              <>
                                <button
                                  type="button"
                                  className="cursor-pointer rounded-xl border border-[#D6A85F] bg-[#F3E8D2] px-3.5 py-2.5 text-[11px] font-semibold text-[#3A3020] transition duration-300 hover:-translate-y-0.5 hover:bg-[#E4C17E] hover:shadow-[0_8px_18px_rgba(214,168,95,0.14)]"
                                >
                                  Duyệt
                                </button>

                                <button
                                  type="button"
                                  className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[11px] font-medium text-[#66717C] transition duration-300 hover:-translate-y-0.5 hover:border-[#20252B] hover:bg-[#F3F4F2]"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="group mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                  i
                </div>

                <div>
                  <p className="text-[14px] font-bold text-[#20252B]">
                    Lưu ý về báo giá
                  </p>

                  <p className="mt-1.5 text-[11px] leading-5 text-[#66717C]">
                    Vui lòng kiểm tra nội dung và tổng chi phí trước khi xác
                    nhận sử dụng dịch vụ. Báo giá có thể được cập nhật sau khi
                    kỹ thuật viên kiểm tra thực tế phương tiện.
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

export default Quotation;