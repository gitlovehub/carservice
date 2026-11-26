import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { FieldError } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { QuantityStepper } from "../../components/ui/QuantityStepper";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import {
  formatVnd, toNumber, workflowApi,
  type CatalogPart, type CatalogService, type QuotationLineInput, type WorkflowOrder, type WorkflowQuotation,
} from "../../services/workflowService";
import { input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

type Line = { key: number; item_type: "SERVICE" | "PART"; ref_id: string; quantity: string; unit_price: string; description: string; required: boolean; required_reason: string };

/**
 * Ô "Bắt buộc" của một dòng báo giá (PO 19/11): tick thì phải ghi lý do — khách thấy lý do,
 * và từ chối hạng mục bắt buộc = từ chối toàn bộ báo giá. Dùng ở modal sửa và form lập báo giá.
 */
export function RequiredField({ required, reason, onChange, error }: { required: boolean; reason: string; onChange: (required: boolean, reason: string) => void; error?: string }) {
  return <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-small font-semibold text-cs-text">
      <input type="checkbox" className="size-4 cursor-pointer accent-cs-accent" checked={required} onChange={e => onChange(e.target.checked, reason)}/>
      Bắt buộc
      <span title="Không làm hạng mục này thì gara không thể làm các hạng mục khác (an toàn / kỹ thuật). Khách từ chối hạng mục bắt buộc = từ chối toàn bộ báo giá." className="text-cs-muted"><Icon name="info" size={15}/></span>
    </label>
    {required && <div className="min-w-0 flex-1"><input className={`${input} mt-0!`} required maxLength={255} aria-invalid={!!error || undefined} value={reason} onChange={e => onChange(true, e.target.value)}
      placeholder="Lý do bắt buộc — khách sẽ thấy. VD: Má phanh mòn tới kim loại, không thay thì không an toàn" aria-label="Lý do bắt buộc"/>
      <FieldError className="mt-1">{error}</FieldError></div>}
  </div>;
}

/** Báo trước cho khách: xe phải lưu xưởng qua đêm (không tính phí) — hiện trong báo giá và email duyệt. */
export function OvernightField({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-10 cursor-pointer items-center gap-2 text-small font-semibold text-cs-text">
    <input type="checkbox" className="size-4 cursor-pointer accent-cs-accent" checked={checked} onChange={e => onChange(e.target.checked)}/>
    <Icon name="moon" size={16} className="text-cs-accent-text"/>Xe cần lưu xưởng qua đêm
    <span className="font-normal text-cs-muted">(báo khách, không tính phí)</span>
  </label>;
}

/** Số tiền hiển thị có dấu chấm ngăn nghìn (300.000), lưu dạng chuỗi chữ số. */
const money = (digits: string) => digits ? Number(digits).toLocaleString("vi-VN") : "";
const digitsOnly = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);

const label = "mb-1.5 block text-small font-medium text-cs-text-2";
const req = <span className="ml-0.5 text-danger">*</span>;

/**
 * Sửa nhanh báo giá NHÁP (chưa gửi khách) — dùng ở chi tiết phiếu (bước Báo giá) và trang Báo giá & phê duyệt.
 * Giao diện theo mockup PO 18/11 (đầu modal có ô biểu tượng + ánh nền, dòng đánh số, đơn giá có dấu chấm,
 * chân có tổng dự kiến nổi bật), màu vàng đồng khu cố vấn qua token.
 * Cùng quy tắc với lập mới: báo giá gốc chỉ chọn phụ tùng trong đề xuất chẩn đoán; phát sinh chọn được mọi phụ tùng, không giảm giá.
 */
export function QuotationEditModal({ order, quotation, onClose, onSaved }: {
  order: WorkflowOrder; quotation: WorkflowQuotation; onClose: () => void; onSaved: (message: string) => void | Promise<void>;
}) {
  const supplement = quotation.type === "SUPPLEMENT";
  const [services, setServices] = useState<CatalogService[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();
  const [discount, setDiscount] = useState(String(Math.round(toNumber(quotation.discount_amount)) || ""));
  const [overnight, setOvernight] = useState(!!quotation.stays_overnight);
  const [lines, setLines] = useState<Line[]>(() => (quotation.items ?? []).map((item, index) => ({
    key: index + 1, item_type: item.item_type,
    ref_id: String((item.item_type === "PART" ? item.part_id : item.service_id) ?? ""),
    quantity: String(item.quantity ?? 1), unit_price: String(Math.round(toNumber(item.unit_price))), description: item.description ?? "",
    required: !!item.is_required, required_reason: item.required_reason ?? "",
  })));
  const recommendedPartIds = useMemo(() => new Set((order.inspections ?? []).flatMap(i => i.recommendations ?? [])
    .filter(r => r.item_type === "PART").map(r => Number(r.part_id))), [order.inspections]);

  useEffect(() => {
    let active = true;
    Promise.all([workflowApi.services(), workflowApi.parts()])
      .then(([s, p]) => { if (active) { setServices(s); setParts(p); } })
      .catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, []);

  // Không trùng hạng mục (máy chủ cũng chặn): mỗi dòng chỉ thấy dịch vụ / phụ tùng chưa chọn ở dòng khác.
  const takenElsewhere = (type: Line["item_type"], id: number, key: number) =>
    lines.some(l => l.key !== key && l.item_type === type && Number(l.ref_id) === id);
  const freeParts = (key: number) => parts.filter(p => (supplement || recommendedPartIds.has(p.id)) && !takenElsewhere("PART", p.id, key));

  const total = lines.reduce((sum, l) => sum + toNumber(l.unit_price) * toNumber(l.quantity), 0) - (supplement ? 0 : toNumber(discount));

  function update(key: number, changes: Partial<Line>) {
    setError("");
    if ("item_type" in changes || "ref_id" in changes) fieldErrors.clear(`${key}.ref`, `${key}.price`);
    if ("unit_price" in changes) fieldErrors.clear(`${key}.price`);
    if ("required" in changes) fieldErrors.clear(`${key}.reason`);
    setLines(previous => previous.map(line => {
      if (line.key !== key) return line;
      const next = { ...line, ...changes };
      if (changes.item_type !== undefined) { next.ref_id = ""; next.unit_price = ""; }
      if (changes.ref_id !== undefined) {
        const item = next.item_type === "PART" ? parts.find(p => p.id === Number(next.ref_id)) : services.find(s => s.id === Number(next.ref_id));
        next.unit_price = String(Math.round(toNumber(next.item_type === "PART" ? (item as CatalogPart | undefined)?.sell_price : (item as CatalogService | undefined)?.base_price)));
        // Mô tả đang trống / đang là tên hạng mục cũ → đổi theo hạng mục mới.
        if (!line.description.trim() || line.description === nameOf(line)) next.description = item?.name ?? "";
      }
      return next;
    }));
  }
  function nameOf(line: Line) {
    return (line.item_type === "PART" ? parts : services).find(x => x.id === Number(line.ref_id))?.name ?? "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const items: QuotationLineInput[] = [];
    const problems: FieldErrors = {};
    for (const line of lines) {
      const refId = Number(line.ref_id); const quantity = Number(line.quantity);
      if (!Number.isSafeInteger(refId) || refId < 1) problems[`${line.key}.ref`] = "Chọn hạng mục.";
      if (line.unit_price === "") problems[`${line.key}.price`] = "Nhập đơn giá.";
      if (line.required && !line.required_reason.trim()) problems[`${line.key}.reason`] = "Ghi lý do bắt buộc để khách hiểu.";
      items.push({
        item_type: line.item_type, ...(line.item_type === "PART" ? { part_id: refId } : { service_id: refId }),
        quantity, unit_price: toNumber(line.unit_price), ...(line.description.trim() ? { description: line.description.trim() } : {}),
        ...(line.required ? { is_required: true, required_reason: line.required_reason.trim() } : {}),
      });
    }
    setError("");
    if (fieldErrors.show(problems)) return;
    if (!items.length) { fieldErrors.general("Báo giá cần ít nhất một dòng."); return; }
    setWorking(true);
    try {
      await workflowApi.updateQuotation(quotation.id, { discount_amount: supplement ? 0 : toNumber(discount), items, stays_overnight: overnight });
      await onSaved(`Đã lưu báo giá ${quotation.quotation_code ?? ""}. Kiểm tra lại rồi gửi khách.`);
      onClose();
    } catch (err) {
      const fieldByApiKey: Record<string, string> = { discount_amount: "discount" };
      lines.forEach((line, index) => {
        for (const key of ["item_type", "part_id", "service_id"]) fieldByApiKey[`items.${index}.${key}`] = `${line.key}.ref`;
        fieldByApiKey[`items.${index}.unit_price`] = `${line.key}.price`;
        fieldByApiKey[`items.${index}.required_reason`] = `${line.key}.reason`;
      });
      fieldErrors.showApi(err, fieldByApiKey);
    }
    finally { setWorking(false); }
  }

  // Portal ra body (modal `bare` vẽ tại chỗ; nằm trong thẻ có backdrop-filter thì lớp phủ bị giam trong thẻ).
  return createPortal(<Modal bare open onClose={onClose} dismissible={!working} title={`Sửa báo giá ${quotation.quotation_code ?? ""}`}
    className="adv-hv flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border shadow-overlay">
    <header className="adv-hv-head relative flex items-center gap-4 px-6 py-5 sm:px-7">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="edit" size={28}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.6rem] font-bold leading-tight text-cs-text">Sửa báo giá <span className="adv-hv-code">{quotation.quotation_code}</span></h2>
        <p className="mt-1 text-small text-cs-text-2">Báo giá đang là bản nháp — khách chưa thấy. Lưu xong vẫn là nháp, bấm “Gửi cho khách” khi đã đúng.</p>
      </div>
      <IconButton icon="x" label="Đóng" variant="outline" onClick={onClose} disabled={working} className="relative z-10 self-start"/>
    </header>

    <form id="quotation-edit-form" noValidate className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-7" onSubmit={event => void save(event)}>
      {error && <Notice tone="error">{error}</Notice>}
      {lines.map((line, index) => <div key={line.key} className="qe-line rounded-2xl border border-cs-border p-4">
        <div className="grid gap-3 md:grid-cols-[36px_minmax(0,9rem)_minmax(0,1fr)_9.5rem_10rem_44px] md:items-end">
          <span className="qe-no self-end max-md:hidden">{index + 1}</span>
          <label className="min-w-0"><span className={label}>Loại</span>
            <span className="relative block">
              <Icon name={line.item_type === "PART" ? "layers" : "wrench"} size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cs-text-2"/>
              <select className={`${input} pl-9`} value={line.item_type} onChange={e => update(line.key, { item_type: e.target.value as Line["item_type"] })}>
                <option value="SERVICE">Dịch vụ</option>
                <option value="PART" disabled={line.item_type !== "PART" && !freeParts(line.key).length}>Phụ tùng{line.item_type !== "PART" && !freeParts(line.key).length ? " (đã chọn hết đề xuất)" : ""}</option>
              </select>
            </span></label>
          <label className="min-w-0"><span className={label}>Hạng mục{req}</span>
            <select required className={input} aria-invalid={!!fieldErrors.errors[`${line.key}.ref`] || undefined} value={line.ref_id} onChange={e => update(line.key, { ref_id: e.target.value })}>
              <option value="">{services.length || parts.length ? "— Chọn —" : "Đang tải danh mục…"}</option>
              {line.item_type === "SERVICE"
                ? services.filter(s => !takenElsewhere("SERVICE", s.id, line.key)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                : freeParts(line.key).map(p => <option key={p.id} value={p.id}>{p.name} · tồn {p.inventory?.quantity ?? 0}</option>)}
            </select><FieldError className="mt-1">{fieldErrors.errors[`${line.key}.ref`]}</FieldError></label>
          <div className="min-w-0"><span className={label}>Số lượng{req}</span>
            <QuantityStepper label="Số lượng" size="md" max={9999} className="w-full" value={Number(line.quantity) || 1} onChange={v => update(line.key, { quantity: String(v ?? 1) })}/></div>
          <label className="min-w-0"><span className={label}>Đơn giá (₫){req}</span>
            <input className={`${input} tabular-nums`} inputMode="numeric" required aria-invalid={!!fieldErrors.errors[`${line.key}.price`] || undefined} value={money(line.unit_price)} placeholder="0" onChange={e => update(line.key, { unit_price: digitsOnly(e.target.value) })}/>
            <FieldError className="mt-1">{fieldErrors.errors[`${line.key}.price`]}</FieldError></label>
          <IconButton icon="trash" tone="danger" variant="tonal" label="Xoá dòng" className="qe-del" onClick={() => setLines(previous => previous.filter(l => l.key !== line.key))}/>
        </div>
        <label className="mt-3 block"><span className={label}>Mô tả cho khách (tuỳ chọn)</span>
          <input className={input} value={line.description} onChange={e => update(line.key, { description: e.target.value })} placeholder="Mặc định: tên hạng mục"/></label>
        <div className="mt-3"><RequiredField required={line.required} reason={line.required_reason} error={fieldErrors.errors[`${line.key}.reason`]} onChange={(required, required_reason) => update(line.key, { required, required_reason })}/></div>
      </div>)}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" className="qe-add" onClick={() => setLines(previous => [...previous, { key: Date.now(), item_type: "SERVICE", ref_id: "", quantity: "1", unit_price: "", description: "", required: false, required_reason: "" }])}>
          <Icon name="plus" size={18}/>Thêm dòng</button>
        {!supplement && <label className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-small text-cs-text-2">Giảm giá (₫)
            <span title="Trừ vào tổng báo giá. Báo giá phát sinh không áp dụng giảm giá." className="text-cs-muted"><Icon name="info" size={16}/></span></span>
          <span className="block"><input className={`${input} mt-0! w-48 tabular-nums`} inputMode="numeric" aria-invalid={!!fieldErrors.errors.discount || undefined} value={money(discount)} placeholder="0" onChange={e => { setDiscount(digitsOnly(e.target.value)); fieldErrors.clear("discount"); }}/>
            <FieldError className="mt-1">{fieldErrors.errors.discount}</FieldError></span>
        </label>}
      </div>
      <OvernightField checked={overnight} onChange={setOvernight}/>
      {!supplement && !recommendedPartIds.size && <p className="text-caption text-cs-muted">Phụ tùng chỉ chọn được khi đã có trong đề xuất ở bước chẩn đoán.</p>}
    </form>

    <footer className="qe-foot flex shrink-0 flex-wrap items-center gap-3 border-t border-cs-border px-6 py-4 sm:px-7">
      <Icon name="coins" size={26} className="text-cs-text-2"/>
      <span className="text-cs-text-2">Tổng dự kiến</span>
      <b className="mr-auto text-[1.9rem] font-extrabold leading-none tabular-nums text-cs-accent-text">{formatVnd(total)}</b>
      <Button variant="secondary" className="h-11" disabled={working} onClick={onClose}>Huỷ</Button>
      <Button type="submit" form="quotation-edit-form" variant="primary" icon="check" className="h-11" loading={working} loadingText="Đang lưu..." disabled={!lines.length}>Lưu báo giá</Button>
    </footer>
  </Modal>, document.body);
}
