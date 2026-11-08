import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getAdvisorAppointments } from "../../services/advisorAppointmentService";
import { listWorkflowOrders, type WorkflowOrder } from "../../services/workflowService";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, buttonClass } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";

/**
 * Trang "Tổng quan" dùng chung cho Advisor và Admin. Chỉ hiển thị số liệu từ API thật:
 *   - Lịch hẹn: /advisor/appointments (Advisor + Admin) — lấy pagination.total theo trạng thái / ngày.
 *   - Phiếu sửa chữa: /repair-orders (chỉ Advisor) — lấy total theo trạng thái.
 * Mỗi số liệu tải độc lập: một API lỗi không làm mất các số khác. Chưa có API thì không hiển thị.
 */
type Mode = "advisor" | "admin";
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
type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error" };

function getItems(payload: AppointmentPayload): Appointment[] {
  const list = payload?.data;
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object" && Array.isArray(list.data)) return list.data;
  return [];
}
function totalOf(payload: AppointmentPayload): number {
  const total = payload?.pagination?.total;
  if (typeof total !== "number") throw new Error("API không trả tổng số");
  return total;
}
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Tải một nguồn dữ liệu; `reloadKey` đổi thì tải lại. */
function useLoad<T>(loader: () => Promise<T>, reloadKey: number, enabled = true): Load<T> {
  const [result, setResult] = useState<{ key: number; load: Load<T> }>({ key: -1, load: { state: "loading" } });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loader().then(
      value => { if (alive) setResult({ key: reloadKey, load: { state: "ready", value } }); },
      () => { if (alive) setResult({ key: reloadKey, load: { state: "error" } }); },
    );
    return () => { alive = false; };
    // loader được tạo mới mỗi lần render; chỉ tải lại khi reloadKey đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, enabled]);
  return result.key === reloadKey ? result.load : { state: "loading" };
}

function mapLoad<T, R>(load: Load<T>, fn: (value: T) => R): Load<R> {
  return load.state === "ready" ? { state: "ready", value: fn(load.value) } : load;
}
function combineLoad<A, B, R>(a: Load<A>, b: Load<B>, fn: (a: A, b: B) => R): Load<R> {
  if (a.state === "ready" && b.state === "ready") return { state: "ready", value: fn(a.value, b.value) };
  return a.state === "error" || b.state === "error" ? { state: "error" } : { state: "loading" };
}

function StatCard({ label, load, hint, to, icon, highlight }: {
  label: string; load: Load<number>; hint: string; to: string; icon: IconName; highlight?: boolean;
}) {
  const value = load.state === "ready" ? load.value.toLocaleString("vi-VN") : load.state === "error" ? "—" : null;
  return <Link to={to} className="group flex min-h-[132px] flex-col justify-between gap-3 rounded-card border border-cs-border bg-cs-surface p-card shadow-card transition-colors hover:border-cs-accent focus-visible:border-cs-accent">
    <div className="flex items-start justify-between gap-3">
      <p className="text-small font-medium text-cs-text-2">{label}</p>
      <span className={`grid size-9 shrink-0 place-items-center rounded-control ${highlight ? "bg-cs-accent text-cs-accent-contrast" : "bg-cs-soft text-cs-accent-text"}`} aria-hidden="true">
        <Icon name={icon} size={18}/>
      </span>
    </div>
    <div>
      {value === null
        ? <span role="status" className="block h-9 w-16 animate-pulse rounded-md bg-cs-surface-2"><span className="sr-only">Đang tải</span></span>
        : <p className="text-[2rem] font-bold leading-none text-cs-text" title={load.state === "error" ? "Không tải được số liệu" : undefined}>{value}</p>}
      <p className="mt-2 flex items-center gap-1 text-caption text-cs-muted">
        {load.state === "error" ? "Không tải được số liệu" : hint}
        <Icon name="chevron-right" size={12} className="opacity-0 transition-opacity group-hover:opacity-100"/>
      </p>
    </div>
  </Link>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <Card className="min-w-0 overflow-hidden p-0!">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cs-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-subheading text-cs-text">{title}</h2>
        {description && <p className="mt-0.5 text-caption text-cs-muted">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </Card>;
}

function TodayAppointments({ load, role, onRetry }: { load: Load<Appointment[]>; role: Mode; onRetry: () => void }) {
  if (load.state === "loading") return <LoadingState compact label="Đang tải lịch hẹn..."/>;
  if (load.state === "error") return <ErrorState compact description="Không tải được lịch hẹn hôm nay." onRetry={onRetry}/>;
  const items = [...load.value].sort((a, b) => (a.appointment_time ?? "").localeCompare(b.appointment_time ?? ""));
  if (!items.length) return <EmptyState compact icon="calendar" title="Hôm nay chưa có lịch hẹn" description="Lịch hẹn mới sẽ xuất hiện tại đây."/>;
  return <ul className="divide-y divide-cs-border">
    {items.slice(0, 8).map(item => <li key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 max-sm:grid-cols-[48px_minmax(0,1fr)]">
      <span className="text-subheading font-semibold text-cs-text">{item.appointment_time?.slice(0, 5) || "—"}</span>
      <div className="min-w-0">
        <p className="truncate text-small font-medium text-cs-text">{item.customer?.full_name || "Khách hàng"}</p>
        <p className="truncate text-caption text-cs-muted">{item.vehicle?.license_plate || "Chưa có biển số"} · {item.appointment_code || `#${item.id}`}</p>
      </div>
      <StatusBadge domain="appointment" status={item.status} className="max-sm:col-start-2 max-sm:justify-self-start"/>
    </li>)}
    {items.length > 8 && <li className="px-5 py-3 text-caption text-cs-muted">
      và {items.length - 8} lịch khác — <Link className="font-medium text-cs-accent-text hover:underline" to={`/${role}/appointments`}>xem tất cả</Link>
    </li>}
  </ul>;
}

function RecentOrders({ load, onRetry }: { load: Load<WorkflowOrder[]>; onRetry: () => void }) {
  if (load.state === "loading") return <LoadingState compact label="Đang tải phiếu sửa chữa..."/>;
  if (load.state === "error") return <ErrorState compact description="Không tải được phiếu sửa chữa." onRetry={onRetry}/>;
  if (!load.value.length) return <EmptyState compact icon="clipboard" title="Chưa có phiếu sửa chữa" description="Phiếu được tạo khi tiếp nhận xe."/>;
  return <ul className="divide-y divide-cs-border">
    {load.value.slice(0, 5).map(order => <li key={order.id}>
      <Link to={`/advisor/service-orders/${order.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-cs-hover">
        <div className="min-w-0">
          <p className="truncate text-small font-medium text-cs-text">{order.repair_order_code || `Phiếu #${order.id}`}</p>
          <p className="truncate text-caption text-cs-muted">{order.customer?.full_name || "Khách hàng"} · {order.vehicle?.license_plate || "Chưa có biển số"}</p>
        </div>
        <StatusBadge domain="repair" status={order.status}/>
      </Link>
    </li>)}
  </ul>;
}

function TaskLink({ to, label, hint, load }: { to: string; label: string; hint: string; load: Load<number> }) {
  return <li>
    <Link to={to} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-cs-hover">
      <div className="min-w-0">
        <p className="text-small font-medium text-cs-text">{label}</p>
        <p className="text-caption text-cs-muted">{hint}</p>
      </div>
      <span className="min-w-8 rounded-full bg-cs-surface-2 px-2.5 py-1 text-center text-small font-semibold text-cs-text">
        {load.state === "ready" ? load.value : load.state === "error" ? "—" : "…"}
      </span>
    </Link>
  </li>;
}

/** Thẻ lối tắt Admin (2 cột, xen kẽ navy / tím) — chỉ trỏ tới route có sẵn. */
const adminTiles: Array<{ to: string; label: string; hint: string; icon: IconName }> = [
  { to: "/admin/services", label: "Dịch vụ & gói", hint: "Danh mục, giá dịch vụ và gói bảo dưỡng", icon: "settings" },
  { to: "/admin/inventory", label: "Kho phụ tùng", hint: "Tồn kho và nhập xuất", icon: "box" },
  { to: "/admin/accounts", label: "Tài khoản", hint: "Nhân viên và phân quyền", icon: "shield" },
  { to: "/admin/reports", label: "Báo cáo", hint: "Doanh thu và hiệu suất", icon: "chart" },
];

/** Hàng "Tiện ích": nút icon tròn 60px, nhãn bên dưới. */
const adminUtilities: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/admin/appointments", label: "Lịch hẹn", icon: "calendar" },
  { to: "/admin/inventory", label: "Nhập kho", icon: "box" },
  { to: "/admin/working-hours", label: "Giờ làm việc", icon: "clock" },
  { to: "/admin/maintenance-packages", label: "Gói bảo dưỡng", icon: "clipboard" },
];

export default function WorkspaceDashboard({ role }: { role: Mode }) {
  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey(key => key + 1);
  const today = isoToday();
  const advisor = role === "advisor";

  // Lịch hẹn — dùng chung Advisor/Admin.
  const pending = useLoad(() => getAdvisorAppointments({ per_page: 1, status: "PENDING" }).then(totalOf), reloadKey);
  const confirmed = useLoad(() => getAdvisorAppointments({ per_page: 1, status: "CONFIRMED" }).then(totalOf), reloadKey);
  const todayData = useLoad(() => getAdvisorAppointments({ per_page: 50, date: today }).then(page => ({ items: getItems(page), total: totalOf(page) })), reloadKey);
  const todayList = mapLoad(todayData, data => data.items);
  const todayTotal = mapLoad(todayData, data => data.total);
  // Phiếu sửa chữa — API chỉ mở cho Advisor.
  const orderTotal = (status: string) => () => listWorkflowOrders(1, status).then(page => page.total);
  const inProgress = useLoad(orderTotal("IN_PROGRESS"), reloadKey, advisor);
  const completed = useLoad(orderTotal("COMPLETED"), reloadKey, advisor);
  const quoting = useLoad(orderTotal("QUOTING"), reloadKey, advisor);
  const waitingApproval = useLoad(orderTotal("WAITING_APPROVAL"), reloadKey, advisor);
  const waitingParts = useLoad(orderTotal("WAITING_FOR_PARTS"), reloadKey, advisor);
  const recentOrders = useLoad(() => listWorkflowOrders(1).then(page => page.data), reloadKey, advisor);

  const dateText = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const base = `/${role}`;

  return <div className="page-container">
    <PageHeader
      eyebrow={dateText}
      title="Tổng quan"
      description={advisor ? "Công việc cần xử lý trong ngày: lịch hẹn, tiếp nhận xe và phiếu sửa chữa." : "Tình hình lịch hẹn và lối tắt tới các danh mục quản trị."}
      actions={<>
        <Button variant="outline" icon="refresh" onClick={retry}>Làm mới</Button>
        {advisor
          ? <Link className={buttonClass({ variant: "primary" })} to="/advisor/reception"><Icon name="car" size={16}/>Tiếp nhận xe</Link>
          : <Link className={buttonClass({ variant: "primary" })} to="/admin/appointments"><Icon name="calendar" size={16}/>Quản lý lịch hẹn</Link>}
      </>}
    />

    <section aria-label="Chỉ số chính" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Lịch chờ xác nhận" load={pending} hint="Cần gọi xác nhận với khách" to={`${base}/appointments`} icon="calendar" highlight/>
      <StatCard label="Lịch hẹn hôm nay" load={todayTotal} hint="Theo ngày hẹn" to={`${base}/appointments`} icon="clock"/>
      {advisor ? <>
        <StatCard label="Đang sửa chữa" load={inProgress} hint="Phiếu ở trạng thái đang sửa" to="/advisor/service-orders?status=IN_PROGRESS" icon="wrench"/>
        <StatCard label="Chờ thanh toán & bàn giao" load={completed} hint="Đã sửa xong, chờ thu tiền" to="/advisor/service-orders?status=COMPLETED" icon="receipt"/>
      </> : <>
        <StatCard label="Đã xác nhận, chờ xe đến" load={confirmed} hint="Lịch đã xác nhận" to="/admin/appointments" icon="check"/>
        <StatCard label="Tổng lịch đang mở" load={combineLoad(pending, confirmed, (a, b) => a + b)}
          hint="Chờ xác nhận + đã xác nhận" to="/admin/appointments" icon="clipboard"/>
      </>}
    </section>

    {!advisor && <section aria-label="Lối tắt quản trị" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="admin-shortcut-tiles">
      {adminTiles.map((tile, index) => <Link key={tile.to} to={tile.to} className={`cs-admin-tile ${index % 4 === 1 || index % 4 === 2 ? "is-violet" : ""}`}>
        <span className="min-w-0">
          <span className="block text-section text-cs-text">{tile.label}</span>
          <span className="mt-1 block text-small text-cs-text-2">{tile.hint}</span>
        </span>
        <span className="cs-admin-tile-icon" aria-hidden="true"><Icon name={tile.icon} size={22}/></span>
      </Link>)}
    </section>}

    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Panel title="Lịch hẹn hôm nay" description="Sắp xếp theo giờ hẹn"
        action={<Link className={buttonClass({ variant: "ghost", size: "sm" })} to={`${base}/appointments`}>Xem tất cả<Icon name="chevron-right" size={14}/></Link>}>
        <TodayAppointments load={todayList} role={role} onRetry={retry}/>
      </Panel>

      <div className="grid gap-5">
        {advisor ? <>
          <Panel title="Cần xử lý" description="Phiếu sửa chữa đang chờ thao tác">
            <ul className="divide-y divide-cs-border">
              <TaskLink to="/advisor/service-orders?status=QUOTING" label="Lập báo giá" hint="Đã chẩn đoán, chưa gửi báo giá" load={quoting}/>
              <TaskLink to="/advisor/service-orders?status=WAITING_APPROVAL" label="Chờ khách duyệt" hint="Báo giá đã gửi khách" load={waitingApproval}/>
              <TaskLink to="/advisor/service-orders?status=WAITING_FOR_PARTS" label="Chờ phụ tùng" hint="Tạm dừng sửa chữa" load={waitingParts}/>
              <TaskLink to="/advisor/appointments" label="Đã xác nhận, chờ xe đến" hint="Sẵn sàng tiếp nhận" load={confirmed}/>
            </ul>
          </Panel>
          <Panel title="Phiếu sửa chữa gần đây"
            action={<Link className={buttonClass({ variant: "ghost", size: "sm" })} to="/advisor/service-orders">Xem tất cả<Icon name="chevron-right" size={14}/></Link>}>
            <RecentOrders load={recentOrders} onRetry={retry}/>
          </Panel>
        </> : <Panel title="Tiện ích" description="Mở nhanh các màn hình hay dùng">
          <ul className="grid grid-cols-4 gap-2 px-4 py-5" data-testid="admin-utilities">
            {adminUtilities.map(item => <li key={item.label}>
              <Link to={item.to} className="cs-admin-utility">
                <span className="cs-admin-utility-icon" aria-hidden="true"><Icon name={item.icon} size={22}/></span>
                <span className="text-caption text-cs-text-2">{item.label}</span>
              </Link>
            </li>)}
          </ul>
        </Panel>}
      </div>
    </div>
  </div>;
}
