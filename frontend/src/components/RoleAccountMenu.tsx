import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../pages/auth/auth";

function RoleAccountMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const menuItems = [
    {
      path: "/customer",
      icon: "⌂",
      title: "Trang khách hàng",
      description: "Tổng quan tài khoản",
    },
    {
      path: "/account",
      icon: "◉",
      title: "Thông tin tài khoản",
      description: "Cập nhật thông tin cá nhân",
    },
    {
      path: "/customer/booking",
      icon: "+",
      title: "Đặt lịch",
      description: "Tạo lịch hẹn mới",
    },
    {
      path: "/customer/appointments",
      icon: "▣",
      title: "Lịch hẹn",
      description: "Theo dõi lịch hẹn",
    },
    {
      path: "/customer/cars",
      icon: "🚗",
      title: "Xe của tôi",
      description: "Quản lý phương tiện",
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition sm:px-3 ${
          open
            ? "border-[#D6A85F] bg-[#F7F7F5]"
            : "border-[#E1E4E6] bg-white hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F2933] text-[9px] font-bold text-white">
          NV
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[120px] truncate text-[11px] font-semibold text-[#20252B]">
            Tên người dùng
          </p>

          <p className="mt-0.5 text-[10px] text-[#8A949E]">
            Khách hàng
          </p>
        </div>

        <span
          className={`hidden text-[11px] text-[#8A949E] transition sm:block ${
            open ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[290px] overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_18px_45px_rgba(31,41,51,0.14)]">
          <div className="flex items-center gap-3 border-b border-[#E1E4E6] px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2933] text-[10px] font-bold text-white">
              NV
            </div>

            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-[#20252B]">
                Tên người dùng
              </p>

              <p className="mt-0.5 text-[10px] text-[#8A949E]">
                Khách hàng
              </p>
            </div>
          </div>

          <div className="p-2">
            <p className="px-3 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              TÀI KHOẢN
            </p>

            <div className="space-y-1">
              {menuItems.map((item) => {
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                      active
                        ? "bg-[#F3E8D2]"
                        : "hover:bg-[#F7F7F5]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] ${
                        active
                          ? "bg-[#D6A85F] text-[#3A3020]"
                          : "bg-[#F3E8D2] text-[#3A3020]"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#20252B]">
                        {item.title}
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#8A949E]">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#E1E4E6] p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F2] text-[13px] text-[#3A3020]">
                ↪
              </span>

              <div>
                <p className="text-[12px] font-semibold text-[#20252B]">
                  Đăng xuất
                </p>

                <p className="mt-0.5 text-[10px] text-[#8A949E]">
                  Thoát khỏi tài khoản
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleAccountMenu;