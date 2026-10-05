import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CustomerDashboard from "./pages/customer/Dashboard";

import Contact from "./pages/customer/Contact";
import Services from "./pages/customer/Services";
import Booking from "./pages/customer/Booking";
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

import AdminAccounts from "./pages/admin/Accounts";
import AdminServices from "./pages/admin/Services";
import AdminInventory from "./pages/admin/Inventory";
import AdminReports from "./pages/admin/Reports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/customer" element={<CustomerDashboard />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />
        <Route path="/booking" element={<Booking />} />

        <Route path="/appointments" element={<Appointments />} />
        <Route path="/cars" element={<Cars />} />

        <Route path="/customer/appointments" element={<Appointments />} />
        <Route path="/customer/cars" element={<Cars />} />

        <Route path="/account" element={<Account />} />
        <Route path="/repair-status" element={<RepairStatus />} />
        <Route path="/quotation" element={<Quotation />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/reviews" element={<Reviews />} />

        <Route
          path="/advisor/customers"
          element={<AdvisorCustomers />}
        />
        <Route
          path="/advisor/customer-cars"
          element={<AdvisorCustomerCars />}
        />
        <Route
          path="/advisor/appointments"
          element={<AdvisorAppointments />}
        />
        <Route
          path="/advisor/repair-status"
          element={<AdvisorRepairStatus />}
        />
        <Route
          path="/advisor/quotation"
          element={<AdvisorQuotation />}
        />

        <Route
          path="/customers"
          element={<AdvisorCustomers />}
        />
        <Route
          path="/customer-cars"
          element={<AdvisorCustomerCars />}
        />

        <Route
          path="/technician"
          element={<AssignedRepairs />}
        />
        <Route
          path="/assigned-repairs"
          element={<AssignedRepairs />}
        />
        <Route
          path="/vehicle-check"
          element={<VehicleCheck />}
        />
        <Route
          path="/diagnosis"
          element={<Diagnosis />}
        />
        <Route
          path="/repair-progress"
          element={<RepairProgress />}
        />
        <Route
          path="/checklist"
          element={<Checklist />}
        />

        <Route
          path="/admin"
          element={<AdminAccounts />}
        />
        <Route
          path="/admin/services"
          element={<AdminServices />}
        />
        <Route
          path="/admin/inventory"
          element={<AdminInventory />}
        />
        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;