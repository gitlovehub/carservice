import type { Role } from "../types";
import { Icon, getIconForTitle } from "./Icon";

interface SidebarProps {
  role: Role;
  activePage: string;
  navItems: string[];
  onPageChange: (page: string) => void;
  onOpenReviewModal: () => void;
}

export function Sidebar({ role, activePage, navItems, onPageChange, onOpenReviewModal }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-caption">KHÔNG GIAN LÀM VIỆC</div>
      <div className="sidebar-role">
        <span className="sidebar-avatar">
          {role === "Cố vấn dịch vụ" ? "CV" : role === "Kỹ thuật viên" ? "KT" : "AD"}
        </span>
        <span>
          <strong>{role}</strong>
          <small>Giao diện nội bộ</small>
        </span>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-caption">CHỨC NĂNG</div>
      <nav aria-label={`Menu ${role}`}>
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={activePage === item ? "sidebar-link active" : "sidebar-link"}
            onClick={() => onPageChange(item)}
          >
            <Icon name={getIconForTitle(item)} size={18} />
            {item}
          </button>
        ))}
      </nav>
      <button type="button" className="sidebar-bottom" onClick={onOpenReviewModal}>
        <span className="sidebar-bottom-dot" /> MỞ CHECKLIST REVIEW & TEST
      </button>
    </aside>
  );
}
