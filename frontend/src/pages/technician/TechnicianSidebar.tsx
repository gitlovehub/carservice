import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    label: "Phiếu được phân công",
    path: "/assigned-repairs",
    icon: "▣",
  },
  {
    label: "Kiểm tra xe",
    path: "/vehicle-check",
    icon: "◇",
  },
  {
    label: "Chẩn đoán",
    path: "/diagnosis",
    icon: "⌕",
  },
  {
    label: "Tiến độ sửa chữa",
    path: "/repair-progress",
    icon: "↻",
  },
  {
    label: "Checklist",
    path: "/checklist",
    icon: "✓",
  },
];

function TechnicianSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[250px] border-r border-[#e1e4e6] bg-white lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#eceeed] px-5 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2933] text-white">
              <span className="text-base">🚗</span>

              <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#d6a85f] text-[7px]">
                +
              </span>
            </div>

            <div>
              <p className="text-[14px] font-bold text-[#20252b]">
                CarService
              </p>

              <p className="mt-0.5 text-[9px] font-medium text-[#8a9299]">
                Kỹ thuật viên
              </p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9aa1a7]">
            CÔNG VIỆC
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] transition ${
                    active
                      ? "bg-[#f3f4f2] font-semibold text-[#20252b]"
                      : "font-medium text-[#66717c] hover:bg-[#f3f4f2] hover:text-[#20252b]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] ${
                      active
                        ? "bg-[#1f2933] text-white"
                        : "bg-[#f0f1ef] text-[#66717c]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d6a85f]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#eceeed] p-4">
          <div className="mb-3 rounded-xl bg-[#f7f7f5] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2933] text-[10px] font-bold text-white">
                KT
              </div>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-[#20252b]">
                  Tên người dùng
                </p>

                <p className="mt-0.5 text-[9px] text-[#8a9299]">
                  Kỹ thuật viên
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium text-[#66717c] transition hover:bg-[#f3f4f2] hover:text-[#20252b]"
          >
            <span>←</span>
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default TechnicianSidebar;