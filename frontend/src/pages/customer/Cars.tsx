import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Cars() {
  const [plate, setPlate] = useState("");
  const location = useLocation();

  const isCustomerPage = location.pathname === "/customer/cars";

  const cars = [
    {
      id: 1,
      name: "Toyota Vios",
      plate: "30A-123.45",
      history: "2 lần bảo dưỡng",
    },
    {
      id: 2,
      name: "Honda City",
      plate: "30F-678.90",
      history: "1 lần bảo dưỡng",
    },
  ];

  const filteredCars = cars.filter((car) => {
    return plate === "" || car.plate === plate;
  });

  const totalMaintenance = cars.reduce((total, car) => {
    const number = parseInt(car.history);
    return total + number;
  }, 0);

  const content = (
    <>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / XE CỦA TÔI
          </p>

          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
            Xe của tôi
          </h1>

          <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
            Quản lý các phương tiện đã đăng ký và theo dõi lịch sử bảo dưỡng.
          </p>
        </div>

        <Link
          to="/customer/booking"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[12px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
        >
          <span className="transition duration-300 group-hover:translate-x-0.5">
            +
          </span>
          Đặt lịch cho xe
        </Link>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                XE ĐÃ ĐĂNG KÝ
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#20252B]">
                {cars.length}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Phương tiện trong tài khoản
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
              🚗
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                KẾT QUẢ HIỆN TẠI
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#20252B]">
                {filteredCars.length}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Xe phù hợp tìm kiếm
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3F4F2] text-sm text-[#66717C] transition duration-300 group-hover:scale-105 group-hover:bg-[#E9EBE8]">
              ⌕
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                BẢO DƯỠNG
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#8A6A32]">
                {totalMaintenance}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Tổng lượt trong lịch sử
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F1E3] text-sm text-[#8A6A32] transition duration-300 group-hover:scale-105">
              ✓
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_10px_26px_rgba(31,41,51,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
              Tìm kiếm theo biển số
            </label>

            <select
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
            >
              <option value="">-- Tất cả xe --</option>
              <option value="30A-123.45">30A-123.45</option>
              <option value="30F-678.90">30F-678.90</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 lg:min-w-[250px] lg:justify-end">
            <span className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-bold text-[#6F5527]">
              {filteredCars.length} xe
            </span>

            <button
              type="button"
              onClick={() => setPlate(plate)}
              className="group rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
            >
              <span className="transition duration-300 group-hover:translate-x-0.5">
                Tìm kiếm
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
        <div className="border-b border-[#E5E7E9] px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
            DANH SÁCH PHƯƠNG TIỆN
          </p>

          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[17px] font-bold text-[#20252B]">
              Phương tiện của tôi
            </h2>

            <p className="text-[11px] text-[#8A949E]">
              {filteredCars.length} kết quả
            </p>
          </div>
        </div>

        {filteredCars.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-[#E5E7E9] bg-[#FAFAF9] text-left">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    STT
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Xe / Dòng xe
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Biển số
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Lịch sử bảo dưỡng
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCars.map((car, index) => (
                  <tr
                    key={car.id}
                    className="border-b border-[#EEF0F1] transition duration-200 hover:bg-[#FAFAF9]"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm text-[#3A3020] transition duration-200 hover:scale-105 hover:bg-[#D6A85F]">
                          🚗
                        </div>

                        <div>
                          <p className="text-[12px] font-semibold text-[#20252B]">
                            {car.name}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            Phương tiện cá nhân
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[11px] font-semibold text-[#20252B] transition duration-200 hover:bg-[#F3E8D2]">
                        {car.plate}
                      </span>
                    </td>

                    <td className="px-4 py-5">
                      <span className="text-[12px] text-[#66717C]">
                        {car.history}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B]"
                        >
                          Xem chi tiết
                        </button>

                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B]"
                        >
                          Lịch sử
                        </button>

                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B]"
                        >
                          Cập nhật xe
                        </button>

                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#8A949E] transition duration-200 hover:-translate-y-0.5 hover:border-[#D9B8B8] hover:bg-[#FBF5F5] hover:text-[#8A4A4A]"
                        >
                          Xóa xe
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8D2] text-lg text-[#3A3020] transition duration-300 hover:scale-110">
              🚗
            </div>

            <h3 className="mt-4 text-[15px] font-bold text-[#20252B]">
              Không tìm thấy xe
            </h3>

            <p className="mx-auto mt-2 max-w-[430px] text-[12px] leading-5 text-[#8A949E]">
              Không có phương tiện nào phù hợp với biển số bạn đang tìm kiếm.
            </p>

            <button
              type="button"
              onClick={() => setPlate("")}
              className="mt-5 rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
            >
              Xem tất cả xe
            </button>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm text-[#3A3020] transition duration-300 hover:scale-105 hover:bg-[#D6A85F]">
            i
          </div>

          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#20252B]">
              Quản lý xe dễ dàng hơn
            </h2>

            <p className="mt-1.5 max-w-[700px] text-[11px] leading-5 text-[#66717C]">
              Bạn có thể theo dõi lịch sử bảo dưỡng của từng xe và nhanh chóng
              đặt lịch dịch vụ khi cần.
            </p>
          </div>

          <Link
            to="/customer/booking"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
          >
            Đặt lịch
            <span className="transition duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  );

  if (!isCustomerPage) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F7F7F5]">
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            {content}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Cars;