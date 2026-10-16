import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { SERVICE_PRODUCTS } from "../../services/serviceCatalog";

function Services() {
  const navigate = useNavigate();

  const handleBooking = (serviceId: string) => {
    navigate(`/booking?service=${serviceId}`);
  };
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main>
        <section className="border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-12 md:py-14">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  CARSERVICE / DỊCH VỤ
                </p>

                <h1 className="mt-3 text-[32px] font-bold tracking-[-1px] text-[#1F2933] md:text-[42px]">
                  Dịch vụ của chúng tôi
                </h1>

                <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#66717C]">
                  Lựa chọn dịch vụ phù hợp để chăm sóc và bảo dưỡng chiếc xe
                  của bạn.
                </p>
              </div>

              <button
                onClick={() => navigate("/booking")}
                className="inline-flex w-fit cursor-pointer rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#151D24]"
              >
                Đặt lịch ngay
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  DANH SÁCH DỊCH VỤ
                </p>

                <h2 className="mt-1 text-[20px] font-bold text-[#20252B]">
                  Chăm sóc xe toàn diện
                </h2>
              </div>

              <p className="hidden text-[11px] text-[#8A949E] sm:block">
                06 dịch vụ
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {SERVICE_PRODUCTS.map((service, index) => (
                <div
                  key={service.title}
                  className="group flex flex-col rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2933] text-[11px] font-bold text-white transition group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <span className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[11px] font-semibold text-[#3A3020]">
                      Dịch vụ
                    </span>
                  </div>

                  <h2 className="text-[17px] font-bold text-[#20252B]">
                    {service.title}
                  </h2>

                  <p className="mt-2 min-h-[72px] text-[13px] leading-5 text-[#66717C]">
                    {service.description}
                  </p>

                  <div className="mt-auto flex items-end justify-between border-t border-[#E1E4E6] pt-4">
                    <div>
                      <p className="text-[11px] text-[#8A949E]">
                        Chi phí tham khảo
                      </p>

                      <p className="mt-1 text-[14px] font-bold text-[#1F2933]">
                        {service.price}
                      </p>
                    </div>

                    <button
                      onClick={() => handleBooking(service.id)}
                      className="cursor-pointer rounded-xl border border-[#DDE1E4] px-3.5 py-2.5 text-[11px] font-semibold text-[#20252B] transition hover:border-[#1F2933] hover:bg-[#1F2933] hover:text-white"
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl bg-[#1F2933] shadow-[0_10px_30px_rgba(31,41,51,0.10)]">
              <div className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center md:p-7">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    CẦN TƯ VẤN?
                  </p>

                  <h2 className="mt-2 text-[17px] font-bold text-white">
                    Bạn chưa biết nên chọn dịch vụ nào?
                  </h2>

                  <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#AEB8C1]">
                    Đặt lịch để cố vấn của CarService kiểm tra và tư vấn
                    cho bạn.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/booking")}
                  className="shrink-0 cursor-pointer rounded-xl bg-white px-5 py-3 text-xs font-semibold text-[#20252B] transition hover:bg-[#F3E8D2]"
                >
                  Đặt lịch kiểm tra
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Services;