import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../contexts/authSession";
import { useTheme } from "../contexts/theme";
import { getUserDisplayName, getUserInitials, logout } from "../pages/auth/auth";
import PageTransition from "../components/PageTransition";
import { Dropdown, IconButton } from "../components/ui";
import { Icon } from "../components/ui/Icon";
import { LABELS } from "../config/labels";
import { areaInfo, crumbs, navGroups, shellNavigation } from "./navigation";
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
  const filteredPaths = shellNavigation[area].filter(item => item.path.includes("?")).map(item => item.path);
  const home = areaInfo[area].home;
  const isCurrent = (path: string) => {
    if (path.includes("?")) return pathname + search === path;
    if (filteredPaths.includes(pathname + search)) return false;
    return path === home ? pathname === home : pathname === path || pathname.startsWith(`${path}/`);
  };
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
      { label: "Website công khai", icon: "arrow", onSelect: () => navigate("/") },
      { type: "separator" },
      { label: LABELS.action.logout, icon: "logout", onSelect: () => { void logout(); } },
    ]}
    trigger={props => <button type="button" className="cs-ws-account" aria-label={`Menu tài khoản: ${name}`} {...props}>
      <span className="cs-ws-avatar" aria-hidden="true">{getUserInitials(account)}</span>
      <span className="cs-ws-account-name">{name}</span>
      <Icon name="chevron-down" size={14} className="text-cs-muted"/>
    </button>}
  />;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <IconButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? LABELS.theme.toLight : LABELS.theme.toDark} onClick={toggleTheme}/>;
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
          <Link to={areaInfo[area].home} onClick={close} aria-label="CarService — Tổng quan">
            <span className="cs-ws-brand-mark" aria-hidden="true">C</span>
            <span className="cs-ws-brand-text">CarService<small>{roleLabel[area]}</small></span>
          </Link>
          <span className="cs-ws-mobile-only">
            <IconButton ref={closeButtonRef} icon="close" label="Đóng thanh điều hướng" size="sm" onClick={close}/>
          </span>
        </div>
        <SidebarNav area={area} onNavigate={close}/>
        <div className="cs-ws-foot">
          <Link to="/" className="cs-ws-link" title="Website công khai"><Icon name="arrow" size={18}/><span className="cs-ws-label">Website công khai</span></Link>
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
            <ThemeToggle/>
            <AccountMenu area={area}/>
          </div>
        </header>
        <div className="cs-work-content" id="main-content" tabIndex={-1}><PageTransition><Outlet/></PageTransition></div>
      </div>
    </div>
  </ShellContext.Provider>;
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
