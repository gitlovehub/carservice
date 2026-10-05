import { Link, useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/assigned-repairs": "Phiếu được phân công",
  "/vehicle-check": "Kiểm tra xe",
  "/diagnosis": "Chẩn đoán",
  "/repair-progress": "Tiến độ sửa chữa",
  "/checklist": "Checklist",
};

function TechnicianTopbar() {
  const location = useLocation();

  const pageName =
    pageNames[location.pathname] || "Không gian làm việc";

  return (
    <header className="sticky top-0 z-30 border-b border-[#e1e4e6] bg-white/95 backdrop-blur lg:ml-[250px]">
      <div className="flex h-[72px] items-center justify-between px-6 lg:px-8">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9aa1a7]">
            KỸ THUẬT VIÊN
          </p>

          <h1 className="mt-1 text-[16px] font-bold text-[#20252b]">
            {pageName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden rounded-xl px-3 py-2 text-[11px] font-medium text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b] sm:block"
          >
            Trang chủ
          </Link>

          <div className="flex items-center gap-2 rounded-xl border border-[#e1e4e6] bg-white px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f2933] text-[9px] font-bold text-white">
              KT
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[10px] font-semibold text-[#20252b]">
                Tên người dùng
              </p>

              <p className="text-[9px] text-[#8a9299]">
                Kỹ thuật viên
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TechnicianTopbar;