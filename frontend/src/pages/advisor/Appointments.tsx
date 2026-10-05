import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const appointments = [
  {
    id: 1,
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    date: "03/10/2026",
    time: "08:30",
    service: "Bảo dưỡng định kỳ",
    status: "Đã xác nhận",
  },
  {
    id: 2,
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    date: "03/10/2026",
    time: "10:00",
    service: "Kiểm tra phanh",
    status: "Chờ xác nhận",
  },
  {
    id: 3,
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    date: "04/10/2026",
    time: "14:00",
    service: "Sửa chữa điều hòa",
    status: "Hoàn thành",
  },
];

function Appointments() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            CỐ VẤN / LỊCH HẸN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý lịch hẹn
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi và quản lý lịch hẹn của khách hàng tại gara.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng lịch hẹn
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                LH
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              12
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Lịch hẹn trong hệ thống
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Chờ xác nhận
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                03
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              3
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cần được xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đã xác nhận
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              7
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Lịch hẹn đã xác nhận
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Hoàn thành
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                HT
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Lịch đã hoàn tất
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Link
            to="/customers"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              KH
            </div>

            <p className="mt-4 text-xs font-semibold">
              Khách hàng
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý khách hàng
            </p>
          </Link>

          <Link
            to="/customer-cars"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              XE
            </div>

            <p className="mt-4 text-xs font-semibold">
              Xe của khách
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý phương tiện
            </p>
          </Link>

          <Link
            to="/appointments"
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              LH
            </div>

            <p className="mt-4 text-xs font-semibold">
              Lịch hẹn
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Quản lý lịch hẹn
            </p>
          </Link>

          <Link
            to="/repair-status"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              SC
            </div>

            <p className="mt-4 text-xs font-semibold">
              Phiếu sửa chữa
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Theo dõi sửa chữa
            </p>
          </Link>

          <Link
            to="/quotation"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              BG
            </div>

            <p className="mt-4 text-xs font-semibold">
              Báo giá
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý báo giá
            </p>
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                APPOINTMENT MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Bộ lọc lịch hẹn
              </h2>
            </div>

            <span className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
              12 lịch hẹn
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <input
              type="date"
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10">
              <option>Tất cả trạng thái</option>
              <option>Chờ xác nhận</option>
              <option>Đã xác nhận</option>
              <option>Hoàn thành</option>
            </select>

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10">
              <option>Tất cả dịch vụ</option>
              <option>Bảo dưỡng định kỳ</option>
              <option>Kiểm tra phanh</option>
              <option>Sửa chữa điều hòa</option>
            </select>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                APPOINTMENT LIST
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách lịch hẹn
              </h2>
            </div>

            <span className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
              12 lịch hẹn
            </span>
          </div>

          <div className="space-y-3 p-5">
            {appointments.map((appointment, index) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">
                          {appointment.customer}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            appointment.status === "Chờ xác nhận"
                              ? "bg-[#f5f1e8] text-[#876d35]"
                              : appointment.status === "Đã xác nhận"
                                ? "bg-[#eef7f0] text-[#39734a]"
                                : "bg-[#eef0f2] text-[#5f6871]"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {appointment.phone}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-[#e5e8ea] pt-4 sm:grid-cols-2 xl:grid-cols-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Xe
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.car}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ngày
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Giờ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.time}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Dịch vụ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {appointment.service}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#e5e8ea] pt-4 xl:border-t-0 xl:pt-0">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-[#dfe3e6] px-5 py-2.5 text-[10px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Appointments;