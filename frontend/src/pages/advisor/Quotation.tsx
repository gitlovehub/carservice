import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const quotations = [
  {
    id: "BG-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    service: "Bảo dưỡng định kỳ",
    date: "03/10/2026",
    total: "3.850.000 đ",
    status: "Chờ duyệt",
  },
  {
    id: "BG-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    service: "Kiểm tra và thay má phanh",
    date: "03/10/2026",
    total: "2.450.000 đ",
    status: "Đã duyệt",
  },
  {
    id: "BG-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    service: "Sửa chữa điều hòa",
    date: "02/10/2026",
    total: "4.200.000 đ",
    status: "Đã gửi",
  },
];

function Quotation() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            CỐ VẤN / BÁO GIÁ
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý báo giá
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Tạo, theo dõi và quản lý báo giá dịch vụ sửa chữa cho khách hàng.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng báo giá
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                BG
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              10
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Báo giá trong hệ thống
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Chờ duyệt
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                02
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Chờ khách hàng duyệt
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đã duyệt
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              6
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Báo giá đã được duyệt
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Giá trị
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                ₫
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              28,5M
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Tổng giá trị báo giá
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
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              LH
            </div>

            <p className="mt-4 text-xs font-semibold">
              Lịch hẹn
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
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
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              BG
            </div>

            <p className="mt-4 text-xs font-semibold">
              Báo giá
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Quản lý báo giá
            </p>
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                QUOTATION MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tìm kiếm báo giá
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
            >
              + Tạo báo giá
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Tìm theo khách hàng, biển số hoặc mã báo giá..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10">
              <option>Tất cả trạng thái</option>
              <option>Chờ duyệt</option>
              <option>Đã gửi</option>
              <option>Đã duyệt</option>
            </select>

            <button
              type="button"
              className="rounded-xl border border-[#dfe3e6] px-5 py-3 text-xs font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                QUOTATION LIST
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách báo giá
              </h2>
            </div>

            <span className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
              10 báo giá
            </span>
          </div>

          <div className="space-y-3 p-5">
            {quotations.map((quotation, index) => (
              <div
                key={quotation.id}
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
                          {quotation.id}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            quotation.status === "Đã duyệt"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : quotation.status === "Chờ duyệt"
                                ? "bg-[#f5f1e8] text-[#876d35]"
                                : "bg-[#eef0f2] text-[#5f6871]"
                          }`}
                        >
                          {quotation.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {quotation.customer}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {quotation.phone} · {quotation.car}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-[#e5e8ea] pt-4 sm:grid-cols-2 xl:grid-cols-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Dịch vụ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {quotation.service}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ngày tạo
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {quotation.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Tổng tiền
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {quotation.total}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Khách hàng
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {quotation.customer}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-[#e5e8ea] pt-4 xl:border-t-0 xl:pt-0">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                    >
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Sửa
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
                Quy trình báo giá
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Cố vấn tạo báo giá dựa trên tình trạng xe, gửi cho khách
                hàng và theo dõi trạng thái phê duyệt trước khi thực hiện
                sửa chữa.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Quotation;