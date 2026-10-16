import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  deleteAdvisorVehicle,
  getAdvisorVehicles,
  type AdvisorVehicle,
} from "../../services/advisorVehicleService";

function CustomerCars() {
  const [cars, setCars] = useState<AdvisorVehicle[]>([]);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

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

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = async (car: AdvisorVehicle) => {
    const plate = car.license_plate || `#${car.id}`;

    if (!window.confirm(`Bạn có chắc muốn xóa xe ${plate}?`)) {
      return;
    }

    setDeletingId(car.id);
    setError("");

    try {
      await deleteAdvisorVehicle(car.id);
      await loadCars();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xóa xe.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
                GARA / XE KHÁCH HÀNG
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252B]">
                    Quản lý xe khách hàng
                  </h2>
                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Theo dõi thông tin xe thuộc khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      "Chưa thể thêm xe vì cần danh mục mẫu xe hợp lệ từ backend để chọn model_id.",
                    )
                  }
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  + Thêm xe
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG SỐ XE
                </p>
                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {total}
                </p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tổng số xe từ hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KẾT QUẢ
                </p>
                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {filteredCars.length}
                </p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xe hiển thị ở trang hiện tại
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  VAI TRÒ
                </p>
                <p className="mt-3 text-[14px] font-bold text-[#20252B]">
                  Cố vấn dịch vụ
                </p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Tìm kiếm xe
                </p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tìm theo biển số, số VIN hoặc thông tin phiên bản xe.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void loadCars();
                    }
                  }}
                  placeholder="Nhập biển số, VIN hoặc phiên bản..."
                  className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />

                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả hãng xe</option>
                  {brands.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void loadCars()}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Tìm kiếm
                </button>
              </div>

              {(search || brand) && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setBrand("");
                      setPage(1);
                    }}
                    className="text-[10px] font-semibold text-[#66717C] hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252B]">
                    Danh sách xe khách hàng
                  </p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Dữ liệu được tải từ hệ thống
                  </p>
                </div>
                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {total} xe
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
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
                          className="px-5 py-3 text-[9px] font-bold text-[#8A949E]"
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
                          className="px-5 py-14 text-center text-[12px] text-[#8A949E]"
                        >
                          Đang tải danh sách xe...
                        </td>
                      </tr>
                    ) : filteredCars.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-[12px] text-[#8A949E]"
                        >
                          Không tìm thấy xe phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCars.map((car, index) => {
                        const customerName =
                          car.customer?.full_name ||
                          car.customer?.name ||
                          "Chưa có thông tin";

                        const brandName =
                          car.model?.brand?.name || "Chưa xác định";

                        return (
                          <tr
                            key={car.id}
                            className="border-b border-[#EEF0F2] last:border-0 transition hover:bg-[#FAFAF9]"
                          >
                            <td className="px-5 py-4 text-[11px] text-[#66717C]">
                              {(page - 1) * 10 + index + 1}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-bold text-[#20252B]">
                                {car.license_plate || "Chưa có biển số"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[11px] font-semibold text-[#20252B]">
                                {customerName}
                              </p>
                              <p className="mt-1 text-[9px] text-[#8A949E]">
                                {car.customer?.phone || car.customer?.email || "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-[11px] font-semibold text-[#20252B]">
                                {brandName}
                              </p>
                              <p className="mt-1 text-[9px] text-[#8A949E]">
                                {car.model?.name || car.variant || "Chưa xác định"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-[11px] text-[#66717C]">
                              {car.year || "—"}
                            </td>

                            <td className="px-5 py-4 text-[11px] text-[#66717C]">
                              {car.mileage != null
                                ? `${car.mileage.toLocaleString("vi-VN")} km`
                                : "—"}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <Link
                                  to="/advisor/appointments"
                                  className="inline-flex rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                                >
                                  Lịch hẹn
                                </Link>

                                <button
                                  type="button"
                                  disabled={deletingId === car.id}
                                  onClick={() => void handleDelete(car)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === car.id ? "Đang xóa..." : "Xóa"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-[#EEF0F2] px-5 py-4">
                  <p className="text-[10px] text-[#8A949E]">
                    Trang {page} / {lastPage}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                      className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-[10px] font-semibold disabled:opacity-40"
                    >
                      Trang trước
                    </button>
                    <button
                      type="button"
                      disabled={page >= lastPage}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-[10px] font-semibold disabled:opacity-40"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CustomerCars;
