import Header from "../../components/Header";
import Footer from "../../components/Footer";

const customerCars = [
  {
    customer: "Nguyễn Văn A",
    customerId: "KH-001",
    car: "Toyota Vios",
    plate: "30A-123.45",
    year: "2022",
    color: "Trắng",
    mileage: "32.500 km",
    status: "Đang sử dụng",
  },
  {
    customer: "Nguyễn Văn A",
    customerId: "KH-001",
    car: "Honda City",
    plate: "30F-678.90",
    year: "2023",
    color: "Đen",
    mileage: "18.200 km",
    status: "Đang sử dụng",
  },
  {
    customer: "Trần Thị B",
    customerId: "KH-002",
    car: "Mazda 3",
    plate: "30G-456.78",
    year: "2021",
    color: "Xám",
    mileage: "45.800 km",
    status: "Đang sử dụng",
  },
];

function CustomerCars() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            CỐ VẤN / XE KHÁCH HÀNG
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý xe khách hàng
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi thông tin phương tiện và lịch sử xe của khách hàng.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Tổng phương tiện
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                XE
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {customerCars.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Xe của khách hàng
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đang sử dụng
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {
                customerCars.filter(
                  (car) => car.status === "Đang sử dụng",
                ).length
              }
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phương tiện đang hoạt động
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Khách hàng
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                KH
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Có phương tiện đăng ký
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                VEHICLE MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tìm kiếm phương tiện
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
            >
              + Thêm phương tiện
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_140px]">
            <input
              type="text"
              placeholder="Tìm theo tên khách hàng hoặc biển số..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả trạng thái</option>
              <option>Đang sử dụng</option>
              <option>Ngừng sử dụng</option>
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
          <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                CUSTOMER VEHICLES
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách phương tiện
              </h2>
            </div>

            <span className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
              {customerCars.length} phương tiện
            </span>
          </div>

          <div className="space-y-4 p-5">
            {customerCars.map((item, index) => (
              <div
                key={item.plate}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">
                          {item.car}
                        </h3>

                        <span className="rounded-full bg-[#eef7f0] px-3 py-1.5 text-[10px] font-medium text-[#39734a]">
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold">
                        {item.plate}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {item.customer} · {item.customerId}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#e5e8ea] pt-4 sm:grid-cols-3 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Năm sản xuất
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {item.year}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Màu xe
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {item.color}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Số km
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {item.mileage}
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
                      Lịch sử
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
                Thông tin phương tiện
              </p>

              <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                Cố vấn có thể sử dụng thông tin phương tiện để kiểm tra
                lịch sử bảo dưỡng và tư vấn dịch vụ phù hợp cho khách hàng.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerCars;