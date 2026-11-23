import { ToastError } from "../../../components/ui/ToastError";
import { useState, type ReactNode } from "react";
import { Modal, buttonClass } from "../../../components/ui";
import { Icon } from "../../../components/ui/Icon";
import { formatCatalogPrice, formatMinutes, type CatalogItem } from "../../../services/bookingCatalog";

type BookingReviewModalProps = {
  vehicleLabel: string;
  timeLabel: string;
  items: CatalogItem[];
  hasSymptom: boolean;
  symptom: string;
  contact: { name: string; phone: string; email: string };
  garageName?: string | null;
  garageAddress?: string | null;
  notes: string;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-cs-border py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-cs-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold text-cs-text">{children}</dd>
    </div>
  );
}

/**
 * Bước cuối trước khi gửi lịch hẹn: khách xem lại toàn bộ thông tin và tick 2 ô đồng ý
 * (thông tin chính xác + nhận báo giá/liên lạc qua email) thì mới bấm được "Xác nhận đặt lịch".
 */
export default function BookingReviewModal({
  vehicleLabel, timeLabel, items, hasSymptom, symptom, contact, garageName, garageAddress, notes, submitting, error, onClose, onConfirm,
}: BookingReviewModalProps) {
  const [infoConfirmed, setInfoConfirmed] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const canConfirm = infoConfirmed && emailConsent && !submitting;

  const pricedTotal = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const duration = formatMinutes(items.reduce((sum, item) => sum + (item.minutes ?? 0), 0));

  const checkbox = (checked: boolean, onChange: (v: boolean) => void, label: ReactNode) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${checked ? "border-[#e11d2e] bg-cs-soft" : "border-cs-border bg-cs-surface"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={submitting}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#e11d2e]"/>
      <span className="text-cs-text-2">{label}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} dismissible={!submitting} size="lg" title="Xem lại thông tin đặt lịch"
      description="Vui lòng kiểm tra kỹ trước khi gửi lịch hẹn đến gara."
      footer={<>
        <button type="button" className={buttonClass({ variant: "secondary" })} onClick={onClose} disabled={submitting}>Quay lại chỉnh sửa</button>
        <button type="button" className={buttonClass({ variant: "primary" })} onClick={onConfirm} disabled={!canConfirm}>
          {submitting ? <><span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"/>Đang gửi...</> : <><Icon name="check" size={16}/>Xác nhận đặt lịch</>}
        </button>
      </>}>
      <dl className="rounded-2xl border border-cs-border bg-cs-surface-2 px-4">
        <Row label="Xe">{vehicleLabel}</Row>
        <Row label="Thời gian">{timeLabel}</Row>
        <Row label="Dịch vụ">
          {items.length === 0 && !hasSymptom ? <span className="font-normal text-cs-muted">Chưa chọn dịch vụ</span> : (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-3">
                  <span>{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-cs-muted">{formatCatalogPrice(item.price).replace("Từ ", "")}</span>
                </li>
              ))}
              {hasSymptom && (
                <li className="flex items-baseline justify-between gap-3">
                  <span>Kiểm tra theo tình trạng xe</span>
                  <span className="shrink-0 text-xs font-semibold text-cs-muted">Báo giá sau</span>
                </li>
              )}
            </ul>
          )}
        </Row>
        {hasSymptom && <Row label="Tình trạng xe"><span className="font-normal whitespace-pre-line">{symptom.trim()}</span></Row>}
        {(pricedTotal > 0 || hasSymptom) && (
          <Row label="Tạm tính">
            <span className="text-base font-extrabold text-[#e11d2e] dark:text-[var(--cs-accent-text)]">
              {pricedTotal > 0 ? `Từ ${Math.round(pricedTotal).toLocaleString("vi-VN")} đ` : "Báo giá tại garage"}
            </span>
            {duration && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-cs-muted">
                <span className="text-[#e11d2e] dark:text-[var(--cs-accent-text)]"><Icon name="clock" size={12}/></span>Dự kiến {duration}
              </span>
            )}
          </Row>
        )}
        <Row label="Người đặt">
          {contact.name || "Chưa có tên"}
          <span className="block font-normal text-cs-text-2">{contact.phone || "Chưa có số điện thoại"}{contact.email && ` · ${contact.email}`}</span>
        </Row>
        <Row label="Địa chỉ mang xe đến">
          {garageName && <span className="block">{garageName}</span>}
          <span className="font-normal text-cs-text-2">{garageAddress ?? "Gara sẽ xác nhận địa điểm khi liên hệ lại với bạn."}</span>
        </Row>
        {notes.trim() && <Row label="Ghi chú"><span className="font-medium whitespace-pre-line">{notes.trim()}</span></Row>}
      </dl>

      <div className="mt-5 space-y-2.5">
        {checkbox(infoConfirmed, setInfoConfirmed, <>Tôi đã kiểm tra và xác nhận các thông tin trên là <strong>chính xác</strong>.</>)}
        {checkbox(emailConsent, setEmailConsent, <>Tôi đồng ý nhận <strong>kết quả báo giá</strong> và thông tin liên lạc về lịch hẹn qua email{contact.email ? <> <strong>{contact.email}</strong></> : null}. Gara chỉ sửa chữa khi tôi đồng ý báo giá.</>)}
      </div>

      <ToastError message={error}/>
    </Modal>
  );
}
