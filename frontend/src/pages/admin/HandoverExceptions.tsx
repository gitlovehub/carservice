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