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

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-14">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / BÁO GIÁ
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Báo giá dịch vụ
                </h1>

                <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#66717C]">
                  Xem và xác nhận các báo giá dịch vụ sửa chữa, bảo dưỡng.
                </p>
              </div>

              <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 sm:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG BÁO GIÁ
                </p>

                <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                  {quotations.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    TỔNG BÁO GIÁ
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {quotations.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  $
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Các báo giá dịch vụ hiện có.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    CHỜ DUYỆT
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {
                      quotations.filter(
                        (quotation) => quotation.status === "Chờ duyệt"
                      ).length
                    }
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                  !
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Báo giá cần được khách hàng xem xét.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    ĐÃ DUYỆT
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {
                      quotations.filter(
                        (quotation) => quotation.status === "Đã duyệt"
                      ).length
                    }
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm font-bold text-[#1F2933]">
                  ✓
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Báo giá đã được xác nhận.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  QUOTATIONS
                </p>

                <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                  Danh sách báo giá
                </h2>
              </div>

              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                {quotations.length} kết quả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
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
                      className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                    >
                      <td className="px-6 py-5 text-[11px] text-[#8A949E]">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[11px] font-bold text-[#20252B]">
                          {quotation.code}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2933] text-xs text-white">
                            🚗
                          </div>

                          <p className="text-[12px] font-semibold text-[#20252B]">
                            {quotation.car}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-[11px] text-[#66717C]">
                          {quotation.service}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-[11px] text-[#66717C]">
                          {quotation.date}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-[12px] font-bold text-[#20252B]">
                          {quotation.amount}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        {quotation.status === "Đã duyệt" ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                            {quotation.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#8A949E]" />
                            {quotation.status}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                          >
                            Xem chi tiết
                          </button>

                          {quotation.status === "Chờ duyệt" && (
                            <>
                              <button
                                type="button"
                                className="rounded-xl border border-[#D6A85F] bg-[#F3E8D2] px-3.5 py-2.5 text-[10px] font-semibold text-[#3A3020] transition hover:bg-[#E4C17E]"
                              >
                                Duyệt
                              </button>

                              <button
                                type="button"
                                className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#66717C] transition hover:border-[#20252B] hover:bg-[#F3F4F2]"
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
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>

              <div>
                <p className="text-xs font-bold text-[#20252B]">
                  Lưu ý về báo giá
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#66717C]">
                  Vui lòng kiểm tra nội dung và tổng chi phí trước khi xác nhận
                  sử dụng dịch vụ. Báo giá có thể được cập nhật sau khi kỹ thuật
                  viên kiểm tra thực tế phương tiện.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Quotation;