import { useEffect, useMemo, useState } from "react";
import { Button, Field, Icon, Input, Modal, SearchInput, Select, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { adminApi, errorMessage, type BookingSlots } from "../../../services/adminApi";
import {
  catalogAdminApi, isoDate, money, REQUEST_TYPES, type AdminService, type AppointmentRow, type RequestType,
} from "../../../services/catalogAdminApi";
import { useDebounced } from "../kit/useDebounced";

type Customer = { id: number; full_name: string; phone: string | null; email: string | null };
type VehicleOption = { id: number; license_plate: string | null; model?: { name: string; brand?: { name: string } | null } | null };

/** Tạo lịch hẹn hộ khách (gọi điện / đến trực tiếp): chọn khách → xe → ngày giờ → dịch vụ. */
export function CreateAppointmentModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (appointment: AppointmentRow) => void;
}) {
  const { notify } = useAppFeedback();
  const [search, setSearch] = useState("");
  const term = useDebounced(search.trim());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(() => isoDate(new Date(Date.now() + 86_400_000)));
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<BookingSlots>({ morning: [], afternoon: [] });
  const [type, setType] = useState<RequestType>("MAINTENANCE");
  const [services, setServices] = useState<AdminService[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [symptom, setSymptom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    Promise.all([
      adminApi.bookingSlots(controller.signal),
      catalogAdminApi.services({ status: "ACTIVE", per_page: 100 }, controller.signal),
    ]).then(([s, list]) => { setSlots(s); setServices(list.data); }).catch(() => undefined);
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || customer || term.length < 2) return;
    const controller = new AbortController();
    catalogAdminApi.searchCustomers(term, controller.signal).then(setCustomers).catch(() => undefined);
    return () => controller.abort();
  }, [open, term, customer]);

  const chooseCustomer = (c: Customer) => {
    setCustomer(c);
    setVehicleId("");
    catalogAdminApi.customerVehicles(c.id).then(list => {
      setVehicles(list);
      if (list.length === 1) setVehicleId(String(list[0].id));
    }).catch(() => setVehicles([]));
  };

  const total = useMemo(() => services.filter(s => picked.includes(s.id)).reduce((sum, s) => sum + Number(s.base_price), 0), [services, picked]);
  const reset = () => {
    setSearch(""); setCustomers([]); setCustomer(null); setVehicles([]); setVehicleId(""); setTime("");
    setType("MAINTENANCE"); setPicked([]); setSymptom(""); setError("");
  };
  const close = () => { if (!saving) { reset(); onClose(); } };

  const submit = async () => {
    if (!customer) return setError("Chọn khách hàng.");
    if (!vehicleId) return setError("Chọn xe của khách.");
    if (!time) return setError("Chọn giờ hẹn.");
    setSaving(true);
    setError("");
    try {
      const res = await catalogAdminApi.createAppointment({
        customer_id: customer.id, vehicle_id: Number(vehicleId), appointment_date: date, appointment_time: time, request_type: type,
        symptom_description: symptom.trim() || null, service_ids: picked, package_ids: [],
      });
      notify(`Đã tạo lịch hẹn ${res.data.appointment_code} cho ${customer.full_name} lúc ${time} ngày ${date.split("-").reverse().join("/")}.`, "success");
      reset();
      onCreated(res.data);
    } catch (e) {
      setError(errorMessage(e, "Không tạo được lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={close} dismissible={!saving} size="lg" title="Tạo lịch hẹn"
    description="Đặt lịch hộ khách gọi điện hoặc đến trực tiếp. Lịch mới ở trạng thái Chờ xác nhận."
    footer={<>
      <Button disabled={saving} onClick={close}>Huỷ</Button>
      <Button variant="primary" icon="calendar" loading={saving} loadingText="Đang tạo..." onClick={() => void submit()}>Tạo lịch hẹn</Button>
    </>}>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-label text-cs-text-2">Khách hàng<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span>
        {customer ? <div className="flex items-center gap-3 rounded-control border border-cs-border bg-cs-surface-2 px-3 py-2.5">
          <Icon name="user" size={18} className="text-cs-muted"/>
          <span className="min-w-0 flex-1"><b className="block truncate">{customer.full_name}</b>
            <span className="text-caption text-cs-muted">{customer.phone ?? "—"}{customer.email ? ` · ${customer.email}` : ""}</span></span>
          <Button size="sm" variant="ghost" onClick={() => { setCustomer(null); setVehicles([]); setVehicleId(""); }}>Đổi</Button>
        </div> : <>
          <SearchInput className="sm:max-w-none" value={search} onChange={setSearch} placeholder="Gõ tên hoặc số điện thoại (từ 2 ký tự)…" label="Tìm khách hàng"/>
          {term.length >= 2 && <ul className="max-h-48 overflow-y-auto rounded-control border border-cs-border">
            {customers.length ? customers.map(c => <li key={c.id}>
              <button type="button" onClick={() => chooseCustomer(c)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-small hover:bg-cs-hover">
                <span className="min-w-0 flex-1 truncate font-semibold">{c.full_name}</span>
                <span className="text-cs-muted">{c.phone ?? ""}</span>
              </button>
            </li>) : <li className="px-3 py-2 text-small text-cs-muted">Không tìm thấy khách hàng.</li>}
          </ul>}
        </>}
      </div>

      <Field label="Xe" required>
        <Select value={vehicleId} disabled={!customer} onChange={e => setVehicleId(e.target.value)}>
          <option value="">{customer ? (vehicles.length ? "Chọn xe" : "Khách chưa có xe") : "Chọn khách hàng trước"}</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{[v.model?.brand?.name, v.model?.name].filter(Boolean).join(" ")} · {v.license_plate ?? "Chưa có biển"}</option>)}
        </Select>
      </Field>
      <Field label="Loại yêu cầu" required>
        <Select value={type} onChange={e => setType(e.target.value as RequestType)}>
          {(Object.keys(REQUEST_TYPES) as RequestType[]).map(k => <option key={k} value={k}>{REQUEST_TYPES[k].label}</option>)}
        </Select>
      </Field>
      <Field label="Ngày hẹn" required>
        <Input type="date" value={date} min={isoDate(new Date())} onChange={e => setDate(e.target.value)}/>
      </Field>
      <Field label="Giờ hẹn" required hint="Theo khung giờ đặt lịch ở trang Giờ làm việc.">
        <Select value={time} onChange={e => setTime(e.target.value)}>
          <option value="">Chọn giờ</option>
          {slots.morning.length > 0 && <optgroup label="Buổi sáng">{slots.morning.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
          {slots.afternoon.length > 0 && <optgroup label="Buổi chiều">{slots.afternoon.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>}
        </Select>
      </Field>

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-label text-cs-text-2">Dịch vụ dự kiến <span className="font-normal text-cs-muted">(có thể bỏ trống)</span></span>
        <div className="grid max-h-52 gap-1 overflow-y-auto rounded-control border border-cs-border p-1.5 sm:grid-cols-2">
          {services.map(s => {
            const on = picked.includes(s.id);
            return <label key={s.id} className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-small transition-colors ${on ? "bg-cs-soft" : "hover:bg-cs-hover"}`}>
              <input type="checkbox" className="size-4 accent-[var(--cs-accent)]" checked={on}
                onChange={() => setPicked(on ? picked.filter(id => id !== s.id) : [...picked, s.id])}/>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="tabular-nums text-cs-muted">{money(s.base_price)}</span>
            </label>;
          })}
        </div>
        {picked.length > 0 && <p className="text-caption text-cs-muted">Đã chọn {picked.length} dịch vụ · tạm tính <b className="text-cs-text">{money(total)}</b></p>}
      </div>

      <Field label="Mô tả triệu chứng / yêu cầu" optional className="md:col-span-2">
        <Textarea value={symptom} maxLength={2000} onChange={e => setSymptom(e.target.value)} placeholder="Ví dụ: xe kêu ở gầm khi qua gờ giảm tốc, muốn kiểm tra thêm phanh…"/>
      </Field>
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg md:col-span-2">{error}</p>}
    </div>
  </Modal>;
}

const QUICK_REASONS = ["Khách báo bận, hẹn lại sau", "Khách đặt trùng lịch", "Gara quá tải khung giờ này", "Không liên lạc được với khách"];

/** Huỷ lịch: bắt buộc lý do (lưu vào lịch sử, khách thấy được). */
export function CancelAppointmentModal({ appointment, onClose, onDone }: {
  appointment: AppointmentRow | null; onClose: () => void; onDone: () => void;
}) {
  const { notify } = useAppFeedback();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!saving) { setReason(""); setError(""); onClose(); } };
  const submit = async () => {
    if (!appointment) return;
    if (reason.trim().length < 3) return setError("Nhập lý do huỷ (ít nhất 3 ký tự).");
    setSaving(true);
    try {
      await catalogAdminApi.cancelAppointment(appointment.id, reason.trim());
      notify(`Đã huỷ lịch hẹn ${appointment.appointment_code} của ${appointment.customer?.full_name ?? "khách"}. Lý do: ${reason.trim()}.`, "success");
      setReason("");
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Không huỷ được lịch hẹn."));
    } finally {
      setSaving(false);
    }
  };
  return <Modal open={appointment !== null} onClose={close} dismissible={!saving} size="sm" title="Huỷ lịch hẹn"
    description={appointment ? `${appointment.appointment_code} · ${appointment.customer?.full_name ?? "Khách hàng"}` : undefined}
    footer={<>
      <Button disabled={saving} onClick={close}>Giữ lịch</Button>
      <Button variant="danger" icon="x" loading={saving} loadingText="Đang huỷ..." onClick={() => void submit()}>Huỷ lịch</Button>
    </>}>
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_REASONS.map(r => <button key={r} type="button" onClick={() => { setReason(r); setError(""); }}
          className={`cursor-pointer rounded-full border px-3 py-1 text-caption transition-colors ${reason === r ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-cs-border text-cs-text-2 hover:bg-cs-soft-hover hover:text-cs-on-soft"}`}>{r}</button>)}
      </div>
      <Field label="Lý do huỷ" required error={error || undefined}>
        <Textarea value={reason} maxLength={255} onChange={e => { setReason(e.target.value); setError(""); }} placeholder="Lý do sẽ được lưu vào lịch sử lịch hẹn."/>
      </Field>
    </div>
  </Modal>;
}
