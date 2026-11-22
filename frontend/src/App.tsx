import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { FeedbackProvider } from "./components/ui/FeedbackProvider";
import { FormValidationHost } from "./components/ui/FormValidationHost";
import ChatWidget from "./components/ChatWidget";
import ScrollToTopButton from "./components/ScrollToTopButton";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import GuestOnlyRoute from "./pages/auth/GuestOnlyRoute";
import PublicLayout from "./layouts/PublicLayout";
import CustomerAccountLayout from "./layouts/CustomerAccountLayout";
import { AdminLayout, AdvisorLayout, CustomerLayout } from "./layouts/AppShell";
import ModulePlaceholder from "./pages/shared/ModulePlaceholder";
import Home from "./pages/showcase/ReferenceHome";
import Services from "./pages/showcase/ReferenceServices";
import ServiceGuidePage from "./pages/showcase/ServiceGuidePage";
import ReferenceTracking from "./pages/showcase/ReferenceTracking";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Contact from "./pages/showcase/ReferenceContact";
import About from "./pages/showcase/ReferenceAbout";
import CustomerDashboard from "./pages/customer/Dashboard";
import Booking from "./pages/customer/Booking";
import Appointments from "./pages/customer/Appointments";
import Cars from "./pages/customer/Cars";
import Account from "./pages/customer/Account";
import RepairStatus from "./pages/customer/RepairStatus";
import ServiceHistory from "./pages/customer/ServiceHistory";
import Quotation from "./pages/customer/Quotation";
import Payment from "./pages/customer/Payment";
import VnpayReturn from "./pages/customer/VnpayReturn";
import Invoices from "./pages/customer/Invoices";
import AdvisorCustomers from "./pages/advisor/Customers";
import AdvisorCustomerCars from "./pages/advisor/Customer-cars";
import AdvisorAppointments from "./pages/advisor/Appointments";
import ReceptionWorkflow from "./pages/advisor/ReceptionWorkflow";
import AdvisorRepairOrders from "./pages/advisor/AdvisorRepairOrders";
import AdvisorRepairOrderDetail from "./pages/advisor/AdvisorRepairOrderDetail";
import AdvisorQuotations from "./pages/advisor/AdvisorQuotations";
import AdvisorRepairProgress from "./pages/advisor/AdvisorRepairProgress";
import AdvisorParts from "./pages/advisor/AdvisorParts";
import AdvisorDelivery from "./pages/advisor/AdvisorDelivery";
import AdvisorHandovers from "./pages/advisor/AdvisorHandovers";
import AdvisorBilling from "./pages/advisor/AdvisorBilling";
import AdvisorCreateBooking from "./pages/advisor/CreateBooking";
import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";





import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAccounts from "./pages/admin/Accounts";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminServices from "./pages/admin/Services";
import AdminWorkingHours from "./pages/admin/WorkingHours";
import AdminStaff from "./pages/admin/Staff";
import AdminRepairOrders from "./pages/admin/RepairOrders";
import AdminInvoices from "./pages/admin/Invoices";
import AdminReviews from "./pages/admin/Reviews";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminHandoverExceptions from "./pages/admin/HandoverExceptions";
import AdminContactMessages from "./pages/admin/ContactMessages";
import AdminGarageSettings from "./pages/admin/GarageSettings";
import AdminMaintenancePackages from "./pages/admin/MaintenancePackages";
import AdminInventory from "./pages/admin/Inventory";
import AdminVehicleCatalog from "./pages/admin/VehicleCatalog";
import AdminReports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/Profile";

/** Link cũ /reviews (?orderId=) → Lịch sử bảo dưỡng; có orderId thì mở sẵn modal đánh giá của phiếu đó. */
function LegacyReviewsRedirect() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  return <Navigate to={orderId ? `/customer/service-history?review=${encodeURIComponent(orderId)}` : "/customer/service-history"} replace/>;
}

function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><AppErrorBoundary><FeedbackProvider><Routes>
    {/* Public pages continue using their existing components. */}
    <Route element={<PublicLayout/>}>
    <Route path="/" element={<Home/>}/>
    {/* Đăng nhập / Đăng ký chỉ cho khách chưa đăng nhập; đã đăng nhập → chuyển về trang phù hợp (GuestOnlyRoute). */}
    <Route path="/login" element={<GuestOnlyRoute><Login/></GuestOnlyRoute>}/>
    <Route path="/register" element={<GuestOnlyRoute><Register/></GuestOnlyRoute>}/>
    {/* Quên mật khẩu mở cả khi đã đăng nhập (tab Bảo mật ở Hồ sơ dẫn tới đây để đặt lại qua OTP email). */}
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/role-selector" element={<Navigate to="/login" replace/>}/>
    <Route path="/services" element={<Services/>}/>
    {/* Trang chi tiết nhóm dịch vụ chủ lực: bài viết + gợi ý theo tình trạng + chọn dịch vụ → đặt lịch. */}
    <Route path="/services/:slug" element={<ServiceGuidePage/>}/>
    {/* Liên hệ & Về chúng tôi: công khai, không cần đăng nhập. */}
    <Route path="/contact" element={<Contact/>}/>
    <Route path="/about" element={<About/>}/>
    <Route path="*" element={<NotFound/>}/>

    {/* Đặt lịch: KHÔNG bắt đăng nhập để khách điền trước; bản nháp được lưu,
        tới bước gửi mới yêu cầu đăng nhập rồi quay lại đúng trang với dữ liệu cũ (Booking.tsx). */}
    <Route element={<CustomerLayout/>}>
      <Route path="/booking" element={<Booking/>}/>
      <Route path="/customer/booking" element={<Booking/>}/>
      {/* Tiến độ sửa chữa: trang riêng ở menu chính. Chưa đăng nhập → tra cứu bằng mã phiếu/lịch hẹn + 4 số cuối SĐT;
          khách đã đăng nhập → danh sách phiếu của tài khoản (ReferenceTracking tự chọn giao diện). */}
      <Route path="/repair-status" element={<ReferenceTracking/>}/>
    </Route>

    {/* Customer shell: all legacy business pages retained, not rewritten. */}
    <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><CustomerLayout/></ProtectedRoute>}>
      <Route path="/customer" element={<Navigate to="/customer/appointments" replace/>}/>
      <Route path="/customer/dashboard" element={<CustomerDashboard/>}/>
      {/* Biên bản, ảnh & chẩn đoán đầy đủ của phiếu (cần đăng nhập). */}
      <Route path="/customer/repair-status/manage" element={<RepairStatus/>}/>
      {/* Khu "Hồ sơ của tôi": các trang tài khoản dùng chung sidebar (CustomerAccountLayout). */}
      <Route element={<CustomerAccountLayout/>}>
        <Route path="/customer/account" element={<Account/>}/>
        {/* Lịch hẹn: một trang duy nhất trong khu tài khoản (xem, đổi giờ, hủy ngay trong modal). */}
        <Route path="/appointments" element={<Navigate to="/customer/appointments" replace/>}/>
        <Route path="/customer/appointments" element={<Appointments/>}/>
        {/* "Xe của tôi": một trang quản lý duy nhất (thêm/sửa/xóa, đặt lịch cho xe). */}
        <Route path="/cars" element={<Navigate to="/customer/cars" replace/>}/>
        <Route path="/customer/cars" element={<Cars/>}/>
        <Route path="/quotation" element={<Quotation/>}/>
        <Route path="/customer/appointments/manage" element={<Navigate to="/customer/appointments" replace/>}/>
        <Route path="/customer/cars/manage" element={<Navigate to="/customer/cars" replace/>}/>
        <Route path="/customer/service-history" element={<ServiceHistory/>}/>
        {/* Không còn trang Đánh giá riêng: link cũ /reviews?orderId= chuyển sang Lịch sử và mở modal của đúng phiếu. */}
        <Route path="/reviews" element={<LegacyReviewsRedirect/>}/>
        <Route path="/invoices" element={<Invoices/>}/>
        <Route path="/payment" element={<Payment/>}/>
        <Route path="/payment/vnpay-return" element={<VnpayReturn/>}/>
      </Route>
    </Route>
    </Route>
    {/* Shared account alias for older links and other existing roles. */}
    <Route path="/account" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Account/></ProtectedRoute>}/>

    <Route path="/advisor" element={<ProtectedRoute allowedRoles={["ADVISOR"]}><AdvisorLayout/></ProtectedRoute>}>
      <Route index element={<AdvisorDashboard/>}/>
      <Route path="appointments" element={<AdvisorAppointments/>}/>
      <Route path="reception" element={<ReceptionWorkflow/>}/>
      <Route path="service-orders" element={<AdvisorRepairOrders/>}/>
      <Route path="service-orders/:orderId" element={<AdvisorRepairOrderDetail/>}/>
      <Route path="customers" element={<AdvisorCustomers/>}/>
      <Route path="customer-cars" element={<AdvisorCustomerCars/>}/>
      <Route path="create-booking" element={<AdvisorCreateBooking/>}/>
      {/* Báo giá, tiến độ, thanh toán được thao tác trên chi tiết phiếu; các menu cũ trỏ vào danh sách đã lọc. */}
      <Route path="repair-status" element={<Navigate to="/advisor/repair-progress" replace/>}/>
      <Route path="quotations" element={<AdvisorQuotations/>}/>
      <Route path="repair-progress" element={<AdvisorRepairProgress/>}/>
      <Route path="parts" element={<AdvisorParts/>}/>
      <Route path="delivery" element={<AdvisorDelivery/>}/>
      <Route path="handovers" element={<AdvisorHandovers/>}/>
      <Route path="quotation" element={<Navigate to="/advisor/quotations" replace/>}/>
      <Route path="payments" element={<AdvisorBilling/>}/>
      <Route path="profile" element={<AdminProfile area="advisor"/>}/>
    </Route>
    <Route path="/customers" element={<Navigate to="/advisor/customers" replace/>}/>
    <Route path="/customer-cars" element={<Navigate to="/advisor/customer-cars" replace/>}/>

    <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminLayout/></ProtectedRoute>}>
      <Route index element={<AdminDashboard/>}/>
      <Route path="accounts" element={<AdminAccounts/>}/>
      <Route path="advisor-activity" element={<Navigate to="/admin/audit-logs?tab=advisors" replace/>}/>
      <Route path="customers" element={<AdminCustomers/>}/>
      <Route path="appointments" element={<AdminAppointments/>}/>
      <Route path="services" element={<AdminServices/>}/>
      <Route path="maintenance-packages" element={<AdminMaintenancePackages/>}/>
      <Route path="vehicle-catalog" element={<Navigate to="/admin/vehicle-brands" replace/>}/>
      <Route path="working-hours" element={<AdminWorkingHours/>}/>
      <Route path="garage" element={<AdminGarageSettings/>}/>
      <Route path="inventory" element={<AdminInventory/>}/>
      <Route path="parts" element={<Navigate to="/admin/inventory" replace/>}/>
      <Route path="reports" element={<AdminReports/>}/>
      <Route path="profile" element={<AdminProfile/>}/>
      <Route path="promotions" element={<ModulePlaceholder area="Quản trị" title="Khuyến mãi" description="Mã giảm giá và chương trình ưu đãi cho khách hàng." owner="PROMO-01"/>}/>
      <Route path="staff" element={<AdminStaff/>}/>
      <Route path="repair-orders" element={<AdminRepairOrders/>}/>
      <Route path="invoices" element={<AdminInvoices/>}/>
      <Route path="reviews" element={<AdminReviews/>}/>
      {/* Hãng & dòng xe: trang thật dùng API /api/admin/vehicle-{brands,models,trims} (không dùng mock). */}
      <Route path="vehicle-brands" element={<AdminVehicleCatalog/>}/>
      <Route path="audit-logs" element={<AdminAuditLogs/>}/>
      <Route path="handover-exceptions" element={<AdminHandoverExceptions/>}/>
      <Route path="contact-messages" element={<AdminContactMessages/>}/>
    </Route>

  </Routes><ScrollToTopButton/><ChatWidget/></FeedbackProvider><FormValidationHost/></AppErrorBoundary></AuthProvider></ThemeProvider></BrowserRouter>;
}
export default App;
