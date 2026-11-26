import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { Icon, type IconName } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { formatVnd, quotationSentText, workflowApi, type WorkflowOrder, type WorkflowQuotation } from "../../services/workflowService";
import { Notice } from "./WorkflowUI";

/** Một kênh khách nhận báo giá: biểu tượng, tên, mô tả, trạng thái (sẽ gửi / không gửi). */
function Channel({ icon, title, detail, on, status }: { icon: IconName; title: string; detail: ReactNode; on: boolean; status: string }) {
  return <li className={`sq-channel flex items-start gap-3 rounded-2xl border p-4 ${on ? "" : "opacity-70"}`} data-on={on}>
    <span className="sq-channel-icon" aria-hidden="true"><Icon name={icon} size={20}/></span>
    <span className="min-w-0 flex-1">
      <b className="block text-cs-text">{title}</b>
      <span className="mt-0.5 block text-caption text-cs-text-2">{detail}</span>
    </span>
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold ${on ? "bg-success-soft text-success-fg" : "bg-cs-surface-2 text-cs-muted"}`}>
      {on && <Icon name="check" size={12} className="mr-1 inline align-[-1px]"/>}{status}</span>
  </li>;
}

/**
 * Xác nhận gửi báo giá cho khách (PO 19/11/2026): tóm tắt báo giá + kênh khách nhận (web luôn có; email kèm link duyệt
 * không cần đăng nhập — chỉ khi phiếu tạo từ lịch hẹn, vì lúc đặt lịch khách đã đồng ý nhận báo giá qua email).
 * Dùng ở chi tiết phiếu (bước Báo giá) và trang Báo giá & phê duyệt.
 */
export function SendQuotationModal({ order, quotation, onClose, onSent }: {
  order: WorkflowOrder; quotation: WorkflowQuotation; onClose: () => void; onSent: (message: string) => void | Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();
  const items = quotation.items ?? [];
  const consented = !!order.appointment_id;
  const email = order.customer?.email ?? null;
  const vehicle = [order.vehicle?.model?.brand?.name, order.vehicle?.model?.name].filter(Boolean).join(" ") || "Xe của khách";
  const emailStatus = consented ? "Có gửi" : "Không gửi";
  const emailDetail = !consented
    ? "Khách vãng lai — chưa đồng ý nhận báo giá qua email."
    : <>Tới <b className="text-cs-text">{email || "email tài khoản của khách"}</b>, kèm link duyệt từng hạng mục, không cần đăng nhập · hiệu lực 3 ngày.</>;

  async function send() {
    setWorking(true); setError("");
    try {
      const result = await workflowApi.sendQuotation(quotation.id);
      await onSent(quotationSentText(result));
      onClose();
    } catch (err) { fieldErrors.showApi(err); }
    finally { setWorking(false); }
  }

  return createPortal(<Modal bare open onClose={onClose} dismissible={!working} title="Gửi báo giá cho khách"
    className="adv-hv flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-[22px] border shadow-overlay">
    <header className="adv-hv-head relative flex items-center gap-4 px-6 py-5">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="send" size={26}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.45rem] font-bold leading-tight text-cs-text">Gửi báo giá cho khách</h2>
        <p className="mt-1 text-small text-cs-text-2">{quotation.quotation_code}<span className="px-2 text-cs-muted">·</span>Phiếu {order.repair_order_code}</p>
      </div>
      <IconButton icon="x" label="Đóng" variant="outline" onClick={onClose} disabled={working} className="relative z-10 self-start"/>
    </header>

    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
      {error && <Notice tone="error">{error}</Notice>}

      <section className="hv-facts overflow-hidden" aria-label="Tóm tắt báo giá">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5 text-small">
          <div className="min-w-0"><dt className="text-caption text-cs-muted">Khách hàng</dt><dd className="truncate font-semibold text-cs-text">{order.customer?.full_name || "—"}</dd></div>
          <div className="min-w-0"><dt className="text-caption text-cs-muted">Xe</dt><dd className="truncate font-semibold text-cs-text">{vehicle} · {order.vehicle?.license_plate || "xxx.xx"}</dd></div>
        </dl>
        <div className="flex items-end justify-between gap-4 border-t border-cs-border px-4 py-3.5">
          <span className="text-small text-cs-text-2">{items.length} hạng mục{quotation.type === "SUPPLEMENT" ? " · phát sinh" : ""}</span>
          <span className="text-right"><span className="block text-caption text-cs-muted">Tổng báo giá</span>
            <b className="text-[1.6rem] font-extrabold leading-none tabular-nums text-cs-accent-text">{formatVnd(quotation.total_amount)}</b></span>
        </div>
      </section>

      <section aria-label="Kênh khách nhận báo giá">
        <p className="mb-2.5 text-caption font-semibold uppercase tracking-wide text-cs-muted">Khách sẽ nhận qua</p>
        <ul className="space-y-2.5">
          <Channel icon="bell" title="Tài khoản trên web" on status="Có gửi"
            detail="Thông báo + mục “Báo giá” trong tài khoản; khách duyệt từng hạng mục. Màn hình này tự cập nhật khi khách trả lời."/>
          <Channel icon="mail" title="Email kèm link duyệt" on={consented} status={emailStatus} detail={emailDetail}/>
        </ul>
      </section>

      <p className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3 text-caption text-warning-fg">
        <Icon name="lock" size={16} className="mt-px shrink-0"/>
        <span>Sau khi gửi, báo giá bị khoá — không sửa được nữa. Muốn thay đổi phải lập báo giá mới. Chỉ khách được đồng ý hoặc từ chối hạng mục.</span>
      </p>
    </div>

    <footer className="qe-foot flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-cs-border px-6 py-4">
      <Button variant="secondary" className="h-11" disabled={working} onClick={onClose}>Quay lại</Button>
      <button type="button" className="adv-btn-gold h-11" disabled={working} aria-busy={working || undefined} onClick={() => void send()}>
        <Icon name="send" size={18}/>{working ? "Đang gửi..." : "Gửi báo giá"}</button>
    </footer>
  </Modal>, document.body);
}
