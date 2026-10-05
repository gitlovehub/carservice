import { Link, useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/advisor/customers": "Khách hàng",
  "/advisor/customer-cars": "Xe khách hàng",
  "/advisor/appointments": "Lịch hẹn",
  "/advisor/repair-status": "Trạng thái sửa chữa",
  "/advisor/quotation": "Báo giá",
};

function AdvisorTopbar() {
  const location = useLocation();

  const pageName =
    pageNames[location.pathname] || "Không gian làm việc";

  return (
    <header className="sticky top-0 z-30 border-b border-[#E1E4E6] bg-white lg:ml-[250px]">
      <div className="flex h-[72px] items-center justify-between px-6 lg:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
            CỐ VẤN DỊCH VỤ
          </p>

          <h1 className="mt-2 text-[16px] font-bold text-[#20252B]">
            {pageName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden rounded-xl px-3 py-2 text-[11px] font-medium text-[#66717C] transition hover:bg-[#F7F7F5] hover:text-[#20252B] sm:block"
          >
            Trang chủ
          </Link>

          <div className="flex items-center gap-2 rounded-xl border border-[#E1E4E6] bg-white px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F2933] text-[9px] font-bold text-white">
              CV
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[10px] font-semibold text-[#20252B]">
                Tên người dùng
              </p>

              <p className="text-[9px] text-[#8A949E]">
                Cố vấn dịch vụ
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdvisorTopbar;