import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Field, FieldError, Input, Select, Textarea } from "../../components/ui/Field";
import { apiFieldErrors } from "../../components/ui/formValidation";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { Icon, type IconName } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { KmInput, QuantityStepper } from "../../components/ui/QuantityStepper";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { VehicleConditionMap, type ExteriorPosition } from "../../components/evidence/VehicleConditionMap";
import { handoverApi, handoverExceptionApi, VEHICLE_POSITIONS, type HandoverInput, type OtpSent } from "../../services/evidenceService";
import type { HandoverChecklistItem, WorkflowHandover, WorkflowOrder } from "../../services/workflowService";
import { printHandover } from "./handoverPrint";
import { OwnerEmailVerify } from "./OwnerEmailVerify";
import { CATEGORY_TEXT, comparedCheckIn, CONDITION_TEXT, confirmationText, DAMAGE, findBefore, FUEL_TEXT, isChanged, RELATION_TEXT, STATUS_TEXT, type CheckInRef } from "./handoverText";
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
const OUT_TABS: typeof TABS = [
  { id: "info", label: "Thông tin trả xe", hint: "ODO, nhiên liệu, người nhận", icon: "user" },
  { id: "condition", label: "Đối chiếu tình trạng", hint: "Lúc nhận → lúc trả, ảnh", icon: "car" },
  { id: "assets", label: "Tài sản hoàn trả", hint: "Chìa khóa, giấy tờ, vật dụng", icon: "key" },
];
const EXTERIOR: ExteriorPosition[] = ["FRONT", "REAR", "LEFT", "RIGHT"];
const BODY_CONDITIONS: Array<HandoverChecklistItem["condition"]> = ["OK", "SCRATCH", "DENT", "BROKEN"];
const ASSET_CONDITIONS: Array<HandoverChecklistItem["condition"]> = ["PRESENT", "MISSING", "BROKEN"];
const ASSET_GROUPS: Array<{ category: HandoverChecklistItem["category"]; add: string; placeholder: string; icon: IconName }> = [
  { category: "KEY", add: "Chìa khóa", placeholder: "VD: Chìa khóa thông minh", icon: "key" },
  { category: "DOCUMENT", add: "Giấy tờ", placeholder: "VD: Giấy đăng ký xe", icon: "file" },
  { category: "ACCESSORY", add: "Vật dụng", placeholder: "VD: Lốp dự phòng, bộ kích", icon: "box" },
];

const BODY_GROUPS: Array<{ category: "EXTERIOR" | "INTERIOR"; title: string; icon: IconName }> = [
  { category: "EXTERIOR", title: "Ngoại thất", icon: "car" },
  { category: "INTERIOR", title: "Nội thất", icon: "layers" },
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
  // Trả xe: giữ nguyên mục lúc nhận để đối chiếu; ODO, nhiên liệu, ghi chú lúc trả do cố vấn nhập mới.
  const checkIn = type === "CHECK_OUT" ? [...(order.handovers ?? [])].reverse().find(x => x.type === "CHECK_IN" && x.status === "CONFIRMED") : undefined;
  const carried = (checkIn?.checklist_items ?? []).map(item => ({ ...item, note: null }));
  const saved = h?.checklist_items?.length ? h.checklist_items : carried.length ? carried : DEFAULT_ITEMS;
  // Nháp cũ có thể đã xoá mục lúc nhận → thêm lại, vì trả xe phải đối chiếu đủ.
  const source = [...saved, ...carried.filter(item => !saved.some(s => s.label.trim().toLowerCase() === item.label.trim().toLowerCase()))];
  return {
    mileage: h?.mileage ?? (checkIn ? null : order.mileage_received ?? null),
    fuel_level: h?.fuel_level ?? (checkIn ? null : "HALF"),
    general_condition: h?.general_condition ?? (checkIn ? "" : order.initial_condition ?? ""),
    valuables_note: h?.valuables_note ?? "",
    person_name: h?.person_name ?? order.customer?.full_name ?? "",
    person_phone: h?.person_phone ?? order.customer?.phone ?? "",
    // API không trả 4 số cuối: để trống = giữ số đã lưu, nhập mới mới đối chiếu lại.
    person_id_last4: null,
    person_relation: h?.person_relation ?? "OWNER",
    pickup_authorization_id: h?.pickup_authorization_id ?? null,
    items: source.map(({ category, position_code, label, condition, quantity, note }) => ({ category, position_code, label, condition, quantity, note })),
  };
}

/** Nút chọn dạng viên (một lựa chọn) — nhiên liệu, quan hệ, tình trạng. Hover chỉ đổi màu. */
function Segmented<T extends string>({ label, value, options, onChange, danger, invalid }: {
  label: string; value: T | null | undefined; options: Array<{ value: T; text: string }>; onChange: (value: T) => void; danger?: (value: T) => boolean; invalid?: boolean;
}) {
  return <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} className="flex flex-wrap gap-1.5">
    {options.map(o => { const on = value === o.value; const bad = on && danger?.(o.value); return <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
      className={`min-h-10 cursor-pointer rounded-control border px-3.5 text-small font-semibold transition-colors max-sm:min-h-11 ${bad
        ? "border-danger bg-danger-soft text-danger-fg"
        : on ? "border-cs-accent bg-cs-soft text-cs-accent-text" : `${invalid ? "border-danger" : "border-cs-border hover:border-cs-border-strong"} bg-cs-surface text-cs-text-2 hover:bg-cs-hover hover:text-cs-text`}`}>{o.text}</button>; })}
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
  const panelErrors = useFieldErrors();
  const [otp, setOtp] = useState<(OtpSent & { handoverId: number }) | null>(null);
  const [code, setCode] = useState("");
  const [voidReason, setVoidReason] = useState<string | null>(null);
  const [exceptionOpen, setExceptionOpen] = useState(false);

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

  /** Xác nhận mã hoặc hủy biên bản: lỗi hiện ngay dưới ô nhập tương ứng. */
  async function runField(field: string, task: () => Promise<unknown>, message: string, apiKey: string) {
    setWorking(true); setError("");
    try { await task(); panelErrors.reset(); setVoidReason(null); await onChanged(message); }
    catch (err) { panelErrors.showApi(err, { [apiKey]: field }); }
    finally { setWorking(false); }
  }
  async function requestCode(id: number) {
    setWorking(true); setError("");
    try { setOtp({ ...(await handoverApi.requestOtp(id)), handoverId: id }); setCode(""); }
    catch (err) { panelErrors.showApi(err); }
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
          : `Chủ xe đã xác nhận ${confirmationText(confirmation?.method)}${confirmation ? ` lúc ${new Date(confirmation.confirmed_at).toLocaleString("vi-VN")}` : ""}${confirmation?.comment ? ` · “${confirmation.comment}”` : ""}.`}</p>
      </div>
    </div>

    {order.requires_check_in && handover?.status !== "CONFIRMED" && <p className="mt-3 flex items-start gap-2 rounded-xl bg-cs-surface-2 px-3 py-2 text-caption text-cs-text-2">
      <Icon name="info" size={14} className="mt-0.5 shrink-0 text-cs-accent-text"/>
      {isOut ? "Chỉ bàn giao xe (hoặc đóng phiếu) khi chủ xe đã xác nhận biên bản trả xe." : "Phiếu chỉ chuyển sang kiểm tra khi khách đã xác nhận biên bản nhận xe."}</p>}

    {order.customer?.email_verified === false && !!order.customer.id && handover?.status !== "CONFIRMED" && <div className="mt-4">
      <OwnerEmailVerify customerId={order.customer.id} currentEmail={order.customer.email ?? ""} title="Chủ xe chưa xác minh email"
        description="Bắt buộc trước khi lưu biên bản. Khách không dùng email có thể dùng email của người thân." onVerified={() => void onChanged("Đã xác minh email chủ xe.")}/>
    </div>}

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
      <p className="mt-0.5 text-caption text-cs-muted">Gửi mã qua email, khách đọc lại mã để xác nhận — hoặc khách tự xác nhận trong tài khoản.</p>
      {!sent ? <div className="mt-3"><Button variant="primary" icon="send" loading={working} onClick={() => void requestCode(handover.id)}>Gửi mã tới email chủ xe</Button></div>
        : <form noValidate className="mt-3 flex flex-wrap items-start gap-2" onSubmit={event => {
            event.preventDefault();
            if (panelErrors.show(code.length !== 6 ? { code: "Nhập đủ 6 số trong email." } : {})) return;
            void runField("code", () => handoverApi.verifyOtp(handover.id, code), `Chủ xe đã xác nhận biên bản ${noun}.`, "code");
          }}>
          <label className="min-w-56 flex-1 text-caption font-semibold text-cs-muted">Mã 6 số đã gửi tới {sent.sent_to}<Req/>
            <input className={`mt-1 ${inputBare}`} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required aria-invalid={!!panelErrors.errors.code || undefined} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "")); panelErrors.clear("code"); }}/>
            <FieldError className="mt-1">{panelErrors.errors.code}</FieldError></label>
          <Button variant="secondary" className="mt-5" disabled={working} onClick={() => void requestCode(handover.id)}>Gửi lại mã</Button>
          <Button type="submit" variant="primary" icon="check" className="mt-5" loading={working}>Xác nhận</Button>
        </form>}
      <div className="mt-3 border-t border-cs-border pt-3">
        {handover.latest_exception?.status === "PENDING"
          ? <p className="text-caption font-semibold text-warning-fg">Đang chờ admin duyệt ngoại lệ.</p>
          : <>
            {handover.latest_exception?.status === "REJECTED" && <p className="mb-2 text-caption font-medium text-danger">Admin đã từ chối: {handover.latest_exception.decision_note}</p>}
            {handover.person_relation === "OWNER" && <Button size="sm" variant="ghost" icon="shield" onClick={() => setExceptionOpen(true)}>Chủ xe mất email, đang có mặt</Button>}
          </>}
      </div>
    </div>}
    {exceptionOpen && handover && <HandoverExceptionModal handoverId={handover.id} onClose={() => setExceptionOpen(false)}
      onDone={() => { setExceptionOpen(false); void onChanged("Đã gửi yêu cầu cho admin duyệt."); }}/>}

    {handover && voidReason !== null && <form noValidate className="mt-4 flex flex-wrap items-start gap-2 rounded-xl border border-danger/40 p-4" onSubmit={event => {
        event.preventDefault();
        if (panelErrors.show(voidReason.trim().length < 5 ? { reason: "Ghi lý do hủy (ít nhất 5 ký tự)." } : {})) return;
        void runField("reason", () => handoverApi.void(handover.id, voidReason.trim()), "Đã hủy biên bản. Lập biên bản mới.", "reason");
      }}>
      <label className="min-w-64 flex-1 text-caption font-semibold text-cs-muted">Lý do hủy biên bản<Req/><input className={`mt-1 ${inputBare}`} required minLength={5} maxLength={1000} aria-invalid={!!panelErrors.errors.reason || undefined} value={voidReason} onChange={e => { setVoidReason(e.target.value); panelErrors.clear("reason"); }} placeholder="VD: ghi sai vị trí hư hỏng, lập lại"/>
        <FieldError className="mt-1">{panelErrors.errors.reason}</FieldError></label>
      <Button variant="secondary" className="mt-5" onClick={() => { setVoidReason(null); panelErrors.clear("reason"); }}>Đóng</Button>
      <Button type="submit" variant="danger-outline" icon="x" className="mt-5" loading={working}>Hủy biên bản</Button>
    </form>}

    {editing && <HandoverEditor order={order} handover={handover} type={type} onClose={() => setEditing(false)} onChanged={onChanged}/>}
    {viewing && handover && <HandoverViewModal code={order.repair_order_code} handover={handover} checkIn={comparedCheckIn(handover, order.handovers)} onClose={() => setViewing(false)} onPrint={() => void print()}/>}
  </section>;
}

/** Màu viên trạng thái: bình thường / có = xanh; xước, móp = vàng đồng; vỡ, thiếu = đỏ. */
function conditionPill(condition: HandoverChecklistItem["condition"]) {
  if (condition === "OK" || condition === "PRESENT") return "border-success/40 bg-success-soft text-success-fg";
  // Xước / móp: vàng cảnh báo (khu cố vấn đổi sang vàng đồng bằng CSS .hv-pill-warn).
  if (condition === "SCRATCH" || condition === "DENT") return "hv-pill-warn border-warning/50 bg-warning-soft text-warning-fg";
  return "border-danger/40 bg-danger-soft text-danger-fg";
}

const INFO_GRID = "lg:grid-cols-[9rem_8rem_minmax(0,1fr)_8.5rem]";

function InfoHead() {
  return <div className={`hidden gap-3 px-4 text-caption font-semibold text-cs-muted lg:grid ${INFO_GRID}`}>
    <span>Hạng mục</span><span>Lúc nhận</span><span>Lúc trả</span><span>Trạng thái</span>
  </div>;
}

/** Dòng số km / nhiên liệu của bước Thông tin trả xe, cùng kiểu hàng với bước Tình trạng và Tài sản. */
function InfoCompareRow({ label, before, status, error, children }: { label: ReactNode; before: string; status?: ReactNode; error?: string; children: ReactNode }) {
  return <li className={`grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3 lg:items-center ${INFO_GRID}`}>
    <div className="min-w-0 text-small font-bold text-cs-text">{label}</div>
    <div className="min-w-0 text-small font-semibold text-cs-text"><span className="mb-1 block text-caption font-normal text-cs-muted lg:hidden">Lúc nhận</span>{before}</div>
    <div className="min-w-0"><span className="mb-1 block text-caption text-cs-muted lg:hidden">Lúc trả</span>{children}<FieldError className="mt-1.5">{error}</FieldError></div>
    <div className="flex min-w-0 items-center">{status}</div>
  </li>;
}

const ASSET_GRID = "lg:grid-cols-[minmax(0,1.1fr)_6rem_8rem_8rem_minmax(0,1.4fr)_8.5rem]";
const BODY_GRID = "lg:grid-cols-[minmax(0,1fr)_8rem_10rem_minmax(0,1.6fr)_8.5rem]";

/** Tiêu đề nhóm trong bước đối chiếu: ô icon + tên + số mục. */
function CompareGroupTitle({ icon, title, count }: { icon: IconName; title: string; count?: number }) {
  return <h3 className="flex items-center gap-3 text-base font-bold text-cs-text">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name={icon} size={20}/></span>
    {title}{count !== undefined && <span className="font-normal text-cs-muted">({count})</span>}
  </h3>;
}

function AssetHead({ withQuantity = true }: { withQuantity?: boolean }) {
  return <div className={`hidden gap-3 px-4 text-caption font-semibold text-cs-muted lg:grid ${withQuantity ? ASSET_GRID : BODY_GRID}`}>
    <span>Hạng mục</span><span>Lúc nhận</span><span>Lúc trả</span>{withQuantity && <span>Số lượng</span>}<span>Ghi chú</span><span>Trạng thái</span>
  </div>;
}

/** Một dòng đối chiếu khi trả xe, dùng chung cho tình trạng xe và tài sản; màn hẹp xếp thành 2 cột có nhãn riêng. */
function AssetCompareRow({ name, before, condition, quantity, note, status, action }: Record<"name" | "before" | "condition" | "note" | "status", ReactNode> & { quantity?: ReactNode; action?: ReactNode }) {
  const small = (text: string) => <span className="mb-1 block text-caption text-cs-muted lg:hidden">{text}</span>;
  return <li className={`grid grid-cols-2 gap-3 rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3 lg:items-center ${quantity === undefined ? BODY_GRID : ASSET_GRID}`}>
    <div className="col-span-2 min-w-0 text-small font-bold text-cs-text lg:col-span-1">{name}</div>
    <div className={`min-w-0 ${quantity === undefined ? "" : "col-span-2 lg:col-span-1"}`}>{small("Lúc nhận")}{before}</div>
    <div className="min-w-0">{small("Lúc trả")}{condition}</div>
    {quantity !== undefined && <div className="min-w-0">{small("Số lượng")}{quantity}</div>}
    <div className="col-span-2 min-w-0 lg:col-span-1">{small("Ghi chú")}{note}</div>
    <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 lg:col-span-1">{status}{action}</div>
  </li>;
}

function BeforeValue({ item }: { item?: HandoverChecklistItem }) {
  if (!item) return <span className="inline-flex rounded-full bg-cs-hover px-3 py-1 text-caption font-semibold text-cs-muted">Không có</span>;
  return <span className="flex flex-col items-start gap-1">
    <span className={`rounded-full border px-3 py-1 text-caption font-semibold ${conditionPill(item.condition)}`}>{CONDITION_TEXT[item.condition]}{item.quantity ? ` × ${item.quantity}` : ""}</span>
    {item.note && <span className="text-caption text-cs-muted font-medium">{item.note}</span>}
  </span>;
}

function CompareBadge({ before, item }: { before?: HandoverChecklistItem; item: HandoverChecklistItem }) {
  if (!before) return <Badge tone="warning">Đã bổ sung</Badge>;
  return isChanged(before, item) ? <Badge tone="warning">Thay đổi</Badge> : <Badge tone="success">Nguyên trạng</Badge>;
}

/**
 * Modal xem biên bản (mockup PO 18/11, tông vàng đồng khu cố vấn): đầu modal có ô biểu tượng + ánh nền,
 * dải 4 thông tin (km, nhiên liệu, người giao/nhận, đồ có giá trị — icon kim cương), "Xe bàn giao" gồm
 * tình trạng từng vị trí (viên màu theo mức), tài sản bàn giao, ảnh tình trạng xe.
 */
export function HandoverViewModal({ code, handover, checkIn, onClose, onPrint, extra, children, footer, dismissible = true, statusText }: {
  code?: string | null; handover: WorkflowHandover; onClose: () => void;
  /** Biên bản trả xe: biên bản nhận xe để hiện "Lúc nhận" cạnh "Lúc trả". */
  checkIn?: CheckInRef | null;
  /** Chữ trạng thái thay mặc định (vd. khách: "Chờ bạn xác nhận"). */
  statusText?: string;
  /** Có thì hiện nút "In biên bản" (cố vấn). */
  onPrint?: () => void;
  /** Nút thêm ở chân modal (vd. trang Biên bản: mở phiếu / tiếp tục lập). */
  extra?: ReactNode;
  /** Nội dung thêm cuối thân modal (vd. khách: ô ghi chú xác nhận). */
  children?: ReactNode;
  /** Thay toàn bộ chân modal (vd. khách: Đóng + Xác nhận đúng tình trạng). */
  footer?: ReactNode;
  dismissible?: boolean;
}) {
  const noun = handover.type === "CHECK_OUT" ? "trả xe" : "nhận xe";
  const compare = handover.type === "CHECK_OUT" ? checkIn ?? comparedCheckIn(handover) : null;

  // Portal ra body: modal `bare` vẽ tại chỗ, nằm trong thẻ có backdrop-filter thì lớp phủ fixed bị giam trong thẻ.
  return createPortal(<Modal bare open onClose={onClose} dismissible={dismissible} title={`Biên bản ${noun}`} className="adv-hv flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border shadow-overlay">
    <header className="adv-hv-head relative flex items-center gap-4 px-6 py-5 sm:px-7">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="car" size={30}/></span>
      <span className="adv-hv-rule" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.6rem] font-bold leading-tight text-cs-text">Biên bản {noun}</h2>
        <p className="mt-1 text-small text-cs-text-2">{code && <>{code}<span className="px-2 text-cs-muted">·</span></>}{statusText ?? STATUS_TEXT[handover.status]}</p>
      </div>
      <IconButton icon="x" label="Đóng" variant="outline" onClick={onClose} disabled={!dismissible} className="relative z-10 self-start"/>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-7"><HandoverSummary handover={handover} checkIn={checkIn} inlineChanges={!!footer}/>{children}</div>

    <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-cs-border px-6 py-4 sm:px-7">
      {footer ?? <>
        {compare && <CompareSummary handover={handover} compare={compare}/>}
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
        {extra}
        {onPrint && <button type="button" className="adv-btn-gold" onClick={onPrint}><Icon name="printer" size={18}/>In biên bản</button>}
      </>}
    </footer>
  </Modal>, document.body);
}

/**
 * Nội dung biên bản dùng chung (modal cố vấn, khung xem nhanh trang Biên bản, trang Tiến độ xe của khách) — PO 18/11:
 * dải 4 thông tin (km, nhiên liệu, người giao/nhận, đồ có giá trị — icon kim cương), "Xe bàn giao" với tình trạng chung,
 * tình trạng từng vị trí + tài sản (đánh số, viên màu theo mức), xác nhận / lý do hủy, ảnh tình trạng xe.
 * Màu nhấn theo khu (cố vấn vàng đồng, khách đỏ) qua token --cs-accent.
 */
export function HandoverSummary({ handover, checkIn, inlineChanges = true }: {
  handover: WorkflowHandover; checkIn?: CheckInRef | null;
  /** Hiện tóm tắt thay đổi cuối nội dung (modal có chân mặc định thì tóm tắt nằm ở chân). */
  inlineChanges?: boolean;
}) {
  const compare = handover.type === "CHECK_OUT" ? checkIn ?? comparedCheckIn(handover) : null;
  if (compare) return <CheckOutCompareView handover={handover} compare={compare} inlineChanges={inlineChanges}/>;

  const items = handover.checklist_items ?? [];
  const body = items.filter(i => i.category === "EXTERIOR" || i.category === "INTERIOR");
  const assets = items.filter(i => i.category !== "EXTERIOR" && i.category !== "INTERIOR");
  const facts: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "gauge", label: "Số km (ODO)", value: handover.mileage != null ? handover.mileage.toLocaleString("vi-VN") : "—" },
    { icon: "fuel", label: "Nhiên liệu", value: FUEL_TEXT[handover.fuel_level ?? ""] ?? "—" },
    { icon: "user", label: handover.type === "CHECK_OUT" ? "Người nhận" : "Người giao", value: `${handover.person_name} · ${RELATION_TEXT[handover.person_relation]}` },
    { icon: "diamond", label: "Đồ có giá trị", value: handover.valuables_note || "Không có" },
  ];
  const pill = (item: HandoverChecklistItem) => <span className={`shrink-0 rounded-full border px-3 py-1 text-caption font-semibold ${conditionPill(item.condition)}`}>
    {CONDITION_TEXT[item.condition]}{item.quantity ? ` × ${item.quantity}` : ""}{item.note ? ` · ${item.note}` : ""}{item.is_discrepancy ? " · Thay đổi so với lúc nhận" : ""}
  </span>;
  const rows = (list: HandoverChecklistItem[]) => <ul className="mt-2 divide-y divide-cs-border">
    {list.map((item, index) => <li key={item.id ?? index} className="grid grid-cols-[26px_minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 py-2.5 pl-1 max-sm:grid-cols-[26px_minmax(0,1fr)_auto]">
      <span className="hv-no">{index + 1}</span>
      <b className="truncate text-cs-text">{item.label}</b>
      <span className="truncate text-small text-cs-muted max-sm:hidden">{CATEGORY_TEXT[item.category]}</span>
      {pill(item)}
    </li>)}
  </ul>;

  return <div className="text-cs-text">
      <dl className="hv-facts grid grid-cols-2 lg:grid-cols-4">
        {facts.map(f => <div key={f.label} className="flex min-w-0 items-center gap-3 px-4 py-3.5">
          <Icon name={f.icon} size={26} className="shrink-0 text-cs-accent-text"/>
          <div className="min-w-0"><dt className="text-caption text-cs-muted">{f.label}</dt><dd className="truncate font-bold text-cs-text" title={f.value}>{f.value}</dd></div>
        </div>)}
      </dl>

      <div className="mt-6 flex items-center gap-3">
        <Icon name="car" size={24} className="shrink-0 text-cs-accent-text"/>
        <h3 className="shrink-0 text-lg font-bold text-cs-text">Xe bàn giao</h3>
        <span className="hv-line h-px flex-1" aria-hidden="true"/>
      </div>
      {handover.general_condition && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-cs-surface-2 px-4 py-2.5 text-small text-cs-text-2"><b className="text-cs-text">{handover.type === "CHECK_OUT" ? "Tình trạng xe khi trả" : "Tình trạng xe khi nhận"}:</b> <span className="font-medium">{handover.general_condition}</span></p>}

      {body.length > 0 && <section className="mt-4">
        <p className="flex items-center gap-2.5 font-bold text-cs-text"><Icon name="clipboard" size={20} className="text-cs-accent-text"/>Tình trạng xe</p>
        {rows(body)}
      </section>}

      {assets.length > 0 && <section className="mt-4 border-t border-cs-border pt-4">
        <p className="flex items-center gap-2.5 font-bold text-cs-text"><Icon name="box" size={20} className="text-cs-accent-text"/>Tài sản bàn giao</p>
        {rows(assets)}
      </section>}

      <HandoverEvidence handover={handover}/>
  </div>;
}

/** Xác nhận của khách, lý do hủy và ảnh — phần cuối chung của mọi biên bản. */
function HandoverEvidence({ handover }: { handover: WorkflowHandover }) {
  const confirmation = handover.confirmations?.[0];
  return <>
    {confirmation && <p className="mt-4 flex items-center gap-2 text-caption text-cs-muted"><Icon name="check" size={14} className="text-success"/>
      Khách xác nhận {confirmationText(confirmation.method)} lúc {new Date(confirmation.confirmed_at).toLocaleString("vi-VN")}{confirmation.comment ? ` · “${confirmation.comment}”` : ""}.</p>}
    {handover.status === "VOID" && handover.void_reason && <p className="mt-4 rounded-xl border border-danger/40 bg-danger-soft px-4 py-2.5 text-small text-danger-fg">Lý do hủy: {handover.void_reason}</p>}
    <section className="mt-4 flex items-start gap-2.5 border-t border-cs-border pt-1">
      <Icon name="image" size={20} className="mt-[1.15rem] shrink-0 text-cs-accent-text"/>
      <div className="min-w-0 flex-1"><PhotoUploader type="handover" id={handover.id} readOnly title="Ảnh tình trạng xe"/></div>
    </section>
  </>;
}

/** Mục đã ghi lúc nhận nhưng biên bản trả xe không có (biên bản cũ trước khi bắt buộc giữ đủ mục). */
const missingFromCheckOut = (handover: WorkflowHandover, compare: CheckInRef) =>
  (compare.checklist_items ?? []).filter(prior => !(handover.checklist_items ?? []).some(item => findBefore(compare, item) === prior));

function CompareSummary({ handover, compare }: { handover: WorkflowHandover; compare: CheckInRef }) {
  const items = handover.checklist_items ?? [];
  const missing = missingFromCheckOut(handover, compare);
  const changes = [
    ...(compare.mileage != null && handover.mileage != null && handover.mileage !== compare.mileage
      ? [`Số km ${handover.mileage > compare.mileage ? "+" : ""}${(handover.mileage - compare.mileage).toLocaleString("vi-VN")} km`] : []),
    ...(handover.fuel_level && handover.fuel_level !== compare.fuel_level
      ? [`Nhiên liệu ${FUEL_TEXT[compare.fuel_level ?? ""] ?? "không ghi"} → ${FUEL_TEXT[handover.fuel_level]}`] : []),
    ...items.filter(item => isChanged(findBefore(compare, item), item)).map(item => item.label),
    ...missing.map(item => `${item.label} (không ghi lúc trả)`),
  ];
  const total = 2 + items.length + missing.length;
  const done = total - missing.length - Number(compare.mileage != null && handover.mileage == null) - Number(!handover.fuel_level);
  const clean = done === total && !changes.length;
  const text = `Đã đối chiếu ${done}/${total} hạng mục${changes.length ? ` · ${changes.length} thay đổi: ${changes.join(", ")}` : done === total ? " · Nguyên trạng" : ""}`;
  return <span title={text} className={`mr-auto flex min-w-40 flex-1 items-center gap-2 text-small font-semibold ${clean ? "text-success-fg" : "text-warning-fg"}`}>
    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-white ${clean ? "bg-success" : "bg-warning"}`} aria-hidden="true"><Icon name={clean ? "check" : "info"} size={14}/></span>
    <span className="min-w-0 truncate">{text}</span>
  </span>;
}

// Theo bề rộng khung chứa (modal rộng hoặc khung xem nhanh hẹp), không theo bề rộng màn hình.
const VIEW_INFO_GRID = "@3xl:grid-cols-[9rem_8rem_minmax(0,1fr)_8.5rem]";
const VIEW_NOTE_GRID = "@3xl:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]";
const VIEW_BODY_GRID = "@3xl:grid-cols-[minmax(0,1fr)_8rem_8rem_minmax(0,1.5fr)_8.5rem]";
const VIEW_ASSET_GRID = "@3xl:grid-cols-[minmax(0,1.1fr)_7rem_7rem_5rem_minmax(0,1.3fr)_8.5rem]";

type ViewColumn = { label: string; wide?: boolean };
const INFO_COLUMNS: ViewColumn[] = [{ label: "Hạng mục" }, { label: "Lúc nhận" }, { label: "Lúc trả" }, { label: "Trạng thái", wide: true }];
const NOTE_COLUMNS: ViewColumn[] = [{ label: "Hạng mục" }, { label: "Lúc nhận", wide: true }, { label: "Lúc trả", wide: true }];
const BODY_COLUMNS: ViewColumn[] = [{ label: "Hạng mục" }, { label: "Lúc nhận" }, { label: "Lúc trả" }, { label: "Ghi chú", wide: true }, { label: "Trạng thái", wide: true }];
const ASSET_COLUMNS: ViewColumn[] = [{ label: "Hạng mục" }, { label: "Lúc nhận" }, { label: "Lúc trả" }, { label: "Số lượng" }, { label: "Ghi chú", wide: true }, { label: "Trạng thái", wide: true }];

function ViewCompareSection({ icon, title, count, grid, columns, rows }: {
  icon: IconName; title: string; count?: number; grid: string; columns: ViewColumn[]; rows: Array<{ key: string; cells: ReactNode[] }>;
}) {
  return <section>
    <div className="mb-3"><CompareGroupTitle icon={icon} title={title} count={count}/></div>
    <div className={`mb-2 hidden gap-3 px-4 text-caption font-semibold text-cs-muted @3xl:grid ${grid}`}>{columns.map(column => <span key={column.label}>{column.label}</span>)}</div>
    <ul className="space-y-2">{rows.map(row => <li key={row.key} className={`grid grid-cols-2 gap-3 rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3 @3xl:items-center ${grid}`}>
      {row.cells.map((cell, index) => <div key={columns[index].label} className={`min-w-0 text-small ${index === 0 ? "col-span-2 font-bold text-cs-text @3xl:col-span-1" : columns[index].wide ? "col-span-2 @3xl:col-span-1" : ""}`}>
        {index > 0 && <span className="mb-1 block text-caption font-normal text-cs-muted @3xl:hidden">{columns[index].label}</span>}{cell}
      </div>)}
    </li>)}</ul>
  </section>;
}

/** Xem biên bản trả xe: cùng bố cục với 3 bước lập biên bản, lúc nhận cạnh lúc trả, chỉ đọc. */
function CheckOutCompareView({ handover, compare, inlineChanges }: { handover: WorkflowHandover; compare: CheckInRef; inlineChanges: boolean }) {
  const items = handover.checklist_items ?? [];
  const missing = missingFromCheckOut(handover, compare);
  const plain = (value?: string | number | null) => <span className="whitespace-pre-wrap font-medium text-cs-text-2">{value === null || value === undefined || value === "" ? "—" : value}</span>;
  const strong = (value: string) => <b className="text-cs-text">{value}</b>;
  const after = (item: HandoverChecklistItem) => <span className={`inline-flex rounded-full border px-3 py-1 text-caption font-semibold ${conditionPill(item.condition)}`}>{CONDITION_TEXT[item.condition]}</span>;
  const notRecorded = <span className="inline-flex rounded-full bg-cs-hover px-3 py-1 text-caption font-semibold text-cs-muted">Không ghi</span>;
  const entries = (category: HandoverChecklistItem["category"]) => [
    ...items.filter(item => item.category === category).map(item => ({ key: `i${item.id ?? item.label}`, label: item.label, prior: findBefore(compare, item), item })),
    ...missing.filter(item => item.category === category).map(item => ({ key: `m${item.id ?? item.label}`, label: item.label, prior: item, item: null })),
  ];
  const status = (entry: ReturnType<typeof entries>[number]) => entry.item ? <CompareBadge before={entry.prior} item={entry.item}/> : <Badge tone="warning">Không ghi</Badge>;
  const km = (value?: number | null) => value != null ? `${value.toLocaleString("vi-VN")} km` : "Không ghi";
  const fuel = (value?: string | null) => FUEL_TEXT[value ?? ""] ?? "Không ghi";
  const kmStatus = handover.mileage == null || compare.mileage == null ? plain(null)
    : handover.mileage === compare.mileage ? <Badge tone="success">Nguyên trạng</Badge>
    : <Badge tone={handover.mileage < compare.mileage ? "danger" : "warning"}>{handover.mileage > compare.mileage ? "+" : ""}{(handover.mileage - compare.mileage).toLocaleString("vi-VN")} km</Badge>;
  const fuelStatus = !handover.fuel_level ? plain(null) : <Badge tone={handover.fuel_level === compare.fuel_level ? "success" : "warning"}>{handover.fuel_level === compare.fuel_level ? "Nguyên trạng" : "Thay đổi"}</Badge>;
  const noteRows = [
    ...(compare.general_condition || handover.general_condition ? [{ key: "general", cells: ["Tình trạng xe", plain(compare.general_condition), plain(handover.general_condition)] }] : []),
    { key: "valuables", cells: ["Đồ có giá trị", plain(compare.valuables_note || "Không có"), plain(handover.valuables_note || "Không có")] },
  ];

  return <div className="@container space-y-6 text-cs-text">
    <ViewCompareSection icon="gauge" title="Số km & nhiên liệu" count={2} grid={VIEW_INFO_GRID} columns={INFO_COLUMNS} rows={[
      { key: "km", cells: ["Số km (ODO)", strong(km(compare.mileage)), strong(km(handover.mileage)), kmStatus] },
      { key: "fuel", cells: ["Nhiên liệu", strong(fuel(compare.fuel_level)), strong(fuel(handover.fuel_level)), fuelStatus] },
    ]}/>

    <section>
      <div className="mb-3"><CompareGroupTitle icon="user" title="Người nhận xe"/></div>
      <dl className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3 @xl:grid-cols-3">
        <div className="min-w-0"><dt className="text-caption text-cs-muted">Họ tên</dt><dd className="truncate text-small font-bold text-cs-text" title={handover.person_name}>{handover.person_name}</dd></div>
        <div className="min-w-0"><dt className="text-caption text-cs-muted">Quan hệ</dt><dd className="text-small font-semibold text-cs-text">{RELATION_TEXT[handover.person_relation]}</dd></div>
        <div className="min-w-0"><dt className="text-caption text-cs-muted">Số điện thoại</dt><dd className="text-small font-semibold tabular-nums text-cs-text">{handover.person_phone || "—"}</dd></div>
      </dl>
    </section>

    {BODY_GROUPS.map(group => { const list = entries(group.category); return list.length > 0 && <ViewCompareSection key={group.category} icon={group.icon} title={group.title} count={list.length} grid={VIEW_BODY_GRID} columns={BODY_COLUMNS}
      rows={list.map(entry => ({ key: entry.key, cells: [entry.label, <BeforeValue item={entry.prior}/>, entry.item ? after(entry.item) : notRecorded, plain(entry.item?.note), status(entry)] }))}/>; })}

    {ASSET_GROUPS.map(group => { const list = entries(group.category); return list.length > 0 && <ViewCompareSection key={group.category} icon={group.icon} title={CATEGORY_TEXT[group.category]} count={list.length} grid={VIEW_ASSET_GRID} columns={ASSET_COLUMNS}
      rows={list.map(entry => ({ key: entry.key, cells: [entry.label, <BeforeValue item={entry.prior}/>, entry.item ? after(entry.item) : notRecorded, plain(entry.item?.quantity), plain(entry.item?.note), status(entry)] }))}/>; })}

    <ViewCompareSection icon="clipboard" title="Ghi nhận khác" grid={VIEW_NOTE_GRID} columns={NOTE_COLUMNS} rows={noteRows}/>

    <div><HandoverEvidence handover={handover}/></div>
    {inlineChanges && <div className="flex rounded-xl border border-cs-border bg-cs-surface-2 px-4 py-3"><CompareSummary handover={handover} compare={compare}/></div>}
  </div>;
}

/** Ngoại lệ duy nhất: chủ xe mất email, có mặt với CCCD + đăng ký xe. Cố vấn chỉ lập yêu cầu, admin mới duyệt. */
function HandoverExceptionModal({ handoverId, onClose, onDone }: { handoverId: number; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [registration, setRegistration] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const fieldErrors = useFieldErrors();

  async function submit() {
    const problems: Record<string, string> = {};
    if (reason.trim().length < 10) problems.reason = "Ghi rõ lý do (ít nhất 10 ký tự).";
    if (!idDocument) problems.id_document = "Tải ảnh CCCD của chủ xe.";
    if (!registration) problems.registration = "Tải ảnh giấy đăng ký xe.";
    if (fieldErrors.show(problems) || !idDocument || !registration) return;
    setWorking(true);
    try { await handoverExceptionApi.request(handoverId, { reason: reason.trim(), idDocument, registration }); onDone(); }
    catch (err) { fieldErrors.showApi(err, { reason: "reason", id_document: "id_document", registration: "registration" }); }
    finally { setWorking(false); }
  }

  return <Modal open onClose={onClose} dismissible={!working} size="md" title="Yêu cầu admin duyệt ngoại lệ"
    description="Chỉ dùng khi chính chủ xe đang có mặt và không truy cập được email đã xác minh."
    footer={<><Button variant="secondary" disabled={working} onClick={onClose}>Hủy</Button><Button variant="primary" icon="send" loading={working} onClick={() => void submit()}>Gửi admin duyệt</Button></>}>
    <div className="space-y-4">
      <Field label="Lý do" required error={fieldErrors.errors.reason}><Textarea rows={3} maxLength={1000} value={reason} onChange={e => { setReason(e.target.value); fieldErrors.clear("reason"); }} placeholder="VD: Chủ xe mất điện thoại, không đăng nhập được email"/></Field>
      <Field label="Ảnh CCCD của chủ xe" required error={fieldErrors.errors.id_document}><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setIdDocument(e.target.files?.[0] ?? null); fieldErrors.clear("id_document"); }}/></Field>
      <Field label="Ảnh giấy đăng ký xe" required error={fieldErrors.errors.registration}><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setRegistration(e.target.files?.[0] ?? null); fieldErrors.clear("registration"); }}/></Field>
    </div>
  </Modal>;
}

const CONDITION_RANK: Record<HandoverChecklistItem["condition"], number> = { OK: 0, PRESENT: 0, SCRATCH: 1, DENT: 2, BROKEN: 3, MISSING: 4 };
/** Mục xấu đi so với lúc nhận: hư hơn, thiếu hoặc giảm số lượng — khớp backend. */
const isWorse = (prior: HandoverChecklistItem | undefined, item: HandoverChecklistItem) =>
  CONDITION_RANK[item.condition] > (prior ? CONDITION_RANK[prior.condition] : 0) || (!!prior && (item.quantity ?? 0) < (prior.quantity ?? 0));

type FormProblem = { tab: Tab; field: string; message: string };
const SERVER_INFO_FIELDS = ["mileage", "fuel_level", "person_name", "person_phone", "person_id_last4", "pickup_authorization_id"];

/** Modal lập / sửa biên bản: 3 phần, footer cố định Hủy – Lưu nháp – Tiếp tục (bước cuối: Lưu biên bản). Chỉ mở khi chưa có biên bản hoặc đang nháp. */
export function HandoverEditor({ order, handover, type, onClose, onChanged }: {
  order: WorkflowOrder; handover: WorkflowHandover | null; type: HandoverType; onClose: () => void; onChanged: (message: string) => Promise<void>;
}) {
  const { confirm, notify } = useAppFeedback();
  const [sendingLink, setSendingLink] = useState(false);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const noun = isOut ? "trả xe" : "nhận xe";
  const tabs = isOut ? OUT_TABS : TABS;
  const compare = isOut ? checkIn ?? null : null;
  // Số đã đối chiếu chỉ còn giá trị khi vẫn là đúng người được ủy quyền đó.
  const savedIdMatches = !!handover?.has_person_id && handover.pickup_authorization_id === form.pickup_authorization_id;

  // Sửa ô nào thì hết lỗi của ô đó. Thêm / xóa dòng làm lệch số thứ tự nên bỏ lỗi của các dòng.
  const clearFieldErrors = (matches: (key: string) => boolean) =>
    setFieldErrors(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !matches(key))));
  const patch = (changes: Partial<HandoverInput>) => {
    setError("");
    clearFieldErrors(key => key in changes || ("items" in changes && key.startsWith("item-")));
    setForm(previous => ({ ...previous, ...changes }));
  };
  const setItem = (index: number, changes: Partial<HandoverChecklistItem>) => {
    if ("label" in changes) clearFieldErrors(key => key === `item-${index}`);
    if ("note" in changes) clearFieldErrors(key => key === `note-${index}`);
    setForm(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, ...changes } : item) }));
  };
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

  /** Mọi lỗi của form, mỗi lỗi gắn với đúng ô nhập để tô đỏ và hiện ngay dưới ô. */
  /** Lưu nháp thì chưa bắt ghi chú cho mục xấu đi; lưu biên bản và chuyển bước thì bắt buộc. */
  function validate(forDraft = false): FormProblem[] {
    const problems: FormProblem[] = [];
    const add = (tabId: Tab, field: string, message: string) => problems.push({ tab: tabId, field, message });
    if (compare?.mileage != null) {
      if (form.mileage == null) add("info", "mileage", "Nhập số km lúc trả xe.");
      else if (form.mileage < compare.mileage) add("info", "mileage", `Số km lúc trả không được thấp hơn lúc nhận (${compare.mileage.toLocaleString("vi-VN")} km).`);
    }
    if (compare && !form.fuel_level) add("info", "fuel_level", "Chọn mức nhiên liệu lúc trả xe.");
    if (isOut && form.person_relation === "AUTHORIZED") {
      if (!form.pickup_authorization_id) add("info", "pickup_authorization_id", "Chọn người được chủ xe ủy quyền nhận xe.");
      if (!form.person_id_last4 && !savedIdMatches) add("info", "person_id_last4", "Nhập 4 số cuối trên giấy tờ của người nhận xe.");
    } else if (!form.person_name.trim()) add("info", "person_name", `Nhập họ tên người ${isOut ? "nhận" : "giao"} xe.`);
    if (form.person_id_last4 && !/^\d{4}$/.test(form.person_id_last4)) add("info", "person_id_last4", "4 số cuối giấy tờ phải đủ 4 chữ số.");
    form.items.forEach((item, index) => { if (!item.label.trim()) add("assets", `item-${index}`, "Nhập tên tài sản."); });
    if (compare && !forDraft) form.items.forEach((item, index) => {
      if (item.label.trim() && isWorse(findBefore(compare, item), item) && !item.note?.trim()) {
        add(item.category === "EXTERIOR" || item.category === "INTERIOR" ? "condition" : "assets", `note-${index}`, "Ghi rõ thay đổi so với lúc nhận.");
      }
    });
    return problems;
  }

  /** Tô đỏ các ô lỗi, chuyển tới bước có lỗi đầu tiên và đưa ô đó vào tầm nhìn. */
  function showProblems(problems: FormProblem[]) {
    setError("");
    setFieldErrors(Object.fromEntries(problems.map(problem => [problem.field, problem.message])));
    setTab(problems[0].tab);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]');
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.focus({ preventScroll: true });
    }));
  }

  /** Lưu nháp (giữ modal để chụp ảnh) hoặc lưu biên bản = khóa nội dung + gửi chủ xe xác nhận. */
  async function save(finish: boolean) {
    const problems = validate(!finish);
    if (problems.length) { showProblems(problems); return; }
    setFieldErrors({});
    if (finish && order.customer?.email_verified === false) { notify("Chủ xe chưa xác minh email. Xác minh email trước khi lưu biên bản.", "error"); return; }
    if (finish && !await confirm({
      title: `Lưu biên bản ${noun}`, reference: order.repair_order_code,
      description: "Biên bản sẽ khóa nội dung và gửi chủ xe xác nhận (trong tài khoản hoặc bằng mã gửi email chủ xe tại quầy). Muốn sửa sau đó phải hủy và lập lại.",
      confirmText: "Lưu và gửi khách", checklist: ["Đã ghi nhận đầy đủ tình trạng xe và chụp ảnh minh chứng."],
    })) return;
    setWorking(true); setError("");
    try {
      let current = id;
      if (current) {
        const { person_id_last4, ...rest } = form;
        const keepSavedId = !person_id_last4 && form.person_relation !== "OWNER";
        await handoverApi.update(current, keepSavedId ? rest as HandoverInput : { ...rest, person_id_last4 });
      }
      else { current = (await handoverApi.create(order.id, form, type)).id; setId(current); }
      if (finish) {
        await handoverApi.submit(current);
        onClose();
        await onChanged(`Đã lưu biên bản ${noun}. Chờ chủ xe xác nhận.`);
      } else await onChanged(id ? "Đã lưu nháp biên bản." : "Đã lưu nháp. Có thể chụp / tải ảnh minh chứng ở phần Tình trạng xe.");
    } catch (err) {
      // Lỗi từ máy chủ gắn được vào ô thì hiện dưới ô; lỗi chung mới hiện ở đầu form.
      const serverErrors = apiFieldErrors(err);
      if (serverErrors.photos) { notify(serverErrors.photos, "error"); setTab("condition"); }
      const fromServer = Object.entries(serverErrors).flatMap(([key, message]): FormProblem[] => {
        const itemNote = key.match(/^items\.(\d+)\.note$/);
        if (itemNote) {
          const category = form.items[Number(itemNote[1])]?.category;
          return [{ tab: category === "EXTERIOR" || category === "INTERIOR" ? "condition" : "assets", field: `note-${itemNote[1]}`, message }];
        }
        const itemLabel = key.match(/^items\.(\d+)\.label$/);
        if (itemLabel) return [{ tab: "assets", field: `item-${itemLabel[1]}`, message }];
        return SERVER_INFO_FIELDS.includes(key) ? [{ tab: "info", field: key, message }] : [];
      });
      if (fromServer.length) showProblems(fromServer);
      else if (!serverErrors.photos) notify(errorText(err), "error");
    }
    finally { setWorking(false); }
  }

  const tabIndex = tabs.findIndex(t => t.id === tab);
  function next() {
    const problems = validate().filter(problem => problem.tab === tab);
    if (problems.length) { showProblems(problems); return; }
    setError(""); setFieldErrors({}); setTab(tabs[tabIndex + 1].id);
  }

  const relations = Object.entries(RELATION_TEXT).filter(([value]) => !isOut || value !== "OTHER").map(([value, text]) => ({ value: value as HandoverInput["person_relation"], text }));
  const assets = form.items.map((item, index) => ({ item, index })).filter(({ item }) => item.category !== "EXTERIOR" && item.category !== "INTERIOR");
  const namedAssets = assets.filter(({ item }) => item.label.trim()).length;
  const flagged = EXTERIOR.filter(code => { const c = exterior(code)?.condition; return !!c && DAMAGE.includes(c); });
  // Đối chiếu: mọi mục thân xe đã ghi + vị trí chưa ghi lúc nhận (để vẫn ghi được hư hỏng mới).
  const bodyRows: Array<{ item: HandoverChecklistItem; index: number }> = [
    ...form.items.map((item, index) => ({ item, index })).filter(({ item }) => item.category === "EXTERIOR" || item.category === "INTERIOR"),
    ...EXTERIOR.filter(code => !exterior(code)).map(code => ({ item: exteriorBase(code), index: -1 })),
    ...(interior ? [] : [{ item: interiorBase, index: -1 }]),
  ];
  const setBody = (row: { item: HandoverChecklistItem; index: number }, changes: Partial<HandoverChecklistItem>) =>
    row.index >= 0 ? setItem(row.index, changes) : patch({ items: [...form.items, { ...row.item, ...changes }] });
  // Tóm tắt ở chân modal: số mục đã đối chiếu và các mục khác lúc nhận của bước đang mở.
  const summaryRows = tab === "condition" ? bodyRows : tab === "assets" ? assets : [];
  const infoChanges = !compare ? [] : [
    ...(compare.mileage != null && form.mileage != null && form.mileage !== compare.mileage
      ? [`Số km ${form.mileage > compare.mileage ? "+" : ""}${(form.mileage - compare.mileage).toLocaleString("vi-VN")} km`] : []),
    ...(form.fuel_level && form.fuel_level !== compare.fuel_level
      ? [`Nhiên liệu ${FUEL_TEXT[compare.fuel_level ?? ""] ?? "không ghi"} → ${FUEL_TEXT[form.fuel_level]}`] : []),
  ];
  const infoDone = Number(compare?.mileage == null || form.mileage != null) + Number(!!form.fuel_level);
  const summaryTotal = tab === "info" ? 2 : summaryRows.length;
  const summaryDone = tab === "info" ? infoDone : tab === "assets" ? namedAssets : bodyRows.filter(row => row.index >= 0).length;
  const summaryChanges = tab === "info" ? infoChanges
    : summaryRows.filter(row => row.index >= 0 && row.item.label.trim() && isChanged(findBefore(compare, row.item), row.item)).map(row => row.item.label.trim());
  const summaryClean = summaryDone === summaryTotal && !summaryChanges.length;
  const summaryText = `Đã đối chiếu ${summaryDone}/${summaryTotal} ${tab === "assets" ? "tài sản" : "hạng mục"}${summaryChanges.length ? ` · ${summaryChanges.length} thay đổi: ${summaryChanges.join(", ")}` : summaryDone === summaryTotal ? " · Nguyên trạng" : ""}`;

  return <Modal open onClose={onClose} dismissible={!working} size="xl" className="max-h-[90vh]!"
    title={<span className="flex items-center gap-3.5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cs-soft text-cs-accent-text" aria-hidden="true"><Icon name="car" size={25}/></span>
      <span className="min-w-0"><span className="block">{handover ? "Biên bản" : "Lập biên bản"} {noun}</span>
        <span className="block truncate text-small font-normal text-cs-muted">{order.repair_order_code ?? ""} · {order.vehicle?.license_plate || "xxx.xx"} · {order.customer?.full_name ?? ""}</span></span>
    </span>}
    footer={<>
      {compare && summaryTotal > 0 && <span title={summaryText} className={`mr-auto flex min-w-40 flex-1 items-center gap-2 text-small font-semibold ${summaryClean ? "text-success-fg" : "text-warning-fg"}`}>
        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-white ${summaryClean ? "bg-success" : "bg-warning"}`} aria-hidden="true"><Icon name={summaryClean ? "check" : "info"} size={14}/></span>
        <span className="min-w-0 truncate">{summaryText}</span>
      </span>}
      {tabIndex > 0
        ? <Button variant="secondary" icon="chevron-left" disabled={working} onClick={() => { setError(""); setTab(tabs[tabIndex - 1].id); }}>Quay lại</Button>
        : <Button variant="secondary" disabled={working} onClick={onClose}>Hủy</Button>}
      <Button variant="outline" icon="file" loading={working} onClick={() => void save(false)}>Lưu nháp</Button>
      {/* Bước 1–2: "Tiếp tục" (kiểm bước hiện tại rồi sang bước sau); chỉ bước cuối mới "Lưu biên bản". */}
      {tabIndex < tabs.length - 1
        ? <button type="button" className="adv-btn-gold" disabled={working} onClick={next}>Tiếp tục<Icon name="arrow-right" size={18}/></button>
        : <button type="button" className="adv-btn-gold" disabled={working} onClick={() => void save(true)}><Icon name="check" size={18}/>Lưu biên bản</button>}
    </>}>
    <div role="tablist" aria-label="Các phần của biên bản" className="sticky -top-5 z-10 -mx-5 -mt-5 mb-5 grid grid-cols-3 gap-2 border-b border-cs-border bg-cs-surface px-5 py-3 sm:-mx-6 sm:px-6">
      {tabs.map((t, i) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
        className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${tab === t.id ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:bg-cs-hover"}`}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-caption font-bold ${tab === t.id ? "bg-cs-accent text-cs-accent-contrast" : "bg-cs-surface-2 text-cs-muted"}`}>{i + 1}</span>
        <span className="min-w-0"><b className="block truncate text-small text-cs-text">{t.label}</b><span className="hidden truncate text-caption text-cs-muted sm:block">{t.hint}</span></span>
      </button>)}
    </div>
    {error && <Notice tone="error">{error}</Notice>}

    {tab === "info" && <div className="grid gap-5 md:grid-cols-2">
      {compare ? <section className="md:col-span-2">
        <div className="mb-3"><CompareGroupTitle icon="gauge" title="Số km & nhiên liệu" count={2}/></div>
        <div className="space-y-2"><InfoHead/>
        <ul className="space-y-2">
          <InfoCompareRow error={fieldErrors.mileage} label={<>Số km (ODO){compare.mileage != null && <Req/>}</>} before={compare.mileage != null ? `${compare.mileage.toLocaleString("vi-VN")} km` : "Không ghi"}
            status={form.mileage == null || compare.mileage == null ? null
              : form.mileage === compare.mileage ? <Badge tone="success">Nguyên trạng</Badge>
              : <Badge tone={form.mileage < compare.mileage ? "danger" : "warning"}>{form.mileage > compare.mileage ? "+" : ""}{(form.mileage - compare.mileage).toLocaleString("vi-VN")} km</Badge>}>
            <KmInput label="Số km lúc trả" invalid={!!fieldErrors.mileage} value={form.mileage ?? ""} onChange={v => patch({ mileage: v === "" ? null : Number(v) })}/>
          </InfoCompareRow>
          <InfoCompareRow error={fieldErrors.fuel_level} label={<>Nhiên liệu<Req/></>} before={FUEL_TEXT[compare.fuel_level ?? ""] ?? "Không ghi"}
            status={form.fuel_level ? <Badge tone={form.fuel_level === compare.fuel_level ? "success" : "warning"}>{form.fuel_level === compare.fuel_level ? "Nguyên trạng" : "Thay đổi"}</Badge> : null}>
            <Segmented label="Mức nhiên liệu lúc trả" invalid={!!fieldErrors.fuel_level} value={form.fuel_level} onChange={fuel_level => patch({ fuel_level })} options={Object.entries(FUEL_TEXT).map(([value, text]) => ({ value, text }))}/>
          </InfoCompareRow>
        </ul></div>
      </section> : <>
        <Field label="Số km (ODO)" error={fieldErrors.mileage} hint={isOut ? "Số trên đồng hồ lúc trả xe." : "Số trên đồng hồ lúc giao xe."}><KmInput label="Số km (ODO)" value={form.mileage ?? ""} onChange={v => patch({ mileage: v === "" ? null : Number(v) })}/></Field>
        <div className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Nhiên liệu</span>
          <Segmented label="Mức nhiên liệu" invalid={!!fieldErrors.fuel_level} value={form.fuel_level ?? "HALF"} onChange={fuel_level => patch({ fuel_level })} options={Object.entries(FUEL_TEXT).map(([value, text]) => ({ value, text }))}/>
          <FieldError>{fieldErrors.fuel_level}</FieldError></div>
      </>}
      {compare && <div className="md:col-span-2"><CompareGroupTitle icon="user" title="Người nhận xe"/></div>}
      <div className="flex flex-col gap-1.5 md:col-span-2"><span className="text-label text-cs-text-2">{isOut ? "Người nhận xe là" : "Người giao xe là"}<Req/></span>
        <Segmented label={isOut ? "Người nhận xe" : "Người giao xe"} value={form.person_relation} onChange={changeRelation} options={relations}/></div>
      {isOut && form.person_relation === "AUTHORIZED"
        ? <Field label="Người chủ xe đã ủy quyền" required error={fieldErrors.pickup_authorization_id} className="md:col-span-2" hint={<span className="flex flex-wrap items-center gap-x-3 gap-y-1">Chủ xe tự khai, nhân viên không tạo thay.
            <button type="button" className="font-semibold text-cs-accent-text hover:underline disabled:opacity-50" disabled={sendingLink} onClick={() => {
              setSendingLink(true);
              handoverApi.sendPickupLink(order.id)
                .then(result => notify(`Đã gửi link ủy quyền tới ${result.sent_to}. Sau khi chủ xe khai xong, bấm Tải lại danh sách.`, "success"))
                .catch(err => notify(errorText(err), "error"))
                .finally(() => setSendingLink(false));
            }}>{sendingLink ? "Đang gửi..." : "Gửi link ủy quyền tới email chủ xe"}</button>
            <button type="button" className="font-semibold text-cs-accent-text hover:underline" onClick={() => void onChanged("Đã tải lại danh sách ủy quyền.")}>Tải lại danh sách</button>
          </span>}>
          <Select value={form.pickup_authorization_id ?? ""} onChange={e => patch({ pickup_authorization_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{activeAuthorizations.length ? "Chọn người được ủy quyền…" : "Chủ xe chưa khai báo ủy quyền"}</option>
            {activeAuthorizations.map(a => <option key={a.id} value={a.id}>{a.full_name} · {a.phone}</option>)}
          </Select></Field>
        : <>
          <Field label={`Họ tên người ${isOut ? "nhận" : "giao"}`} required error={fieldErrors.person_name}><Input maxLength={150} value={form.person_name} onChange={e => patch({ person_name: e.target.value })}/></Field>
          <Field label="Số điện thoại" optional error={fieldErrors.person_phone}><Input inputMode="tel" maxLength={20} value={form.person_phone ?? ""} onChange={e => patch({ person_phone: e.target.value })}/></Field>
        </>}
      {form.person_relation !== "OWNER" && <Field label="4 số cuối giấy tờ tùy thân" required={isOut} optional={!isOut} error={fieldErrors.person_id_last4} hint={isOut ? "Xem giấy tờ gốc của người nhận và nhập 4 số cuối để đối chiếu." : "Người giao không phải chủ xe."}>
        <Input inputMode="numeric" maxLength={4} value={form.person_id_last4 ?? ""} autoComplete="off" placeholder={(isOut ? savedIdMatches : handover?.has_person_id) ? "Đã đối chiếu, nhập lại nếu đổi" : "Nhập 4 số cuối"} onChange={e => patch({ person_id_last4: e.target.value.replace(/\D/g, "") || null })}/></Field>}
    </div>}

    {tab === "condition" && compare && <div className="space-y-5">
      {BODY_GROUPS.map(group => { const rows = bodyRows.filter(row => row.item.category === group.category); return <section key={group.category}>
        <div className="mb-3"><CompareGroupTitle icon={group.icon} title={group.title} count={rows.length}/></div>
        <div className="space-y-2"><AssetHead withQuantity={false}/><ul className="space-y-2">{rows.map(row => { const prior = findBefore(compare, row.item); return <AssetCompareRow key={row.item.label}
          name={row.item.label}
          before={<BeforeValue item={prior}/>}
          condition={<select className={inputBare} aria-label={`Tình trạng ${row.item.label} lúc trả`} value={row.item.condition} onChange={e => setBody(row, { condition: e.target.value as HandoverChecklistItem["condition"] })}>
            {BODY_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_TEXT[c]}</option>)}
            {!BODY_CONDITIONS.includes(row.item.condition) && <option value={row.item.condition}>{CONDITION_TEXT[row.item.condition]}</option>}
          </select>}
          note={<><input className={inputBare} maxLength={500} aria-label={`Ghi chú ${row.item.label} lúc trả`} aria-invalid={!!fieldErrors[`note-${row.index}`] || undefined} placeholder="Ghi chú" value={row.item.note ?? ""} onChange={e => setBody(row, { note: e.target.value })}/><FieldError className="mt-1">{fieldErrors[`note-${row.index}`]}</FieldError></>}
          status={row.index >= 0 ? <CompareBadge before={prior} item={row.item}/> : <Badge tone="neutral">Chưa ghi</Badge>}/>; })}</ul></div>
      </section>; })}
      <Field label="Tình trạng xe khi trả" optional hint={compare.general_condition ? <>Khi nhận:<span className="font-medium text-cs-text">{compare.general_condition}</span></> : undefined}><Textarea rows={2} maxLength={2000} value={form.general_condition ?? ""} onChange={e => patch({ general_condition: e.target.value })} placeholder="VD: Xe đã rửa sạch, đèn check engine đã tắt"/></Field>
      {id ? <PhotoUploader type="handover" id={id} title="Ảnh lúc trả xe (chọn vị trí trước khi chụp)" positions={VEHICLE_POSITIONS} positionValue={photoPosition} onPositionChange={setPhotoPosition}/>
        : <p className="flex items-start gap-2 rounded-xl border border-dashed border-cs-border px-3 py-3 text-caption text-cs-muted"><Icon name="info" size={15} className="mt-0.5 shrink-0"/>Bấm “Lưu nháp” để chụp / tải ảnh lúc trả xe.</p>}
    </div>}

    {tab === "condition" && !compare && <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <VehicleConditionMap value={position} onChange={next => { setPosition(next); setPhotoPosition(next); }} items={form.items}/>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5"><span className="text-label text-cs-text-2">Tình trạng {VEHICLE_POSITIONS[position].toLowerCase()}</span>
            <Segmented label={`Tình trạng ${VEHICLE_POSITIONS[position]}`} value={selected?.condition ?? "OK"} danger={c => c !== "OK"}
              options={BODY_CONDITIONS.map(c => ({ value: c, text: CONDITION_TEXT[c] }))}
              onChange={condition => upsert(i => i.category === "EXTERIOR" && i.position_code === position, exteriorBase(position), { condition })}/>
            {isOut && before && <span className="text-caption text-cs-muted">Lúc nhận xe: {CONDITION_TEXT[before.condition]}{before.note ? ` · ${before.note}` : ""}</span>}
          </div>
          <Field label="Mô tả vị trí / vết hư hỏng" optional><Textarea rows={3} maxLength={500} value={selected?.note ?? ""} placeholder="VD: Xước 5 cm ở góc cản trước bên trái"
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
        <Field label="Tình trạng xe khi nhận" optional><Textarea rows={3} maxLength={2000} value={form.general_condition ?? ""} onChange={e => patch({ general_condition: e.target.value })} placeholder="VD: Xe bẩn nhẹ, đèn check engine sáng"/></Field>
      </div>
      <p className="text-caption text-cs-muted">{flagged.length ? <>Đã ghi hư hỏng ở: <b className="text-danger">{flagged.map(code => VEHICLE_POSITIONS[code]).join(", ")}</b>.</> : "Chưa ghi hư hỏng ngoại thất nào."}</p>
    </div>}

    {tab === "assets" && <div className="space-y-5">
      {ASSET_GROUPS.map(group => { const rows = assets.filter(({ item }) => item.category === group.category); return <section key={group.category}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <CompareGroupTitle icon={group.icon} title={CATEGORY_TEXT[group.category]} count={rows.length}/>
          <Button variant="tonal" icon="plus" onClick={() => patch({ items: [...form.items, { category: group.category, label: "", condition: "PRESENT", quantity: group.category === "KEY" ? 1 : null }] })}>Thêm {group.add.toLowerCase()}</Button>
        </div>
        {rows.length && compare ? <div className="space-y-2"><AssetHead/><ul className="space-y-2">{rows.map(({ item, index }) => { const prior = findBefore(compare, item); return <AssetCompareRow key={index}
          name={prior ? item.label : <><input className={inputBare} aria-label={`Tên ${CATEGORY_TEXT[group.category].toLowerCase()}`} aria-invalid={!!fieldErrors[`item-${index}`] || undefined} required maxLength={150} value={item.label} placeholder={group.placeholder} onChange={e => setItem(index, { label: e.target.value })}/><FieldError className="mt-1">{fieldErrors[`item-${index}`]}</FieldError></>}
          before={<BeforeValue item={prior}/>}
          condition={<select className={inputBare} aria-label="Tình trạng lúc trả" value={item.condition} onChange={e => setItem(index, { condition: e.target.value as HandoverChecklistItem["condition"] })}>
            {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_TEXT[c]}</option>)}
            {!ASSET_CONDITIONS.includes(item.condition) && <option value={item.condition}>{CONDITION_TEXT[item.condition]}</option>}
          </select>}
          quantity={<QuantityStepper label={`Số lượng ${item.label || "tài sản"} lúc trả`} size="md" className="w-full" min={0} allowEmpty placeholder="0" value={item.quantity ?? null} onChange={v => setItem(index, { quantity: v })}/>}
          note={<><input className={inputBare} aria-label="Ghi chú lúc trả" aria-invalid={!!fieldErrors[`note-${index}`] || undefined} maxLength={500} value={item.note ?? ""} placeholder="Ghi chú" onChange={e => setItem(index, { note: e.target.value })}/><FieldError className="mt-1">{fieldErrors[`note-${index}`]}</FieldError></>}
          status={<CompareBadge before={prior} item={item}/>}
          action={prior ? undefined : <IconButton icon="trash" size="sm" tone="danger" label="Xóa dòng" onClick={() => patch({ items: form.items.filter((_, i) => i !== index) })}/>}/>; })}</ul></div> : rows.length ? <ul className="space-y-2">{rows.map(({ item, index }) => <li key={index} className="grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-3 sm:grid-cols-[minmax(0,1.4fr)_140px_9rem_minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0"><input className={inputBare} aria-label={`Tên ${CATEGORY_TEXT[group.category].toLowerCase()}`} aria-invalid={!!fieldErrors[`item-${index}`] || undefined} required maxLength={150} value={item.label} placeholder={group.placeholder} onChange={e => setItem(index, { label: e.target.value })}/><FieldError className="mt-1">{fieldErrors[`item-${index}`]}</FieldError></div>
          <select className={inputBare} aria-label="Tình trạng" value={item.condition} onChange={e => setItem(index, { condition: e.target.value as HandoverChecklistItem["condition"] })}>
            {ASSET_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_TEXT[c]}</option>)}
            {!ASSET_CONDITIONS.includes(item.condition) && <option value={item.condition}>{CONDITION_TEXT[item.condition]}</option>}
          </select>
          <QuantityStepper label={`Số lượng ${item.label || "tài sản"}`} size="md" className="w-full" min={0} allowEmpty placeholder="SL" value={item.quantity ?? null} onChange={v => setItem(index, { quantity: v })}/>
          <input className={inputBare} aria-label="Ghi chú" maxLength={500} value={item.note ?? ""} placeholder="Ghi chú" onChange={e => setItem(index, { note: e.target.value })}/>
          <IconButton icon="trash" tone="danger" label="Xóa dòng" onClick={() => patch({ items: form.items.filter((_, i) => i !== index) })}/>
        </li>)}</ul> : <p className="rounded-xl border border-dashed border-cs-border px-3 py-3 text-caption text-cs-muted">Chưa có.</p>}
      </section>; })}
      <Field label={compare ? "Đồ có giá trị lúc trả" : "Đồ có giá trị khách để lại trong xe"} optional hint={compare ? <>Lúc nhận: <span className="font-medium text-cs-text">{compare.valuables_note || "Không có"}</span></> : "Ghi rõ để hai bên đối chiếu khi trả xe."}><Textarea rows={2} maxLength={1000} value={form.valuables_note ?? ""} onChange={e => patch({ valuables_note: e.target.value })} placeholder="VD: Không có / Kính mát trong hộc táp-lô"/></Field>
    </div>}
  </Modal>;
}
