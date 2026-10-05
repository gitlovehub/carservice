import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const services = [
  {
    number: "01",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra tổng thể và bảo dưỡng xe theo đúng lịch khuyến nghị.",
  },
  {
    number: "02",
    title: "Kiểm tra phanh",
    description:
      "Kiểm tra má phanh, đĩa phanh và hệ thống phanh an toàn.",
  },
  {
    number: "03",
    title: "Sửa chữa điều hòa",
    description:
      "Kiểm tra, sửa chữa và bảo dưỡng hệ thống điều hòa ô tô.",
  },
  {
    number: "04",
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
  "Đội ngũ kỹ thuật viên chuyên nghiệp",
  "Theo dõi tiến độ sửa chữa rõ ràng",
  "Báo giá minh bạch trước khi thực hiện",
  "Quản lý lịch sử bảo dưỡng của xe",
];

function Home() {
  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#20252b]">
      <Header />

      <main>
        <section className="border-b border-[#d5d9dd] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#243b53]">
                  CARSERVICE · DỊCH VỤ CHĂM SÓC Ô TÔ
                </p>

                <h1 className="max-w-[650px] text-[40px] font-bold leading-[1.1] tracking-[-1.5px] md:text-[52px]">
                  Chăm sóc xe
                  <br />
                  đúng cách, đúng lúc.
                </h1>

                <p className="mt-5 max-w-[560px] text-[14px] leading-7 text-[#66717c]">
                  CarService cung cấp giải pháp bảo dưỡng và sửa chữa ô tô
                  thuận tiện, minh bạch và chuyên nghiệp. Đặt lịch dễ dàng,
                  theo dõi tiến độ và quản lý thông tin xe tại một nơi.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/booking"
                    className="rounded-xl bg-[#243b53] px-6 py-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1d3043]"
                  >
                    Đặt lịch bảo dưỡng
                  </Link>

                  <Link
                    to="/services"
                    className="rounded-xl border border-[#c8cdd2] bg-white px-6 py-3.5 text-[12px] font-semibold text-[#20252b] transition hover:bg-[#eef0f2]"
                  >
                    Xem dịch vụ
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[#d5d9dd] bg-[#eef0f2] p-6 shadow-sm">
                <div className="rounded-2xl bg-[#20252b] p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[#aeb8c1]">
                        CARSERVICE
                      </p>

                      <h2 className="mt-2 text-[22px] font-bold">
                        Chăm sóc xe toàn diện
                      </h2>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#243b53] text-[13px] font-bold">
                      CS
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#3b4249] bg-[#292f35] p-4">
                      <p className="text-[10px] text-[#aeb8c1]">
                        DỊCH VỤ
                      </p>

                      <p className="mt-2 text-[13px] font-semibold">
                        Bảo dưỡng & sửa chữa
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#3b4249] bg-[#292f35] p-4">
                      <p className="text-[10px] text-[#aeb8c1]">
                        ĐẶT LỊCH
                      </p>

                      <p className="mt-2 text-[13px] font-semibold">
                        Nhanh chóng
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-[#243b53] p-4">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#d8e0e8]">
                      THEO DÕI DỊCH VỤ
                    </p>

                    <p className="mt-2 text-[13px] font-semibold">
                      Minh bạch từ lúc tiếp nhận đến khi bàn giao xe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f2]">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#243b53]">
                DỊCH VỤ NỔI BẬT
              </p>

              <h2 className="mt-2 text-[28px] font-bold">
                Những dịch vụ xe cần nhất
              </h2>

              <p className="mt-2 max-w-[600px] text-[12px] leading-5 text-[#66717c]">
                Từ bảo dưỡng định kỳ đến sửa chữa các hệ thống quan trọng,
                CarService giúp bạn chăm sóc xe thuận tiện hơn.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {services.map((service) => (
                <div
                  key={service.number}
                  className="rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#243b53] text-[11px] font-bold text-white">
                    {service.number}
                  </div>

                  <h3 className="mt-6 text-[14px] font-bold">
                    {service.title}
                  </h3>

                  <p className="mt-2 text-[11px] leading-5 text-[#66717c]">
                    {service.description}
                  </p>

                  <Link
                    to="/services"
                    className="mt-5 inline-flex text-[11px] font-semibold text-[#243b53]"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d5d9dd] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#243b53]">
                  VÌ SAO CHỌN CARSERVICE
                </p>

                <h2 className="mt-2 text-[28px] font-bold">
                  Mọi thứ bạn cần
                  <br />
                  để chăm sóc xe.
                </h2>

                <p className="mt-4 max-w-[440px] text-[12px] leading-6 text-[#66717c]">
                  Không chỉ sửa chữa xe, CarService giúp bạn quản lý toàn bộ
                  quá trình chăm sóc xe một cách rõ ràng và thuận tiện.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={benefit}
                    className="rounded-2xl border border-[#d5d9dd] bg-[#f7f8f9] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#243b53] text-[11px] font-bold text-white">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-[12px] font-semibold leading-5">
                        {benefit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f2]">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#243b53]">
                QUY TRÌNH
              </p>

              <h2 className="mt-2 text-[28px] font-bold">
                Từ đặt lịch đến nhận xe
              </h2>

              <p className="mt-2 text-[12px] text-[#66717c]">
                Quy trình đơn giản, dễ theo dõi.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {process.map((item) => (
                <div
                  key={item.number}
                  className="relative rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm"
                >
                  <p className="text-[24px] font-bold text-[#243b53]">
                    {item.number}
                  </p>

                  <h3 className="mt-5 text-[14px] font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-[11px] leading-5 text-[#66717c]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d5d9dd] bg-[#20252b]">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb8c1]">
                  BẮT ĐẦU NGAY
                </p>

                <h2 className="mt-2 text-[28px] font-bold text-white">
                  Xe của bạn đã đến lúc được chăm sóc?
                </h2>

                <p className="mt-3 max-w-[560px] text-[12px] leading-6 text-[#aeb8c1]">
                  Đặt lịch bảo dưỡng ngay hôm nay và để CarService đồng hành
                  cùng bạn trên mọi hành trình.
                </p>
              </div>

              <Link
                to="/booking"
                className="rounded-xl bg-white px-7 py-4 text-[12px] font-semibold text-[#20252b] transition hover:bg-[#e9ecef]"
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