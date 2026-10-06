import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  AD
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[#20252B]">
                    Quản lý dịch vụ
                  </h1>

                  <p className="mt-1 text-xs text-[#66717C]">
                    Quản lý dịch vụ và các gói bảo dưỡng của gara.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng dịch vụ
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  12
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Dịch vụ trong hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đang hoạt động
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  10
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Dịch vụ đang cung cấp
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Gói bảo dưỡng
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  6
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Gói đang được sử dụng
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Ngừng hoạt động
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  2
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Dịch vụ tạm ngừng
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Link
                to="/admin"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                  NV
                </div>

                <p className="mt-4 text-xs font-semibold text-[#20252B]">
                  Tài khoản & nhân viên
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Quản lý tài khoản
                </p>
              </Link>

              <Link
                to="/admin/services"
                className="rounded-2xl border border-[#1F2933] bg-[#1F2933] p-5 text-white transition hover:bg-[#151D24]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D6A85F] text-[10px] font-bold text-[#3A3020]">
                  DV
                </div>

                <p className="mt-4 text-xs font-semibold">
                  Dịch vụ & gói bảo dưỡng
                </p>

                <p className="mt-1 text-[10px] text-[#AEB8C1]">
                  Quản lý dịch vụ
                </p>
              </Link>

              <Link
                to="/admin/inventory"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                  PT
                </div>

                <p className="mt-4 text-xs font-semibold text-[#20252B]">
                  Phụ tùng & tồn kho
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Quản lý kho
                </p>
              </Link>

              <Link
                to="/admin/reports"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                  BC
                </div>

                <p className="mt-4 text-xs font-semibold text-[#20252B]">
                  Báo cáo & thống kê
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Theo dõi số liệu
                </p>
              </Link>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARA / DỊCH VỤ
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Dịch vụ & gói bảo dưỡng
                  </h2>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Thêm dịch vụ
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  type="text"
                  placeholder="Tên dịch vụ..."
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#1F2933]"
                />

                <select className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]">
                  <option>Tất cả loại dịch vụ</option>
                  <option>Bảo dưỡng</option>
                  <option>Sửa chữa</option>
                  <option>Kiểm tra</option>
                </select>

                <select className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]">
                  <option>Tất cả trạng thái</option>
                  <option>Đang hoạt động</option>
                  <option>Ngừng hoạt động</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    SERVICE MANAGEMENT
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Danh sách dịch vụ
                  </h2>
                </div>

                <p className="text-[10px] text-[#8A949E]">
                  {services.length} kết quả
                </p>
              </div>

              <div className="space-y-3 p-5">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-5 transition hover:border-[#D5D9DC] hover:bg-[#F7F7F5]"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-white">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-[#20252B]">
                              {service.name}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                service.status === "Đang hoạt động"
                                  ? "bg-[#F3E8D2] text-[#3A3020]"
                                  : "bg-[#F3F4F2] text-[#66717C]"
                              }`}
                            >
                              {service.status}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            {service.id}
                          </p>

                          <p className="mt-2 max-w-md text-xs leading-5 text-[#66717C]">
                            {service.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] text-[#8A949E]">
                            GIÁ THAM KHẢO
                          </p>

                          <p className="mt-1 text-xs font-bold text-[#20252B]">
                            {service.price}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#8A949E]">
                            THỜI GIAN
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[#20252B]">
                            {service.duration}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#8A949E]">
                            MÃ DỊCH VỤ
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[#20252B]">
                            {service.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                        >
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                        >
                          Chỉnh sửa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Services;