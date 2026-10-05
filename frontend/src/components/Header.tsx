import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isCustomer =
    location.pathname === "/customer" ||
    location.pathname.startsWith("/customer/");

  const isAdvisor =
    location.pathname.startsWith("/advisor/") ||
    location.pathname === "/customers" ||
    location.pathname === "/customer-cars";

  const isTechnician =
    location.pathname === "/technician" ||
    location.pathname === "/assigned-repairs" ||
    location.pathname === "/vehicle-check" ||
    location.pathname === "/diagnosis" ||
    location.pathname === "/repair-progress" ||
    location.pathname === "/checklist";

  const isAdmin =
    location.pathname === "/admin" ||
    location.pathname.startsWith("/admin/");

  const getRoleClass = (active: boolean) =>
    active
      ? "flex items-center gap-3 rounded-xl bg-[#f3f4f2] px-3 py-2.5 text-xs"
      : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#f3f4f2]";

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-6">
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-[#f7f7f5]"
        >
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#1f2933] text-white shadow-sm">
            <span className="text-lg">🚗</span>
            <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#d6a85f] text-[7px]">
              +
            </span>
          </div>

          <div>
            <p className="text-[15px] font-bold tracking-tight text-[#20252b]">
              CarService
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[#7a838c]">
              Chăm sóc xe chuyên nghiệp
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            to="/"
            className="rounded-xl bg-[#f3f4f2] px-4 py-2.5 text-[12px] font-semibold text-[#20252b] transition hover:bg-[#e9ebe8]"
          >
            Trang chủ
          </Link>

          <Link
            to="/services"
            className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b]"
          >
            Dịch vụ
          </Link>

          <Link
            to="/booking"
            className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b]"
          >
            Đặt lịch
          </Link>

          <Link
            to="/appointments"
            className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b]"
          >
            Lịch hẹn
          </Link>

          <Link
            to="/cars"
            className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b]"
          >
            Xe của tôi
          </Link>
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-2xl border border-[#e1e4e6] bg-white px-3 py-2 transition hover:border-[#cfd4d8] hover:bg-[#f8f8f6]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2933] text-[10px] font-bold text-white">
              NV
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-[#20252b]">
                Tên người dùng
              </p>
              <p className="mt-0.5 text-[10px] text-[#7a838c]">
                {isCustomer
                  ? "Khách hàng"
                  : isAdvisor
                    ? "Cố vấn dịch vụ"
                    : isTechnician
                      ? "Kỹ thuật viên"
                      : isAdmin
                        ? "Quản trị viên"
                        : "Khách hàng"}
              </p>
            </div>

            <span
              className={`ml-1 text-sm text-[#66717c] transition-transform ${
                open ? "rotate-180" : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white p-2 shadow-[0_12px_35px_rgba(31,41,51,0.12)]">
              <div className="px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a9299]">
                  TÀI KHOẢN
                </p>
              </div>

              <Link
                to="/customer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isCustomer
                    ? "bg-[#f3f4f2]"
                    : "hover:bg-[#f3f4f2]"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f2933] text-xs text-white">
                  ✓
                </span>

                <span>
                  <span className="block text-xs font-semibold text-[#20252b]">
                    Trang khách hàng
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#7a838c]">
                    Quản lý thông tin và lịch hẹn
                  </span>
                </span>
              </Link>

              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#f3f4f2]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eceeed] text-xs text-[#374151]">
                  ◉
                </span>

                <span>
                  <span className="block text-xs font-semibold text-[#20252b]">
                    Thông tin tài khoản
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#7a838c]">
                    Cập nhật thông tin cá nhân
                  </span>
                </span>
              </Link>

              <div className="my-2 border-t border-[#eceeed]" />

              <div className="px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a9299]">
                  GIAO DIỆN THEO VAI TRÒ
                </p>
              </div>

              <Link
                to="/customer"
                onClick={() => setOpen(false)}
                className={getRoleClass(isCustomer)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f1ef]">
                  👤
                </span>

                <span className="font-medium text-[#374151]">
                  Khách hàng
                </span>

                {isCustomer && (
                  <span className="ml-auto text-[#d6a85f]">✓</span>
                )}
              </Link>

              <Link
                to="/advisor/customers"
                onClick={() => setOpen(false)}
                className={getRoleClass(isAdvisor)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f1ef]">
                  💬
                </span>

                <span className="font-medium text-[#374151]">
                  Cố vấn dịch vụ
                </span>

                {isAdvisor && (
                  <span className="ml-auto text-[#d6a85f]">✓</span>
                )}
              </Link>

              <Link
                to="/technician"
                onClick={() => setOpen(false)}
                className={getRoleClass(isTechnician)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f1ef]">
                  🔧
                </span>

                <span className="font-medium text-[#374151]">
                  Kỹ thuật viên
                </span>

                {isTechnician && (
                  <span className="ml-auto text-[#d6a85f]">✓</span>
                )}
              </Link>

              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className={getRoleClass(isAdmin)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f1ef]">
                  ⚙
                </span>

                <span className="font-medium text-[#374151]">
                  Quản trị viên
                </span>

                {isAdmin && (
                  <span className="ml-auto text-[#d6a85f]">✓</span>
                )}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;