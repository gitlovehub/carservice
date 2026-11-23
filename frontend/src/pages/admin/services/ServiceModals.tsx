import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select, Switch, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { errorMessage } from "../../../services/adminApi";
import {
  catalogAdminApi, money, serviceActivationProblems, type AdminService, type ServiceCategory, type ServiceLevel, type ServicePayload,
} from "../../../services/catalogAdminApi";
import { ServiceStepsEditor } from "../ServiceStepsEditor";
import { useFieldErrors, type FieldErrors } from "../../../components/ui/useFieldErrors";
import { FieldError } from "../../../components/ui/Field";

const LEVEL_TEXT: Record<ServiceLevel, string> = { QUICK: "Nhanh (không cần chẩn đoán)", STANDARD: "Tiêu chuẩn", MAJOR: "Sửa lớn" };

type Form = { name: string; category_id: string; description: string; base_price: string; estimated_minutes: string; status: boolean; is_visible: boolean; service_level: ServiceLevel };
const toForm = (s: AdminService | null, categoryId: number | null): Form => ({
  name: s?.name ?? "", category_id: String(s?.category_id ?? categoryId ?? ""), description: s?.description ?? "",
  base_price: s ? String(Math.round(Number(s.base_price))) : "", estimated_minutes: s?.estimated_minutes ? String(s.estimated_minutes) : "",
  // Dịch vụ mới luôn bắt đầu tắt cả 2 trạng thái; admin bật lần lượt: Đang áp dụng → Hiển thị.
  status: s?.status === "ACTIVE", is_visible: s?.status === "ACTIVE" && (s.is_visible ?? true), service_level: s?.service_level ?? "STANDARD",
});
const priceDigits = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
const groupPrice = (digits: string) => digits.replace(/\B(?=(\d{3})+$)/g, ".");

/** Thêm / sửa dịch vụ. `service = null` → thêm mới (mặc định vào danh mục đang chọn). */
export function ServiceFormModal({ open, service, categories, defaultCategoryId, onClose, onSaved }: {
  open: boolean; service: AdminService | null; categories: ServiceCategory[]; defaultCategoryId: number | null;
  onClose: () => void; onSaved: (service: AdminService) => void;
}) {
  const { confirm, notify } = useAppFeedback();
  const [initialForm] = useState<Form>(() => toForm(service, defaultCategoryId));
  const [form, setForm] = useState<Form>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();
  const set = (patch: Partial<Form>) => { setForm(f => ({ ...f, ...patch })); setError(""); fieldErrors.clear(...Object.keys(patch)); };
  const hasSteps = (service?.steps_count ?? 0) > 0;
  const missing = serviceActivationProblems(form);
  // Bỏ danh mục thì dịch vụ về nháp; tắt Đang áp dụng thì Hiển thị tắt theo.
  const changeCategory = (category_id: string) => set(category_id ? { category_id } : { category_id, status: false, is_visible: false });
  const changeStatus = (on: boolean) => set(on ? { status: true } : { status: false, is_visible: false });

  // Định dạng lại làm con trỏ nhảy về cuối, nên đặt lại đúng vị trí theo số chữ số đứng trước nó.
  const changePrice = (input: HTMLInputElement) => {
    const digitsBefore = priceDigits(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
    const digits = priceDigits(input.value);
    set({ base_price: digits });
    requestAnimationFrame(() => {
      const shown = groupPrice(digits);
      let caret = 0;
      for (let seen = 0; caret < shown.length && seen < digitsBefore; caret++) if (shown[caret] !== ".") seen++;
      input.setSelectionRange(caret, caret);
    });
  };

  // Ảnh minh họa: chọn file → xem trước → tải lên sau khi lưu thông tin dịch vụ.
  const [savedImage, setSavedImage] = useState<string | null>(service?.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  // Giải phóng URL xem trước khi đổi ảnh / đóng form.
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const pickImage = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { fieldErrors.show({ image: "Chỉ nhận ảnh JPG, PNG hoặc WebP." }); input.value = ""; return; }
    if (file.size > 4 * 1024 * 1024) { fieldErrors.show({ image: "Ảnh quá 4 MB, vui lòng chọn ảnh nhỏ hơn." }); input.value = ""; return; }
    fieldErrors.clear("image"); setImageFile(file);
  };

  const removeSavedImage = async () => {
    if (!service || !savedImage) return;
    setSaving(true); setError("");
    try {
      const res = await catalogAdminApi.deleteServiceImage(service.id);
      setSavedImage(null);
      notify(res.message, "success");
      onSaved(res.data);
    } catch (e) {
      fieldErrors.showApi(e);
    } finally {
      setSaving(false);
    }
  };

  const dirty = !!imageFile || JSON.stringify(form) !== JSON.stringify(initialForm);
  const blockers = [
    ...(form.name.trim() ? [] : ["nhập tên dịch vụ"]),
    ...(form.base_price === "" ? ["nhập giá cơ bản"] : []),
    ...(form.estimated_minutes && !/^[1-9]\d*$/.test(form.estimated_minutes) ? ["thời gian ước tính phải là số phút lớn hơn 0"] : []),
    ...(form.status && missing.length ? [`Đang áp dụng cần ${missing.join(", ")}`] : []),
  ];
  const requestClose = async () => {
    if (saving) return;
    if (dirty && !await confirm({ title: "Bỏ thay đổi chưa lưu?", description: "Các thông tin vừa nhập sẽ không được lưu.", confirmText: "Bỏ thay đổi", variant: "danger" })) return;
    onClose();
  };

  const submit = async () => {
    if (!dirty || blockers.length) return;
    const price = Number(form.base_price);
    const minutes = form.estimated_minutes ? Number(form.estimated_minutes) : null;
    const problems: FieldErrors = {};
    if (!form.name.trim()) problems.name = "Nhập tên dịch vụ.";
    if (form.base_price === "" || !Number.isFinite(price) || price < 0) problems.base_price = "Giá cơ bản phải là số không âm.";
    if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) problems.estimated_minutes = "Thời gian ước tính phải là số phút lớn hơn 0.";
    setError("");
    if (fieldErrors.show(problems)) return;
    const payload: ServicePayload = {
      name: form.name.trim(), category_id: form.category_id ? Number(form.category_id) : null, description: form.description.trim() || null,
      base_price: price, estimated_minutes: minutes, status: form.status ? "ACTIVE" : "INACTIVE", is_visible: form.is_visible,
      service_level: form.service_level,
    };
    setSaving(true);
    try {
      // Sửa: chỉ gửi tên khi thật sự đổi — tránh lỗi "tên đã tồn tại" khi chỉ bật/tắt trạng thái, đổi giá…
      const { name, ...rest } = payload;
      const res = service
        ? await catalogAdminApi.updateService(service.id, name === service.name ? rest : payload)
        : await catalogAdminApi.createService(payload);
      let saved = res.data;
      if (imageFile) {
        // Thông tin đã lưu; ảnh lỗi thì báo rõ để admin thử lại, không mất phần đã nhập.
        try {
          saved = (await catalogAdminApi.uploadServiceImage(saved.id, imageFile)).data;
        } catch (e) {
          onSaved(saved);
          throw new Error(`Đã lưu dịch vụ nhưng ảnh chưa được tải lên: ${errorMessage(e)}. Mở lại dịch vụ để thử tải ảnh.`, { cause: e });
        }
      }
      notify(service ? `Đã cập nhật dịch vụ “${payload.name}” (${money(price)}).` : `Đã thêm dịch vụ “${payload.name}” (${money(price)}).`, "success");
      onSaved(saved);
    } catch (e) {
      fieldErrors.showApi(e, { name: "name", category_id: "category_id", description: "description", base_price: "base_price", estimated_minutes: "estimated_minutes", service_level: "service_level", image: "image" });
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={() => void requestClose()} dismissible={!saving} size="md" className="sm:max-w-2xl" title={service ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}
    footer={<>
      <Button disabled={saving} onClick={() => void requestClose()}>Huỷ</Button>
      <Button variant="primary" icon="check" disabled={!dirty || blockers.length > 0 || saving} loading={saving} loadingText="Đang lưu..." onClick={() => void submit()}>Lưu dịch vụ</Button>
    </>}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tên dịch vụ" required error={fieldErrors.errors.name} className="sm:col-span-2"><Input value={form.name} maxLength={150} onChange={e => set({ name: e.target.value })}/></Field>
      <Field label="Danh mục" error={fieldErrors.errors.category_id}>
        <Select value={form.category_id} onChange={e => changeCategory(e.target.value)}>
          <option value="">Chưa phân loại</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Mức dịch vụ" error={fieldErrors.errors.service_level}>
        <Select value={form.service_level} onChange={e => set({ service_level: e.target.value as ServiceLevel })}>
          {(Object.keys(LEVEL_TEXT) as ServiceLevel[]).map(l => <option key={l} value={l}>{LEVEL_TEXT[l]}</option>)}
        </Select>
      </Field>
      <Field label="Giá cơ bản (₫)" required error={fieldErrors.errors.base_price}><Input inputMode="numeric" className="tabular-nums" placeholder="VD: 1.000.000" value={groupPrice(form.base_price)} onChange={e => changePrice(e.currentTarget)}/></Field>
      <Field label="Thời gian ước tính (phút)" error={fieldErrors.errors.estimated_minutes} hint={hasSteps ? "Tự tính từ tổng các bước chuẩn." : "Cần có để bật Đang áp dụng."}><Input type="number" min={1} disabled={hasSteps} value={form.estimated_minutes} onChange={e => set({ estimated_minutes: e.target.value })}/></Field>
      <Field label="Mô tả ngắn" optional error={fieldErrors.errors.description} className="sm:col-span-2"><Textarea value={form.description} maxLength={1000} onChange={e => set({ description: e.target.value })} placeholder="Hiện dưới tên dịch vụ, ví dụ: Thay dầu và lọc dầu động cơ."/></Field>
      <div className="flex items-start gap-3 rounded-control border border-cs-border bg-cs-surface-2 p-3 sm:col-span-2">
        {imagePreview || savedImage
          ? <img src={imagePreview ?? savedImage ?? undefined} alt="Xem trước ảnh dịch vụ" className="h-24 w-32 shrink-0 rounded-lg border border-cs-border bg-cs-surface object-cover"/>
          : <div className="grid h-24 w-32 shrink-0 place-items-center rounded-lg border border-dashed border-cs-border bg-cs-surface text-caption text-cs-muted">Chưa có ảnh</div>}
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-cs-text">Ảnh minh họa <span className="font-normal text-cs-muted">(không bắt buộc)</span></p>
          <p className="mt-0.5 text-caption text-cs-muted">Hiện trên trang Dịch vụ của khách. JPG, PNG, WebP · tối đa 4 MB · nên dùng ảnh ngang 4:3.</p>
          <input aria-label="Chọn ảnh dịch vụ" aria-invalid={!!fieldErrors.errors.image || undefined} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving}
            className="mt-2 block w-full cursor-pointer text-small text-cs-text file:mr-3 file:rounded-lg file:border-0 file:bg-cs-soft file:px-3 file:py-1.5 file:font-semibold file:text-cs-accent-text"
            onChange={e => pickImage(e.currentTarget)}/>
          <FieldError className="mt-1">{fieldErrors.errors.image}</FieldError>
          {imageFile && <button type="button" className="mt-2 text-caption font-semibold text-cs-muted underline" disabled={saving} onClick={() => setImageFile(null)}>Bỏ ảnh vừa chọn</button>}
          {!imageFile && savedImage && <button type="button" className="mt-2 text-caption font-semibold text-danger-fg underline" disabled={saving} onClick={() => void removeSavedImage()}>Xóa ảnh hiện tại</button>}
        </div>
      </div>
      <div className="flex flex-col divide-y divide-cs-border rounded-control border border-cs-border sm:col-span-2">
        {([
          { key: "status", label: "Đang áp dụng", locked: !form.status && missing.length > 0, hint: !form.status && missing.length ? `Cần bổ sung ${missing.join(", ")}.` : "Tắt = ngừng dịch vụ: không dùng được khi đặt lịch và báo giá.", change: changeStatus },
          { key: "is_visible", label: "Hiển thị cho khách khi đặt lịch", locked: !form.status, hint: form.status ? "Tắt = chỉ nhân viên thấy (báo giá, phát sinh)." : "Bật Đang áp dụng trước.", change: (on: boolean) => set({ is_visible: on }) },
        ] as const).map(({ key, label, locked, hint, change }) => <div key={key} className="flex items-center gap-3 px-3 py-2.5">
          <span className="min-w-0 flex-1"><span className="block text-small font-medium text-cs-text">{label}</span><span className="block text-caption text-cs-muted">{hint}</span></span>
          <Switch checked={form[key]} disabled={locked || saving} onChange={change} label={label}/>
        </div>)}
      </div>
      {service?.status === "ACTIVE" && !form.category_id && <p className="rounded-control bg-warning-soft px-3 py-2 text-small text-warning-fg sm:col-span-2">
        Bỏ danh mục sẽ tắt cả 2 trạng thái. Sau khi lưu, dịch vụ không còn trên trang đặt lịch và không dùng được cho báo giá mới.
      </p>}
      {dirty && blockers.length > 0 && <p className="rounded-control bg-cs-surface-2 px-3 py-2 text-small text-cs-text-2 sm:col-span-2">Chưa lưu được: {blockers.join("; ")}.</p>}
      {!form.status && (service?.active_packages_count ?? 0) > 0 && <p className="rounded-control bg-warning-soft px-3 py-2 text-small text-warning-fg sm:col-span-2">
        Dịch vụ đang nằm trong {service?.active_packages_count} gói bảo dưỡng; khi ngừng, các gói này sẽ không tính dịch vụ này.
      </p>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg sm:col-span-2">{error}</p>}
    </div>
  </Modal>;
}

/** Chi tiết + bước chuẩn của dịch vụ (phút chuẩn cho kỹ thuật viên). */
export function ServiceDetailModal({ service, onClose, onStepsSaved }: { service: AdminService | null; onClose: () => void; onStepsSaved: (minutes: number | null, stepsCount: number) => void }) {
  const { confirm } = useAppFeedback();
  const [stepsDirty, setStepsDirty] = useState(false);
  const requestClose = async () => {
    if (stepsDirty && !await confirm({ title: "Bỏ thay đổi quy trình?", description: "Các bước vừa sửa chưa được lưu.", confirmText: "Bỏ thay đổi", variant: "danger" })) return;
    setStepsDirty(false);
    onClose();
  };
  return <Modal open={service !== null} onClose={() => void requestClose()} size="md" title={service?.name ?? "Chi tiết dịch vụ"}
    description={service ? `DV-${String(service.id).padStart(3, "0")} · ${service.category ?? "Chưa phân loại"}` : undefined}
    footer={<Button onClick={() => void requestClose()}>Đóng</Button>}>
    {service && <div className="flex flex-col gap-4 text-small">
      <dl className="grid grid-cols-2 gap-3 rounded-control bg-cs-surface-2 p-3">
        <div><dt className="text-caption text-cs-muted">Giá cơ bản</dt><dd className="font-semibold tabular-nums">{money(service.base_price)}</dd></div>
        <div><dt className="text-caption text-cs-muted">Thời gian ước tính</dt><dd className="font-semibold">{service.estimated_minutes ? `${service.estimated_minutes} phút` : "Chưa xác định"}</dd></div>
        <div><dt className="text-caption text-cs-muted">Mức dịch vụ</dt><dd>{LEVEL_TEXT[service.service_level ?? "STANDARD"]}</dd></div>
        <div><dt className="text-caption text-cs-muted">Trong gói bảo dưỡng</dt><dd>{service.active_packages_count ?? 0} gói</dd></div>
      </dl>
      {service.description && <p className="text-cs-text-2 font-medium">{service.description}</p>}
      <ServiceStepsEditor key={service.id} serviceId={service.id} onSaved={onStepsSaved} onDirtyChange={setStepsDirty}/>
    </div>}
  </Modal>;
}

