import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthSession } from '../../contexts/authSession';
import { useTheme } from '../../contexts/theme';
import { Icon } from '../../components/ui/Icon';
import { logout } from '../auth/auth';
import CustomerNotificationBell from './CustomerNotificationBell';
import '../../styles/v3-reference.css';

const menu = [
  { to:'/', label:'Trang chủ' },
  { to:'/services', label:'Dịch vụ' },
  { to:'/booking', label:'Đặt lịch' },
  { to:'/appointments', label:'Lịch hẹn' },
  { to:'/cars', label:'Xe của tôi' },
  { to:'/repair-status', label:'Tra cứu tiến độ' },
  { to:'/quotation', label:'Báo giá' },
];
// Năm trang mẫu dùng layout full-width. Những trang nghiệp vụ khác giữ nguyên CSS và API,
// nhưng cùng header/footer, không chuyển qua header cũ khi bấm menu.
export const referenceRoutes = new Set(['/', '/services', '/appointments', '/customer/appointments', '/cars', '/customer/cars', '/repair-status']);

function activeMenu(to: string, pathname: string) {
  if (to === '/') return pathname === '/';
  const routeMap: Record<string,string[]> = {
    '/services':['/services'],
    '/booking':['/booking','/customer/booking'],
    '/appointments':['/appointments','/customer/appointments','/customer/appointments/manage'],
    '/cars':['/cars','/customer/cars','/customer/cars/manage'],
    '/repair-status':['/repair-status','/customer/repair-status/manage'],
    '/quotation':['/quotation'],
  };
  return (routeMap[to] || [to]).some(path => pathname === path || pathname.startsWith(`${path}/`));
}

/** Header thống nhất: trạng thái active theo cả URL cũ và URL mới,
 * menu mobile đóng khi chuyển trang/nhấn Escape/ra ngoài, menu tài khoản dễ tìm. */
export function ReferenceHeader() {
  const session = useAuthSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen,setMobileOpen] = useState(false);
  const [accountOpen,setAccountOpen] = useState(false);
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const logged = session.status === 'authenticated';
  const customer = logged && session.account.role === 'CUSTOMER';
  const initial = logged ? (session.account.full_name?.[0] || session.account.email?.[0] || 'K').toUpperCase() : 'K';
  const management = logged && session.account.role === 'ADMIN' ? '/admin' : '/advisor';
  const paths = customer ? menu : logged ? menu.filter(x => ['/', '/services'].includes(x.to)) : menu.filter(x => !['/appointments','/cars','/repair-status','/quotation'].includes(x.to));

  useEffect(() => { setMobileOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    const escape = (e:KeyboardEvent) => { if(e.key==='Escape'){setMobileOpen(false);setAccountOpen(false)} };
    const outside = (e:PointerEvent) => {
      const node = e.target as Node;
      if(headerRef.current && !headerRef.current.contains(node)) setMobileOpen(false);
      if(accountRef.current && !accountRef.current.contains(node)) setAccountOpen(false);
    };
    document.addEventListener('keydown',escape);
    document.addEventListener('pointerdown',outside);
    return () => { document.removeEventListener('keydown',escape); document.removeEventListener('pointerdown',outside) };
  }, []);

  return <header className="v3ref-header" ref={headerRef}>
    <div className="v3ref-nav-wrap">
      <Link to="/" className="v3ref-logo" aria-label="CarService – Về trang chủ"><span>C</span><strong>CarService<small>Chăm sóc &amp; Bảo dưỡng ô tô</small></strong></Link>
      <nav id="v3ref-navigation" className={mobileOpen ? 'v3ref-menu open' : 'v3ref-menu'} aria-label="Điều hướng CarService">
        {paths.map(item => {
          const current = activeMenu(item.to,location.pathname);
          return <Link key={item.to} to={item.to} onClick={()=>setMobileOpen(false)} aria-current={current?'page':undefined} className={current?'active':''}>{item.label}</Link>
        })}
      </nav>
      <div className="v3ref-nav-right">
        <button type="button" className="v3ref-theme-toggle" onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
          title={theme === 'dark' ? 'Bật chế độ sáng' : 'Bật chế độ tối'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18}/>
        </button>
        {customer && <CustomerNotificationBell/>}
        {logged ? customer ? <div className="v3ref-account" ref={accountRef}>
          <button type="button" className="v3ref-account-trigger" aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Mở menu tài khoản" onClick={()=>setAccountOpen(v=>!v)}>
            <span className="v3ref-avatar">{initial}</span><span className="v3ref-account-chevron" aria-hidden="true">⌄</span>
          </button>
          {accountOpen && <div className="v3ref-account-popover" role="menu" aria-label="Menu tài khoản">
            <Link role="menuitem" to="/customer/account" onClick={()=>setAccountOpen(false)}>Hồ sơ cá nhân</Link>
            <Link role="menuitem" to="/customer/service-history" onClick={()=>setAccountOpen(false)}>Lịch sử dịch vụ</Link>
            <Link role="menuitem" to="/invoices" onClick={()=>setAccountOpen(false)}>Hóa đơn</Link>
            <Link role="menuitem" to="/reviews" onClick={()=>setAccountOpen(false)}>Đánh giá dịch vụ</Link>
            <button type="button" role="menuitem" className="v3ref-logout-action" onClick={()=>{setAccountOpen(false);void logout()}}>Đăng xuất</button>
          </div>}
        </div> : <Link to={management} className="v3ref-management-link"><span className="v3ref-avatar">{initial}</span><span>Quản lý</span></Link>
          : <Link to="/login" aria-current={location.pathname === '/login' ? 'page' : undefined} className="v3ref-login">Đăng nhập</Link>}
        <button type="button" className="v3ref-hamburger" onClick={()=>setMobileOpen(v=>!v)} aria-label={mobileOpen?'Đóng menu':'Mở menu'} aria-expanded={mobileOpen} aria-controls="v3ref-navigation">{mobileOpen?'✕':'☰'}</button>
      </div>
    </div>
  </header>;
}
export function ReferenceFooter(){return <footer className="v3ref-footer"><div className="v3ref-footer-inner">
  <div><Link to="/" className="v3ref-footer-brand"><span>C</span> CarService</Link><p>Hệ thống chăm sóc, bảo dưỡng và sửa chữa ô tô minh bạch, thuận tiện.</p><div className="v3ref-social">● &nbsp; ◉ &nbsp; ◈</div></div>
  <div><h4>Dịch vụ</h4><Link to="/services">Bảo dưỡng định kỳ</Link><Link to="/services">Thay dầu &amp; lọc dầu</Link><Link to="/services">Hệ thống phanh</Link><Link to="/services">Điều hòa ô tô</Link></div>
  <div><h4>Hỗ trợ</h4><Link to="/booking">Hướng dẫn đặt lịch</Link><Link to="/repair-status">Tra cứu tiến độ</Link><Link to="/quotation">Báo giá</Link><Link to="/contact">Liên hệ</Link></div>
  <div><h4>Về CarService</h4><Link to="/">Giới thiệu</Link><Link to="/services">Dịch vụ</Link><Link to="/reviews">Đánh giá dịch vụ</Link><Link to="/contact">Hỗ trợ</Link></div>
  <div><h4>Thông tin hỗ trợ</h4><p>Đặt lịch trực tuyến và theo dõi tiến độ xe mọi lúc.</p><Link className="v3ref-footer-cta" to="/booking">Đặt lịch ngay →</Link></div>
</div><div className="v3ref-footer-bottom">© {new Date().getFullYear()} CarService · WD_004</div></footer>}

export function ReferenceBanner({title,subtitle,image='mechanic-banner.webp'}:{title:string;subtitle:string;image?:string}){
  return <div className="v3ref-banner" style={{backgroundImage:`linear-gradient(90deg,rgba(10,14,19,.96) 0%,rgba(10,14,19,.88) 42%,rgba(10,14,19,.15) 100%),url('/showcase/${image}')`}}><div className="v3ref-container"><p className="v3ref-crumb"><Link to="/">⌂ &nbsp; Trang chủ</Link> &nbsp; › &nbsp; {title}</p><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
export function ReferenceBottomStrip({title='Chăm sóc xe dễ dàng hơn',subtitle='Đặt lịch nhanh chóng, theo dõi minh bạch từ khi tiếp nhận đến bàn giao.'}:{title?:string;subtitle?:string}){return <div className="v3ref-strip"><span className="v3ref-strip-art">▤🚘</span><div><h3>{title}</h3><p>{subtitle}</p></div><Link to="/booking" className="v3ref-primary">+ Đặt lịch ngay →</Link></div>}
