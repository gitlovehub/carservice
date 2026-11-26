// Trang "Về chúng tôi" (công khai). Nội dung chỉ mô tả những gì hệ thống/gara thực sự làm —
// không ghi năm thành lập, tên nhân sự hay số liệu chưa có trong dữ liệu.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb';
import { ReferenceBottomStrip } from './ReferenceShell';
import { TrustBanner } from './HomeSections';
import { CustomerReviews, ProcessSteps } from './ReferenceHome';

const ico = { viewBox: '0 0 24 24', width: 30, height: 30, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const values: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <svg {...ico}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: 'Minh bạch', text: 'Báo giá chi tiết từng hạng mục trước khi làm. Gara chỉ thực hiện những gì bạn đã duyệt; phát sinh thêm sẽ có báo giá bổ sung.' },
  { icon: <svg {...ico}><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>,
    title: 'Chuyên nghiệp', text: 'Mỗi dịch vụ có các bước kiểm tra chuẩn. Xe được lập biên bản và chụp ảnh tình trạng ngay khi tiếp nhận.' },
  { icon: <svg {...ico}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg>,
    title: 'Tiện lợi', text: 'Đặt lịch, duyệt báo giá, theo dõi tiến độ và thanh toán VNPay ngay trên web — không cần chờ điện thoại.' },
  { icon: <svg {...ico}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>,
    title: 'Tận tâm', text: 'Lắng nghe đánh giá sau mỗi lần dịch vụ và phản hồi từng góp ý để phục vụ bạn tốt hơn.' },
];

const highlights = [
  'Biên bản tiếp nhận kèm hình ảnh tình trạng xe',
  'Báo giá trực tuyến, duyệt từng hạng mục',
  'Theo dõi tiến độ sửa chữa ngay trên web',
  'Lưu lại toàn bộ lịch sử bảo dưỡng của từng xe',
];

export default function ReferenceAbout() {
  return <main className="v3ref v3ref-home v3ref-about-page">
    <section className="v3ref-ab-hero">
      <div className="v3ref-container">
        <Breadcrumb items={[{ label: 'Về chúng tôi' }]}/>
        <h1>Về <em>CarService</em></h1>
        <p>Gara chăm sóc, bảo dưỡng và sửa chữa ô tô — nơi mọi bước từ lúc nhận xe đến khi bàn giao đều rõ ràng, minh bạch và chủ động cho bạn.</p>
      </div>
    </section>

    <div className="v3ref-container">
      {/* Câu chuyện */}
      <section className="v3ref-ab-story">
        <div className="v3ref-ab-story-text">
          <span className="v3ref-ab-eyebrow">Câu chuyện của chúng tôi</span>
          <h2>Chăm sóc xe không nên là điều khiến bạn lo lắng</h2>
          <p>Nhiều chủ xe ngại đến gara vì không biết xe thực sự cần sửa gì, chi phí bao nhiêu và khi nào xong. CarService ra đời để thay đổi điều đó: mọi thông tin về chiếc xe của bạn đều được ghi nhận, báo giá và cập nhật trực tuyến.</p>
          <ul>{highlights.map(h => <li key={h}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>{h}</li>)}</ul>
          <div className="v3ref-ab-actions">
            <Link className="v3ref-ab-btn" to="/booking">Đặt lịch ngay →</Link>
            <Link className="v3ref-ab-btn is-ghost" to="/services">Xem dịch vụ</Link>
          </div>
        </div>
        <div className="v3ref-ab-story-media">
          <img src="/showcase/vehicle-sedan-red.webp" alt="Xe ô tô trong xưởng dịch vụ của CarService" loading="lazy" decoding="async"/>
          <img className="is-small" src="/showcase/service-3.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"/>
        </div>
      </section>

      {/* Giá trị cốt lõi */}
      <section className="v3ref-home-block">
        <div className="v3ref-section-head"><h2>Giá trị cốt lõi</h2></div>
        <div className="v3ref-ab-values">{values.map(v => <article key={v.title} className="v3ref-ab-value">
          <span className="v3ref-ab-value-icon">{v.icon}</span><h3>{v.title}</h3><p>{v.text}</p>
        </article>)}</div>
      </section>

      <TrustBanner/>
      <ProcessSteps title="Quy trình làm việc của chúng tôi"/>
      <CustomerReviews/>
      <ReferenceBottomStrip title="Trải nghiệm dịch vụ tại CarService" subtitle="Đặt lịch trực tuyến để gara chuẩn bị trước — bạn chỉ cần mang xe đến."/>
    </div>
  </main>;
}
