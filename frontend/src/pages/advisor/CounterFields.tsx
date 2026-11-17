import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { VehicleSelector } from "../../components/vehicle/VehicleSelector";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import type { CounterVehicle } from "../../services/workflowService";
import { vehicleTitle, type NewCustomerDraft, type NewVehicleDraft } from "./counterForms";

/** Ô nhập xe chưa có trong hệ thống (ADV-03): hãng → dòng → phiên bản, biển số, năm. */
export function NewVehicleFields({ value, onChange }: { value: NewVehicleDraft; onChange: (next: NewVehicleDraft) => void }) {
  return <div className="space-y-3">
    <VehicleSelector value={value.selection} onChange={selection => onChange({ ...value, selection })}/>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
      <Field label="Biển số" required><Input value={value.plate} maxLength={20} className="uppercase" placeholder="VD: 51K-123.45" onChange={e => onChange({ ...value, plate: e.target.value })}/></Field>
      <Field label="Năm sản xuất" optional><Input inputMode="numeric" maxLength={4} value={value.year} placeholder="VD: 2020" onChange={e => onChange({ ...value, year: e.target.value.replace(/\D/g, "") })}/></Field>
    </div>
  </div>;
}

/** Ô nhập khách vãng lai mới (ADV-02). */
export function NewCustomerFields({ value, onChange }: { value: NewCustomerDraft; onChange: (next: NewCustomerDraft) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Họ tên khách" required><Input value={value.name} maxLength={100} onChange={e => onChange({ ...value, name: e.target.value })}/></Field>
    <Field label="Số điện thoại" required><Input inputMode="tel" value={value.phone} maxLength={20} onChange={e => onChange({ ...value, phone: e.target.value })}/></Field>
    <Field label="Email" optional hint="Dùng để khách nhận mã xác nhận biên bản / báo giá tại quầy." className="sm:col-span-2"><Input type="email" value={value.email} maxLength={150} onChange={e => onChange({ ...value, email: e.target.value })}/></Field>
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
export function VehicleChoiceList({ name, vehicles, value, onChange, newVehicle, onNewVehicleChange, bookedVehicleId, newLabel = "Xe chưa có trong hệ thống" }: {
  name: string; vehicles: CounterVehicle[]; value: number | "new" | null; onChange: (next: number | "new") => void;
  newVehicle: NewVehicleDraft; onNewVehicleChange: (next: NewVehicleDraft) => void; bookedVehicleId?: number | null; newLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // Xe đang chọn / xe đặt lịch luôn hiện trong phần thu gọn.
  const pinned = vehicles.filter(v => v.id === value || v.id === bookedVehicleId);
  // Xe đang có phiếu chưa xong (không chọn được) xuống cuối.
  const rest = vehicles.filter(v => !pinned.includes(v)).sort((a, b) => Number(!!a.open_repair_order_code) - Number(!!b.open_repair_order_code));
  const shown = expanded ? [...pinned, ...rest] : [...pinned, ...rest].slice(0, Math.max(VISIBLE, pinned.length));
  const hidden = vehicles.length - shown.length;

  return <div className="space-y-2" role="radiogroup" aria-label="Xe khách mang tới">
    {shown.map(v => <ChoiceCard key={v.id} name={name} checked={value === v.id} disabled={!!v.open_repair_order_code} onSelect={() => onChange(v.id)}
      icon={<VehicleBrandLogo brand={v.model?.brand?.name} size={36}/>}
      title={v.license_plate || "xxx.xx"}
      subtitle={[vehicleTitle(v), v.year ? String(v.year) : "", v.id === bookedVehicleId ? "xe đặt lịch" : "", v.open_repair_order_code ? `đang có phiếu ${v.open_repair_order_code}` : ""].filter(Boolean).join(" · ")}/>)}
    {hidden > 0 && <Button size="sm" variant="ghost" icon="chevron-down" onClick={() => setExpanded(true)}>Xem thêm {hidden} xe</Button>}
    <ChoiceCard name={name} dashed checked={value === "new"} onSelect={() => onChange("new")}
      icon={<span className="grid size-9 place-items-center rounded-full bg-cs-surface-2 text-cs-muted"><Icon name="plus" size={18}/></span>} title={newLabel}/>
    {value === "new" && <div className="rounded-xl border border-cs-border p-4"><NewVehicleFields value={newVehicle} onChange={onNewVehicleChange}/></div>}
  </div>;
}
