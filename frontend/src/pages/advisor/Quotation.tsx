import { Link } from "react-router-dom";
import Header from "../../components/Header";

const quotations = [
  {
    id: 1,
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    service: "Bảo dưỡng định kỳ",
    amount: "3.500.000đ",
    date: "03/10/2026",
    status: "Chờ xác nhận",
  },
  {
    id: 2,
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    service: "Kiểm tra phanh",
    amount: "2.800.000đ",
    date: "03/10/2026",
    status: "Đã xác nhận",
  },
  {
    id: 3,
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    service: "Sửa chữa điều hòa",
    amount: "4.200.000đ",
    date: "02/10/2026",
    status: "Đã gửi",
  },
];

function Quotation() {
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              CV
            </div>

            <div>
              <h1 className="text-[18px] font-bold">
                Cố vấn dịch vụ
              </h1>

              <p className="text-[11px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-5 gap-3">
          <Link
            to="/customers"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Khách hàng
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý khách hàng
            </p>
          </Link>

          <Link
            to="/customer-cars"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Xe của khách
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý xe
            </p>
          </Link>

          <Link
            to="/appointments"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Lịch hẹn
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Quản lý lịch
            </p>
          </Link>

          <Link
            to="/repair-status"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Phiếu sửa chữa
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Theo dõi sửa chữa
            </p>
          </Link>

          <Link
            to="/quotation"
            className="rounded-xl border border-[#20252b] bg-[#20252b] px-4 py-4 text-white"
          >
            <p className="text-[12px] font-semibold">
              Báo giá
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Quản lý báo giá
            </p>
          </Link>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / BÁO GIÁ
          </p>

          <h2 className="text-[24px] font-bold">
            Quản lý báo giá
          </h2>

          <p className="mt-1 text-[12px] text-[#8a949e]">
            Tạo và theo dõi báo giá dịch vụ cho khách hàng.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
            <p className="text-[10px] text-[#8a949e]">
              TỔNG BÁO GIÁ
            </p>

            <p className="mt-2 text-[24px] font-bold">
              15
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
            <p className="text-[10px] text-[#8a949e]">
              CHỜ XÁC NHẬN
            </p>

            <p className="mt-2 text-[24px] font-bold">
              4
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
            <p className="text-[10px] text-[#8a949e]">
              ĐÃ XÁC NHẬN
            </p>

            <p className="mt-2 text-[24px] font-bold">
              8
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
            <p className="text-[10px] text-[#8a949e]">
              ĐÃ GỬI
            </p>

            <p className="mt-2 text-[24px] font-bold">
              3
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#e1e4e7] bg-white p-5">
          <div>
            <p className="text-[13px] font-semibold">
              Danh sách báo giá
            </p>

            <p className="mt-1 text-[11px] text-[#8a949e]">
              Quản lý các báo giá đã tạo cho khách hàng.
            </p>
          </div>

          <button className="rounded-lg bg-[#20252b] px-4 py-2.5 text-[12px] font-semibold text-white">
            + Tạo báo giá
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3">
            <input
              placeholder="Tên khách hàng hoặc biển số"
              className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none"
            />

            <select className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none">
              <option>Tất cả trạng thái</option>
              <option>Chờ xác nhận</option>
              <option>Đã xác nhận</option>
              <option>Đã gửi</option>
            </select>

            <input
              type="date"
              className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none"
            />

            <button className="rounded-lg bg-[#20252b] px-5 py-2.5 text-[12px] font-semibold text-white">
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-5 py-4">
            <p className="text-[13px] font-semibold">
              Danh sách báo giá
            </p>

            <p className="text-[11px] text-[#8a949e]">
              15 báo giá
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e1e4e7] bg-[#fafbfc] text-left">
                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  STT
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  KHÁCH HÀNG
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  XE
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  DỊCH VỤ
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  GIÁ TRỊ
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  NGÀY
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  TRẠNG THÁI
                </th>

                <th className="px-5 py-3 text-[10px] text-[#8a949e]">
                  THAO TÁC
                </th>
              </tr>
            </thead>

            <tbody>
              {quotations.map((quotation, index) => (
                <tr
                  key={quotation.id}
                  className="border-b border-[#eef0f2] last:border-0"
                >
                  <td className="px-5 py-4 text-[12px]">
                    {index + 1}
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-[12px] font-semibold">
                      {quotation.customer}
                    </p>

                    <p className="mt-1 text-[10px] text-[#8a949e]">
                      {quotation.phone}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {quotation.car}
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {quotation.service}
                  </td>

                  <td className="px-5 py-4 text-[12px] font-semibold">
                    {quotation.amount}
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {quotation.date}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        quotation.status === "Chờ xác nhận"
                          ? "bg-[#fff4d6] text-[#9a6b00]"
                          : quotation.status === "Đã xác nhận"
                            ? "bg-[#e7f6ec] text-[#237a3b]"
                            : "bg-[#e8f1ff] text-[#2563a8]"
                      }`}
                    >
                      {quotation.status}
                    </span>
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
      </main>

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

export default Quotation;