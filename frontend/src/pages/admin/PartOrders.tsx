import { useFieldErrors } from "../../components/ui/useFieldErrors";
import { useMemo, useState } from "react";
import { Button, DataTable, DateInput, EmptyState, Field, Input, SearchInput, type Column } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, fmtDateTime, type AdminPartRequest } from "../../services/adminApi";
import { ClearFilters, FilterSelect, Pill, SplitView, Toolbar } from "./kit/AdminKit";
import { num, type Tone } from "./kit/format";

/**
 * Phụ tùng & kho → "Cần đặt hàng" (ADV-01 / D-020).
 * Cố vấn báo thiếu phụ tùng cho phiếu; kho (Admin) gom theo phụ tùng, đặt hàng (ngày dự kiến về),
 * và "Đã về" = nhập kho QUA yêu cầu (một lần). Hàng đã nhập bằng phiếu nhập thường → "Đã có trong kho" (không cộng lần nữa).
 */

type Stage = "REQUESTED" | "OVERDUE" | "ORDERED";
type Group = {
  partId: number; name: string; sku: string | null; unit: string | null; stock: number;
  needed: number; requests: AdminPartRequest[]; stage: Stage; eta: string | null;
};
type Filter = "all" | Stage;

const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";
const isOverdue = (r: AdminPartRequest) => r.status === "ORDERED" && !!r.eta_date && r.eta_date < today();
const STAGE: Record<Stage, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Cần đặt", tone: "warning" },
  OVERDUE: { label: "Quá hạn", tone: "danger" },
  ORDERED: { label: "Đã đặt", tone: "info" },
};

function groupByPart(rows: AdminPartRequest[]): Group[] {
  const groups = new Map<number, Group>();