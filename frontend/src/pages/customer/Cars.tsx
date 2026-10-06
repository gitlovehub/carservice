import { useState } from "react";
import { useLocation } from "react-router-dom";
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

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      {isCustomerPage ? (
        <>
          <CustomerHeader />
          <CustomerTopbar />
        </>
      ) : (
        <Header />
      )}

      <main className={isCustomerPage ? "lg:ml-[250px]" : ""}>
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              {isCustomerPage ? "KHÁCH HÀNG / XE CỦA TÔI" : "CARSERVICE / XE CỦA TÔI"}
            </p>

            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Xe của tôi
                </h1>

                <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#66717C]">
                  Quản lý xe và xem lịch sử bảo dưỡng.
                </p>
              </div>

              <button
                type="button"
                className="flex w-fit items-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md"
              >
                <span className="text-sm">+</span>
                Thêm xe
              </button>
            </div>
          </div>

          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    XE ĐÃ ĐĂNG KÝ
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {cars.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white">
                  🚗
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Tổng số phương tiện đang được quản lý.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    KẾT QUẢ HIỆN TẠI
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {filteredCars.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                  ✓
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Số xe phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          </div>

          <div className="mb-7 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="border-b border-[#E1E4E6] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                FILTER
              </p>

              <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                Tìm kiếm xe của tôi
              </h2>

              <p className="mt-1 text-[10px] text-[#66717C]">
                Tìm kiếm và lọc danh sách theo thông tin hiện có.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-[10px] font-semibold text-[#20252B]">
                  Biển số xe
                </label>

                <select
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả biển số</option>
                  <option value="30A-123.45">30A-123.45</option>
                  <option value="30F-678.90">30F-678.90</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md md:w-auto"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  VEHICLES
                </p>

                <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                  Danh sách xe của tôi
                </h2>
              </div>

              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                {filteredCars.length} kết quả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    <th className="px-6 py-4">STT</th>
                    <th className="px-6 py-4">Xe / Dòng xe</th>
                    <th className="px-6 py-4">Biển số</th>
                    <th className="px-6 py-4">Lịch sử bảo dưỡng</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCars.map((car, index) => (
                    <tr
                      key={car.id}
                      className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                    >
                      <td className="px-6 py-5 text-[11px] text-[#8A949E]">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                            🚗
                          </div>

                          <div>
                            <p className="text-[12px] font-bold text-[#20252B]">
                              {car.name}
                            </p>

                            <p className="mt-1 text-[9px] text-[#8A949E]">
                              Phương tiện cá nhân
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-lg border border-[#E1E4E6] bg-[#F7F7F5] px-3 py-2 text-[11px] font-semibold text-[#20252B]">
                          {car.plate}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8D2] text-[10px] font-bold text-[#3A3020]">
                            ✓
                          </span>

                          <span className="text-[11px] text-[#66717C]">
                            {car.history}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-[#1F2933] px-3.5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
                          >
                            Xem chi tiết
                          </button>

                          <button
                            type="button"
                            className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                          >
                            Lịch sử
                          </button>

                          <button
                            type="button"
                            className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                          >
                            Cập nhật xe
                          </button>

                          <button
                            type="button"
                            className="rounded-xl border border-[#DDE1E4] bg-white px-3.5 py-2.5 text-[10px] font-medium text-[#66717C] transition hover:border-[#20252B] hover:bg-[#F3F4F2]"
                          >
                            Xóa xe
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredCars.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm text-[#66717C]">
                          —
                        </div>

                        <p className="mt-4 text-xs font-semibold text-[#20252B]">
                          Không tìm thấy xe
                        </p>

                        <p className="mt-1 text-[10px] text-[#8A949E]">
                          Thử thay đổi biển số hoặc bộ lọc tìm kiếm.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>

              <div>
                <p className="text-xs font-bold text-[#20252B]">
                  Quản lý phương tiện
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#66717C]">
                  Bạn có thể quản lý thông tin xe và theo dõi lịch sử bảo dưỡng
                  của từng phương tiện đã đăng ký tại CarService.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {!isCustomerPage && <Footer />}
    </div>
  );
}

export default Cars;