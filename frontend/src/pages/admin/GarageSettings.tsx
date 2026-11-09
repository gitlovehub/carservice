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
      <EmptyState icon="tools" title="Trang đang nâng cấp, bảo trì"
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void garageApi.get().then(data => { if (active && data) { setForm({ ...empty, ...data }); setSaved({ ...empty, ...data }); } });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setError("");
    try {
      await garageApi.save({ ...form, phone: form.phone || null, email: form.email || null });
      notify("Đã lưu thông tin gara. Khách thấy địa chỉ mới ở chân trang và trang Liên hệ.", "success");
      setSaved(form);
      setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Không lưu được."); }
    finally { setSaving(false); }
  }

  const cancel = () => { setForm(saved); setError(""); setEditing(false); };

  const field = "mt-1 w-full rounded-xl border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none focus:border-cs-accent disabled:cursor-not-allowed disabled:opacity-70";
  const hasCoords = form.latitude != null && form.longitude != null;
  return <main className="page-container">
    <PageHeader title="Thông tin gara" description="Tên, liên hệ và địa chỉ gara. Bấm “Sửa” để chỉnh, gõ địa chỉ rồi chọn từ gợi ý để có vị trí chính xác trên bản đồ."/>
    <form className="max-w-3xl space-y-4 rounded-2xl border border-cs-border bg-cs-surface p-5" onSubmit={event => void save(event)} data-testid="garage-settings">
      <fieldset disabled={!editing || saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-cs-muted sm:col-span-1">Tên gara<input className={field} required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
        <label className="block text-xs font-semibold text-cs-muted">Số điện thoại<input className={field} inputMode="tel" maxLength={30} value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
        <label className="block text-xs font-semibold text-cs-muted">Email<input className={field} type="email" maxLength={150} value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
      </div>
      <AddressAutocomplete
        label="Địa chỉ (số nhà, đường)" required value={form.address_line ?? ""}
        onChange={text => setForm(current => ({ ...current, address_line: text, latitude: null, longitude: null, place_id: null, place_provider: null }))}
        onSelect={item => {
          // Tách phần phụ "Phường, Quận, Tỉnh" từ gợi ý để điền sẵn; Admin vẫn sửa được.
          const parts = item.secondary_text.split(",").map(part => part.trim()).filter(Boolean);
          setForm(current => ({
            ...current, address_line: item.main_text, latitude: item.latitude, longitude: item.longitude,
            place_id: item.place_id ?? null, place_provider: item.provider,
            province: parts.at(-1) ?? current.province, district: parts.at(-2) ?? current.district, ward: parts.length >= 3 ? parts.at(-3) ?? current.ward : current.ward,
          }));
        }}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-cs-muted">Phường / Xã<input className={field} maxLength={120} value={form.ward ?? ""} onChange={e => setForm({ ...form, ward: e.target.value })}/></label>
        <label className="block text-xs font-semibold text-cs-muted">Quận / Huyện<input className={field} maxLength={120} value={form.district ?? ""} onChange={e => setForm({ ...form, district: e.target.value })}/></label>
        <label className="block text-xs font-semibold text-cs-muted">Tỉnh / Thành phố<input className={field} maxLength={120} value={form.province ?? ""} onChange={e => setForm({ ...form, province: e.target.value })}/></label>
      </div>
      <p className="text-xs text-cs-muted" data-testid="garage-coords">{hasCoords
        ? <>Vị trí: {form.latitude?.toFixed(6)}, {form.longitude?.toFixed(6)} · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=18/${form.latitude}/${form.longitude}`}>Xem trên bản đồ</a></>
        : "Chưa có vị trí — chọn một địa chỉ từ gợi ý để lấy tọa độ."}</p>
      </fieldset>
      {error && <p role="alert" className="text-sm font-semibold text-cs-danger">{error}</p>}
      {editing
        ? <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={cancel}>Huỷ</Button>
          <Button type="submit" variant="primary" icon="check" loading={saving}>Lưu thông tin gara</Button>
        </div>
        : <Button key="edit" type="button" variant="outline" icon="edit" onClick={() => setEditing(true)}>Sửa</Button>}
    </form>
  </main>;
}