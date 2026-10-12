import { useNavigate } from "react-router-dom";
import { getUserRole } from "./auth";

function RoleSelector() {
  const navigate = useNavigate();
  const currentRole = getUserRole();

  const handleSelect = (roleCode: string, directPath: string) => {
    if (currentRole === roleCode) {
      navigate(directPath);
    } else {
      navigate("/login", { state: { prefillRole: roleCode } });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] px-6 py-10 text-[#20252B] flex flex-col justify-between">
      <div className="mx-auto max-w-[900px] w-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D6A85F]">
              CARSERVICE PORTAL
            </span>
          </div>

          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#20252B] tracking-tight">
            Chọn giao diện trải nghiệm hệ thống
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#7A838C]">
            Hệ thống phân quyền 4 vai trò rõ ràng theo đúng nghiệp vụ gara ô tô. Chọn khu vực bạn muốn truy cập để kiểm tra tính năng.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* KHÁCH HÀNG */}
          <button
            type="button"
            onClick={() => handleSelect("CUSTOMER", "/")}
            className="group cursor-pointer rounded-3xl border border-[#E1E4E6] bg-white p-7 text-left transition-all hover:border-[#D6A85F] hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#E5B869]/40 text-2xl group-hover:scale-105 transition-transform">
                👤
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E] group-hover:text-[#D6A85F]">
                CUSTOMER →
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-[#20252B]">
              Khách hàng
            </h2>

            <p className="mt-1.5 text-xs text-[#7A838C] leading-relaxed">
              Đặt lịch hẹn bảo dưỡng, chọn gói dịch vụ, quản lý xe và theo dõi tiến độ sửa chữa trực tuyến.
            </p>
          </button>

          {/* CỐ VẤN DỊCH VỤ */}
          <button
            type="button"
            onClick={() => handleSelect("ADVISOR", "/advisor/appointments")}
            className="group cursor-pointer rounded-3xl border border-[#E1E4E6] bg-white p-7 text-left transition-all hover:border-[#D6A85F] hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-2xl group-hover:scale-105 transition-transform">
                💬
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                ADVISOR →
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-[#20252B]">
              Cố vấn dịch vụ
            </h2>

            <p className="mt-1.5 text-xs text-[#7A838C] leading-relaxed">
              Tiếp nhận xe tại xưởng, duyệt lịch hẹn khách hàng, tạo phiếu kiểm tra và tư vấn gói dịch vụ.
            </p>
          </button>

          {/* KỸ THUẬT VIÊN */}
          <button
            type="button"
            onClick={() => handleSelect("TECHNICIAN", "/technician")}
            className="group cursor-pointer rounded-3xl border border-[#E1E4E6] bg-white p-7 text-left transition-all hover:border-[#D6A85F] hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-2xl group-hover:scale-105 transition-transform">
                🔧
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                TECHNICIAN →
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-[#20252B]">
              Kỹ thuật viên
            </h2>

            <p className="mt-1.5 text-xs text-[#7A838C] leading-relaxed">
              Thực hiện kiểm tra 36 hạng mục, cập nhật tiến độ công việc và báo cáo phụ tùng cần thay thế.
            </p>
          </button>

          {/* QUẢN TRỊ VIÊN */}
          <button
            type="button"
            onClick={() => handleSelect("ADMIN", "/admin")}
            className="group cursor-pointer rounded-3xl border border-[#E1E4E6] bg-white p-7 text-left transition-all hover:border-[#D6A85F] hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 border border-purple-200 text-2xl group-hover:scale-105 transition-transform">
                ⚙️
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                ADMIN →
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-[#20252B]">
              Quản trị viên
            </h2>

            <p className="mt-1.5 text-xs text-[#7A838C] leading-relaxed">
              Quản lý toàn diện tài khoản nhân sự, bảng giá dịch vụ, gói bảo dưỡng định kỳ và doanh thu gara.
            </p>
          </button>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="cursor-pointer text-xs font-bold text-[#66717C] hover:text-[#20252B] transition inline-flex items-center gap-1.5"
          >
            <span>← Quay lại trang chủ</span>
          </button>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default RoleSelector;