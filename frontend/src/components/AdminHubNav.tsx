import { NavLink } from "react-router-dom";

/** Hub chung của các module Admin: không thay đổi API hay xử lý nghiệp vụ. */
const sections = [
  { path: "/admin/accounts", abbreviation: "NV", title: "Tài khoản & nhân viên", description: "Quản lý tài khoản" },
  { path: "/admin/services", abbreviation: "DV", title: "Dịch vụ & gói bảo dưỡng", description: "Quản lý dịch vụ" },
  { path: "/admin/inventory", abbreviation: "PT", title: "Phụ tùng & tồn kho", description: "Quản lý kho" },
  { path: "/admin/reports", abbreviation: "BC", title: "Báo cáo & thống kê", description: "Theo dõi số liệu" },
] as const;

export default function AdminHubNav() {
  return <nav className="cs-admin-hub" aria-label="Chuyển giữa các module quản trị">
    {sections.map(item => <NavLink key={item.path} to={item.path} className={({isActive}) => `cs-admin-hub-item${isActive ? " is-current" : ""}`}>
      <span className="cs-admin-hub-icon" aria-hidden="true">{item.abbreviation}</span>
      <strong>{item.title}</strong>
      <small>{item.description}</small>
    </NavLink>)}
  </nav>;
}
