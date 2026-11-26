import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { Icon, type IconName } from "../../components/ui/Icon";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { useAuthSession } from "../../contexts/authSession";
import { advisorDashboardApi, customerUpdatesApi, type AdvisorDashboard as Data, type CustomerUpdate, type DashboardAppointment } from "../../services/workflowService";
import { getUserDisplayName } from "../auth/auth";
import { DonutChart } from "../admin/kit/Charts";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import "./advisorDashboard.css";

/**
 * Tổng quan cố vấn (ADV-10) — theo mockup PO 16/11/2026. Mọi số liệu lấy từ GET /api/advisor/dashboard (số thật):
 * banner chào + lối tắt, 4 chỉ số kèm xu hướng 7 ngày, lịch hẹn hôm nay / sắp tới, phiếu đang mở theo bước (donut),
 * việc cần xử lý, phiếu gần đây.
 */

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayLabel = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${WEEKDAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Đồng hồ chạy theo phút cho banner. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}


/**
 * Xu hướng 7 ngày trong thẻ chỉ số: một chuỗi, đường 2px màu nhạt, hôm nay chấm màu nhấn (có viền nền).
 * Rê chuột từng ngày để xem số (title); giá trị đầy đủ cũng có cho trình đọc màn hình.
 */
function Sparkline({ values, days, label }: { values: number[]; days: string[]; label: string }) {
  const w = 112, h = 44, pad = 5;
  const max = Math.max(1, ...values);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" role="img" aria-label={`${label}: ${values.map((v, i) => `${dayLabel(days[i])} ${v}`).join(", ")}`}>
    <path d={`${path} L${x(last)} ${h - pad} L${x(0)} ${h - pad} Z`} fill="var(--cs-accent)" opacity="0.1"/>
    <path d={path} fill="none" stroke="var(--cs-accent)" strokeOpacity="0.55" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    <circle cx={x(last)} cy={y(values[last])} r="4" fill="var(--cs-accent)" stroke="var(--cs-surface)" strokeWidth="2"/>