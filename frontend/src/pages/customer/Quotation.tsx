import { useEffect, useMemo, useState } from "react";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { Toast, type ToastType } from "../../components/auth/Toast";
import {
  formatDate,
  formatMoney,
  getMyRepairOrderDetail,
  getMyRepairOrders,
  getVehicleName,
  quotationStatusLabel,
  respondQuotation,
  type CustomerQuotation,
  type CustomerRepairOrder,
} from "../../services/customerApi";

type QuotationRow = {
  quotation: CustomerQuotation;
  order: CustomerRepairOrder;
};

export default function QuotationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState<QuotationRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const orders = await getMyRepairOrders();
      const detailed = await Promise.all(
        orders.map(async (o) => {
          try {
            return await getMyRepairOrderDetail(o.id);
          } catch {
            return o;
          }
        }),
      );

      const list: QuotationRow[] = [];
      detailed.forEach((order) => {
        (order.quotations ?? []).forEach((q) => {
          list.push({ quotation: q, order });
        });
      });

      // Sắp xếp mới nhất lên đầu
      list.sort((a, b) => b.quotation.id - a.quotation.id);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách báo giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openModal = (row: QuotationRow) => {
    setSelectedRow(row);
    setSubmitError("");
    const initialChecked: Record<number, boolean> = {};
    (row.quotation.items ?? []).forEach((it) => {
      // Mặc định chọn true nếu chưa duyệt, hoặc lấy theo is_approved đã lưu
      initialChecked[it.id] = it.is_approved !== false;
    });
    setSelectedItems(initialChecked);
  };

  const closeModal = () => {
    setSelectedRow(null);
    setSubmitError("");
  };

  const handleToggleItem = (itemId: number) => {
    if (selectedRow?.quotation.status !== "SENT") return;
    setSelectedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSelectAll = (approveAll: boolean) => {
    if (selectedRow?.quotation.status !== "SENT") return;
    const next: Record<number, boolean> = {};
    (selectedRow.quotation.items ?? []).forEach((it) => {
      next[it.id] = approveAll;
    });
    setSelectedItems(next);
  };

  const handleRespond = async (isFullReject = false) => {
    if (!selectedRow) return;
    setSubmitting(true);
    setSubmitError("");

    const responses = (selectedRow.quotation.items ?? []).map((it) => ({
      item_id: it.id,
      is_approved: isFullReject ? false : Boolean(selectedItems[it.id]),
    }));

    try {
      await respondQuotation(selectedRow.quotation.id, responses);
      setToast({
        message: isFullReject
          ? "Đã từ chối toàn bộ báo giá."
          : "Đã gửi phản hồi duyệt báo giá thành công.",
        type: "success",
      });
      closeModal();
      await loadData();
    } catch (e) {
      const err = e as { message?: string; data?: { message?: string } };
      setSubmitError(err?.data?.message || err?.message || "Không thể gửi phản hồi báo giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ quotation, order }) => {
      if (statusFilter !== "ALL" && quotation.status !== statusFilter) return false;
      if (!q) return true;
      return [
        quotation.quotation_code,
        order.repair_order_code,
        order.vehicle?.license_plate,
        getVehicleName(order.vehicle),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [rows, statusFilter, search]);

  const pendingCount = rows.filter((r) => r.quotation.status === "SENT").length;
  const approvedCount = rows.filter((r) =>
    ["APPROVED", "PARTIALLY_APPROVED"].includes(r.quotation.status),
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-14">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / BÁO GIÁ
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Báo giá dịch vụ
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
                  Xem chi tiết từng hạng mục phụ tùng, tiền công và xác nhận duyệt báo giá trực tuyến.
                </p>
              </div>

              <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG BÁO GIÁ
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                  {loading ? "…" : rows.length}
                </p>
              </div>
            </div>
          </div>

          {/* 3 THẺ KPI */}
          <div className="mb-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    TỔNG BÁO GIÁ
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {loading ? "…" : rows.length}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-sm font-bold text-white">
                  BG
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#66717C]">Tất cả báo giá đã được phát hành.</p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    CHỜ BẠN DUYỆT
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                    {loading ? "…" : pendingCount}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-sm font-bold text-amber-800">
                  !
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#66717C]">Cần bạn xác nhận để gara tiến hành làm xe.</p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    ĐÃ DUYỆT
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                    {loading ? "…" : approvedCount}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-bold text-emerald-800">
                  ✓
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#66717C]">Báo giá đã được bạn đồng ý thực hiện.</p>
            </div>
          </div>

          {/* BỘ LỌC VÀ BẢNG DANH SÁCH */}
          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã báo giá, biển số xe..."
                  className="h-10 w-full sm:w-72 rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="SENT">Chờ bạn duyệt</option>
                  <option value="APPROVED">Đã duyệt toàn bộ</option>
                  <option value="PARTIALLY_APPROVED">Đã duyệt một phần</option>
                  <option value="REJECTED">Đã từ chối</option>
                </select>
              </div>

              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#66717C]">
                {filtered.length} kết quả
              </span>
            </div>

            {loading ? (
              <p className="p-10 text-center text-xs text-[#8A949E]">Đang tải danh sách báo giá...</p>
            ) : error ? (
              <div className="p-8 text-center text-xs text-red-600">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="mt-3 cursor-pointer rounded-lg bg-[#1F2933] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Thử lại
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-[#20252B]">Chưa có báo giá nào</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Khi gara kiểm tra xe và lên báo giá cho bạn, danh sách sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                      <th className="px-6 py-4">STT</th>
                      <th className="px-6 py-4">Mã báo giá</th>
                      <th className="px-6 py-4">Xe</th>
                      <th className="px-6 py-4">Lệnh dịch vụ</th>
                      <th className="px-6 py-4">Tổng tiền</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map(({ quotation, order }, index) => (
                      <tr
                        key={quotation.id}
                        className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                      >
                        <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-[#F3F4F2] px-2.5 py-1.5 font-mono text-[12px] font-bold text-[#20252B]">
                            {quotation.quotation_code}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div>
                            <p className="text-[13px] font-semibold text-[#20252B]">
                              {getVehicleName(order.vehicle)}
                            </p>
                            <p className="font-mono text-xs text-[#8F641B]">
                              {order.vehicle?.license_plate ?? "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[12px] font-medium text-[#20252B]">
                            {order.repair_order_code}
                          </p>
                          <p className="text-[11px] text-[#8A949E]">
                            Tiếp nhận: {formatDate(order.received_at)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-[13px] font-bold text-[#1F2933]">
                            {formatMoney(quotation.total_amount)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              quotation.status === "SENT"
                                ? "bg-amber-100 text-amber-800"
                                : quotation.status === "APPROVED" || quotation.status === "PARTIALLY_APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-[#F3F4F2] text-[#66717C]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                quotation.status === "SENT"
                                  ? "bg-amber-500"
                                  : quotation.status === "APPROVED" || quotation.status === "PARTIALLY_APPROVED"
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                              }`}
                            />
                            {quotationStatusLabel[quotation.status] ?? quotation.status}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => openModal({ quotation, order })}
                            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                              quotation.status === "SENT"
                                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                                : "bg-[#1F2933] text-white hover:bg-slate-800"
                            }`}
                          >
                            {quotation.status === "SENT" ? "Xem & Duyệt" : "Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>
              <div>
                <p className="text-sm font-bold text-[#20252B]">Quyền lợi duyệt báo giá</p>
                <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                  Bạn có toàn quyền lựa chọn đồng ý hoặc bỏ bớt các hạng mục tùy ý trước khi gara triển khai.
                  Sau khi duyệt, gara sẽ lập tức chuẩn bị phụ tùng và bắt đầu thi công.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL XEM & DUYỆT BÁO GIÁ */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT BÁO GIÁ
                </p>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  {selectedRow.quotation.quotation_code}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {getVehicleName(selectedRow.order.vehicle)} ·{" "}
                  <span className="font-mono text-[#8F641B]">
                    {selectedRow.order.vehicle?.license_plate ?? "—"}
                  </span>{" "}
                  · Lệnh: {selectedRow.order.repair_order_code}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F7F7F5] p-4 text-xs">
                <div>
                  <span className="text-slate-500">Trạng thái: </span>
                  <span className="font-bold text-slate-800">
                    {quotationStatusLabel[selectedRow.quotation.status] ?? selectedRow.quotation.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Tổng dự kiến: </span>
                  <span className="font-bold text-[#1F2933] text-sm">
                    {formatMoney(selectedRow.quotation.total_amount)}
                  </span>
                </div>
              </div>

              {selectedRow.quotation.status === "SENT" && (
                <div className="flex items-center justify-between text-xs">
                  <p className="text-slate-600">
                    Chọn các hạng mục bạn đồng ý thực hiện (bỏ tick những hạng mục chưa muốn làm):
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="cursor-pointer font-bold text-emerald-700 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="cursor-pointer font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-[#FAF8F5] font-bold text-slate-500">
                    <tr>
                      {selectedRow.quotation.status === "SENT" && (
                        <th className="w-10 px-3 py-2.5 text-center">Duyệt</th>
                      )}
                      <th className="px-3 py-2.5">Loại</th>
                      <th className="px-3 py-2.5">Hạng mục / Phụ tùng</th>
                      <th className="px-3 py-2.5 text-center">SL</th>
                      <th className="px-3 py-2.5 text-right">Đơn giá</th>
                      <th className="px-3 py-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRow.quotation.items ?? []).map((it) => {
                      const isChecked = selectedItems[it.id] ?? false;
                      return (
                        <tr
                          key={it.id}
                          onClick={() => handleToggleItem(it.id)}
                          className={
                            selectedRow.quotation.status === "SENT"
                              ? "cursor-pointer hover:bg-slate-50"
                              : ""
                          }
                        >
                          {selectedRow.quotation.status === "SENT" && (
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleItem(it.id)}
                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {it.item_type === "PART" ? "Phụ tùng" : "Dịch vụ"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-800">
                            {it.description || "Hạng mục sửa chữa"}
                          </td>
                          <td className="px-3 py-3 text-center">{Number(it.quantity)}</td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {formatMoney(it.unit_price)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800">
                            {formatMoney(it.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-[#FAF8F5] font-bold">
                    <tr>
                      <td
                        colSpan={selectedRow.quotation.status === "SENT" ? 5 : 4}
                        className="px-3 py-3 text-right text-slate-700"
                      >
                        Tổng cộng
                      </td>
                      <td className="px-3 py-3 text-right text-base text-[#1F2933]">
                        {formatMoney(selectedRow.quotation.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {submitError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {submitError}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>

              {selectedRow.quotation.status === "SENT" && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleRespond(true)}
                    className="cursor-pointer rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Từ chối báo giá
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleRespond(false)}
                    className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? "Đang gửi..." : "Xác nhận duyệt báo giá"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}