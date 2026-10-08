import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./pages/auth/ProtectedRoute";

import Home from "./pages/Home";

import CustomerDashboard from "./pages/customer/Dashboard";
import Contact from "./pages/customer/Contact";
import Services from "./pages/customer/Services";
import Booking from "./pages/Booking";
import CustomerBooking from "./pages/customer/Booking";
import Appointments from "./pages/customer/Appointments";
import Cars from "./pages/customer/Cars";
import Account from "./pages/customer/Account";
import RepairStatus from "./pages/customer/RepairStatus";
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

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Register from "./pages/auth/Register";
import RoleSelector from "./pages/auth/RoleSelector";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAccounts from "./pages/admin/Accounts";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminServices from "./pages/admin/Services";
import AdminInventory from "./pages/admin/Inventory";
import AdminReports from "./pages/admin/Reports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route path="/register" element={<Register />} />

        <Route path="/role-selector" element={<RoleSelector />} />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/booking"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <CustomerBooking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contact"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Contact />
            </ProtectedRoute>
          }
        />

        <Route
          path="/services"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Services />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Booking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/appointments"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cars"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Cars />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/cars"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Cars />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Account />
            </ProtectedRoute>
          }
        />

        <Route
          path="/repair-status"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <RepairStatus />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quotation"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Quotation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Payment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Invoices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reviews"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <Reviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor/customers"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorCustomers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor/customer-cars"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorCustomerCars />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor/appointments"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorAppointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor/repair-status"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorRepairStatus />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advisor/quotation"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorQuotation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorCustomers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer-cars"
          element={
            <ProtectedRoute allowedRoles={["ADVISOR", "ADMIN"]}>
              <AdvisorCustomerCars />
            </ProtectedRoute>
          }
        />

        <Route
          path="/technician"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <AssignedRepairs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assigned-repairs"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <AssignedRepairs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicle-check"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <VehicleCheck />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diagnosis"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <Diagnosis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/repair-progress"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <RepairProgress />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checklist"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <Checklist />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminAccounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminCustomers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminAppointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminServices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminInventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReports />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;