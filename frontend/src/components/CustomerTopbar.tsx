import { Link, useLocation } from "react-router-dom";
import RoleAccountMenu from "./RoleAccountMenu";

function CustomerTopbar() {
  const location = useLocation();

  const pageNames: Record<string, string> = {
    "/customer": "Tổng quan",
    "/customer/booking": "Đặt lịch",
    "/customer/appointments": "Lịch hẹn",
    "/customer/cars": "Xe của tôi",
    "/quotation": "Báo giá",
    "/payment": "Thanh toán",
    "/invoices": "Hóa đơn",
    "/reviews": "Đánh giá",
    "/account": "Tài khoản",
    "/repair-status": "Theo dõi sửa chữa",
  };

  const currentPage =
    pageNames[location.pathname] || "Khu vực khách hàng";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#E1E4E6] bg-white">
      <div className="flex min-w-0 items-center px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A949E]">
              CARSERVICE
            </p>
          </div>

          <p className="mt-1 text-[13px] font-bold text-[#20252B]">
            {currentPage}
          </p>
        </div>
      </div>

      <div className="ml-auto mr-6 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl border border-[#E1E4E6] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B]"
        >
          <span className="text-sm">←</span>
          Trang chủ
        </Link>

        <RoleAccountMenu />
      </div>
    </header>
  );
}

export default CustomerTopbar;