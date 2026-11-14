import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { FeedbackProvider } from "./components/ui/FeedbackProvider";
import ChatWidget from "./components/ChatWidget";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import PublicLayout from "./layouts/PublicLayout";
import CustomerAccountLayout from "./layouts/CustomerAccountLayout";
import { AdminLayout, AdvisorLayout, CustomerLayout } from "./layouts/AppShell";
import ModulePlaceholder from "./pages/shared/ModulePlaceholder";
import Home from "./pages/showcase/ReferenceHome";
import Services from "./pages/showcase/ReferenceServices";
import ReferenceAppointments from "./pages/showcase/ReferenceAppointments";
import ReferenceCars from "./pages/showcase/ReferenceCars";
import ReferenceTracking from "./pages/showcase/ReferenceTracking";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Contact from "./pages/showcase/ReferenceContact";
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
import Reviews from "./pages/customer/Reviews";
import AdvisorCustomers from "./pages/advisor/Customers";
import AdvisorCustomerCars from "./pages/advisor/Customer-cars";
import AdvisorAppointments from "./pages/advisor/Appointments";
import ReceptionWorkflow from "./pages/advisor/ReceptionWorkflow";
import AdvisorRepairOrders from "./pages/advisor/AdvisorRepairOrders";
import AdvisorRepairOrderDetail from "./pages/advisor/AdvisorRepairOrderDetail";





import AdminDashboard from "./pages/admin/AdminDashboard";
import WorkspaceDashboard from "./pages/shared/WorkspaceDashboard";
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
import AdminContactMessages from "./pages/admin/ContactMessages";
import AdminGarageSettings from "./pages/admin/GarageSettings";
import AdminMaintenancePackages from "./pages/admin/MaintenancePackages";
import AdminInventory from "./pages/admin/Inventory";
import AdminVehicleCatalog from "./pages/admin/VehicleCatalog";
import AdminReports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/Profile";

function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><AppErrorBoundary><FeedbackProvider><Routes>
    {/* Public pages continue using their existing components. */}
    <Route element={<PublicLayout/>}>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/role-selector" element={<Navigate to="/login" replace/>}/>
    <Route path="/services" element={<Services/>}/>
    {/* Liên hệ: công khai, không cần đăng nhập. */}
    <Route path="/contact" element={<Contact/>}/>
    <Route path="*" element={<NotFound/>}/>

    {/* Customer shell: all legacy business pages retained, not rewritten. */}
    <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><CustomerLayout/></ProtectedRoute>}>
      <Route path="/customer" element={<Navigate to="/customer/appointments" replace/>}/>
      <Route path="/customer/dashboard" element={<CustomerDashboard/>}/>
      <Route path="/customer/booking" element={<Booking/>}/>
      <Route path="/booking" element={<Booking/>}/>
      {/* Khu "Hồ sơ của tôi": các trang tài khoản dùng chung sidebar (CustomerAccountLayout). */}
      <Route element={<CustomerAccountLayout/>}>
        <Route path="/customer/account" element={<Account/>}/>
        <Route path="/appointments" element={<ReferenceAppointments/>}/>
        <Route path="/customer/appointments" element={<ReferenceAppointments/>}/>
        <Route path="/cars" element={<ReferenceCars/>}/>
        <Route path="/customer/cars" element={<ReferenceCars/>}/>
        <Route path="/repair-status" element={<ReferenceTracking/>}/>
        <Route path="/quotation" element={<Quotation/>}/>
        <Route path="/customer/appointments/manage" element={<Appointments/>}/>
        <Route path="/customer/cars/manage" element={<Cars/>}/>
        <Route path="/customer/repair-status/manage" element={<RepairStatus/>}/>
        <Route path="/customer/service-history" element={<ServiceHistory/>}/>
        <Route path="/reviews" element={<Reviews/>}/>
        <Route path="/invoices" element={<Invoices/>}/>
        <Route path="/payment" element={<Payment/>}/>
        <Route path="/payment/vnpay-return" element={<VnpayReturn/>}/>
      </Route>
    </Route>
    </Route>
    {/* Shared account alias for older links and other existing roles. */}
    <Route path="/account" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Account/></ProtectedRoute>}/>

    <Route path="/advisor" element={<ProtectedRoute allowedRoles={["ADVISOR"]}><AdvisorLayout/></ProtectedRoute>}>
      <Route index element={<WorkspaceDashboard role="advisor"/>}/>
      <Route path="appointments" element={<AdvisorAppointments/>}/>
      <Route path="reception" element={<ReceptionWorkflow/>}/>
      <Route path="service-orders" element={<AdvisorRepairOrders/>}/>
      <Route path="service-orders/:orderId" element={<AdvisorRepairOrderDetail/>}/>
      <Route path="customers" element={<AdvisorCustomers/>}/>
      <Route path="customer-cars" element={<AdvisorCustomerCars/>}/>
      <Route path="create-booking" element={<ModulePlaceholder area="Cố vấn" title="Đặt lịch hộ" description="Tạo lịch hẹn thay cho khách gọi điện hoặc đến trực tiếp." owner="Nhóm module lịch hẹn"/>}/>
      {/* Báo giá, tiến độ, thanh toán được thao tác trên chi tiết phiếu; các menu cũ trỏ vào danh sách đã lọc. */}
      <Route path="repair-status" element={<Navigate to="/advisor/service-orders?status=IN_PROGRESS" replace/>}/>
      <Route path="quotation" element={<Navigate to="/advisor/service-orders?status=QUOTING" replace/>}/>
      <Route path="payments" element={<Navigate to="/advisor/service-orders?status=COMPLETED" replace/>}/>
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
      <Route path="contact-messages" element={<AdminContactMessages/>}/>
    </Route>

  </Routes><ChatWidget/></FeedbackProvider></AppErrorBoundary></AuthProvider></ThemeProvider></BrowserRouter>;
}
export default App;
