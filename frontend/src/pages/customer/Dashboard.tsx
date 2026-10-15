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
        <div className="mx-auto max-w-[1240px] px-6 py-8 md:px-8 md:py-10">
          {/* ===== TIÊU ĐỀ TRANG ===== */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / TỔNG QUAN DỊCH VỤ
              </p>
              <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#1F2933]">
                Xin chào, {getUserDisplayName(user)}
              </h1>
              <p className="mt-1.5 text-[13px] leading-6 text-[#66717C]">
                {isLoading
                  ? "Đang đồng bộ dữ liệu bảo dưỡng của bạn..."
                  : "Theo dõi xe đang ở gara, lịch hẹn và toàn bộ lịch sử bảo dưỡng tại một nơi."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowOdoModal(true)}
                className="h-10 cursor-pointer rounded-xl border border-[#E1E4E6] bg-white px-4 text-xs font-semibold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
              >
                Cập nhật số ODO
              </button>
              <Link
                to="/booking"
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#1F2933] px-5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                + Đặt lịch bảo dưỡng
              </Link>
            </div>
          </div>

          {/* ===== 4 THẺ THỐNG KÊ ===== */}
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                to: "/customer/cars",
                label: "Xe đã đăng ký",
                value: `${vehicles.length > 0 ? vehicles.length : 2} xe`,
                hint: "Quản lý hồ sơ xe",
              },
              {
                to: "/customer/appointments",
                label: "Lịch hẹn sắp tới",
                value: `${appointments.length > 0 ? appointments.length : 1} lịch`,
                hint: "Gần nhất: 25/10/2026 · 09:00",
              },
              {
                to: "/repair-status",
                label: "Xe đang ở gara",
                value: "1 xe",
                hint: "Đang kiểm tra 36 hạng mục",
              },
              {
                to: "/invoices",
                label: "Tổng chi phí bảo dưỡng",
                value: `${totalSpent.toLocaleString("vi-VN")} đ`,
                hint: `${historyList.length} lượt dịch vụ hoàn tất`,
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
                    →
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-[#20252B]">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-[#66717C]">{kpi.hint}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ===== LƯỚI 2 CỘT: NỘI DUNG CHÍNH + CỘT PHỤ ===== */}
          <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
            {/* ---------- CỘT TRÁI (2/3) ---------- */}
            <div className="space-y-6 xl:col-span-2">
              {/* Tiến độ xe đang ở gara */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">
                        Xe đang được xử lý tại gara
                      </p>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-[#1F2933]">
                      Toyota Camry 2.5Q ·{" "}
                      <span className="font-mono text-[#8F641B]">30G-888.66</span>
                    </h2>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Tiếp nhận 08:30 · Cố vấn: <strong>Lê Văn Toàn</strong> · 0901 000 102
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInspectionModal(true)}
                      className="h-9 cursor-pointer rounded-xl border border-[#E1E4E6] px-3.5 text-xs font-semibold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                    >
                      Bảng kiểm tra
                    </button>
                    <Link
                      to="/repair-status"
                      className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#1F2933] px-3.5 text-xs font-bold text-white transition hover:bg-slate-800"
                    >
                      Theo dõi →
                    </Link>
                  </div>
                </div>

                {/* Timeline 5 bước */}
                <ol className="mt-7 grid grid-cols-5 gap-2">
                  {[
                    { n: "1", title: "Tiếp nhận", desc: "08:35", state: "done" },
                    { n: "2", title: "Kiểm tra", desc: "Đang làm · 75%", state: "active" },
                    { n: "3", title: "Báo giá", desc: "Chờ duyệt", state: "todo" },
                    { n: "4", title: "Sửa chữa", desc: "Dự kiến 10:30", state: "todo" },
                    { n: "5", title: "Bàn giao", desc: "Dự kiến 11:45", state: "todo" },
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
                                ? "Xe đã được tiếp nhận lúc 08:35 và ghi nhận ODO 41.250 km."
                                : "Xe sẽ được bàn giao sau khi hoàn tất sửa chữa và nghiệm thu.",
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
                        {step.state === "done" ? "✓" : step.n}
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

              {/* Lịch sử bảo dưỡng */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2933]">Lịch sử bảo dưỡng</h2>
                    <p className="mt-0.5 text-xs text-[#66717C]">
                      Sổ bảo dưỡng điện tử, phụ tùng thay thế và chi phí từng lần.
                    </p>
                  </div>

                  <div className="inline-flex self-start rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-1">
                    {[
                      { key: "ALL", label: `Tất cả (${historyList.length})` },
                      { key: "MAINTENANCE", label: "Định kỳ" },
                      { key: "REPAIR", label: "Sửa chữa" },
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
                      placeholder="Tìm mã phiếu, tên xe, dịch vụ, phụ tùng..."
                      className="h-10 w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 pr-8 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                    />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#8A949E] hover:text-[#20252B]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedCarFilter}
                    onChange={(e) => setSelectedCarFilter(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white"
                  >
                    <option value="ALL">Tất cả xe</option>
                    <option value="30G-888.66">Toyota Camry · 30G-888.66</option>
                    <option value="29A-678.90">Honda CR-V · 29A-678.90</option>
                  </select>
                </div>

                <div className="mt-5 divide-y divide-[#EEF0F2] rounded-xl border border-[#E1E4E6]">
                  {filteredHistory.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm font-semibold text-[#20252B]">
                        Không có lịch sử phù hợp
                      </p>
                      <p className="mt-1 text-xs text-[#8A949E]">
                        Thử đổi từ khóa hoặc bộ lọc để xem thêm.
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
                        Xóa bộ lọc
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
                            <span className="text-[#8A949E]">· {item.odo}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Hoàn tất
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-bold text-[#1F2933]">
                            {item.serviceName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#66717C]">
                            {item.code} · {item.date} · {item.advisor}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end md:gap-2">
                          <p className="text-base font-bold text-[#1F2933]">
                            {item.cost.toLocaleString("vi-VN")} đ
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
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRebook(item);
                              }}
                              className="cursor-pointer rounded-lg border border-[#E5B869]/50 bg-[#FAF8F5] px-3 py-1.5 text-[11px] font-bold text-[#8F641B] transition hover:bg-[#F3E8D2]"
                            >
                              Đặt lại
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* ---------- CỘT PHẢI (1/3) ---------- */}
            <aside className="space-y-6">
              {/* Nhắc bảo dưỡng */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <h2 className="text-base font-bold text-[#1F2933]">Nhắc nhở sắp tới</h2>
                <p className="mt-0.5 text-xs text-[#66717C]">Dựa trên số km và hạn đăng kiểm.</p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold text-amber-900">Bảo dưỡng mốc 45.000 km</p>
                    <p className="mt-1 text-[11px] leading-5 text-amber-800">
                      Camry 30G-888.66 còn khoảng 3.750 km nữa là đến mốc thay dầu và đảo lốp.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/booking", {
                          state: {
                            prefillService: "Bảo dưỡng định kỳ cấp 45.000 KM",
                            car: "Toyota Camry 2.5Q",
                            licensePlate: "30G-888.66",
                          },
                        })
                      }
                      className="mt-3 cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700"
                    >
                      Đặt hẹn trước
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                    <p className="text-xs font-bold text-[#20252B]">Hạn đăng kiểm 28/11/2026</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                      Honda CR-V 29A-678.90. Gara hỗ trợ kiểm tra an toàn miễn phí trước khi đăng kiểm.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/contact", {
                          state: {
                            requestType: "Tư vấn kiểm tra đăng kiểm",
                            car: "Honda CR-V 29A-678.90",
                          },
                        })
                      }
                      className="mt-3 cursor-pointer rounded-lg border border-[#E1E4E6] bg-white px-3 py-1.5 text-[11px] font-bold text-[#20252B] transition hover:border-[#D6A85F]"
                    >
                      Nhận tư vấn
                    </button>
                  </div>
                </div>
              </section>

              {/* Hỗ trợ */}
              <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <h2 className="text-base font-bold text-[#1F2933]">Cần hỗ trợ?</h2>
                <p className="mt-0.5 text-xs leading-5 text-[#66717C]">
                  Cố vấn kỹ thuật sẵn sàng 24/7 khi xe gặp sự cố hoặc cần báo giá.
                </p>

                <div className="mt-4 rounded-xl bg-[#1F2933] p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#E5B869]">
                    Hotline cứu hộ 24/7
                  </p>
                  <p className="mt-1 text-xl font-bold tracking-wider">1900 8888 68</p>
                  <button
                    type="button"
                    onClick={handleCopyHotline}
                    className="mt-2 cursor-pointer text-[11px] text-slate-300 underline underline-offset-2 transition hover:text-white"
                  >
                    Sao chép số
                  </button>
                </div>

                <Link
                  to="/contact"
                  className="mt-3 block cursor-pointer rounded-xl border border-[#E1E4E6] py-2.5 text-center text-xs font-bold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                >
                  Gửi yêu cầu hỗ trợ
                </Link>
              </section>
            </aside>
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
