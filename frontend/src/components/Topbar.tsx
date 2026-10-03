import { useState } from "react";
import type { Role } from "../types";
import { Icon } from "./Icon";
import { customerNavItems } from "../data/mockData";

interface TopbarProps {
  role: Role;
  activePage: string;
  isInternalRole: boolean;
  navItems: string[];
  onPageChange: (page: string) => void;
  onRoleChange: (role: Role) => void;
  onOpenAccountModal: () => void;
}

export function Topbar({
  role,
  activePage,
  isInternalRole,
  navItems,
  onPageChange,
  onRoleChange,
  onOpenAccountModal,
}: TopbarProps) {
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          className="brand"
          type="button"
          onClick={() => onPageChange(isInternalRole ? navItems[0] : "Trang chủ")}
        >
          <span className="brand-icon">
            <Icon name="car" size={23} />
          </span>
          <span>
            <strong>CarService</strong>
            <small>Quản lý dịch vụ ô tô</small>
          </span>
        </button>

        {!isInternalRole && (
          <nav className="customer-nav" aria-label="Điều hướng khách hàng">
            {customerNavItems.map((item) => (
              <button
                key={item}
                type="button"
                className={activePage === item ? "active" : ""}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ))}
          </nav>
        )}

        <div className="account-menu">
          <button
            type="button"
            className="role-trigger"
            aria-label={`Tài khoản: ${isInternalRole ? "Tên người dùng" : "Khách hàng"}, ${role}`}
            onClick={() => setRolePopoverOpen(!rolePopoverOpen)}
            aria-expanded={rolePopoverOpen}
          >
            <span className="avatar">{isInternalRole ? "NV" : "KH"}</span>
            <span className="role-label">
              <strong>{isInternalRole ? "Tên người dùng" : "Khách hàng"}</strong>
              <small>{isInternalRole ? `Tài khoản · ${role}` : role}</small>
            </span>
            <span className="chevron">⌄</span>
          </button>

          {rolePopoverOpen && (
            <div className="role-popover">
              <span>TÀI KHOẢN</span>
              <button
                type="button"
                onClick={() => {
                  setRolePopoverOpen(false);
                  if (isInternalRole) {
                    onOpenAccountModal();
                  } else {
                    onPageChange("Tài khoản");
                  }
                }}
              >
                {isInternalRole ? "Thông tin tài khoản" : "Tài khoản của tôi"}
                <Icon name="users" size={15} />
              </button>
              <div className="role-popover-divider" />
              <span>XEM WIREFRAME THEO VAI TRÒ</span>
              {(["Khách hàng", "Cố vấn dịch vụ", "Kỹ thuật viên", "Quản trị viên"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRolePopoverOpen(false);
                    onRoleChange(r);
                  }}
                  className={role === r ? "chosen" : ""}
                >
                  {r}
                  {role === r && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
