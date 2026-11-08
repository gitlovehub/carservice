import type { IconName } from "../components/ui/Icon";

/**
 * Khu "Hồ sơ của tôi" của khách: một danh sách dùng chung cho sidebar tài khoản,
 * dropdown avatar và menu điện thoại — thêm / đổi trang chỉ sửa ở đây.
 */
export type CustomerAccountLink = { label: string; to: string; icon: IconName; match: string[] };

export const CUSTOMER_ACCOUNT_LINKS: CustomerAccountLink[] = [
  { label: "Hồ sơ của tôi", to: "/customer/account", icon: "user", match: ["/customer/account", "/account"] },
  { label: "Lịch hẹn", to: "/customer/appointments", icon: "calendar", match: ["/customer/appointments", "/appointments"] },
  { label: "Xe của tôi", to: "/customer/cars", icon: "car", match: ["/customer/cars", "/cars"] },
  { label: "Tiến độ xe", to: "/repair-status", icon: "wrench", match: ["/repair-status"] },
  { label: "Báo giá", to: "/quotation", icon: "receipt", match: ["/quotation"] },
  { label: "Lịch sử bảo dưỡng", to: "/customer/service-history", icon: "clock", match: ["/customer/service-history"] },
];

export const isAccountLinkActive = (link: CustomerAccountLink, pathname: string) => link.match.includes(pathname);
