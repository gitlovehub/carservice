import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthSession } from "../contexts/AuthContext";
import { getRoleManagementPage, logout } from "../pages/auth/auth";
import carArt from "../assets/car-atelier.svg";
import "../styles/atelier-public.css";

function AtelierBrand() {
  return <Link className="at-brand" to="/" aria-label="CarService Atelier - Trang chủ">
    <span className="at-brand-mark">C</span>
    <span>carservice<small>ATELIER / AUTO CARE</small></span>
  </Link>;
}

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
  const links = guestLinks.map(({label,href}) => {
    const path = label === "Lịch hẹn" && isAuthenticated
      ? session.account.role === "ADMIN" ? "/admin/appointments"
        : session.account.role === "ADVISOR" ? "/advisor/appointments"
          : "/customer/appointments"
      : label === "Đặt lịch" && isAuthenticated && session.account.role !== "CUSTOMER"
        ? dashboard : href;
    return <Link key={label} to={path} onClick={() => setMenuOpen(false)} className={location.pathname === path ? "active" : ""}>{label}</Link>;
  });
  return <header className="at-public-header">
    <AtelierBrand />
    <nav className="at-public-nav" aria-label="Điều hướng chính">{links}</nav>
    <div className="at-top-actions">
      <button className="at-theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Bật chế độ sáng" : "Bật chế độ tối"} title="Sáng / tối">{theme === "dark" ? "☀" : "☾"}</button>
      {isAuthenticated ? <><Link className="at-btn at-btn-outline at-small" to={dashboard}>Không gian của tôi</Link><button className="at-btn at-btn-outline at-small at-logout" type="button" onClick={() => void logout()}>Đăng xuất</button></> : <Link className="at-btn at-btn-outline at-small" to="/login">Đăng nhập</Link>}
      <button type="button" className="at-menu-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? "✕" : "☰"}</button>
    </div>
    {menuOpen && <nav className="at-mobile-nav" aria-label="Điều hướng mobile">{links}{!isAuthenticated && <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>}</nav>}
  </header>;
}

export function AtelierPublicFooter() {
  return <footer className="at-public-footer"><span>© {new Date().getFullYear()} CarService Atelier — Thiết kế vì trải nghiệm chăm sóc ô tô.</span><span>Website quản lý dịch vụ bảo dưỡng ô tô</span></footer>;
}

export function AtelierCar({ className = "" }: { className?: string }) {
  return <img className={className} src={carArt} alt="Minh họa ô tô thể thao CarService Atelier" />;
}

export function AtelierAuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="at-root at-auth-page">
    <AtelierPublicHeader />
    <main className="at-auth-layout">
      <aside className="at-auth-story">
        <div><div className="at-eyebrow">CARSERVICE / MEMBER EXPERIENCE</div><h2>Một trải nghiệm chăm sóc xe tốt bắt đầu từ sự tin cậy.</h2><p>Đặt lịch, xét duyệt chi phí và theo dõi quá trình sửa chữa — tất cả đều minh bạch.</p></div>
        <div className="at-story-bottom"><div className="at-kicker-line" /><span>AUTOMOTIVE CARE, REIMAGINED.</span></div>
      </aside>
      <div className="at-auth-form-wrap"><section className="at-auth-form"><div className="at-eyebrow">WELCOME TO CARSERVICE</div><h1>{title}</h1><p className="at-auth-desc">{description}</p>{children}</section></div>
    </main>
    <AtelierPublicFooter />
  </div>;
}

export function AtelierField({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return <div className="at-field"><label htmlFor={htmlFor}>{label}</label>{children}{error && <p className="at-field-error">{error}</p>}</div>;
}

export function AtelierAuthError({ message }: { message: string }) {
  return <div className="at-form-error" role="alert">{message}</div>;
}
