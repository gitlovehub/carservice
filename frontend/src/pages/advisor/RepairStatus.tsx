import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const repairs = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    service: "Bảo dưỡng định kỳ",
    technician: "Nguyễn Văn Kỹ",
    progress: 80,
    status: "Đang sửa chữa",
    date: "03/10/2026",
  },
  {
    id: "PSC-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    service: "Kiểm tra phanh",
    technician: "Trần Văn B",
    progress: 40,
    status: "Đang kiểm tra",
    date: "03/10/2026",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    service: "Sửa chữa điều hòa",
    technician: "Lê Văn C",
    progress: 100,
    status: "Hoàn thành",
    date: "02/10/2026",
  },
];

function RepairStatus() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            CỐ VẤN / PHIẾU SỬA CHỮA
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Theo dõi sửa chữa
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi tiến độ sửa chữa và tình trạng xử lý xe tại gara.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng phiếu
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                PS
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              8
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phiếu sửa chữa
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đang xử lý
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                05
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              5
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Xe đang được xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Hoàn thành
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              3
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đã hoàn tất sửa chữa
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tiến độ TB
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                %
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              73%
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Tiến độ trung bình
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
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              SC
            </div>

            <p className="mt-4 text-xs font-semibold">
              Phiếu sửa chữa
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
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
                REPAIR MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách phiếu sửa chữa
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
            >
              + Tạo phiếu sửa chữa
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Tìm theo khách hàng, biển số hoặc mã phiếu..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10">
              <option>Tất cả trạng thái</option>
              <option>Đang kiểm tra</option>
              <option>Đang sửa chữa</option>
              <option>Hoàn thành</option>
            </select>

            <button
              type="button"
              className="rounded-xl border border-[#dfe3e6] px-5 py-3 text-xs font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {repairs.map((repair) => (
            <div
              key={repair.id}
              className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm transition hover:border-[#d5d9dc] hover:shadow-md"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#20252b] text-[10px] font-bold text-white">
                      PS
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">
                          {repair.id}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            repair.status === "Hoàn thành"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : repair.status === "Đang sửa chữa"
                                ? "bg-[#f5f1e8] text-[#876d35]"
                                : "bg-[#eef0f2] text-[#5f6871]"
                          }`}
                        >
                          {repair.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {repair.customer}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {repair.phone} · {repair.car}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Dịch vụ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {repair.service}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Kỹ thuật viên
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {repair.technician}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ngày tiếp nhận
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {repair.date}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef0f2] pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#8a949e]">
                      TIẾN ĐỘ SỬA CHỮA
                    </p>

                    <p className="text-xs font-bold">
                      {repair.progress}%
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                    <div
                      className="h-full rounded-full bg-[#20252b]"
                      style={{ width: `${repair.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                  <p className="text-[10px] leading-5 text-[#8a949e]">
                    Theo dõi tiến độ để cập nhật thông tin cho khách hàng.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      className="rounded-xl bg-[#20252b] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default RepairStatus;