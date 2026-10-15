import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { fetchApi } from "../../services/api";

type PackageStatus = "ACTIVE" | "INACTIVE";

type PackageService = {
  id: number;
  name: string;
  base_price: string | number;
  pivot?: { quantity: number };
};

type PackagePart = {
  id: number;
  sku: string;
  name: string;
  sell_price: string | number;
  pivot?: { quantity: number };
};

type VehicleModelRef = {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
};

type MaintenancePackage = {
  id: number;
  vehicle_model_id: number | null;
  name: string;
  mileage_milestone: number | null;
  month_milestone: number | null;
  description: string | null;
  status: PackageStatus;
  price: number;
  estimated_price: number;
  vehicle_model: VehicleModelRef | null;
  services: PackageService[];
  parts: PackagePart[];
};

type PackageServiceRef = {
  id: number;
  name: string;
  category: string | null;
  base_price: string | number;
};

type PackagePartRef = {
  id: number;
  sku: string;
  name: string;
  sell_price: string | number;
};

type PackageIndexResponse = {
  data: {
    data: MaintenancePackage[];
    current_page: number;
    last_page: number;
    total: number;
  };
};

type PackageResponse = {
  data: MaintenancePackage;
};

type SelectedService = { service_id: number; quantity: number };
type SelectedPart = { part_id: number; quantity: number };

type PackageForm = {
  name: string;
  vehicle_model_id: string;
  mileage_milestone: string;
  month_milestone: string;
  description: string;
  status: PackageStatus;
  services: SelectedService[];
  parts: SelectedPart[];
};

const emptyForm: PackageForm = {
  name: "",
  vehicle_model_id: "",
  mileage_milestone: "",
  month_milestone: "",
  description: "",
  status: "ACTIVE",
  services: [],
  parts: [],
};

const fieldClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1F2933]";

function formatPrice(value: number | string): string {
  const price = Number(value);

  if (!Number.isFinite(price)) return "Chưa có giá";

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(price)} đ`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeServiceList(response: unknown): PackageServiceRef[] {
  if (Array.isArray(response)) {
    return response as PackageServiceRef[];
  }

  if (response && typeof response === "object" && "data" in response) {
    const data = response.data;

    if (Array.isArray(data)) {
      return data as PackageServiceRef[];
    }

    if (data && typeof data === "object" && "data" in data) {
      const nestedData = data.data;

      if (Array.isArray(nestedData)) {
        return nestedData as PackageServiceRef[];
      }
    }
  }

  throw new Error("Dữ liệu danh sách dịch vụ không hợp lệ.");
}

function modelLabel(model: VehicleModelRef | null): string {
  if (!model) return "Dùng chung";
  return model.brand ? `${model.brand.name} ${model.name}` : model.name;
}

function collectVehicleModels(
  packages: MaintenancePackage[],
): VehicleModelRef[] {
  const seen = new Map<number, VehicleModelRef>();

  packages.forEach((pkg) => {
    if (pkg.vehicle_model) {
      seen.set(pkg.vehicle_model.id, pkg.vehicle_model);
    }
  });

  return Array.from(seen.values()).sort((a, b) =>
    modelLabel(a).localeCompare(modelLabel(b), "vi"),
  );
}

function collectParts(packages: MaintenancePackage[]): PackagePartRef[] {
  const seen = new Map<number, PackagePartRef>();

  packages.forEach((pkg) => {
    (pkg.parts ?? []).forEach((part) => {
      seen.set(part.id, {
        id: part.id,
        sku: part.sku,
        name: part.name,
        sell_price: part.sell_price,
      });
    });
  });

  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );
}

function withServiceToggled(form: PackageForm, serviceId: number): PackageForm {
  const exists = form.services.some((item) => item.service_id === serviceId);

  return {
    ...form,
    services: exists
      ? form.services.filter((item) => item.service_id !== serviceId)
      : [...form.services, { service_id: serviceId, quantity: 1 }],
  };
}

function withServiceQuantity(
  form: PackageForm,
  serviceId: number,
  quantity: number,
): PackageForm {
  return {
    ...form,
    services: form.services.map((item) =>
      item.service_id === serviceId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item,
    ),
  };
}

function withPartToggled(form: PackageForm, partId: number): PackageForm {
  const exists = form.parts.some((item) => item.part_id === partId);

  return {
    ...form,
    parts: exists
      ? form.parts.filter((item) => item.part_id !== partId)
      : [...form.parts, { part_id: partId, quantity: 1 }],
  };
}

function withPartQuantity(
  form: PackageForm,
  partId: number,
  quantity: number,
): PackageForm {
  return {
    ...form,
    parts: form.parts.map((item) =>
      item.part_id === partId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item,
    ),
  };
}

function MaintenancePackages() {
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    vehicle_model_id: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"form" | "detail" | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<MaintenancePackage | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [formError, setFormError] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [models, setModels] = useState<VehicleModelRef[]>([]);
  const [services, setServices] = useState<PackageServiceRef[]>([]);
  const [parts, setParts] = useState<PackagePartRef[]>([]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setIsLoadingCatalog(true);

      try {
        const [serviceResponse, firstPageResponse] = await Promise.all([
          fetchApi("/services"),
          fetchApi("/admin/maintenance-packages?page=1"),
        ]);

        const serviceList = normalizeServiceList(serviceResponse);
        const firstPage = firstPageResponse as PackageIndexResponse;

        if (
          !Array.isArray(firstPage?.data?.data) ||
          !Number.isFinite(firstPage.data.last_page)
        ) {
          throw new Error("Dữ liệu gói bảo dưỡng không hợp lệ.");
        }

        const allPackages = [...firstPage.data.data];

        for (
          let currentPage = 2;
          currentPage <= firstPage.data.last_page;
          currentPage += 1
        ) {
          const response = (await fetchApi(
            `/admin/maintenance-packages?page=${currentPage}`,
          )) as PackageIndexResponse;

          if (!Array.isArray(response?.data?.data)) {
            throw new Error("Không thể tải đầy đủ danh sách gói bảo dưỡng.");
          }

          allPackages.push(...response.data.data);
        }

        if (!active) return;

        setServices(serviceList);
        setModels(collectVehicleModels(allPackages));
        setParts(collectParts(allPackages));
        setPackages(firstPage.data.data);
        setPage(firstPage.data.current_page);
        setLastPage(Math.max(1, firstPage.data.last_page));
        setTotal(firstPage.data.total);
      } catch (requestError: unknown) {
        if (active) {
          setError(
            getErrorMessage(
              requestError,
              "Không thể tải danh mục dịch vụ và gói bảo dưỡng.",
            ),
          );
        }
      } finally {
        if (active) {
          setIsLoadingCatalog(false);
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const query = new URLSearchParams({ page: String(page) });

    if (filters.search) query.set("search", filters.search);
    if (filters.status) query.set("status", filters.status);
    if (filters.vehicle_model_id) {
      query.set("vehicle_model_id", filters.vehicle_model_id);
    }

    setIsLoading(true);
    setError("");

    fetchApi(`/admin/maintenance-packages?${query.toString()}`)
      .then((response: PackageIndexResponse) => {
        if (!active) return;

        if (
          !Array.isArray(response?.data?.data) ||
          !Number.isFinite(response.data.current_page) ||
          !Number.isFinite(response.data.last_page) ||
          !Number.isFinite(response.data.total)
        ) {
          throw new Error("Dữ liệu danh sách gói bảo dưỡng không hợp lệ.");
        }

        setPackages(response.data.data);
        setLastPage(Math.max(1, response.data.last_page));
        setTotal(response.data.total);

        if (response.data.current_page !== page) {
          setPage(response.data.current_page);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setPackages([]);
          setError(
            getErrorMessage(
              requestError,
              "Không thể tải danh sách gói bảo dưỡng.",
            ),
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

  const filteredServices = useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase();

    if (!keyword) return services;

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(keyword) ||
        (service.category ?? "").toLowerCase().includes(keyword),
    );
  }, [services, serviceSearch]);

  const filteredParts = useMemo(() => {
    const keyword = partSearch.trim().toLowerCase();

    if (!keyword) return parts;

    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(keyword) ||
        part.sku.toLowerCase().includes(keyword),
    );
  }, [parts, partSearch]);

  const openCreateModal = () => {
    setSelectedPackage(null);
    setForm(emptyForm);
    setServiceSearch("");
    setPartSearch("");
    setFormError("");
    setModal("form");
  };

  const openEditModal = (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setForm({
      name: pkg.name,
      vehicle_model_id: pkg.vehicle_model_id?.toString() ?? "",
      mileage_milestone: pkg.mileage_milestone?.toString() ?? "",
      month_milestone: pkg.month_milestone?.toString() ?? "",
      description: pkg.description ?? "",
      status: pkg.status,
      services: (pkg.services ?? []).map((service) => ({
        service_id: service.id,
        quantity: Math.max(1, service.pivot?.quantity ?? 1),
      })),
      parts: (pkg.parts ?? []).map((part) => ({
        part_id: part.id,
        quantity: Math.max(1, part.pivot?.quantity ?? 1),
      })),
    });
    setServiceSearch("");
    setPartSearch("");
    setFormError("");
    setModal("form");
  };

  const openDetailModal = async (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setIsLoadingDetail(true);
    setError("");
    setModal("detail");

    try {
      const response: PackageResponse = await fetchApi(
        `/admin/maintenance-packages/${pkg.id}`,
      );

      if (!response?.data || response.data.id !== pkg.id) {
        throw new Error("Dữ liệu chi tiết gói bảo dưỡng không hợp lệ.");
      }

      setSelectedPackage(response.data);
    } catch (requestError: unknown) {
      setModal(null);
      setError(
        getErrorMessage(
          requestError,
          "Không thể tải thông tin gói bảo dưỡng.",
        ),
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }));
  };

  const toggleService = (serviceId: number) =>
    setForm((current) => withServiceToggled(current, serviceId));

  const setServiceQuantity = (serviceId: number, quantity: number) =>
    setForm((current) => withServiceQuantity(current, serviceId, quantity));

  const togglePart = (partId: number) =>
    setForm((current) => withPartToggled(current, partId));

  const setPartQuantity = (partId: number, quantity: number) =>
    setForm((current) => withPartQuantity(current, partId, quantity));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    const mileage = form.mileage_milestone.trim()
      ? Number(form.mileage_milestone)
      : null;
    const months = form.month_milestone.trim()
      ? Number(form.month_milestone)
      : null;

    if (!name) {
      setFormError("Vui lòng nhập tên gói bảo dưỡng.");
      return;
    }

    if (name.length > 150) {
      setFormError("Tên gói bảo dưỡng không được vượt quá 150 ký tự.");
      return;
    }

    if (
      mileage !== null &&
      (!Number.isInteger(mileage) || mileage < 1)
    ) {
      setFormError("Mốc số km phải là số nguyên lớn hơn 0.");
      return;
    }

    if (months !== null && (!Number.isInteger(months) || months < 1)) {
      setFormError("Mốc tháng phải là số nguyên lớn hơn 0.");
      return;
    }

    if (form.services.some((item) => item.quantity < 1)) {
      setFormError("Số lượng dịch vụ phải lớn hơn 0.");
      return;
    }

    if (form.parts.some((item) => item.quantity < 1)) {
      setFormError("Số lượng phụ tùng phải lớn hơn 0.");
      return;
    }

    const payload = {
      name,
      vehicle_model_id: form.vehicle_model_id
        ? Number(form.vehicle_model_id)
        : null,
      mileage_milestone: mileage,
      month_milestone: months,
      description: form.description.trim() || null,
      status: form.status,
      services: form.services,
      parts: form.parts,
    };

    setIsSaving(true);

    try {
      await fetchApi(
        selectedPackage
          ? `/admin/maintenance-packages/${selectedPackage.id}`
          : "/admin/maintenance-packages",
        {
          method: selectedPackage ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      setModal(null);
      setSelectedPackage(null);
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (requestError: unknown) {
      setFormError(
        getErrorMessage(
          requestError,
          "Không thể lưu gói bảo dưỡng.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pkg: MaintenancePackage) => {
    if (!window.confirm(`Ẩn gói bảo dưỡng "${pkg.name}"?`)) return;

    setError("");

    try {
      await fetchApi(`/admin/maintenance-packages/${pkg.id}`, {
        method: "DELETE",
      });

      if (packages.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Không thể ẩn gói bảo dưỡng.",
        ),
      );
    }
  };

  const selectedServiceCount = form.services.length;
  const selectedPartCount = form.parts.length;

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
                    GB
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Gói bảo dưỡng
                    </h1>
                    <p className="mt-1 text-xs text-[#66717C]">
                      Quản lý gói bảo dưỡng, dịch vụ và phụ tùng đi kèm.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  disabled={isLoadingCatalog}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Thêm gói bảo dưỡng
                </button>
              </div>
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
                  placeholder="Tên gói bảo dưỡng..."
                  className={fieldClass}
                />
                <select
                  value={filters.vehicle_model_id}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((current) => ({
                      ...current,
                      vehicle_model_id: event.target.value,
                    }));
                  }}
                  className={fieldClass}
                >
                  <option value="">Tất cả dòng xe</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {modelLabel(model)}
                    </option>
                  ))}
                </select>
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
                    MAINTENANCE PACKAGES
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    Danh sách gói bảo dưỡng
                  </h2>
                </div>
                <p className="text-[10px] text-[#8A949E]">
                  {total} kết quả
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              {isLoading ? (
                <p className="p-8 text-center text-sm text-[#66717C]">
                  Đang tải gói bảo dưỡng...
                </p>
              ) : packages.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#66717C]">
                  Không tìm thấy gói bảo dưỡng phù hợp.
                </p>
              ) : (
                <div className="space-y-3 p-5">
                  {packages.map((pkg, index) => (
                    <article
                      key={pkg.id}
                      className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF8] p-5 transition hover:border-[#D5D9DC]"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-white">
                            {String((page - 1) * 10 + index + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold">{pkg.name}</h3>
                              <span
                                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                  pkg.status === "ACTIVE"
                                    ? "bg-[#F3E8D2] text-[#3A3020]"
                                    : "bg-[#F3F4F2] text-[#66717C]"
                                }`}
                              >
                                {pkg.status === "ACTIVE"
                                  ? "Đang hoạt động"
                                  : "Ngừng hoạt động"}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-[#8A949E]">
                              GB-{String(pkg.id).padStart(3, "0")} ·{" "}
                              {modelLabel(pkg.vehicle_model)}
                            </p>
                            <p className="mt-2 max-w-md text-xs leading-5 text-[#66717C]">
                              {pkg.description || "Chưa có mô tả."}
                            </p>
                            <p className="mt-2 text-[10px] text-[#8A949E]">
                              {(pkg.services ?? []).length} dịch vụ ·{" "}
                              {(pkg.parts ?? []).length} phụ tùng
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              GIÁ ƯỚC TÍNH
                            </p>
                            <p className="mt-1 text-xs font-bold">
                              {formatPrice(pkg.price ?? pkg.estimated_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              SỐ KM
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {pkg.mileage_milestone
                                ? `${new Intl.NumberFormat("vi-VN").format(pkg.mileage_milestone)} km`
                                : "Theo tháng"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8A949E]">
                              ĐỊNH KỲ
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {pkg.month_milestone
                                ? `${pkg.month_milestone} tháng`
                                : "Không xác định"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(pkg)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold hover:bg-[#F3F4F2]"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(pkg)}
                            className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-2 text-[10px] font-semibold hover:bg-[#F3F4F2]"
                          >
                            Chỉnh sửa
                          </button>
                          {pkg.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(pkg)}
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              Ẩn gói
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
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
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

            <div className="mt-6">
              <Link
                to="/admin/services"
                className="text-xs font-semibold text-[#66717C] transition hover:text-[#20252B]"
              >
                ← Quản lý danh mục dịch vụ
              </Link>
            </div>
          </div>
        </main>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setModal(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-modal-title"
            className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"
          >
            {modal === "form" ? (
              <>
                <h2 id="package-modal-title" className="mb-5 text-xl font-bold">
                  {selectedPackage
                    ? "Cập nhật gói bảo dưỡng"
                    : "Thêm gói bảo dưỡng"}
                </h2>
                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold">
                      Tên gói *
                      <input
                        required
                        maxLength={150}
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      Dòng xe
                      <select
                        value={form.vehicle_model_id}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            vehicle_model_id: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      >
                        <option value="">Dùng chung cho mọi dòng xe</option>
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {modelLabel(model)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold">
                      Mốc km
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.mileage_milestone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            mileage_milestone: event.target.value,
                          }))
                        }
                        className={`${fieldClass} mt-2 font-normal`}
                      />
                    </label>
                    <label className="block text-xs font-semibold">
                      Mốc tháng
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={form.month_milestone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            month_milestone: event.target.value,
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

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#E1E4E6] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold">
                          Dịch vụ ({selectedServiceCount})
                        </p>
                        <input
                          value={serviceSearch}
                          onChange={(event) =>
                            setServiceSearch(event.target.value)
                          }
                          placeholder="Tìm dịch vụ..."
                          className="w-40 rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[11px] outline-none focus:border-[#1F2933]"
                        />
                      </div>
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {filteredServices.map((service) => {
                          const selected = form.services.find(
                            (item) => item.service_id === service.id,
                          );

                          return (
                            <div
                              key={service.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-[#FAFAF8] px-3 py-2"
                            >
                              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selected)}
                                  onChange={() => toggleService(service.id)}
                                />
                                <span className="min-w-0 truncate">
                                  {service.name}
                                </span>
                                <span className="shrink-0 text-[#8A949E]">
                                  {formatPrice(service.base_price)}
                                </span>
                              </label>
                              {selected && (
                                <input
                                  aria-label={`Số lượng dịch vụ ${service.name}`}
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={selected.quantity}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    if (Number.isInteger(value) && value >= 1) {
                                      setServiceQuantity(service.id, value);
                                    }
                                  }}
                                  className="w-14 rounded-lg border border-[#D9DDE1] px-2 py-1 text-[11px] outline-none focus:border-[#1F2933]"
                                />
                              )}
                            </div>
                          );
                        })}
                        {filteredServices.length === 0 && (
                          <p className="py-4 text-center text-[11px] text-[#8A949E]">
                            Không tìm thấy dịch vụ.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E1E4E6] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold">
                          Phụ tùng ({selectedPartCount})
                        </p>
                        <input
                          value={partSearch}
                          onChange={(event) => setPartSearch(event.target.value)}
                          placeholder="Tìm phụ tùng..."
                          className="w-40 rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[11px] outline-none focus:border-[#1F2933]"
                        />
                      </div>
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {filteredParts.map((part) => {
                          const selected = form.parts.find(
                            (item) => item.part_id === part.id,
                          );

                          return (
                            <div
                              key={part.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-[#FAFAF8] px-3 py-2"
                            >
                              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selected)}
                                  onChange={() => togglePart(part.id)}
                                />
                                <span className="min-w-0 truncate">
                                  {part.name}
                                </span>
                                <span className="shrink-0 text-[#8A949E]">
                                  {formatPrice(part.sell_price)}
                                </span>
                              </label>
                              {selected && (
                                <input
                                  aria-label={`Số lượng phụ tùng ${part.name}`}
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={selected.quantity}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    if (Number.isInteger(value) && value >= 1) {
                                      setPartQuantity(part.id, value);
                                    }
                                  }}
                                  className="w-14 rounded-lg border border-[#D9DDE1] px-2 py-1 text-[11px] outline-none focus:border-[#1F2933]"
                                />
                              )}
                            </div>
                          );
                        })}
                        {filteredParts.length === 0 && (
                          <p className="py-4 text-center text-[11px] text-[#8A949E]">
                            Không tìm thấy phụ tùng.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      disabled={isSaving}
                      className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isLoadingCatalog}
                      className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {isSaving ? "Đang lưu..." : "Lưu gói bảo dưỡng"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 id="package-modal-title" className="mb-5 text-xl font-bold">
                  Chi tiết gói bảo dưỡng
                </h2>
                {isLoadingDetail ? (
                  <p className="py-8 text-center text-sm text-[#66717C]">
                    Đang tải thông tin...
                  </p>
                ) : selectedPackage ? (
                  <div className="space-y-5 text-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#8A949E]">Tên gói</p>
                        <p className="mt-1 font-semibold">
                          {selectedPackage.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">Dòng xe</p>
                        <p className="mt-1">
                          {modelLabel(selectedPackage.vehicle_model)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">
                          Giá ước tính
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatPrice(
                            selectedPackage.price ??
                              selectedPackage.estimated_price,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A949E]">
                          Mốc km / tháng
                        </p>
                        <p className="mt-1">
                          {selectedPackage.mileage_milestone
                            ? `${new Intl.NumberFormat("vi-VN").format(
                                selectedPackage.mileage_milestone,
                              )} km`
                            : "—"}{" "}
                          /{" "}
                          {selectedPackage.month_milestone
                            ? `${selectedPackage.month_milestone} tháng`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-[#8A949E]">Mô tả</p>
                      <p className="mt-1">
                        {selectedPackage.description || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold">
                        Dịch vụ ({(selectedPackage.services ?? []).length})
                      </p>
                      <ul className="space-y-1">
                        {(selectedPackage.services ?? []).map((service) => (
                          <li
                            key={service.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs"
                          >
                            <span>{service.name}</span>
                            <span className="text-[#66717C]">
                              SL {service.pivot?.quantity ?? 1} ·{" "}
                              {formatPrice(service.base_price)}
                            </span>
                          </li>
                        ))}
                        {(selectedPackage.services ?? []).length === 0 && (
                          <li className="text-xs text-[#8A949E]">
                            Chưa gắn dịch vụ.
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold">
                        Phụ tùng ({(selectedPackage.parts ?? []).length})
                      </p>
                      <ul className="space-y-1">
                        {(selectedPackage.parts ?? []).map((part) => (
                          <li
                            key={part.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs"
                          >
                            <span>
                              {part.name}{" "}
                              <span className="text-[#8A949E]">
                                ({part.sku})
                              </span>
                            </span>
                            <span className="text-[#66717C]">
                              SL {part.pivot?.quantity ?? 1} ·{" "}
                              {formatPrice(part.sell_price)}
                            </span>
                          </li>
                        ))}
                        {(selectedPackage.parts ?? []).length === 0 && (
                          <li className="text-xs text-[#8A949E]">
                            Chưa gắn phụ tùng.
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs text-[#8A949E]">Trạng thái</p>
                      <p className="mt-1">
                        {selectedPackage.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Ngừng hoạt động"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#66717C]">
                    Không có thông tin gói bảo dưỡng.
                  </p>
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

export default MaintenancePackages;