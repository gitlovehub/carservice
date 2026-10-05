import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const parts = [
  {
    id: "PT-001",
    name: "Dầu động cơ 5W-30",
    category: "Dầu nhớt",
    quantity: 24,
    unit: "Chai",
    price: "450.000 đ",
    status: "Còn hàng",
  },
  {
    id: "PT-002",
    name: "Má phanh trước Toyota",
    category: "Hệ thống phanh",
    quantity: 8,
    unit: "Bộ",
    price: "1.200.000 đ",
    status: "Sắp hết",
  },
  {
    id: "PT-003",
    name: "Lọc dầu động cơ",
    category: "Bộ lọc",
    quantity: 32,
    unit: "Cái",
    price: "180.000 đ",
    status: "Còn hàng",
  },
  {
    id: "PT-004",
    name: "Gas điều hòa R134a",
    category: "Điều hòa",
    quantity: 3,
    unit: "Bình",
    price: "650.000 đ",
    status: "Sắp hết",
  },
];

function Inventory() {
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
                Phụ tùng & tồn kho
              </h1>

              <p className="mt-1 text-xs text-[#8a949e]">
                Quản lý phụ tùng, số lượng và tình trạng tồn kho của gara.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tổng phụ tùng
            </p>

            <p className="mt-4 text-2xl font-bold">
              86
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Mặt hàng trong kho
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Còn hàng
            </p>

            <p className="mt-4 text-2xl font-bold">
              72
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Mặt hàng đủ số lượng
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Sắp hết
            </p>

            <p className="mt-4 text-2xl font-bold">
              10
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cần nhập thêm
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Hết hàng
            </p>

            <p className="mt-4 text-2xl font-bold">
              4
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cần bổ sung ngay
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
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              PT
            </div>

            <p className="mt-4 text-xs font-semibold">
              Phụ tùng & tồn kho
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
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
                GARA / PHỤ TÙNG & TỒN KHO
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tìm kiếm phụ tùng
              </h2>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
            >
              + Nhập phụ tùng
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              placeholder="Tên phụ tùng..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b]"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả danh mục</option>
              <option>Dầu nhớt</option>
              <option>Hệ thống phanh</option>
              <option>Bộ lọc</option>
              <option>Điều hòa</option>
            </select>

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none">
              <option>Tất cả trạng thái</option>
              <option>Còn hàng</option>
              <option>Sắp hết</option>
              <option>Hết hàng</option>
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
                INVENTORY MANAGEMENT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Danh sách phụ tùng
              </h2>
            </div>

            <p className="text-[10px] text-[#8a949e]">
              {parts.length} kết quả
            </p>
          </div>

          <div className="space-y-3 p-5">
            {parts.map((part, index) => (
              <div
                key={part.id}
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
                          {part.name}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                            part.status === "Còn hàng"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : "bg-[#f5f1e8] text-[#876d35]"
                          }`}
                        >
                          {part.status}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {part.id} · {part.category}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        SỐ LƯỢNG
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {part.quantity} {part.unit}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        ĐƠN GIÁ
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {part.price}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        DANH MỤC
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {part.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        MÃ PHỤ TÙNG
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {part.id}
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
                      Cập nhật
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

export default Inventory;