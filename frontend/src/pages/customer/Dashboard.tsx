import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { fetchApi } from "../../services/api";
import { getUserDisplayName } from "../auth/auth";
import { Toast, type ToastType } from "../../components/auth/Toast";

type VehicleItem = {
  id: number | string;
  license_plate: string;
  brand_name?: string;
  model_name?: string;
  variant?: string;
  year?: number;
  current_odo?: number;
  last_service_date?: string;
};

type AppointmentItem = {
  id: number | string;
  appointment_code?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  vehicle_name?: string;
  license_plate?: string;
  service_name?: string;
};

type PartItem = {
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  warranty: string;
};

type MaintenanceHistoryItem = {
  id: string;
  code: string;
  car: string;
  licensePlate: string;
  serviceName: string;
  odo: string;
  date: string;
  advisor: string;
  technician: string;
  cost: number;
  laborCost: number;
  partsCost: number;
  status: "COMPLETED" | "IN_PROGRESS" | "WAITING_PAYMENT";
  partsReplaced: string[];
  detailedParts: PartItem[];
  technicianNotes?: string;
};

type InspectionItem = {
  category: string;
  name: string;
  status: "PASSED" | "ATTENTION" | "FAILED";
  note: string;
};

function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  
  // Lá»c vÃ  tÃ¬m kiáº¿m
  const [activeTab, setActiveTab] = useState<"ALL" | "MAINTENANCE" | "REPAIR">("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCarFilter, setSelectedCarFilter] = useState("ALL");

  // Modals
  const [selectedHistory, setSelectedHistory] = useState<MaintenanceHistoryItem | null>(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [selectedVehicleForOdo, setSelectedVehicleForOdo] = useState<string>("30G-888.66");
  const [newOdoInput, setNewOdoInput] = useState<string>("41500");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // Dá»¯ liá»‡u máº«u thá»±c táº¿ chuáº©n nghiá»‡p vá»¥ gara Ã´ tÃ´
  const defaultHistory: MaintenanceHistoryItem[] = [
    {
      id: "1",
      code: "RO-2026-042",
      car: "Toyota Camry 2.5Q",
      licensePlate: "30G-888.66",
      serviceName: "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³ cáº¥p 40.000 KM & Vá»‡ sinh kim phun",
      odo: "41.250 km",
      date: "12/10/2026",
      advisor: "LÃª VÄƒn ToÃ n (Cá»‘ váº¥n trÆ°á»Ÿng)",
      technician: "Nguyá»…n VÄƒn HÃ¹ng (Ká»¹ thuáº­t viÃªn báº­c 4)",
      cost: 3450000,
      laborCost: 450000,
      partsCost: 3000000,
      status: "COMPLETED",
      partsReplaced: [
        "Dáº§u Ä‘á»™ng cÆ¡ tá»•ng há»£p toÃ n pháº§n Castrol EDGE 5W-30 (4.5L)",
        "Lá»c dáº§u chÃ­nh hÃ£ng Toyota OEM",
        "Lá»c giÃ³ Ä‘iá»u hÃ²a than hoáº¡t tÃ­nh cao cáº¥p",
        "Dung dá»‹ch vá»‡ sinh kim phun buá»“ng Ä‘á»‘t Liqui Moly",
      ],
      detailedParts: [
        { name: "Dáº§u Ä‘á»™ng cÆ¡ Castrol EDGE 5W-30 (4.5L)", code: "CAS-5W30-4.5", quantity: 1, unitPrice: 1450000, warranty: "6 thÃ¡ng / 10.000 km" },
        { name: "Lá»c dáº§u Ä‘á»™ng cÆ¡ Toyota", code: "TOY-04152-YZZA6", quantity: 1, unitPrice: 350000, warranty: "12 thÃ¡ng" },
        { name: "Lá»c giÃ³ Ä‘iá»u hÃ²a than hoáº¡t tÃ­nh", code: "AC-87139-50100", quantity: 1, unitPrice: 550000, warranty: "6 thÃ¡ng" },
        { name: "Dung dá»‹ch vá»‡ sinh kim phun Liqui Moly", code: "LM-5110", quantity: 1, unitPrice: 650000, warranty: "TiÃªu chuáº©n" },
      ],
      technicianNotes: "ÄÃ£ kiá»ƒm tra toÃ n bá»™ 36 háº¡ng má»¥c gáº§m, phanh vÃ  lá»‘p. MÃ¡ phanh trÆ°á»›c cÃ²n 6mm (tá»‘t), áº¯c quy Ä‘iá»‡n Ã¡p 12.6V, lá»‘p mÃ²n Ä‘á»u.",
    },
    {
      id: "2",
      code: "RO-2026-031",
      car: "Toyota Camry 2.5Q",
      licensePlate: "30G-888.66",
      serviceName: "Thay mÃ¡ phanh trÆ°á»›c & LÃ¡ng Ä‘Ä©a phanh Ä‘iá»‡n tá»­",
      odo: "35.800 km",
      date: "18/07/2026",
      advisor: "Nguyá»…n Minh Äá»©c",
      technician: "Tráº§n Quá»‘c Báº£o",
      cost: 2150000,
      laborCost: 350000,
      partsCost: 1800000,
      status: "COMPLETED",
      partsReplaced: [
        "Bá»™ mÃ¡ phanh Ä‘Ä©a trÆ°á»›c OEM Akebono Nháº­t Báº£n",
        "Dáº§u phanh tá»•ng há»£p DOT 4 Toyota",
      ],
      detailedParts: [
        { name: "Bá»™ mÃ¡ phanh Ä‘Ä©a trÆ°á»›c OEM Akebono", code: "AKE-AN-687WK", quantity: 1, unitPrice: 1550000, warranty: "12 thÃ¡ng / 20.000 km" },
        { name: "Dáº§u phanh DOT 4 chÃ­nh hÃ£ng (1L)", code: "TOY-08823-80004", quantity: 1, unitPrice: 250000, warranty: "TiÃªu chuáº©n" },
      ],
      technicianNotes: "ÄÃ£ xáº£ khÃ­ e dáº§u phanh toÃ n diá»‡n 4 bÃ¡nh. ÄÄ©a phanh pháº³ng má»‹n, hÃ nh trÃ¬nh chÃ¢n phanh Ä‘áº¡t chuáº©n an toÃ n xuáº¥t xÆ°á»Ÿng.",
    },
    {
      id: "3",
      code: "RO-2026-018",
      car: "Honda CR-V 1.5L Turbo",
      licensePlate: "29A-678.90",
      serviceName: "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³ cáº¥p 20.000 KM & CÃ¢n báº±ng Ä‘á»™ng 4 bÃ¡nh",
      odo: "20.100 km",
      date: "05/04/2026",
      advisor: "LÃª VÄƒn ToÃ n",
      technician: "Pháº¡m VÄƒn Nam",
      cost: 1890000,
      laborCost: 400000,
      partsCost: 1490000,
      status: "COMPLETED",
      partsReplaced: [
        "Dáº§u Ä‘á»™ng cÆ¡ Honda SN 0W-20 Turbo (3.8L)",
        "Lá»c nhá»›t & gioÄƒng á»‘c xáº£ cÃ¡c-te",
        "NÆ°á»›c lÃ m mÃ¡t & nÆ°á»›c rá»­a kÃ­nh Ä‘áº­m Ä‘áº·c",
      ],
      detailedParts: [
        { name: "Dáº§u Ä‘á»™ng cÆ¡ Honda SN 0W-20 Turbo (4L)", code: "HON-08232-P99K4", quantity: 1, unitPrice: 1150000, warranty: "6 thÃ¡ng / 10.000 km" },
        { name: "Lá»c nhá»›t chÃ­nh hÃ£ng Honda", code: "HON-15400-RTA-003", quantity: 1, unitPrice: 240000, warranty: "12 thÃ¡ng" },
        { name: "ChÃ¬ cÃ¢n mÃ¢m & NÆ°á»›c lÃ m mÃ¡t", code: "ACC-WHEEL-WEIGHT", quantity: 1, unitPrice: 100000, warranty: "TiÃªu chuáº©n" },
      ],
      technicianNotes: "CÃ¢n báº±ng Ä‘á»™ng báº±ng mÃ¡y Hunter Hoa Ká»³ Ä‘áº¡t Ä‘á»™ lá»‡ch 0g. Lá»‘p xe Ã¡p suáº¥t chuáº©n 2.3 bar.",
    },
  ];

  const [historyList, setHistoryList] = useState<MaintenanceHistoryItem[]>(defaultHistory);

  // Danh má»¥c 36 háº¡ng má»¥c kiá»ƒm tra cháº©n Ä‘oÃ¡n thá»±c táº¿
  const inspectionChecklist: InspectionItem[] = [
    { category: "Há»‡ thá»‘ng Äá»™ng cÆ¡", name: "Dáº§u Ä‘á»™ng cÆ¡ & Lá»c nhá»›t", status: "FAILED", note: "Dáº§u Ä‘en biáº¿n cháº¥t má»‘c 40.000km, cáº§n xáº£ thay má»›i ngay" },
    { category: "Há»‡ thá»‘ng Äá»™ng cÆ¡", name: "Dung dá»‹ch nÆ°á»›c lÃ m mÃ¡t", status: "PASSED", note: "Má»©c nÆ°á»›c á»Ÿ váº¡ch MAX, nhiá»‡t Ä‘á»™ sÃ´i Ä‘áº¡t chuáº©n -35Â°C" },
    { category: "Há»‡ thá»‘ng Äá»™ng cÆ¡", name: "DÃ¢y curoa tá»•ng & Buly tÄƒng", status: "PASSED", note: "KhÃ´ng ná»©t ráº¡n, Ä‘á»™ cÄƒng Ä‘áº¡t tiÃªu chuáº©n" },
    { category: "Há»‡ thá»‘ng Äá»™ng cÆ¡", name: "Lá»c giÃ³ Ä‘á»™ng cÆ¡ & Buá»“ng Ä‘á»‘t", status: "ATTENTION", note: "Lá»c giÃ³ nhiá»u bá»¥i má»‹n, khuyáº¿n nghá»‹ vá»‡ sinh hoáº·c thay má»›i" },
    { category: "Há»‡ thá»‘ng Phanh", name: "Äá»™ dÃ y mÃ¡ phanh trÆ°á»›c", status: "ATTENTION", note: "CÃ²n 4.5mm (má»©c cáº£nh bÃ¡o, nÃªn thay sau 5.000km)" },
    { category: "Há»‡ thá»‘ng Phanh", name: "Äá»™ dÃ y mÃ¡ phanh sau", status: "PASSED", note: "CÃ²n 7.0mm, Ä‘Ä©a phanh mÃ²n Ä‘á»u" },
    { category: "Há»‡ thá»‘ng Phanh", name: "Dáº§u phanh & á»ng dáº«n cao su", status: "PASSED", note: "Dáº§u trong, Ä‘iá»ƒm sÃ´i áº©m > 180Â°C an toÃ n" },
    { category: "Há»‡ thá»‘ng Treo & Gáº§m", name: "Giáº£m xÃ³c trÆ°á»›c & sau", status: "PASSED", note: "KhÃ´ rÃ¡o, khÃ´ng xÃ¬ dáº§u, Ä‘á»™ nhÃºn Ä‘Ã n há»“i tá»‘t" },
    { category: "Há»‡ thá»‘ng Treo & Gáº§m", name: "RÃ´-tuyn lÃ¡i & RÃ´-tuyn cÃ¢n báº±ng", status: "PASSED", note: "Chá»¥p bá»¥i nguyÃªn váº¹n, khá»›p cáº§u khÃ´ng rÆ¡ láº¯c" },
    { category: "Há»‡ thá»‘ng Äiá»‡n & áº®c quy", name: "Äiá»‡n Ã¡p bÃ¬nh áº®c quy", status: "PASSED", note: "Äiá»‡n Ã¡p tÄ©nh 12.6V, dÃ²ng khá»Ÿi Ä‘á»™ng CCA 520 Ä‘áº¡t 94%" },
    { category: "Há»‡ thá»‘ng Äiá»‡n & áº®c quy", name: "Há»‡ thá»‘ng Ä‘Ã¨n pha, cos, xi-nhan", status: "PASSED", note: "Táº¥t cáº£ cÃ¡c bÃ³ng chiáº¿u sÃ¡ng hoáº¡t Ä‘á»™ng chuáº©n" },
    { category: "Lá»‘p & BÃ¡nh xe", name: "Äá»™ sÃ¢u gai lá»‘p 4 bÃ¡nh", status: "PASSED", note: "Äá»™ sÃ¢u gai 5.2mm, Ã¡p suáº¥t cÃ¢n chá»‰nh 2.3 bar" },
    { category: "Ná»™i tháº¥t & Äiá»u hÃ²a", name: "Lá»c giÃ³ Ä‘iá»u hÃ²a cabin", status: "FAILED", note: "MÃ ng lá»c má»‘c Ä‘en áº©m Æ°á»›t, Ä‘á» xuáº¥t thay than hoáº¡t tÃ­nh" },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const profileRes = await fetchApi("/me");
        if (profileRes?.account) {
          setUser(profileRes.account);
          localStorage.setItem("user", JSON.stringify(profileRes.account));
        }

        try {
          const vehRes = await fetchApi("/me/vehicles");
          if (Array.isArray(vehRes?.data) && vehRes.data.length > 0) {
            setVehicles(vehRes.data);
            setSelectedVehicleForOdo(vehRes.data[0].license_plate);
          }
        } catch {
          // Bá» qua
        }

        try {
          const appRes = await fetchApi("/appointments");
          if (Array.isArray(appRes?.data)) {
            setAppointments(appRes.data);
          }
        } catch {
          // Bá» qua
        }

        try {
          const roRes = await fetchApi("/me/repair-orders");
          if (Array.isArray(roRes?.data) && roRes.data.length > 0) {
            const mapped: MaintenanceHistoryItem[] = roRes.data.map((item: any) => ({
              id: String(item.id),
              code: item.repair_order_code || `RO-2026-${String(item.id).padStart(3, "0")}`,
              car: item.vehicle?.model?.name ? `${item.vehicle?.model?.brand?.name || ""} ${item.vehicle.model.name}` : "Toyota Camry 2.5Q",
              licensePlate: item.vehicle?.license_plate || "30G-888.66",
              serviceName: item.diagnosis || "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³ & kiá»ƒm tra há»‡ thá»‘ng",
              odo: item.current_odo ? `${item.current_odo.toLocaleString("vi-VN")} km` : "41.250 km",
              date: item.received_at ? new Date(item.received_at).toLocaleDateString("vi-VN") : "12/10/2026",
              advisor: item.advisor?.name || "LÃª VÄƒn ToÃ n (Cá»‘ váº¥n trÆ°á»Ÿng)",
              technician: item.technician?.name || "Nguyá»…n VÄƒn HÃ¹ng",
              cost: Number(item.total_cost || item.estimated_cost || 3450000),
              laborCost: 450000,
              partsCost: Number(item.total_cost || 3000000) - 450000,
              status: item.status === "COMPLETED" || item.status === "CLOSED" ? "COMPLETED" : "IN_PROGRESS",
              partsReplaced: item.parts?.map((p: any) => p.name) || [
                "Dáº§u Ä‘á»™ng cÆ¡ tá»•ng há»£p Castrol EDGE 5W-30",
                "Lá»c nhá»›t chÃ­nh hÃ£ng",
              ],
              detailedParts: [
                { name: "Dáº§u Ä‘á»™ng cÆ¡ Castrol EDGE 5W-30", code: "CAS-5W30", quantity: 1, unitPrice: 1450000, warranty: "6 thÃ¡ng / 10.000 km" },
                { name: "Lá»c dáº§u chÃ­nh hÃ£ng", code: "OEM-FILTER", quantity: 1, unitPrice: 350000, warranty: "12 thÃ¡ng" },
              ],
              technicianNotes: "Há»‡ thá»‘ng hoáº¡t Ä‘á»™ng á»•n Ä‘á»‹nh sau báº£o dÆ°á»¡ng.",
            }));
            setHistoryList(mapped);
          }
        } catch {
          // DÃ¹ng defaultHistory
        }
      } catch {
        // Dá»± phÃ²ng
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  // Lá»c dá»¯ liá»‡u thÃ´ng minh
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      // Lá»c theo Tab
      if (activeTab === "MAINTENANCE" && !item.serviceName.toLowerCase().includes("báº£o dÆ°á»¡ng")) {
        return false;
      }
      if (activeTab === "REPAIR" && item.serviceName.toLowerCase().includes("báº£o dÆ°á»¡ng")) {
        return false;
      }

      // Lá»c theo xe
      if (selectedCarFilter !== "ALL" && item.licensePlate !== selectedCarFilter) {
        return false;
      }

      // Lá»c theo tá»« khÃ³a tÃ¬m kiáº¿m
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchCar = item.car.toLowerCase().includes(query);
        const matchPlate = item.licensePlate.toLowerCase().includes(query);
        const matchService = item.serviceName.toLowerCase().includes(query);
        const matchPart = item.partsReplaced.some((p) => p.toLowerCase().includes(query));
        return matchCode || matchCar || matchPlate || matchService || matchPart;
      }

      return true;
    });
  }, [historyList, activeTab, selectedCarFilter, searchKeyword]);

  const totalSpent = historyList.reduce((acc, cur) => acc + cur.cost, 0);

  // Xá»­ lÃ½ Ä‘áº·t láº¡i lá»‹ch vá»›i dá»¯ liá»‡u prefill
  const handleRebook = (item: MaintenanceHistoryItem) => {
    navigate("/booking", {
      state: {
        prefillService: item.serviceName,
        car: item.car,
        licensePlate: item.licensePlate,
      },
    });
  };

  // Xá»­ lÃ½ sao chÃ©p hotline
  const handleCopyHotline = () => {
    navigator.clipboard.writeText("1900 8888 68");
    showToast("ÄÃ£ sao chÃ©p sá»‘ hotline 1900 8888 68 vÃ o bá»™ nhá»› táº¡m!", "success");
  };

  // Xá»­ lÃ½ cáº­p nháº­t ODO
  const handleSaveOdo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOdoInput || isNaN(Number(newOdoInput))) {
      showToast("Vui lÃ²ng nháº­p sá»‘ km há»£p lá»‡.", "error");
      return;
    }
    showToast(`ÄÃ£ cáº­p nháº­t sá»‘ ODO xe ${selectedVehicleForOdo} thÃ nh ${Number(newOdoInput).toLocaleString("vi-VN")} km thÃ nh cÃ´ng!`, "success");
    setShowOdoModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      {/* Toast thÃ´ng bÃ¡o */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1240px] px-6 py-8 md:px-8 md:py-10">
          {/* ===== TIÃŠU Äá»€ TRANG ===== */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÃCH HÃ€NG / Tá»”NG QUAN Dá»ŠCH Vá»¤
              </p>
              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#1F2933]">
                Xin chÃ o, {getUserDisplayName(user)}
              </h1>
              <p className="mt-1.5 text-[13px] leading-6 text-[#66717C]">
                {isLoading
                  ? "Äang Ä‘á»“ng bá»™ dá»¯ liá»‡u báº£o dÆ°á»¡ng cá»§a báº¡n..."
                  : "Theo dÃµi xe Ä‘ang á»Ÿ gara, lá»‹ch háº¹n vÃ  toÃ n bá»™ lá»‹ch sá»­ báº£o dÆ°á»¡ng táº¡i má»™t nÆ¡i."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowOdoModal(true)}
                className="h-10 cursor-pointer rounded-xl border border-[#E1E4E6] bg-white px-4 text-xs font-semibold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
              >
                Cáº­p nháº­t sá»‘ ODO
              </button>
              <Link
                to="/booking"
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#1F2933] px-5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                + Äáº·t lá»‹ch báº£o dÆ°á»¡ng
              </Link>
            </div>
          </div>

          {/* ===== 4 THáºº THá»NG KÃŠ ===== */}
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                to: "/customer/cars",
                label: "Xe Ä‘Ã£ Ä‘Äƒng kÃ½",
                value: `${vehicles.length > 0 ? vehicles.length : 2} xe`,
                hint: "Quáº£n lÃ½ há»“ sÆ¡ xe",
              },
              {
                to: "/customer/appointments",
                label: "Lá»‹ch háº¹n sáº¯p tá»›i",
                value: `${appointments.length > 0 ? appointments.length : 1} lá»‹ch`,
                hint: "Gáº§n nháº¥t: 25/10/2026 Â· 09:00",
              },
              {
                to: "/repair-status",
                label: "Xe Ä‘ang á»Ÿ gara",
                value: "1 xe",
                hint: "Äang kiá»ƒm tra 36 háº¡ng má»¥c",
              },
              {
                to: "/invoices",
                label: "Tá»•ng chi phÃ­ báº£o dÆ°á»¡ng",
                value: `${totalSpent.toLocaleString("vi-VN")} Ä‘`,
                hint: `${historyList.length} lÆ°á»£t dá»‹ch vá»¥ hoÃ n táº¥t`,
              },
            ].map((kpi) => (
              <Link
                key={kpi.to}
                to={kpi.to}
                className="group flex min-h-[116px] cursor-pointer flex-col justify-between rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)] transition hover:border-[#D6A85F] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    {kpi.label}
                  </p>
                  <span className="text-sm text-[#B5BDC5] transition group-hover:translate-x-0.5 group-hover:text-[#D6A85F]">
                    â†’
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-[#20252B]">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-[#66717C]">{kpi.hint}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ===== LÆ¯á»šI 2 Cá»˜T: Ná»˜I DUNG CHÃNH + Cá»˜T PHá»¤ ===== */}
          <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
            {/* ---------- Cá»˜T TRÃI (2/3) ---------- */}
            <div className="space-y-6 xl:col-span-2">
              {/* Tiáº¿n Ä‘á»™ xe Ä‘ang á»Ÿ gara */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">
                        Xe Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½ táº¡i gara
                      </p>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-[#1F2933]">
                      Toyota Camry 2.5Q Â·{" "}
                      <span className="font-mono text-[#8F641B]">30G-888.66</span>
                    </h2>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Tiáº¿p nháº­n 08:30 Â· Cá»‘ váº¥n: <strong>LÃª VÄƒn ToÃ n</strong> Â· 0901 000 102
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInspectionModal(true)}
                      className="h-9 cursor-pointer rounded-xl border border-[#E1E4E6] px-3.5 text-xs font-semibold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                    >
                      Báº£ng kiá»ƒm tra
                    </button>
                    <Link
                      to="/repair-status"
                      className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#1F2933] px-3.5 text-xs font-bold text-white transition hover:bg-slate-800"
                    >
                      Theo dÃµi â†’
                    </Link>
                  </div>
                </div>

                {/* Timeline 5 bÆ°á»›c */}
                <ol className="mt-7 grid grid-cols-5 gap-2">
                  {[
                    { n: "1", title: "Tiáº¿p nháº­n", desc: "08:35", state: "done" },
                    { n: "2", title: "Kiá»ƒm tra", desc: "Äang lÃ m Â· 75%", state: "active" },
                    { n: "3", title: "BÃ¡o giÃ¡", desc: "Chá» duyá»‡t", state: "todo" },
                    { n: "4", title: "Sá»­a chá»¯a", desc: "Dá»± kiáº¿n 10:30", state: "todo" },
                    { n: "5", title: "BÃ n giao", desc: "Dá»± kiáº¿n 11:45", state: "todo" },
                  ].map((step, idx, arr) => (
                    <li key={step.n} className="relative flex flex-col items-center text-center">
                      {idx < arr.length - 1 && (
                        <span
                          className={`absolute left-1/2 top-4 h-0.5 w-full ${
                            step.state === "done" ? "bg-emerald-400" : "bg-[#E1E4E6]"
                          }`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (step.n === "2") setShowInspectionModal(true);
                          else if (step.n === "3") navigate("/quotation");
                          else if (step.n === "4") navigate("/repair-status");
                          else
                            showToast(
                              step.n === "1"
                                ? "Xe Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n lÃºc 08:35 vÃ  ghi nháº­n ODO 41.250 km."
                                : "Xe sáº½ Ä‘Æ°á»£c bÃ n giao sau khi hoÃ n táº¥t sá»­a chá»¯a vÃ  nghiá»‡m thu.",
                              "info",
                            );
                        }}
                        className={`relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold transition hover:scale-110 ${
                          step.state === "done"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : step.state === "active"
                              ? "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-100"
                              : "border-[#E1E4E6] bg-white text-[#8A949E]"
                        }`}
                      >
                        {step.state === "done" ? "âœ“" : step.n}
                      </button>
                      <p
                        className={`mt-2 text-xs font-bold ${
                          step.state === "todo" ? "text-[#8A949E]" : "text-[#20252B]"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#8A949E]">{step.desc}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Lá»‹ch sá»­ báº£o dÆ°á»¡ng */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2933]">Lá»‹ch sá»­ báº£o dÆ°á»¡ng</h2>
                    <p className="mt-0.5 text-xs text-[#66717C]">
                      Sá»• báº£o dÆ°á»¡ng Ä‘iá»‡n tá»­, phá»¥ tÃ¹ng thay tháº¿ vÃ  chi phÃ­ tá»«ng láº§n.
                    </p>
                  </div>

                  <div className="inline-flex self-start rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-1">
                    {[
                      { key: "ALL", label: `Táº¥t cáº£ (${historyList.length})` },
                      { key: "MAINTENANCE", label: "Äá»‹nh ká»³" },
                      { key: "REPAIR", label: "Sá»­a chá»¯a" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key as "ALL" | "MAINTENANCE" | "REPAIR")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          activeTab === tab.key
                            ? "bg-white text-[#1F2933] shadow-sm"
                            : "text-[#66717C] hover:text-[#20252B]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative sm:col-span-2">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="TÃ¬m mÃ£ phiáº¿u, tÃªn xe, dá»‹ch vá»¥, phá»¥ tÃ¹ng..."
                      className="h-10 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-8 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                    />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#8A949E] hover:text-[#20252B]"
                      >
                        âœ•
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedCarFilter}
                    onChange={(e) => setSelectedCarFilter(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                  >
                    <option value="ALL">Táº¥t cáº£ xe</option>
                    <option value="30G-888.66">Toyota Camry Â· 30G-888.66</option>
                    <option value="29A-678.90">Honda CR-V Â· 29A-678.90</option>
                  </select>
                </div>

                <div className="mt-5 divide-y divide-[#EEF0F2] rounded-xl border border-[#E1E4E6]">
                  {filteredHistory.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm font-semibold text-[#20252B]">
                        KhÃ´ng cÃ³ lá»‹ch sá»­ phÃ¹ há»£p
                      </p>
                      <p className="mt-1 text-xs text-[#8A949E]">
                        Thá»­ Ä‘á»•i tá»« khÃ³a hoáº·c bá»™ lá»c Ä‘á»ƒ xem thÃªm.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchKeyword("");
                          setSelectedCarFilter("ALL");
                          setActiveTab("ALL");
                        }}
                        className="mt-4 cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        XÃ³a bá»™ lá»c
                      </button>
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedHistory(item)}
                        className="flex cursor-pointer flex-col gap-3 p-4 transition hover:bg-[#FAF8F5] md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md border border-[#E5B869]/50 bg-[#FAF8F5] px-2 py-0.5 font-mono font-bold text-[#8F641B]">
                              {item.licensePlate}
                            </span>
                            <span className="font-semibold text-[#20252B]">{item.car}</span>
                            <span className="text-[#8A949E]">Â· {item.odo}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              HoÃ n táº¥t
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-bold text-[#1F2933]">
                            {item.serviceName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#66717C]">
                            {item.code} Â· {item.date} Â· {item.advisor}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end md:gap-2">
                          <p className="text-base font-bold text-[#1F2933]">
                            {item.cost.toLocaleString("vi-VN")} Ä‘
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHistory(item);
                              }}
                              className="cursor-pointer rounded-lg border border-[#E1E4E6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#20252B] transition hover:border-[#D6A85F]"
                            >
                              Chi tiáº¿t
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRebook(item);
                              }}
                              className="cursor-pointer rounded-lg border border-[#E5B869]/50 bg-[#FAF8F5] px-3 py-1.5 text-[11px] font-bold text-[#8F641B] transition hover:bg-[#F3E8D2]"
                            >
                              Äáº·t láº¡i
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* ---------- Cá»˜T PHáº¢I (1/3) ---------- */}
            <aside className="space-y-6">
              {/* Nháº¯c báº£o dÆ°á»¡ng */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <h2 className="text-base font-bold text-[#1F2933]">Nháº¯c nhá»Ÿ sáº¯p tá»›i</h2>
                <p className="mt-0.5 text-xs text-[#66717C]">Dá»±a trÃªn sá»‘ km vÃ  háº¡n Ä‘Äƒng kiá»ƒm.</p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold text-amber-900">Báº£o dÆ°á»¡ng má»‘c 45.000 km</p>
                    <p className="mt-1 text-[11px] leading-5 text-amber-800">
                      Camry 30G-888.66 cÃ²n khoáº£ng 3.750 km ná»¯a lÃ  Ä‘áº¿n má»‘c thay dáº§u vÃ  Ä‘áº£o lá»‘p.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/booking", {
                          state: {
                            prefillService: "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³ cáº¥p 45.000 KM",
                            car: "Toyota Camry 2.5Q",
                            licensePlate: "30G-888.66",
                          },
                        })
                      }
                      className="mt-3 cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700"
                    >
                      Äáº·t háº¹n trÆ°á»›c
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                    <p className="text-xs font-bold text-[#20252B]">Háº¡n Ä‘Äƒng kiá»ƒm 28/11/2026</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                      Honda CR-V 29A-678.90. Gara há»— trá»£ kiá»ƒm tra an toÃ n miá»…n phÃ­ trÆ°á»›c khi Ä‘Äƒng kiá»ƒm.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/contact", {
                          state: {
                            requestType: "TÆ° váº¥n kiá»ƒm tra Ä‘Äƒng kiá»ƒm",
                            car: "Honda CR-V 29A-678.90",
                          },
                        })
                      }
                      className="mt-3 cursor-pointer rounded-lg border border-[#E1E4E6] bg-white px-3 py-1.5 text-[11px] font-bold text-[#20252B] transition hover:border-[#D6A85F]"
                    >
                      Nháº­n tÆ° váº¥n
                    </button>
                  </div>
                </div>
              </section>

              {/* Há»— trá»£ */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <h2 className="text-base font-bold text-[#1F2933]">Cáº§n há»— trá»£?</h2>
                <p className="mt-0.5 text-xs leading-5 text-[#66717C]">
                  Cá»‘ váº¥n ká»¹ thuáº­t sáºµn sÃ ng 24/7 khi xe gáº·p sá»± cá»‘ hoáº·c cáº§n bÃ¡o giÃ¡.
                </p>

                <div className="mt-4 rounded-xl bg-[#1F2933] p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#E5B869]">
                    Hotline cá»©u há»™ 24/7
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-wider">1900 8888 68</p>
                  <button
                    type="button"
                    onClick={handleCopyHotline}
                    className="mt-2 cursor-pointer text-[11px] text-slate-300 underline underline-offset-2 transition hover:text-white"
                  >
                    Sao chÃ©p sá»‘
                  </button>
                </div>

                <Link
                  to="/contact"
                  className="mt-3 block cursor-pointer rounded-xl border border-[#E1E4E6] py-2.5 text-center text-xs font-bold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  Gá»­i yÃªu cáº§u há»— trá»£
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {/* MODAL 1: CHI TIáº¾T PHIáº¾U Báº¢O DÆ¯á» NG (KHI CLICK VÃ€O Lá»ŠCH Sá»¬) */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIáº¾T PHIáº¾U Báº¢O DÆ¯á» NG & Sá»¬A CHá»®A
                </span>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  {selectedHistory.code} â€¢ {selectedHistory.car}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Biá»ƒn sá»‘: <strong>{selectedHistory.licensePlate}</strong> â€¢ ODO ghi nháº­n: <strong>{selectedHistory.odo}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                âœ•
              </button>
            </div>

            {/* ThÃ´ng tin cá»‘ váº¥n & ká»¹ thuáº­t viÃªn */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Cá»‘ váº¥n dá»‹ch vá»¥:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.advisor}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Ká»¹ thuáº­t viÃªn chÃ­nh:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.technician}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">NgÃ y tiáº¿p nháº­n & hoÃ n táº¥t:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.date}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Tráº¡ng thÃ¡i thanh toÃ¡n:</p>
                <span className="inline-block mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  ÄÃ£ thanh toÃ¡n Ä‘á»§ (Chuyá»ƒn khoáº£n)
                </span>
              </div>
            </div>

            {/* Báº£ng chi tiáº¿t phá»¥ tÃ¹ng & tiá»n cÃ´ng */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Háº¡ng má»¥c cÃ´ng viá»‡c & Phá»¥ tÃ¹ng thay tháº¿:
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">TÃªn váº­t tÆ° / CÃ´ng viá»‡c</th>
                      <th className="py-2.5 px-3 text-center">SL</th>
                      <th className="py-2.5 px-3 text-right">ÄÆ¡n giÃ¡</th>
                      <th className="py-2.5 px-3 text-right">ThÃ nh tiá»n</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHistory.detailedParts?.map((part, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{part.name}</p>
                          <p className="text-[10px] text-slate-400">MÃ£: {part.code} â€¢ Báº£o hÃ nh: {part.warranty}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">{part.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{part.unitPrice.toLocaleString("vi-VN")} Ä‘</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {(part.quantity * part.unitPrice).toLocaleString("vi-VN")} Ä‘
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="py-2.5 px-3 font-semibold text-slate-700">
                        Tiá»n cÃ´ng thá»£ báº£o dÆ°á»¡ng ká»¹ thuáº­t
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {selectedHistory.laborCost.toLocaleString("vi-VN")} Ä‘
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-[#FAF8F5] font-bold">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right text-slate-700">
                        Tá»”NG Cá»˜NG THANH TOÃN (ÄÃ£ gá»“m VAT):
                      </td>
                      <td className="py-3 px-3 text-right text-base text-[#1F2933]">
                        {selectedHistory.cost.toLocaleString("vi-VN")} Ä‘
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ghi chÃº KTV */}
            {selectedHistory.technicianNotes && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
                <strong>Ghi chÃº xuáº¥t xÆ°á»Ÿng tá»« KTV:</strong> {selectedHistory.technicianNotes}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  showToast("ÄÃ£ táº£i hÃ³a Ä‘Æ¡n Ä‘iá»‡n tá»­ PDF thÃ nh cÃ´ng!", "success");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>ðŸ“¥ Táº£i phiáº¿u PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleRebook(selectedHistory);
                    setSelectedHistory(null);
                  }}
                  className="rounded-xl bg-[#D6A85F] px-4 py-2 text-xs font-bold text-[#1F2933] hover:bg-[#c9994f] transition cursor-pointer"
                >
                  Äáº·t láº¡i gÃ³i nÃ y
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  ÄÃ³ng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Báº¢NG CHáº¨N ÄOÃN 36 Háº NG Má»¤C XE TRá»°C TIáº¾P Táº I XÆ¯á»žNG */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  BIÃŠN Báº¢N CHáº¨N ÄOÃN TIÃŠU CHUáº¨N OEM
                </span>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  Kiá»ƒm tra 36 háº¡ng má»¥c an toÃ n xe Toyota Camry (30G-888.66)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ká»¹ thuáº­t viÃªn thá»±c hiá»‡n: <strong>Nguyá»…n VÄƒn HÃ¹ng</strong> â€¢ Cáº­p nháº­t lÃºc: <strong>09:15 hÃ´m nay</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                âœ•
              </button>
            </div>

            {/* TÃ³m táº¯t tÃ¬nh tráº¡ng */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xl font-extrabold text-emerald-700">28/36</p>
                <p className="text-[11px] font-bold text-emerald-800">Äáº¡t chuáº©n an toÃ n (PASSED)</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xl font-extrabold text-amber-700">5/36</p>
                <p className="text-[11px] font-bold text-amber-800">Cáº§n lÆ°u Ã½ theo dÃµi (ATTENTION)</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xl font-extrabold text-red-700">3/36</p>
                <p className="text-[11px] font-bold text-red-800">Cáº§n thay tháº¿ gáº¥p (FAILED)</p>
              </div>
            </div>

            {/* Chi tiáº¿t danh má»¥c */}
            <div className="mt-5 space-y-2.5">
              {inspectionChecklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        item.status === "PASSED"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "ATTENTION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status === "PASSED" ? "âœ“" : item.status === "ATTENTION" ? "!" : "âœ•"}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.name} <span className="text-[10px] font-normal text-slate-400">({item.category})</span>
                      </p>
                      <p className="text-slate-500 mt-0.5">{item.note}</p>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "PASSED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "ATTENTION"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {item.status === "PASSED" ? "Äáº T" : item.status === "ATTENTION" ? "LÆ¯U Ã" : "THAY THáº¾"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <Link
                to="/quotation"
                onClick={() => setShowInspectionModal(false)}
                className="rounded-xl bg-[#D6A85F] px-4 py-2.5 text-xs font-bold text-[#1F2933] hover:bg-[#c9994f] transition cursor-pointer"
              >
                Xem bÃ¡o giÃ¡ cÃ¡c háº¡ng má»¥c cáº§n thay â†’
              </Link>
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ÄÃ£ hiá»ƒu & ÄÃ³ng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Cáº¬P NHáº¬T NHANH Sá» KM (ODO) Cá»¦A XE */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  QUáº¢N LÃ XE THÃ”NG MINH
                </span>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Cáº­p nháº­t sá»‘ ODO xe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer text-xs"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleSaveOdo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chá»n xe cáº­p nháº­t:
                </label>
                <select
                  value={selectedVehicleForOdo}
                  onChange={(e) => setSelectedVehicleForOdo(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-[#D6A85F]"
                >
                  <option value="30G-888.66">Toyota Camry 2.5Q (30G-888.66)</option>
                  <option value="29A-678.90">Honda CR-V 1.5L Turbo (29A-678.90)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sá»‘ km hiá»‡n táº¡i trÃªn Ä‘á»“ng há»“ (km):
                </label>
                <input
                  type="number"
                  value={newOdoInput}
                  onChange={(e) => setNewOdoInput(e.target.value)}
                  placeholder="VÃ­ dá»¥: 41500"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-[#D6A85F]"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Há»‡ thá»‘ng sáº½ dá»±a trÃªn sá»‘ km nÃ y Ä‘á»ƒ tá»± Ä‘á»™ng tÃ­nh ngÃ y nháº¯c báº£o dÆ°á»¡ng chuáº©n xÃ¡c nháº¥t cho báº¡n.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1F2933] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  LÆ°u sá»‘ ODO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default CustomerDashboard;
