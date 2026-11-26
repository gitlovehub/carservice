import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** Cuộn lên đầu trang và chạy hiệu ứng fade khi đổi route (giữ nguyên header/footer). */
export default function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, [pathname]);
  return <div key={pathname} className={`cs-page-enter ${className}`}>{children}</div>;
}

