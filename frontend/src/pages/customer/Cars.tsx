import Header from "../../components/Header";
import Footer from "../../components/Footer";

const cars = [
  {
    name: "Toyota Vios",
    plate: "30A-123.45",
    year: "2022",
    color: "Trắng",
    mileage: "32.500 km",
    status: "Đang sử dụng",
  },
  {
    name: "Honda City",
    plate: "30F-678.90",
    year: "2023",
    color: "Đen",
    mileage: "18.200 km",
    status: "Đang sử dụng",
  },
];

function Cars() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
              KHÁCH HÀNG / XE CỦA TÔI
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Xe của tôi
            </h1>

            <p className="mt-2 text-xs leading-5 text-[#7b858f]">
              Quản lý thông tin các phương tiện đã đăng ký với CarService.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
          >
            + Thêm xe
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng số xe
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                01
              </div>
            </div>

            <p className="text-2xl font-bold">
              {cars.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phương tiện đã đăng ký
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đang sử dụng
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="text-2xl font-bold">
              {cars.filter((car) => car.status === "Đang sử dụng").length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Xe đang hoạt động
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng quãng đường
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                KM
              </div>
            </div>

            <p className="text-2xl font-bold">
              50.700
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Kilomet đã ghi nhận
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {cars.map((car, index) => (
            <div
              key={car.plate}
              className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <h2 className="text-base font-bold">
                      {car.name}
                    </h2>

                    <p className="mt-1 text-xs text-[#7b858f]">
                      {car.plate}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#eef7f0] px-3 py-1.5 text-[10px] font-medium text-[#39734a]">
                  {car.status}
                </span>
              </div>

              <div className="my-5 border-t border-[#eef0f2]" />

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Năm sản xuất
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {car.year}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Màu xe
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {car.color}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Số km
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {car.mileage}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Biển số
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {car.plate}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[11px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                >
                  Xem chi tiết
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[11px] font-semibold transition hover:bg-[#f5f6f7]"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
              i
            </div>

            <div>
              <p className="text-xs font-semibold">
                Quản lý phương tiện
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Thông tin xe sẽ được sử dụng khi bạn đặt lịch bảo dưỡng
                hoặc sửa chữa tại CarService.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Cars;