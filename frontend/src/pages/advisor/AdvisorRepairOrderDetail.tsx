import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Button } from "../../components/ui/Button";
import { useLiveRefresh } from "../../services/liveSync";
import { Icon, type IconName } from "../../components/ui/Icon";
import { StatusBadge } from "../../components/ui/Badge";
import { Dropdown } from "../../components/ui/Dropdown";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, Textarea } from "../../components/ui/Field";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import {
  formatVnd, latestQuotation, staysOvernight, supplementQuotations, toNumber, workflowApi, type WorkflowOrder,
} from "../../services/workflowService";
import { CLOSE_REASONS, OPEN_STATUSES, STEPS, currentStepIndex, hasHandover, nextAction, stageRedirect } from "./repairOrderFlow";
import { card, Notice } from "./WorkflowUI";
import { errorText, formatDateTime } from "./workflowFormat";
import { InspectionPanel, PaymentPanel, QuotationPanel, RepairPanel } from "./RepairOrderPanels";
import { ReceptionNotes } from "./ReceptionFields";
import { CheckInPanel } from "./CheckInPanel";
import { SupplementPanel } from "./SupplementPanel";
import { QuickServicePanel } from "./QuickServicePanel";
import { QualityCheckPanel } from "./QualityCheckPanel";
import { useFieldErrors } from "../../components/ui/useFieldErrors";

/**
 * Chi tiết phiếu sửa chữa (cố vấn) — bố cục theo bước.
 * Cột trái: thanh bước bấm được + nội dung đúng một bước (mặc định bước hiện tại).
 * Cột phải: khách & xe, chi phí, lịch sử. "Đóng phiếu" nằm trong menu "Thao tác khác".
 * Khi in, mọi bước đều hiện (panel thao tác đã tự ẩn khi in).
 */

function StepTracker({ current, viewing, closed, onSelect }: { current: number; viewing: number; closed: boolean; onSelect: (index: number) => void }) {
  return <ol className="grid grid-cols-5 gap-1.5 print:hidden sm:gap-2" aria-label="Các bước của phiếu sửa chữa">
    {STEPS.map((step, index) => {
      const done = index < current || (closed && index <= current);
      const active = !closed && index === current;
      const selected = index === viewing;
      return <li key={step.key}>
        <button type="button" onClick={() => onSelect(index)} aria-current={active ? "step" : undefined} aria-pressed={selected}
          className={`flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition-colors sm:flex-row sm:gap-2.5 sm:px-3 sm:text-left
            ${selected ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:border-cs-border-strong hover:bg-cs-hover"}`}>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            active ? "bg-cs-accent text-cs-accent-contrast" : done ? "bg-success-solid text-on-solid" : "border border-dashed border-cs-border-strong text-cs-muted"}`}>
            {done && !active ? <Icon name="check" size={14}/> : <Icon name={step.icon} size={14}/>}
          </span>
          <span className="min-w-0">
            <span className={`block text-[11px] font-semibold leading-tight sm:text-small ${selected || active ? "text-cs-text" : "text-cs-text-2"}`}>{step.label}</span>
            <span className="hidden text-caption text-cs-muted sm:block">{active ? "Đang làm" : done ? "Đã xong" : "Chưa tới"}</span>
          </span>
        </button>
      </li>;
    })}
  </ol>;
}

const NEXT_STYLE = {
  action: { icon: "arrow-right" as IconName, box: "border-cs-accent/50 bg-cs-soft", iconBox: "bg-cs-accent text-cs-accent-contrast", title: "Việc tiếp theo" },
  wait: { icon: "clock" as IconName, box: "border-cs-border bg-cs-surface-2", iconBox: "bg-cs-surface text-cs-muted border border-cs-border", title: "Đang chờ" },
  done: { icon: "check" as IconName, box: "border-success/40 bg-success-soft", iconBox: "bg-success-solid text-on-solid", title: "Hoàn tất" },
  closed: { icon: "ban" as IconName, box: "border-cs-border bg-cs-surface-2", iconBox: "bg-cs-surface text-cs-muted border border-cs-border", title: "Đã đóng" },
};

function NextActionBar({ order, viewing, onGo }: { order: WorkflowOrder; viewing: number; onGo: (step: number) => void }) {
  const next = nextAction(order);
  if (!next.text) return null;
  const style = NEXT_STYLE[next.tone];
  return <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 print:hidden ${style.box}`} data-testid="next-action">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBox}`}><Icon name={style.icon} size={16}/></span>
    <div className="min-w-0 flex-1">
      <p className="text-caption font-semibold uppercase tracking-wide text-cs-muted">{style.title}</p>
      <p className="text-small text-cs-text">{next.text}</p>
    </div>
    {next.step !== viewing && <Button size="sm" variant="secondary" iconRight="arrow-right" onClick={() => onGo(next.step)}>Tới bước {STEPS[next.step].label}</Button>}
  </div>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-start justify-between gap-3 py-2 text-small">
    <dt className="shrink-0 text-cs-muted">{label}</dt>
    <dd className="min-w-0 text-right font-medium text-cs-text">{children}</dd>
  </div>;
}

function vehicleTitle(order: WorkflowOrder) {
  const vehicle = order.vehicle;
  const parts = [vehicle?.model?.brand?.name, vehicle?.model?.name, vehicle?.trim?.name || vehicle?.variant].filter(Boolean);
  return parts.length ? parts.join(" ") : "Chưa rõ dòng xe";
}

function OrderSidebar({ order }: { order: WorkflowOrder }) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const quotation = latestQuotation(order);
  const supplements = supplementQuotations(order);
  const supplementApproved = supplements.flatMap(q => q.items ?? []).filter(item => item.is_approved).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const invoice = order.invoice;
  const paid = invoice?.payments?.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + toNumber(p.amount), 0) ?? 0;
  // API trả lịch sử mới nhất trước.
  const history = order.status_history ?? [];
  const shownHistory = showAllHistory ? history : history.slice(0, 4);

  return <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
    <section className={card}>
      <div className="flex items-center gap-3">
        <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={44}/>
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-wide text-cs-text">{order.vehicle?.license_plate || "xxx.xx"}</p>
          <p className="truncate text-small text-cs-muted">{vehicleTitle(order)}{order.vehicle?.year ? ` · ${order.vehicle.year}` : ""}</p>
        </div>
      </div>
      {staysOvernight(order) && <p className="mt-3 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-caption font-semibold text-warning-fg"><Icon name="moon" size={14}/>Xe lưu xưởng qua đêm</p>}
      {order.booked_vehicle && order.booked_vehicle.id !== order.vehicle?.id && <p className="mt-3 rounded-lg bg-cs-surface-2 px-3 py-2 text-caption text-cs-text-2">
        Khách đặt lịch cho xe {order.booked_vehicle.license_plate}, mang tới xe khác{order.vehicle_change_reason ? `: ${order.vehicle_change_reason}` : "."}
      </p>}
      <dl className="mt-3 divide-y divide-cs-border border-t border-cs-border">
        <InfoRow label="Khách hàng">{order.customer?.full_name || "—"}</InfoRow>
        <InfoRow label="Điện thoại">{order.customer?.phone ? <a className="text-cs-accent-text hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : "—"}</InfoRow>
        <InfoRow label="Nguồn">{order.appointment?.appointment_code ? `Lịch hẹn ${order.appointment.appointment_code}` : "Khách vãng lai"}</InfoRow>
        <InfoRow label="Nhận xe lúc">{formatDateTime(order.received_at)}</InfoRow>
        {order.estimated_ready_at && ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status) && <InfoRow label="Dự kiến xong">{formatDateTime(order.estimated_ready_at)}</InfoRow>}
        <InfoRow label="Cố vấn">{order.advisor?.full_name || "—"}</InfoRow>
      </dl>
    </section>

    <section className={card}>
      <h2 className="text-subheading text-cs-text">Chi phí</h2>
      <dl className="mt-2 divide-y divide-cs-border">
        <InfoRow label="Báo giá">{quotation ? <span className="inline-flex flex-wrap items-center justify-end gap-2">{formatVnd(quotation.total_amount)}<StatusBadge domain="quotation" status={quotation.status}/></span> : "Chưa lập"}</InfoRow>
        {supplements.length > 0 && <InfoRow label="Phát sinh đã duyệt">{formatVnd(supplementApproved)}</InfoRow>}
        {invoice && <>
          <InfoRow label="Hóa đơn">{formatVnd(invoice.total_amount)}</InfoRow>
          <InfoRow label="Đã thu">{formatVnd(paid)}</InfoRow>
          {toNumber(invoice.total_amount) - paid > 0 && <InfoRow label="Còn lại"><span className="text-danger">{formatVnd(toNumber(invoice.total_amount) - paid)}</span></InfoRow>}
        </>}
      </dl>
    </section>

    <section className={`${card} print:hidden`}>
      <h2 className="text-subheading text-cs-text">Lịch sử xử lý</h2>
      {history.length ? <ol className="mt-3">{shownHistory.map((item, index) => <li key={item.id} className="relative pb-3 pl-5 last:pb-0">
        {index < shownHistory.length - 1 && <span className="absolute bottom-0 left-1 top-3 w-0.5 bg-cs-border" aria-hidden="true"/>}
        <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-cs-accent" : "bg-cs-border-strong"}`} aria-hidden="true"/>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge domain="repair" status={item.status || ""}/><span className="text-caption text-cs-muted">{formatDateTime(item.created_at)}</span></div>
        {item.note && <p className="mt-1 text-caption text-cs-text-2 font-medium">{item.note}</p>}
      </li>)}</ol> : <p className="mt-2 text-small text-cs-muted">Chưa có lịch sử.</p>}
      {history.length > 4 && <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAllHistory(value => !value)}>{showAllHistory ? "Thu gọn" : `Xem tất cả (${history.length})`}</Button>}
    </section>
  </aside>;
}

/** Thông tin lúc tạo phiếu: thông số xe, khách yêu cầu, tình trạng xe. */
function ReceptionSummary({ order }: { order: WorkflowOrder }) {
  return <section className={card}>
    <h2 className="mb-4 text-lg font-bold text-cs-text">Phiếu tiếp nhận</h2>
    <ReceptionNotes order={order}/>
  </section>;
}

function StepPlaceholder({ children }: { children: ReactNode }) {
  return <div className={`${card} py-12 text-center text-small text-cs-muted print:hidden`}>{children}</div>;
}

function CloseOrderModal({ order, open, initialReason, onClose, onGoToCheckout, onClosed }: {
  order: WorkflowOrder; open: boolean; initialReason: string; onClose: () => void; onGoToCheckout: () => void; onClosed: (message: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(initialReason);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  // Xe đã nhận theo biên bản → phải có biên bản trả xe được chủ xe xác nhận trước khi đóng (backend cũng chặn).
  const needsCheckout = !!order.requires_check_in && hasHandover(order, "CHECK_IN") && !hasHandover(order, "CHECK_OUT");
  const fieldErrors = useFieldErrors();

  async function submit() {
    setError("");
    if (fieldErrors.show(note.trim().length < 5 ? { note: "Ghi rõ lý do đóng phiếu (ít nhất 5 ký tự)." } : {})) return;
    setWorking(true);
    try {
      await workflowApi.close(order.id, reason, note.trim());
      onClose();
      await onClosed("Đã đóng phiếu sửa chữa.");
    } catch (err) { fieldErrors.showApi(err, { close_reason: "reason", note: "note" }); }
    finally { setWorking(false); }
  }

  return <Modal open={open} onClose={onClose} dismissible={!working} size="sm" title="Đóng phiếu sửa chữa"
    description="Phiếu chuyển sang Đã đóng và không mở lại được. Chỉ làm khi khách không tiếp tục sửa."
    footer={needsCheckout
      ? <><Button variant="secondary" onClick={onClose}>Để sau</Button><Button variant="primary" iconRight="arrow-right" onClick={onGoToCheckout}>Lập biên bản trả xe</Button></>
      : <><Button variant="secondary" disabled={working} onClick={onClose}>Huỷ</Button><Button variant="danger" icon="ban" loading={working} onClick={() => void submit()}>Đóng phiếu</Button></>}>
    {needsCheckout
      ? <Notice>Xe đã được nhận theo biên bản. Trước khi đóng phiếu cần lập <strong>biên bản trả xe</strong> và chủ xe (hoặc người được ủy quyền) xác nhận đã nhận lại xe.</Notice>
      : <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Lý do" required error={fieldErrors.errors.reason}><Select value={reason} onChange={event => { setReason(event.target.value); fieldErrors.clear("reason"); }}>{CLOSE_REASONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
        <Field label="Ghi chú cho khách" required error={fieldErrors.errors.note} hint="Khách nhận được thông báo kèm nội dung này."><Textarea rows={3} maxLength={1000} value={note} onChange={event => { setNote(event.target.value); fieldErrors.clear("note"); }} placeholder="Ví dụ: Khách quyết định không sửa, đã nhận lại xe."/></Field>
      </div>}
  </Modal>;
}

export default function AdvisorRepairOrderDetail() {
  const id = Number(useParams().orderId);
  const { notify } = useAppFeedback();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // `?step=quotation` (mở từ danh sách phiếu) → xem đúng bước đó; không có → bước đang diễn ra.
  const [viewStep, setViewStep] = useState<number | null>(() => {
    const index = STEPS.findIndex(step => step.key === searchParams.get("step"));
    return index >= 0 ? index : null;
  });
  const [closeDialog, setCloseDialog] = useState<{ reason: string } | null>(null);
  const announced = useRef(false);

  const fetchOrder = useCallback(() => {
    if (!Number.isSafeInteger(id) || id < 1) return Promise.reject(new Error("Mã phiếu không hợp lệ."));
    return workflowApi.order(id);
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setOrder(await fetchOrder()); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  }, [fetchOrder]);

  useEffect(() => {
    let active = true;
    fetchOrder()
      .then(result => { if (active) setOrder(result); })
      .catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrder]);

  // Realtime: khách xác nhận biên bản / duyệt báo giá, KTV cập nhật công việc → tải lại ngầm (thay nút "Làm mới").
  useLiveRefresh(() => { fetchOrder().then(setOrder).catch(() => undefined); });

  // "In hoá đơn" từ trang Thanh toán (`?print=1`): mở hộp thoại in một lần sau khi tải xong phiếu.
  const printed = useRef(false);
  useEffect(() => {
    if (!order || printed.current || searchParams.get("print") !== "1") return;
    printed.current = true;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [order, searchParams]);

  // Thông báo chuyển từ trang Tiếp nhận (vừa tạo phiếu) — chỉ một lần.
  useEffect(() => {
    const message = (location.state as { success?: string } | null)?.success;
    if (message && !announced.current) { announced.current = true; notify(message, "success"); }
  }, [location.state, notify]);

  const refreshAfterAction = useCallback(async (message: string) => {
    const next = await fetchOrder();
    notify(message, "success");
    // Bước kế có trang riêng (Báo giá, Tiến độ, Kiểm tra & bàn giao, Thanh toán) → tự sang trang đó.
    const target = stageRedirect(order, next, location.pathname);
    if (target) { navigate(target); return; }
    setOrder(next);
    // Phiếu sang trạng thái mới → tự chuyển tới bước đang diễn ra.
    if (next.status !== order?.status) setViewStep(null);
  }, [fetchOrder, notify, order, location.pathname, navigate]);

  if (loading && !order) return <main className="page-container"><LoadingState label="Đang tải phiếu sửa chữa..."/></main>;
  if (!order) return <main className="page-container"><ErrorState description={error || "Không tìm thấy phiếu."} onRetry={() => void load()}/></main>;

  const current = currentStepIndex(order);
  const viewing = viewStep ?? current;
  const closed = order.status === "CLOSED";
  const canClose = OPEN_STATUSES.includes(order.status);
  const visible = (index: number) => index === viewing ? "space-y-5" : "hidden print:block print:space-y-5";
  const notYet = (index: number) => !closed && index > current;
  const openClose = (reason = "CUSTOMER_REQUEST") => setCloseDialog({ reason });

  return <main data-print-repair-order className="page-container">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Link to="/advisor/service-orders" className="inline-flex items-center gap-1 text-small text-cs-muted hover:text-cs-text print:hidden"><Icon name="arrow-left" size={14}/>Phiếu sửa chữa</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-title text-cs-text">{order.repair_order_code || `Phiếu #${order.id}`}</h1>
          <StatusBadge domain="repair" status={order.status}/>
          {order.flow_type === "QUICK" && <span className="rounded-full bg-cs-soft px-2.5 py-0.5 text-caption font-semibold text-cs-on-soft">Dịch vụ nhanh</span>}
        </div>
        <p className="mt-1 text-small text-cs-muted">{order.customer?.full_name || "Khách hàng"} · {order.vehicle?.license_plate || "xxx.xx"} · {vehicleTitle(order)}</p>
      </div>
      <div className="cs-btn-row print:hidden">
       <Button variant="outline" icon="printer" onClick={() => window.print()}>In phiếu</Button>
        <Dropdown label="Thao tác khác" items={[
          { label: "Đóng phiếu (khách không sửa nữa)", icon: "ban", danger: true, disabled: !canClose, onSelect: () => openClose() },
        ]}/>
      </div>
    </header>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] print:block">
      <div className="min-w-0 space-y-5">
        <StepTracker current={current} viewing={viewing} closed={closed} onSelect={index => setViewStep(index)}/>
        <NextActionBar order={order} viewing={viewing} onGo={index => setViewStep(index)}/>
        {error && <Notice tone="error">{error}</Notice>}

        <div className={visible(0)} data-step="reception">
          <ReceptionSummary order={order}/>
          <CheckInPanel order={order} onChanged={refreshAfterAction}/>
          <QuickServicePanel key={`quick-${order.status}`} order={order} onChanged={refreshAfterAction}/>
        </div>

        <div className={visible(1)} data-step="inspection">
          {order.flow_type === "QUICK" && !order.inspections?.length
            ? <StepPlaceholder>Dịch vụ nhanh: bỏ qua chẩn đoán, báo giá theo giá niêm yết.</StepPlaceholder>
            : notYet(1) && order.requires_check_in && !hasHandover(order, "CHECK_IN")
              ? <StepPlaceholder>Cần chủ xe xác nhận biên bản nhận xe trước khi kiểm tra.</StepPlaceholder>
              : <InspectionPanel key={`inspection-${order.inspections?.[0]?.id ?? 0}-${order.inspections?.[0]?.recommendations?.length ?? 0}`} order={order} onChanged={refreshAfterAction}/>}
        </div>

        <div className={visible(2)} data-step="quotation">
          {notYet(2) ? <StepPlaceholder>Báo giá được lập sau khi hoàn tất chẩn đoán.</StepPlaceholder>
            : <QuotationPanel key={`quotation-${latestQuotation(order)?.id ?? 0}-${order.inspections?.[0]?.recommendations?.length ?? 0}`} order={order} onChanged={refreshAfterAction} onRequestClose={() => openClose("CUSTOMER_DECLINED_QUOTE")}/>}
          {!notYet(2) && !order.quotations?.length && !["QUOTING", "WAITING_APPROVAL"].includes(order.status) && <StepPlaceholder>Phiếu không có báo giá.</StepPlaceholder>}
        </div>

        <div className={visible(3)} data-step="repair">
          {notYet(3) ? <StepPlaceholder>Chỉ sửa chữa sau khi khách đã duyệt báo giá.</StepPlaceholder> : <>
            <RepairPanel order={order} onChanged={refreshAfterAction}/>
            <SupplementPanel key={`supplement-${order.quotations?.length ?? 0}`} order={order} onChanged={refreshAfterAction}/>
            {!order.work_items?.length && !["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(order.status) && <StepPlaceholder>Phiếu không có công việc sửa chữa.</StepPlaceholder>}
          </>}
        </div>

        <div className={visible(4)} data-step="delivery">
          {notYet(4) && <StepPlaceholder>Thu tiền và trả xe sau khi sửa xong. Nếu khách không sửa nữa, dùng "Thao tác khác → Đóng phiếu".</StepPlaceholder>}
          <QualityCheckPanel key={`qc-${order.quality_checked_at ?? ""}-${order.status}`} order={order} onChanged={refreshAfterAction}/>
          <PaymentPanel order={order}/>
          <CheckInPanel type="CHECK_OUT" order={order} onChanged={refreshAfterAction}/>
        </div>
      </div>

      <OrderSidebar order={order}/>
    </div>

    {closeDialog && <CloseOrderModal key={closeDialog.reason} order={order} open initialReason={closeDialog.reason} onClose={() => setCloseDialog(null)}
      onGoToCheckout={() => { setCloseDialog(null); setViewStep(4); }} onClosed={refreshAfterAction}/>}
  </main>;
}
