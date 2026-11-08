import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../../services/api";

type Service = { id: number; name: string; description?: string | null; category?: string | null; base_price?: number | string | null; estimated_price?: number | string | null };

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Liên hệ tư vấn";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount) : "Liên hệ tư vấn";
}

const ALL = "Tất cả";
const eyebrow = "text-[12px] font-extrabold tracking-[0.17em] text-cs-accent-text uppercase";
const btn = "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]";
const btnPrimary = `${btn} border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm`;
const btnOutline = `${btn} border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]`;
const stateBox = "rounded-2xl border border-[#e9e9e6] bg-white px-6 py-16 text-center text-cs-muted dark:border-[#34373a] dark:bg-[#191b1e] [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:font-extrabold [&_button]:text-[#cf2935] [&_button]:underline";

export default function Services() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false);
    fetchApi<Service[] | { data: Service[] }>("/services")
      .then(res => { if (alive) setItems(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refresh]);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(items.map(s => s.category).filter((c): c is string => !!c)))],
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(s =>
      (category === ALL || s.category === category) &&
      (!q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q))
    );
  }, [items, query, category]);

  return <main className="flex-1">
    <section className="bg-[radial-gradient(ellipse_at_88%_45%,#71232b88,transparent_53%)] bg-[#1d1114] py-16 text-white min-[601px]:py-[94px]">
      <div className="mx-auto max-w-[1250px] px-5 md:px-7">
        <h1 className="my-6 text-[clamp(2.5rem,5vw,4.4rem)] leading-[1.08] font-extrabold tracking-normal">Chăm sóc đúng cách.<br /><em className="not-italic text-[#fd646e]">Vận hành an tâm.</em></h1>
        <p className="mb-7 max-w-[600px] text-[15px] leading-8 text-[#c7bfc2]">Mỗi chiếc xe có nhu cầu riêng. Khám phá dịch vụ đang được gara cung cấp và chủ động đặt lịch bảo dưỡng.</p>
        <Link className={btnPrimary} to="/booking">Đặt lịch bảo dưỡng <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className="mx-auto max-w-[1250px] px-5 pt-14 pb-20 md:px-7" id="services">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><div className={eyebrow}>DỊCH VỤ CỦA CHÚNG TÔI</div><h2 className="my-3 text-3xl font-extrabold tracking-normal">Danh mục chăm sóc ô tô</h2></div>
        <span className="text-xs font-semibold text-cs-muted">{loading ? "Đang cập nhật…" : `${filtered.length}/${items.length} dịch vụ`}</span>
      </div>

      {!loading && !error && items.length > 0 && <div className="mb-7 flex flex-col gap-3.5">
        <label className="flex h-11 max-w-[520px] items-center gap-2.5 rounded-full border border-[#e9e9e6] bg-white px-4 text-cs-muted transition focus-within:border-[#cf2935] focus-within:ring-4 focus-within:ring-[#cf2935]/10 dark:border-[#34373a] dark:bg-[#191b1e]">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm dịch vụ (ví dụ: thay dầu, phanh…)" aria-label="Tìm dịch vụ" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-inherit outline-0 dark:text-[#f5f5f4]" />
        </label>
        {categories.length > 2 && <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo danh mục">
          {categories.map(c => <button key={c} type="button" role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
            className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-bold transition ${category === c ? "border-[#cf2935] bg-[#cf2935] text-white" : "border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]"}`}>{c}</button>)}
        </div>}
      </div>}

      {loading ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Đang tải danh mục dịch vụ">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex min-h-[260px] animate-pulse flex-col gap-4 rounded-2xl border border-[#e9e9e6] bg-white p-6 dark:border-[#34373a] dark:bg-[#191b1e]">
            <div className="h-3 w-1/3 rounded bg-[#f1f1ef] dark:bg-[#22252a]" /><div className="h-5 w-4/5 rounded bg-[#f1f1ef] dark:bg-[#22252a]" /><div className="h-12 rounded bg-[#f1f1ef] dark:bg-[#22252a]" /><div className="mt-auto h-10 rounded-xl bg-[#f1f1ef] dark:bg-[#22252a]" />
          </div>)}
        </div> :
        error ? <div role="alert" className={stateBox}>Không tải được dịch vụ từ máy chủ. <button onClick={() => setRefresh(v => v + 1)}>Thử lại</button></div> :
        items.length === 0 ? <div className={stateBox}>Hiện chưa có dịch vụ đang hoạt động.</div> :
        filtered.length === 0 ? <div className={stateBox}>Không tìm thấy dịch vụ phù hợp. <button onClick={() => { setQuery(""); setCategory(ALL); }}>Xóa bộ lọc</button></div> :
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((service, i) =>
          <article key={service.id} className="flex flex-col items-start gap-4 rounded-2xl border border-[#e9e9e6] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#cf2935] hover:shadow-xl dark:border-[#34373a] dark:bg-[#191b1e]">
            <div className="flex w-full flex-wrap items-center justify-between gap-3"><span className={eyebrow}>DỊCH VỤ {String(i + 1).padStart(2, "0")}</span><span className="rounded-full bg-[#f1f1ef] px-2.5 py-1.5 text-[12px] font-extrabold text-cs-muted dark:bg-[#22252a]">{service.category || "Dịch vụ"}</span></div>
            <h3 className="text-xl font-extrabold">{service.name}</h3>
            <p className="line-clamp-3 min-h-[66px] text-[13px] leading-6 text-cs-muted">{service.description || "Dịch vụ chăm sóc và bảo dưỡng ô tô tại CarService."}</p>
            <div className="h-px w-full bg-[#e9e9e6] dark:bg-[#34373a]" />
            <div className="flex flex-col gap-1"><span className="text-[12px] font-bold tracking-wider text-cs-muted uppercase">Giá tham khảo</span><strong className="text-2xl font-extrabold">{money(service.base_price ?? service.estimated_price)}</strong></div>
            <Link to={`/booking?service=${service.id}`} className={`${btnOutline} mt-auto w-full`}>Đặt lịch <span aria-hidden="true">↗</span></Link>
          </article>)}</div>}
    </section>

    <section className="bg-[#25191b] px-5 py-[75px] text-center text-white">
      <div className="text-[12px] font-extrabold tracking-[0.17em] text-[#ff9ca4] uppercase">SẴN SÀNG KHI BẠN CẦN</div>
      <h2 className="my-4 text-[clamp(1.9rem,4vw,3.1rem)] font-extrabold tracking-normal">Một lịch hẹn. An tâm cả hành trình.</h2>
      <p className="mb-6 text-[#c9adb1]">Lựa chọn dịch vụ, đặt lịch tiếp nhận và theo dõi công việc minh bạch.</p>
      <Link to="/booking" className={btnPrimary}>Đặt lịch ngay ↗</Link>
    </section>
  </main>;
}
