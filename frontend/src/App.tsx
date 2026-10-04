import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import VehicleManagement from "./pages/VehicleManagement";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/vehicles" element={<VehicleManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
