import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Busy, Empty, Heading, StatusBadge, panel, primary, secondary } from "./TechnicianUI";
import { dateLabel, isNotFound, messageForError, technicianApi, vehicleLabel } from "./technicianApi";
import type { Inspection, RepairOrder, WorkItem, WorkStatus } from "./technicianApi";

export default function TechnicianDetail() {
  const { confirm } = useAppFeedback();
  const { orderId } = useParams();
  const id = Number(orderId);
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    const abort = new AbortController(); let active = true;
    queueMicrotask(() => { if (active) { setBusy(true); setError(""); } });
    Promise.all([technicianApi.detail(id, abort.signal), technicianApi.workItems(id, abort.signal), technicianApi.inspection(id, abort.signal).catch(err => {
      if (isNotFound(err)) return null;
      throw err;
    })]).then(([detail, work, inspect]) => {
      if (active) { setOrder(detail); setItems(work); setInspection(inspect); }
    }).catch(err => { if (active && !abort.signal.aborted) setError(messageForError(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; abort.abort(); };
  }, [id, revision]);

  async function changeWork(item: WorkItem, status: WorkStatus) {
    if (status === "COMPLETED" && !await confirm({ title: "Xác nhận hoàn tất công việc", description: "Cập nhật trạng thái công việc này thành hoàn tất sau khi đã kiểm tra chất lượng thực hiện.", confirmText: "Hoàn tất" })) return;
    setActionError(""); setUpdating(item.id);
    try { await technicianApi.updateWorkStatus(item.id, status); setRevision(v => v + 1); }
    catch (err) { setActionError(messageForError(err)); } finally { setUpdating(null); }
  }
  if (!Number.isSafeInteger(id) || id < 1) return <Alert>Mã phiếu không hợp lệ.</Alert>;
  return <>
    <div className="mb-5"><Link className="text-sm text-ktv-highlight hover:underline" to="/technician/orders">← Danh sách phiếu</Link></div>
    <Heading label="TECHNICAL DESK / REPAIR ORDER" title={order?.repair_order_code || `Phiếu sửa chữa #${id}`}
      description="Kiểm tra thông tin tiếp nhận, ghi nhận chẩn đoán và cập nhật các công việc thuộc phiếu này."
      action={order && !busy ? <StatusBadge status={order.status}/> : null}/>
    {busy && <Busy/>}{error && <Alert retry={() => setRevision(v => v + 1)}>{error}</Alert>}
    {!busy && !error && !order && <Empty title="Không tìm thấy phiếu" description="Phiếu không tồn tại hoặc không thuộc quyền truy cập của bạn."/>}
    {!busy && !error && order && <>
      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
        <section className={`${panel} p-6`}><h2 className="mb-5 text-lg font-bold text-ktv-strong">Thông tin tiếp nhận</h2>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{[
            ["Xe", vehicleLabel(order)], ["Biển số", order.vehicle?.license_plate || "Chưa cập nhật"],
            ["Khách hàng", order.customer?.full_name || "Chưa cập nhật"], ["Cố vấn", order.advisor?.full_name || "Chưa cập nhật"],
            ["Thời gian tiếp nhận", dateLabel(order.received_at)], ["Số km tiếp nhận", order.mileage_received == null ? "Chưa cập nhật" : `${order.mileage_received.toLocaleString("vi-VN")} km`],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-ktv-subtle">{label}</dt><dd className="mt-1 text-sm font-semibold text-ktv-text">{value}</dd></div>)}</dl>
          {order.initial_condition && <div className="mt-5 border-t border-ktv-line/60 pt-4"><p className="text-xs text-ktv-subtle">Tình trạng ban đầu</p><p className="mt-1 text-sm leading-6 text-ktv-muted">{order.initial_condition}</p></div>}
        </section>
        <section className={`${panel} p-6`}><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-ktv-strong">Kiểm tra và chẩn đoán</h2><span className="text-xs text-ktv-highlight">INSPECTION</span></div>
          {inspection ? <div className="mt-5"><StatusBadge status={inspection.inspected_at ? "COMPLETED" : "INSPECTING"}/>
            <p className="mt-4 text-sm text-ktv-muted">{inspection.diagnosis || "Phiếu kiểm tra đã tạo, chưa có kết luận."}</p>
            <p className="mt-2 text-xs text-ktv-subtle">{inspection.items?.length ?? 0} hạng mục · {inspection.inspected_at ? `Hoàn tất ${dateLabel(inspection.inspected_at)}` : "Chưa hoàn tất"}</p>
            <Link className={`${secondary} mt-5`} to={`/technician/orders/${id}/inspection`}>Xem phiếu kiểm tra →</Link></div>
          : <div className="mt-5"><p className="mb-4 text-sm leading-6 text-ktv-muted">Chưa có phiếu kiểm tra. Chỉ bắt đầu kiểm tra khi trạng thái phiếu cho phép.</p>
            {["RECEIVED", "INSPECTING"].includes(order.status) ? <Link className={primary} to={`/technician/orders/${id}/inspection`}>+ Tạo phiếu kiểm tra</Link> : <span className="text-sm text-ktv-warning">Trạng thái hiện tại không cho phép tạo phiếu kiểm tra.</span>}</div>}
        </section>
      </div>
      <section className={`${panel} mb-6 overflow-hidden`}><div className="border-b border-ktv-line/60 p-6"><h2 className="text-lg font-bold text-ktv-strong">Công việc trên phiếu</h2><p className="mt-1 text-sm text-ktv-muted">Cập nhật tiến độ thực tế qua API Laravel, không thay đổi trạng thái toàn bộ phiếu tại Frontend.</p></div>
        {actionError && <div className="p-4"><Alert>{actionError}</Alert></div>}
        {items.length ? <div className="divide-y divide-ktv-line/60">{items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div><p className="font-semibold text-ktv-text">{item.service?.name || item.description || `Công việc #${item.id}`}</p>
            {item.service?.name && item.description && <p className="mt-1 text-sm text-ktv-muted">{item.description}</p>}
            <div className="mt-3"><StatusBadge status={item.status} work/></div>
            {item.started_at && <p className="mt-2 text-xs text-ktv-subtle">Bắt đầu: {dateLabel(item.started_at)}</p>}
          </div>
          <div className="flex flex-wrap gap-2">{item.status === "PENDING" && <button type="button" disabled={updating !== null} className={secondary} onClick={() => void changeWork(item, "IN_PROGRESS")}>Bắt đầu công việc</button>}
            {item.status === "IN_PROGRESS" && <button type="button" disabled={updating !== null} className={primary} onClick={() => void changeWork(item, "COMPLETED")}>Đánh dấu hoàn thành</button>}
            {["COMPLETED", "CANCELLED"].includes(item.status) && <span className="text-sm text-ktv-subtle">Không có thao tác tiếp theo</span>}
          </div></div>)}</div> : <div className="p-6"><Empty title="Chưa có công việc" description="Cố vấn sẽ tạo công việc sau khi hoàn thành các bước nghiệp vụ tương ứng."/></div>}
      </section>
      <section className={`${panel} p-6`}><h2 className="text-lg font-bold text-ktv-strong">Nhật ký trạng thái phiếu</h2>
        {order.status_history?.length ? <ol className="mt-5 space-y-4 border-l border-ktv-accent/30 pl-5">{order.status_history.map(entry => <li key={entry.id} className="relative"><span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-ktv-accent"/>
          <p className="text-sm font-semibold text-ktv-strong">{entry.status || "Thay đổi trạng thái"}</p><p className="mt-1 text-xs text-ktv-subtle">{dateLabel(entry.created_at)}</p>{entry.note && <p className="mt-1 text-sm text-ktv-muted">{entry.note}</p>}
        </li>)}</ol> : <p className="mt-3 text-sm text-ktv-muted">Chưa có sự kiện trạng thái được ghi nhận.</p>}
      </section>
    </>}
  </>;
}
