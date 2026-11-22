import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Field, FieldError, Input } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import type { CounterVehicle } from "../../services/workflowService";
import { formatLicensePlate } from "../../services/licensePlate";
import { formatVin, vehicleTitle, type NewCustomerDraft, type NewVehicleDraft } from "./counterForms";

/**
 * Ô nhập xe chưa có trong hệ thống (ADV-03): hãng → dòng → phiên bản, biển số, năm.
 * `atReception`: tiếp nhận xe bắt buộc năm + VIN, biển số không bắt buộc (PO 22/11/2026).
 */
export function NewVehicleFields({ value, onChange, errors = {}, onClearError, atReception = false }: {
  value: NewVehicleDraft; onChange: (next: NewVehicleDraft) => void; errors?: Record<string, string>; onClearError?: (key: string) => void; atReception?: boolean;
}) {
  return <div className="space-y-3">
    <div role="group" aria-label="Hãng và dòng xe" aria-invalid={!!errors.vehicleModel || undefined} className={errors.vehicleModel ? "rounded-xl border border-danger p-3" : undefined}>
      <VehicleSelector value={value.selection} onChange={selection => { onChange({ ...value, selection }); onClearError?.("vehicleModel"); }}/>
      <FieldError className="mt-1.5">{errors.vehicleModel}</FieldError>
    </div>
    {/* Cùng lưới 3 cột với Hãng / Dòng / Phiên bản → 5 ô thẳng cột, đều nhau. */}
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Biển số" required={!atReception} optional={atReception} error={errors.vehiclePlate}><Input value={value.plate} maxLength={12} className="uppercase" placeholder="VD: 51K-123.45" onChange={e => { onChange({ ...value, plate: formatLicensePlate(e.target.value) }); onClearError?.("vehiclePlate"); }}/></Field>
      <Field label="Năm sản xuất" required={atReception} optional={!atReception} error={errors.vehicleYear}><Input inputMode="numeric" maxLength={4} value={value.year} placeholder="VD: 2020" onChange={e => { onChange({ ...value, year: e.target.value.replace(/\D/g, "") }); onClearError?.("vehicleYear"); }}/></Field>
      {atReception && <Field label="Số VIN" required error={errors.vehicleVin}><Input value={value.vin} maxLength={17} className="uppercase" placeholder="6–17 ký tự" onChange={e => { onChange({ ...value, vin: formatVin(e.target.value) }); onClearError?.("vehicleVin"); }}/></Field>}
    </div>
  </div>;
}

/** Ô nhập khách vãng lai mới (ADV-02). */
export function NewCustomerFields({ value, onChange, errors = {}, onClearError }: {
  value: NewCustomerDraft; onChange: (next: NewCustomerDraft) => void; errors?: Record<string, string>; onClearError?: (key: string) => void;
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Họ tên khách" required error={errors.newName}><Input value={value.name} maxLength={100} onChange={e => { onChange({ ...value, name: e.target.value }); onClearError?.("newName"); }}/></Field>
    <Field label="Số điện thoại" required error={errors.newPhone}><Input inputMode="tel" value={value.phone} maxLength={20} onChange={e => { onChange({ ...value, phone: e.target.value }); onClearError?.("newPhone"); }}/></Field>
    <Field label="Email" optional error={errors.newEmail} hint="Dùng để khách nhận mã xác nhận biên bản / báo giá tại quầy." className="sm:col-span-2"><Input type="email" value={value.email} maxLength={150} onChange={e => { onChange({ ...value, email: e.target.value }); onClearError?.("newEmail"); }}/></Field>
  </div>;
}

function ChoiceCard({ checked, disabled, onSelect, name, icon, title, subtitle, dashed }: {
  checked: boolean; disabled?: boolean; onSelect: () => void; name: string; icon: ReactNode; title: string; subtitle?: string; dashed?: boolean;
}) {
  return <label className={`flex items-center gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cs-accent ${dashed ? "border-dashed" : ""}
    ${disabled ? "cursor-not-allowed border-cs-border bg-cs-surface-2 opacity-70" : checked ? "cursor-pointer border-cs-accent bg-cs-soft" : "cursor-pointer border-cs-border bg-cs-surface hover:bg-cs-hover"}`}>
    <input type="radio" name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onSelect}/>
    {icon}
    <span className="min-w-0 flex-1">
      <span className="block font-semibold tracking-wide text-cs-text">{title}</span>
      {subtitle && <span className="block truncate text-caption text-cs-muted">{subtitle}</span>}
    </span>
    {!disabled && <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-cs-accent" : "border-cs-border-strong"}`}>{checked && <span className="size-2.5 rounded-full bg-cs-accent"/>}</span>}
  </label>;
}

const VISIBLE = 6;

/**
 * Chọn xe khách mang tới (ADV-02/03): xe có sẵn của khách (xe đang có phiếu chưa xong bị khóa),
 * hoặc "xe chưa có trong hệ thống" → nhập hãng / dòng / biển số. Danh sách dài thu gọn còn 6 xe.
 */
export function VehicleChoiceList({ name, vehicles, value, onChange, newVehicle, onNewVehicleChange, bookedVehicleId, newLabel = "Xe chưa có trong hệ thống", allowNew = true, errors = {}, onClearError, atReception = false }: {
  errors?: Record<string, string>; onClearError?: (key: string) => void; atReception?: boolean;
  name: string; vehicles: CounterVehicle[]; value: number | "new" | null; onChange: (next: number | "new") => void;
  newVehicle: NewVehicleDraft; onNewVehicleChange: (next: NewVehicleDraft) => void; bookedVehicleId?: number | null; newLabel?: string;
  /** false: chỉ chọn xe đã có (xe mới nhập ở nơi khác, ví dụ modal trang Tiếp nhận). */
  allowNew?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Xe đang chọn / xe đặt lịch luôn hiện trong phần thu gọn.
  const pinned = vehicles.filter(v => v.id === value || v.id === bookedVehicleId);
  // Xe đang có phiếu chưa xong (không chọn được) xuống cuối.
  const rest = vehicles.filter(v => !pinned.includes(v)).sort((a, b) => Number(!!a.open_repair_order_code) - Number(!!b.open_repair_order_code));
  const shown = expanded ? [...pinned, ...rest] : [...pinned, ...rest].slice(0, Math.max(VISIBLE, pinned.length));
  const hidden = vehicles.length - shown.length;

  return <div className={`space-y-2 ${errors.vehicle ? "rounded-xl border border-danger p-2" : ""}`} role="radiogroup" aria-label="Xe khách mang tới" aria-invalid={!!errors.vehicle || undefined}>
    <FieldError>{errors.vehicle}</FieldError>
    {shown.map(v => <ChoiceCard key={v.id} name={name} checked={value === v.id} disabled={!!v.open_repair_order_code} onSelect={() => { onChange(v.id); onClearError?.("vehicle"); }}
      icon={<VehicleBrandLogo brand={v.model?.brand?.name} size={36}/>}
      title={v.license_plate || "xxx.xx"}
      subtitle={[vehicleTitle(v), v.year ? String(v.year) : "", v.id === bookedVehicleId ? "xe đặt lịch" : "", v.open_repair_order_code ? `đang có phiếu ${v.open_repair_order_code}` : ""].filter(Boolean).join(" · ")}/>)}
    {hidden > 0 && <Button size="sm" variant="ghost" icon="chevron-down" onClick={() => setExpanded(true)}>Xem thêm {hidden} xe</Button>}
    {allowNew && <ChoiceCard name={name} dashed checked={value === "new"} onSelect={() => { onChange("new"); onClearError?.("vehicle"); }}
      icon={<span className="grid size-9 place-items-center rounded-full bg-cs-surface-2 text-cs-muted"><Icon name="plus" size={18}/></span>} title={newLabel}/>}
    {allowNew && value === "new" && <div className="rounded-xl border border-cs-border p-4"><NewVehicleFields value={newVehicle} onChange={onNewVehicleChange} errors={errors} onClearError={onClearError} atReception={atReception}/></div>}
  </div>;
}
