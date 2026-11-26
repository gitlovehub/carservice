import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Drawer, IconButton, PageHeader, RatingStars, Switch } from "../../../components/ui";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { initials, num, toneSoft, type Tone } from "./format";

/**
 * Bộ khung giao diện dùng chung cho khu Admin (theo bản thiết kế đã duyệt):
 * trang, thẻ số liệu, panel, tab, bộ lọc, avatar, thanh tiến độ, ngăn chi tiết.
 * Màu lấy từ token (styles/tokens.css) — không viết mã hex trong trang.
 */

const toneTint: Record<Tone, string> = {
  brand: "bg-[var(--cs-tint-brand)]",
  info: "bg-[var(--cs-tint-info)]",
  success: "bg-[var(--cs-tint-success)]",
  warning: "bg-[var(--cs-tint-warning)]",
  danger: "bg-[var(--cs-tint-brand)]",
  violet: "bg-[var(--cs-tint-violet)]",
  neutral: "bg-cs-surface",
};
const toneBar: Record<Tone, string> = {
  brand: "bg-cs-accent",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  violet: "bg-[var(--cs-violet)]",
  neutral: "bg-neutral",
};

/* ---------- Trang ---------- */
export function AdminPage({ title, description, actions, demo = false, children }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode;
  /** Trang đang chạy dữ liệu mẫu (chưa nối API). */
  demo?: boolean; children: ReactNode;
}) {
  // Khung + tiêu đề chung với mọi trang Admin (page-container, PageHeader) để lề và khoảng cách đều nhau.
  return <main className="page-container">
    <PageHeader title={demo ? <span className="inline-flex flex-wrap items-center gap-2.5">{title}<DemoTag/></span> : title}
      description={description} actions={actions}/>
    {children}
  </main>;
}

export function DemoTag() {
  return <span title="Trang đang hiển thị dữ liệu mẫu, sẽ thay bằng dữ liệu thật khi có API."
    className="inline-flex items-center gap-1 rounded-full border border-dashed border-cs-border-strong px-2 py-0.5 text-[11px] font-medium text-cs-muted">
    <Icon name="info" size={12}/>Dữ liệu demo
  </span>;
}

/* ---------- Thẻ số liệu ---------- */
export function StatCard({ icon, label, value, delta, deltaLabel = "so với kỳ trước", tone = "brand", invertDelta = false }: {
  icon: IconName; label: string; value: ReactNode; delta?: number; deltaLabel?: string; tone?: Tone;
  /** Tăng là xấu (ví dụ: hàng hết, hoá đơn nợ). */
  invertDelta?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  const good = invertDelta ? !up : up;
  return <div className={`relative flex items-start gap-4 overflow-hidden rounded-card border border-cs-border p-5 shadow-card ${toneTint[tone]}`}>
    <span className={`grid size-12 shrink-0 place-items-center rounded-full ${toneSoft[tone]}`} aria-hidden="true"><Icon name={icon} size={22}/></span>
    <div className="min-w-0">
      <p className="text-small text-cs-text-2">{label}</p>
      <p className="mt-1 text-[1.6rem] font-bold leading-tight tracking-tight text-cs-text tabular-nums">{value}</p>
      {delta !== undefined && <p className="mt-1.5 flex flex-wrap items-center gap-1 text-caption text-cs-muted">
        <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? "text-success-fg" : "text-danger-fg"}`}>
          <Icon name={up ? "trend-up" : "trend-down"} size={14}/>{up ? "+" : ""}{num(delta)}%
        </span>
        {deltaLabel}
      </p>}
    </div>
  </div>;
}

/* ---------- Panel ---------- */
export function Panel({ title, icon, action, children, className = "", bodyClassName = "", subtitle }: {
  title?: ReactNode; icon?: IconName; action?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return <section className={`flex min-w-0 flex-col rounded-card border border-cs-border bg-cs-surface shadow-card ${className}`}>
    {title && <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-subheading text-cs-text">
          {icon && <Icon name={icon} size={20} className="shrink-0 text-cs-accent-text"/>}{title}
        </h2>
        {subtitle && <p className="mt-1 text-caption text-cs-muted">{subtitle}</p>}
      </div>
      {action}
    </header>}
    <div className={`min-w-0 flex-1 p-5 ${bodyClassName}`}>{children}</div>
  </section>;
}

/** Liên kết điều hướng chữ + mũi tên phải: cùng cỡ/font, hover gạch chân (`.cs-link-arrow`). Truyền `to` để chuyển trang hoặc `onClick` để đổi tab. */
export function PanelLink({ to, onClick, children }: { to?: string; onClick?: () => void; children: ReactNode }) {
  const content = <>{children}<Icon name="arrow-right" size={14}/></>;
  return to
    ? <Link to={to} className="cs-link-arrow">{content}</Link>
    : <button type="button" className="cs-link-arrow" onClick={onClick}>{content}</button>;
}

/* ---------- Tab ---------- */
export type TabItem<T extends string> = { id: T; label: string; icon?: IconName; count?: number; tone?: Tone };

/** Tab gạch chân (mặc định), dạng nút phân đoạn ("segment") hoặc chip đếm theo trạng thái ("chips"). */
export function Tabs<T extends string>({ items, value, onChange, variant = "underline", label }: {
  items: TabItem<T>[]; value: T; onChange: (id: T) => void; variant?: "underline" | "segment" | "chips"; label: string;
}) {
  if (variant === "chips") return <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
    {items.map(item => {
      const active = item.id === value;
      return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id)}
        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-small font-medium transition-colors ${active
          ? "border-cs-accent bg-cs-accent text-cs-accent-contrast hover:border-cs-accent-hover hover:bg-cs-accent-hover"
          : "border-cs-border bg-cs-surface text-cs-text-2 hover:border-transparent hover:bg-cs-soft-hover hover:text-cs-on-soft"}`}>
        {item.icon && <Icon name={item.icon} size={15}/>}
        {item.label}
        {item.count !== undefined && <span className={`rounded-full px-1.5 py-px text-caption font-semibold tabular-nums ${active ? "bg-white/20" : toneSoft[item.tone ?? "neutral"]}`}>{num(item.count)}</span>}
      </button>;
    })}
  </div>;
  if (variant === "segment") return <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-control bg-cs-surface-2 p-1">
    {items.map(item => {
      const active = item.id === value;
      return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id)}
        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[9px] px-4 text-small font-medium transition-colors ${active
          ? "bg-cs-surface text-cs-accent-text shadow-card hover:bg-cs-soft" : "text-cs-text-2 hover:bg-cs-soft-hover hover:text-cs-on-soft"}`}>
        {item.icon && <Icon name={item.icon} size={16}/>}{item.label}
        {item.count !== undefined && <span className="text-caption text-cs-muted">({item.count})</span>}
      </button>;
    })}
  </div>;
  return <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-cs-border">
    {items.map(item => {
      const active = item.id === value;
      return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onChange(item.id)}
        className={`-mb-px inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 text-small font-medium transition-colors ${active
          ? "border-cs-accent text-cs-accent-text" : "border-transparent text-cs-text-2 hover:text-cs-text"}`}>
        {item.icon && <Icon name={item.icon} size={16}/>}{item.label}
        {item.count !== undefined && <span className="text-caption">({item.count})</span>}
      </button>;