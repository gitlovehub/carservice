import { fmtDateTime } from "../../services/adminApi";

/** Hàm dùng chung cho các trang danh sách khu cố vấn (khoảng ngày, ngày giờ, tên xe). */

export type Range = "any" | "today" | "7d" | "week" | "month";
export const RANGES: Array<{ id: Range; label: string }> = [
  { id: "any", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "7d", label: "7 ngày qua" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dmy = (iso: string) => iso.split("-").reverse().join("/");

export function rangeDates(range: Range): { from?: string; to?: string } {
  if (range === "any") return {};
  const today = new Date();
  const start = new Date(today);
  if (range === "7d") start.setDate(today.getDate() - 6);
  if (range === "week") start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (range === "month") start.setDate(1);
  return { from: isoDay(start), to: isoDay(today) };
}

/** Giờ trước, ngày sau như khu Admin: "17:30 - 16/11/2026". */
export function fullDayTime(value?: string | null) {
  if (!value) return "—";
  return Number.isNaN(new Date(value).valueOf()) ? value : fmtDateTime(value);
}

export const dayTime = fullDayTime;

type VehicleLike = { model?: { name?: string | null; brand?: { name?: string | null } | null } | null } | null | undefined;
export const vehicleName = (vehicle: VehicleLike) => [vehicle?.model?.brand?.name, vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";

export type TrackStep = { label: string; state: "done" | "active" | "todo" | "closed" | "rejected"; note?: string | null };
