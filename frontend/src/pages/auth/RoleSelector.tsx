import { useNavigate } from "react-router-dom";
import { getUserRole } from "./auth";

const roles = [
  {
    code: "CUSTOMER",
    path: "/",
    icon: "👤",
    name: "Khách hàng",
    description:
      "Đặt lịch bảo dưỡng, quản lý thông tin xe và theo dõi tiến độ sửa chữa trực tuyến.",
    features: ["Đặt lịch dịch vụ", "Quản lý xe", "Theo dõi lịch hẹn"],
  },
  {
    code: "ADVISOR",
    path: "/advisor/appointments",
    icon: "💬",
    name: "Cố vấn dịch vụ",
    description:
      "Tiếp nhận xe, quản lý lịch hẹn và tư vấn các gói dịch vụ phù hợp cho khách hàng.",
    features: ["Tiếp nhận xe", "Duyệt lịch hẹn", "Tư vấn dịch vụ"],
  },
  {
    code: "TECHNICIAN",
    path: "/technician",
    icon: "🔧",
    name: "Kỹ thuật viên",
    description:
      "Kiểm tra tình trạng xe, cập nhật tiến độ sửa chữa và báo cáo phụ tùng cần thay thế.",
    features: ["Kiểm tra xe", "Cập nhật tiến độ", "Báo cáo kỹ thuật"],
  },
  {
    code: "ADMIN",
    path: "/admin",
    icon: "⚙️",
    name: "Quản trị viên",
    description:
      "Quản lý tài khoản nhân sự, dịch vụ và các hoạt động vận hành của gara.",
    features: ["Quản lý nhân sự", "Quản lý dịch vụ", "Theo dõi vận hành"],
  },
];

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
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#20252B]">
      <header className="border-b border-[#E1E4E6] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white transition-transform group-hover:scale-105">
              🚗
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">
                CarService
              </span>
              <span className="block text-[11px] font-medium text-[#7A838C]">
                Chăm sóc xe chuyên nghiệp
              </span>
            </span>
          </button>

          <span className="hidden text-xs font-medium text-[#7A838C] sm:block">
            Cổng truy cập hệ thống
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D6A85F]/30 bg-[#FAF8F5] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B58941]">
              CarService Portal
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Chọn khu vực làm việc
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#7A838C] sm:text-base">
            Chọn vai trò phù hợp để truy cập giao diện và các chức năng
            tương ứng trong hệ thống quản lý dịch vụ ô tô.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-[#D6A85F]" />
          <div>
            <h2 className="text-sm font-bold">Các vai trò hệ thống</h2>
            <p className="mt-0.5 text-xs text-[#8A949E]">
              4 khu vực làm việc theo nghiệp vụ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {roles.map((role, index) => (
            <button
              key={role.code}
              type="button"
              onClick={() => handleSelect(role.code, role.path)}
              className="group flex min-h-[250px] flex-col rounded-3xl border border-[#E1E4E6] bg-white p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_18px_40px_rgba(31,41,51,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D6A85F]/25 sm:p-7"
            >
              <div className="flex w-full items-start justify-between gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6A85F]/30 bg-[#FAF8F5] text-2xl transition-transform group-hover:scale-105">
                  {role.icon}
                </span>

                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E1E4E6] text-[#8A949E] transition group-hover:border-[#D6A85F] group-hover:bg-[#FAF8F5] group-hover:text-[#B58941]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <h3 className="text-base font-bold">{role.name}</h3>
                <span className="rounded-md bg-[#F7F7F5] px-2 py-1 text-[9px] font-bold tracking-wider text-[#7A838C]">
                  {role.code}
                </span>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#7A838C] sm:text-sm">
                {role.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {role.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-lg border border-[#E8EAEC] bg-[#FAFAF9] px-2.5 py-1.5 text-[10px] font-medium text-[#66717C]"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex w-full items-center justify-between pt-6">
                <span className="text-xs font-semibold text-[#8A949E]">
                  {index + 1 < 10 ? `0${index + 1}` : index + 1} / 04
                </span>
                <span className="text-xs font-bold text-[#B58941] transition group-hover:text-[#8F6A2D]">
                  Truy cập khu vực
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#E1E4E6] pt-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#66717C] transition hover:text-[#20252B]"
          >
            <span>←</span>
            Quay lại trang chủ
          </button>

          <p className="text-xs text-[#8A949E]">
            Giao diện quản lý CarService
          </p>
        </div>
      </main>

      <footer className="border-t border-[#E1E4E6] bg-white px-4 py-5 text-center text-xs text-[#8A949E]">
        © 2026 CarService System. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default RoleSelector;