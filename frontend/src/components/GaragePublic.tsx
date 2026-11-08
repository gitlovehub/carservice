import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./ui/Icon";
import { CUSTOMER_ACCOUNT_LINKS } from "../layouts/customerAccountNav";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/theme";
import { useAuthSession } from "../contexts/authSession";
import { getRoleManagementPage, getUserDisplayName, logout } from "../pages/auth/auth";
import carArt from "../assets/car-garage.svg";
import { Button, IconButton } from "./ui/Button";
import { buttonClass } from "./ui/buttonClass";

export function GarageBrand({ to = "/" }: { to?: string }) {
  return <Link className="inline-flex min-w-0 shrink items-center gap-2.5 whitespace-nowrap text-xl leading-tight font-bold text-cs-text no-underline" to={to} aria-label="CarService Garage – Trang chủ">
    <span className="flex size-8 shrink-0 -rotate-6 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">C</span>
    {/* Dòng phụ ẩn trên màn hình rất hẹp để header không tràn. */}
    <span className="min-w-0">CarService<small className="mt-0.5 hidden text-[11px] font-semibold tracking-[0.12em] text-cs-muted min-[420px]:block">GARAGE · CHĂM SÓC Ô TÔ</small></span>
  </Link>;
}


const guestLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/services" },
  { label: "Đặt lịch", href: "/booking" },
  { label: "Lịch hẹn", href: "/appointments" },
];

export function GaragePublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const session = useAuthSession();
  const location = useLocation();
  const isAuthenticated = session.status === "authenticated";
  const dashboard = isAuthenticated ? (getRoleManagementPage(session.account.role)?.path ?? "/") : "/login";
  const isCustomer = isAuthenticated && session.account.role === "CUSTOMER";
  // Khách: Lịch hẹn, Xe, Tiến độ, Báo giá, Lịch sử nằm trong khu "Hồ sơ của tôi" (avatar / menu tài khoản), không lặp ở menu chính.
  const allLinks = isCustomer ? guestLinks.filter(link => link.label !== "Lịch hẹn") : guestLinks;
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
  const displayName = isAuthenticated ? getUserDisplayName(session.account) : "";
  const initial = (displayName.charAt(0) || "K").toUpperCase();
  const accountLinks: AccountLink[] = isCustomer
    ? CUSTOMER_ACCOUNT_LINKS
    : [{ label: "Trang quản lý", to: dashboard, icon: "home" }];
  const avatar = (size: string) => <span className={`inline-flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-cs-accent text-xs font-bold text-cs-accent-contrast`}>
    {isAuthenticated && session.account.avatar ? <img src={session.account.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer"/> : initial}
  </span>;

  return <header className="sticky top-0 z-[60] flex h-[81px] items-center justify-between gap-3 border-b border-cs-border bg-cs-surface px-4 sm:gap-5 sm:px-[5vw] xl:px-[76px]">
    <GarageBrand />
    <nav className="hidden items-center gap-4 min-[821px]:flex xl:gap-6 [&_a]:relative [&_a]:whitespace-nowrap [&_a]:text-[13px] [&_a]:font-semibold [&_a]:text-cs-text-2 [&_a]:hover:text-cs-accent-text" aria-label="Điều hướng chính">{links}</nav>
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <IconButton icon={theme === "dark" ? "sun" : "moon"} label={themeLabel} variant="outline" onClick={toggleTheme} className="max-[820px]:hidden!"/>
      {isAuthenticated
        ? <div className="max-[820px]:hidden"><AccountMenu name={displayName} email={session.account.email} trigger={avatar("size-10")} links={accountLinks}/></div>
        : session.status === "checking"
          // Đang kiểm tra phiên: giữ chỗ cho avatar, không hiện nhầm "Đăng nhập".
          ? <span className="size-10 animate-pulse rounded-full bg-cs-surface-2 max-[820px]:hidden" aria-hidden="true"/>
          : <Link className={buttonClass({ variant: "outline", size: "sm", className: "no-underline max-[820px]:hidden!" })} to="/login">Đăng nhập</Link>}
      <IconButton icon="menu" label="Mở menu" variant="outline" aria-expanded={menuOpen} aria-controls="mobile-drawer" onClick={() => setMenuOpen(true)} className="min-[821px]:hidden!"/>
    </div>
    <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)}>
      {isAuthenticated && <div className="mb-3 flex items-center gap-3 border-b border-cs-border pb-4">
        {avatar("size-11")}
        <div className="min-w-0"><p className="truncate text-sm font-bold text-cs-text">{displayName}</p><p className="truncate text-xs text-cs-muted">{session.account.email}</p></div>
      </div>}
      <nav className="grid gap-1 [&_a]:rounded-control [&_a]:px-3 [&_a]:py-2.5 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-cs-text [&_a]:no-underline [&_a]:hover:bg-cs-hover" aria-label="Điều hướng trên điện thoại">
        {links}

        {!isAuthenticated && <><Link to="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link></>}
      </nav>
      {isAuthenticated && <nav className="mt-3 grid gap-1 border-t border-cs-border pt-3" aria-label="Tài khoản của tôi">
        {!isCustomer && <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cs-muted">Quản lý</p>}
        {accountLinks.map((l, i) => <div key={l.to}>
          {groupStart(accountLinks, i) && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cs-muted">{groupStart(accountLinks, i)}</p>}
          <Link to={l.to} onClick={() => setMenuOpen(false)} aria-current={location.pathname === l.to ? "page" : undefined}
            className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold no-underline hover:bg-cs-hover ${location.pathname === l.to ? "bg-cs-soft text-cs-accent-text" : "text-cs-text"}`}><Icon name={l.icon} size={18}/>{l.label}</Link>
        </div>)}
      </nav>}
      <div className="mt-auto grid gap-2 border-t border-cs-border pt-4">
        <Button variant="outline" size="sm" icon={theme === "dark" ? "sun" : "moon"} onClick={toggleTheme}>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</Button>
        {isAuthenticated && <Button variant="danger-outline" size="sm" icon="logout" onClick={() => void logout()}>Đăng xuất</Button>}
      </div>
    </MobileDrawer>
  </header>;
}

/** Dropdown tài khoản: mở khi rê chuột / bấm / focus vào avatar; chứa liên kết tài khoản và Đăng xuất. */
type AccountLink = { label: string; to: string; icon: IconName; group?: string };

/** Tiêu đề nhóm khi sang nhóm mới (Tài khoản / Dịch vụ / Chi phí). */
const groupStart = (links: AccountLink[], index: number) => links[index].group && (index === 0 || links[index - 1].group !== links[index].group) ? links[index].group : null;

function AccountMenu({ name, email, trigger, links }: { name: string; email?: string | null; trigger: ReactNode; links: AccountLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const location = useLocation();
  // Đóng menu khi chuyển trang.
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) { setPath(location.pathname); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const show = () => { window.clearTimeout(closeTimer.current); setOpen(true); };
  const hide = () => { closeTimer.current = window.setTimeout(() => setOpen(false), 150); };

  return <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide} data-testid="account-menu">
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Tài khoản" title={name}
      className="inline-flex cursor-pointer rounded-full ring-2 ring-transparent transition hover:ring-cs-accent/40 focus-visible:ring-cs-accent"
      onClick={() => setOpen(o => !o)}>{trigger}</button>
    {open && <div role="menu" className="absolute right-0 top-full z-[70] mt-2 w-64 rounded-2xl border border-cs-border bg-cs-surface p-2 shadow-raised">
      <div className="border-b border-cs-border px-3 pb-3 pt-2"><p className="truncate text-sm font-bold text-cs-text">{name}</p>{email && <p className="truncate text-xs text-cs-muted">{email}</p>}</div>
      <div className="max-h-[min(70dvh,520px)] overflow-y-auto py-1">{links.map((l, i) => <div key={l.to}>
        {groupStart(links, i) && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-cs-muted">{groupStart(links, i)}</p>}
        <Link role="menuitem" to={l.to} className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold text-cs-text no-underline hover:bg-cs-hover"><Icon name={l.icon} size={16}/>{l.label}</Link>
      </div>)}</div>
      <button type="button" role="menuitem" onClick={() => void logout()} className="flex w-full cursor-pointer items-center gap-2.5 rounded-control border-t border-cs-border px-3 py-2.5 text-sm font-semibold text-cs-danger hover:bg-cs-hover"><Icon name="logout" size={16}/>Đăng xuất</button>
    </div>}
  </div>;
}

/** Menu điện thoại: ngăn kéo trượt từ phải sang, nền mờ; đóng bằng nút ✕, bấm nền, Esc hoặc khi chuyển trang. */
function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const location = useLocation();
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) { setPath(location.pathname); if (open) onClose(); }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return <div className={`fixed inset-0 z-[80] min-[821px]:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open} inert={!open}>
    <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose}/>
    <aside id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu"
      className={`absolute right-0 top-0 flex h-dvh w-[min(320px,86vw)] flex-col overflow-y-auto bg-cs-surface p-4 shadow-raised transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-cs-text">Menu</span><IconButton icon="close" label="Đóng menu" variant="ghost" onClick={onClose}/></div>
      {children}
    </aside>
  </div>;
}

export function GaragePublicFooter() {
  return <footer className="flex flex-wrap justify-between gap-5 border-t border-cs-border bg-cs-surface px-5 py-7 text-xs text-cs-muted sm:px-[5vw] xl:px-[76px]"><span>© {new Date().getFullYear()} CarService — Thiết kế trải nghiệm chăm sóc ô tô.</span><span>Website quản lý dịch vụ bảo dưỡng ô tô</span></footer>;
}

export function GarageCar({ className = "" }: { className?: string }) {
  return <img className={className} src={carArt} alt="Minh họa ô tô thể thao CarService Garage" />;
}

export function GarageAuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
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

export function GarageField({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-2"><label className="text-xs font-bold" htmlFor={htmlFor}>{label}</label>{children}{error && <p className="text-xs font-semibold text-danger">{error}</p>}</div>;
}

export function GarageAuthError({ message }: { message: string }) {
  return <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 leading-6 text-danger-fg" role="alert">{message}</div>;
}
