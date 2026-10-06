import { useState } from "react";
import { Link } from "react-router-dom";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

const customers = [
  {
    id: 1,
    name: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    email: "nguyentienhien@gmail.com",
    address: "Cầu Giấy, Hà Nội",
  },
  {
    id: 2,
    name: "Phùng Đức Anh",
    phone: "0912345678",
    email: "phungducanh@gmail.com",
    address: "Cổ Nhuế, Hà Nội",
  },
  {
    id: 3,
    name: "Bùi Việt",
    phone: "0987654321",
    email: "buiviet@gmail.com",
    address: "Đống Đa, Hà Nội",
  },
];

function Customers() {
  const [search, setSearch] = useState("");
  const [address, setAddress] = useState("");

  const filteredCustomers = customers.filter((customer) => {
    const matchSearch =
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search) ||
      customer.email.toLowerCase().includes(search.toLowerCase());

    const matchAddress =
      address === "" || customer.address === address;

    return matchSearch && matchAddress;
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
                GARA / KHÁCH HÀNG
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Quản lý khách hàng
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Tìm kiếm và quản lý thông tin khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  + Thêm khách hàng
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  KHÁCH HÀNG
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {customers.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng số khách hàng
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[22px] font-bold text-[#20252b]">
                  {filteredCustomers.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Khách hàng đang hiển thị
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9aa1a7]">
                  VAI TRÒ
                </p>

                <p className="mt-3 text-[14px] font-bold text-[#20252b]">
                  Cố vấn dịch vụ
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Không gian làm việc
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252b]">
                  Tìm kiếm khách hàng
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo tên, số điện thoại, email hoặc địa chỉ.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tên, số điện thoại hoặc email"
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                />

                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#1f2933]"
                >
                  <option value="">Tất cả địa chỉ</option>
                  <option value="Cầu Giấy, Hà Nội">
                    Cầu Giấy, Hà Nội
                  </option>
                  <option value="Cổ Nhuế, Hà Nội">
                    Cổ Nhuế, Hà Nội
                  </option>
                  <option value="Đống Đa, Hà Nội">
                    Đống Đa, Hà Nội
                  </option>
                </select>

                <button
                  type="button"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Tìm kiếm
                </button>
              </div>

              <p className="mt-3 text-[10px] text-[#8a9299]">
                Có thể tìm kiếm nhanh theo số điện thoại của khách hàng.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-5">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252b]">
                    Danh sách khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Thông tin khách hàng đang quản lý
                  </p>
                </div>

                <p className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredCustomers.length} khách hàng
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e1e4e6] bg-[#f7f7f5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        STT
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        SỐ ĐIỆN THOẠI
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        EMAIL
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        ĐỊA CHỈ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8a9299]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="border-b border-[#eef0f2] last:border-0 hover:bg-[#fafbfb]"
                      >
                        <td className="px-5 py-4 text-[11px] text-[#66717c]">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold text-[#20252b]">
                            {customer.name}
                          </p>

                          <p className="mt-1 text-[9px] text-[#8a9299]">
                            Khách hàng
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {customer.phone}
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {customer.email}
                        </td>

                        <td className="px-5 py-4 text-[11px] text-[#374151]">
                          {customer.address}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to="/advisor/customer-cars"
                            className="inline-flex rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#1f2933] hover:bg-[#f3f4f2]"
                          >
                            Xe
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCustomers.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold text-[#20252b]">
                    Không tìm thấy khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Thử thay đổi từ khóa hoặc bộ lọc địa chỉ.
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

export default Customers;