import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ HỆ THỐNG
              </p>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  AD
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[#20252B]">
                    Tổng quan hệ thống
                  </h1>

                  <p className="mt-1 text-xs text-[#66717C]">
                    Quản lý tổng thể hoạt động của CarService.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Khách hàng
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  128
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Khách hàng trong hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Lịch hẹn hôm nay
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  24
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Lịch hẹn cần xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Xe đang sửa
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  15
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xe đang được xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Doanh thu
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  86M
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Doanh thu tháng này
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  QUẢN LÝ HỆ THỐNG
                </p>

                <h2 className="mt-1 text-base font-bold text-[#20252B]">
                  Các khu vực quản lý
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Link
                  to="/admin/accounts"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    NV
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Tài khoản & nhân viên
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý tài khoản và phân quyền nhân viên
                  </p>
                </Link>

                <Link
                  to="/admin/customers"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    KH
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý thông tin khách hàng
                  </p>
                </Link>

                <Link
                  to="/admin/appointments"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    LH
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Lịch hẹn
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Theo dõi và quản lý lịch hẹn toàn hệ thống
                  </p>
                </Link>

                <Link
                  to="/admin/services"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    DV
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Dịch vụ
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý dịch vụ và gói bảo dưỡng
                  </p>
                </Link>

                <Link
                  to="/admin/inventory"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    PT
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Kho vật tư
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý phụ tùng và tồn kho
                  </p>
                </Link>

                <Link
                  to="/admin/reports"
                  className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F2] text-[10px] font-bold text-[#20252B]">
                    BC
                  </div>

                  <p className="mt-4 text-xs font-semibold text-[#20252B]">
                    Báo cáo & thống kê
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Theo dõi số liệu hoạt động hệ thống
                  </p>
                </Link>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    HOẠT ĐỘNG
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Tình hình hôm nay
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-4 py-3">
                    <span className="text-xs text-[#66717C]">
                      Lịch hẹn chờ xác nhận
                    </span>

                    <span className="text-xs font-bold text-[#20252B]">
                      6
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-4 py-3">
                    <span className="text-xs text-[#66717C]">
                      Xe đang tiếp nhận
                    </span>

                    <span className="text-xs font-bold text-[#20252B]">
                      4
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-4 py-3">
                    <span className="text-xs text-[#66717C]">
                      Xe đang sửa chữa
                    </span>

                    <span className="text-xs font-bold text-[#20252B]">
                      15
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-[#1F2933] p-6 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  QUẢN TRỊ
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Quản lý tổng thể CarService
                </h2>

                <p className="mt-2 text-xs leading-6 text-[#AEB8C1]">
                  Admin có quyền theo dõi hoạt động, quản lý người dùng,
                  dịch vụ, lịch hẹn, kho vật tư và báo cáo của toàn hệ thống.
                </p>

                <Link
                  to="/admin/reports"
                  className="mt-5 inline-flex cursor-pointer rounded-xl bg-[#D6A85F] px-4 py-2.5 text-[11px] font-semibold text-[#3A3020] transition hover:bg-[#E0B973]"
                >
                  Xem báo cáo
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;