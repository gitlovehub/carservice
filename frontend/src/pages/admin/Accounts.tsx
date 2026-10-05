import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
                Quản trị viên
              </h1>

              <p className="mt-1 text-xs text-[#8a949e]">
                Quản lý tài khoản người dùng và phân quyền nhân viên.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tổng tài khoản
            </p>

            <p className="mt-4 text-2xl font-bold">
              12
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Tài khoản trong hệ thống
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
              Tài khoản đang sử dụng
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Nhân viên
            </p>

            <p className="mt-4 text-2xl font-bold">
              8
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cố vấn và kỹ thuật viên
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đang khóa
            </p>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Tài khoản bị khóa
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Link
            to="/admin"
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              NV
            </div>

            <p className="mt-4 text-xs font-semibold">
              Tài khoản & nhân viên
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
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
                GARA / TÀI KHOẢN & NHÂN VIÊN
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tìm kiếm tài khoản & nhân viên
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
            >
              + Tạo tài khoản
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Tên hoặc tài khoản..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b]"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả vai trò</option>
              <option>Cố vấn dịch vụ</option>
              <option>Kỹ thuật viên</option>
              <option>Quản trị viên</option>
            </select>

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả trạng thái</option>
              <option>Hoạt động</option>
              <option>Khóa</option>
            </select>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#343a40]"
            >
              Tìm kiếm
            </button>
          </div>

          <p className="mt-4 text-[10px] text-[#8a949e]">
            Tìm kiếm và lọc danh sách theo thông tin hiện có.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#eef0f2] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                ACCOUNT MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách tài khoản & nhân viên
              </h2>
            </div>

            <p className="text-[10px] text-[#8a949e]">
              3 kết quả
            </p>
          </div>

          <div className="divide-y divide-[#eef0f2]">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className="p-5 transition hover:bg-[#fafbfc]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <p className="text-xs font-bold">
                        {account.name}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {account.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#8a949e]">
                      TÀI KHOẢN
                    </p>

                    <p className="mt-1 text-xs font-semibold">
                      {account.username}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#8a949e]">
                      VAI TRÒ
                    </p>

                    <p className="mt-1 text-xs font-semibold">
                      {account.role}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                        account.status === "Hoạt động"
                          ? "bg-[#eef7f0] text-[#39734a]"
                          : "bg-[#f3eeee] text-[#8b4a4a]"
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-4 py-2 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Phân quyền
                    </button>

                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-4 py-2 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
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
      </main>

      <Footer />
    </div>
  );
}

export default Accounts;