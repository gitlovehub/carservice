import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdvisorAppointments } from "../../services/advisorAppointmentService";
import "../../styles/workspace-dashboard.css";

type Appointment = {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  customer?: { full_name?: string } | null;
  vehicle?: { license_plate?: string | null } | null;
};
type AppointmentPayload = { data?: Appointment[] | { data?: Appointment[] }; pagination?: { total?: number } };
type Mode = "advisor" | "admin";
const pendingStatuses = new Set(["PENDING", "CREATED"]); // Backend currently uses PENDING; demo uses CREATED.
const statuses: Record<string, string> = {
  PENDING: "Chờ xác nhận", CREATED: "Chờ xác nhận", CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã tiếp nhận", CANCELLED: "Đã hủy",
};
function getItems(payload: AppointmentPayload): Appointment[] {
  const list = payload?.data;
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object" && Array.isArray(list.data)) return list.data;
  return [];
}
function dateLabel(value?: string) {
  if (!value) return "Chưa rõ ngày";
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}
function useAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let mounted = true;
    setPhase("loading");
    // The existing Laravel endpoint returns paginated data and supports status=PENDING.
    // Query the total separately; never present the first page as a global count.
    Promise.all([
      getAdvisorAppointments({ per_page: 100 }),
      getAdvisorAppointments({ per_page: 1, status: "PENDING" }),
    ]).then(([result, pending]: [AppointmentPayload, AppointmentPayload]) => {
      if (!mounted) return;
      setItems(getItems(result));
      setPendingCount(typeof pending?.pagination?.total === "number" ? pending.pagination.total : null);
      setPhase("ready");
    }).catch(() => { if (mounted) { setItems([]); setPendingCount(null); setPhase("error"); } });
    return () => { mounted = false; };
  }, [refreshKey]);
  return { items, pendingCount, phase, retry: () => setRefreshKey(previous => previous + 1) };
}
function OverviewMetric({ title, value, helper, featured }: { title: string; value: string; helper: string; featured?: boolean }) {
  return <article className={`ws-metric${featured ? " ws-metric-featured" : ""}`}>
    <div className="ws-metric-label">{title}</div><div className="ws-metric-value">{value}</div>
    <div className="ws-metric-helper">{helper}</div>
  </article>;
}
function QueuePanel({ items, phase, role }: { items: Appointment[]; phase: "loading" | "ready" | "error"; role: Mode }) {
  return <section className="ws-panel">
    <div className="ws-panel-head"><div><h2>{role === "advisor" ? "Lịch hẹn sắp đến" : "Hoạt động vận hành"}</h2>
      <p>{role === "advisor" ? "Các lịch tiếp nhận và xác nhận từ hệ thống." : "Lịch hẹn mới nhất từ hệ thống."}</p></div>
      <Link className="ws-button ws-button-outline" to={role === "advisor" ? "/advisor/appointments" : "/admin/appointments"}>Xem lịch <span aria-hidden="true">→</span></Link>
    </div>
    {phase === "loading" ? <div className="ws-panel-empty" role="status">Đang tải lịch hẹn…</div> :
      phase === "error" ? <div className="ws-panel-empty" role="alert">Không tải được lịch hẹn. Vui lòng thử lại khi API hoạt động.</div> :
      items.length === 0 ? <div className="ws-panel-empty">Chưa có lịch hẹn. Dữ liệu thực sẽ hiển thị tại đây.</div> :
      <div className="ws-queue">{items.slice(0, 6).map(item => <div className="ws-queue-row" key={item.id}>
        <div className="ws-queue-time"><strong>{item.appointment_time?.slice(0, 5) || "—"}</strong><small>{dateLabel(item.appointment_date)}</small></div>
        <div className="ws-queue-main"><strong>{item.customer?.full_name || item.appointment_code || "Lịch hẹn"}</strong>
          <p>{item.vehicle?.license_plate || "Chưa có biển số"} · {item.appointment_code || `#${item.id}`}</p></div>
        <span className={`ws-status ${pendingStatuses.has(item.status) ? "ws-status-pending" : ""}`}>{statuses[item.status] || item.status}</span>
      </div>)}</div>}
  </section>;
}
export default function WorkspaceDashboard({ role }: { role: Mode }) {
  const { items, pendingCount, phase, retry } = useAppointments();
  const ready = phase === "ready";
  const countPending = pendingCount;
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const advisor = role === "advisor";
  const upcoming = items.filter(item => !["CANCELLED", "COMPLETED"].includes(item.status) && (!advisor || !item.appointment_date || item.appointment_date >= isoToday))
    .sort((a, b) => `${a.appointment_date || ""} ${a.appointment_time || ""}`.localeCompare(`${b.appointment_date || ""} ${b.appointment_time || ""}`));
  return <main className="ws-dashboard">
    <div className="ws-intro"><div><p className="ws-eyebrow">{advisor ? "SERVICE DESK / DAILY OPERATIONS" : "BUSINESS INTELLIGENCE / ATELIER"}</p>
      <h1>{advisor ? "Chào buổi làm việc." : "Trung tâm điều hành."}</h1>
      <p>{advisor ? "Mọi việc cần xử lý hôm nay — tập trung tại một nơi." : "Theo dõi hoạt động gara trên dữ liệu API thực tế."}</p></div>
      <span className="ws-chip"><span className="ws-dot"/>{advisor ? new Intl.DateTimeFormat("vi-VN").format(new Date()) : "WORKSPACE"}</span>
    </div>
    <section className={`ws-focus ${advisor ? "ws-focus-advisor" : "ws-focus-admin"}`}>
      <div><p className="ws-focus-label">{advisor ? "TODAY'S FOCUS" : "OPERATIONAL OVERVIEW"}</p>
        <h2>{phase === "loading" ? "Đang cập nhật dữ liệu" : phase === "error" ? "Cần kiểm tra kết nối API" : `${countPending ?? "—"} lịch cần xác nhận`}</h2>
        <p>{advisor ? "Ưu tiên kiểm tra lịch đặt mới và lịch tiếp nhận đã xác nhận." : "Các thống kê khác sẽ được tích hợp khi API báo cáo sẵn sàng."}</p></div>
      {advisor ? <Link className="ws-button ws-button-primary" to="/advisor/reception">Tiếp nhận xe <span aria-hidden="true">→</span></Link> :
        <Link className="ws-button ws-button-primary" to="/admin/appointments">Quản lý lịch hẹn <span aria-hidden="true">→</span></Link>}
    </section>
    <div className="ws-metric-grid">
      {advisor ? <>
        <OverviewMetric title="Lịch cần xác nhận" value={ready && countPending !== null ? String(countPending) : "—"} helper="Chờ cố vấn kiểm tra" featured/>
        <OverviewMetric title="Báo giá chờ duyệt" value="—" helper="Chờ API báo giá"/>
        <OverviewMetric title="Xe đang sửa" value="—" helper="Chờ API phiếu sửa chữa"/>
        <OverviewMetric title="Chờ bàn giao" value="—" helper="Chờ API sửa chữa"/>
      </> : <>
        <OverviewMetric title="Doanh thu ghi nhận" value="—" helper="Chờ API báo cáo" featured/>
        <OverviewMetric title="Xe đang trong gara" value="—" helper="Chờ API phiếu sửa chữa"/>
        <OverviewMetric title="Lịch cần xác nhận" value={ready && countPending !== null ? String(countPending) : "—"} helper="Đang đợi cố vấn"/>
        <OverviewMetric title="Phụ tùng cảnh báo" value="—" helper="Chờ API tồn kho"/>
      </>}
    </div>
    <div className="ws-columns">
      <QueuePanel items={upcoming} phase={phase} role={role}/>
      <div className="ws-side-panels">
        <section className="ws-panel ws-panel-pad"><div className="ws-panel-head"><div><h2>{advisor ? "Ưu tiên xử lý" : "Ưu tiên hôm nay"}</h2></div><span className="ws-tag">{advisor ? "ACTION QUEUE" : "ACTIONABLE"}</span></div>
          <Link className="ws-task" to={advisor ? "/advisor/appointments" : "/admin/appointments"}><div><strong>Lịch đặt mới</strong><p>Kiểm tra và xác nhận lịch</p></div><span>{ready && countPending !== null ? countPending : "—"}</span></Link>
          {advisor ? <>
            <Link className="ws-task" to="/advisor/quotation"><div><strong>Báo giá đang chờ</strong><p>Theo dõi phản hồi khách hàng</p></div><span>→</span></Link>
            <Link className="ws-task" to="/advisor/service-orders"><div><strong>Phiếu sửa chữa</strong><p>Xem các phiếu được tiếp nhận</p></div><span>→</span></Link>
          </> : <>
            <Link className="ws-task" to="/admin/inventory"><div><strong>Quản lý kho</strong><p>Xem phụ tùng và vật tư</p></div><span>→</span></Link>
            <Link className="ws-task" to="/admin/services"><div><strong>Danh mục dịch vụ</strong><p>Kiểm tra các dịch vụ hiện có</p></div><span>→</span></Link>
          </>}
        </section>
        <section className="ws-panel ws-panel-pad"><h2>{advisor ? "Phiếu hoạt động gần đây" : "Sự kiện mới nhất"}</h2>
          <p className="ws-secondary-note">Chưa có API tổng hợp cho mục này. Sẽ hiển thị sau khi module được tích hợp.</p>
          {phase === "error" && <button className="ws-button ws-button-outline" type="button" onClick={retry}>Tải lại lịch hẹn</button>}
        </section>
      </div>
    </div>
  </main>;
}
