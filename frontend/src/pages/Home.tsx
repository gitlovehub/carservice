import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const services = [
  {
    number: "01",
    icon: "🔧",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra tổng thể và bảo dưỡng xe theo đúng lịch khuyến nghị.",
  },
  {
    number: "02",
    icon: "🛞",
    title: "Kiểm tra phanh",
    description:
      "Kiểm tra má phanh, đĩa phanh và hệ thống phanh an toàn.",
  },
  {
    number: "03",
    icon: "❄️",
    title: "Sửa chữa điều hòa",
    description:
      "Kiểm tra, sửa chữa và bảo dưỡng hệ thống điều hòa ô tô.",
  },
  {
    number: "04",
    icon: "🛢️",
    title: "Thay dầu động cơ",
    description:
      "Thay dầu động cơ và kiểm tra các bộ phận liên quan.",
  },
];

const process = [
  {
    number: "01",
    title: "Đặt lịch",
    description: "Chọn dịch vụ và thời gian phù hợp với bạn.",
  },
  {
    number: "02",
    title: "Tiếp nhận xe",
    description: "Cố vấn tiếp nhận và kiểm tra thông tin xe.",
  },
  {
    number: "03",
    title: "Kiểm tra & sửa chữa",
    description: "Kỹ thuật viên kiểm tra và thực hiện dịch vụ.",
  },
  {
    number: "04",
    title: "Bàn giao xe",
    description: "Kiểm tra kết quả và nhận lại xe.",
  },
];

const benefits = [
  {
    title: "Kỹ thuật viên chuyên nghiệp",
    description: "Đội ngũ kỹ thuật được phân công theo từng dịch vụ.",
  },
  {
    title: "Theo dõi tiến độ rõ ràng",
    description: "Khách hàng dễ dàng theo dõi tình trạng sửa chữa.",
  },
  {
    title: "Báo giá minh bạch",
    description: "Thông tin chi phí được trao đổi trước khi thực hiện.",
  },
  {
    title: "Quản lý lịch sử xe",
    description: "Lưu trữ thông tin bảo dưỡng và sửa chữa của xe.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main>
        {/* HERO */}
        <section className="overflow-hidden border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">

              {/* Hero content */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E1E4E6] bg-[#F7F7F5] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#66717C]">
                    CarService · Chăm sóc xe chuyên nghiệp
                  </span>
                </div>

                <h1 className="max-w-[680px] text-[42px] font-bold leading-[1.08] tracking-[-1.8px] text-[#1F2933] md:text-[58px]">
                  Chăm sóc xe
                  <br />
                  <span className="text-[#D6A85F]">đúng cách.</span>
                </h1>

                <p className="mt-6 max-w-[570px] text-[14px] leading-7 text-[#66717C] md:text-[15px]">
                  CarService giúp bạn đặt lịch bảo dưỡng, theo dõi quá trình
                  sửa chữa và quản lý thông tin xe một cách thuận tiện,
                  minh bạch và chuyên nghiệp.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/booking"
                    className="rounded-xl bg-[#1F2933] px-6 py-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#151D24]"
                  >
                    Đặt lịch ngay →
                  </Link>

                  <Link
                    to="/services"
                    className="rounded-xl border border-[#D6A85F] bg-white px-6 py-3.5 text-[12px] font-semibold text-[#1F2933] transition hover:bg-[#F7F7F5]"
                  >
                    Xem dịch vụ
                  </Link>
                </div>

                {/* Trust points */}
                <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F2] text-[10px]">
                      ✓
                    </span>

                    <span className="text-[11px] font-medium text-[#66717C]">
                      Minh bạch
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F2] text-[10px]">
                      ✓
                    </span>

                    <span className="text-[11px] font-medium text-[#66717C]">
                      Dễ theo dõi
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F2] text-[10px]">
                      ✓
                    </span>

                    <span className="text-[11px] font-medium text-[#66717C]">
                      Chuyên nghiệp
                    </span>
                  </div>
                </div>
              </div>

              {/* Hero visual */}
              <div className="relative">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F3E8D2] blur-3xl" />

                <div className="relative overflow-hidden rounded-[28px] border border-[#E1E4E6] bg-[#1F2933] p-4 shadow-[0_20px_60px_rgba(31,41,51,0.15)]">
                  <div className="rounded-[22px] border border-[#3C4650] bg-[#29333D] p-6">

                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#AEB8C1]">
                          CARSERVICE
                        </p>

                        <h2 className="mt-2 text-[22px] font-bold text-white">
                          Chăm sóc xe toàn diện
                        </h2>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D6A85F] text-xl">
                        🚗
                      </div>
                    </div>

                    {/* Car visual */}
                    <div className="my-8 flex h-36 items-center justify-center rounded-2xl border border-[#3C4650] bg-[#222B34]">
                      <div className="text-center">
                        <div className="text-6xl">🚘</div>

                        <p className="mt-3 text-[9px] font-medium uppercase tracking-[0.15em] text-[#AEB8C1]">
                          READY FOR SERVICE
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#3C4650] bg-[#313B45] p-4">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[#AEB8C1]">
                          DỊCH VỤ
                        </p>

                        <p className="mt-2 text-[12px] font-semibold text-white">
                          Bảo dưỡng & sửa chữa
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#3C4650] bg-[#313B45] p-4">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[#AEB8C1]">
                          ĐẶT LỊCH
                        </p>

                        <p className="mt-2 text-[12px] font-semibold text-white">
                          Nhanh chóng
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#D6A85F] px-4 py-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#3A3020]">
                          THEO DÕI DỊCH VỤ
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-[#1F2933]">
                          Minh bạch từ A → Z
                        </p>
                      </div>

                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="bg-[#F7F7F5]">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">

            <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  DỊCH VỤ NỔI BẬT
                </p>

                <h2 className="mt-2 text-[30px] font-bold tracking-[-0.8px] text-[#1F2933] md:text-[34px]">
                  Chăm sóc xe từ A đến Z
                </h2>

                <p className="mt-2 max-w-[570px] text-[12px] leading-6 text-[#66717C]">
                  Những dịch vụ phổ biến giúp xe luôn vận hành ổn định và an
                  toàn trên mọi hành trình.
                </p>
              </div>

              <Link
                to="/services"
                className="text-[11px] font-bold text-[#1F2933] transition hover:text-[#D6A85F]"
              >
                Xem tất cả dịch vụ →
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <div
                  key={service.number}
                  className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_35px_rgba(31,41,51,0.08)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F4F2] text-lg transition group-hover:bg-[#F3E8D2]">
                      {service.icon}
                    </div>

                    <span className="text-[10px] font-bold text-[#A0A8AE]">
                      {service.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-[14px] font-bold text-[#20252B]">
                    {service.title}
                  </h3>

                  <p className="mt-2 min-h-[48px] text-[11px] leading-5 text-[#66717C]">
                    {service.description}
                  </p>

                  <Link
                    to="/services"
                    className="mt-5 inline-flex text-[11px] font-bold text-[#1F2933] transition group-hover:text-[#D6A85F]"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="border-y border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  VÌ SAO CHỌN CARSERVICE
                </p>

                <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.8px] text-[#1F2933] md:text-[36px]">
                  Không chỉ sửa xe.
                  <br />
                  <span className="text-[#66717C]">
                    Chúng tôi chăm sóc cả hành trình.
                  </span>
                </h2>

                <p className="mt-5 max-w-[450px] text-[12px] leading-6 text-[#66717C]">
                  Mọi thông tin từ lịch hẹn, tình trạng xe đến quá trình sửa
                  chữa đều được quản lý rõ ràng trong một hệ thống.
                </p>

                <Link
                  to="/booking"
                  className="mt-7 inline-flex rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Đặt lịch ngay →
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={benefit.title}
                    className="rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-5 transition hover:border-[#D6A85F]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-[10px] font-bold text-[#D6A85F]">
                        0{index + 1}
                      </div>

                      <div>
                        <h3 className="text-[12px] font-bold text-[#20252B]">
                          {benefit.title}
                        </h3>

                        <p className="mt-2 text-[11px] leading-5 text-[#66717C]">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="bg-[#F7F7F5]">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">

            <div className="mb-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                QUY TRÌNH
              </p>

              <h2 className="mt-2 text-[30px] font-bold tracking-[-0.8px] text-[#1F2933] md:text-[34px]">
                Từ đặt lịch đến nhận xe
              </h2>

              <p className="mt-2 text-[12px] text-[#66717C]">
                Quy trình đơn giản, rõ ràng và dễ theo dõi.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {process.map((item, index) => (
                <div
                  key={item.number}
                  className="relative rounded-2xl border border-[#E1E4E6] bg-white p-5"
                >
                  {index < process.length - 1 && (
                    <div className="absolute right-[-17px] top-[42px] z-10 hidden text-[#D6A85F] lg:block">
                      →
                    </div>
                  )}

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8D2] text-[11px] font-bold text-[#1F2933]">
                    {item.number}
                  </div>

                  <h3 className="mt-5 text-[14px] font-bold text-[#20252B]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-[11px] leading-5 text-[#66717C]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1F2933]">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">

              <div>
                <div className="mb-3 inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#AEB8C1]">
                    BẮT ĐẦU NGAY
                  </span>
                </div>

                <h2 className="max-w-[700px] text-[30px] font-bold tracking-[-0.8px] text-white md:text-[36px]">
                  Xe của bạn đã đến lúc được chăm sóc?
                </h2>

                <p className="mt-3 max-w-[570px] text-[12px] leading-6 text-[#AEB8C1]">
                  Đặt lịch bảo dưỡng ngay hôm nay và để CarService đồng hành
                  cùng bạn trên mọi hành trình.
                </p>
              </div>

              <Link
                to="/booking"
                className="shrink-0 rounded-xl bg-[#D6A85F] px-7 py-4 text-[12px] font-bold text-[#1F2933] transition hover:bg-[#E4C17E]"
              >
                Đặt lịch ngay →
              </Link>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;