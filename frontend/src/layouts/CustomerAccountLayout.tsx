import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import Breadcrumb from "../components/Breadcrumb";
import { useAuthSession } from "../contexts/authSession";
import { getUserDisplayName } from "../pages/auth/auth";
import { ACCOUNT_AREA_LABEL, CUSTOMER_ACCOUNT_GROUPS, CUSTOMER_ACCOUNT_LINKS, isAccountLinkActive } from "./customerAccountNav";
// Luôn nạp CSS khung tài khoản (trước đây chỉ vài trang tự import → mở thẳng trang khác bị mất style).
import "../styles/garage-customer-pages.css";

/**
 * Khu "Hồ sơ của tôi": Hồ sơ, Lịch hẹn, Xe của tôi, Báo giá, Lịch sử dùng chung một sidebar tài khoản
 * (Tiến độ sửa chữa là trang riêng ở menu chính, không thuộc khu này)
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
  // Lúc đang kiểm tra phiên (tải trang lần đầu), dùng hồ sơ đã lưu để hiện khung ngay — chỉ để hiển thị,
  // không dùng để phân quyền (các trang và API vẫn tự kiểm tra).
  const cached = session.status === "checking" ? readCachedCustomer() : null;
  const account = session.status === "authenticated" && session.account.role === "CUSTOMER" ? session.account : cached;
  // Mọi trang trong khu tài khoản (8 mục của menu trái) đều dùng chung khung sidebar này.
  if (!account) return <Outlet/>;

  const currentLink = CUSTOMER_ACCOUNT_LINKS.find(link => isAccountLinkActive(link, location.pathname));

  return <div className="mx-auto grid w-full max-w-[1360px] grid-cols-[minmax(0,1fr)] gap-6 p-4 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:p-8" data-testid="customer-account-layout">
    {/* Breadcrumb = vị trí thật: Trang chủ › <khu vực> › <trang>. Cấp giữa là TÊN KHU VỰC (cùng tên vùng sidebar),
        không dùng "Hồ sơ của tôi" vì đó là một trang ngang hàng trong menu. Mọi trang đều đủ 3 cấp.
        Hàng riêng, sát lề trái, để sidebar và tiêu đề trang bắt đầu cùng một độ cao. */}
    <div className="flex justify-start lg:col-span-2">
      <Breadcrumb tone="light" items={[{ label: ACCOUNT_AREA_LABEL, to: CUSTOMER_ACCOUNT_LINKS[0].to }, { label: currentLink?.label ?? "Trang tài khoản" }]}/>
    </div>
    <aside className="h-fit min-w-0 rounded-2xl border border-cs-border bg-cs-surface p-3 lg:sticky lg:top-24 lg:p-4" aria-label={ACCOUNT_AREA_LABEL}>
      {/* Desktop: nhóm có tiêu đề; điện thoại: một hàng tab cuộn ngang (tự cuộn tới mục đang mở). */}
      <nav ref={accountNavRef} className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-0 lg:overflow-visible" aria-label="Menu tài khoản">
        {CUSTOMER_ACCOUNT_GROUPS.map((group, index) => <div key={group} className={`contents lg:block ${index ? "lg:pt-4" : "lg:pt-1"}`}>
          <p className="hidden px-3 pb-1.5 text-[13px] font-semibold text-cs-muted lg:block">{group}</p>
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
