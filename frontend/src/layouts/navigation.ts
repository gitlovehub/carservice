import type { ShellArea } from "./ShellContext";
export type ShellNavItem = {
  label: string;
  path: string;
  icon: "home" | "calendar" | "car" | "clipboard" | "users" | "wrench" |
    "settings" | "box" | "chart" | "shield" | "receipt" | "clock";
  description?: string;
  /** Nhóm nghiệp vụ trên sidebar (Advisor/Admin). */
  group?: string;
  /** Trang khung chưa có API: vẫn truy cập được nhưng gắn nhãn "Sắp có" để không gây hiểu nhầm. */
  soon?: boolean;
};

// Chỉ điều hướng đến route đã có. Thứ tự trong mảng = thứ tự hiển thị; nhóm liền nhau.
export const shellNavigation: Record<ShellArea, ShellNavItem[]> = {
  customer: [
    { label: "Đặt lịch", path: "/customer/booking", icon: "calendar" },
    { label: "Lịch hẹn", path: "/customer/appointments", icon: "clipboard" },
    { label: "Xe của tôi", path: "/customer/cars", icon: "car" },
    { label: "Tiến độ xe", path: "/repair-status", icon: "wrench" },
    { label: "Báo giá", path: "/quotation", icon: "receipt" },
    { label: "Lịch sử", path: "/customer/service-history", icon: "clock" },
  ],
  advisor: [
    { label: "Tổng quan", path: "/advisor", icon: "home", group: "Điều hành" },
    { label: "Lịch hẹn", path: "/advisor/appointments", icon: "calendar", group: "Điều hành" },
    { label: "Tiếp nhận xe", path: "/advisor/reception", icon: "car", group: "Điều hành" },
    { label: "Phiếu sửa chữa", path: "/advisor/service-orders", icon: "clipboard", group: "Sửa chữa" },
    { label: "Lập báo giá", path: "/advisor/service-orders?status=QUOTING", icon: "receipt", group: "Sửa chữa" },
    { label: "Tiến độ sửa chữa", path: "/advisor/service-orders?status=IN_PROGRESS", icon: "wrench", group: "Sửa chữa" },
    { label: "Thu tiền & bàn giao", path: "/advisor/service-orders?status=COMPLETED", icon: "receipt", group: "Sửa chữa" },
    { label: "Khách hàng", path: "/advisor/customers", icon: "users", group: "Khách hàng" },
    { label: "Xe khách hàng", path: "/advisor/customer-cars", icon: "car", group: "Khách hàng" },
    { label: "Đặt lịch hộ", path: "/advisor/create-booking", icon: "calendar", group: "Khách hàng", soon: true },
  ],
  admin: [
    { label: "Tổng quan", path: "/admin", icon: "chart", group: "Điều hành" },
    { label: "Lịch hẹn", path: "/admin/appointments", icon: "calendar", group: "Điều hành" },
    { label: "Báo cáo", path: "/admin/reports", icon: "chart", group: "Điều hành", soon: true },
    { label: "Khách hàng", path: "/admin/customers", icon: "users", group: "Con người" },
    { label: "Tài khoản", path: "/admin/accounts", icon: "shield", group: "Con người" },
    { label: "Hoạt động cố vấn", path: "/admin/advisor-activity", icon: "users", group: "Con người" },
    { label: "Nhân sự", path: "/admin/staff", icon: "users", group: "Con người", soon: true },
    { label: "Dịch vụ", path: "/admin/services", icon: "settings", group: "Danh mục" },
    { label: "Gói bảo dưỡng", path: "/admin/maintenance-packages", icon: "clipboard", group: "Danh mục" },
    { label: "Danh mục xe", path: "/admin/vehicle-catalog", icon: "car", group: "Danh mục" },
    { label: "Kho phụ tùng", path: "/admin/inventory", icon: "box", group: "Danh mục" },
    { label: "Danh mục phụ tùng", path: "/admin/parts", icon: "box", group: "Danh mục", soon: true },
    { label: "Giờ làm việc", path: "/admin/working-hours", icon: "clock", group: "Hệ thống" },
    { label: "Thông tin gara", path: "/admin/garage", icon: "settings", group: "Hệ thống" },
  ],
};

/** Tên khu vực làm việc — mục đầu tiên của breadcrumb. */
export const areaInfo: Record<ShellArea, { name: string; home: string }> = {
  customer: { name: "Khách hàng", home: "/customer/appointments" },
  advisor: { name: "Cố vấn dịch vụ", home: "/advisor" },
  admin: { name: "Quản trị", home: "/admin" },
};

/** Trang chi tiết không có trong menu: khai báo cha để breadcrumb đúng. */
const detailPages: Array<{ area: ShellArea; pattern: RegExp; parent: string; label: string }> = [
  { area: "advisor", pattern: /^\/advisor\/service-orders\/[^/]+$/, parent: "/advisor/service-orders", label: "Chi tiết phiếu" },
];

export type Crumb = { label: string; to?: string };

/** Breadcrumb theo URL hiện tại: Khu vực › (Nhóm) › Trang [› Chi tiết]. */
export function crumbs(area: ShellArea, pathname: string, search: string): Crumb[] {
  const items = shellNavigation[area];
  const root: Crumb = { label: areaInfo[area].name, to: areaInfo[area].home };
  const detail = detailPages.find(d => d.area === area && d.pattern.test(pathname));
  const current = items.find(i => i.path === pathname + search) ?? items.find(i => i.path === (detail?.parent ?? pathname));
  if (!current) return [root];
  if (current.path === areaInfo[area].home) return [{ label: current.label }];
  if (detail) return [root, { label: current.label, to: current.path }, { label: detail.label }];
  return [root, { label: current.label }];
}

/** Gom mục menu theo nhóm, giữ nguyên thứ tự khai báo. */
export function navGroups(area: ShellArea): Array<{ label: string; items: ShellNavItem[] }> {
  const groups: Array<{ label: string; items: ShellNavItem[] }> = [];
  for (const item of shellNavigation[area]) {
    const label = item.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
