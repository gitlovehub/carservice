import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

/**
 * Breadcrumb dùng chung cho TOÀN BỘ khu khách hàng — luôn bắt đầu bằng "Trang chủ".
 * tone="dark": trên banner ảnh tối (kính mờ, chữ trắng); tone="light": trên nền sáng của trang.
 * Mục cuối là trang hiện tại (aria-current="page"); các mục có `to` là link.
 */
export default function Breadcrumb({ items, tone = 'dark', className = '' }: { items: Crumb[]; tone?: 'dark' | 'light'; className?: string }) {
  return <nav className={`v3ref-crumb${tone === 'light' ? ' is-light' : ''}${className ? ` ${className}` : ''}`} aria-label="Breadcrumb"><ol>
    <li><Link to="/"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg>Trang chủ</Link></li>
    {items.map((item, i) => <Fragment key={`${item.label}-${i}`}>
      <li aria-hidden="true" className="v3ref-crumb-sep"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg></li>
      <li>{i === items.length - 1 || !item.to
        ? <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
        : <Link to={item.to}>{item.label}</Link>}</li>
    </Fragment>)}
  </ol></nav>;
}
