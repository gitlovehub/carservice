import type { ReactNode } from "react";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { KmInput } from "../../components/ui/QuantityStepper";
import { staysOvernight, type WorkflowOrder } from "../../services/workflowService";
import CustomerRequestSummary from "./CustomerRequestSummary";
import { formatVin, type ReceptionDraft, type ReceptionVehicle } from "./counterForms";

/**
 * Ghi nhận khi tiếp nhận xe — một cấu trúc dùng chung cho Tiếp nhận và Phiếu sửa chữa:
 *   Thông số xe (ODO, năm, VIN) · Khách yêu cầu (lời khách) · Tình trạng xe (gara quan sát).
 */

/** Ô nhập của phần ghi nhận. Xe có sẵn đã có năm / VIN thì chỉ hiển thị, không cho sửa ở đây. */
export function ReceptionFields({ value, onChange, errors, onClearError, vehicle, isNewVehicle, hasBooking }: {
  value: ReceptionDraft; onChange: (next: ReceptionDraft) => void; errors: Record<string, string>; onClearError: (key: string) => void;
  vehicle: ReceptionVehicle | null; isNewVehicle: boolean; hasBooking: boolean;
}) {
  const set = (key: keyof ReceptionDraft, text: string, errorKey: string = key) => { onChange({ ...value, [key]: text }); onClearError(errorKey); };
  const lastMileage = !isNewVehicle && vehicle?.mileage != null ? `Lần ghi gần nhất: ${vehicle.mileage.toLocaleString("vi-VN")} km.` : undefined;

  return <div className="space-y-5">
    <div>
      <p className="mb-3 text-small font-bold text-cs-text">Thông số xe</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Số ODO (km)" required error={errors.mileage} hint={lastMileage}><KmInput label="Số ODO" invalid={!!errors.mileage} value={value.mileage} onChange={next => set("mileage", next)}/></Field>
        {!isNewVehicle && <Field label="Năm sản xuất" required error={errors.receptionYear}>
          {vehicle?.year ? <Input value={String(vehicle.year)} readOnly disabled/>
            : <Input inputMode="numeric" maxLength={4} value={value.year} placeholder="VD: 2020" onChange={e => set("year", e.target.value.replace(/\D/g, ""), "receptionYear")}/>}
        </Field>}
        {!isNewVehicle && <Field label="Số VIN" required error={errors.receptionVin}>
          {vehicle?.vin ? <Input value={vehicle.vin} readOnly disabled/>
            : <Input maxLength={17} className="uppercase" value={value.vin} placeholder="6–17 ký tự" onChange={e => set("vin", formatVin(e.target.value), "receptionVin")}/>}
        </Field>}
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Field label={hasBooking ? "Khách yêu cầu thêm tại quầy" : "Khách yêu cầu / mô tả"} optional error={errors.customerRequest} hint="Ghi đúng lời khách. Khách xem được.">
        <Textarea rows={3} maxLength={2000} value={value.customerRequest} onChange={e => set("customerRequest", e.target.value)} placeholder="VD: xe kêu khi phanh, muốn thay dầu"/>
      </Field>
      <Field label="Tình trạng xe khi nhận" optional error={errors.condition} hint="Gara quan sát, không ghi yêu cầu của khách ở đây. Khách xem được.">
        <Textarea rows={3} maxLength={2000} value={value.condition} onChange={e => set("condition", e.target.value)} placeholder="VD: đèn báo động cơ sáng, lốp trước mòn"/>
      </Field>
    </div>
  </div>;
}

function NoteBlock({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return <section className="cs-info-panel min-w-0 p-4">
    <h3 className="mb-2 flex flex-wrap items-center gap-2 text-small font-bold text-cs-text"><Icon name={icon} size={16} className="text-cs-accent-text"/>{title}</h3>
    <div className="whitespace-pre-wrap text-small font-normal text-cs-text">{children}</div>
  </section>;
}

const Empty = () => <span className="font-normal text-cs-muted">—</span>;

/** Hiển thị phần ghi nhận trên phiếu sửa chữa (chi tiết, xem nhanh). */
export function ReceptionNotes({ order }: { order: WorkflowOrder }) {
  const specs: Array<[string, string]> = [
    ["Số ODO", order.mileage_received == null ? "—" : `${order.mileage_received.toLocaleString("vi-VN")} km`],
    ["Năm sản xuất", order.vehicle?.year ? String(order.vehicle.year) : "—"],
    ["Số VIN", order.vehicle?.vin || "—"],
  ];
  return <div className="space-y-3">
    {staysOvernight(order) && <p className="adv-notice text-small"><Icon name="moon" size={17} className="shrink-0 text-cs-accent-text"/><span><b>Xe lưu xưởng qua đêm</b> · đã báo khách trong báo giá, không tính phí.</span></p>}
    <dl className="grid gap-3 sm:grid-cols-3">{specs.map(([label, text]) => <div key={label} className="min-w-0"><dt className="text-caption text-cs-muted">{label}</dt><dd className="mt-0.5 break-all text-small font-semibold tabular-nums text-cs-text">{text}</dd></div>)}</dl>
    <NoteBlock icon="user" title="Khách yêu cầu">
      {order.appointment && <CustomerRequestSummary request={order.appointment}/>}
      {order.customer_request && <p className={order.appointment ? "mt-2 border-t border-cs-border pt-2" : ""}>{order.appointment && <b className="font-semibold">Thêm tại quầy: </b>}{order.customer_request}</p>}
      {!order.appointment && !order.customer_request && <Empty/>}
    </NoteBlock>
    <NoteBlock icon="car" title="Tình trạng xe khi nhận">{order.initial_condition || <Empty/>}</NoteBlock>    {order.vehicle_change_reason && <p className="text-small text-cs-text-2"><span className="text-cs-muted">Lý do đổi xe so với lịch hẹn: </span>{order.vehicle_change_reason}</p>}
  </div>;
}
