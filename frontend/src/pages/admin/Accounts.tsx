import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

const accounts = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    username: "nguyenvana",
    role: "Cố vấn dịch vụ",
    status: "Hoạt động",
    phone: "0901 234 567",
  },
  {
    id: 2,
    name: "Trần Thị B",
    username: "tranthib",
    role: "Kỹ thuật viên",
    status: "Hoạt động",
    phone: "0912 345 678",
  },
  {
    id: 3,
    name: "Lê Văn C",
    username: "levanc",
    role: "Kỹ thuật viên",
    status: "Khóa",
    phone: "0987 654 321",
  },
];

function Accounts() {
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
                    Quản trị viên
                  </h1>

                  <p className="mt-1 text-xs text-[#66717C]">
                    Quản lý tài khoản người dùng và phân quyền nhân viên.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng tài khoản
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  12
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tài khoản trong hệ thống
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
                  Tài khoản đang sử dụng
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Nhân viên
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  8
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Cố vấn và kỹ thuật viên
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đang khóa
                </p>

                <p className="mt-4 text-2xl font-bold text-[#20252B]">
                  2
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tài khoản bị khóa
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Link
                to="/admin"
                className="rounded-2xl border border-[#1F2933] bg-[#1F2933] p-5 text-white transition hover:bg-[#151D24]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D6A85F] text-[10px] font-bold text-[#3A3020]">
                  NV
                </div>

                <p className="mt-4 text-xs font-semibold">
                  Tài khoản & nhân viên
                </p>

                <p className="mt-1 text-[10px] text-[#AEB8C1]">
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
                    GARA / TÀI KHOẢN & NHÂN VIÊN
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Tìm kiếm tài khoản & nhân viên
                  </h2>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Tạo tài khoản
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  type="text"
                  placeholder="Tên hoặc tài khoản..."
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#1F2933]"
                />

                <select className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]">
                  <option>Tất cả vai trò</option>
                  <option>Cố vấn dịch vụ</option>
                  <option>Kỹ thuật viên</option>
                  <option>Quản trị viên</option>
                </select>

                <select className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#1F2933]">
                  <option>Tất cả trạng thái</option>
                  <option>Hoạt động</option>
                  <option>Khóa</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Tìm kiếm
                </button>
              </div>

              <p className="mt-4 text-[10px] text-[#8A949E]">
                Tìm kiếm và lọc danh sách theo thông tin hiện có.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    ACCOUNT MANAGEMENT
                  </p>

                  <h2 className="mt-1 text-base font-bold text-[#20252B]">
                    Danh sách tài khoản & nhân viên
                  </h2>
                </div>

                <p className="text-[10px] text-[#8A949E]">
                  3 kết quả
                </p>
              </div>

              <div className="divide-y divide-[#EEF0F2]">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="p-5 transition hover:bg-[#F7F7F5]"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-white">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[#20252B]">
                            {account.name}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            {account.phone}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-[#8A949E]">
                          TÀI KHOẢN
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#20252B]">
                          {account.username}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-[#8A949E]">
                          VAI TRÒ
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#20252B]">
                          {account.role}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                            account.status === "Hoạt động"
                              ? "bg-[#F3E8D2] text-[#3A3020]"
                              : "bg-[#F3F4F2] text-[#66717C]"
                          }`}
                        >
                          {account.status}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-[#D9DDE1] px-4 py-2 text-[10px] font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                        >
                          Phân quyền
                        </button>

                        <button
                          type="button"
                          className="rounded-xl border border-[#D9DDE1] px-4 py-2 text-[10px] font-semibold text-[#20252B] transition hover:bg-[#F3F4F2]"
                        >
                          {account.status === "Hoạt động"
                            ? "Khóa"
                            : "Mở khóa"}
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

export default Accounts;