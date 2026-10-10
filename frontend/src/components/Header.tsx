import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchApi } from "../services/api";
import {
  getRoleManagementPage,
  getUserDisplayName,
} from "../pages/auth/auth";

type AuthUser = {
  id?: number | string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
};

function Header() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const managementPage = getRoleManagementPage(user?.role);

  // Lắng nghe trạng thái đăng nhập và tải thông tin tài khoản
  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          const response = await fetchApi("/me");
          if (response?.account) {
            setUser(response.account);
            localStorage.setItem("user", JSON.stringify(response.account));
          }
        } catch {
          // Bỏ qua lỗi token hết hạn hoặc kết nối
        }
      } else {
        setUser(null);
      }
    };

    checkLogin();
    window.addEventListener("storage", checkLogin);

    return () => {
      window.removeEventListener("storage", checkLogin);
    };
  }, [location]);

  // Đóng dropdown khi nhấn ra ngoài
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

  const handleLogout = async () => {
    try {
      await fetchApi("/logout", { method: "POST" });
    } catch {
      // Tiếp tục xóa dữ liệu cục bộ dù backend có lỗi
    }

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsLoggedIn(false);
    setOpen(false);
    navigate("/login");
  };

  const navLinkClass = (isActive: boolean) =>
    `rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
      isActive
        ? "bg-slate-100 text-slate-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  // Lấy ký tự đại diện cho Avatar từ họ tên
  const getInitials = (name?: string) => {
    if (!name) return "KH";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        {/* LOGO */}
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-xl py-1 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition group-hover:bg-slate-800">
            <svg
              className="h-5 w-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">
              CarService
            </p>
            <p className="text-[10px] text-slate-500">
              Dịch vụ chăm sóc ô tô
            </p>
          </div>
        </Link>

        {/* NAVIGATION DESKTOP */}
        <nav className="hidden items-center gap-1.5 lg:flex">
          <Link
            to="/"
            className={navLinkClass(location.pathname === "/")}
          >
            Trang chủ
          </Link>

          <Link
            to="/services"
            className={navLinkClass(location.pathname === "/services")}
          >
            Dịch vụ
          </Link>

          <Link
            to="/booking"
            className={navLinkClass(location.pathname === "/booking")}
          >
            Đặt lịch
          </Link>

          <Link
            to="/appointments"
            className={navLinkClass(
              ["/appointments", "/customer/appointments"].includes(
                location.pathname,
              ),
            )}
          >
            Lịch hẹn
          </Link>

          <Link
            to="/cars"
            className={navLinkClass(
              ["/cars", "/customer/cars"].includes(location.pathname),
            )}
          >
            Xe của tôi
          </Link>
        </nav>

        {/* KHU VỰC TÀI KHOẢN */}
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 font-mono text-xs font-bold text-amber-400">
                  {getInitials(getUserDisplayName(user))}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="max-w-[120px] truncate text-xs font-semibold text-slate-900">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {user?.role || "Khách hàng"}
                  </p>
                </div>

                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* DROPDOWN MENU */}
              {open && (
                <div className="absolute right-0 top-full z-50 mt-2.5 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tài khoản người dùng
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                      {user?.email}
                    </p>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <Link
                      to="/"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      Trang chủ
                    </Link>

                    {managementPage && (
                      <Link
                        to={managementPage.path}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                      >
                        <svg
                          className="h-4 w-4 text-amber-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                          />
                        </svg>
                        {managementPage.label}
                      </Link>
                    )}

                    <Link
                      to="/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Thông tin tài khoản
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <svg
                      className="h-4 w-4 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;