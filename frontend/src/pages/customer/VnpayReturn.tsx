import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ErrorState, LoadingState, buttonClass } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { AccountCard, AccountPage, InfoTile } from "./account/AccountKit";
import { PRIMARY_RED } from "./account/accountStyles";
import {
  formatMoney,
  getVnpayReturnResult,
  invoiceStatusLabel,
  type VnpayReturnResponse,
} from "../../services/customerApi";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

const resultStyle: Record<string, { title: string; tone: string; icon: IconName }> = {
  SUCCESS: { title: "Thanh toán thành công", tone: "bg-success-soft text-success-fg", icon: "check" },
  PENDING: { title: "Đang chờ xác nhận", tone: "bg-warning-soft text-warning-fg", icon: "clock" },
  CANCELLED: { title: "Giao dịch đã hủy", tone: "bg-cs-surface-2 text-cs-muted", icon: "x" },
  FAILED: { title: "Thanh toán không thành công", tone: "bg-danger-soft text-danger-fg", icon: "alert" },
};

/**
 * Trang VNPay chuyển khách về sau khi thanh toán.
 * KHÔNG tự kết luận từ query string: chuyển nguyên query cho Backend xác thực chữ ký
 * và hiển thị trạng thái Backend đọc từ Database (IPN / querydr).
 */
export default function VnpayReturn() {
  const location = useLocation();
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
        if (active) setError(err instanceof Error ? err.message : "Không thể kiểm tra kết quả thanh toán.");
      }
    };

    void load(1);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [hasGatewayParams, location.search]);

  const shownError = hasGatewayParams ? error : "Không có dữ liệu giao dịch VNPay.";
  const style = data ? resultStyle[data.result] ?? resultStyle.PENDING : null;
  const stillPending = data?.result === "PENDING";

  return (
    <AccountPage testId="customer-vnpay-return" title="Kết quả thanh toán" description="Kết quả giao dịch VNPay do hệ thống gara xác nhận.">
      <AccountCard className="max-w-[720px] overflow-hidden">
        {shownError ? (
          <ErrorState title="Không xác nhận được giao dịch" description={shownError}/>
        ) : !data || !style ? (
          <LoadingState label="Đang kiểm tra kết quả giao dịch với hệ thống…"/>
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            <div className={`flex items-start gap-4 rounded-2xl p-5 ${style.tone}`} role="status" aria-live="polite">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cs-surface/70"><Icon name={style.icon} size={24}/></span>
              <div>
                <p className="text-[18px] font-extrabold">{style.title}</p>
                <p className="mt-1 text-[14px]">{data.message}</p>
                {stillPending && polls >= MAX_POLLS && <p className="mt-2 text-[13px]">Chưa nhận được xác nhận từ VNPay. Bạn có thể tải lại trang sau ít phút hoặc xem trạng thái trong danh sách hóa đơn.</p>}
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Hóa đơn" value={data.invoice.invoice_code} mono/>
              <InfoTile label="Số tiền giao dịch" value={formatMoney(data.payment.amount)}/>
              <InfoTile label="Mã giao dịch VNPay" value={data.payment.transaction_code ?? "—"} mono/>
              <InfoTile label="Trạng thái hóa đơn" value={invoiceStatusLabel[data.invoice.status] ?? data.invoice.status}/>
            </dl>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-cs-border px-5 py-4 sm:px-6">
          <Link to="/invoices" className={buttonClass({ variant: "secondary" })}>Danh sách hóa đơn</Link>
          {data && data.result !== "SUCCESS" && data.invoice.status !== "PAID" && (
            <Link to={`/payment?invoice_id=${data.invoice.id}`} className={`${buttonClass({ variant: "primary" })} ${PRIMARY_RED}`}>{stillPending ? "Quay lại trang thanh toán" : "Thử thanh toán lại"}</Link>
          )}
        </div>
      </AccountCard>
    </AccountPage>
  );
}
