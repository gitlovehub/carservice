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