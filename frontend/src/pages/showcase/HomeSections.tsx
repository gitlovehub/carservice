// Các section bổ sung cho trang chủ (ReferenceHome). Dữ liệu lấy từ API công khai;
// section nào không có dữ liệu thì ẩn hẳn, không hiển thị nội dung giả.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { money } from './serviceDisplay';

function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    fetchApi<T>(path).then(r => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  return data;
}

type GarageSettings = { name: string; phone: string | null; email: string | null; address_line: string | null; ward: string | null; district: string | null; province: string | null; latitude: number | null; longitude: number | null };
const useGarage = () => useApi<{ data: GarageSettings | null }>('/garage-settings')?.data ?? null;

const Section = ({ id, title, action, children }: { id?: string; title: string; action?: ReactNode; children: ReactNode }) =>
  <section className="v3ref-home-block" id={id}><div className="v3ref-section-head"><h2>{title}</h2>{action}</div>{children}</section>;

/* ------------------------------------------------------- Gói bảo dưỡng theo km */
type Pkg = { id: number; name: string; description: string | null; mileage_milestone: number | null; month_milestone: number | null; price: number | null; services: { id: number; name: string }[] };
export function MaintenancePackages() {
  const res = useApi<Pkg[] | { data: Pkg[] }>('/maintenance-packages');
  const list = (Array.isArray(res) ? res : res?.data ?? []).slice().sort((a, b) => (a.mileage_milestone ?? 0) - (b.mileage_milestone ?? 0) || (a.price ?? 0) - (b.price ?? 0)).slice(0, 4);
  if (list.length === 0) return null;
  const featured = list.length > 2 ? list[1].id : null; // gói thứ 2 thường là gói khách chọn nhiều nhất
  return <Section title="Gói bảo dưỡng theo mốc km" action={<Link to="/booking">Đặt lịch bảo dưỡng →</Link>}>
    <div className="v3ref-pkg-grid">{list.map(p => <article key={p.id} className={`v3ref-pkg${p.id === featured ? ' is-featured' : ''}`}>
      {p.id === featured && <span className="v3ref-pkg-flag">Phổ biến</span>}
      <div className="v3ref-pkg-km">{p.mileage_milestone ? <><strong>{p.mileage_milestone.toLocaleString('vi-VN')}</strong> km</> : <strong>Định kỳ</strong>}</div>
      {p.month_milestone ? <small className="v3ref-pkg-month">hoặc {p.month_milestone} tháng</small> : null}
      <h3>{p.name}</h3>
      <ul>{p.services.slice(0, 4).map(s => <li key={s.id}>{s.name}</li>)}{p.services.length > 4 && <li className="v3ref-pkg-more">+{p.services.length - 4} hạng mục khác</li>}</ul>
      <div className="v3ref-pkg-price">{money(p.price)}</div>
      <Link className="v3ref-pkg-book" to={`/booking?package=${p.id}`}>Đặt gói này</Link>
    </article>)}</div>
  </Section>;
}

/* ------------------------------------------------------- Dấu hiệu xe cần kiểm tra */
const symptoms = [
  { icon: '◎', title: 'Phanh kêu rít', text: 'Phanh có tiếng kêu rít, bàn đạp phanh mềm hoặc phải đạp sâu.' },
  { icon: '❄', title: 'Điều hòa kém mát', text: 'Điều hòa thổi gió nóng, kém mát hoặc có mùi hôi.' },
  { icon: '⚠', title: 'Đèn báo lỗi sáng', text: 'Đèn báo động cơ hoặc đèn cảnh báo trên táp-lô sáng.' },
  { icon: '≋', title: 'Xe rung, lệch lái', text: 'Xe rung vô-lăng, lệch lái hoặc có tiếng kêu từ gầm khi chạy.' },
  { icon: '⚡', title: 'Khó nổ máy', text: 'Xe khó nổ máy, đề yếu hoặc ắc quy nhanh hết điện.' },
  { icon: '⛽', title: 'Hao xăng bất thường', text: 'Xe hao nhiên liệu hơn bình thường, máy yếu, khói lạ.' },
];
export function SymptomChecker() {
  return <Section title="Xe bạn có dấu hiệu này?" action={<Link to="/booking">Đặt lịch kiểm tra →</Link>}>
    <p className="v3ref-section-lead">Kỹ thuật viên sẽ kiểm tra, chẩn đoán và gửi báo giá để bạn duyệt trước khi sửa.</p>
    <div className="v3ref-symptom-grid">{symptoms.map(s =>
      <Link key={s.title} className="v3ref-symptom" to={`/booking?symptom=${encodeURIComponent(s.text)}`}>
        <span className="v3ref-symptom-icon" aria-hidden="true">{s.icon}</span>
        <strong>{s.title}</strong>
        <small>Đặt lịch kiểm tra →</small>
      </Link>)}</div>
  </Section>;
}

/* ------------------------------------------------------------ Banner chỉ số */
// "Năm kinh nghiệm" và "Tháng bảo hành" do gara tự công bố (chưa có trong dữ liệu) — sửa ở FIXED_METRICS.
// "Lượt xe đã phục vụ" và "Loại phụ tùng" đếm thật từ API /home-stats.
const FIXED_METRICS = { years: '10+', warrantyMonths: '12' };
type Stats = { completed_orders: number; parts_count: number };
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    let frame = 0; const start = performance.now(); const dur = 1200;
    const tick = (t: number) => { const k = Math.min(1, (t - start) / dur); setShown(Math.round(value * (1 - Math.pow(1 - k, 3)))); if (k < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toLocaleString('vi-VN')}</>;
}
const IconProps = { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const metricIcons = {
  car: <svg {...IconProps}><path d="M9 22l4-9a4 4 0 0 1 3.6-2.4h14.8A4 4 0 0 1 35 13l4 9"/><rect x="5" y="22" width="38" height="12" rx="3"/><path d="M10 34v4M38 34v4"/><circle cx="13" cy="28" r="2" fill="currentColor"/><circle cx="35" cy="28" r="2" fill="currentColor"/></svg>,
  medal: <svg {...IconProps}><path d="M24 4l4 3 5-1 2 5 5 2-1 5 3 4-3 4 1 5-5 2-2 5-5-1-4 3-4-3-5 1-2-5-5-2 1-5-3-4 3-4-1-5 5-2 2-5 5 1Z"/><circle cx="24" cy="22" r="9"/><path d="M20 22l3 3 5-6M16 38l-3 8 5-2 3 4 3-7M32 38l3 8-5-2-3 4-3-7"/></svg>,
  // Can dầu nhớt: thân can có quai xách, nắp, nhãn và giọt dầu.
  parts: <svg {...IconProps}>
    <rect x="13" y="4" width="8" height="5" rx="1.5"/>
    <path d="M11 9h12l3 5h9a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z"/>
    <path d="M28 14v-3a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6"/>
    <path d="M14 22h18v13H14Z"/>
    <path d="M23 25.5c-2 2.7-3 4.3-3 5.5a3 3 0 0 0 6 0c0-1.2-1-2.8-3-5.5Z" fill="currentColor" stroke="none"/>
  </svg>,
  shield: <svg {...IconProps}><path d="M24 4l16 6v12c0 11-7 19-16 22C15 41 8 33 8 22V10Z"/><path d="M17 24l5 5 9-10"/></svg>,
};
export function TrustBanner() {
  const stats = useApi<{ data: Stats }>('/home-stats')?.data;
  const metrics: { icon: ReactNode; value: ReactNode; label: string; desc: string }[] = [
    ...(stats && stats.completed_orders > 0 ? [{ icon: metricIcons.car, value: <CountUp value={stats.completed_orders}/>, label: 'Lượt xe đã phục vụ', desc: 'Quy mô hoạt động của gara' }] : []),
    { icon: metricIcons.medal, value: FIXED_METRICS.years, label: 'Năm kinh nghiệm', desc: 'Uy tín và chuyên môn' },
    ...(stats && stats.parts_count > 0 ? [{ icon: metricIcons.parts, value: <CountUp value={stats.parts_count}/>, label: 'Loại phụ tùng cung cấp', desc: 'Khả năng đáp ứng nhu cầu' }] : []),
    { icon: metricIcons.shield, value: FIXED_METRICS.warrantyMonths, label: 'Tháng bảo hành', desc: 'Cam kết chất lượng sau sửa chữa' },
  ];
  return <section className="v3ref-trustband" aria-label="CarService qua các con số">
    <img className="v3ref-trustband-car" src="/showcase/hero-red-suv.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"/>
    <svg className="v3ref-trustband-swoosh" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 20C260 60 520 78 760 70s330-30 440-50v60H0Z" fill="#ffffff10"/><path d="M0 48c300 30 640 34 1200-6" stroke="#ff4a5c66" strokeWidth="2" fill="none"/></svg>
    <ul style={{ ['--tb-cols' as string]: metrics.length }}>{metrics.map(m => <li key={m.label}>
      <span className="v3ref-trustband-icon">{m.icon}</span>
      <strong className="v3ref-trustband-value">{m.value}</strong>
      <span className="v3ref-trustband-label">{m.label}</span>
      <small className="v3ref-trustband-desc">{m.desc}</small>
    </li>)}</ul>
    <Link className="v3ref-trustband-cta" to="/booking">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01" strokeWidth="2.6"/></svg>
      Đặt lịch ngay<span aria-hidden="true">›</span></Link>
  </section>;
}

/* ------------------------------------------------------------------- FAQ */
const faqs: [string, ReactNode][] = [
  ['Đặt lịch online có mất phí không?', 'Không. Đặt lịch trên CarService hoàn toàn miễn phí. Bạn chỉ thanh toán cho những hạng mục đã duyệt trong báo giá.'],
  ['Gara có tự ý sửa thêm hạng mục khi chưa hỏi tôi không?', 'Không. Kỹ thuật viên kiểm tra xe, lập báo giá và chỉ thực hiện các hạng mục bạn đã duyệt. Nếu trong lúc sửa phát hiện vấn đề mới, gara sẽ gửi báo giá bổ sung để bạn duyệt tiếp.'],
  ['Tôi theo dõi tiến độ sửa xe bằng cách nào?', <>Vào mục <Link to="/repair-status">Tra cứu tiến độ</Link> để xem xe đang ở bước nào: tiếp nhận, kiểm tra, chờ duyệt báo giá, đang sửa hay đã sẵn sàng bàn giao.</>],
  ['Sửa xe mất bao lâu?', 'Thời gian dự kiến được hiển thị theo từng dịch vụ khi đặt lịch và trong báo giá. Thời gian thực tế phụ thuộc tình trạng xe và phụ tùng thay thế.'],
  ['Tôi có thể thanh toán bằng hình thức nào?', 'Bạn có thể thanh toán tại gara khi nhận xe hoặc thanh toán trực tuyến qua VNPay ngay trên hóa đơn.'],
  ['Tôi không biết xe bị gì thì nên chọn dịch vụ nào?', <>Bạn chỉ cần mô tả triệu chứng khi <Link to="/booking">đặt lịch</Link>. Kỹ thuật viên sẽ kiểm tra, chẩn đoán và tư vấn hạng mục cần làm trước khi báo giá.</>],
];
export function HomeFaq() {
  return <Section title="Câu hỏi thường gặp">
    <div className="v3ref-faq">{faqs.map(([q, a], i) => <details key={q} open={i === 0}>
      <summary>{q}</summary><div className="v3ref-faq-answer">{a}</div>
    </details>)}</div>
  </Section>;
}

/* ------------------------------------------------------ Thông tin gara + bản đồ */
type WorkingHour = { day_of_week: number; open_time: string; close_time: string; is_active: number | boolean };
const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const hhmm = (t: string) => t.slice(0, 5);
export function GarageContact() {
  const garage = useGarage();
  const hoursRes = useApi<{ data: WorkingHour[] }>('/working-hours');
  if (!garage) return null;
  const address = [garage.address_line, garage.ward, garage.district, garage.province].filter(Boolean).join(', ');
  const hasMap = garage.latitude != null && garage.longitude != null;
  const lat = Number(garage.latitude), lng = Number(garage.longitude);
  const d = 0.006;
  const mapSrc = hasMap ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d / 2}%2C${lng + d}%2C${lat + d / 2}&layer=mapnik&marker=${lat}%2C${lng}` : null;
  const directions = hasMap ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  // Hiển thị Thứ 2 → Chủ nhật.
  const hours = [1, 2, 3, 4, 5, 6, 0].map(day => ({ day, h: hoursRes?.data.find(x => x.day_of_week === day) }));
  const today = new Date().getDay();
  return <Section id="lien-he" title="Ghé thăm CarService">
    <div className="v3ref-contact">
      <div className="v3ref-contact-info">
        <h3>Địa chỉ tại:</h3>
        {address && <p><span aria-hidden="true">⌖</span>{address}</p>}
        {garage.phone && <p><span aria-hidden="true">☏</span><a href={`tel:${garage.phone.replace(/[^\d+]/g, '')}`}>{garage.phone}</a></p>}
        {garage.email && <p><span aria-hidden="true">✉</span><a href={`mailto:${garage.email}`}>{garage.email}</a></p>}
        {hoursRes && <table className="v3ref-hours"><caption>Giờ mở cửa</caption><tbody>{hours.map(({ day, h }) =>
          <tr key={day} className={day === today ? 'is-today' : undefined}><th scope="row">{DAY_NAMES[day]}</th>
            <td>{h && Number(h.is_active) ? `${hhmm(h.open_time)} – ${hhmm(h.close_time)}` : 'Nghỉ'}</td></tr>)}</tbody></table>}
        <div className="v3ref-contact-actions">
          <a className="v3ref-contact-primary" href={directions} target="_blank" rel="noopener noreferrer">Chỉ đường →</a>
          <Link className="v3ref-contact-ghost" to="/booking">Đặt lịch</Link>
        </div>
      </div>
      {mapSrc && <iframe className="v3ref-contact-map" title={`Bản đồ vị trí ${garage.name}`} src={mapSrc} loading="lazy" referrerPolicy="no-referrer"/>}
    </div>
  </Section>;
}
