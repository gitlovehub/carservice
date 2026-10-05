import { Link, useLocation } from "react-router-dom";

function CustomerHeader() {
  const location = useLocation();

  const menus = [
    {
      label: "Tổng quan",
      path: "/customer",
      icon: "⌂",
    },
    {
      label: "Lịch hẹn",
      path: "/appointments",
      icon: "▣",
    },
    {
      label: "Xe của tôi",
      path: "/cars",
      icon: "▰",
    },
    {
      label: "Báo giá",
      path: "/quotation",
      icon: "◇",
    },
    {
      label: "Thanh toán",
      path: "/payment",
      icon: "₫",
    },
    {
      label: "Hóa đơn",
      path: "/invoices",
      icon: "▤",
    },
    {
      label: "Đánh giá",
      path: "/reviews",
      icon: "★",
    },
    {
      label: "Tài khoản",
      path: "/account",
      icon: "◉",
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[250px] border-r border-[#303A44] bg-[#1F2933] lg:flex lg:flex-col">
      <div className="border-b border-[#3A4650] px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6A85F] text-lg">
            🚗
          </div>

          <div>
            <p className="text-sm font-bold text-white">
              CarService
            </p>

            <p className="mt-0.5 text-[9px] text-[#AEB8C1]">
              KHU VỰC KHÁCH HÀNG
            </p>
          </div>
        </Link>
      </div>

      <div className="px-5 py-5">
        <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8F9BA6]">
          QUẢN LÝ
        </p>

        <nav className="space-y-1">
          {menus.map((menu) => {
            const active = location.pathname === menu.path;

            return (
              <Link
                key={menu.path}
                to={menu.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[11px] font-medium transition ${
                  active
                    ? "bg-[#D6A85F] text-[#3A3020]"
                    : "text-[#B8C0C7] hover:bg-[#29333D] hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs">
                  {menu.icon}
                </span>

                {menu.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-5">
        <div className="rounded-2xl border border-[#3A4650] bg-[#29333D] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D6A85F] text-[10px] font-bold text-[#3A3020]">
              NV
            </div>

            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white">
                Tên người dùng
              </p>

              <p className="mt-0.5 text-[9px] text-[#AEB8C1]">
                Khách hàng
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="mt-4 block rounded-xl border border-[#46525D] px-3 py-2 text-center text-[10px] font-medium text-[#B8C0C7] transition hover:bg-[#1F2933] hover:text-white"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default CustomerHeader;