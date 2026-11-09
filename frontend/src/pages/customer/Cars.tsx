import { Modal } from "../../components/ui";
import { buttonClass } from "../../components/ui/buttonClass";
import { Button, IconButton, KmInput } from "../../components/ui";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import { Icon } from "../../components/ui/Icon";
import {
  addMyVehicle,
  deleteMyVehicle,
  getMyVehicles,
  getVehicleName,
  updateMyVehicle,
  type CustomerVehicle,
} from "../../services/customerApi";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { emptySelection, selectionFromVehicle, type VehicleSelection } from "../../services/vehicleCatalog";

type SelectionErrors = { brand?: string; model?: string };

/** Hãng + dòng xe bắt buộc; phiên bản tùy chọn. */
function validateSelection(selection: VehicleSelection): SelectionErrors {
  if (selection.brandId === null) return { brand: "Vui lòng chọn hãng xe." };
  if (selection.modelId === null) return { model: "Vui lòng chọn dòng xe." };
  return {};
}

function Cars() {
  const [cars, setCars] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form Thêm xe
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newSelection, setNewSelection] = useState<VehicleSelection>(emptySelection);
  const [newSelectionErrors, setNewSelectionErrors] = useState<SelectionErrors>({});
  const [newPlate, setNewPlate] = useState("");
  const [newMileage, setNewMileage] = useState("");
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal Cập nhật xe
  const [editingVehicle, setEditingVehicle] = useState<CustomerVehicle | null>(null);
  const [editSelection, setEditSelection] = useState<VehicleSelection>(emptySelection);
  const [editSelectionErrors, setEditSelectionErrors] = useState<SelectionErrors>({});
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
    const selectionErrors = validateSelection(newSelection);
    setNewSelectionErrors(selectionErrors);
    if (selectionErrors.brand || selectionErrors.model || !newPlate.trim()) {
      setError(!newPlate.trim() && !selectionErrors.brand && !selectionErrors.model ? "Vui lòng nhập biển số." : "");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: {
        model_id: number;
        trim_id: number | null;
        license_plate: string;
        mileage?: number;
        year?: number;
      } = {
        model_id: newSelection.modelId as number,
        trim_id: newSelection.trimId,
        license_plate: newPlate.trim().toUpperCase(),
      };
      if (newMileage) payload.mileage = Number(newMileage);
      if (newYear) payload.year = Number(newYear);

      await addMyVehicle(payload);
      setToast({ message: "Đã thêm phương tiện mới thành công.", type: "success" });
      setNewSelection(emptySelection);
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
    setEditSelection(selectionFromVehicle(car));
    setEditSelectionErrors({});
    setEditPlate(car.license_plate ?? "");
    setEditMileage(car.mileage != null ? String(car.mileage) : "");
    setEditYear(car.year != null ? String(car.year) : "");
    setEditError("");
  };

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    const selectionErrors = validateSelection(editSelection);
    setEditSelectionErrors(selectionErrors);
    if (selectionErrors.brand || selectionErrors.model) return;
    setUpdating(true);
    setEditError("");

    try {
      const payload: { model_id?: number; trim_id?: number | null; license_plate?: string; mileage?: number; year?: number } = {
        model_id: editSelection.modelId as number,
        trim_id: editSelection.trimId,
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
    <div className="min-h-[calc(100vh-200px)] bg-cs-bg text-cs-text" data-testid="customer-garage">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <main className="mx-auto max-w-[1250px] px-[34px] pb-[82px] pt-12 max-[670px]:px-[18px] max-[670px]:pb-[60px] max-[670px]:pt-[34px]">
        <div className="mb-[33px] flex items-center justify-between gap-6 max-[670px]:flex-col max-[670px]:items-start">
          <div>
            <h1 className="mb-2 mt-3 text-[clamp(31px,3.4vw,46px)] font-extrabold leading-[1.16] tracking-normal">Xe của tôi</h1>
            <p className="text-sm leading-[1.7] text-cs-muted">Quản lý danh sách xe để đặt lịch nhanh hơn.</p>
          </div>
          <Button variant="tonal" icon={isAddFormOpen ? "x" : "plus"} className="w-max" onClick={() => {
            setError(""); setIsAddFormOpen((previous) => !previous);
          }}>{isAddFormOpen ? "Đóng biểu mẫu" : "Thêm xe"}</Button>
        </div>

        {error && <div role="alert" className="mb-5 rounded-[10px] border border-[#84424c] bg-[#44262d] px-[17px] py-[14px] text-[13px] text-[#ffc0c8]">{error}</div>}
          {/* FORM THÊM XE MỚI */}
          {isAddFormOpen && (
            <form
              onSubmit={handleAddVehicle}
              className="text-cs-text! border-cs-border! bg-cs-surface! [&_h2]:text-cs-text! [&_label]:text-cs-text! [&_input]:border-cs-border! [&_input]:bg-cs-surface-2! [&_input]:text-cs-text! [&_select]:border-cs-border! [&_select]:bg-cs-surface-2! [&_select]:text-cs-text! [&_textarea]:border-cs-border! [&_textarea]:bg-cs-surface-2! [&_textarea]:text-cs-text! mb-7 rounded-2xl border border-[#E1E4E6] bg-white p-6"
            >
              <h2 className="text-[17px] font-bold text-[#20252B]">Thêm phương tiện mới</h2>
              <VehicleSelector
                className="mt-5"
                value={newSelection}
                errors={newSelectionErrors}
                disabled={saving}
                onChange={(next) => { setNewSelection(next); setNewSelectionErrors({}); }}
              />
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
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
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-cs-surface-2 px-3.5 font-mono text-xs uppercase outline-none focus:border-[#cf2935] focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="mileage" className="mb-2 block text-xs font-bold text-[#20252B]">
                    Số Km hiện tại (ODO)
                  </label>
                  <KmInput id="mileage" label="Số km hiện tại (ODO)" value={newMileage} onChange={setNewMileage} disabled={saving} className="w-full !h-11 !rounded-xl"/>
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
                    className="h-11 w-full rounded-xl border border-[#DDE1E4] bg-cs-surface-2 px-3.5 text-xs outline-none focus:border-[#cf2935] focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-[#EEF0F2] pt-4">
                <Button variant="secondary" onClick={() => setIsAddFormOpen(false)}>Hủy</Button>
                <Button type="submit" variant="primary" icon="check" disabled={loading} loading={saving} loadingText="Đang lưu...">Lưu xe</Button>
              </div>
            </form>
          )}


        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-[15px] rounded-[18px] border border-cs-border bg-cs-surface p-[30px] text-center text-cs-muted [&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2]:text-cs-text" role="status">Đang tải xe từ hệ thống...</div>
        ) : cars.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-[15px] rounded-[18px] border border-cs-border bg-cs-surface p-[30px] text-center text-cs-muted [&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2]:text-cs-text">
            <Icon name="car" size={38}/>
            <h2>Bạn chưa có xe nào</h2>
            <p>Thêm chiếc xe đầu tiên để đặt lịch bảo dưỡng.</p>
            <Button variant="tonal" icon="plus" className="w-max" onClick={() => setIsAddFormOpen(true)}>Thêm xe</Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 items-stretch gap-5 max-[1050px]:grid-cols-2 max-[670px]:grid-cols-1">
            {cars.map((car) => {
              const brand = car.model?.brand?.name || "PHƯƠNG TIỆN";
              const mileage = car.mileage != null ? Number(car.mileage).toLocaleString("vi-VN") : "—";
              return (
                <article className="min-w-0 rounded-[19px] border border-cs-border bg-cs-surface p-6 transition-colors hover:border-[#cf29358c] max-[670px]:p-[21px] [&>h2]:break-words [&>h2]:text-[19px] [&>h2]:font-extrabold [&>h2]:leading-[1.35] [&>h2]:tracking-normal" key={car.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-extrabold uppercase leading-[1.6] tracking-[0.145em] text-cs-accent-text">{brand.toUpperCase()}</span>
                    <span className="rounded-lg bg-cs-surface-2 px-2.5 py-1.5 text-[12px] font-extrabold text-cs-muted">{car.year ?? "—"}</span>
                  </div>
                  <div className="mb-6 mt-[22px] text-cs-accent-text"><Icon name="car" size={40}/></div>
                  <h2>{getVehicleName(car)}</h2>
                  <p className="mt-[7px] min-h-9 text-xs leading-[1.55] text-cs-muted">{car.trim?.name || car.variant || "Hồ sơ phương tiện đã đăng ký"}</p>
                  <span className="mt-[13px] inline-block rounded-lg bg-cs-surface-2 px-3 py-2.5 text-xs font-extrabold tracking-[0.035em] text-cs-text">{car.license_plate || "CHƯA CÓ BIỂN"}</span>
                  <div className="mt-[25px] flex flex-wrap items-center justify-between gap-3 border-t border-cs-border pt-[18px] text-xs text-cs-muted">
                    <span>{mileage} km</span>
                    <div className="flex items-center gap-1">
                      <IconButton icon="eye" label="Chi tiết xe" onClick={() => setDetailVehicle(car)}/>
                      <IconButton icon="edit" label="Sửa xe" onClick={() => openEditModal(car)}/>
                      <IconButton icon="trash" tone="danger" label="Xóa xe" onClick={() => setDeletingVehicle(car)}/>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="mt-7 text-xs font-extrabold text-cs-accent-text [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2"><Link to="/customer/booking">Đặt lịch bảo dưỡng cho xe của tôi <Icon name="arrow" size={15}/></Link></div>
      </main>
      {/* MODAL SỬA THÔNG TIN XE */}
      {editingVehicle && (
        <Modal bare open onClose={() => setEditingVehicle(null)} dismissible={!updating} title={"Cập nhật xe"} className="my-auto w-full max-w-lg rounded-3xl bg-cs-surface p-6 shadow-overlay md:p-8">
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
              <VehicleSelector
                columns={1}
                value={editSelection}
                errors={editSelectionErrors}
                disabled={updating}
                onChange={(next) => { setEditSelection(next); setEditSelectionErrors({}); }}
              />
              <div>
                <label className="mb-1 block font-bold text-slate-700">Biển số xe *</label>
                <input
                  type="text"
                  required
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono font-bold uppercase outline-none focus:border-[#cf2935]"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Số km trên đồng hồ (ODO)</label>
                <KmInput label="Số km trên đồng hồ (ODO)" value={editMileage} onChange={setEditMileage} placeholder="Ví dụ: 45.000" className="w-full !rounded-xl"/>
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
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#cf2935]"
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
                  className={buttonClass({ variant: "secondary" })}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={buttonClass({ variant: "primary" })}
                >
                  {updating ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </Modal>
      )}

      {/* MODAL XÁC NHẬN XÓA XE */}
      {deletingVehicle && (
        <Modal bare open onClose={() => setDeletingVehicle(null)} dismissible={!deleting} title={"Xác nhận xóa xe"} className="w-full max-w-sm rounded-3xl bg-cs-surface p-6 shadow-overlay">
            <h3 className="text-base font-bold text-[#1F2933]">Xác nhận xóa xe?</h3>
            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa xe{" "}
              <strong>{getVehicleName(deletingVehicle)}</strong> (Biển số:{" "}
              <span className="font-mono">{deletingVehicle.license_plate}</span>) khỏi danh sách?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingVehicle(null)}>Hủy</Button>
              <Button variant="danger" icon="trash" loading={deleting} loadingText="Đang xóa..." onClick={() => void handleDeleteVehicle()}>Xóa vĩnh viễn</Button>
            </div>
          </Modal>
      )}

      {/* MODAL CHI TIẾT XE */}
      {detailVehicle && (
        <Modal bare open onClose={() => setDetailVehicle(null)} title={"Thông tin xe"} className="w-full max-w-md rounded-3xl bg-cs-surface p-6 shadow-overlay md:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D6A85F]">
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
                  {detailVehicle.model?.brand?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-slate-500">Phiên bản:</span>
                <span className="font-semibold text-slate-800">
                  {detailVehicle.trim?.name || detailVehicle.variant || "—"}
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
                className={buttonClass({ variant: "secondary" })}
              >
                Đóng
              </button>
            </div>
          </Modal>
      )}

    </div>
  );
}

export default Cars;
