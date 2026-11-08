import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { useAuthSession } from "../contexts/authSession";
import { getUserDisplayName } from "../pages/auth/auth";
import { CUSTOMER_ACCOUNT_LINKS, isAccountLinkActive } from "./customerAccountNav";

/**
 * Khu "Hồ sơ của tôi": Hồ sơ, Lịch hẹn, Xe của tôi, Tiến độ xe, Báo giá, Lịch sử dùng chung một sidebar tài khoản
 * (desktop: cột trái; điện thoại: thanh tab cuộn ngang). Chưa đăng nhập khách → để trang tự xử lý như cũ.
 */
export default function CustomerAccountLayout() {
  const session = useAuthSession();
  const location = useLocation();
  const isCustomer = session.status === "authenticated" && session.account.role === "CUSTOMER";
  if (!isCustomer) return <Outlet/>;

  const account = session.account;
  const name = getUserDisplayName(account) || "Khách hàng";
  const initials = name.trim().split(/\s+/).map(part => part[0]).filter(Boolean).slice(-2).join("").toUpperCase() || "KH";

  return <div className="mx-auto grid w-full max-w-[1360px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-8" data-testid="customer-account-layout">
    <aside className="h-fit min-w-0 rounded-2xl border border-cs-border bg-cs-surface p-3 lg:sticky lg:top-24 lg:p-4" aria-label="Tài khoản của tôi">
      <Link to="/customer/account" className="flex items-center gap-3 rounded-xl p-1 no-underline max-lg:hidden">
        {account.avatar
          ? <img src={account.avatar} alt="" className="size-12 rounded-full object-cover" referrerPolicy="no-referrer"/>
          : <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cs-accent text-base font-bold text-cs-accent-contrast">{initials}</span>}
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-cs-text">{name}</span>
          <span className="mt-0.5 inline-block rounded-full bg-cs-soft px-2 py-0.5 text-[11px] font-semibold text-cs-accent-text">Khách hàng</span>
        </span>
      </Link>
      <nav className="flex gap-1 overflow-x-auto lg:mt-3 lg:flex-col lg:border-t lg:border-cs-border lg:pt-3" aria-label="Menu tài khoản">
        {CUSTOMER_ACCOUNT_LINKS.map(link => {
          const active = isAccountLinkActive(link, location.pathname);
          return <Link key={link.to} to={link.to} aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold no-underline transition ${active ? "bg-cs-soft text-cs-accent-text lg:shadow-[inset_3px_0_0_var(--cs-accent)]" : "text-cs-text hover:bg-cs-hover"}`}>
            <Icon name={link.icon} size={18}/>{link.label}
          </Link>;
        })}
      </nav>
    </aside>
    <div className="min-w-0 [&>*]:min-h-0">
      <Outlet/>
    </div>
  </div>;
}
