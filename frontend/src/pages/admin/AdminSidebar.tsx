import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    label: "Tài khoản",
    path: "/admin",
    icon: "♙",
  },
  {
    label: "Dịch vụ",
    path: "/admin/services",
    icon: "◇",
  },
  {
    label: "Kho vật tư",
    path: "/admin/inventory",
    icon: "▰",
  },
  {
    label: "Báo cáo",
    path: "/admin/reports",
    icon: "▣",
  },
];

function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] bg-[#1F2933] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1F2933]">
              <span className="text-base">🚗</span>

              <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#D6A85F] text-[7px] text-[#3A3020]">
                +
              </span>
            </div>

            <div>
              <p className="text-[14px] font-bold text-white">
                CarService
              </p>

              <p className="mt-0.5 text-[9px] font-medium text-[#AEB8C1]">
                Quản trị hệ thống
              </p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#AEB8C1]">
            QUẢN TRỊ
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] transition ${
                    active
                      ? "bg-[#F3E8D2] font-semibold text-[#20252B]"
                      : "font-medium text-[#D5D9DC] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#D6A85F]" />
                  )}

                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] ${
                      active
                        ? "bg-[#D6A85F] text-[#3A3020]"
                        : "bg-white/10 text-[#AEB8C1]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#D6A85F]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1F2933]">
                AD
              </div>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white">
                  Tên người dùng
                </p>

                <p className="mt-0.5 text-[9px] text-[#AEB8C1]">
                  Quản trị viên
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium text-[#AEB8C1] transition hover:bg-white/10 hover:text-white"
          >
            <span>←</span>
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;