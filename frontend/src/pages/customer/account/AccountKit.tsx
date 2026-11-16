import type { ReactNode } from "react";
import { IconButton } from "../../../components/ui";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { controlClass } from "../../../components/ui/fieldContext";
import { VehicleBrandLogo } from "../../../components/vehicle/VehicleBrandLogo";
import { TONE_CLASS, type Tone } from "./accountStyles";

/**
 * Bộ khung dùng chung cho các trang trong khu "Hồ sơ của tôi" (CustomerAccountLayout):
 * cùng tiêu đề, thẻ thống kê, thanh lọc, thẻ nội dung và modal — để các trang
 * Lịch hẹn / Lịch sử bảo dưỡng / Báo giá / Hóa đơn / Thanh toán nhìn như một hệ thống.
 * Chỉ dùng token màu cs-* nên tự đúng ở chế độ sáng/tối.
 */

/**
 * Tiêu đề trang dùng chung cho cả 8 trang của menu tài khoản: cỡ chữ, khoảng cách viết thẳng ở đây
 * (không phụ thuộc CSS của trang nào được nạp trước) để mọi trang thẳng hàng như nhau.
 */
export function AccountHeader({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.01em] text-cs-text sm:text-[32px]">{title}</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-cs-muted">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Khung trang: tiêu đề + mô tả + nút hành động bên phải, các khối nội dung cách đều 24px. */
export function AccountPage({ title, description, actions, children, testId }: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="min-w-0 space-y-6 text-cs-text" data-testid={testId}>
      <AccountHeader title={title} description={description} actions={actions}/>
      {children}
    </div>
  );
}

export type StatItem = { icon: IconName; label: string; value: ReactNode; hint?: string; tone?: Tone };

/** Hàng thẻ thống kê (3 hoặc 4 thẻ). */
export function StatCards({ items }: { items: StatItem[] }) {
  return (
    <div className={`grid gap-4 ${items.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-4 rounded-[18px] border border-cs-border bg-cs-surface p-5">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${TONE_CLASS[item.tone ?? "accent"]}`}><Icon name={item.icon} size={22}/></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-cs-muted">{item.label}</p>
            <p className="mt-0.5 truncate text-[24px] font-extrabold leading-tight text-cs-text">{item.value}</p>
            {item.hint && <p className="mt-0.5 truncate text-[12px] text-cs-muted">{item.hint}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Thanh lọc: ô tìm kiếm có icon + các bộ lọc (select) bên phải. */
export function FilterBar({ search, onSearch, placeholder, children, count }: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
  count?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-cs-border bg-cs-surface p-3">
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">{placeholder}</span>
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cs-muted"/>
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className={`${controlClass} pl-9`}/>
      </label>
      {children}
      {count != null && <span className="whitespace-nowrap rounded-full bg-cs-surface-2 px-3 py-1.5 text-[13px] font-semibold text-cs-muted">{count}</span>}
    </div>
  );
}

/** Ô chọn bộ lọc cùng kiểu với ô nhập chuẩn. */
export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${controlClass} cursor-pointer sm:min-w-[190px]`}>{children}</select>
    </label>
  );
}

export type StatusTab<K extends string> = { key: K; label: string; count?: number; attention?: boolean };

/**
 * Tab trạng thái dạng "viên" (thay dropdown lọc trạng thái): khách chỉ cần phân biệt việc cần xử lý / đã xong.
 * `attention` tô cam số đếm của tab cần khách xử lý.
 */
export function StatusTabs<K extends string>({ tabs, value, onChange, label }: { tabs: StatusTab<K>[]; value: K; onChange: (key: K) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex w-full gap-1 overflow-x-auto rounded-full bg-cs-surface-2 p-1 sm:w-auto">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button key={tab.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(tab.key)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-bold transition-colors sm:flex-none ${active ? "bg-cs-surface text-cs-text shadow-sm" : "text-cs-muted hover:text-cs-text"}`}>
            {tab.label}
            {tab.count != null && (
              <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[12px] tabular-nums ${tab.attention && tab.count > 0 ? "bg-warning text-white" : "bg-cs-border/60 text-cs-text-2"}`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Đầu thẻ chung của Báo giá / Hóa đơn / Thanh toán: logo hãng + mã chứng từ + tên xe + dòng phụ + trạng thái.
 */
export function DocumentHeader({ brand, code, tag, title, meta, badge }: {
  brand?: string | null; code: ReactNode; tag?: ReactNode; title: ReactNode; meta: ReactNode; badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={brand ?? undefined} size={48}/>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[13px] font-extrabold tracking-[0.04em] text-cs-accent-text">{code}{tag}</p>
          <h2 className="break-words text-[17px] font-extrabold text-cs-text">{title}</h2>
          <p className="mt-0.5 text-[14px] text-cs-muted">{meta}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

/** Nhãn nhỏ đánh dấu (vd. "Phát sinh"). */
export function Tag({ children, tone = "warning" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-bold tracking-normal ${TONE_CLASS[tone]}`}>{children}</span>;
}

/** Tiêu đề nhỏ của một khối trong modal / trang. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-cs-muted">{children}</p>;
}

/** Danh sách giao dịch thanh toán (phương thức · thời gian · trạng thái · số tiền). */
export function PaymentHistory({ payments, showInvoiceCode }: {
  payments: Array<{ id: number; method: string; time: string; status: string; amount: string; success: boolean; invoiceCode?: string }>;
  showInvoiceCode?: boolean;
}) {
  if (payments.length === 0) return <p className="rounded-xl border border-dashed border-cs-border px-4 py-5 text-center text-[14px] text-cs-muted">Chưa có giao dịch nào.</p>;
  return (
    <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">
      {payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-cs-text">{payment.method}{showInvoiceCode && payment.invoiceCode && <span className="font-mono text-[13px] text-cs-muted"> · {payment.invoiceCode}</span>}</p>
            <p className="text-[13px] text-cs-muted">{payment.time} · {payment.status}</p>
          </div>
          <b className={`tabular-nums ${payment.success ? "text-success-fg" : "text-cs-muted"}`}>{payment.amount}</b>
        </li>
      ))}
    </ul>
  );
}

/** Thanh tiến độ đã trả / tổng tiền (hóa đơn trả nhiều lần). */
export function PaidProgress({ paid, total, label }: { paid: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-cs-surface-2" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span className="block h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${percent}%` }}/>
      </div>
      <p className="text-[12px] text-cs-muted">{label}</p>
    </div>
  );
}

/** Thẻ nội dung chuẩn. */
export function AccountCard({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "section" }) {
  return <Tag className={`min-w-0 rounded-[18px] border border-cs-border bg-cs-surface ${className}`}>{children}</Tag>;
}

/** Ô nhãn/giá trị nhỏ (dùng trong thẻ và modal). */
export function InfoTile({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-cs-surface-2 px-4 py-3">
      <dt className="text-[12px] font-semibold text-cs-muted">{label}</dt>
      <dd className={`mt-0.5 break-words text-[14px] font-bold text-cs-text ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

/** Đầu modal: icon + nhãn nhỏ + tiêu đề + phụ đề + nút đóng. */
export function ModalHead({ icon, eyebrow, title, subtitle, badge, onClose, disabled }: {
  icon: IconName;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-cs-border p-5 sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cs-soft text-cs-accent-text"><Icon name={icon} size={24}/></span>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-cs-muted">{eyebrow}</p>}
        <h3 className="break-words text-[20px] font-extrabold leading-tight text-cs-text">{title}</h3>
        {subtitle && <p className="mt-1 text-[14px] text-cs-muted">{subtitle}</p>}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
      <IconButton icon="x" label="Đóng" onClick={onClose} disabled={disabled}/>
    </div>
  );
}

/** Chân modal: các nút canh phải. */
export function ModalFoot({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 border-t border-cs-border px-5 py-4 sm:px-6">{children}</div>;
}

/** Thông báo lỗi nhỏ trong form/modal. */
export function InlineError({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-cs-accent/40 bg-cs-soft px-4 py-3 text-[14px] font-semibold text-cs-accent-text">{children}</p>;
}

/** Ghi chú cuối trang (hỗ trợ, hotline…). `icon={null}` = chỉ chữ, không icon. */
export function HelpNote({ icon = "info", children }: { icon?: IconName | null; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-cs-border bg-cs-surface p-5 text-[14px] leading-relaxed text-cs-muted">
      {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cs-surface-2 text-cs-muted"><Icon name={icon} size={18}/></span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Bảng hạng mục (hóa đơn / báo giá) với dòng tổng. */
export function LineItemsTable({ items, total, discount, totalLabel = "Tổng cộng" }: {
  items: Array<{ id: number; label: string; kind?: string; quantity: number; unitPrice: string; amount: string }>;
  total: string;
  discount?: string | null;
  totalLabel?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cs-border">
      <table className="w-full min-w-[520px] text-left text-[14px]">
        <thead className="bg-cs-surface-2 text-[12px] font-bold uppercase tracking-[0.06em] text-cs-muted">
          <tr>
            <th className="px-4 py-3">Hạng mục</th>
            <th className="px-4 py-3 text-center">SL</th>
            <th className="px-4 py-3 text-right">Đơn giá</th>
            <th className="px-4 py-3 text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cs-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                {item.kind && <span className="mr-2 rounded-md bg-cs-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-cs-muted">{item.kind}</span>}
                <span className="font-semibold text-cs-text">{item.label}</span>
              </td>
              <td className="px-4 py-3 text-center tabular-nums">{item.quantity}</td>
              <td className="px-4 py-3 text-right tabular-nums text-cs-muted">{item.unitPrice}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums text-cs-text">{item.amount}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-cs-muted">Chưa có chi tiết hạng mục.</td></tr>}
        </tbody>
        <tfoot className="border-t border-cs-border bg-cs-surface-2">
          {discount && <tr><td colSpan={3} className="px-4 py-2.5 text-right text-cs-muted">Giảm trừ</td><td className="px-4 py-2.5 text-right font-semibold text-cs-accent-text">-{discount}</td></tr>}
          <tr><td colSpan={3} className="px-4 py-3 text-right font-bold text-cs-text">{totalLabel}</td><td className="px-4 py-3 text-right text-[16px] font-extrabold tabular-nums text-cs-text">{total}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
