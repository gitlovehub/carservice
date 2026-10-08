import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function RepairStatus() {
  const repairs = [
    {
      code: "SC-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      status: "Đang tiếp nhận",
    },
    {
      code: "SC-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      status: "Đang sửa chữa",
    },
  ];

  const receivingCount = repairs.filter(
    (repair) => repair.status === "Đang tiếp nhận"
  ).length;

  const repairingCount = repairs.filter(
    (repair) => repair.status === "Đang sửa chữa"
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
                KHÁCH HÀNG / THEO DÕI SỬA CHỮA
              </p>

              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                    Theo dõi tình trạng sửa chữa
                  </h1>

                  <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
                    Theo dõi tiến độ sửa chữa và bảo dưỡng xe của bạn.
                  </p>
                </div>

                <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 shadow-[0_4px_15px_rgba(31,41,51,0.03)] sm:block">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    PHIẾU ĐANG XỬ LÝ
                  </p>

                  <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                    {repairs.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-7 grid gap-4 md:grid-cols-3">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      TỔNG PHIẾU
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                      {repairs.length}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-sm text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                    #
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Các phiếu sửa chữa hiện có.
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      ĐANG TIẾP NHẬN
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                      {receivingCount}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm text-[#66717C] transition duration-300 group-hover:scale-105 group-hover:bg-[#E9EBE9]">
                    01
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Xe đang trong bước tiếp nhận.
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                      ĐANG SỬA CHỮA
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                      {repairingCount}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                    02
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Xe đang được kỹ thuật viên xử lý.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
              <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    REPAIR STATUS
                  </p>

                  <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                    Danh sách phiếu sửa chữa
                  </h2>
                </div>

                <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {repairs.length} kết quả
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                      <th className="px-6 py-4">STT</th>
                      <th className="px-6 py-4">Mã phiếu</th>
                      <th className="px-6 py-4">Xe</th>
                      <th className="px-6 py-4">Dịch vụ</th>
                      <th className="px-6 py-4">Ngày</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {repairs.map((repair, index) => (
                      <tr
                        key={repair.code}
                        className="group border-b border-[#EEF0F2] last:border-b-0 transition duration-200 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[12px] font-bold text-[#20252B] transition duration-200 group-hover:bg-[#F3E8D2]">
                            {repair.code}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2933] text-xs text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                              🚗
                            </div>

                            <p className="text-[13px] font-semibold text-[#20252B]">
                              {repair.car}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[12px] text-[#66717C]">
                            {repair.service}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[12px] text-[#66717C]">
                            {repair.date}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {repair.status === "Đang sửa chữa" ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020] transition duration-200 hover:-translate-y-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                              {repair.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#8A949E]" />
                              {repair.status}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <button
                            type="button"
                            className="cursor-pointer rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_7px_16px_rgba(31,41,51,0.14)]"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="group mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                  i
                </div>

                <div>
                  <p className="text-[13px] font-bold text-[#20252B]">
                    Trạng thái sửa chữa
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8A949E]" />
                      Đang tiếp nhận
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020] transition duration-200 hover:-translate-y-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                      Đang sửa chữa
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-[#66717C]">
                    Bạn có thể xem chi tiết từng phiếu để theo dõi quá trình xử
                    lý xe tại CarService.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RepairStatus;