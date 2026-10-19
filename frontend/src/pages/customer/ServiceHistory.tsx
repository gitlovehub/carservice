import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatMoney, getMyRepairOrders, getVehicleName, repairStatusLabel, type CustomerRepairOrder } from "../../services/customerApi";
import "../../styles/atelier-customer-pages.css";
import "../../styles/atelier-customer-complete.css";

const finished = new Set(["COMPLETED", "HANDED_OVER", "CLOSED"]);

export default function ServiceHistory() {
  const [orders, setOrders] = useState<CustomerRepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyRepairOrders().then(data => {
      if (active) { setOrders(data.filter(row => finished.has(row.status))); setError(""); }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Không thể tải lịch sử sửa chữa.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const filtered = useMemo(() => orders.filter(order => [order.repair_order_code, getVehicleName(order.vehicle), order.vehicle?.license_plate]
    .some(value => String(value ?? "").toLowerCase().includes(query.toLowerCase().trim()))), [orders, query]);

  return <section className="at-customer-page at-customer-history"><div className="at-customer-container">
    <header className="at-customer-heading"><div>
      <p className="at-customer-eyebrow">MY GARAGE / SERVICE HISTORY</p>
      <h1>Lịch sử chăm sóc xe</h1>
      <p>Tra cứu các lần bảo dưỡng, sửa chữa đã hoàn tất tại gara.</p>
    </div><Link to="/customer/booking" className="at-customer-primary">+ Đặt lịch mới</Link></header>
    <div className="at-customer-stats at-history-stats">
      <div className="at-customer-stat"><span>LẦN CHĂM SÓC</span><strong>{loading ? "—" : orders.length}</strong><small>Phiếu đã hoàn thành</small></div>
      <div className="at-customer-stat"><span>XE ĐÃ CHĂM SÓC</span><strong>{loading ? "—" : new Set(orders.map(item=>item.vehicle_id)).size}</strong><small>Phương tiện trong lịch sử</small></div>
      <div className="at-customer-stat"><span>TỔNG HÓA ĐƠN</span><strong>{loading ? "—" : orders.filter(item => Boolean(item.invoice)).length}</strong><small>Hóa đơn đã phát hành</small></div>
    </div>
    <div className="at-customer-filter"><label htmlFor="history-search">Tìm lịch sử</label>
      <input id="history-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Mã phiếu, tên xe, biển số..."/></div>
    {loading && <div className="at-customer-empty">Đang tải lịch sử chăm sóc xe...</div>}
    {error && <div role="alert" className="at-customer-notice at-customer-error"><span>{error}</span><button onClick={() => setReload(n => n+1)}>Thử lại</button></div>}
    {!loading && !error && filtered.length === 0 && <div className="at-customer-empty"><h2>{query ? "Không tìm thấy phiếu phù hợp" : "Chưa có lịch sử sửa chữa"}</h2>
      <p>{query ? "Thử một mã phiếu hoặc biển số khác." : "Những phiếu đã hoàn tất sẽ hiển thị ở đây."}</p><Link to="/customer/appointments" className="at-customer-outline">Xem lịch hẹn</Link></div>}
    {!loading && !error && filtered.map(order => <article className="at-history-card" key={order.id}>
      <div className="at-appointment-top"><div>
        <p className="at-appointment-code">{order.repair_order_code}</p>
        <h2>{getVehicleName(order.vehicle)}</h2>
        <p className="at-appointment-description">{order.vehicle?.license_plate ?? "Chưa có biển số"} · {order.completed_at ? `Hoàn thành ${formatDate(order.completed_at)}` : order.received_at ? `Tiếp nhận ${formatDate(order.received_at)}` : "Phiếu đã hoàn tất"}</p>
      </div><span className="at-customer-status is-confirmed">● {repairStatusLabel[order.status] ?? order.status}</span></div>
      <div className="at-history-card-bottom"><div><span>Tổng hóa đơn</span><strong>{order.invoice ? formatMoney(order.invoice.total_amount) : "Chưa phát hành"}</strong></div>
        <button type="button" className="at-customer-outline" onClick={() => setExpandedId(id => id === order.id ? null : order.id)} aria-expanded={expandedId === order.id}>{expandedId === order.id ? "Thu gọn" : "Chi tiết"} →</button></div>
      {expandedId === order.id && <div className="at-history-detail">
        <div><span>Mã phiếu</span><strong>{order.repair_order_code}</strong></div>
        <div><span>Trạng thái</span><strong>{repairStatusLabel[order.status] ?? order.status}</strong></div>
        {order.invoice && <><div><span>Mã hóa đơn</span><strong>{order.invoice.invoice_code}</strong></div><div><span>Thanh toán</span><strong>{order.invoice.status === "PAID" ? "Đã thanh toán" : "Chưa hoàn tất thanh toán"}</strong></div></>}
        {order.note && <p>{order.note}</p>}
        {order.invoice && <Link className="at-customer-outline" to="/invoices">Xem hóa đơn →</Link>}
      </div>}
    </article>)}
  </div></section>;
}
