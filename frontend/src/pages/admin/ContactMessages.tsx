import { useState } from "react";
import { Button, DataTable, EmptyState, Pagination, type Column } from "../../components/ui";
import { adminApi, fmtDateTime, type AdminContactMessage, type ContactMessageStatus } from "../../services/adminApi";
import { AdminPage, FilterSelect, Person, Pill, Toolbar } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

type Filter = "all" | ContactMessageStatus;

/** Tin nhắn khách gửi từ form trang Liên hệ (/api/admin/contact-messages). Admin gọi lại khách rồi đánh dấu đã xử lý. */
export default function ContactMessages() {
  const [status, setStatus] = useState<Filter>("NEW");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);
  const query = { status, page };
  const list = useAdminQuery(`contact:${JSON.stringify(query)}`, signal => adminApi.contactMessages(query, signal));
  const result = list.data ?? list.stale;

  const toggle = async (m: AdminContactMessage) => {
    setBusy(m.id);
    try { await adminApi.setContactMessageStatus(m.id, m.status === "NEW" ? "HANDLED" : "NEW"); list.reload(); }
    finally { setBusy(null); }
  };

  const columns: Column<AdminContactMessage>[] = [
    { key: "at", header: "Thời gian", render: m => <span className="whitespace-nowrap tabular-nums text-cs-text-2">{fmtDateTime(m.created_at)}</span> },
    { key: "who", header: "Khách", primary: true, render: m => <Person name={m.name} sub={<>
      <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="tabular-nums">{m.phone}</a>{m.email && <> · <a href={`mailto:${m.email}`}>{m.email}</a></>}
    </>} size={32}/> },
    { key: "message", header: "Nội dung", render: m => <p className="max-w-[460px] whitespace-pre-line text-cs-text">{m.message}</p> },
    { key: "status", header: "Trạng thái", render: m => m.status === "NEW"