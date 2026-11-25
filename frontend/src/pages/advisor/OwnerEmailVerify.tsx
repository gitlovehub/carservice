import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { ownerEmailApi } from "../../services/evidenceService";

/**
 * Xác minh email chủ xe bằng mã 6 số: gửi mã tới email, khách đọc lại mã.
 * Email đã xác minh là kênh nhận mã xác nhận báo giá, biên bản; backend chỉ cho admin đổi.
 */
export function OwnerEmailVerify({ customerId, currentEmail, title, description, onVerified, actionLabel = "Gửi mã xác minh", clearEmail = false }: {
  customerId: number; currentEmail: string; title: string; description: string; onVerified: () => void;
  actionLabel?: string;
  /** Đổi sang email khác: ô nhập bắt đầu trống. */
  clearEmail?: boolean;
}) {
  const [email, setEmail] = useState(clearEmail ? "" : currentEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const fieldErrors = useFieldErrors();

  async function send() {
    if (fieldErrors.show(/^\S+@\S+\.\S+$/.test(email.trim()) ? {} : { email: "Nhập email hợp lệ." })) return;
    setWorking(true);
    try { setSentTo((await ownerEmailApi.send(customerId, email.trim())).sent_to); setCode(""); }
    catch (err) { fieldErrors.showApi(err, { email: "email" }); }
    finally { setWorking(false); }
  }

  async function verify() {
    if (!sentTo || fieldErrors.show(code.length === 6 ? {} : { code: "Nhập đủ 6 số trong email." })) return;
    setWorking(true);
    try { await ownerEmailApi.verify(customerId, sentTo, code); onVerified(); }
    catch (err) { fieldErrors.showApi(err, { code: "code", email: "code" }); }
    finally { setWorking(false); }
  }

  return <section className="rounded-xl border border-warning/50 bg-warning-soft/30 p-4" aria-label="Xác minh email chủ xe">
    <p className="flex items-center gap-2 text-small font-bold text-cs-text"><Icon name="mail" size={17} className="shrink-0 text-warning-fg"/>{title}</p>
    <p className="mt-1 text-caption text-cs-text-2">{description}</p>
    {!sentTo
      ? <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <Field label="Email" required error={fieldErrors.errors.email}><Input type="email" maxLength={150} value={email} placeholder="VD: khach@gmail.com"
          onChange={e => { setEmail(e.target.value); fieldErrors.clear("email"); }}/></Field>
        <Button variant="primary" icon="send" className="sm:mt-6" loading={working} onClick={() => void send()}>{actionLabel}</Button>
      </div>
      : <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-start">
        <Field label={`Mã 6 số đã gửi tới ${sentTo}`} required error={fieldErrors.errors.code}><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, "")); fieldErrors.clear("code"); }}/></Field>
        <Button variant="secondary" className="sm:mt-6" disabled={working} onClick={() => { setSentTo(null); setCode(""); fieldErrors.reset(); }}>Đổi email</Button>
        <Button variant="primary" icon="check" className="sm:mt-6" loading={working} onClick={() => void verify()}>Xác minh</Button>
      </div>}
  </section>;
}
