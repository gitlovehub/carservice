import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    label: "Tổng quan",
    path: "/customer",
    icon: "⌂",
  },
  {
    label: "Đặt lịch",
    path: "/customer/booking",
    icon: "＋",
  },
  {
    label: "Lịch hẹn",
    path: "/customer/appointments",
    icon: "▣",
  },
  {
    label: "Xe của tôi",
    path: "/customer/cars",
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

function CustomerHeader() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] border-r border-[#313B45] bg-[#1F2933] text-white lg:block">
      <div className="flex h-full flex-col">
        <Link
          to="/"
          className="flex items-center gap-3 border-b border-[#3C4650] px-6 py-5 transition hover:bg-[#29333D]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F] text-lg text-[#1F2933]">
            🚗
          </div>

          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-wide">
              CarService
            </p>

            <p className="mt-0.5 text-[10px] text-[#AEB8C1]">
              Khu vực khách hàng
            </p>
          </div>
        </Link>

        <div className="px-4 py-6">
          <div className="flex items-center justify-between px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F9AA4]">
              MENU KHÁCH HÀNG
            </p>
          </div>

          <nav className="mt-4 space-y-1">
            {menuItems.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === "/customer" &&
                  location.pathname === "/customer/");

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium transition ${
                    active
                      ? "bg-[#D6A85F] text-[#1F2933] shadow-[0_6px_16px_rgba(214,168,95,0.14)]"
                      : "text-[#C6CDD3] hover:bg-[#313B45] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs transition ${
                      active
                        ? "bg-white/30 text-[#1F2933]"
                        : "bg-white/10 text-[#C6CDD3] group-hover:bg-white/15 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default CustomerHeader;