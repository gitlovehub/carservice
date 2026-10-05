import { useState } from "react";
import { Link } from "react-router-dom";

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d5d9dd] bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#eef0f2]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#243b53] text-xs font-bold text-white shadow-sm">
            CS
          </div>

          <div>
            <p className="text-sm font-bold text-[#20252b]">
              CarService
            </p>

            <p className="text-[10px] text-[#66717c]">
              Quản lý dịch vụ ô tô
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#20252b] transition hover:bg-[#eef0f2]"
          >
            Trang chủ
          </Link>

          <Link
            to="/services"
            className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#66717c] transition hover:bg-[#eef0f2] hover:text-[#20252b]"
          >
            Dịch vụ
          </Link>

          <Link
            to="/booking"
            className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#66717c] transition hover:bg-[#eef0f2] hover:text-[#20252b]"
          >
            Đặt lịch
          </Link>

          <Link
            to="/appointments"
            className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#66717c] transition hover:bg-[#eef0f2] hover:text-[#20252b]"
          >
            Lịch hẹn
          </Link>

          <Link
            to="/cars"
            className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#66717c] transition hover:bg-[#eef0f2] hover:text-[#20252b]"
          >
            Xe của tôi
          </Link>
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-xl border border-[#d5d9dd] bg-white px-3 py-2 transition hover:bg-[#eef0f2]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3e7ea] text-[10px] font-bold text-[#243b53]">
              NV
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-[#20252b]">
                Tên người dùng
              </p>

              <p className="text-[10px] text-[#66717c]">
                Tài khoản · Khách hàng
              </p>
            </div>

            <span
              className={`text-sm text-[#66717c] transition ${
                open ? "rotate-180" : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-[#d5d9dd] bg-white p-2 shadow-lg">
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#66717c]">
                  TÀI KHOẢN
                </p>
              </div>

              <Link
                to="/customer"
                onClick={() => setOpen(false)}
                className="block rounded-xl bg-[#eef0f2] px-3 py-3 text-xs font-semibold text-[#20252b] transition hover:bg-[#e3e7ea]"
              >
                Trang khách hàng
              </Link>

              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-xl px-3 py-3 text-xs font-semibold text-[#20252b] transition hover:bg-[#eef0f2]"
              >
                Thông tin tài khoản
              </Link>

              <div className="my-2 border-t border-[#d5d9dd]" />

              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#66717c]">
                  XEM GIAO DIỆN THEO VAI TRÒ
                </p>
              </div>

              <Link
                to="/customer"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#eef0f2]"
              >
                Khách hàng
              </Link>

              <Link
                to="/advisor/customers"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#eef0f2]"
              >
                Cố vấn dịch vụ
              </Link>

              <Link
                to="/technician"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#eef0f2]"
              >
                Kỹ thuật viên
              </Link>

              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#eef0f2]"
              >
                Quản trị viên
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;