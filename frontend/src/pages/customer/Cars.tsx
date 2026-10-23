import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import { Icon } from "../../components/ui/Icon";
import "../../styles/atelier-garage.css";
import {
  addMyVehicle,
  deleteMyVehicle,
  getMyVehicles,
  getVehicleName,
  updateMyVehicle,
  type CustomerVehicle,
} from "../../services/customerApi";

// Những model được POST /api/me/vehicles chấp nhận theo Laravel hiện tại.
const supportedVehicleModels = ["Vios", "Camry", "Corolla Altis", "Raize", "Corolla Cross", "Fortuner", "Innova Cross", "Hilux"];

function Cars() {
  const [cars, setCars] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="cs-garage" data-testid="customer-garage">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="cs-garage-container">
        <div className="cs-garage-heading">
          <div>
            <p className="cs-garage-eyebrow">MY GARAGE / VEHICLES</p>
            <h1>Garage của tôi</h1>
            <p className="cs-garage-subtitle">Quản lý danh sách xe để đặt lịch nhanh hơn.</p>
          </div>
          <button type="button" className="cs-garage-primary" onClick={() => {
            setError(""); setIsAddFormOpen((previous) => !previous);
          }}>
            <Icon name="plus" size={17} /> {isAddFormOpen ? "Đóng biểu mẫu" : "Thêm xe"}
          </button>
        </div>

        {error && <div role="alert" className="cs-garage-error">{error}</div>}
          {/* FORM THÊM XE MỚI */}
          {isAddFormOpen && (
            <form
              onSubmit={handleAddVehicle}
              className="cs-garage-add-form mb-7 rounded-2xl border border-[#E1E4E6] bg-white p-6"
            >
              <h2 className="text-[17px] font-bold text-[#20252B]">Thêm phương tiện mới</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label htmlFor="vehicle-model" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Dòng xe Toyota *
                  </label>
                  <select
                    id="vehicle-model"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    disabled={loading || saving}
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3.5 text-xs outline-none"
                  >
                    <option value="" disabled>Chọn dòng xe</option>
                    {supportedVehicleModels.map((model) => <option key={model} value={model}>Toyota {model}</option>)}
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


        {loading ? (
          <div className="cs-garage-empty" role="status">Đang tải xe từ hệ thống...</div>
        ) : cars.length === 0 ? (
          <div className="cs-garage-empty">
            <Icon name="car" size={38}/>
            <h2>Garage đang trống</h2>
            <p>Thêm chiếc xe đầu tiên để đặt lịch bảo dưỡng.</p>
            <button type="button" className="cs-garage-primary" onClick={() => setIsAddFormOpen(true)}>Thêm xe</button>
          </div>
        ) : (
          <div className="cs-garage-grid">
            {cars.map((car) => {
              const brand = car.model?.brand?.name || "PHƯƠNG TIỆN";
              const mileage = car.mileage != null ? Number(car.mileage).toLocaleString("vi-VN") : "—";
              return (
                <article className="cs-garage-vehicle" key={car.id}>
                  <div className="cs-garage-card-top">
                    <span className="cs-garage-eyebrow">{brand.toUpperCase()}</span>
                    <span className="cs-garage-year">{car.year ?? "—"}</span>
                  </div>
                  <div className="cs-garage-car-icon"><Icon name="car" size={40}/></div>
                  <h2>{getVehicleName(car)}</h2>
                  <p className="cs-garage-vehicle-note">{car.variant || "Hồ sơ phương tiện đã đăng ký"}</p>
                  <span className="cs-garage-plate">{car.license_plate || "CHƯA CÓ BIỂN"}</span>
                  <div className="cs-garage-card-bottom">
                    <span>{mileage} km</span>
                    <div className="cs-garage-card-actions">
                      <button type="button" onClick={() => setDetailVehicle(car)}>Chi tiết</button>
                      <button type="button" onClick={() => openEditModal(car)}>Sửa</button>
                      <button type="button" onClick={() => setDeletingVehicle(car)}>Xóa</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="cs-garage-footer-link"><Link to="/customer/booking">Đặt lịch bảo dưỡng cho xe của tôi <Icon name="arrow" size={15}/></Link></div>
      </main>
      {/* MODAL SỬA THÔNG TIN XE */}
      {editingVehicle && (
        <div className="cs-garage-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
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
        <div className="cs-garage-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
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
        <div className="cs-garage-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
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

    </div>
  );
}

export default Cars;
