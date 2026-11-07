import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/theme";
import { useAuthSession } from "../contexts/authSession";
import { getRoleManagementPage, getUserDisplayName, logout } from "../pages/auth/auth";
import carArt from "../assets/car-atelier.svg";
import { Button, IconButton } from "./ui/Button";
import { buttonClass } from "./ui/buttonClass";

export function AtelierBrand({ to = "/" }: { to?: string }) {
  return <Link className="inline-flex min-w-0 shrink items-center gap-2.5 whitespace-nowrap text-xl leading-tight font-bold text-cs-text no-underline" to={to} aria-label="CarService Atelier – Trang chủ">
    <span className="flex size-8 shrink-0 -rotate-6 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">C</span>
    {/* Dòng phụ ẩn trên màn hình rất hẹp để header không tràn. */}
    <span className="min-w-0">CarService<small className="mt-0.5 hidden text-[11px] font-semibold tracking-[0.12em] text-cs-muted min-[420px]:block">ATELIER · CHĂM SÓC Ô TÔ</small></span>
  </Link>;
}

const customerExtraLinks = [
  { label: "Xe của tôi", href: "/customer/cars" },
  { label: "Tiến độ xe", href: "/repair-status" },
  { label: "Báo giá", href: "/quotation" },
  { label: "Lịch sử", href: "/customer/service-history" },
];

const guestLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/services" },
  { label: "Đặt lịch", href: "/booking" },
  { label: "Lịch hẹn", href: "/appointments" },
];

export function AtelierPublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const session = useAuthSession();
  const location = useLocation();
  const isAuthenticated = session.status === "authenticated";
  const dashboard = isAuthenticated ? (getRoleManagementPage(session.account.role)?.path ?? "/") : "/login";
  const isCustomer = isAuthenticated && session.account.role === "CUSTOMER";
  const allLinks = isCustomer ? [...guestLinks, ...customerExtraLinks] : guestLinks;
  const links = allLinks.map(({label,href}) => {
    const path = label === "Lịch hẹn" && isAuthenticated
      ? session.account.role === "ADMIN" ? "/admin/appointments"
        : session.account.role === "ADVISOR" ? "/advisor/appointments"
          : "/customer/appointments"
      : label === "Đặt lịch" && isAuthenticated && session.account.role !== "CUSTOMER"
        ? dashboard : href;
    const active = location.pathname === path || (label === "Đặt lịch" && location.pathname === "/customer/booking");
    return <Link key={label} to={path} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={active ? "text-cs-accent-text! underline decoration-2 underline-offset-8" : ""}>{label}</Link>;
  });
  const themeLabel = theme === "dark" ? "Bật chế độ sáng" : "Bật chế độ tối";
  return <header className="sticky top-0 z-[60] flex h-[81px] items-center justify-between gap-3 border-b border-cs-border bg-cs-surface px-4 sm:gap-5 sm:px-[5vw] xl:px-[76px]">
    <AtelierBrand />
    <nav className="hidden items-center gap-4 min-[821px]:flex xl:gap-6 [&_a]:relative [&_a]:whitespace-nowrap [&_a]:text-[13px] [&_a]:font-semibold [&_a]:text-cs-text-2 [&_a]:hover:text-cs-accent-text" aria-label="Điều hướng chính">{links}</nav>
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {/* Trên điện thoại nút sáng/tối nằm trong menu để header không tràn. */}
      <IconButton icon={theme === "dark" ? "sun" : "moon"} label={themeLabel} variant="outline" onClick={toggleTheme} className="max-sm:hidden!"/>
      {isAuthenticated ? <>
        {isCustomer && <Link to="/customer/account" aria-label="Tài khoản của tôi" title="Tài khoản của tôi" className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cs-accent text-xs font-bold text-cs-accent-contrast no-underline ring-2 ring-transparent transition hover:ring-cs-accent/40">{session.account.avatar ? <img src={session.account.avatar} alt="Ảnh đại diện" className="size-full object-cover" referrerPolicy="no-referrer" /> : (getUserDisplayName(session.account).charAt(0) || "K").toUpperCase()}</Link>}
        <Button variant="outline" size="sm" className="max-sm:hidden!" onClick={() => void logout()}>Đăng xuất</Button>
      </> : <Link className={buttonClass({ variant: "outline", size: "sm", className: "no-underline" })} to="/login">Đăng nhập</Link>}
      <IconButton icon={menuOpen ? "close" : "menu"} label={menuOpen ? "Đóng menu" : "Mở menu"} variant="outline" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)} className="min-[821px]:hidden!"/>
    </div>
    {menuOpen && <nav className="absolute inset-x-0 top-full grid gap-1 border-b border-cs-border bg-cs-surface px-4 py-3 shadow-raised min-[821px]:hidden [&_a]:cursor-pointer [&_a]:rounded-control [&_a]:px-3 [&_a]:py-2.5 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-cs-text [&_a]:hover:bg-cs-hover" aria-label="Điều hướng trên điện thoại">
      {links}
      {!isAuthenticated && <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>}
      <div className="mt-1 flex flex-wrap gap-2 border-t border-cs-border pt-3 sm:hidden">
        <Button variant="outline" size="sm" icon={theme === "dark" ? "sun" : "moon"} onClick={toggleTheme}>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</Button>
        {isAuthenticated && <Button variant="outline" size="sm" icon="logout" onClick={() => void logout()}>Đăng xuất</Button>}
      </div>
    </nav>}
  </header>;
}

export function AtelierPublicFooter() {
  return <footer className="flex flex-wrap justify-between gap-5 border-t border-cs-border bg-cs-surface px-5 py-7 text-xs text-cs-muted sm:px-[5vw] xl:px-[76px]"><span>© {new Date().getFullYear()} CarService — Thiết kế trải nghiệm chăm sóc ô tô.</span><span>Website quản lý dịch vụ bảo dưỡng ô tô</span></footer>;
}

export function AtelierCar({ className = "" }: { className?: string }) {
  return <img className={className} src={carArt} alt="Minh họa ô tô thể thao CarService Atelier" />;
}

export function AtelierAuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <main className="flex w-full flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-[480px]" aria-label={title}>
          <h1 className="mb-3 mt-4 text-4xl font-extrabold tracking-normal sm:text-[42px]">
            {title}
          </h1>
          <p className="mb-8 leading-7 text-cs-muted">
            {description}
          </p>
          {children}
        </section>
      </main>
    </>
  );
}

export function AtelierField({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-2"><label className="text-xs font-bold" htmlFor={htmlFor}>{label}</label>{children}{error && <p className="text-xs font-semibold text-danger">{error}</p>}</div>;
}

export function AtelierAuthError({ message }: { message: string }) {
  return <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 leading-6 text-danger-fg" role="alert">{message}</div>;
}
