import { useState } from "react";
import { Link } from "react-router-dom";

const cars = [
  {
    id: 1,
    owner: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    plate: "30A-12345",
    brand: "Toyota",
    model: "Camry",
    year: 2022,
    status: "Đang sử dụng",
  },
  {
    id: 2,
    owner: "Phùng Đức Anh",
    phone: "0912345678",
    plate: "29A-67890",
    brand: "Honda",
    model: "Civic",
    year: 2021,
    status: "Đang sử dụng",
  },
  {
    id: 3,
    owner: "Bùi Việt",
    phone: "0987654321",
    plate: "30F-11111",
    brand: "Mazda",
    model: "CX-5",
    year: 2023,
    status: "Đang sửa chữa",
  },
];

function CustomerCars() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");

  const filteredCars = cars.filter((car) => {
    const matchSearch =
      car.owner.toLowerCase().includes(search.toLowerCase()) ||
      car.phone.includes(search) ||
      car.plate.toLowerCase().includes(search.toLowerCase());

    const matchBrand = brand === "" || car.brand === brand;

    return matchSearch && matchBrand;
  });

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <header className="border-b border-[#e1e4e7] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              CS
            </div>

            <div>
              <p className="text-[14px] font-bold">CarService</p>
              <p className="text-[10px] text-[#8a949e]">
                Quản lý dịch vụ ô tô
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9ecef] text-[10px] font-bold">
              CV
            </div>

            <div>
              <p className="text-[12px] font-semibold">Tên người dùng</p>
              <p className="text-[10px] text-[#8a949e]">
                Tài khoản · Cố vấn dịch vụ
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              CV
            </div>

            <div>
              <h1 className="text-[18px] font-bold">Cố vấn dịch vụ</h1>
              <p className="text-[11px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-5 gap-3">
          <Link
            to="/advisor/customers"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">Khách hàng</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý khách hàng
            </p>
          </Link>

          <Link
            to="/advisor/customer-cars"
            className="rounded-xl border border-[#20252b] bg-[#20252b] px-4 py-4 text-white"
          >
            <p className="text-[12px] font-semibold">Xe của khách</p>
            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Quản lý xe
            </p>
          </Link>

          <Link
            to="/advisor/appointments"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">Lịch hẹn</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý lịch
            </p>
          </Link>

          <Link
            to="/advisor/repair-status"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">Phiếu sửa chữa</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Theo dõi sửa chữa
            </p>
          </Link>

          <Link
            to="/advisor/quotation"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">Báo giá</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý báo giá
            </p>
          </Link>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / XE CỦA KHÁCH
          </p>

          <h2 className="text-[24px] font-bold">Quản lý xe của khách</h2>

          <p className="mt-1 text-[12px] text-[#8a949e]">
            Quản lý thông tin xe của khách hàng tại gara.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <button className="rounded-lg bg-[#20252b] px-4 py-2.5 text-[12px] font-semibold text-white">
            + Thêm xe
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
          <p className="mb-4 text-[12px] font-semibold">Tìm kiếm xe</p>

          <div className="grid grid-cols-[1.5fr_1fr_auto] gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên khách, số điện thoại hoặc biển số"
              className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none"
            />

            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none"
            >
              <option value="">Tất cả hãng xe</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Mazda">Mazda</option>
            </select>

            <button className="rounded-lg bg-[#20252b] px-5 py-2.5 text-[12px] font-semibold text-white">
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-5 py-4">
            <p className="text-[13px] font-semibold">Danh sách xe</p>

            <p className="text-[11px] text-[#8a949e]">
              {filteredCars.length} xe
            </p>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#e1e4e7] bg-[#fafbfc] text-left">
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  STT
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  CHỦ XE
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  BIỂN SỐ
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  HÃNG XE
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  MODEL
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  NĂM
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  TRẠNG THÁI
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  THAO TÁC
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredCars.map((car, index) => (
                <tr
                  key={car.id}
                  className="border-b border-[#eef0f2] last:border-0"
                >
                  <td className="px-5 py-4 text-[12px]">
                    {index + 1}
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-[12px] font-semibold">{car.owner}</p>
                    <p className="text-[10px] text-[#8a949e]">{car.phone}</p>
                  </td>

                  <td className="px-5 py-4 text-[12px] font-semibold">
                    {car.plate}
                  </td>

                  <td className="px-5 py-4 text-[12px]">{car.brand}</td>

                  <td className="px-5 py-4 text-[12px]">{car.model}</td>

                  <td className="px-5 py-4 text-[12px]">{car.year}</td>

                  <td className="px-5 py-4 text-[11px]">
                    {car.status}
                  </td>

                  <td className="px-5 py-4">
                    <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[11px] font-semibold">
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-10 border-t border-[#e1e4e7] bg-white">
        <div className="mx-auto flex max-w-[1200px] justify-between px-6 py-5">
          <p className="text-[10px] text-[#8a949e]">
            © CarService · Quản lý dịch vụ ô tô
          </p>

          <p className="text-[10px] text-[#8a949e]">
            Dịch vụ bảo dưỡng và sửa chữa ô tô
          </p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerCars;