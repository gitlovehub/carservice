import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./pages/auth/ProtectedRoute";

const Home = lazy(() => import("./pages/Home"));

const Contact = lazy(() => import("./pages/customer/Contact"));
const Services = lazy(() => import("./pages/customer/Services"));
const Booking = lazy(() => import("./pages/customer/Booking"));
const Appointments = lazy(() => import("./pages/customer/Appointments"));
const Cars = lazy(() => import("./pages/customer/Cars"));
const Account = lazy(() => import("./pages/customer/Account"));
const RepairStatus = lazy(() => import("./pages/customer/RepairStatus"));
const Quotation = lazy(() => import("./pages/customer/Quotation"));
const Payment = lazy(() => import("./pages/customer/Payment"));
const Invoices = lazy(() => import("./pages/customer/Invoices"));
const Reviews = lazy(() => import("./pages/customer/Reviews"));

const AdvisorCustomers = lazy(() => import("./pages/advisor/Customers"));
const AdvisorCustomerCars = lazy(() => import("./pages/advisor/Customer-cars"));
const AdvisorAppointments = lazy(() => import("./pages/advisor/Appointments"));
const AdvisorRepairStatus = lazy(() => import("./pages/advisor/RepairStatus"));
const AdvisorQuotation = lazy(() => import("./pages/advisor/Quotation"));

const AssignedRepairs = lazy(() => import("./pages/technician/AssignedRepairs"));
const VehicleCheck = lazy(() => import("./pages/technician/VehicleCheck"));
const Diagnosis = lazy(() => import("./pages/technician/Diagnosis"));
const RepairProgress = lazy(() => import("./pages/technician/RepairProgress"));
const Checklist = lazy(() => import("./pages/technician/Checklist"));

const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const Register = lazy(() => import("./pages/auth/Register"));
const RoleSelector = lazy(() => import("./pages/auth/RoleSelector"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAccounts = lazy(() => import("./pages/admin/Accounts"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminMaintenancePackages = lazy(() => import("./pages/admin/MaintenancePackages"));
const AdminInventory = lazy(() => import("./pages/admin/Inventory"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5] text-[#1F2933]">
            Đang tải trang...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/role-selector" element={<RoleSelector />} />

          <Route path="/customer" element={<Navigate to="/" replace />} />

          <Route path="/contact" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Contact /></ProtectedRoute>} />
          <Route path="/services" element={<Services />} />
          <Route path="/booking" element={<Booking />} />

          <Route path="/appointments" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Appointments /></ProtectedRoute>} />
          <Route path="/customer/appointments" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Appointments /></ProtectedRoute>} />

          <Route path="/cars" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Cars /></ProtectedRoute>} />
          <Route path="/customer/cars" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Cars /></ProtectedRoute>} />

          <Route path="/account" element={<ProtectedRoute allowedRoles={["CUSTOMER", "ADMIN", "ADVISOR", "TECHNICIAN"]}><Account /></ProtectedRoute>} />
          <Route path="/repair-status" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><RepairStatus /></ProtectedRoute>} />
          <Route path="/quotation" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Quotation /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Payment /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Invoices /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><Reviews /></ProtectedRoute>} />

          <Route path="/advisor/customers" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorCustomers /></ProtectedRoute>} />
          <Route path="/advisor/customer-cars" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorCustomerCars /></ProtectedRoute>} />
          <Route path="/advisor/appointments" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorAppointments /></ProtectedRoute>} />
          <Route path="/advisor/repair-status" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorRepairStatus /></ProtectedRoute>} />
          <Route path="/advisor/quotation" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorQuotation /></ProtectedRoute>} />

          <Route path="/customers" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorCustomers /></ProtectedRoute>} />
          <Route path="/customer-cars" element={<ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}><AdvisorCustomerCars /></ProtectedRoute>} />

          <Route path="/technician" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><AssignedRepairs /></ProtectedRoute>} />
          <Route path="/assigned-repairs" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><AssignedRepairs /></ProtectedRoute>} />
          <Route path="/vehicle-check" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><VehicleCheck /></ProtectedRoute>} />
          <Route path="/diagnosis" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><Diagnosis /></ProtectedRoute>} />
          <Route path="/repair-progress" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><RepairProgress /></ProtectedRoute>} />
          <Route path="/checklist" element={<ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}><Checklist /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/accounts" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminAccounts /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminCustomers /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminAppointments /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminServices /></ProtectedRoute>} />
          <Route path="/admin/maintenance-packages" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminMaintenancePackages /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminInventory /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminReports /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;