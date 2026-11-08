import type { IconName } from "../components/ui/Icon";

/**
 * Khu "Hồ sơ của tôi" của khách: một danh sách dùng chung cho sidebar tài khoản,
 * dropdown avatar và menu điện thoại — thêm / đổi trang chỉ sửa ở đây.
 * Nhóm theo việc khách cần làm: tài khoản & xe → theo dõi dịch vụ → chi phí.
 */
export type CustomerAccountLink = { label: string; to: string; icon: IconName; match: string[]; group: CustomerAccountGroup };
export type CustomerAccountGroup = "Tài khoản" | "Dịch vụ" | "Chi phí";

export const CUSTOMER_ACCOUNT_GROUPS: CustomerAccountGroup[] = ["Tài khoản", "Dịch vụ", "Chi phí"];

export const CUSTOMER_ACCOUNT_LINKS: CustomerAccountLink[] = [
  { group: "Tài khoản", label: "Hồ sơ của tôi", to: "/customer/account", icon: "user", match: ["/customer/account", "/account"] },
  { group: "Tài khoản", label: "Xe của tôi", to: "/customer/cars", icon: "car", match: ["/customer/cars", "/cars"] },
  { group: "Dịch vụ", label: "Lịch hẹn", to: "/customer/appointments", icon: "calendar", match: ["/customer/appointments", "/appointments"] },
  { group: "Dịch vụ", label: "Tiến độ xe", to: "/repair-status", icon: "wrench", match: ["/repair-status"] },
  { group: "Dịch vụ", label: "Lịch sử bảo dưỡng", to: "/customer/service-history", icon: "clock", match: ["/customer/service-history"] },
  { group: "Dịch vụ", label: "Đánh giá", to: "/reviews", icon: "star", match: ["/reviews"] },
  { group: "Chi phí", label: "Báo giá", to: "/quotation", icon: "file", match: ["/quotation"] },
  { group: "Chi phí", label: "Hóa đơn", to: "/invoices", icon: "receipt", match: ["/invoices"] },
  { group: "Chi phí", label: "Thanh toán", to: "/payment", icon: "card", match: ["/payment", "/payment/vnpay-return"] },
];

export const isAccountLinkActive = (link: CustomerAccountLink, pathname: string) => link.match.includes(pathname);