import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { fetchApi } from "../../services/api";
import { getUserDisplayName } from "../auth/auth";

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

type MaintenanceHistoryItem = {
  id: string;
  code: string;
  car: string;
  licensePlate: string;
  serviceName: string;
  odo: string;
  date: string;
  advisor: string;
  cost: number;
  status: "COMPLETED" | "IN_PROGRESS" | "WAITING_PAYMENT";
  partsReplaced: string[];
};

function CustomerDashboard() {
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
  const [activeTab, setActiveTab] = useState<"ALL" | "MAINTENANCE" | "REPAIR">("ALL");

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
      cost: 3450000,
      status: "COMPLETED",
      partsReplaced: [
        "Dầu động cơ tổng hợp toàn phần Castrol EDGE 5W-30 (4.5L)",
        "Lọc dầu chính hãng Toyota",
        "Lọc gió điều hòa than hoạt tính",
        "Dung dịch vệ sinh kim phun buồng đốt Liqui Moly",
      ],
    },
    {
      id: "2",
      code: "RO-2026-031",
      car: "Toyota Camry 2.5Q",
      licensePlate: "30G-888.66",
      serviceName: "Thay má phanh trước & Láng đĩa phanh",
      odo: "35.800 km",
      date: "18/07/2026",
      advisor: "Nguyễn Minh Đức",
      cost: 2150000,
      status: "COMPLETED",
      partsReplaced: [
        "Bộ má phanh đĩa trước OEM Akebono",
        "Dầu phanh DOT 4 chính hãng",
      ],
    },
    {
      id: "3",
      code: "RO-2026-018",
      car: "Honda CR-V 1.5L Turbo",
      licensePlate: "29A-678.90",
      serviceName: "Bảo dưỡng định kỳ cấp 20.000 KM & Cân bằng động",
      odo: "20.100 km",
      date: "05/04/2026",
      advisor: "Lê Văn Toàn",
      cost: 1890000,
      status: "COMPLETED",
      partsReplaced: [
        "Dầu động cơ Honda 0W-20",
        "Lọc nhớt & gioăng ốc xả",
        "Nước rửa kính đậm đặc",
      ],
    },
  ];

  const [historyList, setHistoryList] = useState<MaintenanceHistoryItem[]>(defaultHistory);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Lấy thông tin user mới nhất
        const profileRes = await fetchApi("/me");
        if (profileRes?.account) {
          setUser(profileRes.account);
          localStorage.setItem("user", JSON.stringify(profileRes.account));
        }

        // Tải danh sách xe của khách
        try {
          const vehRes = await fetchApi("/me/vehicles");
          if (Array.isArray(vehRes?.data)) {
            setVehicles(vehRes.data);
          } else if (Array.isArray(vehRes)) {
            setVehicles(vehRes);
          }
        } catch {
          // Bỏ qua lỗi xe
        }

        // Tải danh sách lịch hẹn
        try {
          const appRes = await fetchApi("/appointments");
          if (Array.isArray(appRes?.data)) {
            setAppointments(appRes.data);
          }
        } catch {
          // Bỏ qua lỗi lịch hẹn
        }

        // Tải lịch sử sửa chữa/bảo dưỡng
        try {
          const roRes = await fetchApi("/me/repair-orders");
          if (Array.isArray(roRes?.data) && roRes.data.length > 0) {
            const mapped: MaintenanceHistoryItem[] = roRes.data.map((item: any) => ({
              id: String(item.id),
              code: item.repair_order_code || `RO-2026-${String(item.id).padStart(3, "0")}`,
              car: item.vehicle?.model?.name ? `${item.vehicle?.model?.brand?.name || ""} ${item.vehicle.model.name}` : "Xe khách hàng",
              licensePlate: item.vehicle?.license_plate || "30G-888.66",
              serviceName: item.diagnosis || "Bảo dưỡng định kỳ & kiểm tra hệ thống",
              odo: item.current_odo ? `${item.current_odo.toLocaleString("vi-VN")} km` : "40.000 km",
              date: item.received_at ? new Date(item.received_at).toLocaleDateString("vi-VN") : "12/10/2026",
              advisor: item.advisor?.name || "Cố vấn dịch vụ",
              cost: Number(item.total_cost || item.estimated_cost || 2500000),
              status: item.status === "COMPLETED" || item.status === "CLOSED" ? "COMPLETED" : "IN_PROGRESS",
              partsReplaced: item.parts?.map((p: any) => p.name) || [
                "Dầu động cơ tổng hợp",
                "Lọc nhớt",
              ],
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

  const filteredHistory = historyList.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "MAINTENANCE") return item.serviceName.toLowerCase().includes("bảo dưỡng");
    if (activeTab === "REPAIR") return !item.serviceName.toLowerCase().includes("bảo dưỡng");
    return true;
  });

  const totalSpent = historyList.reduce((acc, cur) => acc + cur.cost, 0);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

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
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D6A85F] px-5 py-3 text-xs font-bold text-[#1F2933] shadow-md transition hover:bg-[#c9994f] hover:shadow-lg"
                >
                  <span className="text-base">＋</span>
                  <span>Đặt lịch bảo dưỡng ngay</span>
                </Link>

                <Link
                  to="/customer/cars"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <span>▰ Quản lý xe của tôi</span>
                </Link>
              </div>
            </div>

            {/* Họa tiết nền trừu tượng */}
            <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#D6A85F]/10 blur-3xl"></div>
          </div>

          {/* 2. CÁC THẺ THỐNG KÊ NHANH (KPI CARDS) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Xe đang theo dõi */}
            <Link
              to="/customer/cars"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition hover:border-[#D6A85F] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Xe đã đăng ký
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  🚗
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                {vehicles.length > 0 ? `${vehicles.length} xe` : "2 xe"}
              </p>
              <p className="mt-1 text-xs text-[#8A949E] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Đang hoạt động ổn định
              </p>
            </Link>

            {/* Card 2: Lịch hẹn sắp tới */}
            <Link
              to="/customer/appointments"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition hover:border-[#D6A85F] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Lịch hẹn sắp tới
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
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
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition hover:border-[#D6A85F] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Xe đang sửa chữa
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  🔧
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                1 xe
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-semibold">
                Đang kiểm tra 36 hạng mục
              </p>
            </Link>

            {/* Card 4: Tổng chi tiêu tích lũy */}
            <Link
              to="/invoices"
              className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-xs transition hover:border-[#D6A85F] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A949E]">
                  Tổng chi phí bảo dưỡng
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                  ₫
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#20252B]">
                {totalSpent.toLocaleString("vi-VN")} đ
              </p>
              <p className="mt-1 text-xs text-[#8A949E]">
                {historyList.length} lượt dịch vụ hoàn tất
              </p>
            </Link>
          </div>

          {/* 3. TIẾN ĐỘ XE HIỆN TẠI ĐANG Ở XƯỞNG (ACTIVE REPAIR WORKFLOW) */}
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

              <div className="flex items-center gap-3">
                <Link
                  to="/quotation"
                  className="rounded-xl border border-[#E1E4E6] px-3.5 py-2 text-xs font-semibold text-[#20252B] hover:bg-[#F7F7F5] transition"
                >
                  Xem báo giá chi tiết
                </Link>
                <Link
                  to="/repair-status"
                  className="rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Theo dõi trực tiếp →
                </Link>
              </div>
            </div>

            {/* Quy trình 5 bước dịch vụ */}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
              {/* Bước 1 */}
              <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white font-bold">✓</span>
                  <span className="text-xs font-bold uppercase">1. Tiếp nhận xe</span>
                </div>
                <p className="mt-2 text-xs text-emerald-800">
                  Đã ghi nhận ODO 41.250km và bàn giao chìa khóa.
                </p>
                <span className="mt-2 inline-block text-[10px] text-emerald-600 font-medium">08:35 • Hoàn tất</span>
              </div>

              {/* Bước 2 */}
              <div className="relative rounded-2xl border-2 border-amber-400 bg-amber-50/60 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white font-bold animate-spin">⚙</span>
                  <span className="text-xs font-bold uppercase">2. Kiểm tra xe</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-amber-900">
                  KTV đang chẩn đoán 36 hạng mục gầm & phanh.
                </p>
                <span className="mt-2 inline-block text-[10px] font-bold text-amber-700">Đang thực hiện (75%)</span>
              </div>

              {/* Bước 3 */}
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-75">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600 font-bold">3</span>
                  <span className="text-xs font-bold uppercase">3. Báo giá & Duyệt</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Cố vấn lên phương án thay thế gửi bạn duyệt.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-400">Chờ hoàn tất bước 2</span>
              </div>

              {/* Bước 4 */}
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-75">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600 font-bold">4</span>
                  <span className="text-xs font-bold uppercase">4. Sửa chữa</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Thay dầu, lọc dầu & thay má phanh theo yêu cầu.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-400">Dự kiến 10:30</span>
              </div>

              {/* Bước 5 */}
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-75">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600 font-bold">5</span>
                  <span className="text-xs font-bold uppercase">5. Bàn giao</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Rửa xe miễn phí và bàn giao xe cho khách hàng.
                </p>
                <span className="mt-2 inline-block text-[10px] text-slate-400">Dự kiến 11:45</span>
              </div>
            </div>
          </div>

          {/* 4. LỊCH SỬ BẢO DƯỠNG & SỬA CHỮA (CORE FEATURE) */}
          <div className="mt-8 rounded-3xl border border-[#E1E4E6] bg-white p-6 md:p-8 shadow-xs">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
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
              <div className="inline-flex rounded-xl bg-[#F7F7F5] p-1 border border-[#E1E4E6]">
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

            {/* Danh sách các lần bảo dưỡng */}
            <div className="mt-6 space-y-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#E1E4E6] p-5 transition hover:border-[#D6A85F] hover:shadow-xs"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-lg text-[#D6A85F]">
                        🚗
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E5B869]/50 text-[#8F641B]">
                            {item.licensePlate}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            • {item.car}
                          </span>
                          <span className="text-xs text-slate-400">
                            • ODO: {item.odo}
                          </span>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Đã hoàn tất
                          </span>
                        </div>

                        <h3 className="mt-1 text-sm font-bold text-[#1F2933]">
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
                        <Link
                          to="/invoices"
                          className="rounded-lg border border-[#E1E4E6] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#F7F7F5] transition"
                        >
                          Xem hóa đơn
                        </Link>
                        <Link
                          to="/booking"
                          className="rounded-lg bg-[#FAF8F5] border border-[#E5B869]/40 px-3 py-1.5 text-xs font-bold text-[#8F641B] hover:bg-[#F3E8D2] transition"
                        >
                          Đặt lại lịch này
                        </Link>
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
              ))}
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
                  <Link
                    to="/booking"
                    className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition text-center"
                  >
                    Đặt hẹn trước
                  </Link>
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
                  <Link
                    to="/contact"
                    className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition text-center"
                  >
                    Tư vấn ngay
                  </Link>
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
                  <p className="text-[11px] text-[#E5B869] font-semibold">HOTLINE CỨU HỘ 24/7</p>
                  <p className="mt-1 text-xl font-extrabold tracking-wider">1900 8888 68</p>
                  <p className="mt-1 text-[11px] text-slate-300">Cố vấn trưởng: 0901.000.102</p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  to="/contact"
                  className="block w-full rounded-xl border border-[#E1E4E6] py-2.5 text-center text-xs font-bold text-slate-800 hover:bg-[#F7F7F5] transition"
                >
                  Gửi yêu cầu hỗ trợ trực tuyến
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;
