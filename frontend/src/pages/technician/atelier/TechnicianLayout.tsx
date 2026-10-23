import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { getUserDisplayName, logout } from "../../auth/auth";

const links = [
  { to: "/technician", label: "Tổng quan", icon: "▦", end: true },
  { to: "/technician/orders", label: "Phiếu được phân công", icon: "▤" },
  { to: "/technician/work", label: "Công việc sửa chữa", icon: "⚙" },
];
export default function TechnicianLayout() {
  const { pathname } = useLocation();
  const [mobile, setMobile] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const session = useAuthSession();
  const account = session.status === "authenticated" ? session.account : null;
  useEffect(() => setMobile(false), [pathname]);
  return <div data-area="technician" data-ktv-theme={theme} style={{ colorScheme: theme }} className="min-h-screen bg-ktv-page font-sans text-ktv-text">
    {mobile && <button type="button" aria-label="Đóng thanh điều hướng" onClick={() => setMobile(false)} className="fixed inset-0 z-30 bg-black/65 lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-ktv-line/60 bg-ktv-sidebar transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}>
      <Link to="/technician" className="flex items-center gap-3 border-b border-ktv-line/60 px-6 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ktv-accent text-lg font-black text-ktv-contrast">C</span>
        <span><strong className="block text-xl tracking-tight text-ktv-strong">carservice</strong><small className="block text-[10px] font-bold tracking-[.17em] text-ktv-highlight">TECHNICAL / WORKSHOP</small></span>
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7">
        <p className="mb-4 px-3 text-[11px] font-bold tracking-[.22em] text-ktv-subtle uppercase">XƯỞNG KỸ THUẬT</p>
        <nav aria-label="Kỹ thuật viên" className="space-y-2">{links.map(item => <NavLink key={item.to} to={item.to} end={item.end}
          className={({isActive}) => `flex items-center gap-3 rounded-xl border-l-[3px] px-3.5 py-3.5 text-sm font-semibold transition-colors ${isActive ? "border-ktv-accent bg-ktv-accent-soft text-ktv-highlight" : "border-transparent text-ktv-muted hover:bg-ktv-accent-soft hover:text-ktv-strong"}`}>
          <span className="w-6 text-center text-xl" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</nav>
        <div className="mt-8 rounded-2xl border border-ktv-accent/15 bg-ktv-panel-alt p-4 text-xs leading-6 text-ktv-muted"><span className="mb-1 block font-bold text-ktv-highlight">LƯU Ý VẬN HÀNH</span>Công việc và phiếu kiểm tra hiển thị từ Laravel theo tài khoản KTV đang đăng nhập.</div>
      </div>
      <div className="border-t border-ktv-line/60 p-4">
        <Link to="/" className="block rounded-lg px-3 py-2 text-sm text-ktv-muted hover:bg-ktv-accent-soft hover:text-ktv-strong">← Website công khai</Link>
        <span className="block px-3 pt-2 text-[11px] text-ktv-subtle">CarService · WD_004</span>
      </div>
    </aside>
    <div className="min-h-screen lg:pl-[258px]">
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-ktv-line/70 bg-ktv-header/95 px-4 backdrop-blur sm:px-7 lg:px-10">
        <div className="flex items-center gap-3"><button type="button" onClick={() => setMobile(true)} aria-label="Mở thanh điều hướng" className="rounded-lg border border-ktv-line px-3 py-2 text-lg lg:hidden">☰</button>
          <div><p className="text-[10px] font-bold tracking-[.19em] text-ktv-accent uppercase">CARSERVICE / TECHNICAL WORKSHOP</p><p className="mt-1 text-xs font-semibold text-ktv-strong">Không gian kỹ thuật viên</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="hidden rounded-full border border-ktv-accent/25 bg-ktv-accent-soft px-3 py-1.5 text-xs font-bold text-ktv-highlight sm:inline-flex">● WORKSPACE</span>
          <button type="button" onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ktv-line bg-ktv-panel text-xl text-ktv-strong transition-colors hover:border-ktv-accent hover:bg-ktv-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ktv-accent"
            aria-label={theme === "dark" ? "Bật chế độ sáng KTV" : "Bật chế độ tối KTV"}
            title={theme === "dark" ? "Chuyển sang Light Mode" : "Chuyển sang Dark Blue Mode"}
            aria-pressed={theme === "dark"}> {theme === "dark" ? "☀" : "☾"} </button>
          <div className="hidden max-w-[190px] truncate text-right text-sm text-ktv-muted md:block">{getUserDisplayName(account)}</div>
          <button type="button" onClick={() => void logout()} className="rounded-xl border border-ktv-line px-3 py-2 text-sm font-medium text-ktv-text hover:border-ktv-accent hover:bg-ktv-accent-soft" title="Đăng xuất">Đăng xuất</button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1536px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10"><Outlet/></main>
    </div>
  </div>;
}
