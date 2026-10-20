import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AtelierPublicHeader, AtelierPublicFooter } from "../../components/AtelierPublic";
import { fetchApi } from "../../services/api";

type Service = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  base_price?: number | string | null;
  estimated_price?: number | string | null;
};

function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Liên hệ tư vấn";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(amount)
    : "Liên hệ tư vấn";
}

const primaryButton =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#cf2935] px-7 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-[#a91e29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]";
const outlineButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dad8d6] bg-transparent px-5 py-2.5 text-sm font-bold text-[#252024] transition-colors hover:border-[#cf2935] hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935]";
const eyebrow = "text-xs font-extrabold tracking-[0.19em] uppercase text-[#cf2935]";
const stateBox =
  "rounded-2xl border border-[#e7e3e3] bg-white px-6 py-15 text-center text-sm text-[#767076]";

export default function Services() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    fetchApi<Service[] | { data: Service[] }>("/services")
      .then((res) => {
        if (alive) setItems(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#201c20]">
      <AtelierPublicHeader />
      <main>
        <section className="bg-[radial-gradient(ellipse_at_88%_45%,#71232b88,transparent_53%)] bg-[#1d1114] py-16 text-white sm:py-23">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <span className={`${eyebrow} !text-[#ff9fa5]`}>CARSERVICE</span>
            <h1 className="my-5 text-[clamp(2.5rem,5vw,4.375rem)] leading-[1.08] font-extrabold tracking-tight">
              Chăm sóc đúng cách.
              <br />
              <em className="not-italic text-[#fd646e]">Vận hành an tâm.</em>
            </h1>
            <p className="mb-7 max-w-[600px] text-[15px] leading-[1.85] text-[#c7bfc2]">
              Mỗi chiếc xe có nhu cầu riêng. Khám phá dịch vụ đang được gara cung cấp và chủ động đặt lịch bảo dưỡng.
            </p>
            <Link className={primaryButton} to="/booking">
              Đặt lịch bảo dưỡng <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="mx-auto min-h-[430px] w-full max-w-7xl px-5 pt-10 pb-15 sm:px-8 sm:pt-16 sm:pb-22 lg:px-12" id="services">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className={eyebrow}>DỊCH VỤ CỦA CHÚNG TÔI</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Danh mục chăm sóc ô tô</h2>
            </div>
            <span className="text-xs font-semibold text-[#797278]">Dữ liệu cập nhật từ gara</span>
          </header>

          {loading ? (
            <div role="status" className={stateBox}>Đang tải danh mục dịch vụ…</div>
          ) : error ? (
            <div role="alert" className={stateBox}>
              Không tải được dịch vụ từ máy chủ.{" "}
              <button type="button" className="cursor-pointer font-extrabold text-[#cf2935] underline hover:text-[#a91e29]" onClick={() => setRefresh((v) => v + 1)}>
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className={stateBox}>Hiện chưa có dịch vụ đang hoạt động.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((service, i) => (
                <article className="flex h-full flex-col gap-4 rounded-2xl border border-[#e7e3e3] bg-white p-6 shadow-sm transition-shadow hover:shadow-md" key={service.id}>
                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <span className={eyebrow}>{String(i + 1).padStart(2, "0")} / AUTO CARE</span>
                    <span className="rounded-full bg-[#f6f4f2] px-2.5 py-1.5 text-[11px] font-extrabold text-[#797278]">
                      {service.category || "Dịch vụ"}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">{service.name}</h3>
                  <p className="flex-1 text-sm leading-7 text-[#746d71]">
                    {service.description || "Dịch vụ chăm sóc và bảo dưỡng ô tô tại CarService."}
                  </p>
                  <div className="h-px w-full bg-[#e9e6e4]" />
                  <span className="text-xs font-bold text-[#746d71]">Giá tham khảo</span>
                  <strong className="text-[23px] font-extrabold text-[#252024]">
                    {money(service.base_price ?? service.estimated_price)}
                  </strong>
                  <Link to={`/booking?service=${service.id}`} className={outlineButton}>
                    Đặt lịch <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#26191e] px-5 py-16 text-center text-white sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className={`${eyebrow} !text-[#ff9fa5]`}>READY WHEN YOU ARE</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Một lịch hẹn. An tâm cả hành trình.</h2>
            <p className="mx-auto my-5 max-w-xl text-sm leading-7 text-[#c7bfc2]">
              Lựa chọn dịch vụ, đặt lịch tiếp nhận và theo dõi công việc minh bạch.
            </p>
            <Link to="/booking" className={primaryButton}>Đặt lịch ngay ↗</Link>
          </div>
        </section>
      </main>
      <AtelierPublicFooter />
    </div>
  );
}
