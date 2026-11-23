import confetti from "canvas-confetti";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LoadingState, buttonClass } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAuthSession } from "../../contexts/authSession";
import { PRIMARY_RED } from "./account/accountStyles";
import {
  formatDateTime,
  formatMoney,
  getVnpayReturnResult,
  invoiceStatusLabel,
  type VnpayReturnResponse,
} from "../../services/customerApi";
import { userErrorMessage } from "../../services/apiError";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

const RESULT: Record<string, { title: string; tone: string; icon: IconName }> = {
  SUCCESS: { title: "Thanh toán thành công!", tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", icon: "check" },
  PENDING: { title: "Đang chờ xác nhận", tone: "bg-warning-soft text-warning-fg", icon: "clock" },
  CANCELLED: { title: "Giao dịch đã hủy", tone: "bg-cs-surface-2 text-cs-muted", icon: "x" },
  FAILED: { title: "Thanh toán không thành công", tone: "bg-danger-soft text-danger-fg", icon: "alert" },
};
const ERROR_RESULT = { title: "Không xác nhận được giao dịch", tone: "bg-danger-soft text-danger-fg", icon: "alert" as IconName };

/** Pháo hoa cùng kiểu trang Đặt lịch thành công; tự tắt khi người dùng bật giảm chuyển động. */
function useSuccessFireworks(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const bursts = [
      window.setTimeout(() => void confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, disableForReducedMotion: true }), 150),
      window.setTimeout(() => void confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, disableForReducedMotion: true }), 450),
      window.setTimeout(() => void confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, disableForReducedMotion: true }), 650),
    ];
    return () => bursts.forEach(window.clearTimeout);
  }, [active]);
}

function ResultRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return <div className="flex min-w-0 items-center gap-4 px-5 py-4">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cs-soft text-cs-accent-text"><Icon name={icon} size={21}/></span>
    <div className="min-w-0"><p className="text-sm text-cs-muted">{label}</p><div className="break-all text-base font-extrabold text-cs-text">{children}</div></div>
  </div>;
}

/**
 * Trang VNPay chuyển khách về sau khi thanh toán (có thể chưa đăng nhập nếu trả từ email).
 * KHÔNG tự kết luận từ query string: chuyển nguyên query cho Backend xác thực chữ ký
 * và hiển thị trạng thái Backend đọc từ Database (IPN / querydr).
 */
export default function VnpayReturn() {
  const location = useLocation();
  const session = useAuthSession();
  const member = session.status === "authenticated" && session.account.role === "CUSTOMER";
  const [data, setData] = useState<VnpayReturnResponse | null>(null);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState(0);
  const hasGatewayParams = location.search.includes("vnp_");

  useEffect(() => {
    if (!hasGatewayParams) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt: number) => {
      try {
        const result = await getVnpayReturnResult(location.search);
        if (!active) return;
        setData(result);
        setPolls(attempt);
        if (result.result === "PENDING" && attempt < MAX_POLLS) {
          timer = setTimeout(() => void load(attempt + 1), POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (active) setError(userErrorMessage(err, "Không thể kiểm tra kết quả thanh toán."));
      }
    };

    void load(1);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [hasGatewayParams, location.search]);

  const success = data?.result === "SUCCESS";
  useSuccessFireworks(success);

  const shownError = hasGatewayParams ? error : "Không có dữ liệu giao dịch VNPay.";
  const style = shownError ? ERROR_RESULT : data ? RESULT[data.result] ?? RESULT.PENDING : null;
  const stillPending = data?.result === "PENDING";
  const canRetry = !!data && !success && data.invoice.status !== "PAID";
  const primaryButton = `${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`;

  return <div data-testid="customer-vnpay-return" className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
    <section className="rounded-3xl border border-cs-border bg-cs-surface p-6 text-center shadow-card sm:p-10">
      {!style ? <LoadingState label="Đang kiểm tra kết quả giao dịch với hệ thống…"/> : <>
        <div className="relative mx-auto mb-4 size-24">
          {success && <svg className="absolute inset-0 size-24 overflow-visible" viewBox="0 0 96 96" fill="none" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
            <path d="M-6 44q4-4 8 0" stroke="#f5b82e"/><path d="M14 24l4 5" stroke="#f4a3c4"/><path d="M12 72l5-4" stroke="#e8a0d8"/>
            <path d="M86 22l-5 6" stroke="#e11d2e"/><path d="M96 44l7-4" stroke="#f5c84b"/><path d="M84 70l-4-4" stroke="#8fd3c7"/>
          </svg>}
          <span className={`absolute inset-3 grid place-items-center rounded-full ${style.tone}`}><Icon name={style.icon} size={36}/></span>
        </div>
        <div role="status" aria-live="polite">
          <h1 className="text-2xl font-extrabold text-cs-text sm:text-3xl">{style.title}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-cs-muted sm:text-base">{shownError || (success ? "Cảm ơn bạn! Gara đã nhận được khoản thanh toán cho hoá đơn này." : data?.message)}</p>
          {stillPending && polls >= MAX_POLLS && <p className="mx-auto mt-2 max-w-xl text-sm text-cs-muted">Chưa nhận được xác nhận từ VNPay. Bạn có thể tải lại trang sau ít phút hoặc liên hệ gara.</p>}
        </div>

        {data && <div className="mt-7 grid overflow-hidden rounded-2xl border border-cs-border text-left sm:grid-cols-2 [&>*]:border-cs-border max-sm:[&>*:not(:last-child)]:border-b sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(-n+2)]:border-b">
          <ResultRow icon="receipt" label="Hoá đơn">{data.invoice.invoice_code}</ResultRow>
          <ResultRow icon="cash" label="Số tiền giao dịch"><span className="text-cs-accent-text">{formatMoney(data.payment.amount)}</span></ResultRow>
          <ResultRow icon="qr" label="Mã giao dịch VNPay">{data.payment.transaction_code ?? "—"}</ResultRow>
          <ResultRow icon={success ? "calendar" : "info"} label={success ? "Thời gian thanh toán" : "Trạng thái hoá đơn"}>
            {success ? formatDateTime(data.payment.paid_at) : invoiceStatusLabel[data.invoice.status] ?? data.invoice.status}
          </ResultRow>
        </div>}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {canRetry && data?.retry_url && <a href={data.retry_url} className={buttonClass({ variant: "secondary" })}>Thử thanh toán lại</a>}
          {canRetry && !data?.retry_url && member && <Link to={`/payment?invoice_id=${data!.invoice.id}`} className={buttonClass({ variant: "secondary" })}>{stillPending ? "Quay lại trang thanh toán" : "Thử thanh toán lại"}</Link>}
          {member && <Link to="/invoices" className={buttonClass({ variant: "secondary" })}>Xem hoá đơn</Link>}
          <Link to="/" className={primaryButton}><Icon name="home" size={17}/>Về trang chủ</Link>
        </div>
      </>}
    </section>
  </div>;
}
