import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type ServiceStatus = "ACTIVE" | "INACTIVE";

type Service = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  base_price: string;
  estimated_minutes: number | null;
  status: ServiceStatus;
};

type ServiceForm = {
  name: string;
  category: string;
  description: string;
  base_price: string;
  estimated_minutes: string;
  status: ServiceStatus;
};

type ServiceIndexResponse = {
  data: {
    data: Service[];
    current_page: number;
    last_page: number;
    total: number;
  };
};

type ServiceResponse = {
  data: Service;
};

const emptyForm: ServiceForm = {
  name: "",
  category: "",
  description: "",
  base_price: "",
  estimated_minutes: "",
  status: "ACTIVE",
};

const fieldClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1F2933]";

function formatPrice(price: string): string {
  return `${new Intl.NumberFormat("vi-VN").format(Number(price))} đ`;
}

function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", category: "", status: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"form" | "detail" | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page) });
    if (filters.search) query.set("search", filters.search);
    if (filters.category) query.set("category", filters.category);
    if (filters.status) query.set("status", filters.status);

    setIsLoading(true);
    setError("");
    fetchApi(`/admin/services?${query.toString()}`)
      .then((response: ServiceIndexResponse) => {
        if (!active) return;
        setServices(response.data.data);
        setPage(response.data.current_page);
        setLastPage(response.data.last_page);
        setTotal(response.data.total);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh sách dịch vụ.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, reloadKey]);

  const openCreateModal = () => {
    setSelectedService(null);
    setForm(emptyForm);
    setFormError("");
    setModal("form");
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setForm({
      name: service.name,
      category: service.category ?? "",
      description: service.description ?? "",
      base_price: service.base_price,
      estimated_minutes: service.estimated_minutes?.toString() ?? "",
      status: service.status,
    });
    setFormError("");
    setModal("form");
  };

  const openDetailModal = async (service: Service) => {
    try {
      const response: ServiceResponse = await fetchApi(
        `/admin/services/${service.id}`,
      );
      setSelectedService(response.data);
      setModal("detail");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thông tin dịch vụ.",
      );
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({ ...current, search: searchInput.trim() }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      base_price: Number(form.base_price),
      estimated_minutes: form.estimated_minutes
        ? Number(form.estimated_minutes)
        : null,
      status: form.status,
    };

    try {
      await fetchApi(
        selectedService
          ? `/admin/services/${selectedService.id}`
          : "/admin/services",
        {
          method: selectedService ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setModal(null);
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu dịch vụ.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!window.confirm(`Ẩn dịch vụ "${service.name}"?`)) return;

    setError("");
    try {
      await fetchApi(`/admin/services/${service.id}`, { method: "DELETE" });
      if (services.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể ẩn dịch vụ.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />
      <div className="lg:ml-[250px]">
        <AdminTopbar />
        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN
              </p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                    AD
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Quản lý dịch vụ
                    </h1>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Thêm, cập nhật và quản lý trạng thái dịch vụ.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Thêm dịch vụ
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Link
                to="/admin"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <p className="text-xs font-semibold">Tài khoản & nhân viên</p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Quản lý tài khoản
                </p>
              </Link>
              <Link
                to="/admin/inventory"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <p className="text-xs font-semibold">Phụ tùng & tồn kho</p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Quản lý kho
                </p>
              </Link>
              <Link
                to="/admin/reports"
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:bg-[#F7F7F5]"
              >
                <p className="text-xs font-semibold">Báo cáo & thống kê</p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Theo dõi số liệu
                </p>
              </Link>
            </div>

            <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <form
                onSubmit={handleSearch}
                className="grid gap-3 md:grid-cols-4"
              >
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  type="search"
                  placeholder="Tên dịch vụ..."
                  className={fieldClass}
                />
                <input
                  value={filters.category}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }));
                  }}
                  type="text"
                  placeholder="Danh mục..."
                  className={fieldClass}
                />
                <select
                  value={filters.status}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Tìm kiếm
                </button>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-2 border-b border-[#EEF0F2] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    SERVICE MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Danh sách dịch vụ
                  </h2>
                </div>
                <p className="text-[10px] text-[#8A949E]">
                  {total} kết quả
                </p>
              </div>

              {error && (
                <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </p>
              )}

              {isLoading ? (
                <p className="p-8 text-center text-sm text-[#66717C]">
                  Đang tải dịch vụ...
                </p>
              ) : services.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#66717C]">
                  Không tìm thấy dịch vụ phù hợp.
                </p>
              ) : (
                <div className="space-y-3 p-5">
                  {services.map((service, index) => (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-5 transition hover:border-[#D5D9DC]"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-white">
                            {String((page - 1) * 10 + index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold">
                                {service.name}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                  service.status === "ACTIVE"
                                    ? "bg-[#F3E8D2] text-[#3A3020]"
                                    : "bg-[#F3F4F2] text-[#66717C]"
                                }`}
                              >
                                {service.status === "ACTIVE"
                                  ? "Đang hoạt động"
                                  : "Ngừng hoạt động"}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-[#8A949E]">
                              DV-{String(service.id).padStart(3, "0")}
                              {service.category ? ` · ${service.category}` : ""}
                            </p>
                            <p className="mt-2 max-w-md text-xs leading-5 text-[#66717C]">
                              {service.description || "Chưa có mô tả."}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              GIÁ THAM KHẢO
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {formatPrice(service.base_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              THỜI GIAN
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {service.estimated_minutes
                                ? `${service.estimated_minutes} phút`
                                : "Chưa xác định"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              MÃ DỊCH VỤ
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              DV-{String(service.id).padStart(3, "0")}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(service)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold hover:bg-[#F3F4F2]"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(service)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold hover:bg-[#F3F4F2]"
                          >
                            Chỉnh sửa
                          </button>
                          {service.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(service)}
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              Ẩn dịch vụ
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[#EEF0F2] px-5 py-4">
                <span className="text-xs text-[#66717C]">
                  Trang {page} / {lastPage}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= lastPage || isLoading}
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                    className="rounded-lg border border-[#D9DDE1] px-3 py-2 text-xs disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-modal-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
          >
            {modal === "form" ? (
              <>
                <h2 id="service-modal-title" className="mb-5 text-xl font-bold">
                  {selectedService ? "Cập nhật dịch vụ" : "Thêm dịch vụ"}
                </h2>
                <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                  <label className="block text-xs font-semibold">
                    Tên dịch vụ *
                    <input
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Danh mục
                    <input
                      maxLength={100}
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Mô tả
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${fieldClass} mt-2 font-normal`}
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold">
                      Giá tham khảo *
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={form.base_price}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            base_price: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      Thời gian (phút)
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.estimated_minutes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            estimated_minutes: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      Trạng thái
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status:
                              event.target.value === "INACTIVE"
                                ? "INACTIVE"
                                : "ACTIVE",
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      >
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Ngừng hoạt động</option>
                      </select>
                    </label>
                  </div>
                  {formError && (
                    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      {formError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      disabled={isSaving}
                      className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-xs font-semibold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {isSaving ? "Đang lưu..." : "Lưu dịch vụ"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 id="service-modal-title" className="mb-5 text-xl font-bold">
                  Chi tiết dịch vụ
                </h2>
                {selectedService && (
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-xs text-[#8A949E]">Tên dịch vụ</dt>
                      <dd className="mt-1 font-semibold">{selectedService.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#8A949E]">Danh mục</dt>
                      <dd className="mt-1">{selectedService.category || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#8A949E]">Mô tả</dt>
                      <dd className="mt-1">{selectedService.description || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#8A949E]">Giá / thời gian</dt>
                      <dd className="mt-1">
                        {formatPrice(selectedService.base_price)} ·{" "}
                        {selectedService.estimated_minutes
                          ? `${selectedService.estimated_minutes} phút`
                          : "Chưa xác định"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#8A949E]">Trạng thái</dt>
                      <dd className="mt-1">
                        {selectedService.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Ngừng hoạt động"}
                      </dd>
                    </div>
                  </dl>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Services;
