import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { Icon } from "../ui/Icon";
import { authLinkRowClass, authPrimaryClass } from "./authStyles";
import { userErrorMessage } from "../../services/apiError";

/** Liên kết cho khách đã mất quyền truy cập email cũ: gửi liên hệ để admin đối chiếu và hỗ trợ. */
export function LostEmailLink() {
  return <Link to="/contact?topic=lost-email" className="text-xs font-bold text-cs-muted hover:text-[#cf2935] hover:underline">Mất quyền truy cập email?</Link>;
}

/** Màn chờ xác thực: khách mở email, bấm nút Xác thực tài khoản; có thể gửi lại email. */
export function VerifyEmailPrompt({ email, justSent, backLabel, onBack }: { email: string; justSent: boolean; backLabel: string; onBack: () => void }) {
  const [countdown, setCountdown] = useState(justSent ? 60 : 0);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const resend = async () => {
    setSending(true);
    setStatus(null);
    try {
      await fetchApi("/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
      setCountdown(60);
      setStatus({ ok: true, text: "Đã gửi email xác thực. Vui lòng kiểm tra hộp thư." });
    } catch (error) {
      setStatus({ ok: false, text: userErrorMessage(error, "Không gửi được email, vui lòng thử lại sau.") });
    } finally {
      setSending(false);
    }
  };

  return <div className="grid gap-4">
    <div className="flex items-start gap-3 rounded-xl border border-cs-border bg-cs-surface-2 p-4 text-sm text-cs-text">
      <span className="mt-0.5 shrink-0 text-[#cf2935]"><Icon name="mail" size={20}/></span>
      <p>Mở hộp thư <b className="break-all">{email}</b> và bấm nút <b>Xác thực tài khoản</b>. Link có hiệu lực 24 giờ. Nếu chưa thấy, hãy kiểm tra thư mục Spam.</p>
    </div>
    {status && <p role={status.ok ? "status" : "alert"} className={`text-sm font-semibold ${status.ok ? "text-success-fg" : "text-[#dc4250]"}`}>{status.text}</p>}
    <button type="button" className={authPrimaryClass} disabled={sending || countdown > 0} aria-busy={sending || undefined} onClick={() => void resend()}>
      {sending ? "Đang gửi..." : countdown > 0 ? `Gửi lại sau ${countdown}s` : justSent ? "Gửi lại email xác thực" : "Gửi email xác thực"}
    </button>
    <div className={authLinkRowClass}><button type="button" onClick={onBack}>← {backLabel}</button><LostEmailLink/></div>
  </div>;
}
