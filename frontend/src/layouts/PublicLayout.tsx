import { Outlet, useLocation } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { ReferenceHeader, ReferenceFooter, referenceRoutes } from "../pages/showcase/ReferenceShell";

/** Một header/footer xuyên suốt khu khách hàng, kể cả các trang nghiệp vụ cũ.
 * Không đổi giao diện đột ngột khi vào Đặt lịch, Báo giá, Quản lý xe hay Đăng nhập. */
export default function PublicLayout() {
  const { pathname } = useLocation();
  const reference = referenceRoutes.has(pathname);
  return <div className={`flex min-h-dvh flex-col bg-cs-bg text-cs-text ${reference ? "v3ref-shell" : ""}`}>
    <ReferenceHeader />
    <PageTransition className="flex flex-1 flex-col"><Outlet /></PageTransition>
    <ReferenceFooter />
  </div>;
}

