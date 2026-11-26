import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { bookingLinkFor, type ServicePicks } from '../../services/servicePicks';
import type { Service } from './serviceDisplay';

const vnd = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

/**
 * Thanh "Đã chọn N dịch vụ · Đặt lịch" dính đáy màn hình — DÙNG CHUNG cho trang Dịch vụ và trang chi tiết nhóm dịch vụ
 * (cùng một kho lựa chọn: chọn ở trang nào cũng giữ). Đặt lịch → /booking?services=… (bước 2 tick sẵn).
 */
export default function ServicePicksBar({ picks, services, onClear }: { picks: ServicePicks; services: Service[]; onClear: () => void }) {
  if (picks.ids.length === 0) return null;
  const picked = services.filter(s => picks.ids.includes(s.id));
  const total = picked.map(s => Number(s.base_price ?? s.estimated_price)).filter(n => Number.isFinite(n) && n > 0).reduce((a, b) => a + b, 0);
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cs-border bg-cs-surface/95 shadow-[0_-8px_24px_rgb(0_0_0/8%)] backdrop-blur" role="region" aria-label="Dịch vụ đã chọn">
    <div className="v3ref-container flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        {/* Tiêu đề to + giá nổi bật (màu nhấn), tên dịch vụ ở dòng phụ. */}
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-[19px] font-extrabold leading-tight text-cs-text">Đã chọn {picks.ids.length} dịch vụ</span>
          {total > 0
            ? <span className="inline-flex items-baseline gap-1.5"><span className="text-[14px] font-semibold text-cs-muted">Tạm tính từ</span><span className="text-[19px] font-extrabold leading-tight text-cs-accent-text">{vnd(total)}</span></span>
            : <span className="text-[14px] font-semibold text-cs-muted">Cố vấn kiểm tra và báo giá trước khi làm</span>}
        </p>
        {picked.length > 0 && <p className="mt-0.5 truncate text-[13px] text-cs-muted">{picked.map(s => s.name).join(', ')}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onClear} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-cs-muted hover:text-cs-text">Bỏ chọn</button>
        <Link to={bookingLinkFor(picks)} className="inline-flex items-center gap-2 rounded-xl bg-[#e11d2e] px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#c81627]">Đặt lịch <Icon name="arrow-right" size={16}/></Link>
      </div>
    </div>
  </div>;
}
