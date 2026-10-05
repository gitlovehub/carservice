import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function Appointments() {
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");

  const appointments = [
    {
      code: "LH-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      status: "Chờ xác nhận",
    },
    {
      code: "LH-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      status: "Đã xác nhận",
    },
  ];

  const filteredAppointments = appointments.filter((item) => {
    const matchStatus = status === "" || item.status === status;

    const matchKeyword =
      keyword === "" ||
      item.code.toLowerCase().includes(keyword.toLowerCase()) ||
      item.car.toLowerCase().includes(keyword.toLowerCase()) ||
      item.service.toLowerCase().includes(keyword.toLowerCase());

    return matchStatus && matchKeyword;
  });

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / LỊCH HẸN
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Lịch hẹn của tôi
              </h1>

              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#66717C]">
                Xem chi tiết, đổi hoặc hủy lịch hẹn bảo dưỡng.
              </p>
            </div>

            <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                TỔNG LỊCH HẸN
              </p>

              <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                {filteredAppointments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-7 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
          <div className="border-b border-[#E1E4E6] px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
              FILTER
            </p>

            <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
              Tìm kiếm lịch hẹn
            </h2>

            <p className="mt-1 text-[10px] text-[#66717C]">
              Tìm kiếm và lọc danh sách theo thông tin hiện có.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-[0.8fr_1.4fr_auto]">
            <div>
              <label className="mb-2 block text-[10px] font-semibold text-[#20252B]">
                Trạng thái
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Chờ xác nhận">Chờ xác nhận</option>
                <option value="Đã xác nhận">Đã xác nhận</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold text-[#20252B]">
                Từ khóa
              </label>

              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Nhập mã lịch, xe hoặc dịch vụ..."
                className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md md:w-auto"
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
          <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                APPOINTMENTS
              </p>

              <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                Danh sách lịch hẹn
              </h2>
            </div>

            <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
              {filteredAppointments.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã lịch hẹn</th>
                  <th className="px-6 py-4">Xe</th>
                  <th className="px-6 py-4">Dịch vụ</th>
                  <th className="px-6 py-4">Ngày hẹn</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map((item, index) => (
                  <tr
                    key={item.code}
                    className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                  >
                    <td className="px-6 py-5 text-[11px] text-[#8A949E]">
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[11px] font-bold text-[#20252B]">
                        {item.code}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-[12px] font-semibold text-[#20252B]">
                        {item.car}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-[11px] text-[#66717C]">
                        {item.service}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-[11px] font-medium text-[#66717C]">
                        {item.date}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      {item.status === "Đã xác nhận" ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
                          {item.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#8A949E]" />
                          {item.status}
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

                        <button
                          type="button"
                          className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                        >
                          Đổi lịch
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#66717C] transition hover:border-[#20252B] hover:bg-[#F3F4F2]"
                        >
                          Hủy lịch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm text-[#66717C]">
                        —
                      </div>

                      <p className="mt-4 text-xs font-semibold text-[#20252B]">
                        Không tìm thấy lịch hẹn
                      </p>

                      <p className="mt-1 text-[10px] text-[#8A949E]">
                        Thử thay đổi trạng thái hoặc từ khóa tìm kiếm.
                      </p>
                    </td>
                  </tr>
                )}
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
                Lưu ý về lịch hẹn
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#66717C]">
                Bạn có thể xem thông tin lịch hẹn và quản lý lịch đã đặt.
                Với các lịch đang chờ xác nhận, vui lòng chờ CarService phản hồi.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Appointments;