import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { fetchApi } from '../../services/api';
import { useServicePicks } from '../../services/servicePicks';
import { ReferenceBanner } from './ReferenceShell';
import ServicePicksBar from './ServicePicksBar';
import { byPopularity, foldVi, money, serviceImage, type Service } from './serviceDisplay';
import { SERVICE_GUIDES, findGuide } from './serviceGuides';

type GuideService = Service & { estimated_minutes?: number | null };

const priceOf = (s: GuideService) => Number(s.base_price ?? s.estimated_price);
const duration = (minutes?: number | null) => !minutes ? null : minutes < 60 ? `~${minutes} phút` : `~${Math.round(minutes / 6) / 10} giờ`.replace('.', ',');

/**
 * Trang chi tiết nhóm dịch vụ (/services/:slug): bài viết ngắn → danh sách dịch vụ con (tick chọn, lưu lại)
 * → thanh "Đặt lịch" mang dịch vụ đã chọn sang trang đặt lịch (bước 2 tick sẵn).
 * Nội dung chữ ở serviceGuides.ts; dịch vụ, giá lấy thật từ API.
 */
export default function ServiceGuidePage() {
  const { slug } = useParams();
  const guide = findGuide(slug);
  const [services, setServices] = useState<GuideService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [picks, setPicks] = useServicePicks();

  useEffect(() => {
    let alive = true;
    fetchApi<GuideService[] | { data: GuideService[] }>('/services')
      .then(r => { if (alive) { setServices(Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []); setError(''); } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Không tải được danh sách dịch vụ.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  const inCategory = useMemo(() => guide
    ? services.filter(s => foldVi(s.category) === foldVi(guide.category)).sort(byPopularity)
    : [], [services, guide]);
  const minPrice = inCategory.map(priceOf).filter(n => Number.isFinite(n) && n > 0);

  const toggleService = (id: number) => setPicks(current => ({
    ...current, ids: current.ids.includes(id) ? current.ids.filter(x => x !== id) : [...current.ids, id],
  }));

  if (!guide) {
    return <main className="v3ref"><div className="v3ref-container py-16 text-center">
      <h1 className="text-2xl font-extrabold text-cs-text">Không tìm thấy nhóm dịch vụ</h1>
      <p className="mt-2 text-cs-muted">Nhóm dịch vụ này không tồn tại hoặc đã đổi tên.</p>
      <Link to="/services" className="mt-5 inline-flex items-center gap-2 font-bold text-cs-accent-text hover:underline">Xem tất cả dịch vụ <Icon name="arrow-right" size={16}/></Link>
    </div></main>;
  }

  const others = SERVICE_GUIDES.filter(g => g.slug !== guide.slug);

  return <main className="v3ref pb-28">
    <ReferenceBanner title={guide.category} subtitle={guide.tagline} image={guide.image} position="right center"
      crumbs={[{ label: 'Dịch vụ', to: '/services' }, { label: guide.category }]}>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {minPrice.length > 0 && <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur">{money(Math.min(...minPrice))}</span>}
        <a href="#guide-services" className="rounded-full bg-[#e11d2e] px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#c81627]">Chọn dịch vụ ↓</a>
      </div>
    </ReferenceBanner>

    <div className="v3ref-container space-y-12 py-10">
      {/* 1. Bài viết */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-labelledby="guide-about">
        <article className="space-y-4">
          <h2 id="guide-about" className="border-l-4 border-[#e11d2e] pl-3 text-2xl font-extrabold text-cs-text">Về {guide.category.toLowerCase()}</h2>
          {guide.intro.map(p => <p key={p} className="text-[16px] leading-relaxed text-cs-text-2">{p}</p>)}
          <p className="flex gap-3 rounded-2xl bg-cs-soft p-4 text-[15px] leading-relaxed text-cs-text"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-cs-accent-text"/>{guide.tip}</p>
        </article>
        <div className="space-y-4">
          {[['clock', 'Khi nào nên làm', guide.when], ['wrench', 'Gara làm gì', guide.includes]].map(([icon, title, items]) => (
            <div key={title as string} className="rounded-2xl border border-cs-border bg-cs-surface p-5">
              <h3 className="flex items-center gap-2 text-[17px] font-extrabold text-cs-text"><Icon name={icon as 'clock'} size={18} className="text-cs-accent-text"/>{title as string}</h3>
              <ul className="mt-3 space-y-2">
                {(items as string[]).map(item => <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed text-cs-text-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-cs-accent-text"/>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Dịch vụ con */}
      <section id="guide-services" aria-labelledby="guide-services-title" className="scroll-mt-24">
        <h2 id="guide-services-title" className="border-l-4 border-[#e11d2e] pl-3 text-2xl font-extrabold text-cs-text">Dịch vụ {guide.category.toLowerCase()}</h2>
        <p className="mt-2 text-cs-muted">Tick các dịch vụ bạn muốn làm — lựa chọn được lưu lại, khi đặt lịch sẽ có sẵn ở bước chọn dịch vụ.</p>
        {loading ? <p className="mt-5 rounded-2xl border border-dashed border-cs-border p-8 text-center text-cs-muted">Đang tải dịch vụ…</p>
          : error ? <p className="mt-5 rounded-2xl border border-cs-border p-6 text-center text-cs-muted">{error} <button type="button" onClick={() => { setLoading(true); setRetry(n => n + 1); }} className="cursor-pointer font-bold text-cs-accent-text underline">Thử lại</button></p>
          : inCategory.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-cs-border p-8 text-center text-cs-muted">Nhóm này chưa có dịch vụ đang mở. <Link to="/booking" className="font-bold text-cs-accent-text">Đặt lịch để cố vấn tư vấn</Link>.</p>
          : <div className="mt-5 grid gap-3 md:grid-cols-2">
            {inCategory.map(service => {
              const on = picks.ids.includes(service.id);
              const time = duration(service.estimated_minutes);
              // Ảnh do Admin tải lên khi thêm / sửa dịch vụ (Admin → Dịch vụ). Chưa có ảnh → ô icon trung tính, không dùng ảnh cứng.
              const image = serviceImage(service);
              // Ô tick đỏ ở góc phải trên của thẻ (không đè lên ảnh); giá nằm dưới tên.
              return <label key={service.id} className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3 pr-12 transition sm:gap-4 sm:p-4 sm:pr-12 ${on ? 'border-[#e11d2e] bg-cs-soft' : 'border-cs-border bg-cs-surface hover:border-[#e11d2e]/60'}`}>
                <input type="checkbox" checked={on} onChange={() => toggleService(service.id)} aria-label={`Chọn ${service.name}`}
                  className="absolute right-4 top-4 size-5 accent-[#e11d2e]"/>
                {image
                  ? <img src={image} alt={service.name} loading="lazy" decoding="async" className="size-20 shrink-0 rounded-xl object-cover sm:size-24"/>
                  : <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-xl bg-cs-surface-2 text-cs-muted sm:size-24"><Icon name="wrench" size={28}/></span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-cs-text">{service.name}</span>
                  <span className="mt-0.5 block font-extrabold text-cs-accent-text">{money(service.base_price ?? service.estimated_price)}</span>
                  {service.description && <span className="mt-1 block text-[14px] leading-relaxed text-cs-muted">{service.description}</span>}
                  {time && <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-cs-muted"><Icon name="clock" size={14}/>{time}</span>}
                </span>
              </label>;
            })}
          </div>}
      </section>

      {/* 3. Nhóm dịch vụ khác */}
      <section aria-labelledby="guide-others">
        <h2 id="guide-others" className="border-l-4 border-[#e11d2e] pl-3 text-xl font-extrabold text-cs-text">Nhóm dịch vụ khác</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {others.map(g => <Link key={g.slug} to={`/services/${g.slug}`} className="flex items-center gap-4 rounded-2xl border border-cs-border bg-cs-surface p-4 no-underline transition hover:border-[#e11d2e]/60">
            <img src={g.image} alt="" aria-hidden="true" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover"/>
            <span className="min-w-0 flex-1"><span className="block font-bold text-cs-text">{g.category}</span><span className="block text-[14px] text-cs-muted">{g.tagline}</span></span>
            <Icon name="arrow-right" size={18} className="text-cs-accent-text"/>
          </Link>)}
          <Link to="/services" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-cs-border p-4 font-bold text-cs-accent-text no-underline sm:col-span-2">Xem tất cả dịch vụ <Icon name="arrow-right" size={16}/></Link>
        </div>
      </section>
    </div>

    {/* Thanh đặt lịch dùng chung với trang Dịch vụ. */}
    <ServicePicksBar picks={picks} services={services} onClear={() => setPicks(() => ({ ids: [], symptom: '' }))}/>
  </main>;
}
