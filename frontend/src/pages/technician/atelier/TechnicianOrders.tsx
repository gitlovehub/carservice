import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Busy, Empty, Heading, StatusBadge, control, panel, secondary } from "./TechnicianUI";
import { dateLabel, vehicleLabel } from "./technicianApi";
import { useOrders } from "./useOrders";

const statuses = [
  ["", "Tất cả trạng thái"], ["RECEIVED", "Đã tiếp nhận"], ["INSPECTING", "Đang kiểm tra"],
  ["QUOTING", "Đang báo giá"], ["WAITING_APPROVAL", "Chờ khách duyệt"], ["IN_PROGRESS", "Đang sửa chữa"],
  ["WAITING_FOR_PARTS", "Chờ phụ tùng"], ["COMPLETED", "Hoàn tất"], ["CLOSED", "Đã đóng phiếu"],
];
export default function TechnicianOrders({ focusWork = false }: { focusWork?: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const { data, busy, error, retry } = useOrders(page, status);
  const rows = (data?.data ?? []).filter(order => [order.repair_order_code, order.customer?.full_name, order.vehicle?.license_plate, vehicleLabel(order)]
    .some(value => value?.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))));
  return <>
    <Heading label={focusWork ? "WORKSHOP / TASKS" : "WORKSHOP / ASSIGNMENTS"}
      title={focusWork ? "Công việc sửa chữa" : "Phiếu được phân công"}
      description={focusWork ? "Mở phiếu để theo dõi từng công việc và cập nhật trạng thái thực hiện." : "Danh sách phiếu mà Backend đã phân công cho kỹ thuật viên đang đăng nhập."}/>
    <div className={`${panel} mb-5 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_240px]`}>
      <label className="block text-xs font-semibold text-ktv-muted">Tìm trong trang hiện tại<input className={`${control} mt-2`} placeholder="Mã phiếu, khách hàng, biển số..." value={query} onChange={e => setQuery(e.target.value)}/></label>
      <label className="block text-xs font-semibold text-ktv-muted">Trạng thái<select className={`${control} mt-2`} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        {statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    {error && <Alert retry={retry}>{error}</Alert>}
    {busy && <Busy/>}
    {!busy && !error && (rows.length === 0 ? <Empty title="Không tìm thấy phiếu phù hợp" description="Hãy đổi trạng thái hoặc từ khóa tìm kiếm."/> :
      <div className="grid gap-4 xl:grid-cols-2">{rows.map(order => <article key={order.id} className={`${panel} p-5 transition-colors hover:border-ktv-accent/45 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold tracking-wider text-ktv-accent">{order.repair_order_code || `#${order.id}`}</span>
          <h2 className="mt-2 text-xl font-bold text-ktv-strong">{vehicleLabel(order)}</h2><span className="mt-1 block text-sm text-ktv-muted">{order.vehicle?.license_plate || "Chưa có biển số"}</span></div><StatusBadge status={order.status}/></div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ktv-line/60 pt-4 text-sm"><div><dt className="text-xs text-ktv-subtle">Khách hàng</dt><dd className="mt-1 font-medium text-ktv-text">{order.customer?.full_name || "Chưa rõ"}</dd></div>
          <div><dt className="text-xs text-ktv-subtle">Tiếp nhận</dt><dd className="mt-1 font-medium text-ktv-text">{dateLabel(order.received_at)}</dd></div></dl>
        <div className="mt-5 flex justify-end"><Link to={`/technician/orders/${order.id}`} className={secondary}>Xem phiếu và công việc →</Link></div>
      </article>)}</div>)}
    {!busy && !error && data && <div className="mt-6 flex items-center justify-between gap-4 text-sm text-ktv-muted"><span>Trang {data.current_page} / {data.last_page} · {data.total} phiếu</span>
      <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={secondary}>Trước</button><button type="button" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className={secondary}>Sau</button></div>
    </div>}
  </>;
}
