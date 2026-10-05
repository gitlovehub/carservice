import Header from "../../components/Header";
import Footer from "../../components/Footer";

const appointments = [
  {
    id: "LH-001",
    car: "Toyota Vios · 30A-123.45",
    service: "Bảo dưỡng định kỳ",
    date: "12/10/2026",
    time: "08:00 – 10:00",
    status: "Đã xác nhận",
  },
  {
    id: "LH-002",
    car: "Honda City · 30F-678.90",
    service: "Thay dầu động cơ",
    date: "18/10/2026",
    time: "13:00 – 15:00",
    status: "Chờ xác nhận",
  },
];

function Appointments() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / LỊCH HẸN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Lịch hẹn của tôi
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi các lịch bảo dưỡng và sửa chữa xe của bạn.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng lịch hẹn
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                01
              </div>
            </div>

            <p className="text-2xl font-bold">
              {appointments.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Lịch hẹn đã tạo
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đã xác nhận
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đang được gara tiếp nhận
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Chờ xác nhận
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                !
              </div>
            </div>

            <p className="text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đang chờ xử lý
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                BOOKING HISTORY
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách lịch hẹn
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#343a40]"
            >
              + Đặt lịch mới
            </button>
          </div>

          <div className="space-y-4 p-5">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      LH
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">
                          {appointment.id}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                            appointment.status === "Đã xác nhận"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : "bg-[#f5f1e8] text-[#876d35]"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {appointment.service}
                      </p>

                      <p className="mt-1 text-[10px] text-[#7b858f]">
                        {appointment.car}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 border-t border-[#e5e8ea] pt-4 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ngày hẹn
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Khung giờ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.time}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-3 py-2 text-[10px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                    >
                      Xem chi tiết
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
                Lưu ý về lịch hẹn
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Thời gian thực tế có thể thay đổi tùy tình trạng xe và
                tình hình tiếp nhận tại gara.
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