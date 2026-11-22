import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { counterApprovalApi, type OtpSent, type QuotationDecision } from "../../services/evidenceService";
import { formatVnd, toNumber, type WorkflowOrder, type WorkflowQuotation } from "../../services/workflowService";
import { OwnerEmailVerify } from "./OwnerEmailVerify";
import { input, Notice, Req } from "./WorkflowUI";
import { RequiredMark } from "./RepairOrderPanels";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";

/**
 * Khách duyệt báo giá tại quầy (P1C, D-005/D-008).
 * Cố vấn chọn theo lời khách → hệ thống gửi OTP tới email chủ xe, email liệt kê đúng các lựa chọn này.
 * Chỉ khi khách đọc đúng mã, phản hồi mới được ghi. Đổi lựa chọn sau khi gửi mã thì phải gửi lại mã.
 */
export function CounterApprovalPanel({ quotation, owner, onDone }: { quotation: WorkflowQuotation; owner?: WorkflowOrder["customer"]; onDone: (message: string) => Promise<void> }) {
  const items = quotation.items ?? [];
  const [decisions, setDecisions] = useState<Record<number, boolean>>(() => Object.fromEntries(items.map(item => [item.id, true])));
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();

  // Từ chối hạng mục bắt buộc = từ chối toàn bộ (giống máy chủ) — mã OTP / email gắn với kết quả đã chuẩn hoá.
  const rejectsRequired = items.some(item => item.is_required && decisions[item.id] === false);
  const responses: QuotationDecision[] = items.map(item => ({ item_id: item.id, is_approved: !rejectsRequired && (decisions[item.id] ?? true) }));
  const approvedTotal = rejectsRequired ? 0 : items.reduce((sum, item) => sum + (decisions[item.id] ? toNumber(item.amount) : 0), 0);

  function toggle(itemId: number, approved: boolean) {
    setDecisions(previous => ({ ...previous, [itemId]: approved }));
    // Nội dung đã đổi: mã đã gửi không còn khớp.
    setSent(null); setCode("");
  }

  async function sendCode() {
    setWorking(true); setError("");
    try { setSent(await counterApprovalApi.requestOtp(quotation.id, responses)); setCode(""); }
    catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (fieldErrors.show(code.length !== 6 ? { code: "Nhập đủ 6 số trong email." } : {})) return;
    setWorking(true);
    try {
      await counterApprovalApi.verifyOtp(quotation.id, code, responses);
      await onDone("Đã ghi nhận lựa chọn của khách (xác nhận bằng mã gửi email chủ xe).");
    } catch (err) { fieldErrors.showApi(err, { code: "code", otp: "code" }); }
    finally { setWorking(false); }
  }

  return <div className="mt-4 rounded-xl border border-cs-border bg-cs-surface-2 p-4" data-testid="counter-approval">
    <h3 className="text-sm font-bold text-cs-text">Khách duyệt tại quầy bằng mã email</h3>
    <p className="mt-1 text-xs text-cs-muted">Chọn theo lời khách, rồi gửi mã tới email chủ xe. Email liệt kê đúng các lựa chọn này; khách kiểm tra và đọc mã cho bạn.</p>
    <ul className="mt-3 divide-y divide-cs-border rounded-lg border border-cs-border bg-cs-surface">
      {items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="text-cs-text">{item.description || `Hạng mục #${item.id}`}<RequiredMark item={item}/> <span className="text-cs-muted">· {formatVnd(item.amount)}</span></span>
        <span className="inline-flex gap-1" role="group" aria-label={`Lựa chọn cho ${item.description ?? item.id}`}>
          <Button size="sm" variant="success" className={decisions[item.id] ? "ring-2 ring-success/40 ring-offset-1" : "opacity-90"} icon="check" aria-pressed={decisions[item.id] === true} disabled={working} onClick={() => toggle(item.id, true)}>Đồng ý</Button>
          <Button size="sm" variant={decisions[item.id] ? "secondary" : "danger-outline"} icon="x" aria-pressed={decisions[item.id] === false} disabled={working} onClick={() => toggle(item.id, false)}>Từ chối</Button>
        </span>
      </li>)}
    </ul>
    {rejectsRequired && <p role="alert" className="mt-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-fg">Khách từ chối hạng mục <b>bắt buộc</b> — gara không thể chỉ làm phần còn lại, nên báo giá sẽ ghi nhận là <b>từ chối toàn bộ</b>. Giải thích lý do với khách trước khi gửi mã.</p>}
    <p className="mt-2 text-right text-sm text-cs-text">Tổng khách đồng ý: <strong>{formatVnd(approvedTotal)}</strong></p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    {owner?.email_verified === false && owner.id
      ? <div className="mt-3"><OwnerEmailVerify customerId={owner.id} currentEmail={owner.email ?? ""} title="Chủ xe chưa xác minh email"
          description="Xác minh email trước khi gửi mã duyệt báo giá." onVerified={() => void onDone("Đã xác minh email chủ xe.")}/></div>
      : !sent
      ? <div className="mt-3 flex justify-end"><Button variant="primary" icon="send" loading={working} onClick={() => void sendCode()}>Gửi mã tới email chủ xe</Button></div>
      : <form noValidate className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start" onSubmit={event => void verify(event)}>
        <label className="text-xs font-semibold text-cs-muted">Mã 6 số đã gửi tới {sent.sent_to} (hết hạn {new Date(sent.expires_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})<Req/>
          <input className={input} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required aria-invalid={!!fieldErrors.errors.code || undefined} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "")); fieldErrors.clear("code"); }}/>
          <FieldError className="mt-1">{fieldErrors.errors.code}</FieldError>
        </label>
        <div className="flex gap-2 sm:mt-5">
          <Button variant="secondary" disabled={working} onClick={() => void sendCode()}>Gửi lại mã</Button>
          <Button type="submit" variant="success" icon="check" loading={working}>Xác nhận duyệt</Button>
        </div>
      </form>}
  </div>;
}
