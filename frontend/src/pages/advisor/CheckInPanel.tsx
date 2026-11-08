import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { handoverApi, type HandoverInput, type OtpSent } from "../../services/evidenceService";
import type { HandoverChecklistItem, WorkflowHandover, WorkflowOrder } from "../../services/workflowService";
import { card, input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Biên bản nhận xe (P2, CHECK_IN). Nháp → gửi khách (khóa nội dung) → khách xác nhận
 * trong tài khoản hoặc bằng mã gửi email chủ xe tại quầy. Phiếu mới chỉ được kiểm tra khi đã xác nhận.
 */
const CONDITION_TEXT: Record<HandoverChecklistItem["condition"], string> = {
  OK: "Bình thường", SCRATCH: "Trầy", DENT: "Móp", BROKEN: "Vỡ / hỏng", MISSING: "Thiếu", PRESENT: "Có",
};
const FUEL_TEXT: Record<string, string> = { EMPTY: "Cạn", QUARTER: "1/4", HALF: "1/2", THREE_QUARTER: "3/4", FULL: "Đầy" };
const RELATION_TEXT: Record<WorkflowHandover["person_relation"], string> = { OWNER: "Chủ xe", AUTHORIZED: "Người được ủy quyền", OTHER: "Người khác" };
const CATEGORY_TEXT: Record<HandoverChecklistItem["category"], string> = { EXTERIOR: "Ngoại thất", INTERIOR: "Nội thất", ACCESSORY: "Phụ kiện", KEY: "Chìa khóa", DOCUMENT: "Giấy tờ" };

const DEFAULT_ITEMS: HandoverChecklistItem[] = [
  { category: "EXTERIOR", position_code: "FRONT", label: "Đầu xe", condition: "OK" },
  { category: "EXTERIOR", position_code: "REAR", label: "Đuôi xe", condition: "OK" },
  { category: "EXTERIOR", position_code: "LEFT", label: "Bên trái", condition: "OK" },
  { category: "EXTERIOR", position_code: "RIGHT", label: "Bên phải", condition: "OK" },
  { category: "INTERIOR", label: "Nội thất", condition: "OK" },
  { category: "KEY", label: "Chìa khóa", condition: "PRESENT", quantity: 1 },
  { category: "DOCUMENT", label: "Giấy đăng ký xe", condition: "PRESENT" },
];

function toInput(order: WorkflowOrder, h?: WorkflowHandover | null): HandoverInput {
  return {
    mileage: h?.mileage ?? order.mileage_received ?? null,
    fuel_level: h?.fuel_level ?? "HALF",
    general_condition: h?.general_condition ?? order.initial_condition ?? "",
    valuables_note: h?.valuables_note ?? "",
    person_name: h?.person_name ?? order.customer?.full_name ?? "",
    person_phone: h?.person_phone ?? order.customer?.phone ?? "",
    person_id_last4: h?.person_id_last4 ?? null,
    person_relation: h?.person_relation ?? "OWNER",
    items: (h?.checklist_items?.length ? h.checklist_items : DEFAULT_ITEMS).map(({ category, position_code, label, condition, quantity, note }) => ({ category, position_code, label, condition, quantity, note })),
  };
}

export function CheckInPanel({ order, onChanged }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> }) {
  const handover = [...(order.handovers ?? [])].reverse().find(h => h.type === "CHECK_IN" && h.status !== "VOID") ?? null;
  const ended = ["HANDED_OVER", "CLOSED"].includes(order.status);
  const [form, setForm] = useState<HandoverInput>(() => toInput(order, handover));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState("");
  const [voidReason, setVoidReason] = useState<string | null>(null);

  if (!handover && (ended || (!order.requires_check_in && order.status !== "RECEIVED"))) return null;

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }
  const setItem = (index: number, patch: Partial<HandoverChecklistItem>) =>
    setForm(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));

  async function save(event: FormEvent) {
    event.preventDefault();
    await run(() => handover ? handoverApi.update(handover.id, form) : handoverApi.create(order.id, form), "Đã lưu biên bản nhận xe (nháp).");
  }

  const editable = !handover || handover.status === "DRAFT";
  const confirmation = handover?.confirmations?.[0];

  return <section className={`${card} mt-6 print:hidden`} data-testid="check-in-panel">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent-text">Biên bản nhận xe</p>
    <h2 className="mt-1 text-lg font-bold text-cs-text">Tình trạng xe khi nhận {handover && <span className="ml-2 text-sm font-semibold text-cs-muted">· {{ DRAFT: "Nháp", SUBMITTED: "Chờ khách xác nhận", CONFIRMED: "Khách đã xác nhận", VOID: "Đã hủy" }[handover.status]}</span>}</h2>
    {order.requires_check_in && handover?.status !== "CONFIRMED" && <div className="mt-3"><Notice>Phiếu chỉ chuyển sang kiểm tra khi khách đã xác nhận biên bản nhận xe.</Notice></div>}
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

    {editable ? <form className="mt-4 space-y-4" onSubmit={event => void save(event)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-cs-muted">Số km<input className={input} type="number" min="0" value={form.mileage ?? ""} onChange={e => setForm({ ...form, mileage: e.target.value === "" ? null : Number(e.target.value) })}/></label>
        <label className="text-xs font-semibold text-cs-muted">Nhiên liệu<select className={input} value={form.fuel_level ?? ""} onChange={e => setForm({ ...form, fuel_level: e.target.value })}>{Object.entries(FUEL_TEXT).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label className="text-xs font-semibold text-cs-muted">Người giao xe là<select className={input} value={form.person_relation} onChange={e => setForm({ ...form, person_relation: e.target.value as HandoverInput["person_relation"] })}>{Object.entries(RELATION_TEXT).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label className="text-xs font-semibold text-cs-muted">Họ tên người giao<input className={input} required maxLength={150} value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })}/></label>
        <label className="text-xs font-semibold text-cs-muted">SĐT người giao<input className={input} maxLength={20} value={form.person_phone ?? ""} onChange={e => setForm({ ...form, person_phone: e.target.value })}/></label>
        <label className="text-xs font-semibold text-cs-muted">4 số cuối giấy tờ (nếu không phải chủ xe)<input className={input} inputMode="numeric" pattern="\d{4}" maxLength={4} value={form.person_id_last4 ?? ""} onChange={e => setForm({ ...form, person_id_last4: e.target.value.replace(/\D/g, "") || null })}/></label>
      </div>
      <label className="block text-xs font-semibold text-cs-muted">Tình trạng chung<textarea className={input} rows={2} maxLength={2000} value={form.general_condition ?? ""} onChange={e => setForm({ ...form, general_condition: e.target.value })}/></label>
      <label className="block text-xs font-semibold text-cs-muted">Đồ có giá trị trong xe<input className={input} maxLength={1000} value={form.valuables_note ?? ""} onChange={e => setForm({ ...form, valuables_note: e.target.value })}/></label>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-cs-border text-left text-xs text-cs-muted"><th className="py-2 pr-2">Nhóm</th><th className="py-2 pr-2">Hạng mục</th><th className="py-2 pr-2">Tình trạng</th><th className="py-2 pr-2">SL</th><th className="py-2">Ghi chú</th><th/></tr></thead>
        <tbody>{form.items.map((item, index) => <tr key={index} className="border-b border-cs-border/60">
          <td className="py-1.5 pr-2 text-xs text-cs-muted">{CATEGORY_TEXT[item.category]}</td>
          <td className="py-1.5 pr-2"><input className={`${input} mt-0`} aria-label="Hạng mục" required maxLength={150} value={item.label} onChange={e => setItem(index, { label: e.target.value })}/></td>
          <td className="py-1.5 pr-2"><select className={`${input} mt-0`} aria-label="Tình trạng" value={item.condition} onChange={e => setItem(index, { condition: e.target.value as HandoverChecklistItem["condition"] })}>{Object.entries(CONDITION_TEXT).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></td>
          <td className="w-20 py-1.5 pr-2"><input className={`${input} mt-0`} aria-label="Số lượng" type="number" min="0" value={item.quantity ?? ""} onChange={e => setItem(index, { quantity: e.target.value === "" ? null : Number(e.target.value) })}/></td>
          <td className="py-1.5 pr-2"><input className={`${input} mt-0`} aria-label="Ghi chú" maxLength={500} value={item.note ?? ""} onChange={e => setItem(index, { note: e.target.value })}/></td>
          <td><Button size="sm" variant="ghost" aria-label="Xóa dòng" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>✕</Button></td>
        </tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, items: [...form.items, { category: "EXTERIOR", label: "", condition: "OK" }] })}>Thêm dòng</Button>
        <span className="flex-1"/>
        <Button type="submit" variant="secondary" loading={working}>{handover ? "Lưu nháp" : "Tạo biên bản"}</Button>
        {handover && <Button variant="primary" loading={working} onClick={() => void run(async () => { await handoverApi.update(handover.id, form); await handoverApi.submit(handover.id); }, "Đã gửi biên bản. Chờ khách xác nhận.")}>Gửi khách xác nhận</Button>}
      </div>
      {handover && <PhotoUploader type="handover" id={handover.id} title="Ảnh tình trạng xe"/>}
    </form> : handover && <HandoverSummary handover={handover}/>}

    {handover?.status === "SUBMITTED" && <div className="mt-4 rounded-xl border border-cs-border bg-cs-surface-2 p-4">
      <p className="text-sm text-cs-text">Khách có thể tự xác nhận trong tài khoản (mục "Tiến độ xe") rồi bấm "Làm mới", hoặc xác nhận tại quầy bằng mã gửi email chủ xe.</p>
      {!sent ? <div className="mt-3 flex flex-wrap gap-2"><Button variant="primary" loading={working} onClick={() => void (async () => { setWorking(true); setError(""); try { setSent(await handoverApi.requestOtp(handover.id)); } catch (err) { setError(errorText(err)); } finally { setWorking(false); } })()}>Gửi mã tới email chủ xe</Button></div>
        : <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={event => { event.preventDefault(); void run(() => handoverApi.verifyOtp(handover.id, code), "Khách đã xác nhận biên bản nhận xe."); }}>
          <label className="text-xs font-semibold text-cs-muted">Mã 6 số đã gửi tới {sent.sent_to}<input className={input} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}/></label>
          <Button type="submit" variant="primary" loading={working} disabled={code.length !== 6}>Xác nhận</Button>
        </form>}
    </div>}
    {confirmation && <p className="mt-3 text-xs text-cs-muted">Khách xác nhận {confirmation.method === "ACCOUNT" ? "trong tài khoản" : "bằng mã email tại quầy"} lúc {new Date(confirmation.confirmed_at).toLocaleString("vi-VN")}{confirmation.comment ? ` · "${confirmation.comment}"` : ""}.</p>}
    {handover && handover.status !== "DRAFT" && <PhotoUploader type="handover" id={handover.id} readOnly title="Ảnh tình trạng xe"/>}

    {handover && ["DRAFT", "SUBMITTED"].includes(handover.status) && (voidReason === null
      ? <div className="mt-4"><Button size="sm" variant="danger-outline" disabled={working} onClick={() => setVoidReason("")}>Hủy biên bản</Button></div>
      : <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void run(() => handoverApi.void(handover.id, voidReason), "Đã hủy biên bản. Lập biên bản mới."); }}>
        <label className="min-w-64 flex-1 text-xs font-semibold text-cs-muted">Lý do hủy<input className={input} required minLength={5} maxLength={1000} value={voidReason} onChange={e => setVoidReason(e.target.value)}/></label>
        <Button size="sm" variant="secondary" onClick={() => setVoidReason(null)}>Thôi</Button>
        <Button type="submit" size="sm" variant="danger" loading={working}>Hủy biên bản</Button>
      </form>)}
  </section>;
}

/** Tóm tắt biên bản đã khóa (dùng chung cho cố vấn và khách). */
export function HandoverSummary({ handover }: { handover: WorkflowHandover }) {
  return <div className="mt-4 space-y-3 text-sm text-cs-text">
    <dl className="grid gap-3 sm:grid-cols-4">
      <div><dt className="text-xs text-cs-muted">Số km</dt><dd className="font-semibold">{handover.mileage != null ? handover.mileage.toLocaleString("vi-VN") : "—"}</dd></div>
      <div><dt className="text-xs text-cs-muted">Nhiên liệu</dt><dd className="font-semibold">{FUEL_TEXT[handover.fuel_level ?? ""] ?? "—"}</dd></div>
      <div><dt className="text-xs text-cs-muted">Người giao</dt><dd className="font-semibold">{handover.person_name} · {RELATION_TEXT[handover.person_relation]}</dd></div>
      <div><dt className="text-xs text-cs-muted">Đồ có giá trị</dt><dd className="font-semibold">{handover.valuables_note || "—"}</dd></div>
    </dl>
    {handover.general_condition && <p className="whitespace-pre-wrap">{handover.general_condition}</p>}
    <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{handover.checklist_items?.map((item, index) => <li key={item.id ?? index} className="flex flex-wrap justify-between gap-3 px-4 py-2">
      <span>{item.label} <span className="text-xs text-cs-muted">· {CATEGORY_TEXT[item.category]}</span></span>
      <span className={`text-xs font-bold ${["OK", "PRESENT"].includes(item.condition) ? "text-cs-success" : "text-cs-danger"}`}>{CONDITION_TEXT[item.condition]}{item.quantity ? ` × ${item.quantity}` : ""}{item.note ? ` · ${item.note}` : ""}</span>
    </li>)}</ul>
  </div>;
}
