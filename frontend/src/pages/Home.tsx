import { Link } from "react-router-dom";
import { AtelierCar, AtelierPublicFooter, AtelierPublicHeader } from "../components/AtelierPublic";

const highlights = [
  { symbol: "▦", title: "Đặt lịch chủ động", description: "Chọn xe, dịch vụ, khung giờ đến gara." },
  { symbol: "◇", title: "Duyệt trước khi sửa", description: "Kiểm soát toàn bộ hạng mục và chi phí." },
  { symbol: "◷", title: "Theo dõi xuyên suốt", description: "Tra cứu tiến độ và lịch sử chăm sóc xe." },
];

const services = [
  { code: "01", title: "Bảo dưỡng định kỳ", description: "Kiểm tra và bảo dưỡng xe theo từng giai đoạn sử dụng." },
  { code: "02", title: "Phanh và lốp xe", description: "Đánh giá tình trạng phanh, lốp, hỗ trợ vận hành an toàn." },
  { code: "03", title: "Kiểm tra tổng quát", description: "Kiểm tra các hệ thống chính trước khi tư vấn dịch vụ." },
];

export default function Home() {
  return <div className="at-root at-home">
    <AtelierPublicHeader />
    <main>
      <section className="at-hero">
        <div className="at-hero-copy">
          <span className="at-eyebrow">CARSERVICE / AUTOMOTIVE EXPERIENCE</span>
          <h1>Chăm sóc xe.<br /><em>Chuẩn từng chi tiết.</em></h1>
          <p>Từ đặt lịch đến khi nhận xe — mọi công đoạn rõ ràng, mọi chi phí minh bạch, và toàn bộ hành trình chăm sóc xe trong một nơi.</p>
          <div className="at-hero-actions"><Link to="/booking" className="at-btn at-btn-primary at-large">Đặt lịch bảo dưỡng <span aria-hidden="true">↗</span></Link><a href="#services" className="at-btn at-btn-hero-outline at-large">Khám phá dịch vụ</a></div>
          <div className="at-hero-micro"><div><strong>03</strong><span>BƯỚC ĐẶT LỊCH</span></div><div><strong>100%</strong><span>MINH BẠCH CHI PHÍ</span></div><div><strong>24/7</strong><span>TRA CỨU TRẠNG THÁI</span></div></div>
        </div>
        <div className="at-hero-art"><AtelierCar className="at-hero-car" /></div>
      </section>
      <section className="at-feature-band" aria-label="Lợi ích CarService">
        {highlights.map(h => <article key={h.title}><span className="at-feature-icon" aria-hidden="true">{h.symbol}</span><div><h3>{h.title}</h3><p>{h.description}</p></div></article>)}
      </section>
      <section className="at-container at-editorial" id="services"><div className="at-editorial-art"><AtelierCar /></div><div><div className="at-eyebrow">THE EXPERIENCE</div><h2>Gara vận hành tốt.<br />Trải nghiệm cũng phải tốt.</h2><p>CarService xây dựng quy trình rõ ràng từ lịch hẹn đầu tiên đến khi bàn giao. Bạn luôn biết xe đang ở đâu, công việc nào đang được thực hiện và vì sao.</p><div className="at-feature-list"><div><i>✓</i><strong>Đặt lịch không cần gọi điện nhiều lần</strong></div><div><i>✓</i><strong>Biết các hạng mục và chi phí trước khi đồng ý</strong></div><div><i>✓</i><strong>Mỗi lần bảo dưỡng đều có hồ sơ</strong></div></div><Link to="/cars" className="at-btn at-btn-outline">Bắt đầu với xe của bạn <span aria-hidden="true">↗</span></Link></div></section>
      <section className="at-container at-collection"><div className="at-section-title"><div><div className="at-eyebrow">SERVICE COLLECTION</div><h2>Chọn đúng gói cho xe của bạn.</h2></div><Link to="/services" className="at-btn at-btn-outline">Xem tất cả dịch vụ</Link></div><div className="at-grid-three">{services.map(service => <article className="at-service-card" key={service.code}><span className="at-eyebrow">{service.code} / AUTO CARE</span><h3>{service.title}</h3><p>{service.description}</p><div className="at-card-line"/><span className="at-card-label">Tư vấn theo tình trạng xe thực tế</span><Link to="/booking" className="at-btn at-btn-outline">Đặt lịch <span aria-hidden="true">↗</span></Link></article>)}</div></section>
      <section className="at-final-banner"><div className="at-eyebrow">READY WHEN YOU ARE</div><h2>Một lịch hẹn. An tâm cả hành trình.</h2><p>Chủ động đặt lịch, theo dõi quá trình chăm sóc xe và trao đổi với cố vấn dịch vụ.</p><Link to="/booking" className="at-btn at-btn-primary at-large">Đặt lịch ngay <span aria-hidden="true">↗</span></Link></section>
    </main>
    <AtelierPublicFooter />
  </div>;
}
