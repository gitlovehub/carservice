import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const services = [
  {
    title: "Bảo dưỡng định kỳ",
    description: "Kiểm tra và bảo dưỡng xe theo định kỳ để xe luôn hoạt động ổn định.",
    price: "Từ 500.000đ",
  },
  {
    title: "Thay dầu động cơ",
    description: "Thay dầu động cơ và kiểm tra các bộ phận liên quan đến hệ thống bôi trơn.",
    price: "Từ 350.000đ",
  },
  {
    title: "Kiểm tra phanh",
    description: "Kiểm tra má phanh, đĩa phanh và hệ thống phanh để đảm bảo an toàn.",
    price: "Từ 300.000đ",
  },
  {
    title: "Kiểm tra điều hòa",
    description: "Kiểm tra hệ thống điều hòa và xử lý các vấn đề về làm mát trong xe.",
    price: "Từ 400.000đ",
  },
  {
    title: "Kiểm tra động cơ",
    description: "Kiểm tra tổng quát động cơ và phát hiện các vấn đề cần sửa chữa.",
    price: "Từ 600.000đ",
  },
  {
    title: "Chăm sóc xe",
    description: "Vệ sinh và chăm sóc tổng thể giúp xe sạch sẽ và giữ được tình trạng tốt.",
    price: "Từ 300.000đ",
  },
];

function Services() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
              CARSERVICE
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Dịch vụ của chúng tôi
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7881]">
              Lựa chọn dịch vụ phù hợp để chăm sóc và bảo dưỡng chiếc xe của bạn.
            </p>
          </div>

          <Link
            to="/booking"
            className="hidden rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] sm:block"
          >
            Đặt lịch ngay
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f2f3] text-sm font-bold text-[#20252b]">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <span className="rounded-full bg-[#f4f5f6] px-3 py-1.5 text-[10px] font-medium text-[#6f7881]">
                  Dịch vụ
                </span>
              </div>

              <h2 className="text-base font-bold">
                {service.title}
              </h2>

              <p className="mt-2 min-h-[72px] text-xs leading-5 text-[#707981]">
                {service.description}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-[#eef0f2] pt-4">
                <div>
                  <p className="text-[10px] text-[#8a949e]">
                    Chi phí tham khảo
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {service.price}
                  </p>
                </div>

                <Link
                  to="/booking"
                  className="rounded-xl border border-[#dfe3e6] px-3.5 py-2 text-[11px] font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
                >
                  Đặt lịch
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold">
                Bạn chưa biết nên chọn dịch vụ nào?
              </p>

              <p className="mt-1 text-xs text-[#7b858f]">
                Đặt lịch để cố vấn của CarService kiểm tra và tư vấn cho bạn.
              </p>
            </div>

            <Link
              to="/booking"
              className="rounded-xl bg-[#20252b] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#343a40]"
            >
              Đặt lịch kiểm tra
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Services;