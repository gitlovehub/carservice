import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
                Báo cáo & thống kê
              </h1>

              <p className="mt-1 text-xs text-[#8a949e]">
                Theo dõi doanh thu, lịch hẹn và hoạt động của gara.
              </p>
            </div>
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
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              DV
            </div>

            <p className="mt-4 text-xs font-semibold">
              Dịch vụ & gói bảo dưỡng
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
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
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              BC
            </div>

            <p className="mt-4 text-xs font-semibold">
              Báo cáo & thống kê
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Theo dõi số liệu
            </p>
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                GARA / BÁO CÁO
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tổng quan hoạt động
              </h2>
            </div>

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-2.5 text-xs outline-none">
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
              className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                {report.title}
              </p>

              <p className="mt-4 text-2xl font-bold">
                {report.value}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] leading-4 text-[#8a949e]">
                  {report.description}
                </p>

                <span className="shrink-0 rounded-full bg-[#eef7f0] px-2.5 py-1 text-[10px] font-semibold text-[#39734a]">
                  {report.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                SERVICE REPORT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Hiệu quả theo dịch vụ
              </h2>
            </div>

            <div className="space-y-4 p-6">
              {serviceReports.map((service) => (
                <div
                  key={service.name}
                  className="rounded-2xl bg-[#fafbfb] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold">
                        {service.name}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {service.quantity} lượt sử dụng
                      </p>
                    </div>

                    <p className="text-xs font-bold">
                      {service.revenue}
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8ebed]">
                    <div
                      className="h-full rounded-full bg-[#20252b]"
                      style={{
                        width: `${Math.min(service.quantity * 2, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                GARAGE OVERVIEW
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tình hình hoạt động
              </h2>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-[#e5e8ea] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    Lịch hẹn hoàn thành
                  </p>

                  <p className="text-sm font-bold">
                    92%
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                  <div
                    className="h-full rounded-full bg-[#20252b]"
                    style={{ width: "92%" }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5e8ea] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    Phiếu sửa chữa hoàn thành
                  </p>

                  <p className="text-sm font-bold">
                    86%
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                  <div
                    className="h-full rounded-full bg-[#20252b]"
                    style={{ width: "86%" }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5e8ea] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    Mức sử dụng tồn kho
                  </p>

                  <p className="text-sm font-bold">
                    64%
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                  <div
                    className="h-full rounded-full bg-[#20252b]"
                    style={{ width: "64%" }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f9fa] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  GHI CHÚ
                </p>

                <p className="mt-2 text-xs leading-5 text-[#626b73]">
                  Số liệu trên trang hiện là dữ liệu mẫu phục vụ giao diện.
                  Backend có thể kết nối dữ liệu thực tế sau.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Reports;