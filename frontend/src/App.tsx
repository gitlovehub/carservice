import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VehicleCard from "./components/VehicleCard";
import ServiceManagement from "./pages/adminPage/ServiceManagement";
import PackageManagement from "./pages/adminPage/PackageManagement";

/**
 * ============================================================================
 * APP — BẢN ĐỒ ĐIỀU HƯỚNG (ROUTER)
 * ============================================================================
 *
 * App chỉ làm đúng MỘT việc: khai báo đường dẫn -> màn hình.
 * Không có state, không có xử lý dữ liệu. Nhờ vậy file này luôn dễ đọc và
 * dễ kiểm tra: muốn biết app có màn hình nào, đọc App là đủ.
 *
 * VÌ SAO DÙNG react-router-dom:
 *     Mỗi màn hình là một URL riêng (/admin/services, /admin/packages...).
 *     Admin có thể F5, bookmark, gửi link cho nhau, và trình duyệt có
 *     nút Back/Forward hoạt động đúng — những thứ mà khi chia state tay
 *     trong một component lớn sẽ không có.
 *
 * CẤU TRÚC:
 *
 *   <BrowserRouter>   lắp nghe thay đổi đường dẫn trên trình duyệt
 *        |
 *        v
 *   <Routes>          chọn đúng một <Route> khớp URL hiện tại
 *        |
 *        +-- path="/"              -> trang chủ
 *        +-- path="/demo"          -> demo VehicleCard
 *        +-- path="/contact"       -> liên hệ
 *        +-- path="/login"         -> đăng nhập
 *        +-- path="/register"      -> đăng ký
 *        +-- path="/admin/services"-> quản lý dịch vụ
 *        +-- path="/admin/packages"-> quản lý gói bảo dưỡng
 *
 * CHÚ Ý QUAN TRỌNG VỀ BrowserRouter:
 *     Khi chạy thật (npm run build) và mở trực tiếp đường dẫn
 *     /admin/services, web server phải trả về index.html cho mọi URL
 *     để React Router có cơ hội đọc URL. Với Vite ở chế độ dev thì đã
 *     tự xử lý chuyện này nên không gặp lỗi 404.
 *
 *     Route nào trong <Routes> KHÔNG khớp URL sẽ không hiện gì cả (màn hình
 *     trắng). Nếu cần trang "không tìm thấy", thêm:
 *         <Route path="*" element={<NotFound />} />
 */
function App() {
  return (
    // BrowserRouter là điểm xuất phát: nó theo dõi URL và báo cho <Routes>.
    <BrowserRouter>
      {/* Routes chỉ render DUY NHẤT Route đầu tiên khớp với URL hiện tại.
          Thứ tự không quan trọng ở đây vì các path đều khác nhau và không
          dùng tham số động. */}
      <Routes>
        {/* Khách hàng */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />

        {/* Tài khoản */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Demo thành phần VehicleCard (tách riêng khỏi trang chủ để dễ kiểm tra giao diện) */}
        <Route path="/demo" element={<VehicleCard />} />

        {/*
          Khu vực quản trị — tiền tố /admin gom chung để dễ thêm middleware
          bảo vệ sau này, ví dụ:
            <Route element={<RequireAdmin />}>
              ... các route /admin/* ...
            </Route>
          Hiện tại để mở để demo giao diện; khi nối backend, bắt buộc phải
          chặn quyền ở phía server, không được tin vào việc ẩn menu ở client.
        */}
        <Route path="/admin/services" element={<ServiceManagement />} />
        <Route path="/admin/packages" element={<PackageManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;