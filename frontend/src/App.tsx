import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ChatWidget from "./components/ChatWidget";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import { AdminLayout, AdvisorLayout, CustomerLayout } from "./layouts/AppShell";
import ModulePlaceholder from "./pages/shared/ModulePlaceholder";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Contact from "./pages/customer/Contact";
import CustomerDashboard from "./pages/customer/Dashboard";
import Services from "./pages/customer/Services";
import Booking from "./pages/customer/Booking";
import Appointments from "./pages/customer/Appointments";
import Cars from "./pages/customer/Cars";
import Account from "./pages/customer/Account";
import RepairStatus from "./pages/customer/RepairStatus";
import ServiceHistory from "./pages/customer/ServiceHistory";
import Quotation from "./pages/customer/Quotation";
import Payment from "./pages/customer/Payment";
import Invoices from "./pages/customer/Invoices";
import Reviews from "./pages/customer/Reviews";
import AdvisorCustomers from "./pages/advisor/Customers";
import AdvisorCustomerCars from "./pages/advisor/Customer-cars";
import AdvisorAppointments from "./pages/advisor/Appointments";
import AdvisorRepairStatus from "./pages/advisor/RepairStatus";
import AdvisorQuotation from "./pages/advisor/Quotation";
import AssignedRepairs from "./pages/technician/AssignedRepairs";
import VehicleCheck from "./pages/technician/VehicleCheck";
import Diagnosis from "./pages/technician/Diagnosis";
import RepairProgress from "./pages/technician/RepairProgress";
import Checklist from "./pages/technician/Checklist";
import AdminDashboard from "./pages/admin/AdminDashboard";
import WorkspaceDashboard from "./pages/shared/WorkspaceDashboard";
import AdminAccounts from "./pages/admin/Accounts";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminServices from "./pages/admin/Services";
import AdminWorkingHours from "./pages/admin/WorkingHours";
import AdminMaintenancePackages from "./pages/admin/MaintenancePackages";
import AdminInventory from "./pages/admin/Inventory";
import AdminReports from "./pages/admin/Reports";

function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><AppErrorBoundary><Routes>
    {/* Public pages continue using their existing components. */}
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/role-selector" element={<Navigate to="/login" replace/>}/>
    <Route path="/services" element={<Services/>}/>

    {/* Customer shell: all legacy business pages retained, not rewritten. */}
    <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><CustomerLayout/></ProtectedRoute>}>
      <Route path="/customer" element={<Navigate to="/customer/appointments" replace/>}/>
      <Route path="/customer/dashboard" element={<CustomerDashboard/>}/>
      <Route path="/customer/booking" element={<Booking/>}/>
      <Route path="/booking" element={<Booking/>}/>
      <Route path="/appointments" element={<Appointments/>}/>
      <Route path="/customer/appointments" element={<Appointments/>}/>
      <Route path="/cars" element={<Cars/>}/>
      <Route path="/customer/cars" element={<Cars/>}/>
      <Route path="/customer/service-history" element={<ServiceHistory/>}/>
      <Route path="/customer/account" element={<Account/>}/>
      <Route path="/contact" element={<Contact/>}/>
      <Route path="/repair-status" element={<RepairStatus/>}/>
      <Route path="/quotation" element={<Quotation/>}/>
      <Route path="/payment" element={<Payment/>}/>
      <Route path="/invoices" element={<Invoices/>}/>
      <Route path="/reviews" element={<Reviews/>}/>
    </Route>
    {/* Shared account alias for older links and other existing roles. */}
    <Route path="/account" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Account/></ProtectedRoute>}/>

    <Route path="/advisor" element={<ProtectedRoute allowedRoles={["ADVISOR"]}><AdvisorLayout/></ProtectedRoute>}>
      <Route index element={<WorkspaceDashboard role="advisor"/>}/>
      <Route path="appointments" element={<AdvisorAppointments/>}/>
      <Route path="reception" element={<ModulePlaceholder area="Cố vấn" title="Tiếp nhận xe" description="Khung tiếp nhận xe theo lịch xác nhận hoặc khách walk-in." owner="Nhóm module tiếp nhận"/>}/>
      <Route path="service-orders" element={<ModulePlaceholder area="Cố vấn" title="Phiếu sửa chữa" description="Danh sách và chi tiết phiếu sửa chữa sẽ được tích hợp sau." owner="Nhóm module phiếu sửa chữa"/>}/>
      <Route path="customers" element={<AdvisorCustomers/>}/>
      <Route path="customer-cars" element={<AdvisorCustomerCars/>}/>
      <Route path="create-booking" element={<ModulePlaceholder area="Cố vấn" title="Đặt lịch hộ" description="Chỉ là màn hình tham chiếu demo; chưa cấp quyền tạo lịch hộ khi chưa có nghiệp vụ và API được nhóm trưởng chốt." owner="Nhóm module lịch hẹn"/>}/>
      <Route path="repair-status" element={<AdvisorRepairStatus/>}/>
      <Route path="quotation" element={<AdvisorQuotation/>}/>
      <Route path="payments" element={<ModulePlaceholder area="Cố vấn" title="Thanh toán" description="Màn hình khung chờ module thanh toán của thành viên phụ trách và API thực tế." owner="Nhóm module thanh toán"/>}/>
    </Route>
    <Route path="/customers" element={<Navigate to="/advisor/customers" replace/>}/>
    <Route path="/customer-cars" element={<Navigate to="/advisor/customer-cars" replace/>}/>

    <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminLayout/></ProtectedRoute>}>
      <Route index element={<AdminDashboard/>}/>
      <Route path="accounts" element={<AdminAccounts/>}/>
      <Route path="customers" element={<AdminCustomers/>}/>
      <Route path="appointments" element={<AdminAppointments/>}/>
      <Route path="services" element={<AdminServices/>}/>
      <Route path="maintenance-packages" element={<AdminMaintenancePackages/>}/>
      <Route path="working-hours" element={<AdminWorkingHours/>}/>
      <Route path="inventory" element={<AdminInventory/>}/>
      <Route path="parts" element={<ModulePlaceholder area="Quản trị" title="Danh mục phụ tùng" description="Màn hình khung để gắn vào API danh mục phụ tùng khi module sẵn sàng." owner="Nhóm module phụ tùng"/>}/>
      <Route path="reports" element={<AdminReports/>}/>
      <Route path="staff" element={<ModulePlaceholder area="Quản trị" title="Nhân sự" description="Trang khung để tích hợp quản lý nhân sự khi có API và card triển khai." owner="Frontend module Admin"/>}/>
    </Route>

    {/* Existing technician module is preserved; Task 01 does not add a technician login/layout. */}
    <Route path="/technician" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><AssignedRepairs/></ProtectedRoute>}/>
    <Route path="/assigned-repairs" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><AssignedRepairs/></ProtectedRoute>}/>
    <Route path="/vehicle-check" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><VehicleCheck/></ProtectedRoute>}/>
    <Route path="/diagnosis" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><Diagnosis/></ProtectedRoute>}/>
    <Route path="/repair-progress" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><RepairProgress/></ProtectedRoute>}/>
    <Route path="/checklist" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><Checklist/></ProtectedRoute>}/>
    <Route path="*" element={<div style={{ padding: 30 }}>Không tìm thấy trang. <a href="/">Về trang chủ</a></div>}/>
  </Routes><ChatWidget/></AppErrorBoundary></AuthProvider></ThemeProvider></BrowserRouter>;
}
export default App;
