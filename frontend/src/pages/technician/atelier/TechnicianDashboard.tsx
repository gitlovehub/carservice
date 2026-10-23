import { Link } from "react-router-dom";
import { Alert, Busy, Empty, Heading, StatusBadge, panel, primary, secondary } from "./TechnicianUI";
import { dateLabel, vehicleLabel } from "./technicianApi";
import { useOrders } from "./useOrders";

export default function TechnicianDashboard() {
  const { data, busy, error, retry } = useOrders(1);
  const list = data?.data ?? [];
  const inProgress = list.filter(order => ["INSPECTING", "IN_PROGRESS", "REVIEW_TEST"].includes(order.status)).length;
  const waiting = list.filter(order => ["RECEIVED", "WAITING_FOR_PARTS", "WAITING_APPROVAL"].includes(order.status)).length;
  const done = list.filter(order => ["COMPLETED", "HANDED_OVER", "CLOSED"].includes(order.status)).length;
  return <>
    <Heading label="TECHNICAL DESK / WORK ORDERS" title="Chào buổi làm việc." description="Tổng quan các phiếu sửa chữa được phân công cho tài khoản kỹ thuật viên hiện tại."/>
    <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ktv-accent/20 bg-gradient-to-r from-ktv-hero-from to-ktv-hero-to p-6 sm:p-7">
      <div><p className="text-xs font-bold tracking-[.14em] text-ktv-highlight uppercase">CÔNG VIỆC HÔM NAY</p>
        <h2 className="mt-2 text-2xl font-bold text-ktv-hero-text">Theo dõi phiếu và xử lý đúng quy trình.</h2>
        <p className="mt-2 text-sm leading-6 text-ktv-hero-muted">Danh sách bên dưới chỉ dùng dữ liệu thực từ API được phân quyền.</p></div>
      <Link className={primary} to="/technician/orders">Mở danh sách phiếu →</Link>
    </section>
    {error && <Alert retry={retry}>{error}</Alert>}
    {busy && <Busy/>}
    {!busy && !error && <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { name: "TỔNG PHIẾU ĐƯỢC GIAO", number: data?.total ?? 0, caption: "Tổng từ danh sách Laravel" },
          { name: "ĐANG THỰC HIỆN", number: inProgress, caption: "Trên trang dữ liệu hiện tại" },
          { name: "CẦN THEO DÕI", number: waiting, caption: "Trên trang dữ liệu hiện tại" },
          { name: "HOÀN THÀNH / ĐÓNG", number: done, caption: "Trên trang dữ liệu hiện tại" },
        ].map(card => <div key={card.name} className={`${panel} p-5`}><p className="text-[11px] font-bold tracking-widest text-ktv-muted">{card.name}</p>
          <strong className="mt-4 block text-3xl font-extrabold text-ktv-strong">{card.number}</strong><span className="mt-2 block text-xs text-ktv-subtle">{card.caption}</span></div>)}
      </div>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ktv-line/70 p-5 sm:p-6"><div><h2 className="text-lg font-bold text-ktv-strong">Phiếu gần đây</h2><p className="mt-1 text-xs text-ktv-muted">Sắp xếp theo thời gian tiếp nhận tại gara</p></div><Link className={secondary} to="/technician/orders">Xem tất cả</Link></div>
        {list.length === 0 ? <div className="p-5"><Empty title="Chưa có phiếu nào được giao" description="Khi cố vấn phân công, phiếu sẽ xuất hiện ở đây."/></div> : <div className="divide-y divide-ktv-line/50">{list.slice(0,6).map(order => <Link key={order.id} to={`/technician/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-ktv-accent-soft/60 sm:px-6">
          <div className="min-w-0"><p className="text-xs font-bold tracking-wider text-ktv-highlight">{order.repair_order_code || `#${order.id}`}</p><p className="mt-1 font-semibold text-ktv-strong">{vehicleLabel(order)}</p><p className="mt-1 text-xs text-ktv-muted">{order.vehicle?.license_plate || "Chưa có biển số"} · {dateLabel(order.received_at)}</p></div><div className="flex items-center gap-3"><StatusBadge status={order.status}/><span className="text-ktv-accent">→</span></div>
        </Link>)}</div>}
      </section>
    </>}
  </>;
}
