
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

const managementItems = [
  {
    code: "NV",
    title: "Tài khoản & nhân viên",
    description: "Quản lý tài khoản và phân quyền nhân viên",
    path: "/admin/accounts",
  },
  {
    code: "KH",
    title: "Khách hàng",
    description: "Quản lý thông tin khách hàng",
    path: "/admin/customers",
  },
  {
    code: "LH",
    title: "Lịch hẹn",
    description: "Theo dõi và quản lý lịch hẹn toàn hệ thống",
    path: "/admin/appointments",
  },
  {
    code: "DV",
    title: "Dịch vụ",
    description: "Quản lý danh sách dịch vụ sửa chữa",
    path: "/admin/services",
  },
  {
    code: "PT",
    title: "Kho vật tư",
    description: "Quản lý phụ tùng và số lượng tồn kho",
    path: "/admin/inventory",
  },
  {
    code: "GB",
    title: "Gói bảo dưỡng",
    description: "Quản lý gói bảo dưỡng và dịch vụ đi kèm",
    path: "/admin/maintenance-packages",
  },
  {
    code: "BC",
    title: "Báo cáo & thống kê",
    description: "Theo dõi số liệu hoạt động hệ thống",
    path: "/admin/reports",
  },
];

const statistics = [
  {
    title: "Khách hàng",
    value: "128",
    description: "Khách hàng trong hệ thống",
    code: "KH",
    path: "/admin/customers",
  },
  {
    title: "Lịch hẹn hôm nay",
    value: "24",
    description: "Lịch hẹn cần theo dõi",
    code: "LH",
    path: "/admin/appointments",
  },
  {
    title: "Xe đang sửa",
    value: "15",
    description: "Xe đang được xử lý",
    code: "SC",
    path: "/admin/appointments",
  },
  {
    title: "Doanh thu tháng",
    value: "86M",
    description: "Doanh thu mẫu trong tháng",
    code: "DT",
    path: "/admin/reports",
  },
];

const dailyActivities = [
  {
    title: "Lịch hẹn chờ xác nhận",
    value: 6,
    color: "bg-[#D6A85F]",
    width: "40%",
  },
  {
    title: "Xe đang tiếp nhận",
    value: 4,
    color: "bg-[#7893A6]",
    width: "27%",
  },
  {
    title: "Xe đang sửa chữa",
    value: 15,
    color: "bg-[#719779]",
    width: "100%",
  },
];

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                AD
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                  KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ HỆ THỐNG
                </p>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Tổng quan hệ thống
                </h1>

                <p className="mt-2 text-xs text-[#66717C]">
                  Theo dõi và quản lý các hoạt động của CarService.
                </p>
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statistics.map((item) => (
                <Link
                  key={item.code}
                  to={item.path}
                  className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                      {item.title}
                    </p>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B] transition group-hover:bg-[#F8EBD6]">
                      {item.code}
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-bold">{item.value}</p>

                  <p className="mt-2 text-[10px] text-[#8A949E]">
                    {item.description}
                  </p>

                  <p className="mt-4 text-[10px] font-semibold text-[#B28A49]">
                    Xem chi tiết →
                  </p>
                </Link>
              ))}
            </div>

            <section className="mb-8">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  QUẢN LÝ HỆ THỐNG
                </p>

                <h2 className="mt-1 text-base font-bold">
                  Các khu vực quản lý
                </h2>

                <p className="mt-1 text-xs text-[#8A949E]">
                  Chọn một chức năng để xem và quản lý dữ liệu.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {managementItems.map((item) => (
                  <Link
                    key={item.code}
                    to={item.path}
                    className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:-translate-y-1 hover:border-[#D6A85F] hover:bg-[#FCFCFA] hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B] transition group-hover:bg-[#F8EBD6]">
                        {item.code}
                      </div>

                      <span className="text-sm text-[#A0A8AE] transition group-hover:translate-x-1 group-hover:text-[#B28A49]">
                        →
                      </span>
                    </div>

                    <h3 className="mt-4 text-xs font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-[10px] leading-5 text-[#8A949E]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-5 sm:p-6">
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    HOẠT ĐỘNG
                  </p>

                  <h2 className="mt-1 text-base font-bold">
                    Tình hình hôm nay
                  </h2>

                  <p className="mt-1 text-xs text-[#8A949E]">
                    Tổng hợp số liệu minh họa theo từng trạng thái.
                  </p>
                </div>

                <div className="space-y-6">
                  {dailyActivities.map((activity) => (
                    <div key={activity.title}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-[#66717C]">
                          {activity.title}
                        </p>

                        <span className="text-xs font-bold">
                          {activity.value}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#F0F1EF]">
                        <div
                          className={`h-full rounded-full ${activity.color}`}
                          style={{ width: activity.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  to="/admin/appointments"
                  className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[#9A7336] transition hover:text-[#20252B]"
                >
                  Quản lý lịch hẹn
                  <span>→</span>
                </Link>
              </section>

              <section className="flex flex-col justify-between rounded-2xl bg-[#1F2933] p-6 text-white sm:p-7">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-[#D6A85F]">
                    CS
                  </div>

                  <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    QUẢN TRỊ HỆ THỐNG
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    Quản lý tổng thể CarService
                  </h2>

                  <p className="mt-3 text-xs leading-6 text-[#AEB8C1]">
                    Theo dõi hoạt động, quản lý tài khoản, khách hàng, lịch
                    hẹn, dịch vụ, kho vật tư và báo cáo trên cùng một hệ thống.
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/admin/reports"
                    className="inline-flex items-center rounded-xl bg-[#D6A85F] px-4 py-3 text-[11px] font-semibold text-[#3A3020] transition hover:bg-[#E0B973]"
                  >
                    Xem báo cáo
                  </Link>

                  <Link
                    to="/admin/appointments"
                    className="inline-flex items-center rounded-xl border border-white/20 px-4 py-3 text-[11px] font-semibold text-white transition hover:bg-white/10"
                  >
                    Xem lịch hẹn
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
