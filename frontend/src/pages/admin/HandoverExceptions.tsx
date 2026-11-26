import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, Field, LoadingState, Textarea } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { handoverExceptionApi, type HandoverExceptionRow } from "../../services/evidenceService";
import { fmtDateTime } from "../../services/adminApi";
import { AdminPage, Tabs } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

type Status = HandoverExceptionRow["status"];
const STATUS: Record<Status, { label: string; tone: "warning" | "success" | "danger" }> = {
  PENDING: { label: "Chờ duyệt", tone: "warning" },
  APPROVED: { label: "Đã duyệt", tone: "success" },
  REJECTED: { label: "Đã từ chối", tone: "danger" },
};
const person = (row?: { email?: string; employee?: { full_name?: string } | null } | null) => row?.employee?.full_name || row?.email || "—";

/** Ảnh giấy tờ chỉ tải khi admin bấm xem, không lưu đường dẫn công khai. */
function DocumentPreview({ id, kind, label }: { id: number; kind: "id-document" | "registration"; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { notify } = useAppFeedback();
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  return <div className="min-w-0 rounded-xl border border-cs-border p-3">
    <p className="mb-2 text-caption font-semibold text-cs-muted">{label}</p>
    {url
      ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-44 w-full rounded-lg object-contain"/></a>
      : <Button size="sm" variant="outline" icon="eye" loading={loading} onClick={() => {
        setLoading(true);
        handoverExceptionApi.file(id, kind).then(blob => setUrl(URL.createObjectURL(blob)))
          .catch(() => notify("Không tải được ảnh giấy tờ.", "error")).finally(() => setLoading(false));
      }}>Xem ảnh</Button>}
  </div>;
}

function ExceptionCard({ row, onChanged }: { row: HandoverExceptionRow; onChanged: () => void }) {
  const { confirm, notify } = useAppFeedback();
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const fieldErrors = useFieldErrors();
  const vehicle = row.handover?.vehicle;
  const car = [vehicle?.model?.brand?.name, vehicle?.model?.name].filter(Boolean).join(" ");

  async function decide(approve: boolean) {
    if (fieldErrors.show(note.trim().length < 5 ? { note: approve ? "Ghi rõ đã đối chiếu giấy tờ thế nào (ít nhất 5 ký tự)." : "Ghi lý do từ chối (ít nhất 5 ký tự)." } : {})) return;
    if (approve && !await confirm({
      title: "Duyệt ngoại lệ biên bản", reference: row.handover?.repair_order?.repair_order_code ?? undefined,
      description: "Biên bản sẽ được ghi nhận là đã xác nhận mà không có mã từ email chủ xe. Thao tác này không hoàn tác được.",
      confirmText: "Duyệt ngoại lệ", variant: "warning", checklist: ["Đã đối chiếu CCCD với chủ xe.", "Đã đối chiếu giấy đăng ký với xe."],
    })) return;
    setWorking(true);
    try {
      await (approve ? handoverExceptionApi.approve(row.id, note.trim()) : handoverExceptionApi.reject(row.id, note.trim()));
      notify(approve ? "Đã duyệt ngoại lệ." : "Đã từ chối yêu cầu.", "success");
      onChanged();
    } catch (err) { fieldErrors.showApi(err, { note: "note" }); }
    finally { setWorking(false); }
  }

  return <li className="rounded-card border border-cs-border bg-cs-surface p-5 shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-cs-text">{row.handover?.repair_order?.repair_order_code ?? "—"} <span className="font-normal text-cs-muted">· Biên bản {row.handover?.type === "CHECK_OUT" ? "trả xe" : "nhận xe"}</span></p>
        <p className="text-small text-cs-text-2">{[car, vehicle?.license_plate || "xxx.xx"].filter(Boolean).join(" · ")} · Chủ xe {row.handover?.repair_order?.customer?.full_name ?? "—"} {row.handover?.repair_order?.customer?.phone ?? ""}</p>
        <p className="text-caption text-cs-muted">Lập bởi {person(row.requested_by)} · {fmtDateTime(row.created_at)}</p>
      </div>
      <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
    </div>
    <p className="mt-3 rounded-control bg-cs-surface-2 px-3 py-2 text-small text-cs-text-2"><b className="text-cs-text">Lý do:</b> <span className="font-medium">{row.reason}</span></p>
    {row.documents_available
      ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DocumentPreview id={row.id} kind="id-document" label="CCCD của chủ xe"/>
        <DocumentPreview id={row.id} kind="registration" label="Giấy đăng ký xe"/>
      </div>
      : <p className="mt-3 rounded-control border border-dashed border-cs-border px-3 py-2 text-small text-cs-muted">Ảnh giấy tờ đã tự xóa sau 90 ngày kể từ khi xử lý.</p>}
    {row.status !== "PENDING" && row.documents_available && <p className="mt-2 text-caption text-cs-muted">Ảnh giấy tờ sẽ tự xóa sau 90 ngày kể từ khi xử lý.</p>}
    {row.status === "PENDING"
      ? <div className="mt-4 space-y-3">
        <Field label="Ghi chú của admin" required error={fieldErrors.errors.note}><Textarea rows={2} maxLength={1000} value={note} placeholder="VD: Đã đối chiếu CCCD và giấy đăng ký, khớp với chủ xe" onChange={e => { setNote(e.target.value); fieldErrors.clear("note"); }}/></Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger-outline" icon="x" disabled={working} onClick={() => void decide(false)}>Từ chối</Button>
          <Button variant="primary" icon="check" loading={working} onClick={() => void decide(true)}>Duyệt ngoại lệ</Button>
        </div>
      </div>
      : <p className="mt-3 text-small text-cs-text-2">{person(row.decided_by)}{row.decided_at ? ` · ${fmtDateTime(row.decided_at)}` : ""}: <span className="font-medium">{row.decision_note}</span></p>}
  </li>;
}

/** Admin duyệt ngoại lệ khi chủ xe mất email và đến trực tiếp với giấy tờ. Người lập yêu cầu không tự duyệt được. */
export default function HandoverExceptions() {
  const [status, setStatus] = useState<Status>("PENDING");
  const [version, setVersion] = useState(0);
  const list = useAdminQuery(`handover-exceptions:${status}:${version}`, signal => handoverExceptionApi.list(status, signal));
  const rows = list.data ?? [];

  return <AdminPage title="Duyệt ngoại lệ biên bản" description="Chủ xe mất quyền truy cập email, đến trực tiếp với CCCD và giấy đăng ký xe" demo={false}>
    <div className="mb-4"><Tabs label="Trạng thái" value={status} onChange={setStatus} items={(Object.keys(STATUS) as Status[]).map(id => ({ id, label: STATUS[id].label }))}/></div>
    {list.error ? <ErrorState description={list.error} onRetry={list.reload}/>
      : !list.data ? <LoadingState/>
      : !rows.length ? <EmptyState icon="shield" title="Không có yêu cầu" description="Yêu cầu do cố vấn lập sẽ hiện ở đây."/>
      : <ul className="space-y-4">{rows.map(row => <ExceptionCard key={row.id} row={row} onChanged={() => setVersion(v => v + 1)}/>)}</ul>}
  </AdminPage>;
}
