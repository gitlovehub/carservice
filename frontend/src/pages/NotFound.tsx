import { Link } from "react-router-dom";
import { EmptyState, buttonClass } from "../components/ui";

/** Trang 404 trong bố cục công khai (có header/footer). */
export default function NotFound() {
  return <main className="page-container flex flex-1 items-center justify-center">
    <div className="w-full max-w-xl rounded-panel border border-cs-border bg-cs-surface shadow-card">
      <h1 className="sr-only">Không tìm thấy trang</h1>
      <EmptyState icon="search" title="Không tìm thấy trang"
        description="Đường dẫn có thể đã thay đổi hoặc không còn tồn tại. Bạn có thể quay về trang chủ hoặc đặt lịch bảo dưỡng."
        action={<>
          <Link to="/" className={buttonClass({ variant: "secondary" })}>Về trang chủ</Link>
          <Link to="/booking" className={buttonClass({ variant: "primary" })}>Đặt lịch</Link>
        </>}/>
    </div>
  </main>;
}
