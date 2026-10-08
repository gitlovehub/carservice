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
    const keyword = search.toLowerCase();

    const matchSearch =
      customer.name.toLowerCase().includes(keyword) ||
      customer.phone.includes(search) ||
      customer.email.toLowerCase().includes(keyword);

    const matchAddress =
      address === "" || customer.address === address;

    return matchSearch && matchAddress;
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
                GARA / KHÁCH HÀNG
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252B]">
                    Quản lý khách hàng
                  </h2>

                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Tìm kiếm và quản lý thông tin khách hàng tại gara.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  + Thêm khách hàng
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KHÁCH HÀNG
                </p>

                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {customers.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tổng số khách hàng
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  KẾT QUẢ
                </p>

                <p className="mt-3 text-[24px] font-bold text-[#20252B]">
                  {filteredCustomers.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Khách hàng đang hiển thị
                </p>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
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

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_8px_26px_rgba(31,41,51,0.06)]">
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Tìm kiếm khách hàng
                </p>

                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Tìm theo tên, số điện thoại, email hoặc địa chỉ.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tên, số điện thoại hoặc email"
                    className="w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] text-[#20252B] outline-none transition duration-200 placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
                  />
                </div>

                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] text-[#20252B] outline-none transition duration-200 focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
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
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-md"
                >
                  Tìm kiếm
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-[#8A949E]">
                  Có thể tìm kiếm nhanh theo số điện thoại của khách hàng.
                </p>

                {(search || address) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setAddress("");
                    }}
                    className="text-[10px] font-semibold text-[#66717C] transition duration-200 hover:text-[#20252B]"
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
                    Danh sách khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Thông tin khách hàng đang quản lý
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {filteredCustomers.length} khách hàng
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        STT
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        SỐ ĐIỆN THOẠI
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        EMAIL
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        ĐỊA CHỈ
                      </th>

                      <th className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="border-b border-[#EEF0F2] last:border-0 transition duration-200 hover:bg-[#FAFAF9]"
                      >
                        <td className="px-5 py-4 text-[11px] text-[#66717C]">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E8D2] text-[10px] font-bold text-[#5B4630]">
                              {customer.name
                                .split(" ")
                                .slice(-1)[0]
                                .charAt(0)}
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold text-[#20252B]">
                                {customer.name}
                              </p>

                              <p className="mt-1 text-[9px] text-[#8A949E]">
                                Khách hàng
                              </p>
                            </div>
                          </div>
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
                            className="inline-flex rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold text-[#374151] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F2E9]"
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
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-[#66717C]">
                    <span className="text-lg">⌕</span>
                  </div>

                  <p className="mt-4 text-[12px] font-semibold text-[#20252B]">
                    Không tìm thấy khách hàng
                  </p>

                  <p className="mt-1 text-[10px] text-[#8A949E]">
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