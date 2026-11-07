import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeader, buttonClass } from "../../components/ui";

/**
 * Trang cho chức năng chưa có API (menu gắn nhãn "Sắp có"). Chỉ hiển thị nội dung dành cho người dùng;
 * thông tin phân công (owner) giữ trong mã để nhóm phát triển tra cứu, không hiện ra giao diện.
 */
type Props = { area: "Cố vấn" | "Quản trị" | "Khách hàng"; title: string; description: string; owner?: string };
export default function ModulePlaceholder({ area, title, description }: Props) {
  const home = area === "Cố vấn" ? "/advisor" : area === "Quản trị" ? "/admin" : "/";
  return <div className="page-container">
    <PageHeader title={title} description={description}/>
    <Card className="p-0!">
      <EmptyState icon="clock" title="Tính năng đang được phát triển"
        description="Chức năng này sẽ được mở trong bản cập nhật tới. Hiện chưa có dữ liệu để hiển thị."
        action={<Link to={home} className={buttonClass({ variant: "secondary" })}>Về Tổng quan</Link>}/>
    </Card>
  </div>;
}
