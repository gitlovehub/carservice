import { Link } from "react-router-dom";
import { Badge, Card, EmptyState, PageHeader } from "../../components/ui";

type Props = { area: "Cố vấn" | "Quản trị" | "Khách hàng"; title: string; description: string; owner: string };
export default function ModulePlaceholder({ area, title, description, owner }: Props) {
  return <div className="cs-placeholder">
    <PageHeader eyebrow={`CarService / ${area}`} title={title} description={description}/>
    <Card className="mb-4">
      <EmptyState title="Khung module sẵn sàng tích hợp" description="Đây là trang khung của Task 01. Chưa kết nối API hoặc hiển thị dữ liệu giả."
        action={<Badge>Phụ trách module: {owner}</Badge>}/>
    </Card>
    <Card><h2 className="cs-card-title">Dành cho thành viên phụ trách</h2><p className="cs-card-note">Tích hợp component của bạn vào route này, dùng Axios Client chung, kiểm tra role và chính sách Backend trước khi gọi API.</p><Link className="cs-text-link" to="/">Về trang chủ →</Link></Card>
  </div>;
}
