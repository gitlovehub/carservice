import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getUserDisplayName, logout } from "../pages/auth/auth";

const getInitials = (name?: string) => {
  if (!name?.trim()) return "KH";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (location.pathname === path) return true;

    if (path === "/customer/appointments") {
      return location.pathname === "/appointments";
    }

    if (path === "/customer/cars") {
      return location.pathname === "/cars";
    }

    return false;
  };

  const renderMenu = (mobile = false) =>
    menuItems.map((item) => {
      const active = isActive(item.path);

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium transition ${
            active
              ? "bg-[#D6A85F] text-[#1F2933] shadow-sm"
              : "text-[#C6CDD3] hover:bg-white/10 hover:text-white"
          } ${mobile ? "w-full" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
              active
                ? "bg-[#1F2933]/10"
                : "bg-white/[0.07] text-[#D6A85F]"
            }`}
          >
            {item.icon}
          </span>
          <span>{item.label}</span>
          {active && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1F2933]" />
          )}
        </Link>
      );
    });

  const renderUser = () => (
    <div className="flex min-w-0 items-center gap-3">
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={getUserDisplayName(user)}
          className="h-10 w-10 shrink-0 rounded-xl border border-[#D6A85F]/50 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F] text-xs font-bold text-[#1F2933]">
          {getInitials(getUserDisplayName(user))}
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white">
          {getUserDisplayName(user)}
        </p>
        <p className="mt-1 text-[10px] text-[#AEB8C1]">Khách hàng</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/10 bg-[#1F2933] text-white lg:block">
        <div className="flex h-full flex-col">
          <Link
            to="/"
            className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 px-6 transition hover:bg-white/[0.03]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D6A85F] text-xl text-[#1F2933]">
              🚗
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">CarService</p>
              <p className="mt-1 text-[10px] text-[#AEB8C1]">
                Khu vực khách hàng
              </p>
            </div>
          </Link>

          <div className="px-4 py-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8F9AA4]">
              Không gian của bạn
            </p>

            <nav className="mt-4 space-y-1">{renderMenu()}</nav>
          </div>

          <div className="mt-auto px-4 pb-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              {renderUser()}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  className="flex min-h-9 items-center justify-center rounded-xl border border-white/10 px-2 text-[11px] font-medium text-[#D5DBE0] transition hover:bg-white/10 hover:text-white"
                >
                  Trang chủ
                </Link>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex min-h-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.06] px-2 text-[11px] font-medium text-red-300 transition hover:bg-red-500 hover:text-white"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[#E8E6DF] bg-[#FDFDFC]/95 backdrop-blur-xl lg:hidden">
        <div className="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-lg text-[#D6A85F]">
              🚗
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1F2933]">CarService</p>
              <p className="text-[10px] text-[#7A838C]">
                Khu vực khách hàng
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8E6DF] text-[#1F2933] transition hover:bg-[#F5F4F0]"
          >
            {mobileOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="m6 6 12 12M18 6 6 18"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-[#1F2933] px-4 py-4 text-white sm:px-6">
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              {renderUser()}
            </div>

            <nav className="space-y-1">{renderMenu(true)}</nav>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              <Link
                to="/"
                className="flex min-h-10 items-center justify-center rounded-xl border border-white/10 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Trang chủ
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                className="flex min-h-10 items-center justify-center rounded-xl bg-red-500/10 text-xs font-medium text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default CustomerHeader;