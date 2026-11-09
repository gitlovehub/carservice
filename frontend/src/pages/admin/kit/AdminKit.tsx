import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Drawer, IconButton, PageHeader } from "../../../components/ui";
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
          ? "border-cs-accent bg-cs-accent text-cs-accent-contrast"
          : "border-cs-border bg-cs-surface text-cs-text-2 hover:bg-cs-hover"}`}>
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
          ? "bg-cs-surface text-cs-accent-text shadow-card" : "text-cs-text-2 hover:text-cs-text"}`}>
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
    })}
  </div>;
}

/* ---------- Bộ lọc ---------- */
export function FilterSelect<T extends string>({ label, value, onChange, options, className = "" }: {
  label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }>; className?: string;
}) {
  const current = options.find(option => option.value === value) ?? options[0];
  // Lựa chọn đầu tiên là mặc định ("Tất cả"); chọn khác → bộ lọc đang áp dụng, tô màu nhấn.
  const active = options.length > 0 && value !== options[0].value;
  return <div data-ui="filter" data-active={active || undefined}
    className={`relative inline-flex min-h-10 min-w-0 max-w-full shrink-0 items-center gap-2 rounded-control border px-3 text-small transition-colors focus-within:border-cs-accent focus-within:ring-2 focus-within:ring-cs-accent/20 max-sm:min-h-11 ${active
      ? "border-cs-accent/50 bg-cs-soft text-cs-accent-text"
      : "border-cs-border bg-cs-surface text-cs-text hover:border-cs-border-strong hover:bg-cs-hover"} ${className}`}>
    <Icon name="filter" size={14} className={`shrink-0 ${active ? "" : "text-cs-muted"}`}/>
    <span className={`shrink-0 ${active ? "" : "text-cs-muted"}`}>{label}</span>
    <span className="min-w-0 truncate font-semibold">{current?.label}</span>
    <Icon name="chevron-down" size={15} className="ml-auto shrink-0 opacity-70"/>
    {/* Select gốc phủ trong suốt: giữ bàn phím, trình đọc màn hình và danh sách chọn của hệ điều hành. */}
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value as T)}
      className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3 [&>[data-ui=search]]:sm:max-w-sm [&>[data-ui=search]]:flex-1">{children}</div>;
}

/* ---------- Hiển thị nhỏ ---------- */
const avatarTones: Tone[] = ["brand", "info", "success", "warning", "violet"];
export function Avatar({ name, size = 36, tone }: { name: string; size?: number; tone?: Tone }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const t = tone ?? avatarTones[hash % avatarTones.length];
  return <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    className={`grid shrink-0 place-items-center rounded-full font-semibold ${toneSoft[t]}`}>{initials(name)}</span>;
}

export function Person({ name, sub, size = 36 }: { name: string; sub?: ReactNode; size?: number }) {
  return <span className="flex min-w-0 items-center gap-3">
    <Avatar name={name} size={size}/>
    <span className="min-w-0">
      <span className="block truncate font-semibold text-cs-text">{name}</span>
      {sub && <span className="block truncate text-caption text-cs-muted">{sub}</span>}
    </span>
  </span>;
}

export function Pill({ tone = "neutral", children, icon }: { tone?: Tone; children: ReactNode; icon?: IconName }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold ${toneSoft[tone]}`}>
    {icon && <Icon name={icon} size={13}/>}{children}
  </span>;
}

export function Progress({ value, tone, label }: { value: number; tone?: Tone; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const t = tone ?? (pct < 35 ? "danger" : pct < 60 ? "warning" : "success");
  return <span className="block h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-cs-surface-2" role="progressbar"
    aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <span className={`block h-full rounded-full ${toneBar[t]}`} style={{ width: `${pct}%` }}/>
  </span>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-cs-accent" : "bg-cs-border-strong"}`}>
    <span className={`inline-block size-5 rounded-full bg-[var(--cs-on-solid)] shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}/>
  </button>;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${value} trên 5 sao`}>
    {[1, 2, 3, 4, 5].map(i => <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={i <= Math.round(value) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>
    </svg>)}
  </span>;
}

/** Danh sách nhãn – giá trị trong ngăn chi tiết. */
export function InfoList({ items }: { items: Array<{ icon?: IconName; label?: string; value: ReactNode }> }) {
  return <dl className="flex flex-col gap-2 text-small">
    {items.map((item, i) => <div key={i} className="flex items-start gap-2.5">
      {item.icon && <Icon name={item.icon} size={16} className="mt-0.5 shrink-0 text-cs-muted"/>}
      {item.label && <dt className="w-28 shrink-0 text-cs-muted">{item.label}</dt>}
      <dd className="min-w-0 flex-1 text-cs-text">{item.value}</dd>
    </div>)}
  </dl>;
}

export function PaneSection({ title, icon, action, children }: { title: ReactNode; icon?: IconName; action?: ReactNode; children: ReactNode }) {
  return <section className="border-t border-cs-border py-4 first:border-t-0 first:pt-0">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-small font-semibold text-cs-text">{icon && <Icon name={icon} size={17} className="text-cs-muted"/>}{title}</h3>
      {action}
    </div>
    {children}
  </section>;
}

/* ---------- Ngăn chi tiết ---------- */
function useWide(query = "(min-width: 1280px)") {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return wide;
}

/**
 * Bố cục danh sách + ngăn chi tiết: màn hình rộng (≥ 1280px) ngăn chi tiết nằm cạnh danh sách,
 * màn hình hẹp hơn mở thành Drawer.
 */
export function SplitView({ list, pane, paneOpen, onClose, paneTitle, paneFooter, paneWidth = 360 }: {
  list: ReactNode; pane: ReactNode; paneOpen: boolean; onClose: () => void; paneTitle: ReactNode; paneFooter?: ReactNode; paneWidth?: number;
}) {
  const wide = useWide();
  if (!wide) return <>
    {list}
    <Drawer open={paneOpen} onClose={onClose} title={paneTitle} footer={paneFooter}>{pane}</Drawer>
  </>;
  return <div className="grid items-start gap-5" style={{ gridTemplateColumns: paneOpen ? `minmax(0,1fr) ${paneWidth}px` : "minmax(0,1fr)" }}>
    <div className="min-w-0">{list}</div>
    {paneOpen && <aside className="sticky top-[84px] flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden rounded-card border border-cs-border bg-cs-surface shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-cs-border px-5 py-4">
        <h2 className="min-w-0 text-section text-cs-text">{paneTitle}</h2>
        <IconButton icon="close" label="Đóng ngăn chi tiết" size="sm" onClick={onClose} className="-mr-1.5"/>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{pane}</div>
      {paneFooter && <footer className="cs-btn-row border-t border-cs-border px-5 py-3.5 [&>*]:flex-1">{paneFooter}</footer>}
    </aside>}
  </div>;
}
