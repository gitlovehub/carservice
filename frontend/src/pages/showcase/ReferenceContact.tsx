// Trang Liên hệ công khai (không cần đăng nhập). Thông tin gara + giờ làm việc lấy từ Admin;
// form gửi thật tới POST /api/contact-messages (Admin xem ở "Tin nhắn liên hệ").
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import { ApiClientError, fetchApi } from '../../services/api';
import { useGarage } from './HomeSections';

const ico = (size = 24) => ({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });
const I = {
  phone: (s?: number) => <svg {...ico(s)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>,
  mail: (s?: number) => <svg {...ico(s)}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
  calendar: (s?: number) => <svg {...ico(s)}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/></svg>,
  user: (s?: number) => <svg {...ico(s)}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  pen: (s?: number) => <svg {...ico(s)}><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>,
  send: (s?: number) => <svg {...ico(s)}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>,
  pin: (s?: number) => <svg {...ico(s)}><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  clock: (s?: number) => <svg {...ico(s)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  shield: (s?: number) => <svg {...ico(s)}><path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>,
  check: (s?: number) => <svg {...ico(s)} strokeWidth={2.8}><path d="m5 12 4.5 4.5L19 7"/></svg>,
  arrow: (s?: number) => <svg {...ico(s)} strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  map: (s?: number) => <svg {...ico(s)}><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2Z"/><path d="M9 4v14M15 6v14"/></svg>,
  external: (s?: number) => <svg {...ico(s)}><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>,
  headset: (s?: number) => <svg {...ico(s)}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a3 3 0 0 1-3 2h-2"/></svg>,
  eye: (s?: number) => <svg {...ico(s)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
};

/* ------------------------------------------------------------ Giờ làm việc */
type WorkingHour = { day_of_week: number; open_time: string; close_time: string; is_active: number | boolean };
const DAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
/** Gộp các ngày liên tiếp (Thứ Hai → Chủ Nhật) có cùng giờ: "Thứ Hai – Thứ Sáu: 08:00 – 17:00". */
function summarizeHours(rows: WorkingHour[]): string[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const label = (d: number) => { const h = rows.find(r => r.day_of_week === d); return h && Number(h.is_active) ? `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}` : 'Nghỉ'; };
  const groups: { from: number; to: number; text: string }[] = [];
  for (const d of order) {
    const text = label(d); const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = d; else groups.push({ from: d, to: d, text });
  }
  return groups.map(g => `${g.from === g.to ? DAY[g.from] : `${DAY[g.from]} – ${DAY[g.to]}`}: ${g.text}`);
}
function useWorkingHours() {
  const [rows, setRows] = useState<WorkingHour[] | null>(null);
  useEffect(() => { let alive = true; fetchApi<{ data: WorkingHour[] }>('/working-hours').then(r => { if (alive) setRows(r.data); }).catch(() => {}); return () => { alive = false; }; }, []);
  return rows;
}

/* --------------------------------------------------------------------- Form */
type FormState = { name: string; phone: string; email: string; message: string };
const EMPTY: FormState = { name: '', phone: '', email: '', message: '' };
function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; message?: string; field?: string }>({ status: 'idle' });
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ status: 'sending' });
    try {
      const res = await fetchApi<{ message: string }>('/contact-messages', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim() || null }) });
      setForm(EMPTY);
      setState({ status: 'sent', message: res.message });
    } catch (err) {
      const field = err instanceof ApiClientError ? Object.keys(err.data?.errors ?? {})[0] : undefined;
      const message = err instanceof ApiClientError && err.status === 429 ? 'Bạn gửi quá nhanh, vui lòng thử lại sau 1 phút.' : err instanceof Error ? err.message : 'Không gửi được yêu cầu.';
      setState({ status: 'error', message, field });
    }
  };
  const field = (k: keyof FormState, label: ReactNode, icon: ReactNode, input: ReactNode) =>
    <label className={`v3ref-ct-field${state.field === k ? ' has-error' : ''}`}><span className="v3ref-ct-label">{label}</span><span className="v3ref-ct-input">{icon}{input}</span></label>;
  return <form className="v3ref-ct-form" onSubmit={submit} noValidate>
    <div className="v3ref-ct-row">
      {field('name', <>Họ và tên <b>*</b></>, I.user(18), <input value={form.name} onChange={set('name')} placeholder="Nhập họ và tên" autoComplete="name" maxLength={100} required/>)}
      {field('phone', <>Số điện thoại <b>*</b></>, I.phone(18), <input value={form.phone} onChange={set('phone')} placeholder="Nhập số điện thoại" autoComplete="tel" inputMode="tel" maxLength={20} required/>)}
    </div>
    {field('email', <>Email <small>(không bắt buộc)</small></>, I.mail(18), <input type="email" value={form.email} onChange={set('email')} placeholder="Nhập email của bạn" autoComplete="email" maxLength={150}/>)}
    {field('message', <>Nội dung yêu cầu <b>*</b></>, I.pen(18), <textarea value={form.message} onChange={set('message')} placeholder="Cho chúng tôi biết bạn cần hỗ trợ điều gì..." rows={4} maxLength={2000} required/>)}
    {state.status === 'sent' && <p className="v3ref-ct-alert is-success" role="status">{I.check(18)}{state.message}</p>}
    {state.status === 'error' && <p className="v3ref-ct-alert is-error" role="alert">{state.message}</p>}
    <button type="submit" className="v3ref-ct-submit" disabled={state.status === 'sending'}>{I.send(20)}{state.status === 'sending' ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
  </form>;
}

/* --------------------------------------------------------------------- Trang */
export default function ReferenceContact() {
  const garage = useGarage();
  const hours = useWorkingHours();
  const address = garage ? [garage.address_line, garage.ward, garage.district, garage.province].filter(Boolean).join(', ') : '';
  const hasMap = garage?.latitude != null && garage?.longitude != null;
  const lat = Number(garage?.latitude), lng = Number(garage?.longitude), d = 0.006;
  const mapSrc = hasMap ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d / 2}%2C${lng + d}%2C${lat + d / 2}&layer=mapnik&marker=${lat}%2C${lng}` : null;
  const mapsUrl = hasMap ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  return <main className="v3ref v3ref-contact-page">
    <section className="v3ref-ct-hero">
      <div className="v3ref-container">
        <Breadcrumb items={[{ label: 'Liên hệ' }]}/>
        <h1>Liên hệ với <em>CarService</em></h1>
        <p>Cần tư vấn dịch vụ, đặt lịch hoặc hỗ trợ khác? Đội ngũ CarService luôn sẵn sàng lắng nghe và hỗ trợ bạn nhanh nhất.</p>
      </div>
    </section>

    <div className="v3ref-container">
      <div className="v3ref-ct-main">
        <section>
          <div className="v3ref-section-head v3ref-ct-head"><h2>Gửi yêu cầu liên hệ</h2></div>
          <p className="v3ref-ct-lead">Điền thông tin bên dưới, chúng tôi sẽ phản hồi sớm nhất cho bạn.</p>
          <ContactForm/>
        </section>
        <section>
          <div className="v3ref-section-head v3ref-ct-head"><h2>Thông tin gara</h2></div>
          <div className="v3ref-ct-info">
            <ul className="v3ref-ct-info-list">
              <li><span className="v3ref-ct-info-icon">{I.pin(22)}</span><div><h3>Địa chỉ</h3><p>{address || 'Đang cập nhật'}</p></div></li>
              <li><span className="v3ref-ct-info-icon">{I.clock(22)}</span><div><h3>Giờ làm việc</h3>{hours ? summarizeHours(hours).map(l => <p key={l}>{l}</p>) : <p>Đang tải…</p>}</div></li>
              <li><span className="v3ref-ct-info-icon">{I.shield(22)}</span><div><h3>Hỗ trợ</h3><ul className="v3ref-ct-checks">
                {['Tư vấn dịch vụ & báo giá', 'Đặt lịch bảo dưỡng, sửa chữa', 'Giải đáp về bảo hành & phụ tùng'].map(t => <li key={t}>{I.check(16)}{t}</li>)}
              </ul></div></li>
            </ul>
            <div className="v3ref-ct-map">
              {mapSrc ? <iframe title={`Bản đồ vị trí ${garage?.name ?? 'CarService'}`} src={mapSrc} loading="lazy" referrerPolicy="no-referrer"/> : <div className="v3ref-ct-map-empty">{I.map(36)}<span>Chưa có vị trí trên bản đồ</span></div>}
              {mapsUrl && <a className="v3ref-ct-maps-btn" href={mapsUrl} target="_blank" rel="noopener noreferrer">{I.map(18)}Xem trên Google Maps{I.external(15)}</a>}
            </div>
          </div>
        </section>
      </div>

      <ul className="v3ref-ct-band" aria-label="Cam kết của CarService">
        {[
          [I.headset(34), 'Hỗ trợ nhanh chóng', 'Luôn sẵn sàng tư vấn'],
          [I.calendar(34), 'Đặt lịch linh hoạt', 'Chọn thời gian phù hợp'],
          [I.eye(34), 'Thông tin minh bạch', 'Rõ ràng, chính xác'],
          [I.shield(34), 'An tâm khi sử dụng', 'Đồng hành sau dịch vụ'],
        ].map(([icon, title, desc]) => <li key={title as string}><span>{icon}</span><div><strong>{title}</strong><small>{desc}</small></div></li>)}
      </ul>
    </div>
  </main>;
}
