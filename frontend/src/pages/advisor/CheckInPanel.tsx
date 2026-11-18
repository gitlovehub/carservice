import { useState, type ReactNode } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Icon, type IconName } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { KmInput, QuantityStepper } from "../../components/ui/QuantityStepper";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { VehicleConditionMap, type ExteriorPosition } from "../../components/evidence/VehicleConditionMap";
import { handoverApi, VEHICLE_POSITIONS, type HandoverInput, type OtpSent } from "../../services/evidenceService";
import type { HandoverChecklistItem, WorkflowHandover, WorkflowOrder } from "../../services/workflowService";
import { printHandover } from "./handoverPrint";
import { CATEGORY_TEXT, CONDITION_TEXT, DAMAGE, FUEL_TEXT, RELATION_TEXT, STATUS_TEXT } from "./handoverText";
import { card, inputBare, Notice, Req } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Biên bản nhận xe (CHECK_IN) / trả xe (CHECK_OUT) trong phiếu sửa chữa — PO 18/11/2026:
 * trên trang chỉ còn một card gọn (trạng thái + Lập / Xem / In); lập & sửa trong modal 3 phần
 * (Thông tin tiếp nhận · Tình trạng xe · Tài sản bàn giao), footer cố định Hủy – Lưu nháp – Lưu biên bản.
 * "Lưu biên bản" = khóa nội dung và gửi chủ xe xác nhận (trong tài khoản hoặc mã gửi email chủ xe tại quầy).
 * Nhân viên không xác nhận thay khách (D-008, D-012) — chữ ký giấy trên bản in A4 chỉ để lưu hồ sơ tại gara.
 */

type HandoverType = "CHECK_IN" | "CHECK_OUT";
type Tab = "info" | "condition" | "assets";
const TABS: Array<{ id: Tab; label: string; hint: string; icon: IconName }> = [
  { id: "info", label: "Thông tin tiếp nhận", hint: "ODO, nhiên liệu, người giao", icon: "user" },
  { id: "condition", label: "Tình trạng xe", hint: "Sơ đồ, hư hỏng, ảnh", icon: "car" },
  { id: "assets", label: "Tài sản bàn giao", hint: "Chìa khóa, giấy tờ, vật dụng", icon: "key" },
];
const EXTERIOR: ExteriorPosition[] = ["FRONT", "REAR", "LEFT", "RIGHT"];
const BODY_CONDITIONS: Array<HandoverChecklistItem["condition"]> = ["OK", "SCRATCH", "DENT", "BROKEN"];
const ASSET_CONDITIONS: Array<HandoverChecklistItem["condition"]> = ["PRESENT", "MISSING", "BROKEN"];
const ASSET_GROUPS: Array<{ category: HandoverChecklistItem["category"]; add: string; placeholder: string }> = [
  { category: "KEY", add: "Chìa khóa", placeholder: "VD: Chìa khóa thông minh" },
  { category: "DOCUMENT", add: "Giấy tờ", placeholder: "VD: Giấy đăng ký xe" },
  { category: "ACCESSORY", add: "Vật dụng", placeholder: "VD: Lốp dự phòng, bộ kích" },
];

const DEFAULT_ITEMS: HandoverChecklistItem[] = [
  { category: "EXTERIOR", position_code: "FRONT", label: "Đầu xe", condition: "OK" },
  { category: "EXTERIOR", position_code: "REAR", label: "Đuôi xe", condition: "OK" },
  { category: "EXTERIOR", position_code: "LEFT", label: "Bên trái", condition: "OK" },
  { category: "EXTERIOR", position_code: "RIGHT", label: "Bên phải", condition: "OK" },
  { category: "INTERIOR", label: "Nội thất", condition: "OK" },
  { category: "KEY", label: "Chìa khóa", condition: "PRESENT", quantity: 1 },
  { category: "DOCUMENT", label: "Giấy đăng ký xe", condition: "PRESENT" },
];

function toInput(order: WorkflowOrder, h: WorkflowHandover | null | undefined, type: HandoverType): HandoverInput {
  // Trả xe: điền sẵn checklist theo biên bản nhận xe đã xác nhận để đối chiếu.
  const checkIn = [...(order.handovers ?? [])].reverse().find(x => x.type === "CHECK_IN" && x.status === "CONFIRMED");
  const defaults = type === "CHECK_OUT" && checkIn?.checklist_items?.length ? checkIn.checklist_items : DEFAULT_ITEMS;
  return {
    mileage: h?.mileage ?? order.mileage_received ?? null,
    fuel_level: h?.fuel_level ?? "HALF",
    general_condition: h?.general_condition ?? order.initial_condition ?? "",
    valuables_note: h?.valuables_note ?? "",
    person_name: h?.person_name ?? order.customer?.full_name ?? "",
    person_phone: h?.person_phone ?? order.customer?.phone ?? "",
    person_id_last4: h?.person_id_last4 ?? null,
    person_relation: h?.person_relation ?? "OWNER",
    pickup_authorization_id: h?.pickup_authorization_id ?? null,
    items: (h?.checklist_items?.length ? h.checklist_items : defaults).map(({ category, position_code, label, condition, quantity, note }) => ({ category, position_code, label, condition, quantity, note })),
  };
}

/** Nút chọn dạng viên (một lựa chọn) — nhiên liệu, quan hệ, tình trạng. Hover chỉ đổi màu. */
function Segmented<T extends string>({ label, value, options, onChange, danger }: {
  label: string; value: T | null | undefined; options: Array<{ value: T; text: string }>; onChange: (value: T) => void; danger?: (value: T) => boolean;
}) {
  return <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
    {options.map(o => { const on = value === o.value; const bad = on && danger?.(o.value); return <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
      className={`min-h-10 cursor-pointer rounded-control border px-3.5 text-small font-semibold transition-colors max-sm:min-h-11 ${bad
        ? "border-danger bg-danger-soft text-danger-fg"
        : on ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-cs-border bg-cs-surface text-cs-text-2 hover:border-cs-border-strong hover:bg-cs-hover hover:text-cs-text"}`}>{o.text}</button>; })}
  </div>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-caption text-cs-muted">{label}</dt><dd className="truncate text-small font-semibold text-cs-text">{children}</dd></div>;
}

export function CheckInPanel({ order, onChanged, type = "CHECK_IN" }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void>; type?: HandoverType }) {
  const { notify } = useAppFeedback();
  const isOut = type === "CHECK_OUT";
  const handover = [...(order.handovers ?? [])].reverse().find(h => h.type === type && h.status !== "VOID") ?? null;
  const ended = ["HANDED_OVER", "CLOSED"].includes(order.status);
  const checkedIn = (order.handovers ?? []).some(h => h.type === "CHECK_IN" && h.status === "CONFIRMED");
  const [openEarly, setOpenEarly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState<(OtpSent & { handoverId: number }) | null>(null);
  const [code, setCode] = useState("");
  const [voidReason, setVoidReason] = useState<string | null>(null);

  if (!handover && ended) return null;
  if (!isOut && !handover && !order.requires_check_in && order.status !== "RECEIVED") return null;
  // Trả xe: khi phiếu hoàn thành; hoặc mở sớm khi trả xe không sửa (đóng phiếu).
  if (isOut && !handover && (!order.requires_check_in || !checkedIn)) return null;
  if (isOut && !handover && order.status !== "COMPLETED" && !openEarly) {
    return <section className={`${card} print:hidden`} data-testid="check-out-panel">
      <p className="text-sm text-cs-muted">Trả xe không sửa (đóng phiếu) cần biên bản trả xe được chủ xe xác nhận.</p>
      <div className="mt-3"><Button variant="secondary" onClick={() => setOpenEarly(true)}>Lập biên bản trả xe</Button></div>
    </section>;
  }

  async function run(task: () => Promise<unknown>, message: string) {
    setWorking(true); setError("");
    try { await task(); await onChanged(message); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }
  async function requestCode(id: number) {
    setWorking(true); setError("");
    try { setOtp({ ...(await handoverApi.requestOtp(id)), handoverId: id }); setCode(""); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }
  async function print() {
    if (!handover) return;
    if (!await printHandover(order, handover)) notify("Trình duyệt chặn cửa sổ in. Cho phép pop-up với trang này rồi bấm lại.", "error");
  }

  const noun = isOut ? "trả xe" : "nhận xe";
  // Mã đã gửi chỉ dùng cho đúng biên bản đó (lập lại sau khi hủy → gửi mã mới).
  const sent = otp && otp.handoverId === handover?.id ? otp : null;
  const confirmation = handover?.confirmations?.[0];
  const damages = (handover?.checklist_items ?? []).filter(i => DAMAGE.includes(i.condition)).length;
  const tone = !handover ? "neutral" : handover.status === "CONFIRMED" ? "success" : handover.status === "SUBMITTED" ? "warning" : "neutral";

  return <section className={`${card} print:hidden`} data-testid={isOut ? "check-out-panel" : "check-in-panel"}>
    <div className="flex flex-wrap items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name="file" size={24}/></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-cs-text">Biên bản {noun}</h2>
          <Badge tone={tone}>{handover ? STATUS_TEXT[handover.status] : "Chưa lập"}</Badge>
        </div>
        <p className="mt-1 text-small text-cs-muted">{!handover
          ? isOut ? "Ghi tình trạng xe lúc trả, đối chiếu với lúc nhận; người nhận là chủ xe hoặc người chủ xe đã ủy quyền."
            : "Ghi ODO, nhiên liệu, hư hỏng có sẵn (kèm ảnh), chìa khóa và giấy tờ — rồi gửi chủ xe xác nhận."
          : handover.status === "DRAFT" ? "Biên bản đang là bản nháp. Hoàn tất rồi bấm “Lưu biên bản” để gửi chủ xe xác nhận."
          : handover.status === "SUBMITTED" ? "Đã khóa nội dung. Chủ xe xác nhận trong tài khoản, hoặc tại quầy bằng mã gửi email chủ xe."
          : `Chủ xe đã xác nhận ${confirmation?.method === "EMAIL_OTP" ? "bằng mã email tại quầy" : "trong tài khoản"}${confirmation ? ` lúc ${new Date(confirmation.confirmed_at).toLocaleString("vi-VN")}` : ""}${confirmation?.comment ? ` · “${confirmation.comment}”` : ""}.`}</p>
      </div>
    </div>

    {order.requires_check_in && handover?.status !== "CONFIRMED" && <p className="mt-3 flex items-start gap-2 rounded-xl bg-cs-surface-2 px-3 py-2 text-caption text-cs-text-2">
      <Icon name="info" size={14} className="mt-0.5 shrink-0 text-cs-accent-text"/>
      {isOut ? "Chỉ bàn giao xe (hoặc đóng phiếu) khi chủ xe đã xác nhận biên bản trả xe." : "Phiếu chỉ chuyển sang kiểm tra khi khách đã xác nhận biên bản nhận xe."}</p>}

    {handover && <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-cs-border px-4 py-3 sm:grid-cols-4">
      <Fact label="Số km (ODO)">{handover.mileage != null ? handover.mileage.toLocaleString("vi-VN") : "—"}</Fact>
      <Fact label="Nhiên liệu">{FUEL_TEXT[handover.fuel_level ?? ""] ?? "—"}</Fact>
      <Fact label={isOut ? "Người nhận" : "Người giao"}>{handover.person_name}</Fact>
      <Fact label="Hư hỏng / thiếu"><span className={damages ? "text-danger" : ""}>{damages ? `${damages} mục` : "Không"}</span></Fact>
    </dl>}

    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

    <div className="mt-4 flex flex-wrap items-center gap-2">
      {!handover && <button type="button" className="adv-btn-gold" onClick={() => setEditing(true)}><Icon name="plus" size={18}/>Lập biên bản {noun}</button>}
      {handover?.status === "DRAFT" && <button type="button" className="adv-btn-gold" onClick={() => setEditing(true)}><Icon name="edit" size={18}/>Tiếp tục lập biên bản</button>}
      {handover && <>
        <Button variant="outline" icon="eye" onClick={() => setViewing(true)}>Xem biên bản</Button>
        <Button variant="outline" icon="printer" onClick={() => void print()}>In biên bản</Button>
      </>}
      <span className="flex-1"/>
      {handover && ["DRAFT", "SUBMITTED"].includes(handover.status) && voidReason === null &&
        <Button variant="ghost" tone="danger" icon="x" disabled={working} onClick={() => setVoidReason("")}>Hủy biên bản</Button>}
    </div>

    {handover?.status === "SUBMITTED" && <div className="mt-4 rounded-xl border border-cs-border bg-cs-surface-2 p-4">
      <p className="text-small font-semibold text-cs-text">Chủ xe xác nhận tại quầy</p>
      <p className="mt-0.5 text-caption text-cs-muted">Gửi mã tới email chủ xe; khách kiểm tra biên bản trong email rồi đọc mã cho bạn. Khách cũng có thể tự xác nhận trong tài khoản (mục “Tiến độ xe”).</p>
      {!sent ? <div className="mt-3"><Button variant="primary" icon="send" loading={working} onClick={() => void requestCode(handover.id)}>Gửi mã tới email chủ xe</Button></div>
        : <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void run(() => handoverApi.verifyOtp(handover.id, code), `Chủ xe đã xác nhận biên bản ${noun}.`); }}>
          <label className="min-w-56 flex-1 text-caption font-semibold text-cs-muted">Mã 6 số đã gửi tới {sent.sent_to}<Req/>
            <input className={`mt-1 ${inputBare}`} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}/></label>
          <Button variant="secondary" disabled={working} onClick={() => void requestCode(handover.id)}>Gửi lại mã</Button>
          <Button type="submit" variant="primary" icon="check" loading={working} disabled={code.length !== 6}>Xác nhận</Button>
        </form>}
    </div>}

    {handover && voidReason !== null && <form className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-danger/40 p-4" onSubmit={event => { event.preventDefault(); void run(() => handoverApi.void(handover.id, voidReason), "Đã hủy biên bản. Lập biên bản mới.").then(() => setVoidReason(null)); }}>
      <label className="min-w-64 flex-1 text-caption font-semibold text-cs-muted">Lý do hủy biên bản<Req/><input className={`mt-1 ${inputBare}`} required minLength={5} maxLength={1000} value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="VD: ghi sai vị trí hư hỏng, lập lại"/></label>
      <Button variant="secondary" onClick={() => setVoidReason(null)}>Đóng</Button>
      <Button type="submit" variant="danger-outline" icon="x" loading={working} disabled={voidReason.trim().length < 5}>Hủy biên bản</Button>
    </form>}

    {editing && <HandoverEditor order={order} handover={handover} type={type} onClose={() => setEditing(false)} onChanged={onChanged}/>}
    {viewing && handover && <Modal open onClose={() => setViewing(false)} size="xl" className="max-h-[90vh]!" title={`Biên bản ${noun}`}
      description={`${order.repair_order_code ?? ""} · ${STATUS_TEXT[handover.status]}`}
      footer={<><Button variant="secondary" onClick={() => setViewing(false)}>Đóng</Button>
        <button type="button" className="adv-btn-gold" onClick={() => void print()}><Icon name="printer" size={18}/>In biên bản</button></>}>
      <HandoverSummary handover={handover}/>
      <div className="mt-4"><PhotoUploader type="handover" id={handover.id} readOnly title="Ảnh tình trạng xe"/></div>
    </Modal>}
  </section>;
}

/** Modal lập / sửa biên bản: 3 phần, footer cố định Hủy – Lưu nháp – Lưu biên bản. Chỉ mở khi chưa có biên bản hoặc đang nháp. */
function HandoverEditor({ order, handover, type, onClose, onChanged }: {
  order: WorkflowOrder; handover: WorkflowHandover | null; type: HandoverType; onClose: () => void; onChanged: (message: string) => Promise<void>;
}) {
  const { confirm } = useAppFeedback();
  const isOut = type === "CHECK_OUT";
  const activeAuthorizations = (order.pickup_authorizations ?? []).filter(a => a.status === "ACTIVE");
  const checkIn = [...(order.handovers ?? [])].reverse().find(x => x.type === "CHECK_IN" && x.status === "CONFIRMED");
  const [form, setForm] = useState<HandoverInput>(() => toInput(order, handover, type));
  const [id, setId] = useState<number | null>(handover?.id ?? null);
  const [tab, setTab] = useState<Tab>("info");
  const [position, setPosition] = useState<ExteriorPosition>("FRONT");
  const [photoPosition, setPhotoPosition] = useState<string>("FRONT");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const noun = isOut ? "trả xe" : "nhận xe";

  const patch = (changes: Partial<HandoverInput>) => setForm(previous => ({ ...previous, ...changes }));
  const setItem = (index: number, changes: Partial<HandoverChecklistItem>) =>
    setForm(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, ...changes } : item) }));
  /** Cập nhật mục ngoại thất / nội thất theo vị trí — chưa có thì thêm. */
  const upsert = (match: (i: HandoverChecklistItem) => boolean, base: HandoverChecklistItem, changes: Partial<HandoverChecklistItem>) =>
    setForm(previous => {
      const index = previous.items.findIndex(match);
      return index < 0 ? { ...previous, items: [...previous.items, { ...base, ...changes }] }
        : { ...previous, items: previous.items.map((item, i) => i === index ? { ...item, ...changes } : item) };
    });
  const exterior = (code: ExteriorPosition) => form.items.find(i => i.category === "EXTERIOR" && i.position_code === code);
  const exteriorBase = (code: ExteriorPosition): HandoverChecklistItem => ({ category: "EXTERIOR", position_code: code, label: VEHICLE_POSITIONS[code], condition: "OK" });
  const interior = form.items.find(i => i.category === "INTERIOR");
  const interiorBase: HandoverChecklistItem = { category: "INTERIOR", label: "Nội thất", condition: "OK" };
  const before = checkIn?.checklist_items?.find(i => i.category === "EXTERIOR" && i.position_code === position);
  const selected = exterior(position);

  function changeRelation(relation: HandoverInput["person_relation"]) {
    const wasOwner = form.person_relation === "OWNER";
    patch({
      person_relation: relation, pickup_authorization_id: null,
      ...(relation === "OWNER" ? { person_name: order.customer?.full_name ?? "", person_phone: order.customer?.phone ?? "", person_id_last4: null }
        : wasOwner ? { person_name: "", person_phone: "" } : {}),
    });
  }

  function invalid(): { tab: Tab; message: string } | null {
    if (isOut && form.person_relation === "AUTHORIZED") {
      if (!form.pickup_authorization_id) return { tab: "info", message: "Chọn người được chủ xe ủy quyền nhận xe." };
    } else if (!form.person_name.trim()) return { tab: "info", message: `Nhập họ tên người ${isOut ? "nhận" : "giao"} xe.` };
    if (form.person_id_last4 && !/^\d{4}$/.test(form.person_id_last4)) return { tab: "info", message: "4 số cuối giấy tờ phải đủ 4 chữ số." };
    if (form.items.some(i => !i.label.trim())) return { tab: "assets", message: "Mỗi tài sản cần có tên." };
    return null;
  }

  /** Lưu nháp (giữ modal để chụp ảnh) hoặc lưu biên bản = khóa nội dung + gửi chủ xe xác nhận. */
  async function save(finish: boolean) {
    const problem = invalid();
    if (problem) { setTab(problem.tab); setError(problem.message); return; }
    if (finish && !await confirm({
      title: `Lưu biên bản ${noun}`, reference: order.repair_order_code,
      description: "Biên bản sẽ khóa nội dung và gửi chủ xe xác nhận (trong tài khoản hoặc bằng mã gửi email chủ xe tại quầy). Muốn sửa sau đó phải hủy và lập lại.",
      confirmText: "Lưu và gửi khách", checklist: ["Đã ghi đủ hư hỏng có sẵn và chụp ảnh minh chứng."],
    })) return;
    setWorking(true); setError("");
    try {
      let current = id;
      if (current) await handoverApi.update(current, form);
      else { current = (await handoverApi.create(order.id, form, type)).id; setId(current); }
      if (finish) {
        await handoverApi.submit(current);
        onClose();
        await onChanged(`Đã lưu biên bản ${noun}. Chờ chủ xe xác nhận.`);
      } else await onChanged(id ? "Đã lưu nháp biên bản." : "Đã lưu nháp. Có thể chụp / tải ảnh minh chứng ở phần Tình trạng xe.");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  const relations = Object.entries(RELATION_TEXT).filter(([value]) => !isOut || value !== "OTHER").map(([value, text]) => ({ value: value as HandoverInput["person_relation"], text }));
  const assets = form.items.map((item, index) => ({ item, index })).filter(({ item }) => item.category !== "EXTERIOR" && item.category !== "INTERIOR");
  const flagged = EXTERIOR.filter(code => { const c = exterior(code)?.condition; return !!c && DAMAGE.includes(c); });

  return <Modal open onClose={onClose} dismissible={!working} size="xl" className="max-h-[90vh]!"
    title={`${handover ? "Biên bản" : "Lập biên bản"} ${noun}`}
    description={`${order.repair_order_code ?? ""} · ${order.vehicle?.license_plate || "xxx.xx"} · ${order.customer?.full_name ?? ""}`}
    footer={<>
      <Button variant="secondary" disabled={working} onClick={onClose}>Hủy</Button>
      <Button variant="outline" icon="file" loading={working} onClick={() => void save(false)}>Lưu nháp</Button>
      <button type="button" className="adv-btn-gold" disabled={working} onClick={() => void save(true)}><Icon name="check" size={18}/>Lưu biên bản</button>
    </>}>
    <div role="tablist" aria-label="Các phần của biên bản" className="sticky -top-5 z-10 -mx-5 -mt-5 mb-5 grid grid-cols-3 gap-2 border-b border-cs-border bg-cs-surface px-5 py-3 sm:-mx-6 sm:px-6">
      {TABS.map((t, i) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
        className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${tab === t.id ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:bg-cs-hover"}`}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-caption font-bold ${tab === t.id ? "bg-cs-accent text-cs-accent-contrast" : "bg-cs-surface-2 text-cs-muted"}`}>{i + 1}</span>
        <span className="min-w-0"><b className="block truncate text-small text-cs-text">{t.label}</b><span className="hidden truncate text-caption text-cs-muted sm:block">{t.hint}</span></span>
      </button>)}
    </div>
    {error && <Notice tone="error">{error}</Notice>}

    {tab === "info" && <div className="grid gap-5 md:grid-cols-2">
      <Field label="Số km (ODO)" hint="Số trên đồng hồ lúc giao xe."><KmInput label="Số km (ODO)" value={form.mileage ?? ""} onChange={v => patch({ mileage: v === "" ? null : Number(v) })}/></Field>
      <div className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Nhiên liệu</span>
        <Segmented label="Mức nhiên liệu" value={form.fuel_level ?? "HALF"} onChange={fuel_level => patch({ fuel_level })} options={Object.entries(FUEL_TEXT).map(([value, text]) => ({ value, text }))}/></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><span className="text-label text-cs-text-2">{isOut ? "Người nhận xe là" : "Người giao xe là"}<Req/></span>
        <Segmented label={isOut ? "Người nhận xe" : "Người giao xe"} value={form.person_relation} onChange={changeRelation} options={relations}/></div>
      {isOut && form.person_relation === "AUTHORIZED"
        ? <Field label="Người chủ xe đã ủy quyền" required className="md:col-span-2" hint="Chủ xe khai báo ủy quyền trong tài khoản; nhân viên không tạo thay.">
          <Select value={form.pickup_authorization_id ?? ""} onChange={e => patch({ pickup_authorization_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{activeAuthorizations.length ? "Chọn người được ủy quyền…" : "Chủ xe chưa khai báo ủy quyền — không thể giao"}</option>
            {activeAuthorizations.map(a => <option key={a.id} value={a.id}>{a.full_name} · {a.phone}</option>)}
          </Select></Field>
        : <>
          <Field label={`Họ tên người ${isOut ? "nhận" : "giao"}`} required><Input maxLength={150} value={form.person_name} onChange={e => patch({ person_name: e.target.value })}/></Field>
          <Field label="Số điện thoại" optional><Input inputMode="tel" maxLength={20} value={form.person_phone ?? ""} onChange={e => patch({ person_phone: e.target.value })}/></Field>
        </>}
      {form.person_relation !== "OWNER" && <Field label="4 số cuối giấy tờ tùy thân" optional={!isOut} hint={isOut ? "Đối chiếu với ủy quyền chủ xe đã khai báo." : "Người giao không phải chủ xe."}>
        <Input inputMode="numeric" maxLength={4} value={form.person_id_last4 ?? ""} placeholder="VD: 1234" onChange={e => patch({ person_id_last4: e.target.value.replace(/\D/g, "") || null })}/></Field>}
    </div>}

    {tab === "condition" && <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <VehicleConditionMap value={position} onChange={next => { setPosition(next); setPhotoPosition(next); }} items={form.items}/>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Tình trạng {VEHICLE_POSITIONS[position].toLowerCase()}</span>
            <Segmented label={`Tình trạng ${VEHICLE_POSITIONS[position]}`} value={selected?.condition ?? "OK"} danger={c => c !== "OK"}
              options={BODY_CONDITIONS.map(c => ({ value: c, text: CONDITION_TEXT[c] }))}
              onChange={condition => upsert(i => i.category === "EXTERIOR" && i.position_code === position, exteriorBase(position), { condition })}/>
            {isOut && before && <span className="text-caption text-cs-muted">Lúc nhận xe: {CONDITION_TEXT[before.condition]}{before.note ? ` · ${before.note}` : ""}</span>}
          </div>
          <Field label="Mô tả vị trí / vết hư hỏng" optional><Textarea rows={3} maxLength={500} value={selected?.note ?? ""} placeholder="VD: Trầy 5 cm ở góc cản trước bên trái"
            onChange={e => upsert(i => i.category === "EXTERIOR" && i.position_code === position, exteriorBase(position), { note: e.target.value })}/></Field>
          {id ? <PhotoUploader type="handover" id={id} title="Ảnh minh chứng (chọn vị trí trước khi chụp)" positions={VEHICLE_POSITIONS} positionValue={photoPosition} onPositionChange={setPhotoPosition}/>
            : <p className="flex items-start gap-2 rounded-xl border border-dashed border-cs-border px-3 py-3 text-caption text-cs-muted"><Icon name="info" size={15} className="mt-0.5 shrink-0"/>Bấm “Lưu nháp” để chụp / tải ảnh minh chứng cho từng vị trí (dịch vụ nhanh cần đủ 4 góc).</p>}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Nội thất</span>
          <Segmented label="Tình trạng nội thất" value={interior?.condition ?? "OK"} danger={c => c !== "OK"} options={BODY_CONDITIONS.map(c => ({ value: c, text: CONDITION_TEXT[c] }))}
            onChange={condition => upsert(i => i.category === "INTERIOR", interiorBase, { condition })}/>
          <Input className="mt-1" maxLength={500} aria-label="Ghi chú nội thất" placeholder="Ghi chú nội thất (nếu có)" value={interior?.note ?? ""}
            onChange={e => upsert(i => i.category === "INTERIOR", interiorBase, { note: e.target.value })}/>
        </div>
        <Field label="Tình trạng chung" optional><Textarea rows={3} maxLength={2000} value={form.general_condition ?? ""} onChange={e => patch({ general_condition: e.target.value })} placeholder="VD: Xe bẩn nhẹ, đèn check engine sáng"/></Field>
      </div>
      <p className="text-caption text-cs-muted">{flagged.length ? <>Đã ghi hư hỏng ở: <b className="text-danger">{flagged.map(code => VEHICLE_POSITIONS[code]).join(", ")}</b>.</> : "Chưa ghi hư hỏng ngoại thất nào."}</p>
    </div>}

    {tab === "assets" && <div className="space-y-5">
      {ASSET_GROUPS.map(group => { const rows = assets.filter(({ item }) => item.category === group.category); return <section key={group.category}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-small font-bold text-cs-text">{CATEGORY_TEXT[group.category]} <span className="font-normal text-cs-muted">({rows.length})</span></h3>
          <Button variant="tonal" icon="plus" onClick={() => patch({ items: [...form.items, { category: group.category, label: "", condition: "PRESENT", quantity: group.category === "KEY" ? 1 : null }] })}>{group.add}</Button>
        </div>
        {rows.length ? <ul className="space-y-2">{rows.map(({ item, index }) => <li key={index} className="grid gap-2 rounded-xl border border-cs-border bg-cs-surface-2 p-2.5 sm:grid-cols-[minmax(0,1.4fr)_140px_auto_minmax(0,1fr)_auto] sm:items-center">
          <input className={inputBare} aria-label={`Tên ${CATEGORY_TEXT[group.category].toLowerCase()}`} required maxLength={150} value={item.label} placeholder={group.placeholder} onChange={e => setItem(index, { label: e.target.value })}/>
          <select className={inputBare} aria-label="Tình trạng" value={item.condition} onChange={e => setItem(index, { condition: e.target.value as HandoverChecklistItem["condition"] })}>
            {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_TEXT[c]}</option>)}
            {!ASSET_CONDITIONS.includes(item.condition) && <option value={item.condition}>{CONDITION_TEXT[item.condition]}</option>}
          </select>
          <QuantityStepper label={`Số lượng ${item.label || "tài sản"}`} size="md" min={0} allowEmpty placeholder="SL" value={item.quantity ?? null} onChange={v => setItem(index, { quantity: v })}/>
          <input className={inputBare} aria-label="Ghi chú" maxLength={500} value={item.note ?? ""} placeholder="Ghi chú" onChange={e => setItem(index, { note: e.target.value })}/>
          <IconButton icon="trash" tone="danger" label="Xóa dòng" onClick={() => patch({ items: form.items.filter((_, i) => i !== index) })}/>
        </li>)}</ul> : <p className="rounded-xl border border-dashed border-cs-border px-3 py-3 text-caption text-cs-muted">Chưa có.</p>}
      </section>; })}
      <Field label="Đồ có giá trị khách để lại trong xe" optional hint="Ghi rõ để hai bên đối chiếu khi trả xe."><Textarea rows={2} maxLength={1000} value={form.valuables_note ?? ""} onChange={e => patch({ valuables_note: e.target.value })} placeholder="VD: Không có / Kính mát trong hộc táp-lô"/></Field>
    </div>}
  </Modal>;
}

/** Tóm tắt biên bản (cố vấn, khách, trang Biên bản giao nhận). */
export function HandoverSummary({ handover }: { handover: WorkflowHandover }) {
  const items = handover.checklist_items ?? [];
  const body = items.filter(i => i.category === "EXTERIOR" || i.category === "INTERIOR");
  const assets = items.filter(i => i.category !== "EXTERIOR" && i.category !== "INTERIOR");
  const row = (item: HandoverChecklistItem, index: number) => <li key={item.id ?? index} className="flex flex-wrap justify-between gap-3 px-4 py-2">
    <span>{item.label} <span className="text-xs text-cs-muted">· {CATEGORY_TEXT[item.category]}</span></span>
    <span className={`text-xs font-bold ${["OK", "PRESENT"].includes(item.condition) ? "text-cs-success" : "text-cs-danger"}`}>{CONDITION_TEXT[item.condition]}{item.quantity ? ` × ${item.quantity}` : ""}{item.note ? ` · ${item.note}` : ""}{item.is_discrepancy ? " · Khác lúc nhận xe" : ""}</span>
  </li>;
  return <div className="mt-4 space-y-3 text-sm text-cs-text">
    <dl className="grid gap-3 sm:grid-cols-4">
      <div><dt className="text-xs text-cs-muted">Số km</dt><dd className="font-semibold">{handover.mileage != null ? handover.mileage.toLocaleString("vi-VN") : "—"}</dd></div>
      <div><dt className="text-xs text-cs-muted">Nhiên liệu</dt><dd className="font-semibold">{FUEL_TEXT[handover.fuel_level ?? ""] ?? "—"}</dd></div>
      <div><dt className="text-xs text-cs-muted">{handover.type === "CHECK_OUT" ? "Người nhận" : "Người giao"}</dt><dd className="font-semibold">{handover.person_name} · {RELATION_TEXT[handover.person_relation]}</dd></div>
      <div><dt className="text-xs text-cs-muted">Đồ có giá trị</dt><dd className="font-semibold">{handover.valuables_note || "—"}</dd></div>
    </dl>
    {handover.general_condition && <p className="whitespace-pre-wrap">{handover.general_condition}</p>}
    {body.length > 0 && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-cs-muted">Tình trạng xe</p><ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{body.map(row)}</ul></div>}
    {assets.length > 0 && <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-cs-muted">Tài sản bàn giao</p><ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{assets.map(row)}</ul></div>}
  </div>;
}
