import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";
import { useEffect, useState, type FormEvent } from "react";
import { Button, EmptyState, PageHeader } from "../../components/ui";
import { AddressAutocomplete } from "../../components/address/AddressAutocomplete";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { garageApi, type GarageInfo } from "../../services/garageService";

type Form = GarageInfo & { place_provider?: string | null; place_id?: string | null };
const empty: Form = { name: "CarService", phone: "", email: "", address_line: "", ward: "", district: "", province: "", latitude: null, longitude: null };

/** Tạm đóng trang để nâng cấp. Đổi về `false` để mở lại form (code form vẫn giữ nguyên bên dưới). */
const UNDER_MAINTENANCE = true;

/** Admin: thông tin gara hiển thị cho khách (Footer, Liên hệ) — hiện đang tạm đóng để bảo trì. */
export default function GarageSettings() {
  if (UNDER_MAINTENANCE) return <main className="page-container">
    <PageHeader title="Thông tin gara"/>
    <div className="rounded-card border border-cs-border bg-cs-surface shadow-card" data-testid="garage-settings-maintenance">
      <EmptyState icon="wrench" title="Trang đang nâng cấp, bảo trì"
        description="Chức năng chỉnh sửa thông tin gara tạm thời chưa sử dụng được. Thông tin hiện tại vẫn hiển thị bình thường cho khách. Vui lòng quay lại sau."/>
    </div>
  </main>;
  return <GarageSettingsForm/>;
}

/** Form thông tin gara. Địa chỉ chọn từ gợi ý bản đồ để có tọa độ chính xác. */
function GarageSettingsForm() {
  const [form, setForm] = useState<Form>(empty);
  const [saved, setSaved] = useState<Form>(empty); // bản đã lưu — dùng khi bấm Huỷ
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { notify } = useAppFeedback();
  const fieldErrors = useFieldErrors();
  const patchField = (patch: Partial<Form>) => { fieldErrors.clear(...Object.keys(patch)); setForm(current => ({ ...current, ...patch })); };

  useEffect(() => {
    let active = true;
    void garageApi.get().then(data => { if (active && data) { setForm({ ...empty, ...data }); setSaved({ ...empty, ...data }); } });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const problems: FieldErrors = {};
    if (!form.name.trim()) problems.name = "Nhập tên gara.";
    if (form.email?.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) problems.email = "Email không hợp lệ.";
    if (!form.address_line?.trim()) problems.address_line = "Nhập địa chỉ gara.";
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    try {
      await garageApi.save({ ...form, phone: form.phone || null, email: form.email || null });
      notify("Đã lưu thông tin gara. Khách thấy địa chỉ mới ở chân trang và trang Liên hệ.", "success");
      setSaved(form);
      setEditing(false);
    } catch (err) { fieldErrors.showApi(err, { name: "name", phone: "phone", email: "email", address_line: "address_line", ward: "ward", district: "district", province: "province" }); }
    finally { setSaving(false); }
  }

  const cancel = () => { setForm(saved); fieldErrors.reset(); setEditing(false); };

  const field = "mt-1 w-full rounded-xl border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none focus:border-cs-accent disabled:cursor-not-allowed disabled:opacity-70";
  const hasCoords = form.latitude != null && form.longitude != null;
  return <main className="page-container">
    <PageHeader title="Thông tin gara" description="Tên, liên hệ và địa chỉ gara. Bấm “Sửa” để chỉnh, gõ địa chỉ rồi chọn từ gợi ý để có vị trí chính xác trên bản đồ."/>
    <form noValidate className="max-w-3xl space-y-4 rounded-2xl border border-cs-border bg-cs-surface p-5" onSubmit={event => void save(event)} data-testid="garage-settings">
      <fieldset disabled={!editing || saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-cs-muted sm:col-span-1">Tên gara<input className={field} required maxLength={150} value={form.name} aria-invalid={!!fieldErrors.errors.name || undefined} onChange={e => patchField({ name: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.name}</FieldError></label>
        <label className="block text-xs font-semibold text-cs-muted">Số điện thoại<input className={field} inputMode="tel" maxLength={30} value={form.phone ?? ""} aria-invalid={!!fieldErrors.errors.phone || undefined} onChange={e => patchField({ phone: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.phone}</FieldError></label>
        <label className="block text-xs font-semibold text-cs-muted">Email<input className={field} type="email" maxLength={150} value={form.email ?? ""} aria-invalid={!!fieldErrors.errors.email || undefined} onChange={e => patchField({ email: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.email}</FieldError></label>
      </div>
      <div role="group" aria-label="Địa chỉ gara" aria-invalid={!!fieldErrors.errors.address_line || undefined} className={fieldErrors.errors.address_line ? "rounded-xl border border-danger p-3" : undefined}>
      <AddressAutocomplete
        label="Địa chỉ (số nhà, đường)" required value={form.address_line ?? ""}
        onChange={text => patchField({ address_line: text, latitude: null, longitude: null, place_id: null, place_provider: null })}
        onSelect={item => {
          // Tách phần phụ "Phường, Quận, Tỉnh" từ gợi ý để điền sẵn; Admin vẫn sửa được.
          const parts = item.secondary_text.split(",").map(part => part.trim()).filter(Boolean);
          fieldErrors.clear("address_line");
          setForm(current => ({
            ...current, address_line: item.main_text, latitude: item.latitude, longitude: item.longitude,
            place_id: item.place_id ?? null, place_provider: item.provider,
            province: parts.at(-1) ?? current.province, district: parts.at(-2) ?? current.district, ward: parts.length >= 3 ? parts.at(-3) ?? current.ward : current.ward,
          }));
        }}
      />
      <FieldError className="mt-1">{fieldErrors.errors.address_line}</FieldError>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-cs-muted">Phường / Xã<input className={field} maxLength={120} value={form.ward ?? ""} aria-invalid={!!fieldErrors.errors.ward || undefined} onChange={e => patchField({ ward: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.ward}</FieldError></label>
        <label className="block text-xs font-semibold text-cs-muted">Quận / Huyện<input className={field} maxLength={120} value={form.district ?? ""} aria-invalid={!!fieldErrors.errors.district || undefined} onChange={e => patchField({ district: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.district}</FieldError></label>
        <label className="block text-xs font-semibold text-cs-muted">Tỉnh / Thành phố<input className={field} maxLength={120} value={form.province ?? ""} aria-invalid={!!fieldErrors.errors.province || undefined} onChange={e => patchField({ province: e.target.value })}/><FieldError className="mt-1">{fieldErrors.errors.province}</FieldError></label>
      </div>
      <p className="text-xs text-cs-muted" data-testid="garage-coords">{hasCoords
        ? <>Vị trí: {form.latitude?.toFixed(6)}, {form.longitude?.toFixed(6)} · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=18/${form.latitude}/${form.longitude}`}>Xem trên bản đồ</a></>
        : "Chưa có vị trí — chọn một địa chỉ từ gợi ý để lấy tọa độ."}</p>
      </fieldset>
      {editing
        ? <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={cancel}>Huỷ</Button>
          <Button type="submit" variant="primary" icon="check" loading={saving}>Lưu thông tin gara</Button>
        </div>
        : <Button key="edit" type="button" variant="outline" icon="edit" onClick={() => setEditing(true)}>Sửa</Button>}
    </form>
  </main>;
}