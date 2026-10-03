import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
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
import Customers from "./pages/customer/Customers";
import AdvisorCustomer from "./pages/advisor/Customers";
import AdvisorCustomerCars from "./pages/advisor/Customer-cars";
import AdvisorAppointments from "./pages/advisor/Appointments";
import AdvisorRepairStatus from "./pages/advisor/RepairStatus";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/cars" element={<Cars />} />
        <Route path="/account" element={<Account />} />
        <Route path="/repair-status" element={<RepairStatus />} />
        <Route path="/quotation" element={<Quotation />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/customers" element={<Customers />} />

        <Route
          path="/advisor/customers"
          element={<AdvisorCustomer />}
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;