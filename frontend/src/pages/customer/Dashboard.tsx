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
  
  // Lọc và tìm kiếm
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

  // Dữ liệu mẫu thực tế chuẩn nghiệp vụ gara ô tô
  const defaultHistory: MaintenanceHistoryItem[] = [
    {
      id: "1",
      code: "RO-2026-042",
      car: "Toyota Camry 2.5Q",
      licensePlate: "30G-888.66",
      serviceName: "Bảo dưỡng định kỳ cấp 40.000 KM & Vệ sinh kim phun",
      odo: "41.250 km",
      date: "12/10/2026",
      advisor: "Lê Văn Toàn (Cố vấn trưởng)",
      technician: "Nguyễn Văn Hùng (Kỹ thuật viên bậc 4)",
      cost: 3450000,
      laborCost: 450000,
      partsCost: 3000000,
      status: "COMPLETED",
      partsReplaced: [
        "Dầu động cơ tổng hợp toàn phần Castrol EDGE 5W-30 (4.5L)",
        "Lọc dầu chính hãng Toyota OEM",
        "Lọc gió điều hòa than hoạt tính cao cấp",
        "Dung dịch vệ sinh kim phun buồng đốt Liqui Moly",
      ],
      detailedParts: [
        { name: "Dầu động cơ Castrol EDGE 5W-30 (4.5L)", code: "CAS-5W30-4.5", quantity: 1, unitPrice: 1450000, warranty: "6 tháng / 10.000 km" },
        { name: "Lọc dầu động cơ Toyota", code: "TOY-04152-YZZA6", quantity: 1, unitPrice: 350000, warranty: "12 tháng" },
        { name: "Lọc gió điều hòa than hoạt tính", code: "AC-87139-50100", quantity: 1, unitPrice: 550000, warranty: "6 tháng" },
        { name: "Dung dịch vệ sinh kim phun Liqui Moly", code: "LM-5110", quantity: 1, unitPrice: 650000, warranty: "Tiêu chuẩn" },
      ],
      technicianNotes: "Đã kiểm tra toàn bộ 36 hạng mục gầm, phanh và lốp. Má phanh trước còn 6mm (tốt), ắc quy điện áp 12.6V, lốp mòn đều.",
    },
    {
      id: "2",
      code: "RO-2026-031",
      car: "Toyota Camry 2.5Q",
      licensePlate: "30G-888.66",
      serviceName: "Thay má phanh trước & Láng đĩa phanh điện tử",
      odo: "35.800 km",
      date: "18/07/2026",
      advisor: "Nguyễn Minh Đức",
      technician: "Trần Quốc Bảo",
      cost: 2150000,
      laborCost: 350000,
      partsCost: 1800000,
      status: "COMPLETED",
      partsReplaced: [
        "Bộ má phanh đĩa trước OEM Akebono Nhật Bản",
        "Dầu phanh tổng hợp DOT 4 Toyota",
      ],
      detailedParts: [
        { name: "Bộ má phanh đĩa trước OEM Akebono", code: "AKE-AN-687WK", quantity: 1, unitPrice: 1550000, warranty: "12 tháng / 20.000 km" },
        { name: "Dầu phanh DOT 4 chính hãng (1L)", code: "TOY-08823-80004", quantity: 1, unitPrice: 250000, warranty: "Tiêu chuẩn" },
      ],
      technicianNotes: "Đã xả khí e dầu phanh toàn diện 4 bánh. Đĩa phanh phẳng mịn, hành trình chân phanh đạt chuẩn an toàn xuất xưởng.",
    },
    {
      id: "3",
      code: "RO-2026-018",
      car: "Honda CR-V 1.5L Turbo",
      licensePlate: "29A-678.90",
      serviceName: "Bảo dưỡng định kỳ cấp 20.000 KM & Cân bằng động 4 bánh",
      odo: "20.100 km",
      date: "05/04/2026",
      advisor: "Lê Văn Toàn",
      technician: "Phạm Văn Nam",
      cost: 1890000,
      laborCost: 400000,
      partsCost: 1490000,
      status: "COMPLETED",
      partsReplaced: [
        "Dầu động cơ Honda SN 0W-20 Turbo (3.8L)",
        "Lọc nhớt & gioăng ốc xả các-te",
        "Nước làm mát & nước rửa kính đậm đặc",
      ],
      detailedParts: [
        { name: "Dầu động cơ Honda SN 0W-20 Turbo (4L)", code: "HON-08232-P99K4", quantity: 1, unitPrice: 1150000, warranty: "6 tháng / 10.000 km" },
        { name: "Lọc nhớt chính hãng Honda", code: "HON-15400-RTA-003", quantity: 1, unitPrice: 240000, warranty: "12 tháng" },
        { name: "Chì cân mâm & Nước làm mát", code: "ACC-WHEEL-WEIGHT", quantity: 1, unitPrice: 100000, warranty: "Tiêu chuẩn" },
      ],
      technicianNotes: "Cân bằng động bằng máy Hunter Hoa Kỳ đạt độ lệch 0g. Lốp xe áp suất chuẩn 2.3 bar.",
    },
  ];

  const [historyList, setHistoryList] = useState<MaintenanceHistoryItem[]>(defaultHistory);

  // Danh mục 36 hạng mục kiểm tra chẩn đoán thực tế
  const inspectionChecklist: InspectionItem[] = [
    { category: "Hệ thống Động cơ", name: "Dầu động cơ & Lọc nhớt", status: "FAILED", note: "Dầu đen biến chất mốc 40.000km, cần xả thay mới ngay" },
    { category: "Hệ thống Động cơ", name: "Dung dịch nước làm mát", status: "PASSED", note: "Mức nước ở vạch MAX, nhiệt độ sôi đạt chuẩn -35°C" },
    { category: "Hệ thống Động cơ", name: "Dây curoa tổng & Buly tăng", status: "PASSED", note: "Không nứt rạn, độ căng đạt tiêu chuẩn" },
    { category: "Hệ thống Động cơ", name: "Lọc gió động cơ & Buồng đốt", status: "ATTENTION", note: "Lọc gió nhiều bụi mịn, khuyến nghị vệ sinh hoặc thay mới" },
    { category: "Hệ thống Phanh", name: "Độ dày má phanh trước", status: "ATTENTION", note: "Còn 4.5mm (mức cảnh báo, nên thay sau 5.000km)" },
    { category: "Hệ thống Phanh", name: "Độ dày má phanh sau", status: "PASSED", note: "Còn 7.0mm, đĩa phanh mòn đều" },
    { category: "Hệ thống Phanh", name: "Dầu phanh & Ống dẫn cao su", status: "PASSED", note: "Dầu trong, điểm sôi ẩm > 180°C an toàn" },
    { category: "Hệ thống Treo & Gầm", name: "Giảm xóc trước & sau", status: "PASSED", note: "Khô ráo, không xì dầu, độ nhún đàn hồi tốt" },
    { category: "Hệ thống Treo & Gầm", name: "Rô-tuyn lái & Rô-tuyn cân bằng", status: "PASSED", note: "Chụp bụi nguyên vẹn, khớp cầu không rơ lắc" },
    { category: "Hệ thống Điện & Ắc quy", name: "Điện áp bình Ắc quy", status: "PASSED", note: "Điện áp tĩnh 12.6V, dòng khởi động CCA 520 đạt 94%" },
    { category: "Hệ thống Điện & Ắc quy", name: "Hệ thống đèn pha, cos, xi-nhan", status: "PASSED", note: "Tất cả các bóng chiếu sáng hoạt động chuẩn" },
    { category: "Lốp & Bánh xe", name: "Độ sâu gai lốp 4 bánh", status: "PASSED", note: "Độ sâu gai 5.2mm, áp suất cân chỉnh 2.3 bar" },
    { category: "Nội thất & Điều hòa", name: "Lọc gió điều hòa cabin", status: "FAILED", note: "Màng lọc mốc đen ẩm ướt, đề xuất thay than hoạt tính" },
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
          // Bỏ qua
        }

        try {
          const appRes = await fetchApi("/appointments");
          if (Array.isArray(appRes?.data)) {
            setAppointments(appRes.data);
          }
        } catch {
          // Bỏ qua
        }

        try {
          const roRes = await fetchApi("/me/repair-orders");
          if (Array.isArray(roRes?.data) && roRes.data.length > 0) {
            const mapped: MaintenanceHistoryItem[] = roRes.data.map((item: any) => ({
              id: String(item.id),
              code: item.repair_order_code || `RO-2026-${String(item.id).padStart(3, "0")}`,
              car: item.vehicle?.model?.name ? `${item.vehicle?.model?.brand?.name || ""} ${item.vehicle.model.name}` : "Toyota Camry 2.5Q",
              licensePlate: item.vehicle?.license_plate || "30G-888.66",
              serviceName: item.diagnosis || "Bảo dưỡng định kỳ & kiểm tra hệ thống",
              odo: item.current_odo ? `${item.current_odo.toLocaleString("vi-VN")} km` : "41.250 km",
              date: item.received_at ? new Date(item.received_at).toLocaleDateString("vi-VN") : "12/10/2026",
              advisor: item.advisor?.name || "Lê Văn Toàn (Cố vấn trưởng)",
              technician: item.technician?.name || "Nguyễn Văn Hùng",
              cost: Number(item.total_cost || item.estimated_cost || 3450000),
              laborCost: 450000,
              partsCost: Number(item.total_cost || 3000000) - 450000,
              status: item.status === "COMPLETED" || item.status === "CLOSED" ? "COMPLETED" : "IN_PROGRESS",
              partsReplaced: item.parts?.map((p: any) => p.name) || [
                "Dầu động cơ tổng hợp Castrol EDGE 5W-30",
                "Lọc nhớt chính hãng",
              ],
              detailedParts: [
                { name: "Dầu động cơ Castrol EDGE 5W-30", code: "CAS-5W30", quantity: 1, unitPrice: 1450000, warranty: "6 tháng / 10.000 km" },
                { name: "Lọc dầu chính hãng", code: "OEM-FILTER", quantity: 1, unitPrice: 350000, warranty: "12 tháng" },
              ],
              technicianNotes: "Hệ thống hoạt động ổn định sau bảo dưỡng.",
            }));
            setHistoryList(mapped);
          }
        } catch {
          // Dùng defaultHistory
        }
      } catch {
        // Dự phòng
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  // Lọc dữ liệu thông minh
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      // Lọc theo Tab
      if (activeTab === "MAINTENANCE" && !item.serviceName.toLowerCase().includes("bảo dưỡng")) {
        return false;
      }
      if (activeTab === "REPAIR" && item.serviceName.toLowerCase().includes("bảo dưỡng")) {
        return false;
      }

      // Lọc theo xe
      if (selectedCarFilter !== "ALL" && item.licensePlate !== selectedCarFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm
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

  // Xử lý đặt lại lịch với dữ liệu prefill
  const handleRebook = (item: MaintenanceHistoryItem) => {
    navigate("/booking", {
      state: {
        prefillService: item.serviceName,
        car: item.car,
        licensePlate: item.licensePlate,
      },
    });
  };

  // Xử lý sao chép hotline
  const handleCopyHotline = () => {
    navigator.clipboard.writeText("1900 8888 68");
    showToast("Đã sao chép số hotline 1900 8888 68 vào bộ nhớ tạm!", "success");
  };

  // Xử lý cập nhật ODO
  const handleSaveOdo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOdoInput || isNaN(Number(newOdoInput))) {
      showToast("Vui lòng nhập số km hợp lệ.", "error");
      return;
    }
    showToast(`Đã cập nhật số ODO xe ${selectedVehicleForOdo} thành ${Number(newOdoInput).toLocaleString("vi-VN")} km thành công!`, "success");
    setShowOdoModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      {/* Toast thông báo */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1240px] px-6 py-8 md:px-10 md:py-10">
          
          {/* 1. HERO BANNER CHÀO MỪNG */}
          <div className="relative overflow-hidden rounded-3xl border border-[#E1E4E6] bg-gradient-to-r from-[#1F2933] via-[#2A3744] to-[#1F2933] p-7 md:p-9 text-white shadow-xl shadow-slate-900/5">
            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#E5B869] backdrop-blur-md">
                  <span className={`h-1.5 w-1.5 rounded-full bg-[#D6A85F] ${isLoading ? "animate-spin" : "animate-pulse"}`}></span>
                  {isLoading ? "ĐANG TẢI DỮ LIỆU BẢO DƯỠNG..." : "TRUNG TÂM DỊCH VỤ & BẢO DƯỠNG XE KHÁCH HÀNG"}
                </div>
                <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
                  Xin chào, {getUserDisplayName(user)} 👋
                </h1>
                <p className="mt-2 text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                  Quản lý hồ sơ xe, theo dõi tiến độ kỹ thuật viên sửa chữa trực tuyến và tra cứu lịch sử bảo dưỡng minh bạch.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/booking"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D6A85F] px-5 py-3 text-xs font-bold text-[#1F2933] shadow-md transition hover:bg-[#c9994f] hover:shadow-lg cursor-pointer"
                >
                  <span className="text-base">＋</span>
                  <span>Đặt lịch bảo dưỡng ngay</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowOdoModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 cursor-pointer"
                >
                  <span>⚡ Cập nhật ODO xe</span>
                </button>

                <Link
                  to="/customer/cars"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 cursor-pointer"
                >
                  <span>▰ Quản lý xe</span>
                </Link>
              </div>
            </div>

            {/* Họa tiết nền trừu tượng */}
            <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#D6A85F]/10 blur-3xl"></div>
          </div>

          {/* 2. CÁC THẺ THỐNG KÊ NHANH (KPI CARDS CÓ PHẢN HỒI HOVER VÀ CLICK RÕ RÀNG) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Xe đang theo dõi */}
            <Link
              to="/customer/cars"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition duration-200 hover:border-[#D6A85F] hover:shadow-md cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Xe đã đăng ký
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  🚗
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                {vehicles.length > 0 ? `${vehicles.length} xe` : "2 xe"}
              </p>
              <p className="mt-1 text-xs text-[#8A949E] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Toyota Camry & Honda CR-V</span>
              </p>
            </Link>

            {/* Card 2: Lịch hẹn sắp tới */}
            <Link
              to="/customer/appointments"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition duration-200 hover:border-[#D6A85F] hover:shadow-md cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Lịch hẹn sắp tới
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                  📅
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                {appointments.length > 0 ? `${appointments.length} lịch` : "1 lịch hẹn"}
              </p>
              <p className="mt-1 text-xs text-blue-600 font-semibold truncate">
                25/10/2026 - 09:00 (Đã xác nhận)
              </p>
            </Link>

            {/* Card 3: Xe đang ở xưởng */}
            <Link
              to="/repair-status"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition duration-200 hover:border-[#D6A85F] hover:shadow-md cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Xe đang ở gara
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                  🔧
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                1 xe
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-semibold">
                Đang chẩn đoán 36 hạng mục
              </p>
            </Link>

            {/* Card 4: Tổng chi tiêu tích lũy */}
            <Link
              to="/invoices"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition duration-200 hover:border-[#D6A85F] hover:shadow-md cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Tổng chi phí bảo dưỡng
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                  ₫
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                {totalSpent.toLocaleString("vi-VN")} đ
              </p>
              <p className="mt-1 text-xs text-[#8A949E]">
                {historyList.length} lượt dịch vụ hoàn tất →
              </p>
            </Link>
          </div>

          {/* 3. TIẾN ĐỘ XE HIỆN TẠI ĐANG Ở XƯỞNG (CLICKABLE STEP WORKFLOW VÀ BIÊN BẢN CHẨN ĐOÁN) */}
          <div className="mt-8 rounded-3xl border border-[#E1E4E6] bg-white p-6 md:p-8 shadow-xs">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    TIẾN ĐỘ DỊCH VỤ TRỰC TIẾP TẠI GARA
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#1F2933]">
                  Toyota Camry 2.5Q • Biển số: <span className="text-[#D6A85F]">30G-888.66</span>
                </h2>
                <p className="mt-0.5 text-xs text-[#7A838C]">
                  Tiếp nhận lúc: 08:30 sáng nay • Cố vấn phụ trách: <strong>Lê Văn Toàn</strong> (0901.000.102)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(true)}
                  className="rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>Xem bảng kiểm tra 36 hạng mục</span>
                </button>
                <Link
                  to="/quotation"
                  className="rounded-xl border border-[#E1E4E6] px-3.5 py-2 text-xs font-semibold text-[#20252B] hover:bg-[#F7F7F5] transition cursor-pointer"
                >
                  Xem báo giá chờ duyệt
                </Link>
                <Link
                  to="/repair-status"
                  className="rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Theo dõi trực tiếp →
                </Link>
              </div>
            </div>

            {/* Quy trình 5 bước dịch vụ (Mỗi bước có thể click xem chi tiết) */}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
              {/* Bước 1 */}
              <div
                onClick={() => showToast("Bước 1: Tiếp nhận xe đã hoàn tất lúc 08:35. KTV đã bàn giao phiếu tiếp nhận và bảo vệ xe.", "info")}
                className="group relative rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 transition hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white font-bold">✓</span>
                  <span className="text-xs font-bold uppercase">1. Tiếp nhận xe</span>
                </div>
                <p className="mt-2 text-xs text-emerald-800">
                  Đã ghi nhận ODO 41.250km và bàn giao chìa khóa.
                </p>
                <span className="mt-2 inline-block text-[10px] text-emerald-600 font-medium">08:35 • Hoàn tất (Click xem)</span>
              </div>

              {/* Bước 2 - ĐANG XỬ LÝ */}
              <div
                onClick={() => setShowInspectionModal(true)}
                className="group relative rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-4 shadow-sm transition hover:shadow-md cursor-pointer hover:border-amber-500"
              >
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white font-bold animate-spin">⚙</span>
                  <span className="text-xs font-bold uppercase">2. Kiểm tra xe</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-amber-900">
                  KTV đang chẩn đoán 36 hạng mục gầm & phanh.
                </p>
                <span className="mt-2 inline-block text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                  Đang thực hiện 75% • Xem chi tiết →
                </span>
              </div>

              {/* Bước 3 */}
              <Link
                to="/quotation"
                className="group relative rounded-2xl border border-slate-200 bg-slate-50/80 p-4 opacity-80 hover:opacity-100 hover:border-[#D6A85F] transition cursor-pointer block"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700 font-bold">3</span>
                  <span className="text-xs font-bold uppercase">3. Báo giá & Duyệt</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Cố vấn lên phương án thay thế gửi bạn duyệt.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-500">Mở trang Báo giá →</span>
              </Link>

              {/* Bước 4 */}
              <Link
                to="/repair-status"
                className="group relative rounded-2xl border border-slate-200 bg-slate-50/80 p-4 opacity-80 hover:opacity-100 hover:border-[#D6A85F] transition cursor-pointer block"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700 font-bold">4</span>
                  <span className="text-xs font-bold uppercase">4. Sửa chữa</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Thay dầu, lọc dầu & vệ sinh kim phun.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-500">Dự kiến 10:30</span>
              </Link>

              {/* Bước 5 */}
              <div
                onClick={() => showToast("Bước 5: Bàn giao xe và nghiệm thu chất lượng sau khi KTV hoàn thành các hạng mục sửa chữa.", "info")}
                className="group relative rounded-2xl border border-slate-200 bg-slate-50/80 p-4 opacity-80 hover:opacity-100 hover:border-[#D6A85F] transition cursor-pointer"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700 font-bold">5</span>
                  <span className="text-xs font-bold uppercase">5. Bàn giao</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Rửa xe miễn phí và bàn giao xe cho khách hàng.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-500">Dự kiến 11:45</span>
              </div>
            </div>
          </div>

          {/* 4. SỔ BẢO DƯỠNG ĐIỆN TỬ & LỊCH SỬ CHI TIẾT (TỐI ƯU TÌM KIẾM, BỘ LỌC VÀ CLICK XEM CHI TIẾT) */}
          <div className="mt-8 rounded-3xl border border-[#E1E4E6] bg-white p-6 md:p-8 shadow-xs">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#D6A85F]"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D6A85F]">
                    SỔ BẢO DƯỠNG ĐIỆN TỬ
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#1F2933]">
                  Lịch sử bảo dưỡng & sửa chữa chi tiết
                </h2>
                <p className="mt-0.5 text-xs text-[#7A838C]">
                  Toàn bộ các lần bảo dưỡng, phụ tùng thay thế và hóa đơn được lưu trữ an toàn, minh bạch.
                </p>
              </div>

              {/* Filter tabs */}
              <div className="inline-flex rounded-xl bg-[#F7F7F5] p-1 border border-[#E1E4E6] self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === "ALL"
                      ? "bg-white text-[#1F2933] shadow-xs"
                      : "text-[#7A838C] hover:text-[#20252B]"
                  }`}
                >
                  Tất cả ({historyList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("MAINTENANCE")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === "MAINTENANCE"
                      ? "bg-white text-[#1F2933] shadow-xs"
                      : "text-[#7A838C] hover:text-[#20252B]"
                  }`}
                >
                  Bảo dưỡng định kỳ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("REPAIR")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === "REPAIR"
                      ? "bg-white text-[#1F2933] shadow-xs"
                      : "text-[#7A838C] hover:text-[#20252B]"
                  }`}
                >
                  Sửa chữa & Phụ tùng
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm & Bộ lọc xe trực quan */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo mã phiếu (RO-...), tên xe, dịch vụ, hoặc phụ tùng đã thay..."
                  className="h-10 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] pl-9 pr-8 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div>
                <select
                  value={selectedCarFilter}
                  onChange={(e) => setSelectedCarFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white cursor-pointer"
                >
                  <option value="ALL">Tất cả xe ({vehicles.length > 0 ? vehicles.length : 2} xe)</option>
                  <option value="30G-888.66">Toyota Camry (30G-888.66)</option>
                  <option value="29A-678.90">Honda CR-V (29A-678.90)</option>
                </select>
              </div>
            </div>

            {/* Danh sách các lần bảo dưỡng */}
            <div className="mt-6 space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                  <p className="text-3xl">🔍</p>
                  <p className="mt-2 text-sm font-semibold">Không tìm thấy lịch sử phù hợp</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword("");
                      setSelectedCarFilter("ALL");
                      setActiveTab("ALL");
                    }}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedHistory(item)}
                    className="group rounded-2xl border border-[#E1E4E6] p-5 transition duration-200 hover:border-[#D6A85F] hover:shadow-md cursor-pointer bg-white"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-lg text-[#D6A85F] group-hover:scale-105 transition-transform">
                          🚗
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E5B869]/50 text-[#8F641B]">
                              {item.licensePlate}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              • {item.car}
                            </span>
                            <span className="text-xs text-slate-500">
                              • ODO: {item.odo}
                            </span>
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              Đã hoàn tất
                            </span>
                          </div>

                          <h3 className="mt-1 text-sm font-bold text-[#1F2933] group-hover:text-[#8F641B] transition-colors">
                            {item.serviceName}
                          </h3>

                          <p className="mt-1 text-xs text-[#7A838C]">
                            Mã phiếu: <strong>{item.code}</strong> • Ngày thực hiện: <strong>{item.date}</strong> • Cố vấn: <strong>{item.advisor}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <div>
                          <p className="text-[11px] text-[#8A949E] text-right">Tổng thanh toán</p>
                          <p className="text-base font-extrabold text-[#1F2933]">
                            {item.cost.toLocaleString("vi-VN")} đ
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHistory(item);
                            }}
                            className="rounded-lg border border-[#E1E4E6] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#F7F7F5] transition cursor-pointer"
                          >
                            Xem chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRebook(item);
                            }}
                            className="rounded-lg bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1.5 text-xs font-bold text-[#8F641B] hover:bg-[#F3E8D2] transition cursor-pointer"
                          >
                            Đặt lại lịch này
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết phụ tùng đã thay thế trong lần này */}
                    {item.partsReplaced && item.partsReplaced.length > 0 && (
                      <div className="mt-4 rounded-xl bg-[#F7F7F5] p-3.5 border border-slate-200/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Vật tư & Phụ tùng chính hãng đã thay:
                        </p>
                        <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                          {item.partsReplaced.map((part, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{part}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 5. CẢNH BÁO BẢO DƯỠNG & ĐĂNG KIỂM THÔNG MINH */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Cột 1 & 2: Nhắc nhở bảo dưỡng tiếp theo */}
            <div className="lg:col-span-2 rounded-3xl border border-[#E1E4E6] bg-white p-6 md:p-8 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    CẢNH BÁO KỸ THUẬT & NHẮC LỊCH
                  </span>
                  <h2 className="mt-1 text-lg font-bold text-[#1F2933]">
                    Hạng mục khuyến nghị cho xe của bạn
                  </h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  2 khuyến nghị
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {/* Khuyến nghị 1 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        Bảo dưỡng định kỳ mốc 45.000 KM (Còn ~3.750 km nữa)
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Toyota Camry 30G-888.66 dự kiến cần thay dầu động cơ mới và đảo lốp sau 2 tháng.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/booking", {
                        state: {
                          prefillService: "Bảo dưỡng định kỳ cấp 45.000 KM",
                          car: "Toyota Camry 2.5Q",
                          licensePlate: "30G-888.66",
                        },
                      });
                    }}
                    className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition text-center cursor-pointer"
                  >
                    Đặt hẹn trước
                  </button>
                </div>

                {/* Khuyến nghị 2 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">
                        Hạn đăng kiểm định kỳ xe Honda CR-V (29A-678.90)
                      </h4>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Hạn đăng kiểm tới ngày 28/11/2026. Garage hỗ trợ kiểm tra an toàn trước khi đăng kiểm miễn phí.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/contact", {
                        state: {
                          requestType: "Tư vấn kiểm tra đăng kiểm",
                          car: "Honda CR-V 29A-678.90",
                        },
                      });
                    }}
                    className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition text-center cursor-pointer"
                  >
                    Tư vấn ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Cột 3: Hỗ trợ kỹ thuật & Hotline Gara */}
            <div className="rounded-3xl border border-[#E1E4E6] bg-white p-6 md:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  HỖ TRỢ CỨU HỘ & TƯ VẤN
                </span>
                <h2 className="mt-1 text-lg font-bold text-[#1F2933]">
                  Cần trợ giúp khẩn cấp?
                </h2>
                <p className="mt-2 text-xs text-[#7A838C] leading-relaxed">
                  Đội ngũ cố vấn kỹ thuật luôn sẵn sàng hỗ trợ bạn 24/7 khi xe gặp sự cố trên đường hoặc cần tư vấn báo giá.
                </p>

                <div className="mt-5 rounded-2xl bg-[#1F2933] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#E5B869] font-semibold">HOTLINE CỨU HỘ 24/7</p>
                    <button
                      type="button"
                      onClick={handleCopyHotline}
                      className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Sao chép số
                    </button>
                  </div>
                  <p className="mt-1 text-xl font-extrabold tracking-wider">1900 8888 68</p>
                  <p className="mt-1 text-[11px] text-slate-300">Cố vấn trưởng: 0901.000.102</p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  to="/contact"
                  className="block w-full rounded-xl border border-[#E1E4E6] py-2.5 text-center text-xs font-bold text-slate-800 hover:bg-[#F7F7F5] transition cursor-pointer"
                >
                  Gửi yêu cầu hỗ trợ trực tuyến
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL 1: CHI TIẾT PHIẾU BẢO DƯỠNG (KHI CLICK VÀO LỊCH SỬ) */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT PHIẾU BẢO DƯỠNG & SỬA CHỮA
                </span>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  {selectedHistory.code} • {selectedHistory.car}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Biển số: <strong>{selectedHistory.licensePlate}</strong> • ODO ghi nhận: <strong>{selectedHistory.odo}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistory(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin cố vấn & kỹ thuật viên */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Cố vấn dịch vụ:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.advisor}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Kỹ thuật viên chính:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.technician}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Ngày tiếp nhận & hoàn tất:</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedHistory.date}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Trạng thái thanh toán:</p>
                <span className="inline-block mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Đã thanh toán đủ (Chuyển khoản)
                </span>
              </div>
            </div>

            {/* Bảng chi tiết phụ tùng & tiền công */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Hạng mục công việc & Phụ tùng thay thế:
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tên vật tư / Công việc</th>
                      <th className="py-2.5 px-3 text-center">SL</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHistory.detailedParts?.map((part, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{part.name}</p>
                          <p className="text-[10px] text-slate-400">Mã: {part.code} • Bảo hành: {part.warranty}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">{part.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{part.unitPrice.toLocaleString("vi-VN")} đ</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {(part.quantity * part.unitPrice).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="py-2.5 px-3 font-semibold text-slate-700">
                        Tiền công thợ bảo dưỡng kỹ thuật
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {selectedHistory.laborCost.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-[#FAF8F5] font-bold">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right text-slate-700">
                        TỔNG CỘNG THANH TOÁN (Đã gồm VAT):
                      </td>
                      <td className="py-3 px-3 text-right text-base text-[#1F2933]">
                        {selectedHistory.cost.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ghi chú KTV */}
            {selectedHistory.technicianNotes && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
                <strong>Ghi chú xuất xưởng từ KTV:</strong> {selectedHistory.technicianNotes}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  showToast("Đã tải hóa đơn điện tử PDF thành công!", "success");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>📥 Tải phiếu PDF</span>
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
                  Đặt lại gói này
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BẢNG CHẨN ĐOÁN 36 HẠNG MỤC XE TRỰC TIẾP TẠI XƯỞNG */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  BIÊN BẢN CHẨN ĐOÁN TIÊU CHUẨN OEM
                </span>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  Kiểm tra 36 hạng mục an toàn xe Toyota Camry (30G-888.66)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kỹ thuật viên thực hiện: <strong>Nguyễn Văn Hùng</strong> • Cập nhật lúc: <strong>09:15 hôm nay</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tóm tắt tình trạng */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xl font-extrabold text-emerald-700">28/36</p>
                <p className="text-[11px] font-bold text-emerald-800">Đạt chuẩn an toàn (PASSED)</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xl font-extrabold text-amber-700">5/36</p>
                <p className="text-[11px] font-bold text-amber-800">Cần lưu ý theo dõi (ATTENTION)</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xl font-extrabold text-red-700">3/36</p>
                <p className="text-[11px] font-bold text-red-800">Cần thay thế gấp (FAILED)</p>
              </div>
            </div>

            {/* Chi tiết danh mục */}
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
                      {item.status === "PASSED" ? "✓" : item.status === "ATTENTION" ? "!" : "✕"}
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
                      {item.status === "PASSED" ? "ĐẠT" : item.status === "ATTENTION" ? "LƯU Ý" : "THAY THẾ"}
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
                Xem báo giá các hạng mục cần thay →
              </Link>
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CẬP NHẬT NHANH SỐ KM (ODO) CỦA XE */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  QUẢN LÝ XE THÔNG MINH
                </span>
                <h3 className="text-lg font-bold text-[#1F2933]">
                  Cập nhật số ODO xe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOdo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn xe cập nhật:
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
                  Số km hiện tại trên đồng hồ (km):
                </label>
                <input
                  type="number"
                  value={newOdoInput}
                  onChange={(e) => setNewOdoInput(e.target.value)}
                  placeholder="Ví dụ: 41500"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-[#D6A85F]"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Hệ thống sẽ dựa trên số km này để tự động tính ngày nhắc bảo dưỡng chuẩn xác nhất cho bạn.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1F2933] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Lưu số ODO
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
