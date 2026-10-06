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
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9aa1a7]">
                GARA / XE KHÁCH HÀNG
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Quản lý xe khách hàng
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Theo dõi thông tin xe thuộc khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  + Thêm xe
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  TỔNG SỐ XE
                </p>

                <p className="mt-3 text-[22px] font-bold">
                  {cars.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Xe đang được quản lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[22px] font-bold">
                  {filteredCars.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Xe đang hiển thị
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  VAI TRÒ
                </p>

                <p className="mt-3 text-[14px] font-bold">
                  Cố vấn dịch vụ
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold">
                  Tìm kiếm xe
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo biển số, tên khách hàng, số điện thoại hoặc mẫu xe.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Biển số, tên khách hàng, số điện thoại..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                >
                  <option value="">Tất cả hãng xe</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Honda">Honda</option>
                  <option value="Mazda">Mazda</option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Tìm kiếm
                </button>
              </div>

              <p className="mt-3 text-[10px] text-[#8a9299]">
                Có thể tìm nhanh bằng biển số xe.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-5">
                <div>
                  <p className="text-[13px] font-semibold">
                    Danh sách xe khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Thông tin phương tiện đang quản lý
                  </p>
                </div>

                <p className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredCars.length} xe
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e1e4e6] bg-[#f7f7f5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        STT
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        BIỂN SỐ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        HÃNG / MẪU XE
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        NĂM SX
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        TRẠNG THÁI
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCars.map((car, index) => (
                      <tr
                        key={car.id}
                        className="border-b border-[#eef0f2] last:border-0 hover:bg-[#fafbfb]"
                      >
                        <td className="px-5 py-4 text-[11px] text-[#66717c]">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-bold">
                            {car.plate}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold">
                            {car.customer}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {car.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold">
                            {car.brand}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            {car.model}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#66717c]">
                          {car.year}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#eef7f0] px-3 py-1.5 text-[9px] font-semibold text-[#39734a]">
                            {car.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to="/advisor/appointments"
                            className="inline-flex rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#1f2933] hover:bg-[#f3f4f2]"
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
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold">
                    Không tìm thấy xe
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
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