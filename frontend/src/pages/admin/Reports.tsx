import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeader, buttonClass } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";

/**
 * Báo cáo & thống kê — CHƯA có API tổng hợp doanh thu ở backend.
 * Không hiển thị số liệu mẫu (trước Phase 5 trang này dùng hằng số viết sẵn).
 * Khi có API: thay EmptyState bằng thẻ số liệu + bảng theo kỳ, dữ liệu lấy từ API.
 */
const realDataShortcuts: Array<{ to: string; label: string; hint: string; icon: IconName }> = [
  { to: "/admin", label: "Tổng quan", hint: "Số lịch hẹn theo trạng thái, lịch trong ngày", icon: "chart" },
  { to: "/admin/appointments", label: "Lịch hẹn", hint: "Danh sách và trạng thái lịch hẹn", icon: "calendar" },
  { to: "/admin/services", label: "Dịch vụ", hint: "Danh mục và giá dịch vụ đang áp dụng", icon: "settings" },
  { to: "/admin/inventory", label: "Kho phụ tùng", hint: "Tồn kho hiện tại", icon: "box" },
];

export default function Reports() {
  return <div className="page-container">
    <PageHeader title="Báo cáo & thống kê" description="Theo dõi doanh thu, lượt sử dụng dịch vụ và hoạt động của gara theo kỳ."/>
    <Card className="mb-6 p-0!">
      <EmptyState
        icon="chart"
        title="Báo cáo đang được phát triển"
        description="Hệ thống chưa có nguồn dữ liệu tổng hợp doanh thu theo kỳ, nên trang này chưa hiển thị số liệu. CarService không dùng số liệu mẫu để tránh hiểu nhầm."
      />
    </Card>
    <h2 className="mb-3 text-subheading text-cs-text">Xem số liệu thực tế hiện có</h2>
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {realDataShortcuts.map(item => <li key={item.to}>
        <Link to={item.to} className="flex items-center gap-3 rounded-card border border-cs-border bg-cs-surface p-4 shadow-card transition-colors hover:border-cs-accent">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name={item.icon} size={18}/></span>
          <span className="min-w-0 flex-1">
            <span className="block text-small font-semibold text-cs-text">{item.label}</span>
            <span className="block text-caption text-cs-muted">{item.hint}</span>
          </span>
          <Icon name="chevron-right" size={16} className="text-cs-muted"/>
        </Link>
      </li>)}
    </ul>
    <p className="mt-6"><Link to="/admin" className={buttonClass({ variant: "ghost", size: "sm" })}><Icon name="chevron-left" size={14}/>Về Tổng quan</Link></p>
  </div>;
}
