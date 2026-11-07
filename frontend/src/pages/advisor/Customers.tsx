import { Button, PageHeader, Modal } from "../../components/ui";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdvisorCustomer,
  getAdvisorCustomers,
  updateAdvisorCustomer,
  type AdvisorCustomer,
  type AdvisorCustomerInput,
} from "../../services/customerApi";

const emptyForm: AdvisorCustomerInput = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const data = (error as Error & {
      data?: {
        errors?: Record<string, string[]>;
      };
    }).data;

    const firstValidationError = data?.errors
      ? Object.values(data.errors).flat()[0]
      : undefined;

    return firstValidationError || error.message;
  }

  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function Customers() {
  const [customers, setCustomers] = useState<AdvisorCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<AdvisorCustomer | null>(null);
  const [form, setForm] = useState<AdvisorCustomerInput>(emptyForm);
  const [formError, setFormError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdvisorCustomers({
        search: submittedSearch,
        page,
      });

      setCustomers(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [submittedSearch, page]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (customer: AdvisorCustomer) => {
    setEditingCustomer(customer);
    setForm({
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const payload: AdvisorCustomerInput = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
    };

    try {
      if (editingCustomer) {
        await updateAdvisorCustomer(editingCustomer.id, payload);
      } else {
        await createAdvisorCustomer(payload);
      }

      setModalOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);

      if (!editingCustomer && page !== 1) {
        setPage(1);
      } else {
        await loadCustomers();
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const applySearch = () => {
    setPage(1);
    setSubmittedSearch(search.trim());
  };

  const resetSearch = () => {
    setSearch("");
    setSubmittedSearch("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-cs-bg text-[#20252B]">

      <div className="lg:ml-[250px]">

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <PageHeader title="Khách hàng" description="Tìm kiếm và quản lý thông tin khách hàng tại gara."
              actions={<Button variant="primary" icon="plus" onClick={openCreateModal}>Thêm khách hàng</Button>}/>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  TỔNG KHÁCH HÀNG
                </p>
                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {total}
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Dữ liệu từ hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  KẾT QUẢ HIỂN THỊ
                </p>
                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {customers.length}
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Khách hàng trên trang này
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted">
                  VAI TRÒ
                </p>
                <p className="mt-3 text-[14px] font-bold text-[#20252B]">
                  Cố vấn dịch vụ
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Quản lý thông tin khách hàng
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Tìm kiếm khách hàng
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">
                  Tìm theo tên, số điện thoại hoặc email.
                </p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  applySearch();
                }}
                className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên, số điện thoại hoặc email"
                  className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[13px] outline-none transition placeholder:text-cs-muted focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />

                <button
                  type="submit"
                  className="cs-btn cs-btn-primary"
                >
                  Tìm kiếm
                </button>

                <button
                  type="button"
                  onClick={resetSearch}
                  className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-[12px] font-semibold text-[#374151] transition hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                >
                  Xóa bộ lọc
                </button>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252B]">
                    Danh sách khách hàng
                  </p>
                  <p className="mt-1 text-[11px] text-cs-muted">
                    Danh sách khách hàng của gara
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-cs-surface-2 px-3 py-1.5 text-[11px] font-semibold text-cs-muted">
                  {total} khách hàng
                </p>
              </div>

              {error && (
                <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadCustomers()}
                    className="mt-2 font-semibold underline"
                  >
                    Thử tải lại
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-cs-bg text-left">
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        STT
                      </th>
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        KHÁCH HÀNG
                      </th>
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        SỐ ĐIỆN THOẠI
                      </th>
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        EMAIL
                      </th>
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        ĐỊA CHỈ
                      </th>
                      <th className="px-5 py-3 text-[11px] font-bold text-cs-muted">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-14 text-center text-[13px] text-cs-muted"
                        >
                          Đang tải danh sách khách hàng...
                        </td>
                      </tr>
                    ) : customers.length > 0 ? (
                      customers.map((customer, index) => (
                        <tr
                          key={customer.id}
                          className="border-b border-[#EEF0F2] last:border-0 transition hover:bg-cs-surface-2"
                        >
                          <td className="px-5 py-4 text-[12px] text-cs-muted">
                            {(page - 1) * 10 + index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E8D2] text-[11px] font-bold text-[#5B4630]">
                                {customer.full_name
                                  .trim()
                                  .split(/\s+/)
                                  .slice(-1)[0]
                                  ?.charAt(0)
                                  .toUpperCase() || "K"}
                              </div>

                              <div>
                                <p className="text-[12px] font-semibold text-[#20252B]">
                                  {customer.full_name}
                                </p>
                                <p className="mt-1 text-[11px] text-cs-muted">
                                  Mã khách hàng: {customer.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[12px] text-[#374151]">
                            {customer.phone}
                          </td>
                          <td className="px-5 py-4 text-[12px] text-[#374151]">
                            {customer.email || "Chưa cập nhật"}
                          </td>
                          <td className="px-5 py-4 text-[12px] text-[#374151]">
                            {customer.address || "Chưa cập nhật"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(customer)}
                                className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[11px] font-semibold text-[#374151] transition hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                              >
                                Sửa
                              </button>
                              <Link
                                to={`/advisor/customer-cars?customerId=${customer.id}`}
                                className="inline-flex rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[11px] font-semibold text-[#374151] transition hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                              >
                                Xe
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center">
                          <p className="text-[13px] font-semibold text-[#20252B]">
                            Không tìm thấy khách hàng
                          </p>
                          <p className="mt-1 text-[11px] text-cs-muted">
                            Thử thay đổi từ khóa hoặc thêm khách hàng mới.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#EEF0F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-cs-muted">
                  Trang {page} / {lastPage}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-[11px] font-semibold text-[#374151] transition hover:bg-cs-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= lastPage || loading}
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                    className="rounded-lg border border-[#D9DDE1] px-4 py-2 text-[11px] font-semibold text-[#374151] transition hover:bg-cs-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <Modal bare open onClose={closeModal} dismissible={!saving} title={"Thông tin khách hàng"} className="my-auto w-full max-w-[560px] rounded-2xl bg-cs-surface p-6 shadow-overlay">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3
                  id="customer-modal-title"
                  className="text-[18px] font-bold text-[#20252B]"
                >
                  {editingCustomer ? "Cập nhật khách hàng" : "Thêm khách hàng"}
                </h3>
                <p className="mt-1 text-[12px] text-cs-muted">
                  Nhập thông tin khách hàng bên dưới.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                aria-label="Đóng biểu mẫu"
                className="rounded-lg px-2 py-1 text-lg text-cs-muted hover:bg-cs-surface-2 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="customer-name"
                  className="mb-2 block text-[12px] font-semibold text-[#374151]"
                >
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  required
                  maxLength={100}
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-[13px] outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-2 block text-[12px] font-semibold text-[#374151]"
                >
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-phone"
                  required
                  maxLength={20}
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="Nhập số điện thoại"
                  className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-[13px] outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-email"
                  className="mb-2 block text-[12px] font-semibold text-[#374151]"
                >
                  Email
                </label>
                <input
                  id="customer-email"
                  type="email"
                  maxLength={150}
                  value={form.email ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="example@email.com"
                  className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-[13px] outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-address"
                  className="mb-2 block text-[12px] font-semibold text-[#374151]"
                >
                  Địa chỉ
                </label>
                <textarea
                  id="customer-address"
                  rows={3}
                  maxLength={255}
                  value={form.address ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="Nhập địa chỉ khách hàng"
                  className="w-full resize-y rounded-xl border border-[#D9DDE1] px-4 py-3 text-[13px] outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-[#EEF0F2] pt-5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-[12px] font-semibold text-[#374151] hover:bg-cs-bg disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#1F2933] px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#151D24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingCustomer
                      ? "Lưu thay đổi"
                      : "Thêm khách hàng"}
                </button>
              </div>
            </form>
          </Modal>
      )}
    </div>
  );
}

export default Customers;
