import { useState } from "react";
import { Button, Field, Input, Modal, Select, Switch, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { errorMessage } from "../../../services/adminApi";
import {
  catalogAdminApi, money, type AdminService, type ServiceCategory, type ServiceLevel, type ServicePayload,
} from "../../../services/catalogAdminApi";
import { ServiceStepsEditor } from "../ServiceStepsEditor";

const LEVEL_TEXT: Record<ServiceLevel, string> = { QUICK: "Nhanh (không cần chẩn đoán)", STANDARD: "Tiêu chuẩn", MAJOR: "Sửa lớn" };

type Form = { name: string; category_id: string; description: string; base_price: string; estimated_minutes: string; status: boolean; is_visible: boolean; is_popular: boolean; service_level: ServiceLevel };
const toForm = (s: AdminService | null, categoryId: number | null): Form => ({
  name: s?.name ?? "", category_id: String(s?.category_id ?? categoryId ?? ""), description: s?.description ?? "",
  base_price: s ? String(Math.round(Number(s.base_price))) : "", estimated_minutes: s?.estimated_minutes ? String(s.estimated_minutes) : "",
  status: (s?.status ?? "ACTIVE") === "ACTIVE", is_visible: s?.is_visible ?? true, is_popular: s?.is_popular ?? false, service_level: s?.service_level ?? "STANDARD",
});

/** Thêm / sửa dịch vụ. `service = null` → thêm mới (mặc định vào danh mục đang chọn). */
export function ServiceFormModal({ open, service, categories, defaultCategoryId, onClose, onSaved }: {
  open: boolean; service: AdminService | null; categories: ServiceCategory[]; defaultCategoryId: number | null;
  onClose: () => void; onSaved: (service: AdminService) => void;
}) {
  const { notify } = useAppFeedback();
  const [form, setForm] = useState<Form>(() => toForm(service, defaultCategoryId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Form>) => { setForm(f => ({ ...f, ...patch })); setError(""); };

  const submit = async () => {
    const price = Number(form.base_price);
    const minutes = form.estimated_minutes ? Number(form.estimated_minutes) : null;
    if (!form.name.trim()) return setError("Nhập tên dịch vụ.");
    if (form.base_price === "" || !Number.isFinite(price) || price < 0) return setError("Giá cơ bản phải là số không âm.");
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) return setError("Thời gian ước tính phải là số phút lớn hơn 0.");
    const payload: ServicePayload = {
      name: form.name.trim(), category_id: form.category_id ? Number(form.category_id) : null, description: form.description.trim() || null,
      base_price: price, estimated_minutes: minutes, status: form.status ? "ACTIVE" : "INACTIVE", is_visible: form.is_visible,
      is_popular: form.is_popular, service_level: form.service_level,
    };
    setSaving(true);
    try {
      const res = service ? await catalogAdminApi.updateService(service.id, payload) : await catalogAdminApi.createService(payload);
      notify(service ? `Đã cập nhật dịch vụ “${payload.name}” (${money(price)}).` : `Đã thêm dịch vụ “${payload.name}” (${money(price)}).`, "success");
      onSaved(res.data);
    } catch (e) {
      setError(errorMessage(e, "Không lưu được dịch vụ."));
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} dismissible={!saving} size="md" title={service ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}
    footer={<>
      <Button disabled={saving} onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void submit()}>Lưu dịch vụ</Button>
    </>}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tên dịch vụ" required className="sm:col-span-2"><Input value={form.name} maxLength={150} onChange={e => set({ name: e.target.value })}/></Field>
      <Field label="Danh mục">
        <Select value={form.category_id} onChange={e => set({ category_id: e.target.value })}>
          <option value="">Chưa phân loại</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Mức dịch vụ">
        <Select value={form.service_level} onChange={e => set({ service_level: e.target.value as ServiceLevel })}>
          {(Object.keys(LEVEL_TEXT) as ServiceLevel[]).map(l => <option key={l} value={l}>{LEVEL_TEXT[l]}</option>)}
        </Select>
      </Field>
      <Field label="Giá cơ bản (₫)" required><Input type="number" min={0} step={1000} value={form.base_price} onChange={e => set({ base_price: e.target.value })}/></Field>
      <Field label="Thời gian ước tính (phút)" hint="Tự cập nhật theo tổng bước chuẩn nếu có."><Input type="number" min={1} value={form.estimated_minutes} onChange={e => set({ estimated_minutes: e.target.value })}/></Field>
      <Field label="Mô tả ngắn" optional className="sm:col-span-2"><Textarea value={form.description} maxLength={1000} onChange={e => set({ description: e.target.value })} placeholder="Hiện dưới tên dịch vụ, ví dụ: Thay dầu và lọc dầu động cơ."/></Field>
      <div className="flex flex-col divide-y divide-cs-border rounded-control border border-cs-border sm:col-span-2">
        {([
          ["status", "Đang áp dụng", "Tắt = ngừng dịch vụ: không dùng được khi đặt lịch và báo giá."],
          ["is_visible", "Hiển thị cho khách khi đặt lịch", "Tắt = chỉ nhân viên thấy (báo giá, phát sinh)."],
          ["is_popular", "Phổ biến", "Hiện trong nhóm “Phổ biến” ở đầu trang đặt lịch."],
        ] as const).map(([key, label, hint]) => <div key={key} className="flex items-center gap-3 px-3 py-2.5">
          <span className="min-w-0 flex-1"><span className="block text-small font-medium text-cs-text">{label}</span><span className="block text-caption text-cs-muted">{hint}</span></span>
          <Switch checked={form[key]} onChange={v => set({ [key]: v } as Partial<Form>)} label={label}/>
        </div>)}
      </div>
      {!form.status && (service?.active_packages_count ?? 0) > 0 && <p className="rounded-control bg-warning-soft px-3 py-2 text-small text-warning-fg sm:col-span-2">
        Dịch vụ đang nằm trong {service?.active_packages_count} gói bảo dưỡng; khi ngừng, các gói này sẽ không tính dịch vụ này.
      </p>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg sm:col-span-2">{error}</p>}
    </div>
  </Modal>;
}

/** Chi tiết + bước chuẩn của dịch vụ (phút chuẩn cho kỹ thuật viên). */
export function ServiceDetailModal({ service, onClose, onMinutes }: { service: AdminService | null; onClose: () => void; onMinutes: (minutes: number | null) => void }) {
  return <Modal open={service !== null} onClose={onClose} size="md" title={service?.name ?? "Chi tiết dịch vụ"}
    description={service ? `DV-${String(service.id).padStart(3, "0")} · ${service.category ?? "Chưa phân loại"}` : undefined}
    footer={<Button onClick={onClose}>Đóng</Button>}>
    {service && <div className="flex flex-col gap-4 text-small">
      <dl className="grid grid-cols-2 gap-3 rounded-control bg-cs-surface-2 p-3">
        <div><dt className="text-caption text-cs-muted">Giá cơ bản</dt><dd className="font-semibold tabular-nums">{money(service.base_price)}</dd></div>
        <div><dt className="text-caption text-cs-muted">Thời gian ước tính</dt><dd className="font-semibold">{service.estimated_minutes ? `${service.estimated_minutes} phút` : "Chưa xác định"}</dd></div>
        <div><dt className="text-caption text-cs-muted">Mức dịch vụ</dt><dd>{LEVEL_TEXT[service.service_level ?? "STANDARD"]}</dd></div>
        <div><dt className="text-caption text-cs-muted">Trong gói bảo dưỡng</dt><dd>{service.active_packages_count ?? 0} gói</dd></div>
      </dl>
      {service.description && <p className="text-cs-text-2">{service.description}</p>}
      <ServiceStepsEditor serviceId={service.id} onSaved={onMinutes}/>
    </div>}
  </Modal>;
}

