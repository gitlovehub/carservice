import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../contexts/authSession";
import { useTheme } from "../contexts/theme";
import { getUserDisplayName, getUserInitials, logout } from "../pages/auth/auth";
import PageTransition from "../components/PageTransition";
import { Dropdown, IconButton } from "../components/ui";
import { Icon } from "../components/ui/Icon";
import { LABELS } from "../config/labels";
import { useGarageInfo } from "../services/garageService";
import { LiveClock } from "./LiveClock";
import { areaInfo, crumbs, isNavigationCurrent, navGroups } from "./navigation";
import { ShellContext } from "./ShellContext";
import "./shell.css";
import "./workspace.css";
import "../styles/garage-customer-complete.css";

type WorkArea = "advisor" | "admin";
const SIDEBAR_KEY = "carservice-sidebar";
const roleLabel: Record<WorkArea, string> = { advisor: "Cố vấn dịch vụ", admin: "Quản trị viên" };

function readCollapsed() {
  try { return localStorage.getItem(SIDEBAR_KEY) === "collapsed"; } catch { return false; }
}

/** Menu nhóm theo nghiệp vụ. Mục trỏ tới danh sách đã lọc (?status=...) chỉ sáng khi đúng bộ lọc đó. */
function SidebarNav({ area, onNavigate }: { area: WorkArea; onNavigate: () => void }) {
  const { pathname, search } = useLocation();
  const isCurrent = (path: string) => isNavigationCurrent(area, path, pathname, search);
  return <nav className="cs-ws-nav" aria-label={`Điều hướng ${roleLabel[area]}`}>
    {navGroups(area).map(group => <div key={group.label} className="cs-ws-group" role="group" aria-label={group.label}>
      {group.label && <p className="cs-ws-group-label" aria-hidden="true">{group.label}</p>}
      <ul className="cs-ws-list">
        {group.items.map(({ path, label, icon, soon }) => {
          const current = isCurrent(path);
          return <li key={path}>
            <Link to={path} onClick={onNavigate} title={label} aria-current={current ? "page" : undefined}
              className={`cs-ws-link${current ? " is-active" : ""}`}>
              <Icon name={icon} size={18}/>
              <span className="cs-ws-label">{label}{soon && <span className="sr-only"> (sắp có)</span>}</span>
              {soon && <span className="cs-ws-soon" aria-hidden="true">Sắp có</span>}
            </Link>
          </li>;
        })}
      </ul>
    </div>)}
  </nav>;
}

function Breadcrumbs({ area }: { area: WorkArea }) {
  const { pathname, search } = useLocation();
  const trail = crumbs(area, pathname, search);
  return <nav className="cs-ws-crumbs" aria-label="Vị trí trang">
    <ol>
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;
        return <li key={`${crumb.label}-${index}`}>
          {index > 0 && <Icon name="chevron-right" size={14} className="shrink-0 opacity-60"/>}
          {last || !crumb.to ? <span aria-current={last ? "page" : undefined}>{crumb.label}</span> : <Link to={crumb.to}>{crumb.label}</Link>}
        </li>;
      })}
    </ol>
  </nav>;
}

function AccountMenu({ area }: { area: WorkArea }) {
  const session = useAuthSession();
  const navigate = useNavigate();
  const account = session.status === "authenticated" ? session.account : null;
  const name = getUserDisplayName(account);
  return <Dropdown label="Menu tài khoản"
    header={<div className="min-w-0">
      <p className="truncate text-small font-semibold text-cs-text">{name}</p>
      {account?.email && <p className="truncate text-caption text-cs-muted">{account.email}</p>}
      <p className="mt-1 text-caption text-cs-accent-text">{roleLabel[area]}</p>
    </div>}
    items={[
      { label: "Hồ sơ của bạn", icon: "user", onSelect: () => navigate(`/${area}/profile`) },
      { label: "Ra ngoài website", icon: "arrow", onSelect: () => navigate("/") },
      { type: "separator" },
      { label: LABELS.action.logout, icon: "logout", danger: true, onSelect: () => { void logout(); } },
    ]}
    trigger={props => <button type="button" className="cs-ws-account" aria-label={`Menu tài khoản: ${name}`} {...props}>
      {account?.avatar
        ? <img src={account.avatar} alt="" className="cs-ws-avatar object-cover" aria-hidden="true"/>
        : <span className="cs-ws-avatar" aria-hidden="true">{getUserInitials(account)}</span>}
      <span className="cs-ws-account-name">{name}</span>
      <Icon name="chevron-down" size={14} className="text-cs-muted"/>
    </button>}
  />;
}

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];
/** Biểu tượng Admin: bánh răng + xe đỏ. */
function AdminMarkSvg() {
  return <svg viewBox="0 0 72 44" className="cs-admin-brand-mark" aria-hidden="true">
      <defs><linearGradient id="cs-admin-car" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ff4b55"/><stop offset="1" stopColor="#c8101e"/></linearGradient></defs>
      <g transform="translate(46 16)" fill="currentColor" className="cs-admin-brand-gear">
        {GEAR_TEETH.map(a => <rect key={a} x="-3" y="-16.5" width="6" height="6" rx="1.2" transform={`rotate(${a})`}/>)}
        <circle r="11" fill="none" stroke="currentColor" strokeWidth="5"/>
      </g>
      <path fill="url(#cs-admin-car)" d="M3 34 C7 27 15 23.5 25 22.5 C31 16.5 39 13.5 49 14 C57 14.5 63 18.5 67 23.5 C69.5 26.5 69.5 31 68 34 L60 34 A6.5 6.5 0 0 0 47 34 L27 34 A6.5 6.5 0 0 0 14 34 Z"/>
      <path fill="#121316" opacity=".85" d="M30 22.5 C35 18.5 41 16.5 47.5 16.8 C53 17.2 57 19.2 60 22.5 Z"/>
      <circle cx="20.5" cy="35" r="4.3" fill="none" stroke="#e01b28" strokeWidth="2.4"/>
      <circle cx="53.5" cy="35" r="4.3" fill="none" stroke="#e01b28" strokeWidth="2.4"/>
      <path d="M1 41 C20 37.5 46 37.5 71 39.5" fill="none" stroke="#e01b28" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>;
}

/** Biểu tượng Cố vấn: người tư vấn đeo tai nghe, cờ lê trên ngực, đường lướt — vàng đồng. */
function AdvisorMarkSvg() {
  return <svg viewBox="0 0 64 56" className="cs-admin-brand-mark" aria-hidden="true">
    <defs><linearGradient id="cs-adv-gold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f6dc9c"/><stop offset=".55" stopColor="#d9a347"/><stop offset="1" stopColor="#9c6a22"/></linearGradient></defs>
    <g fill="none" stroke="url(#cs-adv-gold)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {/* Đầu + tai nghe + mic */}
      <circle cx="30" cy="17" r="8"/>
      <path d="M19.5 18 a10.5 10.5 0 0 1 21 0"/>
      <rect x="17" y="15.5" width="4" height="7" rx="1.6" fill="url(#cs-adv-gold)"/>
      <rect x="39" y="15.5" width="4" height="7" rx="1.6" fill="url(#cs-adv-gold)"/>
      <path d="M19 22.5 q1 5 7 5.5"/>
      {/* Vai + cổ áo + cà vạt */}
      <path d="M13 46 v-5 a11 11 0 0 1 11 -11 h12 a11 11 0 0 1 11 11 v5"/>
      <path d="M26 30 l4 5 4 -5"/>
      <path d="M30 35 l-1.6 7 1.6 2 1.6 -2 z" fill="url(#cs-adv-gold)"/>
      {/* Cờ lê */}
      <path d="M38.5 44 l4.5 -4.5"/>
      <path d="M43 39.5 a2.6 2.6 0 1 0 2.6 -2.6"/>
    </g>
    <path d="M6 50 C22 54 44 50 60 36" fill="none" stroke="url(#cs-adv-gold)" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

/** Đầu sidebar (mockup PO 18/11): biểu tượng khu | "CarService" (S đỏ) / tên khu. */
function WorkBrand({ area }: { area: WorkArea }) {
  return <span className="cs-ws-brand-text cs-admin-brand">
    {area === "admin" ? <AdminMarkSvg/> : <AdvisorMarkSvg/>}
    <span className="cs-admin-brand-divider" aria-hidden="true"/>
    <span className="min-w-0"><b className="cs-admin-brand-name">Car<span>S</span>ervice</b><small>{area === "admin" ? "Trung tâm quản trị" : "Khu vực Cố vấn dịch vụ"}</small></span>
  </span>;
}

/** Biểu tượng khu cố vấn (ảnh PO gửi, public/advisor/advisor-logo.png); thiếu file thì về chữ "C". */
function AdvisorMark() {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="cs-ws-brand-mark" aria-hidden="true">C</span>;
  return <img src="/advisor/advisor-logo.png" alt="" aria-hidden="true" className="cs-adv-logo" onError={() => setFailed(true)}/>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <IconButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? LABELS.theme.toLight : LABELS.theme.toDark} onClick={toggleTheme} className="cs-ws-theme-toggle"/>;
}

/** Bố cục chung Advisor/Admin: sidebar nhóm nghiệp vụ + topbar (breadcrumb, sáng/tối, tài khoản) + nội dung. */
function WorkLayout({ area }: { area: WorkArea }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const toggleCollapsed = () => setCollapsed(value => {
    try { localStorage.setItem(SIDEBAR_KEY, value ? "expanded" : "collapsed"); } catch { /* Giữ trong phiên. */ }
    return !value;
  });

  // Ngăn kéo trên điện thoại: Esc để đóng, khóa cuộn nền, focus vào ngăn kéo và trả về nút mở khi đóng.
  useEffect(() => {
    if (!mobileOpen) {
      if (wasOpen.current) menuButtonRef.current?.focus({ preventScroll: true });
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeButtonRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    // Xoay / phóng to sang bề rộng desktop thì ngăn kéo không còn ý nghĩa.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onWide = () => { if (desktop.matches) setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWide);
    };
  }, [mobileOpen]);

  const close = () => setMobileOpen(false);
  return <ShellContext.Provider value={area}>
    <div className="cs-shell cs-workspace" data-area={area} data-sidebar={collapsed ? "collapsed" : "expanded"}>
      <a href="#main-content" className="cs-skip-link">Bỏ qua thanh điều hướng</a>
      {mobileOpen && <div className="cs-ws-scrim" onClick={close} aria-hidden="true"/>}
      <aside id="cs-workspace-sidebar" className="cs-work-sidebar" data-open={mobileOpen} aria-label={roleLabel[area]}>
        <div className="cs-ws-brand">
          <Link to={areaInfo[area].home} onClick={close} aria-label={`${roleLabel[area]} — Tổng quan`}>
            {/* Mở rộng: chữ khu làm việc (PO 18/11: không dùng logo); thu gọn (sidebar hẹp): biểu tượng vuông. */}
            <WorkBrand area={area}/>
            <span className="cs-ws-logo-mark">{area === "advisor" ? <AdvisorMark/> : <span className="cs-ws-brand-mark" aria-hidden="true">C</span>}</span>
          </Link>
          <span className="cs-ws-mobile-only">
            <IconButton ref={closeButtonRef} icon="close" label="Đóng thanh điều hướng" size="sm" onClick={close}/>
          </span>
        </div>
        <SidebarNav area={area} onNavigate={close}/>
        <div className="cs-ws-foot">
          <Link to="/" className="cs-ws-link" title="Ra ngoài website"><Icon name="arrow" size={18}/><span className="cs-ws-label">Ra ngoài website</span></Link>
        </div>
      </aside>
      <div className="cs-work-main">
        <header className="cs-work-top">
          <span className="cs-ws-mobile-only">
            <IconButton ref={menuButtonRef} icon="menu" label="Mở thanh điều hướng" onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen} aria-controls="cs-workspace-sidebar"/>
          </span>
          <span className="cs-ws-desktop-only">
            <IconButton icon="sidebar" label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} onClick={toggleCollapsed}
              aria-expanded={!collapsed} aria-controls="cs-workspace-sidebar"/>
          </span>
          <Breadcrumbs area={area}/>
          <div className="cs-ws-actions">
            <LiveClock/>
            <ThemeToggle/>
            <AccountMenu area={area}/>
          </div>
        </header>
        <div className="cs-work-content" id="main-content" tabIndex={-1}><PageTransition><Outlet/></PageTransition></div>
        <WorkFooter/>
      </div>
    </div>
  </ShellContext.Provider>;
}

/**
 * Chân trang khu Admin + Cố vấn: luôn nằm đáy màn hình (nội dung ngắn vẫn cân đối), cuộn theo nội dung khi trang dài.
 * Liên hệ lấy từ Thông tin gara; chưa cấu hình thì không hiện.
 */
function WorkFooter() {
  const garage = useGarageInfo();
  const year = new Date().getFullYear();
  return <footer className="cs-work-footer">
    <div className="cs-work-footer-inner">
      <p className="cs-work-footer-brand">
        <span>© {year} <b>{garage?.name || "CarService"}</b> · Hệ thống quản lý gara</span>
      </p>
      {(garage?.phone || garage?.email) && <ul className="cs-work-footer-links" aria-label="Liên hệ gara">
        {garage?.phone && <li><a href={`tel:${garage.phone.replace(/\s+/g, "")}`}><Icon name="phone" size={14}/>{garage.phone}</a></li>}
        {garage?.email && <li><a href={`mailto:${garage.email}`}><Icon name="mail" size={14}/>{garage.email}</a></li>}
      </ul>}
    </div>
  </footer>;
}

export function AdvisorLayout() { return <WorkLayout area="advisor"/>; }
export function AdminLayout() { return <WorkLayout area="admin"/>; }

export function CustomerLayout() {
  // Header/footer do PublicLayout đảm nhiệm để đồng bộ và không bị dựng lại khi chuyển trang.
  return <ShellContext.Provider value="customer">
    <div className="cs-shell cs-customer-layout" data-area="customer">
      <div className="cs-customer-main" id="main-content"><Outlet/></div>
    </div>
  </ShellContext.Provider>;
}
