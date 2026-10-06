import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function RoleAccountMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
          <p className="max-w-[120px] truncate text-[10px] font-semibold text-[#20252B]">
            Tên người dùng
          </p>

          <p className="mt-0.5 text-[9px] text-[#8A949E]">
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
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_16px_40px_rgba(31,41,51,0.12)]">
          <div className="border-b border-[#E1E4E6] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              TÀI KHOẢN
            </p>
          </div>

          <div className="p-2">
            <Link
              to="/customer"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/customer"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D6A85F] text-[12px] text-[#3A3020]">
                ✓
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Trang khách hàng
                </p>
                <p className="mt-0.5 text-[9px] text-[#8A949E]">
                  Quản lý thông tin và lịch hẹn
                </p>
              </div>
            </Link>

            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                location.pathname === "/account"
                  ? "bg-[#F3E8D2]"
                  : "hover:bg-[#F7F7F5]"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[12px] text-[#3A3020]">
                ◉
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Thông tin tài khoản
                </p>
                <p className="mt-0.5 text-[9px] text-[#8A949E]">
                  Cập nhật thông tin cá nhân
                </p>
              </div>
            </Link>
          </div>

          <div className="border-y border-[#E1E4E6] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              GIAO DIỆN THEO VAI TRÒ
            </p>
          </div>

          <div className="p-2">
            <Link
              to="/customer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px]">
                👤
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Khách hàng
                </p>
              </div>
            </Link>

            <Link
              to="/advisor/customers"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px]">
                💬
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Cố vấn dịch vụ
                </p>
              </div>
            </Link>

            <Link
              to="/technician"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px]">
                🔧
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Kỹ thuật viên
                </p>
              </div>
            </Link>

            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F7F7F5]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8D2] text-[13px]">
                ⚙
              </span>

              <div>
                <p className="text-[11px] font-semibold text-[#20252B]">
                  Quản trị viên
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleAccountMenu;