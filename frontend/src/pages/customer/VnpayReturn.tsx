import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  formatMoney,
  getVnpayReturnResult,
  invoiceStatusLabel,
  type VnpayReturnResponse,
} from "../../services/customerApi";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

const resultStyle: Record<string, { title: string; tone: string; icon: string }> = {
  SUCCESS: { title: "Thanh toán thành công", tone: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "✓" },
  PENDING: { title: "Đang chờ xác nhận", tone: "border-amber-200 bg-amber-50 text-amber-800", icon: "…" },
  CANCELLED: { title: "Giao dịch đã hủy", tone: "border-slate-200 bg-slate-50 text-slate-700", icon: "✕" },
  FAILED: { title: "Thanh toán không thành công", tone: "border-red-200 bg-red-50 text-red-700", icon: "!" },
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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[640px] px-6 py-10 md:py-14">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / KẾT QUẢ THANH TOÁN
          </p>
          <h1 className="mt-3 text-[28px] font-bold tracking-normal text-[#1F2933]">Kết quả thanh toán VNPay</h1>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            {shownError ? (
              <div className="p-8 text-center">
                <p className="text-base font-bold text-red-700">Không xác nhận được giao dịch</p>
                <p className="mt-2 text-xs text-slate-500">{shownError}</p>
              </div>
            ) : !data || !style ? (
              <p className="p-12 text-center text-xs text-[#8A949E]">Đang kiểm tra kết quả giao dịch với hệ thống...</p>
            ) : (
              <>
                <div className={`m-6 rounded-2xl border p-5 ${style.tone}`} role="status" aria-live="polite">
                  <p className="text-lg font-bold">
                    <span aria-hidden="true" className="mr-2">{style.icon}</span>
                    {style.title}
                  </p>
                  <p className="mt-1 text-sm">{data.message}</p>
                  {stillPending && polls >= MAX_POLLS && (
                    <p className="mt-2 text-xs">
                      Hệ thống chưa nhận được xác nhận từ VNPay. Bạn có thể tải lại trang sau ít phút hoặc xem trạng thái trong danh sách hóa đơn.
                    </p>
                  )}
                </div>

                <dl className="grid gap-3 px-6 pb-6 text-xs sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F7F7F5] p-4">
                    <dt className="font-bold text-[#8A949E]">HÓA ĐƠN</dt>
                    <dd className="mt-1 text-sm font-bold">{data.invoice.invoice_code}</dd>
                  </div>
                  <div className="rounded-xl bg-[#F7F7F5] p-4">
                    <dt className="font-bold text-[#8A949E]">SỐ TIỀN GIAO DỊCH</dt>
                    <dd className="mt-1 text-sm font-bold">{formatMoney(data.payment.amount)}</dd>
                  </div>
                  <div className="rounded-xl border border-[#E1E4E6] p-4">
                    <dt className="font-bold text-[#8A949E]">MÃ GIAO DỊCH VNPAY</dt>
                    <dd className="mt-1 font-mono text-sm">{data.payment.transaction_code ?? "—"}</dd>
                  </div>
                  <div className="rounded-xl border border-[#E1E4E6] p-4">
                    <dt className="font-bold text-[#8A949E]">TRẠNG THÁI HÓA ĐƠN</dt>
                    <dd className="mt-1 text-sm font-bold">{invoiceStatusLabel[data.invoice.status] ?? data.invoice.status}</dd>
                  </div>
                </dl>
              </>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#E1E4E6] p-6">
              <Link
                to="/invoices"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Danh sách hóa đơn
              </Link>
              {data && data.result !== "SUCCESS" && data.invoice.status !== "PAID" && (
                <Link
                  to={`/payment?invoice_id=${data.invoice.id}`}
                  className="inline-flex items-center rounded-xl bg-[#1F2933] px-4 py-2 text-xs font-bold text-white hover:bg-[#111827]"
                >
                  {stillPending ? "Quay lại trang thanh toán" : "Thử thanh toán lại"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}