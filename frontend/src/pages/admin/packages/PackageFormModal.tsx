import { useEffect, useMemo, useState } from "react";
import { Button, Field, Icon, IconButton, Input, KmInput, Modal, QuantityStepper, SearchInput, Select, Switch, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { adminApi, errorMessage, type AdminPart } from "../../../services/adminApi";
import {
  catalogAdminApi, money, type AdminPackage, type AdminService, type CatalogBrand, type CatalogModel, type PackagePayload,
} from "../../../services/catalogAdminApi";
import { useDebounced } from "../kit/useDebounced";

type PartLine = { part_id: number; name: string; sku: string; price: number; quantity: number };

/** Tạo / sửa gói bảo dưỡng: dòng xe áp dụng, mốc km/tháng, dịch vụ và phụ tùng đi kèm (giá ước tính tự cộng). */
export function PackageFormModal({ open, pkg, brands, onClose, onSaved }: {
  open: boolean; pkg: AdminPackage | null; brands: CatalogBrand[]; onClose: () => void; onSaved: (pkg: AdminPackage) => void;
}) {
  const { notify } = useAppFeedback();
  const [name, setName] = useState(pkg?.name ?? "");
  const [brandId, setBrandId] = useState(pkg?.vehicle_model ? String(pkg.vehicle_model.brand_id) : "");
  const [modelId, setModelId] = useState(pkg?.vehicle_model_id ? String(pkg.vehicle_model_id) : "");
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [km, setKm] = useState(pkg?.mileage_milestone ? String(pkg.mileage_milestone) : "");
  const [months, setMonths] = useState(pkg?.month_milestone ? String(pkg.month_milestone) : "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [active, setActive] = useState((pkg?.status ?? "ACTIVE") === "ACTIVE");
  const [services, setServices] = useState<AdminService[]>([]);
  const [picked, setPicked] = useState<Record<number, number>>(() => Object.fromEntries((pkg?.services ?? []).map(s => [s.id, s.pivot?.quantity ?? 1])));
  const [serviceSearch, setServiceSearch] = useState("");
  const [parts, setParts] = useState<PartLine[]>(() => (pkg?.parts ?? []).map(p => ({ part_id: p.id, name: p.name, sku: p.sku, price: Number(p.sell_price), quantity: p.pivot?.quantity ?? 1 })));
  const [partSearch, setPartSearch] = useState("");
  const partTerm = useDebounced(partSearch.trim());
  const [partResults, setPartResults] = useState<AdminPart[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    catalogAdminApi.services({ status: "ACTIVE", per_page: 100 }, controller.signal).then(r => setServices(r.data)).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!brandId) return;
    const controller = new AbortController();
    catalogAdminApi.models(Number(brandId), controller.signal).then(setModels).catch(() => setModels([]));
    return () => controller.abort();
  }, [brandId]);
  useEffect(() => {
    if (partTerm.length < 2) return;
    const controller = new AbortController();
    adminApi.parts({ search: partTerm, status: "ACTIVE", per_page: 8 }, controller.signal).then(r => setPartResults(r.data)).catch(() => undefined);
    return () => controller.abort();
  }, [partTerm]);

  // Dịch vụ đã có trong gói lúc mở form lên đầu (thứ tự cố định — không nhảy khi bấm chọn/bỏ).
  const [initialPicked] = useState(() => new Set((pkg?.services ?? []).map(s => s.id)));
  const shownServices = useMemo(() => {
    const k = serviceSearch.trim().toLowerCase();
    const list = k ? services.filter(s => s.name.toLowerCase().includes(k) || (s.category ?? "").toLowerCase().includes(k)) : services;
    return [...list].sort((a, b) => Number(initialPicked.has(b.id)) - Number(initialPicked.has(a.id)));
  }, [services, serviceSearch, initialPicked]);
  const serviceTotal = services.reduce((sum, s) => sum + (picked[s.id] ? Number(s.base_price) * picked[s.id] : 0), 0);
  const partTotal = parts.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const submit = async () => {
    const kmN = km ? Number(km) : null;
    const monthsN = months ? Number(months) : null;
    if (!name.trim()) return setError("Nhập tên gói.");
    if ((kmN !== null && (!Number.isInteger(kmN) || kmN <= 0)) || (monthsN !== null && (!Number.isInteger(monthsN) || monthsN <= 0))) return setError("Mốc km và mốc tháng phải là số nguyên lớn hơn 0.");
    if (brandId && !modelId) return setError("Chọn dòng xe, hoặc để “Dùng chung mọi dòng xe”.");
    if (!Object.keys(picked).length) return setError("Chọn ít nhất một dịch vụ trong gói.");
    const payload: PackagePayload = {
      name: name.trim(), vehicle_model_id: modelId ? Number(modelId) : null, mileage_milestone: kmN, month_milestone: monthsN,
      description: description.trim() || null, status: active ? "ACTIVE" : "INACTIVE",
      services: Object.entries(picked).map(([id, quantity]) => ({ service_id: Number(id), quantity })),
      parts: parts.map(p => ({ part_id: p.part_id, quantity: p.quantity })),
    };
    setSaving(true);
    setError("");
    try {
      const res = pkg ? await catalogAdminApi.updatePackage(pkg.id, payload) : await catalogAdminApi.createPackage(payload);
      notify(`${pkg ? "Đã cập nhật" : "Đã tạo"} gói “${payload.name}”: ${payload.services.length} dịch vụ, ${payload.parts.length} phụ tùng, ước tính ${money(res.data.price)}.`, "success");
      onSaved(res.data);
    } catch (e) {
      setError(errorMessage(e, "Không lưu được gói bảo dưỡng."));
    } finally {
      setSaving(false);
    }
  };

  const qty = (value: number, onChange: (n: number) => void, label: string) => <QuantityStepper value={value} onChange={n => onChange(n ?? 1)} label={label}/>;

  return <Modal open={open} onClose={onClose} dismissible={!saving} size="lg" title={pkg ? "Chỉnh sửa gói bảo dưỡng" : "Tạo gói bảo dưỡng"}
    footer={<>
      <span className="mr-auto text-small text-cs-muted">Tổng ước tính <b className="text-subheading tabular-nums text-cs-accent-text">{money(serviceTotal + partTotal)}</b></span>
      <Button disabled={saving} onClick={onClose}>Huỷ</Button>
      <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void submit()}>{pkg ? "Lưu thay đổi" : "Tạo gói"}</Button>
    </>}>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Tên gói" required className="md:col-span-2"><Input value={name} maxLength={150} placeholder="Ví dụ: Bảo dưỡng 10.000 km – Toyota Vios" onChange={e => setName(e.target.value)}/></Field>
      <Field label="Hãng xe">
        <Select value={brandId} onChange={e => { setBrandId(e.target.value); setModelId(""); setModels([]); }}>
          <option value="">Dùng chung mọi dòng xe</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label="Dòng xe" required={Boolean(brandId)}>
        <Select value={modelId} disabled={!brandId} onChange={e => setModelId(e.target.value)}>
          <option value="">{brandId ? "Chọn dòng xe" : "—"}</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Field>
      <Field label="Mốc km"><KmInput label="Mốc km" value={km} placeholder="Ví dụ: 10.000" onChange={setKm}/></Field>
      <Field label="Mốc tháng"><QuantityStepper label="Mốc tháng" size="md" className="w-full" unit="tháng" min={1} max={240} allowEmpty placeholder="Ví dụ: 6" value={months === "" ? null : Number(months)} onChange={v => setMonths(v === null ? "" : String(v))}/></Field>
      <Field label="Mô tả" optional className="md:col-span-2"><Textarea rows={2} value={description} maxLength={1000} onChange={e => setDescription(e.target.value)}/></Field>
      <div className="flex items-center gap-3 rounded-control border border-cs-border px-3 py-2.5 md:col-span-2">
        <span className="min-w-0 flex-1"><span className="block text-small font-medium">Đang áp dụng</span><span className="block text-caption text-cs-muted">Tắt = tạm ngừng: khách không chọn được gói khi đặt lịch.</span></span>
        <Switch checked={active} onChange={setActive} label="Gói đang áp dụng"/>
      </div>

      <section className="flex flex-col gap-2 md:col-span-2" aria-label="Dịch vụ trong gói">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-small font-semibold"><Icon name="wrench" size={16} className="text-cs-accent-text"/>Dịch vụ trong gói ({Object.keys(picked).length})</h3>
          <span className="text-caption text-cs-muted">{money(serviceTotal)}</span>
        </div>
        <SearchInput className="sm:max-w-none" value={serviceSearch} onChange={setServiceSearch} placeholder="Lọc dịch vụ theo tên hoặc danh mục…" label="Lọc dịch vụ"/>
        <ul className="max-h-56 overflow-y-auto rounded-control border border-cs-border p-1">
          {shownServices.map(s => {
            const on = picked[s.id] !== undefined;
            return <li key={s.id} className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-small ${on ? "bg-cs-soft" : "hover:bg-cs-hover"}`}>
              <input type="checkbox" id={`pkg-s-${s.id}`} className="size-4 cursor-pointer accent-[var(--cs-accent)]" checked={on}
                onChange={() => setPicked(p => { const next = { ...p }; if (on) delete next[s.id]; else next[s.id] = 1; return next; })}/>
              <label htmlFor={`pkg-s-${s.id}`} className="min-w-0 flex-1 cursor-pointer"><span className="block truncate">{s.name}</span>
                <span className="block text-caption text-cs-muted">{s.category ?? "Chưa phân loại"}{s.estimated_minutes ? ` · ${s.estimated_minutes} phút` : ""}</span></label>
              {on && qty(picked[s.id], n => setPicked(p => ({ ...p, [s.id]: n })), `Số lượng ${s.name}`)}
              <span className="w-28 shrink-0 text-right tabular-nums text-cs-text-2">
                {on && picked[s.id] > 1 ? <><span className="block font-semibold text-cs-text">{money(Number(s.base_price) * picked[s.id])}</span>
                  <span className="block text-caption text-cs-muted">{new Intl.NumberFormat("vi-VN").format(Number(s.base_price))} × {picked[s.id]}</span></> : money(s.base_price)}
              </span>
            </li>;
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2 md:col-span-2" aria-label="Phụ tùng đi kèm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-small font-semibold"><Icon name="box" size={16} className="text-cs-accent-text"/>Phụ tùng đi kèm ({parts.length})</h3>
          <span className="text-caption text-cs-muted">{money(partTotal)}</span>
        </div>
        <SearchInput className="sm:max-w-none" value={partSearch} onChange={setPartSearch} placeholder="Tìm phụ tùng trong kho theo tên hoặc mã SKU (từ 2 ký tự)…" label="Tìm phụ tùng"/>
        {partTerm.length >= 2 && <ul className="max-h-40 overflow-y-auto rounded-control border border-cs-border p-1">
          {partResults.filter(p => !parts.some(x => x.part_id === p.id)).map(p => <li key={p.id}>
            <button type="button" className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-small hover:bg-cs-hover"
              onClick={() => { setParts(list => [...list, { part_id: p.id, name: p.name, sku: p.sku, price: Number(p.price), quantity: 1 }]); setPartSearch(""); }}>
              <Icon name="plus" size={14} className="text-cs-accent-text"/>
              <span className="min-w-0 flex-1 truncate">{p.name} <span className="text-caption text-cs-muted">· {p.sku}</span></span>
              <span className="tabular-nums text-cs-text-2">{money(p.price)}</span>
            </button>
          </li>)}
          {!partResults.length && <li className="px-2.5 py-1.5 text-small text-cs-muted">Không tìm thấy phụ tùng đang kinh doanh.</li>}
        </ul>}
        {parts.length > 0 && <ul className="flex flex-col divide-y divide-cs-border rounded-control border border-cs-border">
          {parts.map(p => <li key={p.part_id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-small">
            <span className="min-w-0 flex-1 truncate">{p.name} <span className="text-caption text-cs-muted">· {p.sku}</span></span>
            {qty(p.quantity, n => setParts(list => list.map(x => x.part_id === p.part_id ? { ...x, quantity: n } : x)), `Số lượng ${p.name}`)}
            <span className="w-24 shrink-0 text-right tabular-nums">{money(p.price * p.quantity)}</span>
            <IconButton icon="x" size="sm" tone="danger" label={`Bỏ ${p.name}`} onClick={() => setParts(list => list.filter(x => x.part_id !== p.part_id))}/>
          </li>)}
        </ul>}
      </section>
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg md:col-span-2">{error}</p>}
    </div>
  </Modal>;
}
