import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  advisorAppointment, checkInConfirmedAppointment, confirmPendingAppointment, findOrderForAppointment,
  capacityApi, customerVehicles, listReceptionAppointments, receiveRepairOrder, type CustomerVehicleOption, type WorkflowAppointment, type WorkflowOrder,
} from "../../services/workflowService";
import { card, input, WorkflowTitle, Notice, Status } from "./WorkflowUI";
import { Button } from "../../components/ui/Button";
import { KmInput } from "../../components/ui/QuantityStepper";
import { buttonClass } from "../../components/ui/buttonClass";
import { Icon } from "../../components/ui/Icon";
import { errorText, formatSlot } from "./workflowFormat";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { CapacityWeek } from "./CapacityWeek";
import { AppointmentHistoryPanel } from "./AppointmentHistoryPanel";

export default function ReceptionWorkflow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm, notify } = useAppFeedback();
  const selectedId = Number(searchParams.get("appointment"));
  const [appointments, setAppointments] = useState<WorkflowAppointment[]>([]);
  const [selected, setSelected] = useState<WorkflowAppointment | null>(null);
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const [vehicles, setVehicles] = useState<CustomerVehicleOption[]>([]);
  const [vehicleChoice, setVehicleChoice] = useState<number | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const bookedVehicleId = selected ? (selected.vehicle?.id ?? selected.vehicle_id ?? null) : null;
  const chosenVehicleId = vehicleChoice ?? bookedVehicleId;
  const vehicleChanged = chosenVehicleId != null && bookedVehicleId != null && chosenVehicleId !== bookedVehicleId;

  // Xe của cùng khách: cho phép nhận xe khác lịch hẹn (bắt buộc lý do, backend ghi audit).
  useEffect(() => {
    const customerId = selected?.customer?.id ?? selected?.customer_id;
    if (selected?.status !== "CHECKED_IN" || !customerId) return;
    let active = true;
    customerVehicles(customerId).then(list => { if (active) setVehicles(list); }).catch(() => { if (active) setVehicles([]); });
    return () => { active = false; };
  }, [selected]);

  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [pending, confirmed, checkedIn] = await Promise.all([
        listReceptionAppointments("PENDING"), listReceptionAppointments("CONFIRMED"), listReceptionAppointments("CHECKED_IN"),
      ]);
      setAppointments([...pending, ...confirmed, ...checkedIn].sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`)));
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!Number.isSafeInteger(selectedId) || selectedId < 1) {
      queueMicrotask(() => { setSelected(null); setOrder(null); });
      return;
    }
    let active = true;
    queueMicrotask(() => { setBusy(true); setError(""); setOrder(null); });
    advisorAppointment(selectedId).then(async appointment => {
      if (!active) return;
      setSelected(appointment);
      if (appointment.status === "CHECKED_IN") {
        const matched = await findOrderForAppointment(selectedId);
        if (active) setOrder(matched);
      }
    }).catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selectedId]);

  function selectAppointment(id: number) { setSearchParams({ appointment: String(id) }); setCondition(""); setNote(""); setMileage(""); setVehicleChoice(null); setChangeReason(""); setVehicles([]); }

  async function handleConfirm() {
    if (!selected || selected.status !== "PENDING") return;
    // P7: cảnh báo quá tải theo phút (không chặn — Q6).
    let capacityWarning = "";
    try {
      const day = selected.appointment_date ? await capacityApi.day(String(selected.appointment_date).slice(0, 10)) : null;
      if (day?.over_capacity) {
        const free = (day.suggestions ?? []).slice(0, 3).map(s => new Date(s.date).toLocaleDateString("vi-VN")).join(", ");
        capacityWarning = ` ⚠ Ngày này đã vượt năng lực gara (${day.load_minutes}/${day.capacity_minutes} phút).${free ? ` Ngày còn chỗ: ${free}.` : ""} Có thể vẫn xác nhận nếu khách đồng ý chờ lâu hơn.`;
      }
    } catch { /* Không lấy được công suất thì xác nhận như cũ. */ }
    const approved = await confirm({
      title: "Xác minh lịch hẹn với khách", reference: selected.appointment_code, phone: selected.customer?.phone,
      description: `Hãy gọi ${selected.customer?.full_name || "khách hàng"} qua ${selected.customer?.phone || "số điện thoại trên hồ sơ"} để xác nhận thời gian ${formatSlot(selected.appointment_date, selected.appointment_time)}. Không xác nhận nếu chưa được khách đồng ý.${capacityWarning}`,
      confirmText: "Khách đồng ý – Xác nhận", variant: "success", cancelText: "Chưa xác minh / Để sau",
      checklist: ["Đã trao đổi trực tiếp với khách về xe, dịch vụ và giờ hẹn.", "Khách đồng ý lịch hẹn và gara có khả năng tiếp nhận."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const updated = await confirmPendingAppointment(selected.id);
      setSelected(updated); notify(`Đã xác nhận lịch hẹn ${updated.appointment_code} với khách. Có thể tiếp nhận xe khi khách đến gara.`, "success");
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function handleCheckIn() {
    if (!selected || selected.status !== "CONFIRMED") return;
    const approved = await confirm({
      title: "Xác nhận khách và xe đến gara", reference: selected.appointment_code,
      description: `Kiểm tra khách và xe biển số ${selected.vehicle?.license_plate || "trên lịch hẹn"} đã thực sự có mặt. Xác nhận lịch qua điện thoại không đồng nghĩa đã tiếp nhận xe.`,
      confirmText: "Đã kiểm tra – Tiếp nhận xe",
      checklist: ["Khách hàng và phương tiện đã đến gara.", "Đã đối chiếu biển số, thông tin khách hàng và tình trạng xe ban đầu."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const updated = await checkInConfirmedAppointment(selected.id);
      setSelected(updated); notify("Đã tiếp nhận xe. Tiếp theo hãy ghi tình trạng xe để tạo phiếu sửa chữa.", "success");
      const existing = await findOrderForAppointment(selected.id);
      setOrder(existing);
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function submitReceive(event: FormEvent) {
    event.preventDefault();
    if (!selected || selected.status !== "CHECKED_IN" || working) return;
    const customerId = selected.customer?.id ?? selected.customer_id;
    const vehicleId = chosenVehicleId;
    if (!customerId || !vehicleId) { setError("Không xác định được khách hàng hoặc xe trong lịch hẹn."); return; }
    if (vehicleChanged && changeReason.trim().length < 5) { setError("Xe mang tới khác xe trong lịch hẹn: nhập lý do đổi xe (ít nhất 5 ký tự)."); return; }
    if (mileage.trim() && (!/^\d+$/.test(mileage.trim()) || !Number.isSafeInteger(Number(mileage)))) {
      setError("Số km phải là số nguyên không âm."); return;
    }
    const approved = await confirm({
      title: "Xác nhận tạo phiếu sửa chữa",
      reference: selected.appointment_code,
      description: `Tạo một phiếu sửa chữa cho xe ${selected.vehicle?.license_plate || "của khách"} ở trạng thái RECEIVED. Mỗi lịch hẹn chỉ được có một phiếu, thao tác này sẽ lưu lên hệ thống.`,
      confirmText: "Tạo phiếu sửa chữa",
      checklist: ["Đã kiểm tra thông tin xe và tình trạng bàn giao trước khi lập phiếu."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const result = await receiveRepairOrder({
        appointment_id: selected.id, customer_id: customerId, vehicle_id: vehicleId,
        ...(mileage.trim() ? { mileage_received: Number(mileage) } : {}),
        ...(condition.trim() ? { initial_condition: condition.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(vehicleChanged ? { vehicle_change_reason: changeReason.trim() } : {}),
      });
      setOrder(result.order);
      navigate(`/advisor/service-orders/${result.order.id}`, { replace: true, state: { success: result.existing ? "Phiếu đã tồn tại, không tạo trùng." : "Đã tạo phiếu sửa chữa thành công." } });
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <main className="page-container">
    <WorkflowTitle label="QUẦY DỊCH VỤ / TIẾP NHẬN" title="Tiếp nhận xe" sub="Lịch chờ → xác nhận → nhận xe → lập phiếu sửa chữa. Mỗi lịch hẹn chỉ có một phiếu."/>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="grid gap-6 xl:grid-cols-[minmax(310px,0.8fr)_minmax(0,1.2fr)]">
      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-cs-text">Lịch đang xử lý</h2><Button size="sm" variant="secondary" icon="refresh" disabled={busy || working} onClick={() => void refresh()}>Làm mới</Button></div>
        {busy && <p className="text-sm text-cs-muted">Đang tải lịch từ API...</p>}
        {!busy && !appointments.length && <p className="text-sm text-cs-muted">Chưa có lịch PENDING, CONFIRMED hoặc CHECKED_IN.</p>}
        <div className="max-h-[630px] space-y-3 overflow-y-auto pr-1">
          {appointments.map(item => <button key={item.id} type="button" onClick={() => selectAppointment(item.id)} className={`w-full rounded-xl border p-4 text-left transition hover:border-cs-accent hover:bg-cs-soft ${selectedId === item.id ? "border-cs-accent bg-cs-soft" : "border-cs-border"}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-cs-text">{item.appointment_code || `Lịch #${item.id}`}</strong><Status status={item.status}/></div>
            <p className="text-sm text-cs-text">{item.customer?.full_name || `Khách #${item.customer_id || "?"}`} — {item.vehicle?.license_plate || "Chưa có biển số"}</p>
            <p className="mt-1 text-xs text-cs-muted">{formatSlot(item.appointment_date, item.appointment_time)}</p>
          </button>)}
        </div>
        <Link to="/advisor/appointments" className={buttonClass({ variant: "outline", className: "mt-5" })}>Xem đầy đủ danh sách lịch<Icon name="arrow-right" size={16}/></Link>
        <CapacityWeek/>
      </section>
      <section className={card}>
        {selectedId > 0 && busy ? <div className="py-16 text-center text-cs-muted">Đang kiểm tra lịch và phiếu đã tồn tại...</div> : !selected ? <div className="py-16 text-center text-cs-muted">Chọn một lịch để thực hiện tiếp nhận. Bạn cũng có thể vào đây từ nút Tiếp nhận trên trang Lịch hẹn.</div> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-cs-accent-text">Lịch {selected.appointment_code || selected.id}</p><h2 className="mt-2 text-xl font-bold text-cs-text">{selected.customer?.full_name || "Khách hàng"}</h2></div><Status status={selected.status}/></div>
          <dl className="grid gap-3 border-y border-cs-border py-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-cs-muted">Khách hàng</dt><dd className="mt-1 text-cs-text">{selected.customer?.full_name || `#${selected.customer_id || "?"}`}</dd></div>
            <div><dt className="text-xs text-cs-muted">Điện thoại</dt><dd className="mt-1 text-cs-text">{selected.customer?.phone || "—"}</dd></div>
            <div><dt className="text-xs text-cs-muted">Xe</dt><dd className="mt-1 text-cs-text">{selected.vehicle?.license_plate || `#${selected.vehicle_id || "?"}`}</dd></div>
            <div><dt className="text-xs text-cs-muted">Ngày / giờ</dt><dd className="mt-1 text-cs-text">{formatSlot(selected.appointment_date, selected.appointment_time)}</dd></div>
            <div className="sm:col-span-2"><dt className="mb-2 text-xs text-cs-muted">Khách yêu cầu</dt><dd><CustomerRequestSummary request={selected}/></dd></div>
          </dl>
          <AppointmentHistoryPanel key={`history-${selected.id}-${selected.appointment_date}-${selected.appointment_time}-${selected.status}`} appointment={selected} onChanged={(updated, text) => { void advisorAppointment(updated.id).then(setSelected).catch(() => setSelected({ ...selected, ...updated })); notify(text, "success"); void refresh(); }}/>
          <ol className="my-6 flex flex-wrap gap-2 text-xs font-semibold text-cs-muted"><li className="rounded-full bg-cs-soft px-3 py-2">1. Đặt lịch</li><li className="rounded-full bg-cs-soft px-3 py-2">2. Xác nhận</li><li className="rounded-full bg-cs-soft px-3 py-2">3. Check-in</li><li className="rounded-full bg-cs-soft px-3 py-2">4. Phiếu sửa chữa</li></ol>
          {selected.status === "PENDING" && <div><p className="mb-4 text-sm text-cs-muted">Cần xác nhận lịch trước khi tiếp nhận.</p><Button variant="primary" icon="check" loading={working} loadingText="Đang xử lý..." onClick={() => void handleConfirm()}>Xác nhận lịch hẹn</Button></div>}
          {selected.status === "CONFIRMED" && <div><p className="mb-4 text-sm text-cs-muted">Chỉ nhận xe sau khi xe thực sự đến gara.</p><Button variant="primary" icon="car" loading={working} loadingText="Đang tiếp nhận..." onClick={() => void handleCheckIn()}>Xác nhận xe đã đến</Button></div>}
          {selected.status === "CHECKED_IN" && (order ? <div><Notice tone="success">Lịch đã có phiếu {order.repair_order_code || `#${order.id}`}. Không được tạo phiếu thứ hai.</Notice><Link className={buttonClass({ variant: "primary" })} to={`/advisor/service-orders/${order.id}`}>Xem phiếu sửa chữa<Icon name="arrow-right" size={16}/></Link></div>
            : <form onSubmit={event => void submitReceive(event)} className="space-y-4"><h3 className="text-lg font-bold text-cs-text">Lập phiếu sửa chữa (RECEIVED)</h3>
              {vehicles.length > 1 && <label className="block text-sm font-semibold text-cs-text">Xe thực tế mang tới
                <select className={input} value={chosenVehicleId ?? ""} onChange={event => setVehicleChoice(Number(event.target.value))}>
                  {vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.license_plate}{vehicle.model?.name ? ` · ${vehicle.model.name}` : ""}{vehicle.id === bookedVehicleId ? " (xe đặt lịch)" : ""}</option>)}
                </select></label>}
              {vehicleChanged && <label className="block text-sm font-semibold text-cs-text">Lý do đổi xe (bắt buộc, được ghi vết)<input className={input} required minLength={5} maxLength={500} value={changeReason} onChange={event => setChangeReason(event.target.value)} placeholder="Ví dụ: xe đặt lịch đang đi công tác, khách mang xe còn lại"/></label>}
              <div className="block text-sm font-semibold text-cs-text">Số km khi tiếp nhận (không bắt buộc)<KmInput label="Số km khi tiếp nhận" className="mt-1 w-full" value={mileage} onChange={setMileage}/></div>
              <label className="block text-sm font-semibold text-cs-text">Tình trạng xe ban đầu<textarea className={input} rows={3} value={condition} onChange={event => setCondition(event.target.value)} placeholder="Ghi nhận hư hỏng, ngoại thất, hiện trạng..."/></label>
              <label className="block text-sm font-semibold text-cs-text">Ghi chú tiếp nhận<textarea className={input} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi chú bàn giao và yêu cầu của khách"/></label>
              <Button type="submit" variant="primary" iconRight="arrow-right" loading={working} loadingText="Đang lập phiếu...">Tạo phiếu sửa chữa</Button>
              <p className="text-xs leading-5 text-cs-muted">Phiếu được tạo ở trạng thái RECEIVED. Bước tiếp theo: ghi kết quả kiểm tra ngay trên trang phiếu.</p>
            </form>)}
          {selected.status === "CANCELLED" && <Notice tone="error">Lịch đã hủy, không thể tiếp nhận.</Notice>}
        </>}
      </section>
    </div>
  </main>;
}
