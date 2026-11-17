/** Hàm dùng chung cho các trang danh sách khu cố vấn (khoảng ngày, ngày giờ ngắn, tên xe). */

export type Range = "any" | "today" | "7d" | "week" | "month";
export const RANGES: Array<{ id: Range; label: string }> = [
  { id: "any", label: "Mọi ngày" },
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

/** "16/11 · 08:00". */
export function dayTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  const two = (n: number) => String(n).padStart(2, "0");
  return Number.isNaN(d.valueOf()) ? value : `${two(d.getDate())}/${two(d.getMonth() + 1)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** "16/11/2026 · 17:30". */
export function fullDayTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? value : `${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} · ${dayTime(value).split(" · ")[1]}`;
}

type VehicleLike = { model?: { name?: string; brand?: { name?: string } | null } | null } | null | undefined;
export const vehicleName = (vehicle: VehicleLike) => [vehicle?.model?.brand?.name, vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";

export type TrackStep = { label: string; state: "done" | "active" | "todo" | "closed" | "rejected"; note?: string | null };
