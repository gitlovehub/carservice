import { Modal } from "../../components/ui";
import { Button, IconButton, buttonClass } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import "../../styles/garage-customer-pages.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { StatusBadge } from "../../components/ui/Badge";

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

  const awaitingCount = items.filter(a => ["PENDING", "CREATED"].includes(a.status)).length;
  const confirmedCount = items.filter(a => a.status === "CONFIRMED").length;

  return (
    <div className="at-customer-page at-customer-appointments">
      <div className="at-customer-container">
        <div className="at-customer-heading">
          <div>
          <h1>Lịch hẹn của tôi</h1>
          <p>Theo dõi lịch đã gửi, xác nhận từ gara và thông tin tiếp nhận.</p></div>
          <Link className={buttonClass({ variant: "primary" })} to="/customer/booking"><Icon name="plus" size={16}/>Đặt lịch mới</Link>
        </div>
        {notice && <div role="status" className="at-customer-notice">{notice}<IconButton size="sm" icon="close" label="Đóng thông báo" onClick={() => setNotice("")}/></div>}
        <div className="at-customer-stats">
          <div className="at-customer-stat"><span>TỔNG LỊCH HẸN</span><strong>{loading ? "…" : pagination.total}</strong><small>Trong tài khoản của bạn</small></div>
          <div className="at-customer-stat"><span>CHỜ XÁC NHẬN</span><strong>{loading ? "…" : awaitingCount}</strong><small>Trên trang hiện tại · Cố vấn sẽ phản hồi</small></div>
          <div className="at-customer-stat"><span>ĐÃ XÁC NHẬN</span><strong>{loading ? "…" : confirmedCount}</strong><small>Trên trang hiện tại · Sẵn sàng đến gara</small></div>
        </div>
        <div className="at-customer-filter">
          <label htmlFor="appointment-status">Lọc trạng thái</label>
          <select id="appointment-status" value={status} onChange={e => {setStatus(e.target.value);setPage(1)}}>
            <option value="">Tất cả lịch hẹn</option>
            {Object.entries(appointmentStatusLabel).map(([code,label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <label className="at-search-label" htmlFor="appointment-keyword">Tìm kiếm</label>
          <input id="appointment-keyword" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Mã lịch, biển số, tên xe…" />
        </div>
        {error && <div role="alert" className="at-customer-notice at-customer-error"><span>{error}</span><Button size="sm" variant="secondary" icon="refresh" onClick={() => setReloadKey(k=>k+1)}>Thử lại</Button></div>}
        {loading && <div className="at-customer-empty">Đang tải lịch hẹn...</div>}
        {!loading && filtered.length===0 && <div className="at-customer-empty"><h2>Chưa có lịch hẹn phù hợp</h2><p>Thử đổi bộ lọc hoặc tạo lịch bảo dưỡng mới.</p><Link to="/customer/booking" className={buttonClass({ variant: "primary" })}><Icon name="calendar" size={16}/>Đặt lịch bảo dưỡng</Link></div>}
        {!loading && filtered.map(a => <article key={a.id} className="at-appointment-card">
          <div className="at-appointment-top">
            <div><p className="at-appointment-code">{a.appointment_code}</p><h2>{getVehicleName(a.vehicle)}</h2><p className="at-appointment-description">{a.vehicle?.license_plate ?? "Chưa có biển số"} · {servicesText(a)}</p></div>
            <StatusBadge domain="appointment" status={a.status} audience="customer"/>
          </div>
          <div className="at-appointment-bottom">
            <strong>▣ {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}</strong>
            <div className="at-appointment-actions"><Button size="sm" variant="ghost" icon="eye" onClick={() => void openDetail(a)}>Chi tiết</Button>
              {canCancel(a) && <Button size="sm" variant="danger-outline" icon="x" onClick={() => { void openDetail(a).then(() => setCancelling(true)); }}>Hủy lịch</Button>}
            </div>
          </div>
        </article>)}
        {pagination.last_page>1 && <div className="at-customer-pagination"><span>Trang {pagination.current_page}/{pagination.last_page} · {pagination.total} lịch hẹn</span><div>
          <Button size="sm" variant="outline" icon="chevron-left" disabled={page<=1} onClick={() => setPage(p=>Math.max(1,p-1))}>Trước</Button>
          <Button size="sm" variant="outline" iconRight="chevron-right" disabled={page>=pagination.last_page} onClick={() => setPage(p=>p+1)}>Sau</Button>
        </div></div>}
      </div>

      {selected && (
        <Modal bare open onClose={closeModal} dismissible={!saving} title={"Chi tiết lịch hẹn"} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-cs-surface p-6 shadow-overlay md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT LỊCH HẸN
                </p>
                <h3 className="text-lg font-extrabold text-[#1F2933]">{selected.appointment_code}</h3>
                <StatusBadge domain="appointment" status={selected.status} audience="customer" className="mt-1"/>
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
              <p className="py-8 text-center text-xs text-cs-muted">Đang tải chi tiết...</p>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-cs-bg p-4">
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
                      <Button variant="secondary" onClick={() => setEditing(false)}>Bỏ qua</Button>
                      <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void handleSaveEdit()}>Lưu thay đổi</Button>
                    </>
                  ) : cancelling ? (
                    <>
                      <Button variant="secondary" onClick={() => setCancelling(false)}>Không hủy</Button>
                      <Button variant="danger" icon="x" loading={saving} loadingText="Đang hủy..." onClick={() => void handleCancel()}>Xác nhận hủy lịch</Button>
                    </>
                  ) : (
                    <>
                      {canEdit(selected) && (
                        <Button variant="secondary" icon="calendar" onClick={() => setEditing(true)}>Đổi ngày giờ</Button>
                      )}
                      {canCancel(selected) && (
                        <Button variant="danger-outline" icon="x" onClick={() => setCancelling(true)}>Hủy lịch</Button>
                      )}
                      <Button variant="secondary" onClick={closeModal}>Đóng</Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Modal>
      )}
    </div>
  );
}

export default Appointments;