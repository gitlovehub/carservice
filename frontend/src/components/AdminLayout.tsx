import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * ============================================================================
 * ADMIN LAYOUT — khung chung cho mọi trang quản trị
 * ============================================================================
 *
 * VÌ SAO CẦN FILE NÀY:
 *   Cả 2 trang quản lý đều cần giống nhau: header logo, tên người dùng,
 *   thanh menu chuyển trang, và khung nội dung. Nếu mỗi trang tự viết lại
 *   thì sau này sửa header phải sửa 2 chỗ. Tách ra đây thành 1 nguồn.
 *
 * DÙNG CHUNG VỚI: ServiceManagement.tsx, PackageManagement.tsx
 * (và sau này các trang quản lý khác: khách hàng, lịch hẹn, phụ tùng...)
 */

interface AdminLayoutProps {
  // Tiêu đề lớn đầu trang, ví dụ "Quản lý Dịch vụ".
  title: string;
  // Mô tả nhỏ dưới tiêu đề, giúp người dùng hiểu trang này làm gì.
  description: string;
  // Nội dung riêng của từng trang, nhét vào giữa khung.
  children: ReactNode;
}

/**
 * Danh sách menu ngang trên cùng.
 * Khi thêm màn hình quản trị mới chỉ cần thêm 1 dòng vào đây.
 */
const navItems = [
  { to: '/admin/services', label: 'Danh mục Dịch vụ' },
  { to: '/admin/packages', label: 'Gói bảo dưỡng' },
];

/**
 * NavLink nhận hàm nhận { isActive } để đổi style theo trạng thái.
 * Viết bằng biểu thức ternary:
 *   - đang ở trang này -> nền đen, chữ trắng (nổi bật)
 *   - trang khác       -> chữ xám, hover mới lên nền
 *
 * Vì sao tách thành hàm riêng: NavLink yêu cầu className là hàm nhận
 * { isActive }, không nhận chuỗi tĩnh. Gom ra ngoài component để không tạo
 * lại hàm mỗi lần render.
 */
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
    isActive
      ? 'bg-gray-900 text-white shadow-sm'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function AdminLayout({ title, description, children }: AdminLayoutProps) {
  return (
    // font-sans: ép font chữ của Tailwind, không phụ thuộc font mặc định hệ thống
    // bg-gray-50: nền xám nhạt để card trắng nổi lên
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ===== KHUNG TRÊN: logo + tên hệ thống + thông tin người dùng ===== */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logo: ô vuông bo tròn, chữ "CS" = CarService */}
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-sm">
                CS
              </div>
              <div className="leading-tight">
                {/* Chữ "Admin" màu đỏ để phân biệt với trang khách hàng */}
                <div className="text-sm font-bold text-gray-900">
                  CarService <span className="text-red-600">Admin</span>
                </div>
                <div className="text-[11px] text-gray-500">Quản trị hệ thống</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tạm đặt cứng tên người dùng — khi có đăng nhập sẽ lấy từ token.
                  hidden sm:flex = ẩn trên màn hình hẹp để không vỡ layout */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[11px] font-medium text-gray-600">
                  Nguyễn Văn A · Quản trị viên
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== THANH MENU CHUYỂN TRANG =====
          Dùng max-w-7xl + mx-auto để khung menu thẳng hàng với nội dung bên dưới
          thay vì tràn full màn hình. */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* -mb-px + gap-1: dùng chung class với nút đang active để mép dưới
              của khung khớp với mép dưới nền trắng, không bị 1px thừa.
              overflow-x-auto: khi nhiều menu hơn thì cuộn ngang thay vì xuống dòng */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* ===== NỘI DUNG TRANG =====
          py-6: khoảng cách trên/dưới nội dung
          children: phần riêng do ServiceManagement / PackageManagement truyền vào */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
