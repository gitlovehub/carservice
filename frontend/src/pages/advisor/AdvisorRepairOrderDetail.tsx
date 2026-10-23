import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useLocation, useParams } from "react-router-dom";
import { workflowApi, type WorkflowOrder } from "../../services/workflowService";
import { action, card, input, outline, WorkflowTitle, Notice, Status, errorText, formatDateTime } from "./WorkflowUI";

export default function AdvisorRepairOrderDetail() {
  const id = Number(useParams().orderId);
  const { confirm, notify } = useAppFeedback();
  const location = useLocation();
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState((location.state as { success?: string } | null)?.success || "");
  const [technicianId, setTechnicianId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const fetchOrder = useCallback(() => {
    if (!Number.isSafeInteger(id) || id < 1) return Promise.reject(new Error("Mã phiếu không hợp lệ."));
    return workflowApi.order(id);
  }, [id]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setOrder(await fetchOrder()); }
    catch (err) { setError(errorText(err)); }
    finally { setLoading(false); }
  }, [fetchOrder]);
  useEffect(() => {
    let active = true;
    fetchOrder()
      .then(result => { if (active) setOrder(result); })
      .catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOrder]);

  const activeAssignments = order?.assignments?.filter(item => item.status !== "CANCELLED") ?? [];
  const cancelledAssignments = order?.assignments?.filter(item => item.status === "CANCELLED") ?? [];
  const canAssign = activeAssignments.length === 0 && order?.status === "RECEIVED";

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!canAssign) {
      setError("Phiếu đã có KTV phụ trách hoặc không còn ở trạng thái chờ phân công. Vui lòng tải lại dữ liệu.");
      return;
    }
    const profile = Number(technicianId);
    if (!Number.isSafeInteger(profile) || profile < 1) { setError("Nhập ID hồ sơ KTV (technician_profiles.id) hợp lệ."); return; }
    if (!order || working) return;
    if (order.assignments?.some(item => Number(item.technician_id) === profile)) {
      setError("KTV này đã được phân công trên phiếu."); return;
    }
    const approved = await confirm({
      title: "Xác nhận phân công kỹ thuật viên",
      reference: order.repair_order_code || `Phiếu #${order.id}`,
      description: `Giao phiếu cho hồ sơ kỹ thuật viên số ${profile}. Hãy đảm bảo đây là ID hồ sơ KTV thật đã được xác minh với nhóm quản lý, không phải ID tài khoản hoặc nhân viên.`,
      confirmText: "Giao việc cho KTV", checklist: ["Đã đối chiếu ID hồ sơ kỹ thuật viên chính xác."],
    });
    if (!approved) return;
    setWorking(true); setError(""); setSuccess("");
    try {
      await workflowApi.assignTechnician(order.id, profile, assignmentNote.trim());
      await load(); notify("Đã giao phiếu sửa chữa cho KTV thành công.", "success"); setSuccess("Đã phân công KTV. Phiếu sẽ xuất hiện trong khu vực Kỹ thuật viên được giao.");
      setTechnicianId(""); setAssignmentNote("");
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }
  return <main data-print-repair-order className="mx-auto max-w-6xl pb-12">
    <div className="mb-4 flex flex-wrap gap-3 print:hidden"><Link className={outline} to="/advisor/service-orders">← Danh sách phiếu</Link><button type="button" className={outline} onClick={() => window.print()}>In phiếu sửa chữa</button><button type="button" disabled={loading} className={outline} onClick={() => void load()}>Làm mới</button></div>
    <WorkflowTitle label="SERVICE DESK / REPAIR ORDER" title={order?.repair_order_code || `Phiếu sửa chữa #${id}`} sub="Dữ liệu từ Laravel: tiếp nhận xe, phân công KTV và kết quả kiểm tra trên cùng một phiếu."/>
    {error && <Notice tone="error">{error}</Notice>}{success && <Notice tone="success">{success}</Notice>}
    {loading && <p className="text-cs-muted">Đang tải dữ liệu phiếu...</p>}
    {!loading && order && <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cs-border bg-cs-soft px-5 py-4"><div className="text-sm font-semibold text-cs-text">Trạng thái hiện tại</div><Status status={order.status}/></div>
      <div className="grid gap-5 lg:grid-cols-2"><section className={card}><h2 className="mb-5 text-lg font-bold text-cs-text">Phiếu tiếp nhận</h2><dl className="grid gap-4 sm:grid-cols-2">{[
        ["Khách hàng", order.customer?.full_name || `#${order.customer_id || "?"}`],
        ["Điện thoại", order.customer?.phone || "—"],
        ["Biển số", order.vehicle?.license_plate || `#${order.vehicle_id || "?"}`],
        ["Lịch hẹn", order.appointment_id ? `#${order.appointment_id}` : "Khách walk-in"],
        ["Cố vấn", order.advisor?.full_name || "—"],
        ["Nhận xe lúc", formatDateTime(order.received_at)],
        ["Số km", order.mileage_received == null ? "—" : `${order.mileage_received.toLocaleString("vi-VN")} km`],
      ].map(([name, value]) => <div key={name}><dt className="text-xs text-cs-muted">{name}</dt><dd className="mt-1 text-sm font-semibold text-cs-text">{value}</dd></div>)}</dl>
        <div className="mt-5 border-t border-cs-border pt-4"><p className="text-xs font-bold text-cs-muted">Tình trạng ban đầu</p><p className="mt-2 whitespace-pre-wrap text-sm text-cs-text">{order.initial_condition || "Chưa ghi"}</p></div>
        {order.note && <p className="mt-3 whitespace-pre-wrap text-sm text-cs-muted">Ghi chú: {order.note}</p>}
      </section>
      <section className={card}><h2 className="mb-5 text-lg font-bold text-cs-text">Kiểm tra và chẩn đoán</h2>
        {order.inspections?.length ? order.inspections.map(item => <div key={item.id} className="mb-5 space-y-3 border-b border-cs-border pb-5 text-sm text-cs-text"><p><strong>Kết luận:</strong> {item.diagnosis || "Chưa có kết luận"}</p><p><strong>Tình trạng:</strong> {item.condition_description || "—"}</p><p className="text-xs text-cs-muted">{item.inspected_at ? `Hoàn tất ${formatDateTime(item.inspected_at)}` : "Chưa hoàn tất kiểm tra"}</p>
          {!!item.items?.length && <div className="space-y-1">{item.items.map(check => <p key={check.id} className="text-xs text-cs-muted">• {check.item_name}: {check.condition_status || "—"}</p>)}</div>}
        </div>) : <p className="text-sm text-cs-muted">KTV chưa tạo phiếu kiểm tra. Cần phân công KTV trước.</p>}
      </section></div>
      <section className={`${card} mt-6 print:hidden`} aria-labelledby="technician-assignment-heading">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cs-accent">Nhân sự phụ trách</p>
            <h2 id="technician-assignment-heading" className="mt-1 text-lg font-bold text-cs-text">Kỹ thuật viên phụ trách</h2>
            <p className="mt-1 text-sm text-cs-muted">Phân công kiểm tra và chẩn đoán cho phiếu sửa chữa này.</p>
          </div>
          <span className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-semibold ${activeAssignments.length ? "border-emerald-500/30 bg-emerald-500/10 text-cs-text" : "border-cs-border bg-cs-soft text-cs-text"}`}>
            {activeAssignments.length ? "✓ Đã phân công" : "Chưa phân công"}
          </span>
        </div>
        {activeAssignments.length > 0 ? (
          <div className="space-y-3">
            {activeAssignments.map(assignment => (
              <div key={assignment.id} className="rounded-xl border border-cs-border bg-cs-surface-2 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cs-accent/30 bg-cs-soft text-base font-bold text-cs-accent">
                    {(assignment.technician?.employee?.full_name || "KT").trim().slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-bold text-cs-text sm:text-base">{assignment.technician?.employee?.full_name || `Kỹ thuật viên #${assignment.technician_id}`}</p>
                    <p className="mt-0.5 text-xs text-cs-muted">Mã hồ sơ KTV #{assignment.technician_id}</p>
                  </div>
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-cs-text">
                    {assignment.status === "COMPLETED" ? "Đã hoàn thành" : assignment.status === "IN_PROGRESS" ? "Đang thực hiện" : "Đã nhận phân công"}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs leading-5 text-cs-muted">Phiếu đã có người phụ trách nên chức năng giao mới được ẩn để tránh phân công trùng. Theo dõi tiến độ trong phần kiểm tra/chẩn đoán và lịch sử xử lý bên dưới.</p>
          </div>
        ) : canAssign ? (
          <>
            <Notice>Phiếu đang chờ giao cho KTV. Hãy sử dụng đúng mã hồ sơ đã được nhóm quản lý cung cấp.</Notice>
            <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-end" onSubmit={event => void assign(event)}>
              <label className="text-sm font-semibold text-cs-text">Mã KTV phụ trách *
                <input type="number" min="1" step="1" required className={input} value={technicianId} onChange={event => setTechnicianId(event.target.value)} placeholder="Ví dụ: 1" />
              </label>
              <label className="text-sm font-semibold text-cs-text">Ghi chú giao việc
                <input className={input} value={assignmentNote} onChange={event => setAssignmentNote(event.target.value)} placeholder="Ví dụ: Kiểm tra hệ thống phanh" />
              </label>
              <button className={`${action} min-w-36`} type="submit" disabled={working}>{working ? "Đang giao..." : "Giao cho KTV"}</button>
            </form>
            <p className="mt-3 text-xs leading-5 text-cs-muted">Chỉ nhập mã hồ sơ KTV đã xác minh; không dùng mã tài khoản hay nhân viên. API hiện tại chưa cung cấp danh sách KTV để chọn theo tên.</p>
          </>
        ) : (
          <Notice>Phiếu chưa có KTV đang phụ trách nhưng đã qua trạng thái RECEIVED. Không thể phân công mới tại màn hình này; cần đối chiếu quy trình với nhóm trước khi tiếp tục.</Notice>
        )}
        {cancelledAssignments.length > 0 && <div className="mt-5 border-t border-cs-border pt-4">
          <h3 className="text-sm font-semibold text-cs-text">Phân công đã hủy</h3>
          <ul className="mt-2 space-y-1 text-xs text-cs-muted">{cancelledAssignments.map(item => <li key={item.id}>{item.technician?.employee?.full_name || `KTV #${item.technician_id}`} · Đã hủy</li>)}</ul>
        </div>}
      </section>
      <section className={`${card} mt-6`}><h2 className="mb-4 text-lg font-bold text-cs-text">Lịch sử xử lý phiếu</h2>
        {order.status_history?.length ? <ol className="space-y-3 border-l-2 border-cs-accent/40 pl-5">{order.status_history.map(item => <li key={item.id} className="text-sm text-cs-text"><strong>{item.status || "Cập nhật"}</strong><span className="ml-3 text-xs text-cs-muted">{formatDateTime(item.created_at)}</span>{item.note && <p className="mt-1 text-xs text-cs-muted">{item.note}</p>}</li>)}</ol> : <p className="text-sm text-cs-muted">Chưa có nhật ký.</p>}
      </section>
      <div className="mt-6 print:hidden"><button type="button" className={action} onClick={() => window.print()}>In phiếu qua trình duyệt</button></div>
    </>}
  </main>;
}
