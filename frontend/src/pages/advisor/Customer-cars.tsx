import { useState } from "react";
import { Link } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

const cars = [
  {
    id: 1,
    plate: "30A-123.45",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    brand: "Toyota",
    model: "Vios",
    year: 2021,
    status: "Đang sử dụng",
  },
  {
    id: 2,
    plate: "30F-678.90",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    brand: "Honda",
    model: "City",
    year: 2022,
    status: "Đang sử dụng",
  },
  {
    id: 3,
    plate: "29A-456.78",
    customer: "Bùi Việt",
    phone: "0987654321",
    brand: "Mazda",
    model: "Mazda 3",
    year: 2020,
    status: "Đang sử dụng",
  },
];

function CustomerCars() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");

  const filteredCars = cars.filter((car) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      car.plate.toLowerCase().includes(keyword) ||
      car.customer.toLowerCase().includes(keyword) ||
      car.phone.includes(search) ||
      car.model.toLowerCase().includes(keyword);

    const matchBrand = brand === "" || car.brand === brand;

    return matchSearch && matchBrand;
  });

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
                GARA / XE KHÁCH HÀNG
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252B]">
                    Quản lý xe khách hàng
                  </h2>

                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Theo dõi thông tin xe thuộc khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  + Thêm xe
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG SỐ XE
                </p>

                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {cars.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xe đang được quản lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {filteredCars.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xe đang hiển thị
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  VAI TRÒ
                </p>

                <p className="mt-3 text-[14px] font-bold text-[#20252B]">
                  Cố vấn dịch vụ
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Tìm kiếm xe
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tìm theo biển số, tên khách hàng, số điện thoại hoặc mẫu xe.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Biển số, tên khách hàng, số điện thoại..."
                  className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition duration-200 placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                />

                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition duration-200 focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả hãng xe</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Honda">Honda</option>
                  <option value="Mazda">Mazda</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  Tìm kiếm
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] text-[#8A949E]">
                  Có thể tìm nhanh bằng biển số xe.
                </p>

                {(search || brand) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setBrand("");
                    }}
                    className="text-[10px] font-semibold text-[#66717C] transition hover:text-[#20252B]"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252B]">
                    Danh sách xe khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Thông tin phương tiện đang quản lý
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {filteredCars.length} xe
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        STT
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        BIỂN SỐ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        HÃNG / MẪU XE
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        NĂM SX
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        TRẠNG THÁI
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCars.map((car, index) => (
                      <tr
                        key={car.id}
                        className="border-b border-[#EEF0F2] last:border-0 transition duration-200 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-5 py-4 text-[11px] text-[#66717C]">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-bold text-[#20252B]">
                            {car.plate}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252B]">
                            {car.customer}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8A949E]">
                            {car.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252B]">
                            {car.brand}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8A949E]">
                            {car.model}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#66717C]">
                          {car.year}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#EEF7F0] px-3 py-1.5 text-[9px] font-semibold text-[#39734A]">
                            {car.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to="/advisor/appointments"
                            className="inline-flex rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
                          >
                            Lịch hẹn
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCars.length === 0 && (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-[#66717C]">
                    <span className="text-lg">⌕</span>
                  </div>

                  <p className="mt-4 text-[12px] font-semibold text-[#20252B]">
                    Không tìm thấy xe
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Thử thay đổi từ khóa hoặc hãng xe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CustomerCars;