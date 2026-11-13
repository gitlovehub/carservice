import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReferenceBottomStrip } from './ReferenceShell';

const services = [
  ['Thay dầu & lọc dầu','1'], ['Hệ thống phanh','3'], ['Lốp xe','4'], ['Ắc quy','6'], ['Điều hòa ô tô','5'], ['Bảo dưỡng định kỳ','2']
];
const steps = [ ['▤','Tiếp nhận'],['☏','Tư vấn'],['☆','Chọn dịch vụ'],['▣','Báo giá'],['⚒','Lắp đặt'],['♢','Kiểm tra'],['◉','Vệ sinh xe'],['✓','Bàn giao'] ];
const benefits = [['♙','Kỹ thuật viên có kinh nghiệm'],['⚒','Quy trình rõ ràng'],['◇','Giá cả minh bạch'],['♧','Theo dõi trạng thái'],['◷','Đặt lịch trực tuyến']];
const heroSlides = [
 { image:'/showcase/hero-red-suv.webp',title:<>Chăm sóc ô tô<br/>chuyên nghiệp,<br/><em>đúng chuẩn</em></>,subtitle:'Bảo dưỡng · Sửa chữa · Phụ tùng theo tình trạng xe thực tế',button:'Khám phá dịch vụ',to:'/services' },
 { image:'/showcase/hero-white-sedan.webp',title:<>Yên tâm từ lúc<br/>giao xe đến<br/><em>khi nhận xe</em></>,subtitle:'Theo dõi tiến độ, báo giá và xác nhận rõ ràng trên từng phiếu sửa chữa.',button:'Đặt lịch ngay',to:'/booking' },
 { image:'/showcase/hero-premium-suv.webp',title:<>Mỗi chiếc xe<br/>đều được<br/><em>chăm sóc kỹ</em></>,subtitle:'Đặt lịch nhanh chóng và quản lý toàn bộ lịch sử bảo dưỡng của bạn.',button:'Xem xe của tôi',to:'/cars' },
];
export default function ReferenceHome(){
 const [slide,setSlide]=useState(0);const selected=heroSlides[slide];
 return <main className="v3ref v3ref-home">
   <section className="v3ref-hero"><div className="v3ref-hero-art" role="img" aria-label="Xe ô tô trong gara CarService" style={{backgroundImage:`url(${selected.image})`}}/><div className="v3ref-container v3ref-hero-content"><div className="v3ref-hero-copy"><p className="v3ref-mini">CARSERVICE · AUTO CARE</p><h1>{selected.title}</h1><p>{selected.subtitle}</p><Link className="v3ref-hero-button" to={selected.to}>{selected.button} →</Link></div></div>
   <button className="v3ref-hero-prev" onClick={()=>setSlide(x=>(x+2)%3)} aria-label="Slide trước">‹</button><button className="v3ref-hero-next" onClick={()=>setSlide(x=>(x+1)%3)} aria-label="Slide sau">›</button>
   <div className="v3ref-dots">{heroSlides.map((_,i)=><button key={i} onClick={()=>setSlide(i)} className={i===slide?'active':''} aria-label={`Xem slide ${i+1}`}/>)}</div></section>
   <div className="v3ref-container">
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Dịch vụ của chúng tôi</h2><Link to="/services">Xem tất cả dịch vụ →</Link></div><div className="v3ref-service-small-grid">{services.map(([name,img])=>{const keyword = name.includes('dầu') ? 'dầu' : name.includes('phanh') ? 'phanh' : name.includes('Lốp') ? 'lốp' : name.includes('Ắc') ? 'ắc quy' : name.includes('Điều hòa') ? 'điều hòa' : 'bảo dưỡng'; return <Link to={`/services?search=${encodeURIComponent(keyword)}`} className="v3ref-small-service" key={name}><img src={`/showcase/service-${img}.webp`} alt={`Ảnh minh họa dịch vụ ${name}`} loading="lazy" decoding="async"/><strong>{name}</strong></Link>})}</div></section>
     <section className="v3ref-promo"><div><span>CHĂM SÓC XE CHỦ ĐỘNG</span><h2>Chất lượng rõ ràng,<br/>chi phí <i>minh bạch</i></h2><p>Xem báo giá trước khi thực hiện dịch vụ</p><Link to="/booking">Đặt lịch ngay →</Link></div><img src="/showcase/promo-products.webp" alt="Phụ tùng chăm sóc xe minh họa"/></section>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Quy trình đặt lịch đơn giản</h2></div><div className="v3ref-steps">{steps.map(([icon,name],i)=><div className="v3ref-step" key={i}><span className="v3ref-step-icon">{icon}</span><small className="v3ref-step-num">{i+1}</small><strong>{name}</strong></div>)}</div></section>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Vì sao nên chọn CarService?</h2></div><div className="v3ref-benefits">{benefits.map(([symbol,name])=><div key={name}><span>{symbol}</span><strong>{name}</strong></div>)}</div></section>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>An tâm trong từng giai đoạn</h2><Link to="/repair-status">Tra cứu tiến độ →</Link></div><div className="v3ref-trust-grid">{[
      ['01','Rõ tình trạng xe','Biên bản tiếp nhận và hình ảnh giúp hai bên đối chiếu tình trạng xe.'],
      ['02','Rõ chi phí','Chỉ tiến hành sửa chữa các hạng mục được khách phê duyệt.'],
      ['03','Rõ tiến độ','Theo dõi các công việc đã thực hiện và trạng thái phiếu sửa chữa.']
     ].map(([n,t,d])=><div className="v3ref-trust" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></section>
     <section className="v3ref-home-block"><div className="v3ref-section-head"><h2>Đối tác &amp; thương hiệu tham khảo</h2></div><div className="v3ref-brands"><span>MICHELIN</span><span>BRIDGESTONE</span><span>GOODYEAR</span><span>PIRELLI</span><span>BOSCH</span><span>Castrol</span></div><p className="v3ref-smallnote">Tên thương hiệu dùng để minh họa bố cục theo ảnh tham khảo, không hàm ý quan hệ đối tác chính thức.</p></section>
     <ReferenceBottomStrip title="Sẵn sàng chăm sóc chiếc xe của bạn?" subtitle="Chọn dịch vụ phù hợp và đặt lịch tiếp nhận ngay trên CarService."/>
   </div>
 </main>;
}
