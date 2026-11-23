import { ToastError } from "../../components/ui/ToastError";
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useLiveRefresh } from "../../services/liveSync";
import { formatDate, formatDateTime, type CustomerRepairOrder } from "../../services/customerApi";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { getStatus } from "../../config/status";
import { Button } from "../../components/ui/Button";
import { DateTimeInput } from "../../components/ui/DateInput";
import { Icon, type IconName } from "../../components/ui/Icon";
import { controlClass } from "../../components/ui/fieldContext";
import { PhotoUploader } from "../../components/evidence/PhotoUploader";
import { HandoverViewModal } from "../advisor/CheckInPanel";
import { comparedCheckIn, type CheckInRef } from "../advisor/handoverText";
import { handoverApi, pickupAuthorizationApi } from "../../services/evidenceService";
import type { PickupAuthorization, WorkflowHandover } from "../../services/workflowService";
import { userErrorMessage } from "../../services/apiError";

/**
 * Giấy tờ của một phiếu sửa chữa phía khách (PO 18/11/2026): biên bản nhận / trả xe (xem & tự xác nhận),
 * kết quả chẩn đoán (kèm ảnh), ủy quyền nhận xe. Hiện ngay trong chi tiết phiếu ở "Tra cứu tiến độ" (/repair-status) —
 * trang riêng /customer/repair-status/manage cũ (lặp tiến độ, nhật ký) chỉ còn chuyển hướng về đó.
 */

function Card({ id, title, icon, badge, children }: { id?: string; title: string; icon: IconName; badge?: ReactNode; children: ReactNode }) {
  return <section id={id} aria-label={title} className="scroll-mt-24 rounded-2xl border border-cs-border bg-cs-surface p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-extrabold text-cs-text"><span className="text-cs-accent-text"><Icon name={icon} size={18}/></span>{title}</h3>
      {badge}
    </div>
    {children}
  </section>;
}

/** Biên bản nhận / trả xe gara gửi: xem lại và tự xác nhận trong tài khoản (P2). Biên bản chờ xác nhận mở sẵn, đã xác nhận thu gọn. */
function CustomerHandoverBlock({ handovers, code, onConfirmed }: { handovers: WorkflowHandover[]; code?: string | null; onConfirmed: () => void }) {
  const shown = handovers.filter(h => h.status === "SUBMITTED" || h.status === "CONFIRMED");
  const waiting = shown.some(h => h.status === "SUBMITTED");
  if (!shown.length) return null;
  return <Card id="bien-ban" title="Biên bản giao nhận xe" icon="file" badge={waiting ? <Badge tone="warning">Chờ bạn xác nhận</Badge> : <Badge tone="success">Đã xác nhận</Badge>}>
    <div className="space-y-3">{shown.map(h => <HandoverItem key={h.id} handover={h} checkIn={comparedCheckIn(h, handovers)} code={code} onConfirmed={onConfirmed}/>)}</div>
  </Card>;
}

/**
 * Một biên bản phía khách: dòng gọn + nút "Xem biên bản" mở modal (cùng modal khu cố vấn, tông đỏ của khách, sáng / tối theo theme).
 * Biên bản chờ xác nhận: khung nổi bật; modal có ô ghi chú + "Xác nhận đúng tình trạng". Vào từ thông báo (#bien-ban) → tự mở.
 */
function HandoverItem({ handover, checkIn, code, onConfirmed }: { handover: WorkflowHandover; checkIn: CheckInRef | null; code?: string | null; onConfirmed: () => void }) {
  const { hash } = useLocation();
  const waiting = handover.status === "SUBMITTED";
  const [open, setOpen] = useState(waiting && hash === "#bien-ban");
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const noun = handover.type === "CHECK_OUT" ? "trả xe" : "nhận xe";
  const confirmation = handover.confirmations?.[0];

  function confirm() {
    setWorking(true); setError("");
    handoverApi.confirmAsCustomer(handover.id, comment.trim() || undefined).then(() => { setOpen(false); onConfirmed(); })
      .catch((err: unknown) => setError(userErrorMessage(err, "Không xác nhận được.")))
      .finally(() => setWorking(false));
  }

  return <>
    <div className={`flex flex-wrap items-center gap-3 rounded-xl p-4 ${waiting ? "border-2 border-warning/60 bg-warning-soft/30" : "border border-cs-border"}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${waiting ? "bg-warning-soft text-warning-fg" : "bg-success-soft text-success-fg"}`}><Icon name={waiting ? "info" : "check"} size={16}/></span>
      <span className="min-w-0 flex-1 text-sm"><b className="block text-cs-text">Biên bản {noun}</b>
        <span className="text-xs text-cs-muted">{waiting
          ? `Chờ bạn xác nhận — kiểm tra số km, tình trạng xe, tài sản và ảnh lúc ${handover.type === "CHECK_OUT" ? "nhận lại xe" : "giao xe cho gara"}.`
          : `Bạn đã xác nhận${confirmation ? ` lúc ${formatDateTime(confirmation.confirmed_at)}` : ""}.`}</span></span>
      <Button size="sm" variant={waiting ? "primary" : "outline"} icon="eye" onClick={() => setOpen(true)}>{waiting ? "Xem & xác nhận biên bản" : "Xem biên bản"}</Button>
    </div>

    {open && <HandoverViewModal code={code} handover={handover} checkIn={checkIn} onClose={() => setOpen(false)} dismissible={!working}
      statusText={waiting ? "Chờ bạn xác nhận" : handover.status === "CONFIRMED" ? "Bạn đã xác nhận" : undefined}
      footer={waiting
        ? <><p className="mr-auto text-xs text-cs-muted">Thấy sai? Liên hệ gara để lập lại biên bản trước khi xác nhận.</p>
          <Button variant="secondary" disabled={working} onClick={() => setOpen(false)}>Để sau</Button>
          <Button variant="primary" icon="check" loading={working} onClick={confirm}>Xác nhận đúng tình trạng</Button></>
        : <Button variant="secondary" onClick={() => setOpen(false)}>Đóng</Button>}>
      {waiting && <div className="mt-5 space-y-2 border-t border-cs-border pt-4">
        <label className="block text-xs font-semibold text-cs-muted">Ghi chú cho gara (không bắt buộc)
          <textarea className={`mt-1.5 ${controlClass}`} rows={2} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} placeholder="VD: Đúng tình trạng, lưu ý vết xước cửa sau đã có từ trước"/></label>
        <ToastError message={error}/>
      </div>}
    </HandoverViewModal>}
  </>;
}

type CustomerInspection = NonNullable<CustomerRepairOrder["inspections"]>[number];
type InspectionRecommendation = NonNullable<CustomerInspection["recommendations"]>[number];

const toneOf = (status?: string | null) => status ? getStatus("inspection", status, "customer").tone : "neutral";
const SEVERITY: Record<string, number> = { danger: 0, warning: 1 };
const RESULT_STYLE: Record<string, { icon: IconName; className: string }> = {
  success: { icon: "check", className: "bg-success-soft text-success-fg" },
  warning: { icon: "alert", className: "bg-warning-soft text-warning-fg" },
  danger: { icon: "alert", className: "bg-danger-soft text-danger-fg" },
};
const NEUTRAL_RESULT = { icon: "info" as IconName, className: "bg-neutral-soft text-neutral-fg" };

function DiagnosisHeading({ icon, title, count }: { icon: IconName; title: string; count?: number }) {
  return <h4 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-cs-text">
    <span className="text-cs-muted"><Icon name={icon} size={16}/></span>{title}
    {count !== undefined && <span className="rounded-full bg-cs-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums text-cs-muted">{count}</span>}
  </h4>;
}

function RecommendationGroup({ title, icon, items }: { title: string; icon: IconName; items: InspectionRecommendation[] }) {
  if (!items.length) return null;
  return <div className="min-w-0 rounded-xl border border-cs-border">
    <p className="flex items-center gap-2 border-b border-cs-border bg-cs-surface-2 px-4 py-2.5 text-xs font-bold text-cs-text-2 first:rounded-t-xl">
      <span className="text-cs-accent-text"><Icon name={icon} size={15}/></span>{title} ({items.length})
    </p>
    <ul className="divide-y divide-cs-border">{items.map(rec => <li key={rec.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="min-w-0 break-words font-medium text-cs-text">{rec.part?.name || rec.service?.name || "—"}</span>
      <span className="shrink-0 text-xs text-cs-muted">SL <b className="tabular-nums text-cs-text">{rec.quantity ?? 1}</b></span>
    </li>)}</ul>
  </div>;
}

/** Kết quả chẩn đoán gara ghi nhận (P3): khách xem trước khi duyệt báo giá. Hạng mục cần xử lý được xếp lên đầu. */
function CustomerDiagnosisBlock({ inspection }: { inspection: CustomerInspection }) {
  const items = [...(inspection.items ?? [])].sort((a, b) => (SEVERITY[toneOf(a.condition_status)] ?? 2) - (SEVERITY[toneOf(b.condition_status)] ?? 2));
  const count = (tone: string) => items.filter(item => toneOf(item.condition_status) === tone).length;
  const passed = count("success"), warning = count("warning"), danger = count("danger");
  const attention = warning + danger;
  const recommendations = inspection.recommendations ?? [];
  const notes = ([
    ["clipboard", "Tình trạng xe ghi nhận", inspection.condition_description],
    ["search", "Kết luận của gara", inspection.diagnosis],
  ] as Array<[IconName, string, string | null | undefined]>).filter(([, , text]) => text?.trim());
  const badge = attention ? <Badge tone={danger ? "danger" : "warning"}>{attention} mục cần chú ý</Badge>
    : items.length && passed === items.length ? <Badge tone="success">Tất cả đạt</Badge> : undefined;

  return <Card title="Kết quả chẩn đoán" icon="search" badge={badge}>
    <div className="space-y-5">
      {inspection.inspected_at && <p className="-mt-2 flex items-center gap-1.5 text-xs text-cs-muted"><Icon name="clock" size={14}/>Hoàn tất lúc {formatDateTime(inspection.inspected_at)}</p>}

      {notes.length > 0 && <div className={`grid gap-3 ${notes.length > 1 ? "md:grid-cols-2" : ""}`}>
        {notes.map(([icon, title, text]) => <div key={title} className="min-w-0 rounded-xl bg-cs-surface-2 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-cs-muted"><Icon name={icon} size={14}/>{title}</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-cs-text">{text}</p>
        </div>)}
      </div>}

      {items.length > 0 && <div>
        <DiagnosisHeading icon="list" title="Hạng mục đã kiểm tra" count={items.length}/>
        <dl className="mb-3 grid grid-cols-3 gap-2">
          {([["Đạt", passed, "success"], ["Cần lưu ý", warning, "warning"], ["Cần xử lý", danger, "danger"]] as const).map(([label, value, tone]) =>
            <div key={label} className={`rounded-xl px-3 py-2 ${value ? RESULT_STYLE[tone].className : "bg-cs-surface-2 text-cs-muted"}`}>
              <dt className="truncate text-xs font-semibold">{label}</dt>
              <dd className="text-lg font-extrabold tabular-nums">{value}</dd>
            </div>)}
        </dl>
        <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{items.map(item => {
          const style = RESULT_STYLE[toneOf(item.condition_status)] ?? NEUTRAL_RESULT;
          return <li key={item.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${style.className}`} aria-hidden="true"><Icon name={style.icon} size={14}/></span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold text-cs-text">{item.item_name}</span>
              {item.condition_description && <span className="mt-0.5 block whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-cs-muted">{item.condition_description}</span>}
            </span>
            {item.condition_status ? <StatusBadge domain="inspection" status={item.condition_status} audience="customer" className="shrink-0"/>
              : <span className="shrink-0 text-xs text-cs-muted">Chưa đánh giá</span>}
          </li>;
        })}</ul>
      </div>}

      {recommendations.length > 0 && <div>
        <DiagnosisHeading icon="wrench" title="Gara đề xuất" count={recommendations.length}/>
        <div className="grid items-start gap-3 md:grid-cols-2">
          <RecommendationGroup title="Dịch vụ" icon="wrench" items={recommendations.filter(rec => rec.item_type !== "PART")}/>
          <RecommendationGroup title="Phụ tùng" icon="box" items={recommendations.filter(rec => rec.item_type === "PART")}/>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-info-soft px-3 py-2 text-xs font-medium text-info-fg">
          <span className="mt-px shrink-0"><Icon name="info" size={14}/></span>Gara chỉ thực hiện các đề xuất bạn đồng ý trong báo giá.
        </p>
      </div>}

      <div className="border-t border-cs-border pt-4"><PhotoUploader type="inspection" id={inspection.id} readOnly title="Ảnh chẩn đoán"/></div>
    </div>
  </Card>;
}

/** Ủy quyền nhận xe (P4, N9): chủ xe khai báo trước người được nhận xe thay; gara đối chiếu 4 số cuối giấy tờ. */
function CustomerPickupBlock({ orderId }: { orderId: number }) {
  const [items, setItems] = useState<PickupAuthorization[]>([]);
  const [form, setForm] = useState({ full_name: "", phone: "", id_last4: "", valid_until: "" });
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    pickupAuthorizationApi.list(orderId).then(list => { if (active) setItems(list); }).catch(() => undefined);
    return () => { active = false; };
  }, [orderId, reloadKey]);
  useLiveRefresh(() => setReloadKey(key => key + 1));

  async function act(task: () => Promise<unknown>) {
    setWorking(true); setError("");
    try { await task(); setReloadKey(key => key + 1); return true; }
    catch (err) { setError(userErrorMessage(err, "Không thực hiện được.")); return false; }
    finally { setWorking(false); }
  }
  const active = items.filter(item => item.status === "ACTIVE");
  const label = "flex flex-col gap-1.5 text-xs font-semibold text-cs-muted";
  const req = <span className="text-danger">*</span>;

  return <Card title="Ủy quyền nhận xe" icon="users" badge={active.length ? <Badge tone="info">{active.length} người</Badge> : undefined}>
    <p className="text-sm text-cs-muted">Nhờ người khác nhận xe? Khai báo trước tại đây. Gara chỉ giao xe khi người nhận có tên trong danh sách và khớp 4 số cuối giấy tờ.</p>
    {active.length > 0 && <ul className="mt-3 divide-y divide-cs-border rounded-xl border border-cs-border">{active.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cs-soft text-cs-accent-text"><Icon name="user" size={15}/></span>
      <span className="min-w-0 flex-1"><b className="block text-cs-text">{item.full_name}</b>
        <span className="text-xs text-cs-muted">{item.phone} · đã khai báo giấy tờ{item.valid_until ? ` · hiệu lực đến ${formatDateTime(item.valid_until)}` : ""}</span></span>
      <Button variant="danger-outline" icon="x" disabled={working} onClick={() => void act(() => pickupAuthorizationApi.revoke(item.id))}>Thu hồi</Button>
    </li>)}</ul>}
    <ToastError message={error}/>
    {!open ? <div className="mt-4"><Button variant="secondary" icon="plus" onClick={() => setOpen(true)}>Thêm người được ủy quyền</Button></div>
      : <form className="mt-4 grid gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-4 sm:grid-cols-2" onSubmit={event => {
        event.preventDefault();
        void act(() => pickupAuthorizationApi.create(orderId, { ...form, valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null }))
          .then(ok => { if (ok) { setOpen(false); setForm({ full_name: "", phone: "", id_last4: "", valid_until: "" }); } });
      }}>
        <label className={label}><span>Họ tên {req}</span><input className={controlClass} required maxLength={150} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/></label>
        <label className={label}><span>Số điện thoại {req}</span><input className={controlClass} required inputMode="tel" maxLength={20} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
        <label className={label}><span>4 số cuối CCCD / giấy tờ {req}</span><input className={controlClass} required inputMode="numeric" pattern="\d{4}" maxLength={4} value={form.id_last4} onChange={e => setForm({ ...form, id_last4: e.target.value.replace(/\D/g, "") })}/></label>
        <label className={label}><span>Hiệu lực đến <span className="font-normal">(không bắt buộc)</span></span><DateTimeInput value={form.valid_until} onChange={valid_until => setForm({ ...form, valid_until })}/></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" variant="primary" icon="check" loading={working}>Lưu ủy quyền</Button></div>
      </form>}
  </Card>;
}

/** Phần giấy tờ trong chi tiết phiếu (Tra cứu tiến độ): phụ tùng chờ, biên bản, chẩn đoán, ủy quyền nhận xe. */
export function OrderPaperwork({ order, onChanged }: { order: CustomerRepairOrder; onChanged: () => void }) {
  const waitingParts = (order.part_requests ?? []).filter(r => ["REQUESTED", "ORDERED"].includes(r.status));
  const finished = ["HANDED_OVER", "CLOSED"].includes(order.status);
  return <>
    {!!order.handovers?.length && <CustomerHandoverBlock handovers={order.handovers} code={order.repair_order_code} onConfirmed={onChanged}/>}
    {waitingParts.length > 0 && <Card title="Phụ tùng đang chờ" icon="box">
      <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{waitingParts.map(r => <li key={r.id} className="flex flex-wrap justify-between gap-3 px-4 py-2.5 text-sm">
        <span className="text-cs-text">{r.part?.name ?? "Phụ tùng"} × {r.quantity}</span>
        <span className="text-xs text-cs-muted">{r.eta_date ? `Dự kiến về ${formatDate(r.eta_date)}` : "Gara đang đặt hàng"}</span>
      </li>)}</ul>
    </Card>}
    {!!order.inspections?.[0]?.inspected_at && <CustomerDiagnosisBlock inspection={order.inspections[0]}/>}
    {!finished && <CustomerPickupBlock orderId={order.id}/>}
  </>;
}

/** Link cũ /customer/repair-status/manage → Tra cứu tiến độ (giữ ?orderId= và #bien-ban). */
export default function RepairStatus() {
  const { search, hash } = useLocation();
  return <Navigate to={`/repair-status${search}${hash || "#bien-ban"}`} replace/>;
}
