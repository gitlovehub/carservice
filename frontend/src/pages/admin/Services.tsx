import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const services = [
  {
    id: "DV-001",
    name: "Bảo dưỡng định kỳ",
    description: "Kiểm tra và bảo dưỡng xe theo định kỳ.",
    price: "1.500.000 đ",
    duration: "120 phút",
    status: "Đang hoạt động",
  },
  {
    id: "DV-002",
    name: "Kiểm tra phanh",
    description: "Kiểm tra hệ thống phanh và má phanh.",
    price: "500.000 đ",
    duration: "60 phút",
    status: "Đang hoạt động",
  },
  {
    id: "DV-003",
    name: "Sửa chữa điều hòa",
    description: "Kiểm tra và sửa chữa hệ thống điều hòa.",
    price: "800.000 đ",
    duration: "90 phút",
    status: "Đang hoạt động",
  },
  {
    id: "DV-004",
    name: "Thay dầu động cơ",
    description: "Thay dầu và kiểm tra động cơ.",
    price: "650.000 đ",
    duration: "45 phút",
    status: "Ngừng hoạt động",
  },
];

function Services() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white shadow-sm">
              AD
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Quản lý dịch vụ
              </h1>

              <p className="mt-1 text-xs text-[#8a949e]">
                Quản lý dịch vụ và các gói bảo dưỡng của gara.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tổng dịch vụ
            </p>

            <p className="mt-4 text-2xl font-bold">
              12
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Dịch vụ trong hệ thống
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đang hoạt động
            </p>

            <p className="mt-4 text-2xl font-bold">
              10
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Dịch vụ đang cung cấp
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Gói bảo dưỡng
            </p>

            <p className="mt-4 text-2xl font-bold">
              6
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Gói đang được sử dụng
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Ngừng hoạt động
            </p>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Dịch vụ tạm ngừng
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Link
            to="/admin"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              NV
            </div>

            <p className="mt-4 text-xs font-semibold">
              Tài khoản & nhân viên
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý tài khoản
            </p>
          </Link>

          <Link
            to="/admin/services"
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              DV
            </div>

            <p className="mt-4 text-xs font-semibold">
              Dịch vụ & gói bảo dưỡng
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Quản lý dịch vụ
            </p>
          </Link>

          <Link
            to="/admin/inventory"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              PT
            </div>

            <p className="mt-4 text-xs font-semibold">
              Phụ tùng & tồn kho
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý kho
            </p>
          </Link>

          <Link
            to="/admin/reports"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              BC
            </div>

            <p className="mt-4 text-xs font-semibold">
              Báo cáo & thống kê
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Theo dõi số liệu
            </p>
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                GARA / DỊCH VỤ
              </p>

              <h2 className="mt-1 text-base font-bold">
                Dịch vụ & gói bảo dưỡng
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
            >
              + Thêm dịch vụ
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Tên dịch vụ..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b]"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả loại dịch vụ</option>
              <option>Bảo dưỡng</option>
              <option>Sửa chữa</option>
              <option>Kiểm tra</option>
            </select>

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả trạng thái</option>
              <option>Đang hoạt động</option>
              <option>Ngừng hoạt động</option>
            </select>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#343a40]"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                SERVICE MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách dịch vụ
              </h2>
            </div>

            <p className="text-[10px] text-[#8a949e]">
              {services.length} kết quả
            </p>
          </div>

          <div className="space-y-3 p-5">
            {services.map((service, index) => (
              <div
                key={service.id}
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
                          {service.name}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                            service.status === "Đang hoạt động"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : "bg-[#f3eeee] text-[#8b4a4a]"
                          }`}
                        >
                          {service.status}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {service.id}
                      </p>

                      <p className="mt-2 max-w-md text-xs leading-5 text-[#626b73]">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        GIÁ THAM KHẢO
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {service.price}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        THỜI GIAN
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {service.duration}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        MÃ DỊCH VỤ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {service.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-2 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Chi tiết
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-2 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Chỉnh sửa
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

export default Services;