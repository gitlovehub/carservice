import { Link, useLocation } from "react-router-dom";
import RoleAccountMenu from "./RoleAccountMenu";

function CustomerTopbar() {
  const location = useLocation();

  const pageNames: Record<string, string> = {
    "/customer": "Tổng quan",
    "/customer/appointments": "Lịch hẹn",
    "/customer/cars": "Xe của tôi",
    "/quotation": "Báo giá",
    "/payment": "Thanh toán",
    "/invoices": "Hóa đơn",
    "/reviews": "Đánh giá",
    "/account": "Tài khoản",
    "/repair-status": "Theo dõi sửa chữa",
  };

  const currentPage = pageNames[location.pathname] || "Khu vực khách hàng";

  return (
    <header className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-[#E1E4E6] bg-white px-6 lg:ml-[250px] lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
            CARSERVICE
          </p>
        </div>

        <p className="mt-1 text-xs font-bold text-[#20252B]">
          {currentPage}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/"
          className="hidden items-center gap-2 rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-[10px] font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B] sm:flex"
        >
          <span>←</span>
          Trang chủ
        </Link>

        <RoleAccountMenu />
      </div>
    </header>
  );
}

export default CustomerTopbar;