import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { useAuthSession } from "../contexts/authSession";
import { getUserDisplayName } from "../pages/auth/auth";
import { CUSTOMER_ACCOUNT_GROUPS, CUSTOMER_ACCOUNT_LINKS, isAccountLinkActive } from "./customerAccountNav";

/**
 * Khu "Hồ sơ của tôi": Hồ sơ, Lịch hẹn, Xe của tôi, Tiến độ xe, Báo giá, Lịch sử dùng chung một sidebar tài khoản
 * (desktop: cột trái; điện thoại: thanh tab cuộn ngang). Chưa đăng nhập khách → để trang tự xử lý như cũ.
 */
function readCachedCustomer(): { avatar?: string | null; email?: string | null; role?: string } & Parameters<typeof getUserDisplayName>[0] | null {
  try {
    if (localStorage.getItem("role") !== "CUSTOMER" || !localStorage.getItem("token")) return null;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.role === "CUSTOMER" ? user : null;
  } catch {
    return null;
  }
}

export default function CustomerAccountLayout() {
  const session = useAuthSession();
  const location = useLocation();
  const accountNavRef = useRef<HTMLElement>(null);
  // Chỉ cuộn ngang tab ở màn hình nhỏ, tránh scrollIntoView() làm cả trang nhảy xuống khi chuyển route.
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches) return;
    const nav = accountNavRef.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !selected) return;
    const left = selected.offsetLeft - nav.offsetLeft - (nav.clientWidth - selected.clientWidth) / 2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : "smooth" });
  }, [location.pathname]);
  const referenceFullWidth = ["/appointments", "/customer/appointments", "/cars", "/customer/cars", "/repair-status", "/reviews"].includes(location.pathname);
  // Lúc đang kiểm tra phiên (tải trang lần đầu), dùng hồ sơ đã lưu để hiện khung ngay — chỉ để hiển thị,
  // không dùng để phân quyền (các trang và API vẫn tự kiểm tra).
  const cached = session.status === "checking" ? readCachedCustomer() : null;
  const account = session.status === "authenticated" && session.account.role === "CUSTOMER" ? session.account : cached;
  if (!account || referenceFullWidth) return <Outlet/>;

  const name = getUserDisplayName(account) || "Khách hàng";
  // Chữ đầu của từ đầu + từ cuối (giống trang Hồ sơ): "Khách hàng TÈO" → "KT".
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "KH").slice(0, 2)).toUpperCase();

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
      {/* Desktop: nhóm có tiêu đề; điện thoại: một hàng tab cuộn ngang (tự cuộn tới mục đang mở). */}
      <nav ref={accountNavRef} className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:mt-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-cs-border lg:pt-1" aria-label="Menu tài khoản">
        {CUSTOMER_ACCOUNT_GROUPS.map(group => <div key={group} className="contents lg:block lg:pt-3">
          <p className="hidden px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cs-muted lg:block">{group}</p>
          {CUSTOMER_ACCOUNT_LINKS.filter(link => link.group === group).map(link => {
            const active = isAccountLinkActive(link, location.pathname);
            return <Link key={link.to} to={link.to} aria-current={active ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold no-underline transition ${active ? "bg-cs-soft text-cs-accent-text lg:shadow-[inset_3px_0_0_var(--cs-accent)]" : "text-cs-text hover:bg-cs-hover"}`}>
              <Icon name={link.icon} size={18}/>{link.label}
            </Link>;
          })}
        </div>)}
      </nav>
    </aside>
    {/* cs-account-content: chuẩn hóa tiêu đề trang (h1) cho mọi trang trong khu tài khoản — xem garage-customer-pages.css. */}
    <div className="cs-account-content min-w-0 [&>*]:min-h-0">
      <Outlet/>
    </div>
  </div>;
}
