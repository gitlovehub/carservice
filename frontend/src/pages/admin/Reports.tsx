import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

const reports = [
  {
    title: "Doanh thu tháng",
    value: "185.500.000 đ",
    description: "Tổng doanh thu dịch vụ trong tháng.",
    change: "+12,5%",
  },
  {
    title: "Lịch hẹn",
    value: "128",
    description: "Tổng số lịch hẹn trong tháng.",
    change: "+8,2%",
  },
  {
    title: "Phiếu sửa chữa",
    value: "96",
    description: "Số phiếu sửa chữa đã tiếp nhận.",
    change: "+15,4%",
  },
  {
    title: "Khách hàng",
    value: "74",
    description: "Khách hàng đã sử dụng dịch vụ.",
    change: "+6,8%",
  },
];

const serviceReports = [
  {
    name: "Bảo dưỡng định kỳ",
    quantity: 42,
    revenue: "63.000.000 đ",
  },
  {
    name: "Kiểm tra phanh",
    quantity: 28,
    revenue: "35.000.000 đ",
  },
  {
    name: "Sửa chữa điều hòa",
    quantity: 16,
    revenue: "48.500.000 đ",
  },
  {
    name: "Thay dầu động cơ",
    quantity: 34,
    revenue: "22.000.000 đ",
  },
];

function Reports() {
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
                    Báo cáo & thống kê
                  </h1>

                  <p className="mt-1 text-xs text-[#66717C]">
                    Theo dõi doanh thu, lịch hẹn và hoạt động của gara.
                  </p>
                </div>
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
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                  DV
                </div>

                <p className="mt-4 text-xs font-semibold text-[#20252B]">
                  Dịch vụ & gói bảo dưỡng
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
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
                className="rounded-2xl border border-[#1F2933] bg-[#1F2933] p-5 text-white transition hover:bg-[#151D24]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D6A85F] text-[10px] font-bold text-[#3A3020]">
                  BC
                </div>

                <p className="mt-4 text-xs font-semibold">
                  Báo cáo & thống kê
                </p>

                <p className="mt-1 text-[10px] text-[#AEB8C1]">
                  Theo dõi số liệu
                </p>
              </Link>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARA / BÁO CÁO
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Tổng quan hoạt động
                  </h2>
                </div>

                <select className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2.5 text-xs text-[#20252B] outline-none focus:border-[#1F2933]">
                  <option>Tháng 10/2026</option>
                  <option>Tháng 09/2026</option>
                  <option>Tháng 08/2026</option>
                </select>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {reports.map((report) => (
                <div
                  key={report.title}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                    {report.title}
                  </p>

                  <p className="mt-4 text-2xl font-bold text-[#20252B]">
                    {report.value}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] leading-4 text-[#8A949E]">
                      {report.description}
                    </p>

                    <span className="shrink-0 rounded-full bg-[#F3E8D2] px-2.5 py-1 text-[10px] font-semibold text-[#3A3020]">
                      {report.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white">
                <div className="border-b border-[#EEF0F2] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    SERVICE REPORT
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Hiệu quả theo dịch vụ
                  </h2>
                </div>

                <div className="space-y-4 p-6">
                  {serviceReports.map((service) => (
                    <div
                      key={service.name}
                      className="rounded-2xl bg-[#FAFAF8] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold text-[#20252B]">
                            {service.name}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            {service.quantity} lượt sử dụng
                          </p>
                        </div>

                        <p className="text-xs font-bold text-[#20252B]">
                          {service.revenue}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                        <div
                          className="h-full rounded-full bg-[#D6A85F]"
                          style={{
                            width: `${Math.min(service.quantity * 2, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white">
                <div className="border-b border-[#EEF0F2] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    GARAGE OVERVIEW
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Tình hình hoạt động
                  </h2>
                </div>

                <div className="space-y-4 p-6">
                  <div className="rounded-2xl border border-[#E5E8EA] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#20252B]">
                        Lịch hẹn hoàn thành
                      </p>

                      <p className="text-sm font-bold text-[#20252B]">
                        92%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                      <div
                        className="h-full rounded-full bg-[#D6A85F]"
                        style={{ width: "92%" }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5E8EA] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#20252B]">
                        Phiếu sửa chữa hoàn thành
                      </p>

                      <p className="text-sm font-bold text-[#20252B]">
                        86%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                      <div
                        className="h-full rounded-full bg-[#D6A85F]"
                        style={{ width: "86%" }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5E8EA] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#20252B]">
                        Mức sử dụng tồn kho
                      </p>

                      <p className="text-sm font-bold text-[#20252B]">
                        64%
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                      <div
                        className="h-full rounded-full bg-[#D6A85F]"
                        style={{ width: "64%" }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F7F7F5] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      GHI CHÚ
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#66717C]">
                      Số liệu trên trang hiện là dữ liệu mẫu phục vụ giao diện.
                      Backend có thể kết nối dữ liệu thực tế sau.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Reports;