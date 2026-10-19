import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyRepairOrders,
  getMyRepairOrderDetail,
  getVehicleName,
  repairStatusLabel,
  type CustomerRepairOrder,
} from "../../services/customerApi";
import "../../styles/atelier-customer-pages.css";

// Presentation stages follow the ATELIER timeline, mapped to the actual Laravel
// repair-order state machine. No demo statuses are sent to the backend.
const stages = [
  { status: "RECEIVED", label: "Đã tiếp nhận", color: "blue" },
  { status: "INSPECTING", label: "Đang chẩn đoán", color: "blue" },
  { status: "WAITING_APPROVAL", label: "Chờ khách duyệt", color: "amber" },
  { status: "IN_PROGRESS", label: "Đang sửa chữa", color: "blue" },
  { status: "COMPLETED", label: "Sẵn sàng bàn giao", color: "green" },
  { status: "HANDED_OVER", label: "Đã bàn giao", color: "green" },
  { status: "CLOSED", label: "Đã đóng phiếu", color: "muted" },
] as const;

function stageIndex(status: string): number {
  if (status === "QUOTING") return 1;
  if (status === "WAITING_FOR_PARTS" || status === "REVIEW_TEST") return 3;
  return stages.findIndex(stage => stage.status === status);
}

function statusColor(status: string) {
  if (status === "WAITING_APPROVAL" || status === "WAITING_FOR_PARTS" || status === "QUOTING") return "amber";
  if (status === "COMPLETED" || status === "HANDED_OVER") return "green";
  if (status === "CLOSED") return "muted";
  return "blue";
}

function formatEventTime(date?: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("vi-VN");
}

function TrackingCard({ order }: { order: CustomerRepairOrder }) {
  const [detail, setDetail] = useState<CustomerRepairOrder | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setHistoryError(false);
    getMyRepairOrderDetail(order.id)
      .then(data => { if (active) setDetail(data); })
      .catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [order.id]);

  const status = detail?.status ?? order.status;
  const current = stageIndex(status);
  const history = (detail?.statusHistory ?? detail?.status_history ?? [])
    .slice()
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5);
  const recordedStatuses = new Set(history.map(item => item.status));
  const isEarlyClosed = status === "CLOSED" && !recordedStatuses.has("COMPLETED") && !recordedStatuses.has("HANDED_OVER");

  return (
    <article className="at-tracking-card">
      <div className="at-appointment-top">
        <div>
          <p className="at-appointment-code">{order.repair_order_code}</p>
          <h2>{getVehicleName(order.vehicle)}</h2>
          <p className="at-appointment-description">
            {order.vehicle?.license_plate ?? "Chưa có biển số"}
            {order.received_at ? ` · Tiếp nhận ${formatEventTime(order.received_at)}` : ""}
          </p>
        </div>
        <span className={`at-customer-status at-track-status-${statusColor(status)}`}>
          ● {repairStatusLabel[status] ?? status}
        </span>
      </div>
      <div className="at-tracking-details">
        <section aria-label="Tiến độ công việc">
          <h3>Tiến độ công việc</h3>
          {status === "WAITING_FOR_PARTS" && <p className="at-tracking-waiting">Đang tạm dừng do chờ phụ tùng. Gara sẽ tiếp tục khi có vật tư.</p>}
          {status === "QUOTING" && <p className="at-tracking-waiting">Gara đang lập báo giá để bạn xem xét.</p>}
          <ol className="at-tracking-timeline">
            {stages.map((stage, index) => {
              const isCurrent = stage.status === status || (status === "QUOTING" && stage.status === "INSPECTING") ||
                ((status === "WAITING_FOR_PARTS" || status === "REVIEW_TEST") && stage.status === "IN_PROGRESS");
              const isPast = current > index && !(isEarlyClosed && index > 0) && !["CLOSED"].includes(status);
              const isVisible = isCurrent || isPast;
              return <li key={stage.status} className={`${isCurrent ? "is-current" : ""} ${isPast ? "is-done" : ""} ${!isVisible ? "is-future" : ""}`}>
                <span className={`at-tracking-pill at-track-status-${stage.color}`}>{stage.label}</span>
                {isCurrent && <small>{status === "WAITING_FOR_PARTS" ? "Đang chờ phụ tùng" : status === "REVIEW_TEST" ? "Đang kiểm tra lại" : "Đang ở bước này"}</small>}
              </li>;
            })}
          </ol>
        </section>
        <section aria-label="Nhật ký gần đây" className="at-tracking-journal">
          <h3>Nhật ký gần đây</h3>
          {loadingHistory && <p className="at-tracking-note">Đang tải nhật ký...</p>}
          {!loadingHistory && historyError && <p className="at-tracking-note">Chưa tải được nhật ký. Vui lòng thử tải lại trang.</p>}
          {!loadingHistory && !historyError && history.length === 0 && <p className="at-tracking-note">Chưa có cập nhật mới.</p>}
          {!loadingHistory && !historyError && history.map(event => <div className="at-tracking-event" key={event.id}>
            <strong>{event.note?.trim() || repairStatusLabel[event.status] || "Cập nhật trạng thái phiếu"}</strong>
            <span>{formatEventTime(event.created_at)}</span>
          </div>)}
          {!loadingHistory && !historyError && !history.length && (detail?.note || order.note) &&
            <p className="at-tracking-note">{detail?.note || order.note}</p>}
        </section>
      </div>
    </article>
  );
}

export default function RepairStatus() {
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyRepairOrders()
      .then(data => { if (active) { setOrders(data); setError(""); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Không thể tải tiến độ xe."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return <section className="at-customer-page at-customer-tracking">
    <div className="at-customer-container">
      <header className="at-customer-heading"><div>
        <p className="at-customer-eyebrow">MY GARAGE / TRACKING</p>
        <h1>Hành trình sửa chữa</h1>
        <p>Biết xe đang ở công đoạn nào và công việc tiếp theo là gì.</p>
      </div></header>
      {loading && <div className="at-customer-empty">Đang tải hành trình sửa chữa...</div>}
      {error && <div role="alert" className="at-customer-notice at-customer-error"><span>{error}</span><button type="button" onClick={() => setReload(x => x + 1)}>Thử lại</button></div>}
      {!loading && !error && orders.length === 0 && <div className="at-customer-empty"><h2>Chưa có phiếu sửa chữa</h2><p>Khi gara tiếp nhận xe, trạng thái công việc sẽ xuất hiện tại đây.</p><Link to="/customer/appointments" className="at-customer-primary">Xem lịch hẹn của tôi</Link></div>}
      {!loading && !error && orders.map(order => <TrackingCard key={order.id} order={order} />)}
    </div>
  </section>;
}
