import { Button, IconButton, KmInput, PageHeader, Modal } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdvisorVehicle,
  deleteAdvisorVehicle,
  getAdvisorVehicles,
  updateAdvisorVehicle,
  type AdvisorVehicle,
  type AdvisorVehicleInput,
} from "../../services/advisorVehicleService";
import {
  getAdvisorCustomers,
  type AdvisorCustomer,
} from "../../services/customerApi";

type VehicleForm = {
  customer_id: string;
  model_id: string;
  license_plate: string;
  variant: string;
  year: string;
  mileage: string;
  vin: string;
  note: string;
};

const emptyForm: VehicleForm = {
  customer_id: "",
  model_id: "",
  license_plate: "",
  variant: "",
  year: "",
  mileage: "",
  vin: "",
  note: "",
};

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

function CustomerCars() {
  const { confirm } = useAppFeedback();
  const [cars, setCars] = useState<AdvisorVehicle[]>([]);
  const [customers, setCustomers] = useState<AdvisorCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<AdvisorVehicle | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const loadCars = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdvisorVehicles({ search, page });
      setCars(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách xe khách hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await getAdvisorCustomers({ page: 1 });
      setCustomers(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách khách hàng.",
      );
    }
  }, []);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          cars
            .map((car) => car.model?.brand?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    [cars],
  );

  const filteredCars = useMemo(
    () =>
      cars.filter((car) => {
        const carBrand = car.model?.brand?.name ?? "";
        return !brand || carBrand === brand;
      }),
    [cars, brand],
  );

  const openCreateModal = () => {
    setEditingCar(null);
    setForm(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (car: AdvisorVehicle) => {
    setEditingCar(car);
    setForm({
      customer_id: String(car.customer_id),
      model_id: String(car.model_id),
      license_plate: car.license_plate ?? "",
      variant: car.variant ?? "",
      year: car.year != null ? String(car.year) : "",
      mileage: car.mileage != null ? String(car.mileage) : "",
      vin: car.vin ?? "",
      note: car.note ?? "",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingCar(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalError("");

    const customerId = Number(form.customer_id);
    const modelId = Number(form.model_id);
    const year = form.year.trim() ? Number(form.year) : null;
    const mileage = form.mileage.trim() ? Number(form.mileage) : null;

    if (!customerId || !modelId) {
      setModalError("Vui lòng chọn khách hàng và nhập model ID hợp lệ.");
      return;
    }

    if (
      (year !== null &&
        (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) ||
      (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
    ) {
      setModalError("Năm sản xuất hoặc số km không hợp lệ.");
      return;
    }

    const data: AdvisorVehicleInput = {
      customer_id: customerId,
      model_id: modelId,
      license_plate: form.license_plate.trim() || null,
      variant: form.variant.trim() || null,
      year,
      mileage,
      vin: form.vin.trim() || null,
      note: form.note.trim() || null,
    };

    setSaving(true);

    try {
      if (editingCar) {
        await updateAdvisorVehicle(editingCar.id, data);
      } else {
        await createAdvisorVehicle(data);
      }

      setIsModalOpen(false);
      setEditingCar(null);
      setForm(emptyForm);
      await loadCars();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Không thể lưu thông tin xe.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (car: AdvisorVehicle) => {
    const plate = car.license_plate || `#${car.id}`;

    if (!await confirm({ title: "Xác nhận xóa xe", description: `Bạn có chắc muốn xóa xe biển số ${plate}? Hãy đảm bảo xe không có lịch hẹn đang xử lý.`, variant: "danger", confirmText: "Xóa xe" })) return;

    setDeletingId(car.id);
    setError("");

    try {
      await deleteAdvisorVehicle(car.id);

      if (cars.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadCars();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa xe.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cs-bg text-[#20252B]">

      <div className="lg:ml-[250px]">

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <PageHeader title="Xe khách hàng" description="Theo dõi và cập nhật thông tin xe thuộc khách hàng tại gara."
              actions={<Button variant="primary" icon="plus" onClick={openCreateModal}>Thêm xe</Button>}/>
            

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  TỔNG SỐ XE
                </p>
                <p className="mt-3 text-[24px] font-bold">{total}</p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Tổng số xe từ hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  KẾT QUẢ
                </p>
                <p className="mt-3 text-[24px] font-bold">
                  {filteredCars.length}
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Xe ở trang hiện tại
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  VAI TRÒ
                </p>
                <p className="mt-3 text-[14px] font-bold">Cố vấn dịch vụ</p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="mb-5">
                <p className="text-[13px] font-semibold">Tìm kiếm xe</p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Tìm theo biển số, VIN hoặc phiên bản xe.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void loadCars();
                  }}
                  placeholder="Nhập biển số, VIN hoặc phiên bản..."
                  className={inputClass}
                />

                <select
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả hãng xe</option>
                  {brands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <Button variant="outline" icon="search" onClick={() => void loadCars()}>Tìm kiếm</Button>
              </div>

              {(search || brand) && (
                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="ghost" icon="x" onClick={() => {
                      setSearch("");
                      setBrand("");
                      setPage(1);
                    }}>Xóa bộ lọc</Button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold">
                    Danh sách xe khách hàng
                  </p>
                  <p className="mt-1 text-[11px] text-cs-muted">
                    Dữ liệu được tải từ hệ thống
                  </p>
                </div>
                <p className="w-fit rounded-lg bg-cs-surface-2 px-3 py-1.5 text-[11px] font-semibold text-cs-muted">
                  {total} xe
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-cs-bg text-left">
                      {[
                        "STT",
                        "BIỂN SỐ",
                        "KHÁCH HÀNG",
                        "HÃNG / MẪU XE",
                        "NĂM SX",
                        "SỐ KM",
                        "THAO TÁC",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-[11px] font-bold text-cs-muted"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-[13px] text-cs-muted"
                        >
                          Đang tải danh sách xe...
                        </td>
                      </tr>
                    ) : filteredCars.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-[13px] text-cs-muted"
                        >
                          Không tìm thấy xe phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCars.map((car, index) => (
                        <tr
                          key={car.id}
                          className="border-b border-[#EEF0F2] last:border-0 hover:bg-transparent cs-readable-row"
                        >
                          <td className="px-5 py-4 text-[12px] text-cs-muted">
                            {(page - 1) * 10 + index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-cs-surface-2 px-3 py-1.5 text-[11px] font-bold">
                              {car.license_plate || "Chưa có biển số"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-[12px] font-semibold">
                              {car.customer?.full_name ||
                                car.customer?.name ||
                                "Chưa có thông tin"}
                            </p>
                            <p className="mt-1 text-[11px] text-cs-muted">
                              {car.customer?.phone || car.customer?.email || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-[12px] font-semibold">
                              {car.model?.brand?.name || "Chưa xác định"}
                            </p>
                            <p className="mt-1 text-[11px] text-cs-muted">
                              {car.model?.name || car.variant || "Chưa xác định"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-[12px] text-cs-muted">
                            {car.year || "—"}
                          </td>

                          <td className="px-5 py-4 text-[12px] text-cs-muted">
                            {car.mileage != null
                              ? `${car.mileage.toLocaleString("vi-VN")} km`
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/advisor/appointments"
                                className="inline-flex rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[11px] font-semibold text-[#374151] hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                              >
                                Lịch hẹn
                              </Link>

                              <IconButton icon="edit" label="Sửa xe" onClick={() => openEditModal(car)}/>

                              <IconButton icon="trash" tone="danger" label="Xóa xe" loading={deletingId === car.id} onClick={() => void handleDelete(car)}/>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-[#EEF0F2] px-5 py-4">
                  <p className="text-[11px] text-cs-muted">
                    Trang {page} / {lastPage}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" icon="chevron-left" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trang trước</Button>
                    <Button size="sm" variant="outline" iconRight="chevron-right" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Trang sau</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <Modal bare open onClose={closeModal} dismissible={!saving} title={editingCar ? "Cập nhật thông tin xe" : "Thêm xe khách hàng"} className="my-auto w-full max-w-2xl rounded-2xl bg-cs-surface shadow-overlay">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <h3 className="text-lg font-bold">
                  {editingCar ? "Cập nhật thông tin xe" : "Thêm xe khách hàng"}
                </h3>
                <p className="mt-1 text-xs text-cs-muted">
                  Nhập thông tin theo dữ liệu hợp lệ trong hệ thống.
                </p>
              </div>
              <IconButton icon="close" label="Đóng" disabled={saving} onClick={closeModal}/>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {modalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Khách hàng *
                  <select
                    required
                    value={form.customer_id}
                    onChange={(event) =>
                      setForm({ ...form, customer_id: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                  >
                    <option value="">Chọn khách hàng</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} - {customer.phone}
                      </option>
                    ))}
                    {editingCar &&
                      !customers.some(
                        (customer) => customer.id === editingCar.customer_id,
                      ) && (
                        <option value={editingCar.customer_id}>
                          {editingCar.customer?.full_name ||
                            editingCar.customer?.name ||
                            `Khách hàng #${editingCar.customer_id}`}
                        </option>
                      )}
                  </select>
                </label>

                <label className="block text-xs font-semibold">
                  Model ID *
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.model_id}
                    onChange={(event) =>
                      setForm({ ...form, model_id: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập ID mẫu xe hợp lệ"
                  />
                  <span className="mt-1 block font-normal text-cs-muted">
                    {editingCar
                      ? `Mẫu xe hiện tại: ${editingCar.model?.name || `#${editingCar.model_id}`}`
                      : "Dùng ID mẫu xe đã có trong database."}
                  </span>
                </label>

                <label className="block text-xs font-semibold">
                  Biển số
                  <input
                    value={form.license_plate}
                    onChange={(event) =>
                      setForm({ ...form, license_plate: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="30A-123.45"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Phiên bản xe
                  <input
                    value={form.variant}
                    onChange={(event) =>
                      setForm({ ...form, variant: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Ví dụ: 1.5G"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Năm sản xuất
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(event) =>
                      setForm({ ...form, year: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="2024"
                  />
                </label>

                <div className="block text-xs font-semibold">
                  Số km hiện tại
                  <KmInput label="Số km hiện tại" value={form.mileage} onChange={(mileage) => setForm({ ...form, mileage })}
                    placeholder="Ví dụ: 15.000" className="mt-2 w-full"/>
                </div>

                <label className="block text-xs font-semibold sm:col-span-2">
                  Số VIN
                  <input
                    value={form.vin}
                    onChange={(event) =>
                      setForm({ ...form, vin: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Nhập số VIN nếu có"
                  />
                </label>

                <label className="block text-xs font-semibold sm:col-span-2">
                  Ghi chú
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Thông tin bổ sung về xe..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#EEF0F2] pt-5">
                <Button variant="secondary" disabled={saving} onClick={closeModal}>Hủy</Button>
                <Button type="submit" variant="primary" icon={editingCar ? "check" : "plus"} loading={saving} loadingText="Đang lưu...">{editingCar ? "Lưu thay đổi" : "Thêm xe"}</Button>
              </div>
            </form>
          </Modal>
      )}
    </div>
  );
}

export default CustomerCars;
