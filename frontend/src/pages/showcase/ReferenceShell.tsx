import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/** Màn chào khi khách vào web LẦN ĐẦU (nhớ bằng localStorage): logo + tên thương hiệu ~1,6 giây
 * rồi mờ dần. Bấm để bỏ qua. Không hiện khi người dùng bật giảm chuyển động hoặc trình duyệt chặn storage. */
const INTRO_KEY = 'cs-intro-seen';
function FirstVisitIntro() {
  const [phase, setPhase] = useState<'hidden' | 'show' | 'leave'>(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'hidden';
      return localStorage.getItem(INTRO_KEY) ? 'hidden' : 'show';
    } catch { return 'hidden'; }
  });
  // Ghi nhớ "đã xem" trong effect (initializer có thể chạy 2 lần ở StrictMode).
  useEffect(() => { try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* storage bị chặn: bỏ qua */ } }, []);
  useEffect(() => {
    if (phase === 'show') { const t = window.setTimeout(() => setPhase('leave'), 1600); return () => window.clearTimeout(t); }
    if (phase === 'leave') { const t = window.setTimeout(() => setPhase('hidden'), 500); return () => window.clearTimeout(t); }
  }, [phase]);
  if (phase === 'hidden') return null;
  return createPortal(
    <div className={`v3ref-intro${phase === 'leave' ? ' is-leaving' : ''}`} onClick={() => setPhase('leave')} role="presentation">
      <div className="v3ref-intro-mark" aria-hidden="true">C</div>
      <div className="v3ref-intro-text"><strong>CarService</strong><small>Chăm sóc &amp; Bảo dưỡng ô tô</small></div>
      <span className="v3ref-intro-bar" aria-hidden="true"/>
    </div>, document.body);
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

  return <><FirstVisitIntro/><header className="v3ref-header" ref={headerRef}>
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
  </header></>;
}
export function ReferenceFooter(){return <footer className="v3ref-footer"><div className="v3ref-footer-inner">
  <div><Link to="/" className="v3ref-footer-brand"><span>C</span> CarService</Link><p>Hệ thống chăm sóc, bảo dưỡng và sửa chữa ô tô minh bạch, thuận tiện.</p><SocialLinks/></div>
  <div><h4>Dịch vụ</h4><Link to="/services">Bảo dưỡng định kỳ</Link><Link to="/services">Thay dầu &amp; lọc dầu</Link><Link to="/services">Hệ thống phanh</Link><Link to="/services">Điều hòa ô tô</Link></div>
  <div><h4>Hỗ trợ</h4><Link to="/booking">Hướng dẫn đặt lịch</Link><Link to="/repair-status">Tra cứu tiến độ</Link><Link to="/quotation">Báo giá</Link><Link to="/contact">Liên hệ</Link></div>
  <div><h4>Về CarService</h4><Link to="/">Giới thiệu</Link><Link to="/services">Dịch vụ</Link><Link to="/reviews">Đánh giá dịch vụ</Link><Link to="/contact">Hỗ trợ</Link></div>
  <div><h4>Thông tin hỗ trợ</h4><p>Đặt lịch trực tuyến và theo dõi tiến độ xe mọi lúc.</p><Link className="v3ref-footer-cta" to="/booking">Đặt lịch ngay →</Link></div>
</div><div className="v3ref-footer-bottom">© {new Date().getFullYear()} CarService · WD_004</div></footer>}

export function ReferenceBanner({title,subtitle,image='mechanic-banner.webp'}:{title:string;subtitle:string;image?:string}){
  return <div className="v3ref-banner" style={{backgroundImage:`linear-gradient(90deg,rgba(10,14,19,.96) 0%,rgba(10,14,19,.88) 42%,rgba(10,14,19,.15) 100%),url('/showcase/${image}')`}}><div className="v3ref-container"><p className="v3ref-crumb"><Link to="/">⌂ &nbsp; Trang chủ</Link> &nbsp; › &nbsp; {title}</p><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
// Mạng xã hội ở footer. TẠM THỜI trỏ về trang chủ của từng mạng — thay bằng trang chính thức của gara khi có.
// Để trống `href` thì chỉ hiện logo, không bấm được.
// Logo: Simple Icons (CC0).
const SOCIALS:{name:string;color:string;href?:string;path:string}[]=[
 {name:'Facebook',color:'#1877F2',href:'https://www.facebook.com/',path:'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z'},
 {name:'Zalo',color:'#0068FF',href:'https://zalo.me/',path:'M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z'},
 {name:'YouTube',color:'#FF0000',href:'https://www.youtube.com/',path:'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'},
 {name:'TikTok',color:'#000000',href:'https://www.tiktok.com/',path:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'},
];
function SocialLinks(){
 return <ul className="v3ref-social" aria-label="Mạng xã hội">{SOCIALS.map(s=>{
  const icon=<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={s.path}/></svg>;
  return <li key={s.name} style={{['--social' as string]:s.color}}>{s.href
   ?<a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`CarService trên ${s.name}`} title={s.name}>{icon}</a>
   :<span title={s.name} aria-label={s.name} role="img">{icon}</span>}</li>;})}</ul>;
}
export function ReferenceBottomStrip({title='Chăm sóc xe dễ dàng hơn',subtitle='Đặt lịch nhanh chóng, theo dõi minh bạch từ khi tiếp nhận đến bàn giao.'}:{title?:string;subtitle?:string}){return <div className="v3ref-strip"><img className="v3ref-strip-photo" src="/showcase/vehicle-sedan-red.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"/><div><h3>{title}</h3><p>{subtitle}</p></div><Link to="/booking" className="v3ref-primary">+ Đặt lịch ngay →</Link></div>}
