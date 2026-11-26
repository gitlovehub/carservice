import { useEffect, useMemo, useState, type FocusEventHandler, type PointerEventHandler, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { fetchApi } from '../../services/api';
import { byPopularity, foldVi, type Service } from './serviceDisplay';
import { SERVICE_GUIDES } from './serviceGuides';

const ITEMS_PER_GROUP = 4;

type Props = {
  id: string;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  /** Tài khoản nhân viên không đặt lịch ở web khách nên không hiện lối tắt Đặt lịch. */
  showBooking: boolean;
  onNavigate: () => void;
  onPointerEnter: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
  onBlur: FocusEventHandler<HTMLDivElement>;
};

/** Mega menu của mục Dịch vụ trên desktop: nhóm lấy từ serviceGuides, tên dịch vụ lấy thật từ API khi mở lần đầu. */
export default function ServicesMegaMenu({ id, open, panelRef, showBooking, onNavigate, onPointerEnter, onPointerLeave, onBlur }: Props) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [failed, setFailed] = useState(false);
  const shouldLoad = open && services === null && !failed;

  useEffect(() => {
    if (!shouldLoad) return;
    let alive = true;
    fetchApi<Service[] | { data: Service[] }>('/services')
      .then(r => { if (alive) setServices(Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [shouldLoad]);

  const groups = useMemo(() => SERVICE_GUIDES.map(guide => {
    const inGroup = (services ?? []).filter(s => foldVi(s.category) === foldVi(guide.category)).sort(byPopularity);
    return { guide, total: inGroup.length, top: inGroup.slice(0, ITEMS_PER_GROUP) };
  }), [services]);

  if (!open) return null;
  const loading = services === null && !failed;

  return <div id={id} ref={panelRef} className="v3ref-mega" aria-label="Nhóm dịch vụ" role="region"
    onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onBlur={onBlur}>
    <div className={`v3ref-mega-inner${showBooking ? ' has-cta' : ''}`}>
      {groups.map(({ guide, total, top }) => {
        const href = `/services/${guide.slug}`;
        return <section key={guide.slug} className="v3ref-mega-group">
          <Link to={href} onClick={onNavigate} className="v3ref-mega-head">
            <img src={guide.image} alt="" loading="lazy" decoding="async"/>
            <span><strong>{guide.category}</strong><small>{guide.tagline}</small></span>
          </Link>
          {loading
            ? <div className="v3ref-mega-skeleton" aria-hidden="true"><i/><i/><i/></div>
            : top.length > 0 && <ul>{top.map(s => <li key={s.id}><Link to={href} onClick={onNavigate}>{s.name}</Link></li>)}</ul>}
          <Link to={href} onClick={onNavigate} className="v3ref-mega-more">
            {total > 0 ? `Xem cả ${total} dịch vụ` : 'Xem chi tiết'}<Icon name="arrow-right" size={14}/>
          </Link>
        </section>;
      })}
      {showBooking && <aside className="v3ref-mega-cta">
        <Icon name="wrench" size={22}/>
        <strong>Chưa rõ xe bị gì?</strong>
        <p>Mô tả tình trạng xe, kỹ thuật viên sẽ kiểm tra và báo giá trước khi làm.</p>
        <Link to="/booking" onClick={onNavigate}>Đặt lịch kiểm tra</Link>
      </aside>}
    </div>
    <div className="v3ref-mega-foot">
      <Link to="/services" onClick={onNavigate}>Xem tất cả dịch vụ<Icon name="arrow-right" size={14}/></Link>
    </div>
  </div>;
}
