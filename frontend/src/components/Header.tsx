import { useState } from "react";
import { Link } from "react-router-dom";

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[#f7f7f7]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20252b] text-xs font-bold text-white shadow-sm">
            CS
          </div>

          <div>
            <p className="text-sm font-bold text-[#20252b]">
              CarService
            </p>

            <p className="text-[10px] text-[#8a949e]">
              Quản lý dịch vụ ô tô
            </p>
          </div>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 transition hover:bg-[#f7f7f7]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef0f2] text-[10px] font-bold text-[#20252b]">
              NV
            </div>

            <div className="text-left">
              <p className="text-xs font-semibold text-[#20252b]">
                Tên người dùng
              </p>

              <p className="text-[10px] text-[#8a949e]">
                Tài khoản · Khách hàng
              </p>
            </div>

            <span
              className={`text-sm text-[#7b858f] transition ${
                open ? "rotate-180" : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-lg">
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  TÀI KHOẢN
                </p>
              </div>

              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-xs font-semibold text-[#20252b] transition hover:bg-[#f5f6f7]"
              >
                Thông tin tài khoản
              </Link>

              <div className="my-2 border-t border-[#eef0f2]" />

              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  XEM WIREFRAME THEO VAI TRÒ
                </p>
              </div>

              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#f5f6f7]"
              >
                Khách hàng
              </Link>

              <Link
                to="/customers"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#f5f6f7]"
              >
                Cố vấn dịch vụ
              </Link>

              <Link
                to="/technician"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#f5f6f7]"
              >
                Kỹ thuật viên
              </Link>

              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#f5f6f7]"
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