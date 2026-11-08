import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { counterApprovalApi, type OtpSent, type QuotationDecision } from "../../services/evidenceService";
import { formatVnd, toNumber, type WorkflowQuotation } from "../../services/workflowService";
import { input, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Khách duyệt báo giá tại quầy (P1C, D-005/D-008).
 * Cố vấn chọn theo lời khách → hệ thống gửi OTP tới email chủ xe, email liệt kê đúng các lựa chọn này.
 * Chỉ khi khách đọc đúng mã, phản hồi mới được ghi. Đổi lựa chọn sau khi gửi mã thì phải gửi lại mã.
 */
export function CounterApprovalPanel({ quotation, onDone }: { quotation: WorkflowQuotation; onDone: (message: string) => Promise<void> }) {
  const items = quotation.items ?? [];
  const [decisions, setDecisions] = useState<Record<number, boolean>>(() => Object.fromEntries(items.map(item => [item.id, true])));
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const responses: QuotationDecision[] = items.map(item => ({ item_id: item.id, is_approved: decisions[item.id] ?? true }));
  const approvedTotal = items.reduce((sum, item) => sum + (decisions[item.id] ? toNumber(item.amount) : 0), 0);

  function toggle(itemId: number, approved: boolean) {
    setDecisions(previous => ({ ...previous, [itemId]: approved }));
    // Nội dung đã đổi: mã đã gửi không còn khớp.
    setSent(null); setCode("");
  }

  async function sendCode() {
    setWorking(true); setError("");
    try { setSent(await counterApprovalApi.requestOtp(quotation.id, responses)); setCode(""); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setWorking(true); setError("");
    try {
      await counterApprovalApi.verifyOtp(quotation.id, code, responses);
      await onDone("Đã ghi nhận lựa chọn của khách (xác nhận bằng mã gửi email chủ xe).");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <div className="mt-4 rounded-xl border border-cs-border bg-cs-surface-2 p-4" data-testid="counter-approval">
    <h3 className="text-sm font-bold text-cs-text">Khách duyệt tại quầy bằng mã email</h3>
    <p className="mt-1 text-xs text-cs-muted">Chọn theo lời khách, rồi gửi mã tới email chủ xe. Email liệt kê đúng các lựa chọn này; khách kiểm tra và đọc mã cho bạn.</p>
    <ul className="mt-3 divide-y divide-cs-border rounded-lg border border-cs-border bg-cs-surface">
      {items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="text-cs-text">{item.description || `Hạng mục #${item.id}`} <span className="text-cs-muted">· {formatVnd(item.amount)}</span></span>
        <span className="inline-flex gap-1" role="group" aria-label={`Lựa chọn cho ${item.description ?? item.id}`}>
          <Button size="sm" variant={decisions[item.id] ? "primary" : "secondary"} aria-pressed={decisions[item.id] === true} disabled={working} onClick={() => toggle(item.id, true)}>Đồng ý</Button>
          <Button size="sm" variant={decisions[item.id] ? "secondary" : "danger"} aria-pressed={decisions[item.id] === false} disabled={working} onClick={() => toggle(item.id, false)}>Từ chối</Button>
        </span>
      </li>)}
    </ul>
    <p className="mt-2 text-right text-sm text-cs-text">Tổng khách đồng ý: <strong>{formatVnd(approvedTotal)}</strong></p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    {!sent
      ? <div className="mt-3 flex justify-end"><Button variant="primary" loading={working} onClick={() => void sendCode()}>Gửi mã tới email chủ xe</Button></div>
      : <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={event => void verify(event)}>
        <label className="text-xs font-semibold text-cs-muted">Mã 6 số đã gửi tới {sent.sent_to} (hết hạn {new Date(sent.expires_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})
          <input className={input} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))}/>
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={working} onClick={() => void sendCode()}>Gửi lại mã</Button>
          <Button type="submit" variant="primary" loading={working} disabled={code.length !== 6}>Xác nhận</Button>
        </div>
      </form>}
  </div>;
}
