import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const services = [
  {
    number: "01",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra tổng quát theo các mốc bảo dưỡng, giúp xe vận hành ổn định và bền bỉ.",
    icon: "⚙",
  },
  {
    number: "02",
    title: "Hệ thống phanh & lốp",
    description:
      "Kiểm tra má phanh, áp suất lốp và cân chỉnh thước lái để đảm bảo an toàn.",
    icon: "◉",
  },
  {
    number: "03",
    title: "Hệ thống điều hòa",
    description:
      "Kiểm tra gas, vệ sinh giàn lạnh và lọc gió, mang lại không gian dễ chịu.",
    icon: "❄",
  },
  {
    number: "04",
    title: "Thay dầu động cơ",
    description:
      "Thay dầu và lọc dầu phù hợp, hỗ trợ bảo vệ động cơ trong quá trình vận hành.",
    icon: "◈",
  },
];

const steps = [
  {
    number: "01",
    title: "Đặt lịch trực tuyến",
    description:
      "Chọn dịch vụ, phương tiện và khung giờ phù hợp với lịch trình của bạn.",
  },
  {
    number: "02",
    title: "Tiếp nhận xe",
    description:
      "Cố vấn kiểm tra tình trạng xe, ghi nhận yêu cầu và tư vấn phương án.",
  },
  {
    number: "03",
    title: "Tiến hành dịch vụ",
    description:
      "Kỹ thuật viên thực hiện công việc theo hạng mục đã thống nhất.",
  },
  {
    number: "04",
    title: "Nghiệm thu & bàn giao",
    description:
      "Kiểm tra kết quả, xác nhận chi phí và bàn giao xe cho khách hàng.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#20252B]">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-[#E5E3DD] bg-[#F7F7F5]">
          <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-12 lg:py-20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D5B7] bg-[#F3E8D2] px-4 py-2 text-[11px] font-semibold tracking-wide text-[#70552C]">
                <span className="h-2 w-2 rounded-full bg-[#B98B43]" />
                CHĂM SÓC XE CHUYÊN NGHIỆP
              </div>

              <h1 className="mt-7 max-w-[650px] text-4xl font-semibold leading-[1.15] tracking-[-1.5px] text-[#1F2933] sm:text-5xl lg:text-[58px]">
                Chăm sóc chiếc xe.
                <span className="mt-2 block text-[#B98B43]">
                  An tâm mọi hành trình.
                </span>
              </h1>

              <p className="mt-6 max-w-[550px] text-sm leading-7 text-[#66717C] sm:text-base sm:leading-8">
                Dịch vụ bảo dưỡng và sửa chữa ô tô với quy trình rõ ràng,
                tư vấn minh bạch và sự tận tâm trong từng chi tiết.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/booking"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#1F2933] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#35414D]"
                >
                  Đặt lịch dịch vụ
                  <span aria-hidden="true">↗</span>
                </Link>

                <Link
                  to="/services"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D9D9D2] bg-white px-6 py-3 text-sm font-semibold text-[#1F2933] transition hover:border-[#B98B43] hover:bg-[#FCFBF8]"
                >
                  Khám phá dịch vụ
                </Link>
              </div>

              <div className="mt-10 grid max-w-[520px] grid-cols-3 border-t border-[#E1E0D9] pt-6">
                <div className="pr-3">
                  <p className="text-lg font-semibold text-[#1F2933] sm:text-2xl">
                    Minh bạch
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-[#7A838C] sm:text-xs">
                    Tư vấn rõ ràng
                  </p>
                </div>

                <div className="border-l border-[#E1E0D9] px-3 sm:px-5">
                  <p className="text-lg font-semibold text-[#1F2933] sm:text-2xl">
                    Tận tâm
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-[#7A838C] sm:text-xs">
                    Chăm sóc từng xe
                  </p>
                </div>

                <div className="border-l border-[#E1E0D9] pl-3 sm:pl-5">
                  <p className="text-lg font-semibold text-[#1F2933] sm:text-2xl">
                    An tâm
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-[#7A838C] sm:text-xs">
                    Theo dõi dịch vụ
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-3 -top-3 h-28 w-28 rounded-full bg-[#E9D7B5]/50 blur-2xl sm:-right-5 sm:-top-5" />

              <div className="relative overflow-hidden rounded-[24px] border border-white bg-[#E9E7E1] p-2 shadow-[0_24px_70px_rgba(31,41,51,0.12)] sm:rounded-[30px] sm:p-3">
                <img
                  src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1400&q=85"
                  alt="Không gian chăm sóc và bảo dưỡng ô tô"
                  className="h-[300px] w-full rounded-[18px] object-cover sm:h-[400px] sm:rounded-[22px] lg:h-[510px]"
                />

                <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/50 bg-[#1F2933]/90 p-4 text-white backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3C38D]">
                    CARSERVICE EXPERIENCE
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold sm:text-xl">
                        Chăm xe đúng cách
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/65">
                        Đồng hành cùng bạn trên mọi cung đường.
                      </p>
                    </div>
                    <span className="hidden text-3xl text-[#D6A85F] sm:block">
                      ✳
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B98B43]">
                  DỊCH VỤ CỦA CHÚNG TÔI
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.8px] text-[#1F2933] sm:text-4xl">
                  Chăm sóc xe toàn diện
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#737D86]">
                  Những hạng mục thiết yếu giúp bạn chủ động bảo dưỡng và
                  duy trì tình trạng vận hành của xe.
                </p>
              </div>

              <Link
                to="/services"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1F2933] transition hover:text-[#B98B43]"
              >
                Xem tất cả dịch vụ
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
              {services.map((service) => (
                <article
                  key={service.number}
                  className="group flex min-h-[270px] flex-col rounded-2xl border border-[#E8E7E1] bg-[#FDFDFC] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_16px_36px_rgba(31,41,51,0.07)] sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8D2] text-2xl text-[#8A642D]">
                      {service.icon}
                    </div>
                    <span className="font-mono text-xs text-[#A4A7A4]">
                      {service.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-base font-semibold text-[#1F2933]">
                    {service.title}
                  </h3>

                  <p className="mt-3 flex-1 text-xs leading-6 text-[#737D86]">
                    {service.description}
                  </p>

                  <Link
                    to="/booking"
                    className="mt-5 inline-flex w-fit items-center gap-2 text-xs font-semibold text-[#1F2933] transition group-hover:text-[#A77C3C]"
                  >
                    Đặt lịch dịch vụ
                    <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#E8E6DF] bg-[#F0EFEA] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A77C3C]">
                QUY TRÌNH DỊCH VỤ
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.8px] text-[#1F2933] sm:text-4xl">
                Rõ ràng trong từng bước
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#737D86]">
                Từ lúc đặt hẹn đến khi nhận lại xe, bạn có thể theo dõi
                quá trình và chủ động nắm bắt thông tin dịch vụ.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="relative rounded-2xl border border-[#E1DFD7] bg-white p-6 sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-light tracking-tight text-[#B98B43]">
                      {step.number}
                    </span>
                    <span className="h-px w-12 bg-[#D6A85F]" />
                  </div>

                  <h3 className="mt-7 text-base font-semibold text-[#1F2933]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-xs leading-6 text-[#737D86]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1F2933] py-14 text-white sm:py-16 lg:py-20">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E3C38D]">
                SẴN SÀNG HỖ TRỢ
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                Đã đến lúc chăm sóc chiếc xe của bạn?
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/65">
                Chủ động đặt lịch để lựa chọn thời gian phù hợp và gửi
                yêu cầu dịch vụ cho CarService.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                to="/booking"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D6A85F] px-6 py-3 text-sm font-semibold text-[#1F2933] transition hover:bg-[#E5C58F]"
              >
                Đặt lịch ngay
                <span aria-hidden="true">↗</span>
              </Link>

              <a
                href="tel:0332405972"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Hotline: 033 240 5972
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;