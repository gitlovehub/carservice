import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Toast, type ToastType } from "../../components/auth/Toast";
import {
  addMyVehicle,
  deleteMyVehicle,
  getMyVehicles,
  getVehicleName,
  updateMyVehicle,
  type CustomerVehicle,
} from "../../services/customerApi";

const toyotaModels = [
  "Vios",
  "Camry",
  "Corolla Altis",
  "Raize",
  "Corolla Cross",
  "Fortuner",
  "Innova Cross",
  "Hilux",
  "Yaris Cross",
  "Veloz Cross",
];

function Cars() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCustomerPage = location.pathname === "/customer/cars";

  const [cars, setCars] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plateFilter, setPlateFilter] = useState("");

  // Form Thêm xe
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newMileage, setNewMileage] = useState("");
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal Cập nhật xe
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editYear, setEditYear] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Modal Xác nhận xóa xe
  const [deletingVehicle, setDeletingVehicle] = useState<CustomerVehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Chi tiết xe
  const [detailVehicle, setDetailVehicle] = useState<CustomerVehicle | null>(null);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadVehicles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyVehicles();
      setCars(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách xe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVehicles();
  }, []);

  const handleAddVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newModel || !newPlate.trim()) {
      setError("Vui lòng chọn dòng xe và nhập biển số.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: {
        model_name: string;
        license_plate: string;
        mileage?: number;
        year?: number;
      } = {
        model_name: newModel,
        license_plate: newPlate.trim().toUpperCase(),
      };
      if (newMileage) payload.mileage = Number(newMileage);
      if (newYear) payload.year = Number(newYear);

      await addMyVehicle(payload);
      setToast({ message: "Đã thêm phương tiện mới thành công.", type: "success" });
      setNewModel("");
      setNewPlate("");
      setNewMileage("");
      setNewYear("");
      setIsAddFormOpen(false);
      await loadVehicles();
    } catch (err) {
      const e = err as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const firstErr = e.data?.errors ? Object.values(e.data.errors).flat()[0] : undefined;
      setError(firstErr || e.data?.message || e.message || "Không thể thêm xe.");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (car: CustomerVehicle) => {
    setEditingVehicle(car);
    setEditPlate(car.license_plate ?? "");
    setEditMileage(car.mileage != null ? String(car.mileage) : "");
    setEditYear(car.year != null ? String(car.year) : "");
    setEditError("");
  };

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setUpdating(true);
    setEditError("");

    try {
      const payload: { license_plate?: string; mileage?: number; year?: number } = {
        license_plate: editPlate.trim().toUpperCase(),
      };
      if (editMileage.trim() !== "") payload.mileage = Number(editMileage);
      if (editYear.trim() !== "") payload.year = Number(editYear);

      await updateMyVehicle(editingVehicle.id, payload);
      setToast({ message: "Đã cập nhật thông tin xe thành công.", type: "success" });
      setEditingVehicle(null);
      await loadVehicles();
    } catch (err) {
      const e = err as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const firstErr = e.data?.errors ? Object.values(e.data.errors).flat()[0] : undefined;
      setEditError(firstErr || e.data?.message || e.message || "Không thể cập nhật xe.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    setDeleting(true);
    try {
      await deleteMyVehicle(deletingVehicle.id);
      setToast({ message: "Đã xóa xe khỏi danh sách của bạn.", type: "success" });
      setDeletingVehicle(null);
      await loadVehicles();
    } catch (err) {
      const e = err as { data?: { message?: string }; message?: string };
      setToast({
        message: e.data?.message || e.message || "Không thể xóa xe lúc này.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredCars = cars.filter((car) => {
    return plateFilter === "" || car.license_plate === plateFilter;
  });

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      {isCustomerPage ? (
        <>
          <CustomerHeader />
          <CustomerTopbar />
        </>
      ) : (
        <Header />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className={isCustomerPage ? "lg:ml-[250px]" : ""}>
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-14">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / XE CỦA TÔI
            </p>

            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Xe của tôi
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
                  Quản lý thông tin hồ sơ phương tiện, số km đồng hồ và theo dõi lịch sử dịch vụ.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/booking"
                  className="inline-flex cursor-pointer items-center rounded-xl border border-[#DDE1E4] bg-white px-4 py-2.5 text-xs font-semibold text-[#20252B] transition hover:border-[#D6A85F]"
                >
                  Đặt lịch bảo dưỡng
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setIsAddFormOpen((open) => !open);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#151D24]"
                >
                  <span className="text-sm">+</span>
                  {isAddFormOpen ? "Đóng form" : "Thêm xe mới"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* FORM THÊM XE MỚI */}
          {isAddFormOpen && (
            <form
              onSubmit={handleAddVehicle}
              className="mb-7 rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]"
            >
              <h2 className="text-[17px] font-bold text-[#20252B]">Thêm phương tiện mới</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label htmlFor="toyota-model" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Dòng xe Toyota *
                  </label>
                  <select
                    id="toyota-model"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    disabled={loading || saving}
                    className="h-11 w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 text-xs outline-none focus:border-[#D6A85F] focus:bg-white"
                  >
                    <option value="" disabled>Chọn dòng xe</option>
                    {toyotaModels.map((m) => (
                      <option key={m} value={m}>Toyota {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="license-plate" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Biển số xe *
                  </label>
                  <input
                    id="license-plate"
                    required
                    maxLength={20}
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="Ví dụ: 30A-123.45"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 font-mono text-xs uppercase outline-none focus:border-[#D6A85F] focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="mileage" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Số Km hiện tại (ODO)
                  </label>
                  <input
                    id="mileage"
                    type="number"
                    min={0}
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                    placeholder="Ví dụ: 35000"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 text-xs outline-none focus:border-[#D6A85F] focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Năm sản xuất
                  </label>
                  <input
                    id="year"
                    type="number"
                    min={1990}
                    max={2030}
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="Ví dụ: 2022"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 text-xs outline-none focus:border-[#D6A85F] focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-[#EEF0F2] pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2 text-xs font-semibold text-[#66717C] hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu xe"}
                </button>
              </div>
            </form>
          )}

          {/* 2 THẺ THỐNG KÊ */}
          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    XE ĐÃ ĐĂNG KÝ
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {loading ? "…" : cars.length} xe
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white">
                  🚗
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#66717C]">
                Tổng số phương tiện cá nhân của bạn trên hệ thống.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    BỘ LỌC HIỆN TẠI
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {loading ? "…" : filteredCars.length} xe
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                  ✓
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#66717C]">Số xe phù hợp với bộ lọc hiển thị.</p>
            </div>
          </div>

          {/* BẢNG DANH SÁCH XE */}
          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <select
                  value={plateFilter}
                  onChange={(e) => setPlateFilter(e.target.value)}
                  className="h-10 w-full sm:w-64 cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 text-xs text-[#20252B] outline-none transition focus:border-[#D6A85F]"
                >
                  <option value="">Tất cả biển số</option>
                  {cars
                    .filter((car) => car.license_plate)
                    .map((car) => (
                      <option key={car.id} value={car.license_plate ?? ""}>
                        {getVehicleName(car)} · {car.license_plate}
                      </option>
                    ))}
                </select>
                {plateFilter && (
                  <button
                    type="button"
                    onClick={() => setPlateFilter("")}
                    className="cursor-pointer text-xs font-bold text-[#8A949E] hover:text-[#20252B]"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#66717C]">
                {filteredCars.length} xe
              </span>
            </div>

            {loading ? (
              <p className="p-12 text-center text-xs text-[#8A949E]">Đang tải danh sách xe...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                      <th className="px-6 py-4">STT</th>
                      <th className="px-6 py-4">Xe / Dòng xe</th>
                      <th className="px-6 py-4">Biển số</th>
                      <th className="px-6 py-4">Số Km (ODO)</th>
                      <th className="px-6 py-4">Năm SX</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCars.map((car, index) => (
                      <tr
                        key={car.id}
                        className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                      >
                        <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                              🚗
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#20252B]">
                                {getVehicleName(car)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#8A949E]">
                                {car.variant ? `Phiên bản: ${car.variant}` : "Toyota chính hãng"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg border border-[#E5B869]/50 bg-[#FAF8F5] px-3 py-1.5 font-mono text-[12px] font-bold text-[#8F641B]">
                            {car.license_plate || "Chưa có"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-xs font-semibold text-slate-700">
                          {car.mileage != null
                            ? `${Number(car.mileage).toLocaleString("vi-VN")} km`
                            : "—"}
                        </td>

                        <td className="px-6 py-5 text-xs text-slate-600">
                          {car.year ?? "—"}
                        </td>

                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailVehicle(car)}
                              className="cursor-pointer rounded-xl bg-[#1F2933] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                            >
                              Chi tiết
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/customer/dashboard`)}
                              className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                            >
                              Lịch sử
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(car)}
                              className="cursor-pointer rounded-xl border border-[#DDE1E4] bg-white px-3 py-1.5 text-[11px] font-medium text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingVehicle(car)}
                              className="cursor-pointer rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCars.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center">
                          <p className="text-sm font-semibold text-[#20252B]">
                            Chưa có xe nào phù hợp
                          </p>
                          <p className="mt-1 text-[11px] text-[#8A949E]">
                            Bấm "+ Thêm xe mới" để thêm phương tiện của bạn.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL SỬA THÔNG TIN XE */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#1F2933]">
                Cập nhật xe: {getVehicleName(editingVehicle)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Biển số xe *</label>
                <input
                  type="text"
                  required
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono font-bold uppercase outline-none focus:border-[#D6A85F]"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Số km trên đồng hồ (ODO)</label>
                <input
                  type="number"
                  min={0}
                  value={editMileage}
                  onChange={(e) => setEditMileage(e.target.value)}
                  placeholder="Ví dụ: 45000"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#D6A85F]"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Năm sản xuất</label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="Ví dụ: 2021"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#D6A85F]"
                />
              </div>

              {editError && (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="cursor-pointer rounded-xl bg-[#1F2933] px-5 py-2 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {updating ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA XE */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#1F2933]">Xác nhận xóa xe?</h3>
            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa xe{" "}
              <strong>{getVehicleName(deletingVehicle)}</strong> (Biển số:{" "}
              <span className="font-mono">{deletingVehicle.license_plate}</span>) khỏi danh sách?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteVehicle()}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT XE */}
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  THÔNG TIN PHƯƠNG TIỆN
                </p>
                <h3 className="text-base font-bold text-[#1F2933]">
                  {getVehicleName(detailVehicle)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailVehicle(null)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Biển số:</span>
                <span className="font-mono font-bold text-[#8F641B]">
                  {detailVehicle.license_plate ?? "—"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Dòng xe:</span>
                <span className="font-semibold text-slate-800">
                  {detailVehicle.model?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Hãng sản xuất:</span>
                <span className="font-semibold text-slate-800">
                  {detailVehicle.model?.brand?.name ?? "Toyota"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Số ODO hiện tại:</span>
                <span className="font-bold text-slate-800">
                  {detailVehicle.mileage != null
                    ? `${Number(detailVehicle.mileage).toLocaleString("vi-VN")} km`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Năm sản xuất:</span>
                <span className="font-semibold text-slate-800">
                  {detailVehicle.year ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Link
                to={`/booking?vehicle_id=${detailVehicle.id}`}
                className="inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Đặt lịch cho xe này
              </Link>
              <button
                type="button"
                onClick={() => setDetailVehicle(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCustomerPage && <Footer />}
    </div>
  );
}

export default Cars;