import { useState } from "react";
import { Link } from "react-router-dom";

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-[#e1e4e7] bg-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
            CS
          </div>

          <div>
            <p className="text-[14px] font-bold">CarService</p>
            <p className="text-[10px] text-[#8a949e]">
              Quản lý dịch vụ ô tô
            </p>
          </div>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9ecef] text-[10px] font-bold">
              NV
            </div>

            <div className="text-left">
              <p className="text-[12px] font-semibold">
                Tên người dùng
              </p>

              <p className="text-[10px] text-[#8a949e]">
                Tài khoản · Khách hàng
              </p>
            </div>

            <span className="text-[14px] text-[#7b858f]">
              ⌄
            </span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-xl border border-[#e1e4e7] bg-white p-4 shadow-lg">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                TÀI KHOẢN
              </p>

              <p className="mb-4 text-[12px] font-semibold">
                Thông tin tài khoản
              </p>

              <div className="border-t border-[#eef0f2] pt-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                  XEM WIREFRAME THEO VAI TRÒ
                </p>

                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#f6f7f8]"
                >
                  Khách hàng
                </Link>

                <Link
                  to="/customers"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#f6f7f8]"
                >
                  Cố vấn dịch vụ
                </Link>

                <Link
                  to="/technician"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#f6f7f8]"
                >
                  Kỹ thuật viên
                </Link>

                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[12px] hover:bg-[#f6f7f8]"
                >
                  Quản trị viên
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;