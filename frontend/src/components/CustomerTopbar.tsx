import { Link } from "react-router-dom";

function CustomerTopbar() {
  return (
    <header className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-[#E1E4E6] bg-white px-6 lg:ml-[250px] lg:px-8">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
          CARSERVICE
        </p>

        <p className="mt-1 text-xs font-semibold text-[#20252B]">
          Khu vực khách hàng
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="hidden rounded-xl border border-[#E1E4E6] px-4 py-2.5 text-[10px] font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B] sm:block"
        >
          Trang chủ
        </Link>

        <Link
          to="/account"
          className="flex items-center gap-3 rounded-xl border border-[#E1E4E6] bg-white px-3 py-2 transition hover:bg-[#F7F7F5]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F2933] text-[9px] font-bold text-white">
            NV
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-[10px] font-semibold text-[#20252B]">
              Tên người dùng
            </p>

            <p className="mt-0.5 text-[9px] text-[#8A949E]">
              Khách hàng
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}

export default CustomerTopbar;