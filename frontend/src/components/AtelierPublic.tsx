
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthSession } from "../contexts/AuthContext";
import { getRoleManagementPage, logout } from "../pages/auth/auth";
import carArt from "../assets/car-atelier.svg";

/* ==========================================
   CARSERVICE - PUBLIC COMPONENTS
========================================== */

const navigationLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/services" },
  { label: "Đặt lịch", href: "/booking" },
  { label: "Lịch hẹn", href: "/appointments" },
];

const navLinkClass =
  "block rounded-lg px-2 py-2 text-[13px] font-semibold " +
  "text-[#626974] transition-colors " +
  "hover:text-[#cf2935] " +
  "dark:text-[#b5bac4] dark:hover:text-[#ff8790]";

const controlClass =
  "inline-flex size-10 shrink-0 cursor-pointer items-center " +
  "justify-center rounded-xl border border-[#e1e4e6] " +
  "bg-white text-[#191919] transition-colors " +
  "hover:border-[#cf2935] hover:text-[#cf2935] " +
  "dark:border-[#34373a] dark:bg-[#24262b] " +
  "dark:text-[#f5f5f4] dark:hover:border-[#ff8790]";

/* ==========================================
   BRAND
========================================== */

function AtelierBrand() {
  return (
    <Link
      to="/"
      aria-label="CarService - Trang chủ"
      className="inline-flex shrink-0 items-center gap-2.5 no-underline"
    >
      <span
        className="flex size-9 shrink-0 -rotate-6 items-center justify-center
        rounded-xl bg-[#cf2935] text-base font-extrabold text-white"
      >
        C
      </span>

      <span className="flex flex-col leading-tight">
        <span
          className="text-[20px] font-extrabold tracking-[-0.055em]
          text-[#191919] dark:text-[#f5f5f4]"
        >
          carservice
        </span>
        <span
          className="mt-0.5 text-[9px] font-extrabold
          tracking-[0.14em] text-[#777d85] dark:text-[#a1a5ad]"
        >
          ATELIER / AUTO CARE
        </span>
      </span>
    </Link>
  );
}

/* ==========================================
   PUBLIC HEADER
========================================== */

export function AtelierPublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const session = useAuthSession();
  const location = useLocation();

  const isAuthenticated = session.status === "authenticated";

  const dashboard = isAuthenticated
    ? getRoleManagementPage(session.account.role)?.path ?? "/"
    : "/login";

  const getNavigationPath = (label: string, href: string) => {
    if (!isAuthenticated) return href;

    const role = session.account.role;

    if (label === "Lịch hẹn") {
      if (role === "ADMIN") return "/admin/appointments";
      if (role === "ADVISOR") return "/advisor/appointments";
      if (role === "TECHNICIAN") return dashboard;
      return "/customer/appointments";
    }

    if (label === "Đặt lịch" && role !== "CUSTOMER") {
      return dashboard;
    }

    return href;
  };

  const closeMenu = () => setMenuOpen(false);

  const renderLinks = (mobile = false) =>
    navigationLinks.map(({ label, href }) => {
      const path = getNavigationPath(label, href);

      const active =
        location.pathname === path ||
        (path !== "/" && location.pathname.startsWith(`${path}/`));

      return (
        <Link
          key={`${mobile ? "mobile" : "desktop"}-${label}`}
          to={path}
          onClick={closeMenu}
          aria-current={active ? "page" : undefined}
          className={`${navLinkClass} ${
            active
              ? "!text-[#cf2935] dark:!text-[#ff8790]"
              : ""
          } ${mobile ? "px-4 py-3 text-sm" : ""}`}
        >
          {label}
        </Link>
      );
    });

  return (
    <header
      className="sticky top-0 z-[60] border-b
      border-[#e9e9e6] bg-white/95 text-[#191919]
      backdrop-blur-xl transition-colors
      dark:border-[#34373a] dark:bg-[#191b1e]/95
      dark:text-[#f5f5f4]"
    >
      <div
        className="mx-auto flex h-[76px] w-full max-w-[1440px]
        items-center justify-between gap-4 px-4 sm:px-8 xl:px-12"
      >
        <AtelierBrand />

        <nav
          aria-label="Điều hướng chính"
          className="hidden items-center gap-3 lg:flex xl:gap-5"
        >
          {renderLinks()}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Chuyển sang giao diện sáng"
                : "Chuyển sang giao diện tối"
            }
            aria-pressed={theme === "dark"}
            title={
              theme === "dark" ? "Chế độ sáng" : "Chế độ tối"
            }
            className={controlClass}
          >
            {theme === "dark" ? (
              <span aria-hidden="true" className="text-xl">
                ☀
              </span>
            ) : (
              <span aria-hidden="true" className="text-xl">
                ☾
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <Link
              to={dashboard}
              className="hidden min-h-10 items-center justify-center
              rounded-xl border border-[#e1e4e6] px-4
              text-xs font-bold transition-colors
              hover:border-[#cf2935] sm:inline-flex
              dark:border-[#34373a] dark:hover:border-[#ff8790]"
            >
              Không gian của tôi
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden min-h-10 items-center justify-center
              rounded-xl border border-[#e1e4e6] px-4
              text-xs font-bold transition-colors
              hover:border-[#cf2935] sm:inline-flex
              dark:border-[#34373a] dark:hover:border-[#ff8790]"
            >
              Đăng nhập
            </Link>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden min-h-10 cursor-pointer items-center
              justify-center rounded-xl border border-[#e1e4e6]
              px-4 text-xs font-bold transition-colors
              hover:border-[#cf2935] xl:inline-flex
              dark:border-[#34373a] dark:hover:border-[#ff8790]"
            >
              Đăng xuất
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className={`${controlClass} lg:hidden`}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="carservice-mobile-navigation"
            onClick={() => setMenuOpen(open => !open)}
          >
            <span aria-hidden="true" className="text-xl">
              {menuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav
          id="carservice-mobile-navigation"
          aria-label="Điều hướng điện thoại"
          className="absolute inset-x-0 top-full z-50
          max-h-[calc(100dvh-76px)] overflow-y-auto
          border-b border-[#e9e9e6] bg-white
          px-4 py-4 shadow-lg lg:hidden
          dark:border-[#34373a] dark:bg-[#191b1e]"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col">
            {renderLinks(true)}

            <div className="my-3 border-t border-[#e9e9e6] dark:border-[#34373a]" />

            {isAuthenticated ? (
              <>
                <Link
                  to={dashboard}
                  onClick={closeMenu}
                  className={`${navLinkClass} px-4 py-3`}
                >
                  Không gian của tôi
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void logout();
                  }}
                  className="cursor-pointer rounded-lg px-4 py-3
                  text-left text-sm font-semibold text-[#cf2935]
                  hover:bg-[#fff1f2] dark:hover:bg-[#3a2429]"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={`${navLinkClass} px-4 py-3`}
                >
                  Đăng nhập
                </Link>

                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="mx-4 mt-2 rounded-xl bg-[#cf2935]
                  px-5 py-3 text-center text-sm font-bold
                  text-white transition-colors hover:bg-[#a91e29]"
                >
                  Tạo tài khoản
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

/* ==========================================
   PUBLIC FOOTER
========================================== */

export function AtelierPublicFooter() {
  return (
    <footer
      className="border-t border-[#e9e9e6] bg-[#f8f8f7]
      text-[#191919] dark:border-[#34373a]
      dark:bg-[#191b1e] dark:text-[#f5f5f4]"
      aria-label="Thông tin CarService"
    >
      <div
        className="mx-auto grid max-w-[1440px] grid-cols-1
        gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8
        lg:grid-cols-4 lg:gap-12 lg:py-16 xl:px-12"
      >
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-2">
          <AtelierBrand />

          <p
            className="mt-5 max-w-[420px] text-sm leading-7
            text-[#626974] dark:text-[#b5bac4]"
          >
            CarService giúp khách hàng đặt lịch bảo dưỡng,
            theo dõi quá trình chăm sóc xe và quản lý
            các lịch hẹn thuận tiện, rõ ràng.
          </p>

          <Link
            to="/booking"
            className="mt-6 inline-flex items-center justify-center
            rounded-xl bg-[#cf2935] px-5 py-3 text-sm
            font-bold text-white transition-colors
            hover:bg-[#a91e29]"
          >
            Đặt lịch bảo dưỡng
            <span className="ml-2" aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Quick links */}
        <nav aria-label="Liên kết nhanh">
          <h2 className="mb-5 text-sm font-extrabold">
            Liên kết nhanh
          </h2>

          <div className="flex flex-col items-start gap-4">
            {[
              { label: "Trang chủ", to: "/" },
              { label: "Dịch vụ", to: "/services" },
              { label: "Đặt lịch", to: "/booking" },
              { label: "Lịch hẹn", to: "/appointments" },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-[#626974]
                transition-colors hover:text-[#cf2935]
                dark:text-[#b5bac4] dark:hover:text-[#ff8790]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Customer support */}
        <div>
          <h2 className="mb-5 text-sm font-extrabold">
            Hỗ trợ khách hàng
          </h2>

          <p
            className="text-sm leading-7 text-[#626974]
            dark:text-[#b5bac4]"
          >
            Truy cập tài khoản để quản lý thông tin xe,
            xem lịch hẹn và theo dõi hoạt động bảo dưỡng.
          </p>

          <Link
            to="/login"
            className="mt-5 inline-flex text-sm font-bold
            text-[#cf2935] hover:underline
            dark:text-[#ff8790]"
          >
            Quản lý tài khoản
          </Link>
        </div>
      </div>

      <div
        className="border-t border-[#e9e9e6] px-5 py-5
        dark:border-[#34373a]"
      >
        <div
          className="mx-auto flex max-w-[1440px] flex-col
          justify-between gap-2 text-center text-xs
          text-[#777d85] sm:flex-row sm:text-left
          dark:text-[#a1a5ad]"
        >
          <span>
            © {new Date().getFullYear()} CarService.
            All rights reserved.
          </span>

          <span>
            Nền tảng đặt lịch và quản lý bảo dưỡng ô tô.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ==========================================
   CAR ILLUSTRATION
========================================== */

export function AtelierCar({
  className = "",
}: {
  className?: string;
}) {
  return (
    <img
      className={className}
      src={carArt}
      alt="Minh họa ô tô thể thao CarService Atelier"
      loading="lazy"
    />
  );
}

/* ==========================================
   AUTH LAYOUT
========================================== */

export function AtelierAuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-[#f7f7f6]
      text-[#191919] dark:bg-[#111214]
      dark:text-[#f5f5f4]"
    >
      <AtelierPublicHeader />

      <main
        className="flex w-full flex-1 items-center
        justify-center px-5 py-12 sm:px-8 sm:py-16"
      >
        <section
          className="w-full max-w-[480px]"
          aria-label={title}
        >
          <h1
            className="mb-3 mt-4 text-4xl
            font-extrabold tracking-tight sm:text-[42px]"
          >
            {title}
          </h1>

          <p
            className="mb-8 leading-7 text-[#757575]
            dark:text-[#a1a5ad]"
          >
            {description}
          </p>

          {children}
        </section>
      </main>

      <AtelierPublicFooter />
    </div>
  );
}

/* ==========================================
   FORM FIELD
========================================== */

export function AtelierField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label
        className="text-xs font-bold"
        htmlFor={htmlFor}
      >
        {label}
      </label>

      {children}

      {error && (
        <p
          className="text-xs font-bold text-[#dc4250]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ==========================================
   AUTH ERROR
========================================== */

export function AtelierAuthError({
  message,
}: {
  message: string;
}) {
  return (
    <div
      className="mb-4 rounded-xl border border-[#cf2935]/30
      bg-[#fff1f1] px-4 py-3 leading-6
      text-[#a91e29]
      dark:border-[#873b45] dark:bg-[#361e24]
      dark:text-[#ffadb5]"
      role="alert"
    >
      {message}
    </div>
  );
}
