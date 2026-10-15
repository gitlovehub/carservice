import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchApi } from "../services/api";
import {
  getRoleManagementPage,
  getUserDisplayName,
  logout,
} from "../pages/auth/auth";

type AuthUser = {
  id?: number | string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
};

function Header() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const managementPage = getRoleManagementPage(user?.role);

  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem("user");
          }
        }

        try {
          const response = await fetchApi("/me");

          if (response?.account) {
            setUser(response.account);
            localStorage.setItem("user", JSON.stringify(response.account));
          }
        } catch {
          const latestUser = localStorage.getItem("user");

          if (latestUser) {
            try {
              setUser(JSON.parse(latestUser));
            } catch {
              setUser(null);
            }
          }
        }
      } else {
        setUser(null);
        setOpen(false);
      }
    };

    checkLogin();
    window.addEventListener("storage", checkLogin);
    window.addEventListener("user-updated", checkLogin);

    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("user-updated", checkLogin);
    };
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setOpen(false);
    setMobileOpen(false);
    logout();
  };

  const navLinkClass = (active: boolean) =>
    `inline-flex items-center rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
      active
        ? "bg-[#F3E8D2] text-[#765728]"
        : "text-[#606B75] hover:bg-[#F5F4F0] hover:text-[#1F2933]"
    }`;

  const getInitials = (name?: string) => {
    if (!name?.trim()) return "KH";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navigation = [
    { label: "Trang chủ", path: "/", active: location.pathname === "/" },
    {
      label: "Dịch vụ",
      path: "/services",
      active: location.pathname === "/services",
    },
    {
      label: "Đặt lịch",
      path: "/booking",
      active: location.pathname === "/booking",
    },
    {
      label: "Lịch hẹn",
      path: "/appointments",
      active: ["/appointments", "/customer/appointments"].includes(
        location.pathname,
      ),
    },
    {
      label: "Xe của tôi",
      path: "/cars",
      active: ["/cars", "/customer/cars"].includes(location.pathname),
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8E6DF] bg-[#FDFDFC]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link to="/" className="group flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-[#D6A85F] shadow-sm transition group-hover:bg-[#35414D]">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M3 13l1.5-5A2.5 2.5 0 016.9 6h10.2a2.5 2.5 0 012.4 2l1.5 5v5h-2v-2H5v2H3v-5z"
              />
              <circle cx="7.5" cy="13" r="1.5" strokeWidth={1.6} />
              <circle cx="16.5" cy="13" r="1.5" strokeWidth={1.6} />
              <path
                strokeLinecap="round"
                strokeWidth={1.6}
                d="M6 9h12"
              />
            </svg>
          </div>

          <div>
            <p className="text-base font-bold tracking-[-0.5px] text-[#1F2933]">
              CarService
            </p>
            <p className="mt-0.5 text-[10px] tracking-wide text-[#7A838C]">
              CHĂM SÓC XE CHUYÊN NGHIỆP
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={navLinkClass(item.active)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold text-[#4E5963] transition hover:bg-[#F5F4F0] hover:text-[#1F2933]"
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 text-xs font-semibold text-white transition hover:bg-[#35414D]"
              >
                Đăng ký
                <span aria-hidden="true">↗</span>
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label="Mở menu tài khoản"
                className="flex items-center gap-3 rounded-2xl border border-[#E8E6DF] bg-white px-3 py-2 transition hover:border-[#D6A85F]"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={getUserDisplayName(user)}
                    className="h-9 w-9 rounded-xl border border-[#E8D6B5] object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-[#E3C38D]">
                    {getInitials(getUserDisplayName(user))}
                  </div>
                )}

                <div className="max-w-[130px] text-left">
                  <p className="truncate text-xs font-semibold text-[#1F2933]">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#7A838C]">
                    {user?.role || "Khách hàng"}
                  </p>
                </div>

                <svg
                  className={`h-4 w-4 text-[#7A838C] transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-[#E8E6DF] bg-white p-2 shadow-[0_18px_50px_rgba(31,41,51,0.12)]">
                  <div className="border-b border-[#F0EFEA] px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#92999F]">
                      Tài khoản
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-[#4E5963]">
                      {user?.email || getUserDisplayName(user)}
                    </p>
                  </div>

                  <div className="mt-1 space-y-1">
                    <Link
                      to="/"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4E5963] transition hover:bg-[#F7F7F5]"
                    >
                      Trang chủ
                    </Link>

                    {managementPage && (
                      <Link
                        to={managementPage.path}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl bg-[#FBF5E9] px-3 py-2.5 text-xs font-semibold text-[#8A642D] transition hover:bg-[#F3E8D2]"
                      >
                        {managementPage.label}
                      </Link>
                    )}

                    <Link
                      to="/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4E5963] transition hover:bg-[#F7F7F5]"
                    >
                      Thông tin tài khoản
                    </Link>
                  </div>

                  <div className="my-2 border-t border-[#F0EFEA]" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E6DF] text-[#1F2933] transition hover:bg-[#F5F4F0] sm:hidden"
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
        <div className="border-t border-[#E8E6DF] bg-[#FDFDFC] px-5 py-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  item.active
                    ? "bg-[#F3E8D2] text-[#765728]"
                    : "text-[#4E5963] hover:bg-[#F5F4F0]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-[#E8E6DF] pt-4">
            {!isLoggedIn ? (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  className="flex min-h-11 items-center justify-center rounded-xl border border-[#E1DFD7] px-4 text-sm font-semibold text-[#1F2933]"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[#1F2933] px-4 text-sm font-semibold text-white"
                >
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl bg-[#F5F4F0] p-3">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={getUserDisplayName(user)}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-[#E3C38D]">
                      {getInitials(getUserDisplayName(user))}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1F2933]">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="truncate text-xs text-[#7A838C]">
                      {user?.email || user?.role || "Khách hàng"}
                    </p>
                  </div>
                </div>

                {managementPage && (
                  <Link
                    to={managementPage.path}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-[#8A642D] hover:bg-[#FBF5E9]"
                  >
                    {managementPage.label}
                  </Link>
                )}

                <Link
                  to="/account"
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-[#4E5963] hover:bg-[#F5F4F0]"
                >
                  Thông tin tài khoản
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;