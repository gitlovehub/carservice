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