import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Field, Input, SearchInput, Textarea } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import {
  bookingApi, capacityApi, formatVnd, toNumber, workflowApi,
  type BookingAvailability, type BookingPackage, type CapacityDay, type CatalogService, type CounterCustomer, type CounterVehicle,
} from "../../services/workflowService";
import { foldText } from "../../services/vehicleCatalog";
import { CustomerVehiclePicker } from "./CustomerVehiclePicker";
import { emptyPick, pickError, pickPayload, vehicleTitle, type CounterPick } from "./counterForms";
import { card, Notice, WorkflowTitle } from "./WorkflowUI";
import { capacityText, errorText } from "./workflowFormat";

/**
 * ADV-04 — Cố vấn đặt lịch hộ (khách gọi điện / nhắn tin): khách + xe (có sẵn hoặc mới), dịch vụ / gói, ngày + khung giờ.
 * Khung giờ lấy đúng các khung Admin cấu hình, kèm tình trạng còn chỗ; vượt công suất ngày chỉ cảnh báo (Q6).
 * Lịch tạo ở trạng thái Chờ xác nhận → chuyển sang Tiếp nhận để xác nhận với khách.
 */

const isoDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const SLOT_TEXT = { full: "Hết chỗ", closed: "Ngoài giờ", past: "Đã qua" } as const;

type AvailabilityResult = { date: string; data?: BookingAvailability; error?: string };

export default function CreateBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, notify } = useAppFeedback();
  // Mở từ trang Khách hàng ("Đặt lịch hộ") → chọn sẵn khách.
  const [pick, setPick] = useState<CounterPick>(() => {
    const preset = (location.state as { customer?: CounterCustomer } | null)?.customer;
    return preset ? { ...emptyPick, customer: preset } : emptyPick;
  });
  const [ownVehicles, setOwnVehicles] = useState<CounterVehicle[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [serviceError, setServiceError] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [packages, setPackages] = useState<{ modelId: number | null; list: BookingPackage[] } | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [symptom, setSymptom] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(isoDay(1));
  const [time, setTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [capacity, setCapacity] = useState<{ date: string; day: CapacityDay | null } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    workflowApi.services().then(list => { if (active) setServices(list.filter(s => (s.status ?? "ACTIVE") === "ACTIVE")); }).catch(err => { if (active) setServiceError(errorText(err)); });
    return () => { active = false; };
  }, []);

  // Dòng xe của lựa chọn hiện tại → lọc gói bảo dưỡng phù hợp.
  const modelId = pick.vehicleId === "new" ? pick.newVehicle.selection.modelId
    : typeof pick.vehicleId === "number" ? ownVehicles.find(v => v.id === pick.vehicleId)?.model?.id ?? null : null;
  useEffect(() => {
    if (pick.vehicleId === null) return;
    let active = true;
    bookingApi.packages(modelId).then(list => { if (active) setPackages({ modelId, list }); }).catch(() => { if (active) setPackages({ modelId, list: [] }); });
    return () => { active = false; };
  }, [modelId, pick.vehicleId]);
  const packageList = packages?.modelId === modelId ? packages.list : [];
  const selectedPackage = packageList.find(p => p.id === packageId) ?? null;

  useEffect(() => {
    let active = true;
    bookingApi.availability(date)
      .then(data => { if (active) setAvailability({ date, data }); })
      .catch(err => { if (active) setAvailability({ date, error: errorText(err) }); });
    capacityApi.day(date).then(day => { if (active) setCapacity({ date, day }); }).catch(() => { if (active) setCapacity({ date, day: null }); });
    return () => { active = false; };
  }, [date]);
  const slotsFor = availability?.date === date ? availability : null;
  const capacityDay = capacity?.date === date ? capacity.day : null;

  const shownServices = useMemo(() => {
    const needle = foldText(serviceQuery);
    return needle ? services.filter(s => foldText(`${s.name} ${s.category ?? ""}`).includes(needle)) : services;
  }, [services, serviceQuery]);
  const groups = useMemo(() => {
    const map = new Map<string, CatalogService[]>();
    shownServices.forEach(s => map.set(s.category || "Khác", [...(map.get(s.category || "Khác") ?? []), s]));
    return [...map.entries()];
  }, [shownServices]);
  const chosenServices = services.filter(s => serviceIds.includes(s.id));
  const estimate = chosenServices.reduce((sum, s) => sum + toNumber(s.base_price), 0) + toNumber(selectedPackage?.estimated_price);
  const requestType = selectedPackage ? "MAINTENANCE" : chosenServices.length ? "REPAIR" : "DIAGNOSIS";

  const vehicleLabel = pick.vehicleId === "new"
    ? `${pick.newVehicle.plate.trim().toUpperCase() || "Xe mới"} · ${[pick.newVehicle.selection.brandName, pick.newVehicle.selection.modelName].filter(Boolean).join(" ")}`
    : (() => { const v = ownVehicles.find(x => x.id === pick.vehicleId); return v ? `${v.license_plate || "xxx.xx"} · ${vehicleTitle(v)}` : null; })();
  const vehicleBrand = pick.vehicleId === "new" ? pick.newVehicle.selection.brandName : ownVehicles.find(x => x.id === pick.vehicleId)?.model?.brand?.name;
  const customerName = pick.customer === "new" ? pick.newCustomer.name.trim() || "Khách mới" : pick.customer?.full_name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    const invalid = pickError(pick);
    if (invalid) { setError(invalid); return; }
    if (!time) { setError("Chọn khung giờ hẹn."); return; }
    if (!selectedPackage && !chosenServices.length && symptom.trim().length < 5) { setError("Chọn dịch vụ / gói, hoặc ghi tình trạng khách mô tả (ít nhất 5 ký tự) để gara kiểm tra."); return; }
    const approved = await confirm({
      title: "Đặt lịch hộ khách", reference: `${fmtDay(date)} · ${time}`,
      description: `Tạo lịch cho ${customerName} · ${vehicleLabel ?? "—"}. Lịch ở trạng thái Chờ xác nhận; bước tiếp theo là xác nhận lại với khách.${capacityDay?.over_capacity ? " Lưu ý: ngày này đã vượt công suất gara." : ""}`,
      confirmText: "Đặt lịch", checklist: ["Khách đã đồng ý ngày giờ và nội dung qua điện thoại / tin nhắn."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const appointment = await bookingApi.create({
        ...pickPayload(pick),
        appointment_date: date, appointment_time: time, request_type: requestType,
        ...(serviceIds.length ? { service_ids: serviceIds } : {}),
        ...(selectedPackage ? { package_ids: [selectedPackage.id] } : {}),
        ...(symptom.trim() ? { symptom_description: symptom.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      notify(`Đã đặt lịch ${appointment.appointment_code ?? ""} cho khách. Xác nhận lịch với khách để hoàn tất.`, "success");
      navigate(`/advisor/reception?appointment=${appointment.id}`);
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  const ready = pick.customer !== null && pick.vehicleId !== null;
  return <main className="page-container">
    <WorkflowTitle title="Đặt lịch hộ" sub="Khách gọi điện hoặc nhắn tin: chọn khách và xe, nội dung cần làm, rồi chọn khung giờ còn chỗ."/>
    <form onSubmit={event => void submit(event)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="create-booking">
      <div className="min-w-0 space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        <CustomerVehiclePicker value={pick} onChange={setPick} onVehiclesLoaded={setOwnVehicles}/>

        {ready && <section className={card}>
          <h2 className="text-lg font-bold text-cs-text">Nội dung cần làm</h2>
          <p className="mt-1 text-small text-cs-muted">Không bắt buộc chọn dịch vụ — chỉ ghi khách kể nếu khách chưa biết cần làm gì; gara kiểm tra rồi báo giá.</p>
          {packageList.length > 0 && <div className="mt-4">
            <p className="mb-2 text-small font-semibold text-cs-text">Gói bảo dưỡng</p>
            <div className="flex flex-wrap gap-2">
              {packageList.map(p => <button key={p.id} type="button" aria-pressed={packageId === p.id} onClick={() => setPackageId(packageId === p.id ? null : p.id)}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-small transition-colors ${packageId === p.id ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:bg-cs-hover"}`}>
                <b className="block text-cs-text">{p.name}</b>
                <span className="text-caption text-cs-muted">{p.mileage_milestone ? `${p.mileage_milestone.toLocaleString("vi-VN")} km · ` : ""}{formatVnd(p.estimated_price)}</span>
              </button>)}
            </div>
          </div>}
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-small font-semibold text-cs-text">Dịch vụ {serviceIds.length > 0 && <span className="font-normal text-cs-muted">· đã chọn {serviceIds.length}</span>}</p>
              <SearchInput value={serviceQuery} onChange={setServiceQuery} placeholder="Tìm dịch vụ…" label="Tìm dịch vụ" className="w-56"/>
            </div>
            {serviceError && <Notice tone="error">{serviceError}</Notice>}
            {!services.length && !serviceError && <p className="text-small text-cs-muted">Đang tải dịch vụ…</p>}
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {groups.map(([category, list]) => <div key={category}>
                <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-cs-muted">{category}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map(s => { const on = serviceIds.includes(s.id); return <label key={s.id} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-small transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cs-accent ${on ? "border-cs-accent bg-cs-soft" : "border-cs-border hover:bg-cs-hover"}`}>
                    <input type="checkbox" className="mt-0.5 accent-[var(--cs-accent)]" checked={on} onChange={() => setServiceIds(on ? serviceIds.filter(id => id !== s.id) : [...serviceIds, s.id])}/>
                    <span className="min-w-0 flex-1"><span className="block font-medium text-cs-text">{s.name}</span><span className="text-caption text-cs-muted">{formatVnd(s.base_price)}{s.estimated_minutes ? ` · ~${s.estimated_minutes} phút` : ""}</span></span>
                  </label>; })}
                </div>
              </div>)}
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Khách mô tả tình trạng" optional><Textarea rows={3} maxLength={5000} value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="VD: xe kêu khi phanh, đèn check engine sáng"/></Field>
            <Field label="Ghi chú nội bộ" optional><Input maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: khách gọi lúc 9h, muốn chờ lấy xe trong ngày"/></Field>
          </div>
        </section>}

        {ready && <section className={card}>
          <h2 className="text-lg font-bold text-cs-text">Ngày & khung giờ</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Ngày hẹn" required><Input type="date" min={isoDay(0)} value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setTime(null); } }}/></Field>
            <Button variant={date === isoDay(0) ? "tonal" : "outline"} size="sm" onClick={() => { setDate(isoDay(0)); setTime(null); }}>Hôm nay</Button>
            <Button variant={date === isoDay(1) ? "tonal" : "outline"} size="sm" onClick={() => { setDate(isoDay(1)); setTime(null); }}>Ngày mai</Button>
          </div>
          <p className="mt-2 text-caption text-cs-muted">{fmtDay(date)}{slotsFor?.data?.open && slotsFor.data.active ? ` · mở cửa ${slotsFor.data.open}–${slotsFor.data.close} · tối đa ${slotsFor.data.max_slots} xe / khung` : ""}</p>
          {capacityDay?.over_capacity && <div className="mt-3"><Notice>
            Ngày này đã vượt công suất gara ({capacityText(capacityDay.load_minutes, capacityDay.capacity_minutes)}). Vẫn đặt được nếu khách chấp nhận chờ lâu hơn.
            {!!capacityDay.suggestions?.length && <span className="mt-2 flex flex-wrap gap-2">{capacityDay.suggestions.slice(0, 3).map(s => <Button key={s.date} size="sm" variant="outline" onClick={() => { setDate(s.date.slice(0, 10)); setTime(null); }}>{new Date(s.date).toLocaleDateString("vi-VN")}</Button>)}</span>}
          </Notice></div>}
          <div className="mt-4" aria-live="polite">
            {!slotsFor ? <p className="text-small text-cs-muted">Đang tải khung giờ…</p>
              : slotsFor.error ? <Notice tone="error">{slotsFor.error}</Notice>
              : slotsFor.data?.holiday ? <Notice tone="error">Gara nghỉ ngày này: {slotsFor.data.holiday}. Chọn ngày khác.</Notice>
              : !slotsFor.data?.active ? <Notice tone="error">Gara không làm việc ngày này. Chọn ngày khác.</Notice>
              : (["morning", "afternoon"] as const).map(period => <div key={period} className="mb-3">
                <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-cs-muted">{period === "morning" ? "Buổi sáng" : "Buổi chiều"}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={period === "morning" ? "Khung giờ buổi sáng" : "Khung giờ buổi chiều"}>
                  {slotsFor.data?.slots.filter(s => s.period === period).map(s => {
                    const disabled = s.status !== "available";
                    const on = time === s.time;
                    return <button key={s.time} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => setTime(s.time)}
                      className={`min-w-24 rounded-xl border px-3 py-2 text-center transition-colors ${disabled ? "cursor-not-allowed border-cs-border bg-cs-surface-2 text-cs-muted opacity-70" : on ? "cursor-pointer border-cs-accent bg-cs-accent text-cs-accent-contrast" : "cursor-pointer border-cs-border bg-cs-surface text-cs-text hover:border-cs-accent"}`}>
                      <b className="block tabular-nums">{s.time}</b>
                      <span className={`text-caption ${on ? "" : "text-cs-muted"}`}>{disabled ? SLOT_TEXT[s.status as keyof typeof SLOT_TEXT] : `còn ${Math.max(0, (slotsFor.data?.max_slots ?? 0) - s.booked)} chỗ`}</span>
                    </button>;
                  })}
                </div>
              </div>)}
          </div>
        </section>}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <section className={card}>
          <h2 className="text-subheading text-cs-text">Tóm tắt lịch hẹn</h2>
          <dl className="mt-3 space-y-3 text-small">
            <div><dt className="text-caption text-cs-muted">Khách hàng</dt><dd className="font-medium text-cs-text">{customerName ?? "—"}</dd></div>
            <div><dt className="text-caption text-cs-muted">Xe</dt><dd className="flex items-center gap-2 font-medium text-cs-text">{vehicleLabel && <VehicleBrandLogo brand={vehicleBrand} size={24}/>}{vehicleLabel ?? "—"}</dd></div>
            <div><dt className="text-caption text-cs-muted">Nội dung</dt><dd className="text-cs-text">{selectedPackage || chosenServices.length
              ? <ul className="space-y-0.5">{selectedPackage && <li>• {selectedPackage.name}</li>}{chosenServices.map(s => <li key={s.id}>• {s.name}</li>)}</ul>
              : symptom.trim() ? "Kiểm tra theo mô tả của khách" : "—"}</dd></div>
            <div><dt className="text-caption text-cs-muted">Thời gian</dt><dd className="font-medium text-cs-text">{time ? `${time} · ${fmtDay(date)}` : "Chưa chọn khung giờ"}</dd></div>
            {estimate > 0 && <div className="border-t border-cs-border pt-3"><dt className="text-caption text-cs-muted">Ước tính (giá niêm yết)</dt><dd className="text-lg font-bold text-cs-text">{formatVnd(estimate)}</dd><dd className="text-caption text-cs-muted">Giá chính thức chốt ở báo giá sau khi kiểm tra.</dd></div>}
          </dl>
          <Button type="submit" variant="primary" icon="calendar" className="mt-5 w-full" loading={working} loadingText="Đang đặt lịch..." disabled={!ready || !time}>Đặt lịch</Button>
          <p className="mt-2 flex items-start gap-1.5 text-caption text-cs-muted"><Icon name="info" size={14} className="mt-0.5 shrink-0"/>Lịch tạo ở trạng thái Chờ xác nhận. Sau khi đặt, xác nhận lại với khách ở trang Tiếp nhận.</p>
        </section>
      </aside>
    </form>
  </main>;
}
