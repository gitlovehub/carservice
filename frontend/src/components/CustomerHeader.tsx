import { Link, useLocation } from "react-router-dom";
import { getUserDisplayName } from "../pages/auth/auth";

const menuItems = [
  {
    label: "Đặt lịch",
    path: "/booking",
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
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] border-r border-[#313B45] bg-[#1F2933] text-white lg:block">
      <div className="flex h-full flex-col">
        <Link
          to="/"
          className="flex cursor-pointer items-center gap-3 border-b border-[#3C4650] px-6 py-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6A85F] text-lg text-[#1F2933]">
            🚗
          </div>

          <div>
            <p className="text-[13px] font-bold">CarService</p>

            <p className="mt-0.5 text-[10px] text-[#AEB8C1]">
              Khu vực khách hàng
            </p>
          </div>
        </Link>

        <div className="px-4 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F9AA4]">
            MENU KHÁCH HÀNG
          </p>

          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium transition ${
                    active
                      ? "bg-[#D6A85F] text-[#1F2933]"
                      : "text-[#C6CDD3] hover:bg-[#313B45] hover:text-white"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs">
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-5">
          <div className="rounded-2xl border border-[#3C4650] bg-[#29333D] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D6A85F] text-[10px] font-bold text-[#1F2933]">
                NV
              </div>

              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white">
                  {getUserDisplayName(user)}
                </p>

                <p className="mt-0.5 text-[10px] text-[#AEB8C1]">
                  Khách hàng
                </p>
              </div>
            </div>

            <Link
              to="/"
              className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-[#4A5661] px-3 py-2.5 text-[11px] font-medium text-[#D5DBE0] transition hover:bg-[#313B45] hover:text-white"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default CustomerHeader;