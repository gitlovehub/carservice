import { Modal } from "../../components/ui";
import { useLiveRefresh } from "../../services/liveSync";
import { buttonClass } from "../../components/ui/buttonClass";
import { Button, IconButton, KmInput, Pagination, StatusBadge } from "../../components/ui";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import { Icon } from "../../components/ui/Icon";
import {
  addMyVehicle,
  deleteMyVehicle,
  getMyRepairOrders,
  getMyVehicles,
  getVehicleName,
  updateMyVehicle,
  type CustomerRepairOrder,
  type CustomerVehicle,
} from "../../services/customerApi";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { formatLicensePlate } from "../../services/licensePlate";
import { AccountHeader, InlineError } from "./account/AccountKit";
import { PRIMARY_RED } from "./account/accountStyles";
import { controlClass } from "../../components/ui/fieldContext";
import { emptySelection, selectionFromVehicle, type VehicleSelection } from "../../services/vehicleCatalog";

type SelectionErrors = { brand?: string; model?: string };

/** Hãng + dòng xe bắt buộc; phiên bản tùy chọn. */
function validateSelection(selection: VehicleSelection): SelectionErrors {
  if (selection.brandId === null) return { brand: "Vui lòng chọn hãng xe." };
  if (selection.modelId === null) return { model: "Vui lòng chọn dòng xe." };
  return {};
}

/** Nút "Thêm xe" cùng màu với nút Đăng nhập ở header (đỏ #e11d2e, chữ trắng, bóng đỏ nhẹ). */
const ADD_CAR_BUTTON = "border-transparent! bg-[#e11d2e]! text-white! shadow-[0_6px_16px_rgb(225_29_46/22%)] hover:bg-[#c81627]!";

/** Phiếu đã sửa xong — tính là một lần bảo dưỡng (CLOSED = đóng phiếu không làm, không tính). */
const FINISHED_ORDER_STATUSES = new Set(["COMPLETED", "HANDED_OVER"]);
/** Xe đã rời garage. Phiếu ở trạng thái khác (kể cả COMPLETED, chờ khách nhận) → xe còn ở xưởng. */
const LEFT_GARAGE_STATUSES = new Set(["HANDED_OVER", "CLOSED"]);
/** Chu kỳ nhắc bảo dưỡng định kỳ (tháng) kể từ lần bảo dưỡng gần nhất. */
const SERVICE_INTERVAL_MONTHS = 6;
/** Số xe mỗi trang trong danh sách. */
const CARS_PER_PAGE = 5;

type ServiceInfo = { lastServiceAt: Date | null; inWorkshop: boolean };

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Gom lệnh sửa chữa theo xe: ngày hoàn tất gần nhất + xe có đang nằm xưởng không. */
function buildServiceInfo(orders: CustomerRepairOrder[]): Map<number, ServiceInfo> {
  const map = new Map<number, ServiceInfo>();
  for (const order of orders) {
    const info = map.get(order.vehicle_id) ?? { lastServiceAt: null, inWorkshop: false };
    if (FINISHED_ORDER_STATUSES.has(order.status)) {
      const doneAt = order.completed_at || order.handed_over_at;
      const date = doneAt ? new Date(doneAt) : null;
      if (date && !Number.isNaN(date.getTime()) && (!info.lastServiceAt || date > info.lastServiceAt)) info.lastServiceAt = date;
    }
    if (!LEFT_GARAGE_STATUSES.has(order.status)) info.inWorkshop = true;
    map.set(order.vehicle_id, info);
  }
  return map;
}

function Cars() {
  const [cars, setCars] = useState<CustomerVehicle[]>([]);
  const [serviceInfo, setServiceInfo] = useState<Map<number, ServiceInfo>>(new Map());
  const [repairOrders, setRepairOrders] = useState<CustomerRepairOrder[]>([]);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(cars.length / CARS_PER_PAGE));
  // Xóa xe cuối của trang cuối → lùi về trang hợp lệ.
  const currentPage = Math.min(page, totalPages);
  const pagedCars = cars.slice((currentPage - 1) * CARS_PER_PAGE, currentPage * CARS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form Thêm xe
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addError, setAddError] = useState("");
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

  const loadVehicles = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      // Lịch sử sửa chữa chỉ để hiện ngày bảo dưỡng — lỗi thì vẫn hiện danh sách xe.
      const [data, orders] = await Promise.all([getMyVehicles(), getMyRepairOrders().catch(() => [])]);
      setCars(data);
      setServiceInfo(buildServiceInfo(orders));
      setRepairOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách xe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVehicles();
  }, []);
  useLiveRefresh(() => void loadVehicles(true));

  const handleAddVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectionErrors = validateSelection(newSelection);
    setNewSelectionErrors(selectionErrors);
    if (selectionErrors.brand || selectionErrors.model) {
      setAddError("");
      return;
    }

    setSaving(true);
    setAddError("");
    try {
      const payload: {
        model_id: number;
        trim_id: number | null;
        license_plate: string | null;
        mileage?: number;
        year?: number;
      } = {
        model_id: newSelection.modelId as number,
        trim_id: newSelection.trimId,
        // Biển số không bắt buộc (xe mới chưa có biển) → gửi null khi để trống.
        license_plate: newPlate.trim().toUpperCase() || null,
      };
      if (newMileage) payload.mileage = Number(newMileage);
      if (newYear) payload.year = Number(newYear);

      const res = await addMyVehicle(payload) as { restored?: boolean; message?: string } | undefined;
      // Biển số trùng xe khách đã xóa trước đó → backend khôi phục xe cũ (giữ lịch sử).
      setToast({ message: res?.restored ? (res.message || "Đã khôi phục xe cùng lịch sử bảo dưỡng.") : "Đã thêm phương tiện mới thành công.", type: "success" });
      setNewSelection(emptySelection);
      setNewPlate("");
      setNewMileage("");
      setNewYear("");
      setIsAddFormOpen(false);
      await loadVehicles();
    } catch (err) {
      const e = err as { data?: { message?: string; errors?: Record<string, string[]> }; message?: string };
      const firstErr = e.data?.errors ? Object.values(e.data.errors).flat()[0] : undefined;
      setAddError(firstErr || e.data?.message || e.message || "Không thể thêm xe.");
    } finally {
      setSaving(false);
    }
  };

  /** Mở modal thêm xe với biểu mẫu trống. */
  const openAddModal = () => {
    setNewSelection(emptySelection);
    setNewSelectionErrors({});
    setNewPlate("");
    setNewMileage("");
    setNewYear("");
    setAddError("");
    setIsAddFormOpen(true);
  };

  const openEditModal = (car: CustomerVehicle) => {
    setEditingVehicle(car);
    setEditSelection(selectionFromVehicle(car));
    setEditSelectionErrors({});
    setEditPlate(car.license_plate ? formatLicensePlate(car.license_plate) : "");
    setEditMileage(car.mileage != null ? String(car.mileage) : "");
    setEditYear(car.year != null ? String(car.year) : "");
    setEditError("");
  };

  /** Xe đang sửa đã có phiếu sửa chữa → khóa hãng/dòng/phiên bản/năm. */
  const editLocked = (editingVehicle?.repair_orders_count ?? 0) > 0;
  /** Xe đang định xóa còn ở garage → không cho xóa (backend cũng chặn). */
  const deletingInWorkshop = deletingVehicle ? Boolean(serviceInfo.get(deletingVehicle.id)?.inWorkshop) : false;

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    const selectionErrors = validateSelection(editSelection);
    setEditSelectionErrors(selectionErrors);
    if (selectionErrors.brand || selectionErrors.model) return;
    setUpdating(true);
    setEditError("");

    try {
      const payload: { model_id?: number; trim_id?: number | null; license_plate?: string | null; mileage?: number; year?: number } = {
        license_plate: editPlate.trim().toUpperCase() || null,
      };
      // Xe đã có lịch sử: không gửi các trường xác định xe (backend cũng chặn đổi).
      if (!editLocked) {
        payload.model_id = editSelection.modelId as number;
        payload.trim_id = editSelection.trimId;
        if (editYear.trim() !== "") payload.year = Number(editYear);
      }
      if (editMileage.trim() !== "") payload.mileage = Number(editMileage);

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
    <div className="text-cs-text" data-testid="customer-garage">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Cùng khung tiêu đề + khoảng cách 24px với 7 trang khác của menu tài khoản. */}
      <main className="min-w-0 space-y-6">
        <AccountHeader title="Xe của tôi" description="Quản lý danh sách xe để đặt lịch, theo dõi bảo dưỡng và nhận nhắc nhở định kỳ."
          actions={<Button variant="primary" icon="plus" className={`w-max ${ADD_CAR_BUTTON}`} onClick={openAddModal}>Thêm xe</Button>}/>

        {error && <InlineError>{error}</InlineError>}


        {loading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-[15px] rounded-[18px] border border-cs-border bg-cs-surface p-[30px] text-center text-cs-muted [&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2]:text-cs-text" role="status">Đang tải xe từ hệ thống...</div>
        ) : cars.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-[15px] rounded-[18px] border border-cs-border bg-cs-surface p-[30px] text-center text-cs-muted [&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2]:text-cs-text">
            <Icon name="car" size={38}/>
            <h2>Bạn chưa có xe nào</h2>
            <p>Thêm chiếc xe đầu tiên để đặt lịch bảo dưỡng.</p>
            <Button variant="primary" icon="plus" className={`w-max ${ADD_CAR_BUTTON}`} onClick={openAddModal}>Thêm xe</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pagedCars.map((car) => {
              const brand = car.model?.brand?.name || "Phương tiện";
              const trim = car.trim?.name || car.variant;
              const mileage = car.mileage != null ? Number(car.mileage).toLocaleString("vi-VN") : "—";
              const info = serviceInfo.get(car.id);
              const lastServiceAt = info?.lastServiceAt ?? null;
              const nextServiceAt = lastServiceAt ? addMonths(lastServiceAt, SERVICE_INTERVAL_MONTHS) : null;
              const nextServiceDue = nextServiceAt !== null && nextServiceAt.getTime() <= Date.now();
              return (
                <article key={car.id} data-testid="customer-car-card" className="grid min-w-0 grid-cols-[200px_minmax(0,1fr)_minmax(330px,1.15fr)_auto] items-center gap-5 rounded-[18px] border border-cs-border bg-cs-surface p-4 shadow-[0_2px_10px_rgb(15_23_42/4%)] transition-colors hover:border-[#cf29358c] max-[1180px]:grid-cols-[170px_minmax(0,1fr)_auto] max-[670px]:grid-cols-1 max-[670px]:gap-4">
                  {/* Ảnh xe — tạm thời để trống, chờ có ảnh theo dòng xe. */}
                  <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-cs-surface-2 text-cs-muted/60 max-[1180px]:row-span-2 max-[670px]:row-span-1" aria-hidden="true">
                    <Icon name="car" size={44}/>
                  </div>

                  {/* Hãng + dòng xe + phiên bản + biển số */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <VehicleBrandLogo brand={car.model?.brand?.name} size={48}/>
                      <span className="truncate text-[15px] font-bold text-cs-text">{brand}</span>
                    </div>
                    <h2 className="mt-2.5 break-words text-[20px] font-extrabold leading-[1.3] tracking-normal text-cs-text">{car.model?.name || getVehicleName(car)}</h2>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {trim && <span className="rounded-lg bg-cs-surface-2 px-3 py-1.5 text-[13px] font-medium text-cs-text">{trim}</span>}
                      <span className="inline-flex items-center rounded-lg border border-cs-border px-3 py-1.5 font-mono text-[13px] font-bold uppercase tracking-[0.03em] text-cs-text">{car.license_plate || <NoPlate/>}</span>
                    </div>
                  </div>

                  {/* Thông số: km, ngày đăng ký, bảo dưỡng */}
                  <dl className="grid min-w-0 gap-2.5 border-l border-cs-border pl-5 text-[14px] text-cs-muted max-[1180px]:col-start-2 max-[1180px]:row-start-2 max-[1180px]:border-l-0 max-[1180px]:pl-0 max-[670px]:col-start-1 max-[670px]:row-start-auto max-[670px]:border-t max-[670px]:pt-4">
                    <div className="flex items-center gap-2.5"><Icon name="gauge" size={17}/><dt className="sr-only">Số km</dt><dd className="text-cs-text">{mileage} km</dd></div>
                    <div className="flex items-center gap-2.5"><Icon name="calendar" size={17}/><dt>Đăng ký:</dt><dd className="text-cs-text">{formatDate(car.created_at)}</dd></div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap"><Icon name="wrench" size={17} className="shrink-0"/><dt>Bảo dưỡng gần nhất:</dt><dd className="text-cs-text">{lastServiceAt ? formatDate(lastServiceAt) : "Chưa có"}</dd></div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap"><Icon name="wrench" size={17} className="shrink-0"/><dt>Bảo dưỡng tiếp theo:</dt>
                      <dd>{nextServiceAt
                        ? <span className={`rounded-full px-2.5 py-1 font-bold ${nextServiceDue ? "bg-cs-soft text-cs-accent-text ring-1 ring-cs-accent/40" : "bg-cs-soft text-cs-accent-text"}`} title={nextServiceDue ? "Đã đến hạn bảo dưỡng" : `Gợi ý ${SERVICE_INTERVAL_MONTHS} tháng sau lần bảo dưỡng gần nhất`}>{formatDate(nextServiceAt)}</span>
                        : <span className="text-cs-text">—</span>}</dd>
                    </div>
                  </dl>

                  {/* Trạng thái + thao tác */}
                  <div className="flex flex-col items-end gap-4 self-stretch justify-between border-l border-cs-border pl-5 max-[1180px]:row-span-2 max-[1180px]:col-start-3 max-[1180px]:row-start-1 max-[670px]:col-start-1 max-[670px]:row-span-1 max-[670px]:row-start-auto max-[670px]:flex-row max-[670px]:items-center max-[670px]:border-l-0 max-[670px]:pl-0">
                    {info?.inWorkshop
                      ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/12 px-3 py-1.5 text-[13px] font-bold text-amber-700 dark:text-amber-300"><Icon name="wrench" size={15}/>Đang ở xưởng</span>
                      : <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/12 px-3 py-1.5 text-[13px] font-bold text-emerald-700 dark:text-emerald-300"><Icon name="check" size={15}/>Đang sử dụng</span>}
                    <div className="flex items-center gap-2">
                      <IconButton icon="eye" label="Chi tiết xe" onClick={() => setDetailVehicle(car)}/>
                      <IconButton icon="edit" label="Sửa xe" onClick={() => openEditModal(car)}/>
                      <IconButton icon="trash" tone="danger" label="Xóa xe" onClick={() => setDeletingVehicle(car)}/>
                    </div>
                  </div>
                </article>
              );
            })}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={cars.length} pageSize={CARS_PER_PAGE} onChange={setPage}/>
          </div>
        )}
      </main>
      {/* MODAL THÊM XE */}
      {isAddFormOpen && (
        <Modal bare open onClose={() => setIsAddFormOpen(false)} dismissible={!saving} title="Thêm xe" className="my-auto w-full max-w-3xl rounded-3xl bg-cs-surface shadow-overlay">
          <form onSubmit={handleAddVehicle} noValidate>
            <div className="flex items-start gap-4 border-b border-cs-border p-5 sm:p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cs-soft text-cs-accent-text"><Icon name="car" size={24}/></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[20px] font-extrabold text-cs-text">Thêm xe mới</h3>
                <p className="mt-0.5 text-[14px] text-cs-muted">Lưu xe vào tài khoản để đặt lịch nhanh và nhận nhắc bảo dưỡng.</p>
              </div>
              <IconButton icon="x" label="Đóng" onClick={() => setIsAddFormOpen(false)} disabled={saving}/>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <h4 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-cs-muted">Dòng xe</h4>
                <VehicleSelector
                  value={newSelection}
                  errors={newSelectionErrors}
                  disabled={saving}
                  onChange={(next) => { setNewSelection(next); setNewSelectionErrors({}); }}
                />
              </section>

              <section className="border-t border-cs-border pt-5">
                <h4 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-cs-muted">Thông tin xe</h4>
                {/* Cùng kiểu ô nhập (controlClass) và nhãn với các ô chọn hãng / dòng / phiên bản ở trên. */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="license-plate" className="text-label text-cs-text-2">Biển số xe <span className="ml-1 font-normal text-cs-muted">(không bắt buộc)</span></label>
                    <input
                      id="license-plate"
                      maxLength={20}
                      value={newPlate}
                      onChange={(e) => setNewPlate(formatLicensePlate(e.target.value))}
                      placeholder="Ví dụ: 30A-123.45"
                      disabled={saving}
                      className={`${controlClass} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mileage" className="text-label text-cs-text-2">Số km hiện tại (ODO)</label>
                    <KmInput id="mileage" label="Số km hiện tại (ODO)" value={newMileage} onChange={setNewMileage} disabled={saving} className="w-full"/>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className="text-label text-cs-text-2">Năm sản xuất</label>
                    <input
                      id="year"
                      type="number"
                      min={1990}
                      max={2030}
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      placeholder="Ví dụ: 2022"
                      disabled={saving}
                      className={controlClass}
                    />
                  </div>
                </div>
              </section>

              {addError && <p role="alert" className="rounded-xl border border-cs-accent/40 bg-cs-soft px-4 py-3 text-[14px] font-semibold text-cs-accent-text">{addError}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-cs-border px-5 py-4 sm:px-6">
              <Button variant="secondary" onClick={() => setIsAddFormOpen(false)} disabled={saving}>Hủy</Button>
              <Button type="submit" variant="primary" icon="check" className={ADD_CAR_BUTTON} loading={saving} loadingText="Đang lưu...">Lưu xe</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL SỬA THÔNG TIN XE — cùng bố cục với modal Thêm xe (ô nhập xếp 3 cột). */}
      {editingVehicle && (
        <Modal bare open onClose={() => setEditingVehicle(null)} dismissible={!updating} title="Cập nhật xe" className="my-auto w-full max-w-3xl rounded-3xl bg-cs-surface shadow-overlay">
          <form onSubmit={handleUpdateVehicle} noValidate>
            <div className="flex items-start gap-4 border-b border-cs-border p-5 sm:p-6">
              <VehicleBrandLogo brand={editingVehicle.model?.brand?.name} size={48}/>
              <div className="min-w-0 flex-1">
                <h3 className="text-[20px] font-extrabold text-cs-text">Cập nhật xe</h3>
                <p className="mt-0.5 truncate text-[14px] text-cs-muted">{getVehicleName(editingVehicle)}</p>
              </div>
              <IconButton icon="x" label="Đóng" onClick={() => setEditingVehicle(null)} disabled={updating}/>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {editLocked && (
                <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-[14px] leading-relaxed text-cs-text">
                  <Icon name="lock" size={17} className="mt-0.5 shrink-0 text-amber-600"/>
                  <span>Xe đã có lịch sử bảo dưỡng nên không thể đổi hãng, dòng xe, phiên bản và năm sản xuất. Nếu là xe khác, hãy <strong>thêm xe mới</strong>.</span>
                </p>
              )}

              <section>
                <h4 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-cs-muted">Dòng xe</h4>
                <VehicleSelector
                  value={editSelection}
                  errors={editSelectionErrors}
                  disabled={updating || editLocked}
                  onChange={(next) => { setEditSelection(next); setEditSelectionErrors({}); }}
                />
              </section>

              <section className="border-t border-cs-border pt-5">
                <h4 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-cs-muted">Thông tin xe</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-license-plate" className="text-label text-cs-text-2">Biển số xe <span className="ml-1 font-normal text-cs-muted">(không bắt buộc)</span></label>
                    <input
                      id="edit-license-plate"
                      maxLength={20}
                      placeholder="Ví dụ: 30A-123.45"
                      value={editPlate}
                      onChange={(e) => setEditPlate(formatLicensePlate(e.target.value))}
                      disabled={updating}
                      className={`${controlClass} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-mileage" className="text-label text-cs-text-2">Số km hiện tại (ODO)</label>
                    <KmInput id="edit-mileage" label="Số km hiện tại (ODO)" value={editMileage} onChange={setEditMileage} placeholder="Ví dụ: 45.000" disabled={updating} className="w-full"/>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-year" className="text-label text-cs-text-2">Năm sản xuất</label>
                    <input
                      id="edit-year"
                      type="number"
                      min={1990}
                      max={2030}
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      placeholder="Ví dụ: 2021"
                      disabled={updating || editLocked}
                      className={controlClass}
                    />
                  </div>
                </div>
              </section>

              {editError && <p role="alert" className="rounded-xl border border-cs-accent/40 bg-cs-soft px-4 py-3 text-[14px] font-semibold text-cs-accent-text">{editError}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-cs-border px-5 py-4 sm:px-6">
              <Button variant="secondary" onClick={() => setEditingVehicle(null)} disabled={updating}>Hủy</Button>
              <Button type="submit" variant="primary" icon="check" className={ADD_CAR_BUTTON} loading={updating} loadingText="Đang lưu...">Cập nhật</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN XÓA XE */}
      {deletingVehicle && (
        <Modal bare open onClose={() => setDeletingVehicle(null)} dismissible={!deleting} title={"Xác nhận xóa xe"} className="my-auto w-full max-w-md rounded-3xl bg-cs-surface p-7 shadow-overlay">
            <h3 className="text-[19px] font-extrabold text-cs-text">Xóa xe khỏi danh sách?</h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-cs-muted">
              Xe <strong className="text-cs-text">{getVehicleName(deletingVehicle)}</strong>
              {deletingVehicle.license_plate && <> (<span className="font-mono">{deletingVehicle.license_plate}</span>)</>} sẽ không còn hiện trong "Xe của tôi".
            </p>
            {deletingInWorkshop ? (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-[14px] leading-relaxed text-cs-text">
                <Icon name="wrench" size={16} className="mt-0.5 shrink-0 text-amber-600"/>
                Xe đang được xử lý tại garage nên chưa thể xóa. Bạn có thể xóa sau khi đã nhận lại xe.
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-cs-surface-2 p-4 text-[14px] leading-relaxed text-cs-text">
                <Icon name="history" size={16} className="mt-0.5 shrink-0 text-cs-muted"/>
                Lịch sử bảo dưỡng và hóa đơn của xe vẫn được giữ. Thêm lại xe với cùng biển số để khôi phục.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingVehicle(null)}>{deletingInWorkshop ? "Đóng" : "Hủy"}</Button>
              {!deletingInWorkshop && <Button variant="danger" icon="trash" loading={deleting} loadingText="Đang xóa..." onClick={() => void handleDeleteVehicle()}>Xóa khỏi danh sách</Button>}
            </div>
          </Modal>
      )}

      {/* MODAL CHI TIẾT XE */}
      {detailVehicle && (
        <VehicleDetailModal
          vehicle={detailVehicle}
          orders={repairOrders.filter((order) => order.vehicle_id === detailVehicle.id)}
          onClose={() => setDetailVehicle(null)}
          onEdit={() => { const car = detailVehicle; setDetailVehicle(null); openEditModal(car); }}
          onNoteSaved={(note) => {
            setDetailVehicle((current) => (current ? { ...current, note } : current));
            setCars((list) => list.map((car) => (car.id === detailVehicle.id ? { ...car, note } : car)));
            setToast({ message: "Đã lưu ghi chú cho xe.", type: "success" });
          }}
        />
      )}

    </div>
  );
}

/** Xe chưa có biển số: hiện "XXXX" mờ (chữ đầy đủ nằm ở tooltip + aria-label). */
function NoPlate() {
  return (
    <span className="font-mono uppercase tracking-[0.08em] text-cs-muted" title="Chưa có biển số" aria-label="Chưa có biển số">XXXX</span>
  );
}

type IconName = Parameters<typeof Icon>[0]["name"];
type DetailTab = "info" | "maintenance" | "history";

const DETAIL_TABS: { id: DetailTab; label: string; icon: IconName }[] = [
  { id: "info", label: "Thông tin xe", icon: "info" },
  { id: "maintenance", label: "Bảo dưỡng", icon: "wrench" },
  { id: "history", label: "Lịch sử dịch vụ", icon: "history" },
];

/** Ô thông số có icon (lưới "Thông số cơ bản"). */
function SpecTile({ icon, label, value, mono = false }: { icon: IconName; label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-cs-surface-2 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-cs-muted"><Icon name={icon} size={19}/></span>
      <div className="min-w-0">
        <dt className="text-[13px] text-cs-muted">{label}</dt>
        <dd className={`mt-0.5 truncate text-[15px] font-bold text-cs-text ${mono ? "font-mono uppercase tracking-[0.03em]" : ""}`} title={typeof value === "string" ? value : undefined}>{value}</dd>
      </div>
    </div>
  );
}

/** Dòng "nhãn ……… giá trị" ở cột trái. */
function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="shrink-0 text-cs-muted"><Icon name={icon} size={18}/></span>
      <span className="min-w-0 flex-1 text-[14px] text-cs-muted">{label}</span>
      <span className="shrink-0 text-[14px] font-bold text-cs-text">{value}</span>
    </div>
  );
}

/** Tiêu đề khối bên phải: icon đỏ + chữ đậm. */
function DetailHeading({ icon, children, action }: { icon: IconName; children: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h4 className="flex items-center gap-2.5 text-[17px] font-extrabold text-cs-text"><span className="text-cs-accent-text"><Icon name={icon} size={20}/></span>{children}</h4>
      {action}
    </div>
  );
}

/** Nhãn trạng thái xe (Đang sử dụng / Đang ở xưởng). */
function VehicleStatusPill({ inWorkshop }: { inWorkshop: boolean }) {
  return inWorkshop
    ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/12 px-3 py-1.5 text-[13px] font-bold text-amber-700 dark:text-amber-300"><Icon name="wrench" size={14}/>Đang ở xưởng</span>
    : <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/12 px-3 py-1.5 text-[13px] font-bold text-emerald-700 dark:text-emerald-300"><Icon name="check" size={14}/>Đang sử dụng</span>;
}

/** Modal chi tiết xe: cột trái (ảnh + tóm tắt), cột phải (tab Thông tin xe / Bảo dưỡng / Lịch sử dịch vụ). */
function VehicleDetailModal({ vehicle, orders, onClose, onEdit, onNoteSaved }: {
  vehicle: CustomerVehicle;
  orders: CustomerRepairOrder[];
  onClose: () => void;
  onEdit: () => void;
  onNoteSaved: (note: string | null) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("info");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(vehicle.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  const brand = vehicle.model?.brand?.name || "Phương tiện";
  const trim = vehicle.trim?.name || vehicle.variant;
  const info = buildServiceInfo(orders).get(vehicle.id);
  const lastServiceAt = info?.lastServiceAt ?? null;
  const nextServiceAt = lastServiceAt ? addMonths(lastServiceAt, SERVICE_INTERVAL_MONTHS) : null;
  const nextServiceDue = nextServiceAt !== null && nextServiceAt.getTime() <= Date.now();
  const daysUntilNext = nextServiceAt ? Math.ceil((nextServiceAt.getTime() - Date.now()) / 86_400_000) : null;
  const finishedCount = orders.filter((order) => FINISHED_ORDER_STATUSES.has(order.status)).length;
  const activeOrder = orders.find((order) => !LEFT_GARAGE_STATUSES.has(order.status));
  const sortedOrders = [...orders].sort((a, b) => new Date(b.received_at ?? 0).getTime() - new Date(a.received_at ?? 0).getTime());
  const bookingLink = `/booking?vehicle_id=${vehicle.id}`;

  const saveNote = async () => {
    setSavingNote(true);
    setNoteError("");
    try {
      const note = noteDraft.trim();
      await updateMyVehicle(vehicle.id, { note });
      onNoteSaved(note || null);
      setEditingNote(false);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Không thể lưu ghi chú.");
    } finally {
      setSavingNote(false);
    }
  };

  const nextServiceBox = (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-cs-soft px-5 py-4">
      <span className="shrink-0 text-cs-accent-text"><Icon name="calendar" size={26}/></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-cs-text">Bảo dưỡng tiếp theo{nextServiceAt && <span className="ml-2 text-cs-accent-text">{formatDate(nextServiceAt)}</span>}</p>
        <p className={`mt-0.5 text-[13px] ${nextServiceDue ? "font-bold text-cs-accent-text" : "text-cs-muted"}`}>
          {!nextServiceAt ? "Chưa có lần bảo dưỡng nào" : nextServiceDue ? "Đã đến hạn — nên đặt lịch ngay" : `Còn ${daysUntilNext} ngày`}
        </p>
      </div>
      <Link to={bookingLink} className={`${buttonClass({ variant: "primary", size: "sm" })} ${PRIMARY_RED}`}>
        <Icon name="calendar" size={15}/>Đặt lịch bảo dưỡng
      </Link>
    </div>
  );

  const maintenanceStats = (
    <div className="grid grid-cols-2 divide-x divide-cs-border rounded-xl border border-cs-border max-[480px]:grid-cols-1 max-[480px]:divide-x-0 max-[480px]:divide-y">
      <p className="flex items-center gap-2.5 px-4 py-3 text-[14px] text-cs-muted"><Icon name="layers" size={18}/>Số lần đã bảo dưỡng: <strong className="text-cs-text">{finishedCount} lần</strong></p>
      <p className="flex items-center gap-2.5 px-4 py-3 text-[14px] text-cs-muted"><Icon name="bell" size={18}/>Chu kỳ nhắc: <strong className="text-cs-text">{SERVICE_INTERVAL_MONTHS} tháng</strong></p>
    </div>
  );

  return (
    <Modal bare open onClose={onClose} title="Thông tin xe" className="relative my-auto w-full max-w-[1100px] overflow-hidden rounded-3xl bg-cs-surface shadow-overlay">
      {/* Nút đóng: cách mép trên và mép phải bằng nhau (12px), căn giữa theo chiều cao thanh tab (64px). */}
      <div className="absolute right-3 top-3 z-10 rounded-control bg-cs-surface">
        <IconButton icon="x" label="Đóng" onClick={onClose}/>
      </div>
      <div className="grid grid-cols-[380px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        {/* CỘT TRÁI: ảnh (tạm trống) + tóm tắt */}
        <aside className="border-r border-cs-border p-5 max-[900px]:border-b max-[900px]:border-r-0 sm:p-6">
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-cs-surface-2 text-cs-muted/70" aria-label="Chưa có ảnh xe" role="img">
            <Icon name="car" size={52}/>
            <span className="text-[13px] font-semibold">Chưa có ảnh xe</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((slot) => <div key={slot} className="aspect-[4/3] rounded-lg border border-dashed border-cs-border bg-cs-surface-2"/>)}
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <VehicleBrandLogo brand={vehicle.model?.brand?.name} size={56}/>
            <span className="truncate text-[15px] font-bold text-cs-text">{brand}</span>
          </div>
          <h3 className="mt-2 break-words text-[28px] font-extrabold leading-tight text-cs-text">{vehicle.model?.name || getVehicleName(vehicle)}</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-cs-border pb-4">
            {trim ? <span className="rounded-lg bg-cs-surface-2 px-3 py-1.5 text-[14px] font-medium text-cs-text">{trim}</span> : <span/>}
            <VehicleStatusPill inWorkshop={Boolean(info?.inWorkshop)}/>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-cs-soft px-4 py-3.5">
            <span className="shrink-0 text-cs-accent-text"><Icon name="gauge" size={20}/></span>
            <span className="min-w-0 flex-1 text-[14px] text-cs-text">Số ODO hiện tại</span>
            <span className="shrink-0 text-[20px] font-extrabold text-cs-text">{vehicle.mileage != null ? Number(vehicle.mileage).toLocaleString("vi-VN") : "—"}<span className="ml-1 text-[14px] font-bold">km</span></span>
          </div>
          <div className="mt-1 divide-y divide-cs-border">
            <SummaryRow icon="calendar" label="Ngày thêm vào tài khoản" value={formatDate(vehicle.created_at)}/>
            <SummaryRow icon="wrench" label="Lần bảo dưỡng gần nhất" value={lastServiceAt ? formatDate(lastServiceAt) : "Chưa có"}/>
            <SummaryRow icon="clock" label="Chu kỳ nhắc bảo dưỡng" value={`${SERVICE_INTERVAL_MONTHS} tháng`}/>
          </div>
        </aside>

        {/* CỘT PHẢI: tab */}
        <div className="flex min-w-0 flex-col">
          {/* Thanh tab cao 64px; chữ tab thẳng hàng với nội dung (lề 24px); chừa chỗ cho nút đóng bên phải. */}
          <div className="flex h-16 border-b border-cs-border pl-1 pr-16 sm:pl-2">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Chi tiết xe">
              {DETAIL_TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)}
                    className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 text-[15px] font-bold transition-colors ${active ? "border-cs-accent text-cs-accent-text" : "border-transparent text-cs-muted hover:text-cs-text"}`}>
                    <Icon name={item.icon} size={18}/>{item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 space-y-6 p-5 sm:p-6" role="tabpanel">
            {tab === "info" && <>
              <section>
                <DetailHeading icon="file">Thông số cơ bản</DetailHeading>
                <dl className="grid grid-cols-3 gap-3 max-[700px]:grid-cols-2 max-[480px]:grid-cols-1">
                  <SpecTile icon="tag" label="Hãng xe" value={vehicle.model?.brand?.name || "—"}/>
                  <SpecTile icon="car" label="Dòng xe" value={vehicle.model?.name || "—"}/>
                  <SpecTile icon="layers" label="Phiên bản" value={trim || "—"}/>
                  <SpecTile icon="calendar" label="Năm sản xuất" value={vehicle.year != null ? String(vehicle.year) : "—"}/>
                  <SpecTile icon="id-card" label="Biển số" value={vehicle.license_plate || <NoPlate/>} mono/>
                  <SpecTile icon="key" label="Số khung (VIN)" value={vehicle.vin || "—"} mono/>
                </dl>
              </section>

              <section className="border-t border-cs-border pt-5">
                <DetailHeading icon="settings">Bảo dưỡng</DetailHeading>
                <div className="space-y-3">{nextServiceBox}{maintenanceStats}</div>
              </section>

              <section className="border-t border-cs-border pt-5">
                <DetailHeading icon="clipboard" action={!editingNote && (
                  <button type="button" onClick={() => { setNoteDraft(vehicle.note ?? ""); setNoteError(""); setEditingNote(true); }} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold text-cs-accent-text hover:underline">
                    <Icon name="edit" size={15}/>{vehicle.note ? "Sửa ghi chú" : "Thêm ghi chú"}
                  </button>
                )}>Ghi chú</DetailHeading>
                {editingNote ? (
                  <div className="space-y-3">
                    <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} maxLength={1000} autoFocus disabled={savingNote}
                      placeholder="Ví dụ: Xe hay đi đường dài, lốp thay tháng 10/2026..."
                      className="w-full resize-y rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3 text-[14px] text-cs-text outline-none focus:border-cs-accent"/>
                    {noteError && <p className="text-[13px] text-cs-accent-text">{noteError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingNote(false)} disabled={savingNote}>Hủy</Button>
                      <Button variant="primary" size="sm" icon="check" loading={savingNote} loadingText="Đang lưu..." onClick={() => void saveNote()}>Lưu ghi chú</Button>
                    </div>
                  </div>
                ) : (
                  <p className={`min-h-[88px] whitespace-pre-line rounded-xl border border-cs-border px-4 py-3 text-[14px] ${vehicle.note ? "text-cs-text" : "text-cs-muted"}`}>{vehicle.note || "Chưa có ghi chú nào."}</p>
                )}
              </section>
            </>}

            {tab === "maintenance" && <>
              {nextServiceBox}
              {maintenanceStats}
              {activeOrder && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-cs-text">Xe đang được xử lý tại xưởng</p>
                    <p className="mt-0.5 text-[13px] text-cs-muted">Phiếu sửa chữa <span className="font-mono font-bold text-cs-text">{activeOrder.repair_order_code}</span> · tiếp nhận {formatDate(activeOrder.received_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge domain="repair" status={activeOrder.status} audience="customer"/>
                    <Link to="/repair-status" className={buttonClass({ variant: "secondary", size: "sm" })}>Xem tiến độ</Link>
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                <SpecTile icon="wrench" label="Lần bảo dưỡng gần nhất" value={lastServiceAt ? formatDate(lastServiceAt) : "Chưa có"}/>
                <SpecTile icon="calendar" label="Hạn bảo dưỡng tiếp theo" value={nextServiceAt ? formatDate(nextServiceAt) : "—"}/>
              </dl>
              <p className="flex items-start gap-2 text-[13px] text-cs-muted"><Icon name="info" size={15} className="mt-0.5 shrink-0"/>Hạn bảo dưỡng tiếp theo được gợi ý {SERVICE_INTERVAL_MONTHS} tháng sau lần bảo dưỡng gần nhất tại garage.</p>
            </>}

            {tab === "history" && <>
              <DetailHeading icon="history" action={orders.length > 0 && <Link to="/customer/service-history" className="text-[14px] font-bold text-cs-accent-text hover:underline">Xem trang lịch sử</Link>}>Lịch sử dịch vụ</DetailHeading>
              {sortedOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-[14px] text-cs-muted">Xe chưa có lịch sử sửa chữa tại garage.</p>
              ) : (
                <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">
                  {sortedOrders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="font-mono text-[14px] font-bold text-cs-text">{order.repair_order_code}</p>
                        <p className="text-[13px] text-cs-muted">
                          Tiếp nhận {formatDate(order.received_at)}
                          {order.mileage_received != null && ` · ${Number(order.mileage_received).toLocaleString("vi-VN")} km`}
                        </p>
                      </div>
                      <StatusBadge domain="repair" status={order.status} audience="customer"/>
                    </li>
                  ))}
                </ul>
              )}
            </>}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-cs-border px-5 py-4 sm:px-6">
            <Button variant="secondary" onClick={onClose}>Đóng</Button>
            <Button variant="secondary" icon="edit" onClick={onEdit}>Sửa thông tin</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default Cars;
