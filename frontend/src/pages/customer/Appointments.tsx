import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import {
  appointmentStatusLabel,
  cancelAppointment,
  formatDate,
  formatTime,
  getAppointmentDetail,
  getMyAppointments,
  getVehicleName,
  requestTypeLabel,
  updateAppointment,
  type CustomerAppointment,
  type Pagination,
} from "../../services/customerApi";

const statusBadge: Record<string, string> = {
  PENDING: "bg-[#F3F4F2] text-[#66717C]",
  CONFIRMED: "bg-[#F3E8D2] text-[#3A3020]",
  CHECKED_IN: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-slate-100 text-slate-500",
};

const canCancel = (a: CustomerAppointment) => ["PENDING", "CONFIRMED"].includes(a.status);
const canEdit = (a: CustomerAppointment) => a.status === "PENDING";

const errorText = (e: unknown, fallback: string) => {
  const err = e as { message?: string; data?: { message?: string; errors?: Record<string, string[]> } };
  const first = err?.data?.errors ? Object.values(err.data.errors).flat()[0] : undefined;
  return first || err?.data?.message || err?.message || fallback;
};

function servicesText(a: CustomerAppointment) {
  const names = [
    ...(a.services ?? []).map((s) => s.name),
    ...(a.packages ?? []).map((p) => p.name),
  ];
  return names.length > 0 ? names.join(", ") : requestTypeLabel[a.request_type] ?? a.request_type;
}

function Appointments() {
  const location = useLocation();
  const isCustomerPage = location.pathname === "/customer/appointments";

  const [items, setItems] = useState<CustomerAppointment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<CustomerAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getMyAppointments({ status, page, perPage: 10 })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e, "Không thể tải danh sách lịch hẹn."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, reloadKey]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) =>
      [a.appointment_code, a.vehicle?.license_plate, getVehicleName(a.vehicle), servicesText(a)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, keyword]);

  const openDetail = useCallback(async (a: CustomerAppointment) => {
    setSelected(a);
    setEditing(false);
    setCancelling(false);
    setCancelReason("");
    setModalError("");
    setDetailLoading(true);
    try {
      const detail = await getAppointmentDetail(a.id);
      setSelected(detail);
      setEditDate(detail.appointment_date?.slice(0, 10) ?? "");
      setEditTime(formatTime(detail.appointment_time));
    } catch (e) {
      setModalError(errorText(e, "Không thể tải chi tiết lịch hẹn."));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeModal = () => {
    setSelected(null);
    setEditing(false);
    setCancelling(false);
    setModalError("");
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    if (!editDate || !editTime) {
      setModalError("Vui lòng chọn ngày và giờ hẹn.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await updateAppointment(selected.id, {
        appointment_date: editDate,
        appointment_time: editTime,
      });
      setNotice("Đã cập nhật lịch hẹn thành công.");
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (e) {
      setModalError(errorText(e, "Không thể cập nhật lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setSaving(true);
    setModalError("");
    try {
      await cancelAppointment(selected.id, cancelReason.trim() || "Khách hàng chủ động hủy");
      setNotice("Đã hủy lịch hẹn.");
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (e) {
      setModalError(errorText(e, "Không thể hủy lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

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

      <main className={isCustomerPage ? "lg:ml-[250px]" : ""}>
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                {isCustomerPage ? "KHÁCH HÀNG / LỊCH HẸN" : "CARSERVICE / LỊCH HẸN"}
              </p>
              <h1 className="mt-3 text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Lịch hẹn
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
                Quản lý và theo dõi các lịch hẹn bảo dưỡng, sửa chữa xe của bạn.
              </p>
            </div>
            <Link
              to="/booking"
              className="inline-flex h-10 w-fit cursor-pointer items-center rounded-xl bg-[#1F2933] px-5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              + Đặt lịch mới
            </Link>
          </div>

          {notice && (
            <div className="mb-5 flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} className="cursor-pointer font-bold">
                ✕
              </button>
            </div>
          )}

          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                TỔNG LỊCH HẸN
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                {pagination.total}
              </p>
              <p className="mt-3 text-[11px] text-[#66717C]">
                {status ? `Theo bộ lọc: ${appointmentStatusLabel[status]}` : "Tất cả lịch hẹn của bạn."}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                KẾT QUẢ TRÊN TRANG
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                {filtered.length}
              </p>
              <p className="mt-3 text-[11px] text-[#66717C]">
                Trang {pagination.current_page}/{pagination.last_page}
              </p>
            </div>
          </div>

          <div className="mb-7 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">Từ khóa</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Mã lịch hẹn, biển số, tên xe, dịch vụ..."
                  className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] outline-none transition placeholder:text-[#9AA3AA] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(appointmentStatusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E1E4E6] px-6 py-5">
              <h2 className="text-[17px] font-bold text-[#20252B]">Danh sách lịch hẹn</h2>
              <span className="rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#66717C]">
                {filtered.length} kết quả
              </span>
            </div>

            {error && (
              <div className="m-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="cursor-pointer rounded-lg border border-red-300 bg-white px-3 py-1 font-bold"
                >
                  Thử lại
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    <th className="px-6 py-4">Mã lịch hẹn</th>
                    <th className="px-6 py-4">Xe</th>
                    <th className="px-6 py-4">Dịch vụ</th>
                    <th className="px-6 py-4">Ngày giờ hẹn</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-xs text-[#8A949E]">
                        Đang tải lịch hẹn...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <p className="text-sm font-semibold text-[#20252B]">Không có lịch hẹn nào</p>
                        <p className="mt-1 text-[11px] text-[#8A949E]">
                          {items.length === 0 && !status
                            ? "Bạn chưa đặt lịch nào. Hãy đặt lịch bảo dưỡng đầu tiên."
                            : "Thử thay đổi từ khóa hoặc trạng thái tìm kiếm."}
                        </p>
                        {items.length === 0 && !status && (
                          <Link
                            to="/booking"
                            className="mt-4 inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white"
                          >
                            Đặt lịch ngay
                          </Link>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[#EEF0F2] transition last:border-b-0 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-6 py-5 text-[12px] font-bold text-[#20252B]">
                          {a.appointment_code}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-[13px] font-bold text-[#20252B]">{getVehicleName(a.vehicle)}</p>
                          <p className="mt-1 font-mono text-[11px] text-[#8A949E]">
                            {a.vehicle?.license_plate ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[220px] px-6 py-5 text-[12px] text-[#66717C]">
                          {servicesText(a)}
                        </td>
                        <td className="px-6 py-5 text-[12px] font-semibold text-[#20252B]">
                          {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                              statusBadge[a.status] ?? statusBadge.PENDING
                            }`}
                          >
                            {appointmentStatusLabel[a.status] ?? a.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => void openDetail(a)}
                            className="cursor-pointer rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-[#E1E4E6] px-6 py-4 text-xs">
                <span className="text-[#66717C]">
                  Trang {pagination.current_page}/{pagination.last_page} · {pagination.total} lịch hẹn
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="cursor-pointer rounded-lg border border-[#DDE1E4] px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="cursor-pointer rounded-lg border border-[#DDE1E4] px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {!isCustomerPage && <Footer />}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT LỊCH HẸN
                </p>
                <h3 className="text-lg font-extrabold text-[#1F2933]">{selected.appointment_code}</h3>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-[10px] font-semibold ${
                    statusBadge[selected.status] ?? statusBadge.PENDING
                  }`}
                >
                  {appointmentStatusLabel[selected.status] ?? selected.status}
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <p className="py-8 text-center text-xs text-[#8A949E]">Đang tải chi tiết...</p>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4">
                  <div>
                    <p className="text-slate-400">Xe</p>
                    <p className="mt-0.5 font-bold text-slate-800">{getVehicleName(selected.vehicle)}</p>
                    <p className="font-mono text-slate-500">{selected.vehicle?.license_plate ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Loại yêu cầu</p>
                    <p className="mt-0.5 font-bold text-slate-800">
                      {requestTypeLabel[selected.request_type] ?? selected.request_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Ngày hẹn</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatDate(selected.appointment_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Giờ hẹn</p>
                    <p className="mt-0.5 font-bold text-slate-800">{formatTime(selected.appointment_time)}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-700">Dịch vụ / gói đã chọn</p>
                  <p className="mt-1 text-slate-600">{servicesText(selected)}</p>
                </div>
                {selected.symptom_description && (
                  <div>
                    <p className="font-bold text-slate-700">Mô tả tình trạng</p>
                    <p className="mt-1 text-slate-600">{selected.symptom_description}</p>
                  </div>
                )}
                {selected.note && (
                  <div>
                    <p className="font-bold text-slate-700">Ghi chú</p>
                    <p className="mt-1 text-slate-600">{selected.note}</p>
                  </div>
                )}
                {selected.status === "CANCELLED" && selected.cancel_reason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
                    <strong>Lý do hủy:</strong> {selected.cancel_reason}
                  </div>
                )}

                {editing && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E1E4E6] p-4">
                    <div>
                      <label className="mb-1 block font-semibold">Ngày hẹn mới</label>
                      <input
                        type="date"
                        min={todayISO}
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[#DDE1E4] px-3 outline-none focus:border-[#D6A85F]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Giờ hẹn mới</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="h-10 w-full rounded-lg border border-[#DDE1E4] px-3 outline-none focus:border-[#D6A85F]"
                      />
                    </div>
                  </div>
                )}

                {cancelling && (
                  <div className="rounded-xl border border-[#E1E4E6] p-4">
                    <label className="mb-1 block font-semibold">Lý do hủy (không bắt buộc)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={255}
                      rows={3}
                      className="w-full rounded-lg border border-[#DDE1E4] p-3 outline-none focus:border-[#D6A85F]"
                    />
                  </div>
                )}

                {modalError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
                    {modalError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSaveEdit()}
                        className="cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 font-bold text-white disabled:opacity-60"
                      >
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </>
                  ) : cancelling ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCancelling(false)}
                        className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                      >
                        Không hủy
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleCancel()}
                        className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-60"
                      >
                        {saving ? "Đang hủy..." : "Xác nhận hủy lịch"}
                      </button>
                    </>
                  ) : (
                    <>
                      {canEdit(selected) && (
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2 font-semibold hover:border-[#D6A85F]"
                        >
                          Đổi ngày giờ
                        </button>
                      )}
                      {canCancel(selected) && (
                        <button
                          type="button"
                          onClick={() => setCancelling(true)}
                          className="cursor-pointer rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50"
                        >
                          Hủy lịch
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeModal}
                        className="cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2 font-bold text-white"
                      >
                        Đóng
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;