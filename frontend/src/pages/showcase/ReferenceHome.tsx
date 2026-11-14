import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReferenceBottomStrip } from './ReferenceShell';
import { fetchApi } from '../../services/api';
import { money, type Service } from './serviceDisplay';
import { GarageContact, HomeFaq, MaintenancePackages, SymptomChecker, TrustBanner } from './HomeSections';

// 3 danh mục chủ lực trên trang chủ — `category` phải trùng tên danh mục trong Admin → Danh mục dịch vụ.
// Nội dung ✓ là mô tả công việc + quy trình có thật (báo giá duyệt trước, theo dõi tiến độ).
// Giá "Từ" và nút đặt lịch lấy từ các dịch vụ thuộc đúng danh mục đó.
const featuredGroups = [
  { category:'Bảo dưỡng định kỳ', tagline:'Xe bền, vận hành êm mỗi ngày', image:'1',
    points:['Thay dầu, lọc dầu, lọc gió theo định kỳ','Kiểm tra tổng thể theo số km','Báo giá rõ ràng trước khi làm'] },
  { category:'Gầm - Phanh', tagline:'Lái xe an toàn, tự tin', image:'3',
    points:['Kiểm tra má phanh, đĩa phanh','Kiểm tra dầu phanh và rò rỉ','Chỉ thay khi bạn duyệt báo giá'] },
  { category:'Điện - Điện lạnh', tagline:'Mát sâu, điện ổn định', image:'5',
    points:['Kiểm tra gas và độ lạnh điều hòa','Kiểm tra hệ thống điện trên xe','Theo dõi tiến độ ngay trên web'] },
];
const fold=(s:string|null|undefined)=>(s??'').normalize('NFC').trim().toLowerCase();
function FeaturedServices(){
 const [items,setItems]=useState<Service[]>([]);
 useEffect(()=>{let alive=true;fetchApi<Service[]|{data:Service[]}>('/services').then(r=>{if(alive)setItems(Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[])}).catch(()=>{});return()=>{alive=false}},[]);
 return <div className="v3ref-feature3-grid">{featuredGroups.map(g=>{
   const matches=items.filter(s=>fold(s.category)===fold(g.category));
   const prices=matches.map(s=>Number(s.base_price??s.estimated_price)).filter(n=>Number.isFinite(n)&&n>0);
   // Ưu tiên dịch vụ "Nổi bật", rồi theo thứ tự admin đặt.
   const primary=[...matches].sort((a,b)=>Number(!!b.is_popular)-Number(!!a.is_popular)||(a.sort_order??0)-(b.sort_order??0))[0];
   return <article className="v3ref-feature3-card" key={g.category}>
     <img className="v3ref-feature3-img" src={`/showcase/service-${g.image}.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async"/>
     <h3>{g.category}</h3><p className="v3ref-feature3-tagline">{g.tagline}</p>
     <ul>{g.points.map(p=><li key={p}>{p}</li>)}</ul>
     <div className="v3ref-feature3-meta">{prices.length>0&&<strong>{money(Math.min(...prices))}</strong>}<Link to={`/services?category=${encodeURIComponent(g.category)}`}>Xem chi tiết</Link></div>
     <Link className="v3ref-feature3-book" to={primary?`/booking?service=${primary.id}`:'/booking'}>Đặt lịch ngay <span aria-hidden="true">→</span></Link>
   </article>;})}</div>;
}
// Theo luồng thật: lịch hẹn (PENDING → CONFIRMED → CHECKED_IN) rồi phiếu sửa chữa
// (INSPECTING → QUOTING/WAITING_APPROVAL → IN_PROGRESS/REVIEW_TEST → COMPLETED → HANDED_OVER).
const steps = [
  ['▤','Đặt lịch online'],
  ['☏','Tư vấn'],
  [<svg key="car" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M5.6 6.2A2 2 0 0 1 7.5 5h9a2 2 0 0 1 1.9 1.2L20 10a2 2 0 0 1 1 1.7V16a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-4.3A2 2 0 0 1 4 10l1.6-3.8ZM7.5 7l-1.3 3h11.6l-1.3-3h-9ZM6.5 14.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm11 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/></svg>,'Tiếp nhận xe'],
  [<b key="q" style={{fontWeight:900}}>?</b>,'Kiểm tra xe'],
  [<b key="money" style={{fontWeight:900}}>$</b>,'Báo giá'],
  ['⚒','Sửa chữa'],
  ['✓','Thanh toán & bàn giao'],
];
const heroSlides = [
 { image:'/showcase/hero-red-suv.webp',title:<>Chăm sóc ô tô<br/>chuyên nghiệp,<br/><em>đúng chuẩn</em></>,subtitle:'Bảo dưỡng · Sửa chữa · Phụ tùng theo tình trạng xe thực tế',button:'Khám phá dịch vụ',to:'/services' },
 { image:'/showcase/hero-white-sedan.webp',title:<>Yên tâm từ lúc<br/>giao xe đến<br/><em>khi nhận xe</em></>,subtitle:'Theo dõi tiến độ, báo giá và xác nhận rõ ràng trên từng phiếu sửa chữa.',button:'Đặt lịch ngay',to:'/booking' },
 { image:'/showcase/hero-premium-suv.webp',title:<>Mỗi chiếc xe<br/>đều được<br/><em>chăm sóc kỹ</em></>,subtitle:'Đặt lịch nhanh chóng và quản lý toàn bộ lịch sử bảo dưỡng của bạn.',button:'Xem xe của tôi',to:'/cars' },
];
// Nội dung mẫu — thay bằng dữ liệu từ module Khuyến mãi (PROMO-01) khi có API.
const promoSlides = [
 { tag:'ƯU ĐÃI THÁNG NÀY',title:<>Giảm <i>20%</i> phí<br/>thay dầu &amp; lọc dầu</>,desc:'Áp dụng cho mọi dòng xe khi đặt lịch trực tuyến.',button:'Nhận ưu đãi',to:'/booking',image:'/showcase/service-1.webp' },
 { tag:'MIỄN PHÍ KIỂM TRA',title:<>Kiểm tra <i>phanh &amp; lốp</i><br/>hoàn toàn miễn phí</>,desc:'Kèm báo giá chi tiết trước khi thực hiện bất kỳ hạng mục nào.',button:'Đặt lịch ngay',to:'/booking',image:'/showcase/service-3.webp' },
 { tag:'KHÁCH HÀNG MỚI',title:<>Tặng <i>100.000₫</i> cho<br/>lần bảo dưỡng đầu tiên</>,desc:'Đăng ký tài khoản CarService để nhận ưu đãi.',button:'Xem dịch vụ',to:'/services',image:'/showcase/service-2.webp' },
];
function PromoSlider(){
 const [i,setI]=useState(0);const n=promoSlides.length;const s=promoSlides[i];
 // Tự chuyển slide mỗi 3 giây; bấm chấm/mũi tên sẽ đếm lại từ đầu.
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=window.setTimeout(()=>setI(x=>(x+1)%n),3000);return()=>window.clearTimeout(t);},[i,n]);
 return <section className="v3ref-promo v3ref-promo-slider" aria-roledescription="carousel" aria-label="Chương trình khuyến mãi">
   <div className="v3ref-promo-copy" key={i} aria-live="polite"><span>{s.tag}</span><h2>{s.title}</h2><p>{s.desc}</p><Link to={s.to}>{s.button} →</Link></div>
   <img key={s.image} src={s.image} alt="" aria-hidden="true"/>
   <button className="v3ref-promo-prev" onClick={()=>setI(x=>(x+n-1)%n)} aria-label="Ưu đãi trước">‹</button><button className="v3ref-promo-next" onClick={()=>setI(x=>(x+1)%n)} aria-label="Ưu đãi sau">›</button>
   <div className="v3ref-promo-dots">{promoSlides.map((_,k)=><button key={k} onClick={()=>setI(k)} className={k===i?'active':''} aria-label={`Xem ưu đãi ${k+1}`} aria-current={k===i}/>)}</div>
 </section>;
}
// Thương hiệu chạy marquee. Logo SVG lưu trong public/brands/ (nguồn: Wikimedia Commons; Shell: Simple Icons).
// `showName`: logo chỉ là biểu tượng, không có chữ → hiện thêm tên. Không có `logo` → chỉ hiện tên.
const brands: { name:string; logo?:string; showName?:boolean }[] = [
  { name:'Castrol', logo:'/brands/castrol.svg' }, { name:'Motul', logo:'/brands/motul.svg' },
  { name:'Mobil 1', logo:'/brands/mobil.svg' }, { name:'Shell', logo:'/brands/shell.svg', showName:true },
  { name:'Liqui Moly', logo:'/brands/liquimoly.svg' }, { name:'Bosch', logo:'/brands/bosch.svg' },
  { name:'Denso', logo:'/brands/denso.svg' }, { name:'Brembo', logo:'/brands/brembo.svg' },
  { name:'Michelin', logo:'/brands/michelin.svg' }, { name:'Bridgestone', logo:'/brands/bridgestone.svg' },
  { name:'NGK', logo:'/brands/ngk.svg' }, { name:'KYB', logo:'/brands/kyb.svg' },
];
function BrandMarquee(){
 // Danh sách nhân đôi để vòng chạy liền mạch (animation dịch -50%); bản sao ẩn với trình đọc màn hình.
 const row=(copy:boolean)=><ul className="v3ref-marquee-row" aria-hidden={copy||undefined}>{brands.map(b=><li key={b.name} className="v3ref-marquee-item" title={b.name}>
   {b.logo&&<img src={b.logo} alt={b.showName?'':b.name} loading="lazy" decoding="async"/>}{(!b.logo||b.showName)&&<span>{b.name}</span>}</li>)}</ul>;
 return <div className="v3ref-marquee" aria-label="Thương hiệu phụ tùng và dầu nhớt"><div className="v3ref-marquee-track">{row(false)}{row(true)}</div></div>;
}
type PublicReview = { id:number; customer:string; vehicle:string|null; services:string[]; rating:number; comment:string; reply:string|null; date:string|null };
type PublicReviewResponse = { data:PublicReview[]; summary:{ average:number; count:number } };
/** Sao có hỗ trợ số lẻ (4,5 sao): lớp sao vàng phủ theo % lên lớp sao xám. */
const Stars=({value,small}:{value:number;small?:boolean})=><span className={`v3ref-rv-stars${small?' is-sm':''}`} role="img" aria-label={`${value} trên 5 sao`}>★★★★★<span style={{width:`${Math.max(0,Math.min(5,value))/5*100}%`}} aria-hidden="true">★★★★★</span></span>;
/** Tiêu đề ngắn cho thẻ, suy ra từ nội dung nhận xét (hệ thống đánh giá không có trường tiêu đề). */
function reviewTitle(r:PublicReview){
 const t=r.comment.toLowerCase();
 if(/quay lại|lần sau|giới thiệu/.test(t))return 'Sẽ quay lại!';
 if(/chuyên nghiệp|nhiệt tình|sạch sẽ|chu đáo|tận tình/.test(t))return 'Rất chuyên nghiệp!';
 if(/nhanh|đúng hẹn|đúng giờ/.test(t))return 'Nhanh chóng!';
 return r.rating>=5?'Rất hài lòng!':'Hài lòng!';
}
const ico={width:15,height:15,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
/** Icon cho chip dịch vụ theo từ khóa. */
function serviceIcon(name:string){
 const t=name.toLowerCase();
 if(/lốp|cân bằng|chụm|gầm/.test(t))return <svg {...ico}><path d="M5 17h14v-5l-2-5H7l-2 5Z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg>;
 if(/phanh|kiểm tra|bảo dưỡng định kỳ/.test(t))return <svg {...ico}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/><path d="M9 12l2 2 4-4"/></svg>;
 if(/động cơ|lọc gió|máy/.test(t))return <svg {...ico}><path d="M4 10h3l2-2h5l2 2h2v3h2v3h-2v2h-4l-2 2H8v-4H4Z"/></svg>;
 return <svg {...ico}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5Z"/></svg>;
}
/** Số thẻ hiển thị cùng lúc theo độ rộng màn hình. */
function usePerView(){
 const get=()=>typeof window==='undefined'?3:window.innerWidth>=1000?3:window.innerWidth>=650?2:1;
 const [n,setN]=useState(get);
 useEffect(()=>{const on=()=>setN(get());window.addEventListener('resize',on);return()=>window.removeEventListener('resize',on)},[]);
 return n;
}
/** Đánh giá thật của khách (API công khai /reviews/featured: ≥4 sao, không bị ẩn, tên đã rút gọn). */
function CustomerReviews(){
 const [res,setRes]=useState<PublicReviewResponse|null>(null);
 const perView=usePerView();const [page,setPage]=useState(0);
 useEffect(()=>{let alive=true;fetchApi<PublicReviewResponse>('/reviews/featured').then(r=>{if(alive)setRes(r)}).catch(()=>{});return()=>{alive=false}},[]);
 const touchX=useRef<number|null>(null);
 const list=res?.data??[];const pages=Math.max(1,Math.ceil(list.length/perView));const cur=Math.min(page,pages-1);
 // Chưa có đánh giá nào thì ẩn hẳn section, không hiển thị nội dung giả.
 if(!res||list.length===0)return null;
 const go=(d:number)=>setPage((cur+d+pages)%pages);
 // Vuốt trên điện thoại: kéo sang trái → trang sau, sang phải → trang trước.
 const onTouchEnd=(x:number)=>{if(touchX.current==null)return;const dx=x-touchX.current;touchX.current=null;if(Math.abs(dx)>40)go(dx<0?1:-1)};
 return <section className="v3ref-home-block" aria-roledescription="carousel" aria-label="Đánh giá từ khách hàng">
   <div className="v3ref-rv-head">
     <div>
       <span className="v3ref-rv-eyebrow"><svg {...ico} width={17} height={17}><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth={3}/></svg>Đánh giá từ khách hàng</span>
       <h2>Khách hàng nói gì về <em>CarService</em></h2>
       <p>Những trải nghiệm thực tế từ khách hàng đã sử dụng dịch vụ tại gara.</p>
     </div>
     <div className="v3ref-rv-score">
       <div className="v3ref-rv-score-avg"><strong>{res.summary.average.toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1})}<span>/5</span></strong><Stars value={res.summary.average}/></div>
       <span className="v3ref-rv-score-sep" aria-hidden="true"/>
       <div className="v3ref-rv-score-count"><svg {...ico} width={40} height={40} strokeWidth={2.2}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/><path d="M9 12l2 2 4-4"/></svg><span><strong>{res.summary.count.toLocaleString('vi-VN')}{res.summary.count>=10?'+':''}</strong><small>đánh giá xác thực</small></span></div>
     </div>
   </div>
   {/* Toàn bộ thẻ nằm trên 1 hàng; dịch cả hàng theo trang để có hiệu ứng trượt trái ↔ phải. */}
   <div className="v3ref-rv-viewport" onTouchStart={e=>{touchX.current=e.touches[0].clientX}} onTouchEnd={e=>onTouchEnd(e.changedTouches[0].clientX)}>
   <div className="v3ref-rv-track" style={{['--rv-per' as string]:perView,['--rv-page' as string]:cur}} aria-live="polite">{list.map((r,idx)=><figure key={r.id} className="v3ref-rv-card" aria-hidden={Math.floor(idx/perView)!==cur||undefined}>
     <div className="v3ref-rv-card-top"><span className="v3ref-rv-quote" aria-hidden="true">“</span><Stars value={r.rating} small/></div>
     <p className="v3ref-rv-title">{reviewTitle(r)}</p>
     <blockquote>{r.comment}</blockquote>
     {r.services.length>0&&<ul className="v3ref-rv-chips">{r.services.map(s=><li key={s}>{serviceIcon(s)}{s}</li>)}</ul>}
     <figcaption>
       <span className="v3ref-rv-avatar" aria-hidden="true">{r.customer.trim().split(/\s+/).pop()?.charAt(0).toUpperCase()}</span>
       <span className="v3ref-rv-who"><strong>{r.customer}</strong>{r.vehicle&&<small>{r.vehicle}</small>}</span>
       {r.date&&<span className="v3ref-rv-date"><svg {...ico}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>{new Date(r.date).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>}
     </figcaption>
   </figure>)}</div></div>
   {pages>1&&<div className="v3ref-rv-nav">
     <button type="button" className="v3ref-rv-arrow" onClick={()=>go(-1)} aria-label="Đánh giá trước">‹</button>
     <div className="v3ref-rv-dots">{Array.from({length:pages},(_,k)=><button key={k} type="button" className={k===cur?'active':''} onClick={()=>setPage(k)} aria-label={`Trang đánh giá ${k+1}`} aria-current={k===cur}/>)}</div>
     <button type="button" className="v3ref-rv-arrow" onClick={()=>go(1)} aria-label="Đánh giá sau">›</button>
   </div>}
 </section>;
}
export default function ReferenceHome(){
 const [slide,setSlide]=useState(0);const selected=heroSlides[slide];
 // Banner đầu trang tự chuyển mỗi 5 giây; bấm mũi tên/chấm thì đếm lại từ đầu (effect chạy lại theo `slide`).
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=window.setTimeout(()=>setSlide(x=>(x+1)%heroSlides.length),5000);return()=>window.clearTimeout(t);},[slide]);
 return <main className="v3ref v3ref-home">
   <section className="v3ref-hero"><div className="v3ref-hero-art" role="img" aria-label="Xe ô tô trong gara CarService" style={{backgroundImage:`url(${selected.image})`}}/><div className="v3ref-container v3ref-hero-content"><div className="v3ref-hero-copy"><h1>{selected.title}</h1><p>{selected.subtitle}</p><Link className="v3ref-hero-button" to={selected.to}>{selected.button} →</Link></div></div>
   <button className="v3ref-hero-prev" onClick={()=>setSlide(x=>(x+2)%3)} aria-label="Slide trước">‹</button><button className="v3ref-hero-next" onClick={()=>setSlide(x=>(x+1)%3)} aria-label="Slide sau">›</button>
   <div className="v3ref-dots">{heroSlides.map((_,i)=><button key={i} onClick={()=>setSlide(i)} className={i===slide?'active':''} aria-label={`Xem slide ${i+1}`}/>)}</div></section>
   <div className="v3ref-container">
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Dịch vụ của chúng tôi</h2><Link to="/services">Xem tất cả dịch vụ →</Link></div><FeaturedServices/></section>
     <MaintenancePackages/>
     <PromoSlider/>
     <SymptomChecker/>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Quy trình đặt lịch đơn giản</h2></div><div className="v3ref-steps">{steps.map(([icon,name],i)=><div className="v3ref-step" key={i}><span className="v3ref-step-icon">{icon}</span><small className="v3ref-step-num">{i+1}</small><strong>{name}</strong></div>)}</div></section>
     <TrustBanner/>
     <CustomerReviews/>
     <HomeFaq/>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Đối tác &amp; thương hiệu</h2></div><BrandMarquee/></section>
     <GarageContact/>
     <ReferenceBottomStrip title="Sẵn sàng chăm sóc chiếc xe của bạn?" subtitle="Chọn dịch vụ phù hợp và đặt lịch tiếp nhận ngay trên CarService."/>
   </div>
 </main>;
}
