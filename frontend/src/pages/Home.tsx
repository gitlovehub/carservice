
import { Link } from "react-router-dom";
import {
  AtelierPublicFooter,
  AtelierPublicHeader,
} from "../components/AtelierPublic";

import garageHero from "../assets/hero.png";
import serviceMaintenance from "../assets/hero.png";
import serviceBrakes from "../assets/hero.png";
import serviceInspection from "../assets/hero.png";

const services = [
  {
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra, thay thế vật tư theo khuyến nghị và tình trạng sử dụng của xe.",
    image: serviceMaintenance,
    href: "/booking?service=std-maintenance",
  },
  {
    title: "Phanh và lốp xe",
    description:
      "Kiểm tra độ mòn, khả năng phanh và độ an toàn khi vận hành.",
    image: serviceBrakes,
    href: "/booking?service=brake-check",
  },
  {
    title: "Kiểm tra tổng quát",
    description:
      "Đánh giá các hệ thống quan trọng và tư vấn hạng mục cần xử lý.",
    image: serviceInspection,
    href: "/booking",
  },
];

const benefits = [
  {
    number: "01",
    title: "Đặt lịch thuận tiện",
    description:
      "Chọn dịch vụ, thời gian và gửi yêu cầu trực tuyến.",
  },
  {
    number: "02",
    title: "Tư vấn rõ ràng",
    description:
      "Nắm được hạng mục cần kiểm tra trước khi sửa chữa.",
  },
  {
    number: "03",
    title: "Minh bạch chi phí",
    description:
      "Báo giá trước khi tiến hành công việc phát sinh.",
  },
  {
    number: "04",
    title: "Dễ dàng theo dõi",
    description:
      "Tra cứu tiến độ và thông tin lịch hẹn trong tài khoản.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fafafa] text-[#192028] dark:bg-[#111214] dark:text-[#f5f5f4]">
      <AtelierPublicHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative isolate overflow-hidden bg-[#f4f5f6] dark:bg-[#111416]">
          {/* Realistic car image */}
          <div className="absolute inset-y-0 right-0 hidden w-[65%] lg:block">
            <img
              src={garageHero}
              alt="Xe sedan tại khu vực bảo dưỡng ô tô"
              className="h-full w-full object-cover object-center"
              fetchPriority="high"
            />
          </div>

          {/* Light / Dark overlay */}
          <div
            className="pointer-events-none absolute inset-0 hidden
            bg-[linear-gradient(90deg,#f9fafb_0%,#f9fafb_29%,rgba(249,250,251,.97)_38%,rgba(249,250,251,.75)_48%,rgba(249,250,251,.1)_65%,transparent_84%)]
            lg:block
            dark:bg-[linear-gradient(90deg,#111416_0%,#111416_28%,rgba(17,20,22,.97)_39%,rgba(17,20,22,.82)_49%,rgba(17,20,22,.22)_70%,rgba(17,20,22,.08)_100%)]"
          />

          <div className="relative mx-auto grid max-w-[1360px] lg:min-h-[575px] lg:grid-cols-[minmax(0,1fr)_minmax(0,.65fr)]">
            {/* Content */}
            <div className="relative z-10 px-5 pb-9 pt-14 sm:px-9 sm:pt-20 lg:px-12 lg:py-24">
              <p className="mb-5 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#cf2935] dark:text-[#ff7680]">
                CarService / Chăm sóc ô tô
              </p>

              <h1 className="max-w-[680px] text-[clamp(2.75rem,5vw,4.6rem)] font-extrabold leading-[1.08] tracking-[-.065em]">
                Chăm sóc xe
                <br />
                <span className="text-[#cf2935] dark:text-[#ff6371]">
                  Chuẩn từng chi tiết
                </span>
              </h1>

              <p className="mt-6 max-w-[515px] text-sm leading-7 text-[#586371] sm:text-base dark:text-[#c2c7cd]">
                Đặt lịch bảo dưỡng dễ dàng, nhận tư vấn rõ
                ràng và theo dõi tiến độ chăm sóc xe tại
                một nơi.
              </p>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/booking"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#cf2935] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#ad1e29]"
                >
                  Đặt lịch bảo dưỡng
                  <span aria-hidden="true">↗</span>
                </Link>

                <a
                  href="#services"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dce0e4] bg-white/90 px-6 py-3 text-sm font-bold text-[#1c2630] transition-colors hover:border-[#cf2935] dark:border-[#51545a] dark:bg-[#202327] dark:text-white"
                >
                  Khám phá dịch vụ
                </a>
              </div>

              {/* Service highlights */}
              <div className="mt-10 grid max-w-[540px] grid-cols-3 divide-x divide-[#e1e3e6] rounded-xl border border-[#e9eaec] bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:divide-[#4c5056] dark:border-[#41444b] dark:bg-[#202327]/95 sm:p-5">
                <div className="pr-2">
                  <strong className="block text-xl font-extrabold">
                    03
                  </strong>
                  <span className="mt-1 block text-[9px] font-bold uppercase leading-4 tracking-wide text-[#687382] dark:text-[#acb4c0]">
                    Bước đặt lịch
                  </span>
                </div>

                <div className="px-3">
                  <strong className="block text-xl font-extrabold">
                    Rõ ràng
                  </strong>
                  <span className="mt-1 block text-[9px] font-bold uppercase leading-4 tracking-wide text-[#687382] dark:text-[#acb4c0]">
                    Về chi phí
                  </span>
                </div>

                <div className="pl-3">
                  <strong className="block text-xl font-extrabold">
                    Trực tuyến
                  </strong>
                  <span className="mt-1 block text-[9px] font-bold uppercase leading-4 tracking-wide text-[#687382] dark:text-[#acb4c0]">
                    Tra cứu lịch hẹn
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile car image */}
            <div className="relative min-h-[240px] sm:min-h-[320px] lg:hidden">
              <img
                src={garageHero}
                alt="Xe sedan trong xưởng chăm sóc ô tô"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f4f5f6] to-transparent dark:from-[#111416]" />
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section
          id="services"
          className="mx-auto max-w-[1260px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#cf2935]">
                Dịch vụ
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Chọn đúng dịch vụ cho xe của bạn
              </h2>

              <p className="mt-2 text-sm text-[#65707b] dark:text-[#acb4c0]">
                Khám phá các hạng mục chăm sóc và đặt lịch phù hợp.
              </p>
            </div>

            <Link
              to="/services"
              className="inline-flex min-h-10 items-center rounded-xl border border-[#e0e3e7] bg-white px-4 text-xs font-bold text-[#242b35] hover:border-[#cf2935] dark:border-[#41444b] dark:bg-[#202327] dark:text-white"
            >
              Xem tất cả dịch vụ ↗
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="group overflow-hidden rounded-2xl border border-[#e6e8eb] bg-white shadow-[0_8px_28px_rgba(0,0,0,.035)] transition hover:-translate-y-1 hover:shadow-lg dark:border-[#3a3e43] dark:bg-[#1d2024]"
              >
                <img
                  src={service.image}
                  alt={`Hình minh họa ${service.title.toLowerCase()}`}
                  loading="lazy"
                  className="h-[135px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />

                <div className="p-5">
                  <h3 className="text-lg font-extrabold">
                    {service.title}
                  </h3>

                  <p className="mt-2 min-h-[64px] text-[13px] leading-6 text-[#65707b] dark:text-[#abb4bf]">
                    {service.description}
                  </p>

                  <Link
                    to={service.href}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#bf2632] hover:underline dark:text-[#ff7a85]"
                  >
                    Xem và đặt lịch
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* WHY CHOOSE US */}
        <section className="bg-[#191d22] px-5 py-14 text-white sm:px-8">
          <div className="mx-auto max-w-[1260px]">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ff8992]">
              Vì sao chọn CarService?
            </p>

            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              Chăm sóc xe thuận tiện hơn mỗi ngày
            </h2>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((item) => (
                <div
                  key={item.number}
                  className="rounded-xl border border-white/15 bg-white/[.04] p-5"
                >
                  <span className="text-sm font-extrabold text-[#ff7985]">
                    {item.number}
                  </span>

                  <h3 className="mt-3 text-base font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-[13px] leading-6 text-[#c6ccd3]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <AtelierPublicFooter />
    </div>
  );
}
