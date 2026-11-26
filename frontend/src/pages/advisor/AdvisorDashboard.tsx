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
    {values.map((v, i) => <rect key={i} x={x(i) - 8} y="0" width="16" height={h} fill="transparent"><title>{`${dayLabel(days[i])}: ${v}`}</title></rect>)}
  </svg>;
}

function Delta({ value, previous }: { value: number; previous: number }) {
  if (previous === 0 && value === 0) return <span className="adv-delta" data-dir="flat">=</span>;
  if (previous === 0) return <span className="adv-delta" data-dir="up"><Icon name="trend-up" size={12}/>+{value}</span>;
  const pct = Math.round(((value - previous) / previous) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return <span className="adv-delta" data-dir={dir}>{dir === "up" ? <Icon name="trend-up" size={12}/> : dir === "down" ? <Icon name="trend-down" size={12}/> : null}{pct > 0 ? "+" : ""}{pct}%</span>;
}

function Kpi({ to, icon, label, value, extra, caption, series, days, seriesLabel }: {
  to: string; icon: IconName; label: string; value: number; extra?: ReactNode; caption: string; series: number[]; days: string[]; seriesLabel: string;
}) {
  return <Link to={to} className="adv-card adv-kpi">
    <div className="flex items-center gap-3">
      <span className="adv-kpi-icon" aria-hidden="true"><Icon name={icon} size={22}/></span>
      <p className="min-w-0 flex-1 text-small font-semibold text-cs-text">{label}</p>
    </div>
    <div className="flex items-end justify-between gap-3">
      <p className="flex flex-wrap items-center gap-2"><span className="adv-kpi-value">{value.toLocaleString("vi-VN")}</span>{extra}</p>
      <Sparkline values={series} days={days} label={seriesLabel}/>
    </div>
    <p className="text-caption text-cs-muted">{caption}</p>
  </Link>;
}

function Panel({ title, icon, action, children, className = "" }: { title: ReactNode; icon?: IconName; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`adv-card min-w-0 overflow-hidden ${className}`}>
    <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
      <h2 className="flex items-center gap-2 text-subheading font-semibold text-cs-text">{icon && <Icon name={icon} size={18} className="text-cs-accent-text"/>}{title}</h2>
      {action}
    </header>
    {children}
  </section>;
}

const seeAll = (to: string) => <Link to={to} className="inline-flex items-center gap-1 text-caption font-semibold text-cs-text-2 hover:text-cs-accent-text">Xem tất cả<Icon name="arrow-right" size={14}/></Link>;

type AppointmentTab = "yesterday" | "today" | "upcoming";
const appointmentTabs = [
  { id: "yesterday", label: "Hôm qua", key: "appointments_yesterday", empty: "Hôm qua không có lịch hẹn" },
  { id: "today", label: "Hôm nay", key: "appointments_today", empty: "Hôm nay chưa có lịch hẹn" },
  { id: "upcoming", label: "Sắp tới", key: "appointments_upcoming", empty: "Chưa có lịch trong 7 ngày tới" },
] as const satisfies ReadonlyArray<{ id: AppointmentTab; label: string; key: keyof Data; empty: string }>;

function AppointmentRows({ items, tab }: { items: DashboardAppointment[]; tab: AppointmentTab }) {
  const navigate = useNavigate();
  const showDate = tab === "upcoming";
  if (!items.length) return <EmptyState compact icon="calendar" title={appointmentTabs.find(t => t.id === tab)!.empty} description="Lịch khách đặt và lịch đặt hộ sẽ hiện ở đây."/>;
  const open = (a: DashboardAppointment) => navigate(`/advisor/reception?appointment=${a.id}`);
  return <ul className="adv-timeline space-y-0.5 px-2 pb-3">
    {items.map(a => <li key={a.id} className="adv-timeline-row" role="link" tabIndex={0} onClick={() => open(a)}
      onKeyDown={(e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(a); } }}>