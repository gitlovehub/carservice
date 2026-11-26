import { useState } from "react";
import { Button, DataTable, EmptyState, Pagination, type Column } from "../../components/ui";
import { adminApi, fmtDateTime, type AdminContactMessage, type ContactMessageStatus } from "../../services/adminApi";
import { AdminPage, FilterSelect, Person, Pill, Toolbar } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

type Filter = "all" | ContactMessageStatus;

/** Tin nhắn khách gửi từ form trang Liên hệ (/api/admin/contact-messages). Admin gọi lại khách rồi đánh dấu đã xử lý. */
export default function ContactMessages() {