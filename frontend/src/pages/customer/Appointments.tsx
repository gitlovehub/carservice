import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, ErrorState, LoadingState, Modal, Pagination, buttonClass } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { controlClass } from "../../components/ui/fieldContext";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import {
  cancelAppointment,
  formatDate,
  formatTime,
  getAppointmentDetail,
  getMyAppointments,
  getVehicleName,
  requestTypeLabel,
  updateAppointment,
  type CustomerAppointment,
} from "../../services/customerApi";
import { AccountCard, AccountPage, FilterBar, FilterSelect, InfoTile, InlineError, ModalFoot, ModalHead } from "./account/AccountKit";
import { MODAL_CLASS, PRIMARY_RED } from "./account/accountStyles";
import { useDeepLink } from "./account/useDeepLink";

const PER_PAGE = 5;
const canCancel = (a: CustomerAppointment) => ["PENDING", "CONFIRMED"].includes(a.status);
const canEdit = (a: CustomerAppointment) => a.status === "PENDING";

type Tab = "all" | "upcoming" | "checked_in" | "cancelled";
const TABS: { id: Tab; label: string; accept: (a: CustomerAppointment) => boolean }[] = [
  { id: "all", label: "Tất cả", accept: () => true },
  { id: "upcoming", label: "Sắp tới", accept: (a) => ["PENDING", "CREATED", "CONFIRMED"].includes(a.status) },
  { id: "checked_in", label: "Đã tiếp nhận", accept: (a) => a.status === "CHECKED_IN" },
  { id: "cancelled", label: "Đã hủy", accept: (a) => ["CANCELLED", "NO_SHOW"].includes(a.status) },
];

type SortKey = "date_desc" | "date_asc" | "created_desc";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "date_desc", label: "Ngày hẹn: mới nhất" },
  { id: "date_asc", label: "Ngày hẹn: sớm nhất" },
  { id: "created_desc", label: "Vừa đặt gần đây" },
];
/** Mốc thời gian của lịch hẹn (ngày + giờ) để sắp xếp. */
const appointmentTime = (a: CustomerAppointment) => new Date(`${a.appointment_date?.slice(0, 10)}T${(a.appointment_time ?? "00:00").slice(0, 5)}:00`).getTime() || 0;

const errorText = (e: unknown, fallback: string) => {
  const err = e as { message?: string; data?: { message?: string; errors?: Record<string, string[]> } };
  const first = err?.data?.errors ? Object.values(err.data.errors).flat()[0] : undefined;
  return first || err?.data?.message || err?.message || fallback;
};

function servicesText(a: CustomerAppointment) {
  const names = [...(a.services ?? []).map((s) => s.name), ...(a.packages ?? []).map((p) => p.name)];
  return names.length > 0 ? names.join(", ") : requestTypeLabel[a.request_type] ?? a.request_type;
}

/** Khối ngày bên trái thẻ: thứ, ngày lớn, tháng/năm. */
function DateBlock({ value }: { value: string }) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  const valid = !Number.isNaN(date.getTime());
  return (
    <div className="flex w-[76px] shrink-0 flex-col items-center justify-center rounded-2xl bg-cs-soft px-2 py-3 text-cs-accent-text">
      <span className="text-[12px] font-bold uppercase">{valid ? date.toLocaleDateString("vi-VN", { weekday: "short" }) : "—"}</span>
      <span className="text-[28px] font-extrabold leading-none">{valid ? String(date.getDate()).padStart(2, "0") : "—"}</span>
      <span className="mt-1 text-[12px] font-semibold">{valid ? `Th${date.getMonth() + 1}/${date.getFullYear()}` : ""}</span>
    </div>
  );
}

export default function Appointments() {
  const { notify } = useAppFeedback();
  const [items, setItems] = useState<CustomerAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("date_desc");

  /** Lịch hẹn khách bấm mở; `detail` = bản chi tiết đã tải (GET /appointments/{id}) của lịch đang mở. */
  const [opened, setOpened] = useState<CustomerAppointment | null>(null);
  const [detail, setDetail] = useState<CustomerAppointment | null>(null);
  const [modalError, setModalError] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getMyAppointments({ page: 1, perPage: 100 })
      .then((res) => { if (active) setItems(res.items); })
      .catch((e: unknown) => { if (active) setError(errorText(e, "Không thể tải danh sách lịch hẹn.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const reloadList = () => { setLoading(true); setError(""); setReloadKey((k) => k + 1); };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const accept = TABS.find((t) => t.id === tab)?.accept ?? (() => true);
    const list = items.filter(accept).filter((a) => !q || [a.appointment_code, a.vehicle?.license_plate, getVehicleName(a.vehicle), servicesText(a)]
      .some((v) => String(v ?? "").toLowerCase().includes(q)));
    return list.sort((a, b) => sort === "date_asc" ? appointmentTime(a) - appointmentTime(b)
      : sort === "created_desc" ? b.id - a.id
      : appointmentTime(b) - appointmentTime(a));
  }, [items, tab, keyword, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Link từ thông báo (?appointment=<id>): sau khi tải danh sách, modal của đúng lịch hẹn tự mở.
  const { value: linkedId, clear: clearLink } = useDeepLink("appointment");
  const linked = linkedId && !loading ? items.find((a) => String(a.id) === linkedId) : undefined;
  const opening = opened ?? linked ?? null;
  const openingId = opening?.id ?? null;

  // Tải chi tiết của lịch đang mở (dịch vụ, gói, lý do hủy…); trong lúc chờ hiện dữ liệu từ danh sách.
  useEffect(() => {
    if (openingId === null) return;
    let active = true;
    getAppointmentDetail(openingId)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        setEditDate(data.appointment_date?.slice(0, 10) ?? "");
        setEditTime(formatTime(data.appointment_time));
      })
      .catch((e: unknown) => { if (active) setModalError(errorText(e, "Không thể tải chi tiết lịch hẹn.")); });
    return () => { active = false; };
  }, [openingId]);
  const selected = opening && detail?.id === opening.id ? detail : opening;
  const detailLoading = opening !== null && detail?.id !== opening.id && !modalError;

  const openDetail = useCallback((a: CustomerAppointment, nextMode: "view" | "cancel" = "view") => {
    setOpened(a);
    setMode(nextMode);
    setCancelReason("");
    setModalError("");
  }, []);

  const closeModal = () => { setOpened(null); setDetail(null); setMode("view"); setModalError(""); clearLink(); };

  const handleSaveEdit = async () => {
    if (!selected) return;
    if (!editDate || !editTime) { setModalError("Vui lòng chọn ngày và giờ hẹn."); return; }
    setSaving(true);
    setModalError("");
    try {
      await updateAppointment(selected.id, { appointment_date: editDate, appointment_time: editTime });
      notify(`Đã đổi lịch hẹn ${selected.appointment_code} sang ${editTime} ngày ${formatDate(editDate)}.`, "success");
      closeModal();
      reloadList();
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
      notify(`Đã hủy lịch hẹn ${selected.appointment_code}.`, "success");
      closeModal();
      reloadList();
    } catch (e) {
      setModalError(errorText(e, "Không thể hủy lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const count = (id: Tab) => items.filter(TABS.find((t) => t.id === id)!.accept).length;

  return (
    <AccountPage
      testId="customer-appointments"
      title="Lịch hẹn"
      description="Theo dõi lịch đã đặt, xác nhận từ gara; đổi giờ hoặc hủy lịch khi cần."
      actions={<Link to="/booking" className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}><Icon name="plus" size={16}/>Đặt lịch mới</Link>}
    >
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc lịch hẹn">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setPage(1); }}
            className={`cursor-pointer rounded-full border px-4 py-2 text-[14px] font-bold transition-colors ${tab === t.id ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-cs-border bg-cs-surface text-cs-muted hover:text-cs-text"}`}>
            {t.label} <span className="ml-1 font-semibold opacity-70">{loading ? "" : count(t.id)}</span>
          </button>
        ))}
      </div>

      <FilterBar search={keyword} onSearch={(v) => { setKeyword(v); setPage(1); }} placeholder="Tìm mã lịch hẹn, dịch vụ, biển số…" count={loading ? undefined : `${filtered.length} lịch hẹn`}>
        <FilterSelect label="Sắp xếp lịch hẹn" value={sort} onChange={(v) => { setSort(v as SortKey); setPage(1); }}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </FilterSelect>
      </FilterBar>

      {loading ? <AccountCard><LoadingState label="Đang tải lịch hẹn…"/></AccountCard>
        : error ? <AccountCard><ErrorState description={error} onRetry={() => reloadList()}/></AccountCard>
        : filtered.length === 0 ? (
          <AccountCard>
            <EmptyState icon="calendar" title={items.length ? "Không có lịch hẹn phù hợp" : "Bạn chưa có lịch hẹn nào"}
              description={items.length ? "Thử đổi bộ lọc hoặc từ khóa tìm kiếm." : "Đặt lịch bảo dưỡng để gara chuẩn bị trước cho xe của bạn."}
              action={<Link to="/booking" className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}><Icon name="plus" size={16}/>Đặt lịch mới</Link>}/>
          </AccountCard>
        ) : (
          <div className="space-y-4">
            {paged.map((a) => (
              <AccountCard key={a.id} as="article" className="flex flex-wrap items-center gap-5 p-4 sm:flex-nowrap">
                <DateBlock value={a.appointment_date}/>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold tracking-[0.06em] text-cs-accent-text">{a.appointment_code}</p>
                  <h2 className="mt-0.5 break-words text-[17px] font-extrabold leading-snug text-cs-text">{servicesText(a)}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-cs-muted">
                    <span className="inline-flex items-center gap-2"><VehicleBrandLogo brand={a.vehicle?.model?.brand?.name} size={24}/>{getVehicleName(a.vehicle)}</span>
                    {a.vehicle?.license_plate && <span className="rounded-md border border-cs-border px-2 py-0.5 font-mono text-[13px] font-bold text-cs-text">{a.vehicle.license_plate}</span>}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-4 border-t border-cs-border pt-3 sm:w-auto sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-bold text-cs-text"><Icon name="clock" size={16}/>{formatTime(a.appointment_time)}</span>
                    <StatusBadge domain="appointment" status={a.status} audience="customer"/>
                  </div>
                  <div className="flex items-center gap-2">
                    {canCancel(a) && <Button size="sm" variant="danger-outline" icon="x" onClick={() => openDetail(a, "cancel")}>Hủy lịch</Button>}
                    <Button size="sm" variant="secondary" icon="eye" onClick={() => openDetail(a)}>Chi tiết</Button>
                  </div>
                </div>
              </AccountCard>
            ))}
            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PER_PAGE} onChange={setPage}/>
          </div>
        )}

      {selected && (
        <Modal bare open onClose={closeModal} dismissible={!saving} title="Chi tiết lịch hẹn" className={`${MODAL_CLASS} max-w-2xl`}>
          <ModalHead icon="calendar" eyebrow="Chi tiết lịch hẹn" title={selected.appointment_code}
            badge={<StatusBadge domain="appointment" status={selected.status} audience="customer"/>} onClose={closeModal} disabled={saving}/>
          {detailLoading ? <LoadingState compact label="Đang tải chi tiết…"/> : (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-3 rounded-2xl border border-cs-border p-4">
                <VehicleBrandLogo brand={selected.vehicle?.model?.brand?.name} size={44}/>
                <div className="min-w-0">
                  <p className="font-bold text-cs-text">{getVehicleName(selected.vehicle)}</p>
                  <p className="font-mono text-[13px] text-cs-muted">{selected.vehicle?.license_plate ?? "Chưa có biển số"}</p>
                </div>
              </div>
              <dl className="grid gap-3 sm:grid-cols-3">
                <InfoTile label="Ngày hẹn" value={formatDate(selected.appointment_date)}/>
                <InfoTile label="Giờ hẹn" value={formatTime(selected.appointment_time)}/>
                <InfoTile label="Loại yêu cầu" value={requestTypeLabel[selected.request_type] ?? selected.request_type}/>
              </dl>
              <div>
                <p className="text-[13px] font-bold text-cs-muted">Dịch vụ / gói đã chọn</p>
                <p className="mt-1 text-[15px] text-cs-text">{servicesText(selected)}</p>
              </div>
              {selected.symptom_description && <div><p className="text-[13px] font-bold text-cs-muted">Mô tả tình trạng</p><p className="mt-1 whitespace-pre-line text-[15px] text-cs-text">{selected.symptom_description}</p></div>}
              {selected.note && <div><p className="text-[13px] font-bold text-cs-muted">Ghi chú</p><p className="mt-1 whitespace-pre-line text-[15px] text-cs-text">{selected.note}</p></div>}
              {selected.status === "CANCELLED" && selected.cancel_reason && <InlineError>Lý do hủy: {selected.cancel_reason}</InlineError>}

              {mode === "edit" && (
                <div className="grid gap-4 rounded-2xl border border-cs-border p-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Ngày hẹn mới</span>
                    <input type="date" min={todayISO} value={editDate} onChange={(e) => setEditDate(e.target.value)} className={controlClass}/></label>
                  <label className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Giờ hẹn mới</span>
                    <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className={controlClass}/></label>
                </div>
              )}
              {mode === "cancel" && (
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between text-label text-cs-text-2">
                    <span>Lý do hủy <span className="font-normal text-cs-muted">(không bắt buộc)</span></span>
                    <span className="text-xs font-normal text-cs-muted">{cancelReason.length}/255</span>
                  </span>
                  <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={255} rows={2} className={`${controlClass} resize-none`} placeholder="Ví dụ: Bận việc đột xuất"/>
                </label>
              )}
              {modalError && <InlineError>{modalError}</InlineError>}
            </div>
          )}
          <ModalFoot>
            {mode === "edit" ? <>
              <Button variant="secondary" onClick={() => setMode("view")} disabled={saving}>Bỏ qua</Button>
              <Button variant="primary" icon="check" className={PRIMARY_RED} loading={saving} loadingText="Đang lưu..." onClick={() => void handleSaveEdit()}>Lưu thay đổi</Button>
            </> : mode === "cancel" ? <>
              <Button variant="secondary" onClick={() => setMode("view")} disabled={saving}>Không hủy</Button>
              <Button variant="danger" icon="x" loading={saving} loadingText="Đang hủy..." onClick={() => void handleCancel()}>Xác nhận hủy lịch</Button>
            </> : <>
              <Button variant="secondary" onClick={closeModal}>Đóng</Button>
              {canCancel(selected) && <Button variant="danger-outline" icon="x" onClick={() => setMode("cancel")}>Hủy lịch</Button>}
              {canEdit(selected) && <Button variant="primary" icon="calendar" className={PRIMARY_RED} onClick={() => setMode("edit")}>Đổi ngày giờ</Button>}
            </>}
          </ModalFoot>
        </Modal>
      )}
    </AccountPage>
  );
}
