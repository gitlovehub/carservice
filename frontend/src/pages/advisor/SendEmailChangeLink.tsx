import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { ownerEmailApi } from "../../services/evidenceService";

/**
 * Khách có tài khoản đổi email hoặc mất email cũ: nhân viên chỉ gửi nút xác thực tới email mới.
 * Email chỉ đổi khi khách bấm nút; email hiện tại nhận cảnh báo ngay.
 */
export function SendEmailChangeLink({ customerId, currentEmail }: { customerId: number; currentEmail: string }) {
  const { confirm, notify } = useAppFeedback();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [working, setWorking] = useState(false);
  const fieldErrors = useFieldErrors();

  async function send() {
    const next = email.trim();
    if (fieldErrors.show(!/^\S+@\S+\.\S+$/.test(next) ? { email: "Nhập email mới hợp lệ." } : next.toLowerCase() === currentEmail.toLowerCase() ? { email: "Email mới phải khác email hiện tại." } : {})) return;
    if (!await confirm({
      title: "Gửi nút xác thực tới email mới?", reference: next,
      description: "Khách phải bấm nút trong email mới thì email đăng nhập mới đổi. Email hiện tại sẽ nhận cảnh báo.",
      confirmText: "Gửi xác thực", confirmIcon: "send",
      checklist: ["Đã đối chiếu người yêu cầu với SĐT và biển số trong hồ sơ."],
    })) return;
    setWorking(true);
    try {
      const result = await ownerEmailApi.sendChangeLink(customerId, next);
      setSentTo(result.sent_to);
      setEmail("");
      notify(result.message, "success");
    } catch (err) { fieldErrors.showApi(err, { email: "email" }); }
    finally { setWorking(false); }
  }

  return <section className="rounded-xl border border-cs-border bg-cs-surface-2 p-4" aria-label="Đổi email đăng nhập của khách">
    <p className="flex items-center gap-2 text-small font-bold text-cs-text"><Icon name="mail" size={17} className="shrink-0 text-cs-accent-text"/>Email đăng nhập: <span className="min-w-0 break-all">{currentEmail || "—"}</span></p>
    <p className="mt-1 text-caption text-cs-text-2">Không sửa trực tiếp. Khi khách yêu cầu đổi hoặc mất email cũ, gửi nút xác thực tới email mới để khách tự xác nhận.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <Field label="Email mới" error={fieldErrors.errors.email}><Input type="email" maxLength={150} value={email} placeholder="VD: khach@gmail.com" onChange={e => { setEmail(e.target.value); fieldErrors.clear("email"); }}/></Field>
      <Button variant="primary" icon="send" className="sm:mt-6" loading={working} onClick={() => void send()}>Gửi xác thực</Button>
    </div>
    {sentTo && <p role="status" className="mt-2 text-caption font-medium text-success-fg">Đã gửi tới {sentTo}, đang chờ khách bấm nút xác thực.</p>}
  </section>;
}
