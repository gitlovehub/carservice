import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listWorkflowOrders, type WorkflowOrder, type WorkflowPage } from "../../services/workflowService";
import { Button, Card, EmptyState, ErrorState, LoadingState, Pagination, StatusBadge, buttonClass } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { getStatus } from "../../config/status";
import { WorkflowTitle } from "./WorkflowUI";
import { errorText, formatDateTime } from "./workflowFormat";

// Bộ lọc theo trạng thái phiếu; nhãn lấy từ config/status.ts để khớp badge.
const filterCodes = ["", "RECEIVED", "INSPECTING", "QUOTING", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "HANDED_OVER", "CLOSED"];

type Result = { key: string; list?: WorkflowPage<WorkflowOrder>; error?: string };

export default function AdvisorRepairOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${page}|${status}|${reload}`;
  const loading = result?.key !== key;

  useEffect(() => {
    let alive = true;
    const current = `${page}|${status}|${reload}`;
    listWorkflowOrders(page, status).then(
      list => { if (alive) setResult({ key: current, list }); },
      err => { if (alive) setResult({ key: current, error: errorText(err) }); },
    );
    return () => { alive = false; };
  }, [page, status, reload]);

  const list = result?.list;
  return <main className="page-container">
    <WorkflowTitle title="Phiếu sửa chữa" sub="Mở phiếu để kiểm tra, báo giá, sửa chữa, thu tiền và bàn giao. Phiếu được tạo ở bước tiếp nhận xe."
      actions={<>
        <Button variant="outline" icon="refresh" loading={loading && !!result} onClick={() => setReload(n => n + 1)}>Làm mới</Button>
        <Link className={buttonClass({ variant: "primary" })} to="/advisor/reception"><Icon name="plus" size={16}/>Tiếp nhận xe</Link>
      </>}/>
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
      {filterCodes.map(value => <button key={value} type="button" role="tab" aria-selected={status === value}
        className={`min-h-9 cursor-pointer rounded-full border px-3.5 text-small font-medium transition-colors ${status === value ? "border-cs-accent bg-cs-accent text-cs-accent-contrast" : "border-cs-border bg-cs-surface text-cs-text-2 hover:border-cs-border-strong hover:text-cs-text"}`}
        onClick={() => { setPage(1); setSearchParams(value ? { status: value } : {}); }}>{value ? getStatus("repair", value).label : "Tất cả"}</button>)}
    </div>
    <Card className="p-0!">
      <div className="flex items-center justify-between gap-3 border-b border-cs-border px-5 py-4">
        <h2 className="text-subheading text-cs-text">Danh sách phiếu</h2>
        <span className="text-small text-cs-muted">{list?.total ?? 0} phiếu</span>
      </div>
      {loading && !list ? <LoadingState compact label="Đang tải phiếu sửa chữa..."/>
        : result?.error ? <ErrorState compact description={result.error} onRetry={() => setReload(n => n + 1)}/>
        : !list?.data?.length ? <EmptyState compact icon="clipboard" title="Chưa có phiếu sửa chữa" description="Hãy tiếp nhận một lịch hẹn đã xác nhận để tạo phiếu."/>
        : <ul className="divide-y divide-cs-border" aria-busy={loading || undefined}>
          {list.data.map(order => <li key={order.id}>
            <Link to={`/advisor/service-orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-cs-hover">
              <div className="min-w-0">
                <p className="font-semibold text-cs-text">{order.repair_order_code || `Phiếu #${order.id}`}</p>
                <p className="mt-0.5 text-small text-cs-muted">{order.customer?.full_name || `Khách #${order.customer_id}`} · {order.vehicle?.license_plate || `Xe #${order.vehicle_id}`}</p>
                <p className="mt-0.5 text-caption text-cs-muted">Nhận xe: {formatDateTime(order.received_at)}</p>
              </div>
              <div className="flex items-center gap-3"><StatusBadge domain="repair" status={order.status}/><span className="flex items-center gap-1 text-small font-medium text-cs-accent-text">Chi tiết<Icon name="chevron-right" size={14}/></span></div>
            </Link>
          </li>)}
        </ul>}
      {!!list && <div className="px-5 pb-4"><Pagination page={page} totalPages={list.last_page} onChange={setPage} disabled={loading}/></div>}
    </Card>
  </main>;
}
