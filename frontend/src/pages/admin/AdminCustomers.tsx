import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  cars: number;
  status: "Hoạt động" | "Tạm khóa";
};

const initialCustomers: Customer[] = [
  {
    id: "KH001",
    name: "Nguyễn Văn An",
    phone: "0901234567",
    email: "nguyenan@gmail.com",
    cars: 2,
    status: "Hoạt động",
  },
  {
    id: "KH002",
    name: "Trần Thị Bình",
    phone: "0912345678",
    email: "tranbinh@gmail.com",
    cars: 1,
    status: "Hoạt động",
  },
  {
    id: "KH003",
    name: "Lê Minh Cường",
    phone: "0987654321",
    email: "lecuong@gmail.com",
    cars: 3,
    status: "Tạm khóa",
  },
  {
    id: "KH004",
    name: "Phạm Thu Hà",
    phone: "0934567890",
    email: "phamha@gmail.com",
    cars: 1,
    status: "Hoạt động",
  },
];

function AdminCustomers() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.toLowerCase();

    return (
      customer.id.toLowerCase().includes(keyword) ||
      customer.name.toLowerCase().includes(keyword) ||
      customer.phone.includes(keyword) ||
      customer.email.toLowerCase().includes(keyword)
    );
  });

  const handleToggleStatus = (id: string) => {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              status:
                customer.status === "Hoạt động"
                  ? "Tạm khóa"
                  : "Hoạt động",
            }
          : customer,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdminSidebar />

      <div className="lg:ml-[250px]">
        <AdminTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
                QUẢN TRỊ HỆ THỐNG / KHÁCH HÀNG
              </p>

              <h1 className="text-3xl font-bold tracking-tight">
                Quản lý khách hàng
              </h1>

              <p className="mt-2 text-xs text-[#66717C]">
                Theo dõi và quản lý thông tin khách hàng trong hệ thống.
              </p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Tổng khách hàng
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {customers.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Đang hoạt động
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {
                    customers.filter(
                      (customer) => customer.status === "Hoạt động",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A949E]">
                  Xe đã đăng ký
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {customers.reduce(
                    (total, customer) => total + customer.cars,
                    0,
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    DANH SÁCH
                  </p>

                  <h2 className="mt-1 text-base font-bold">
                    Khách hàng
                  </h2>
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm tên, SĐT, email..."
                  className="w-full rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-4 py-2.5 text-xs outline-none transition focus:border-[#D6A85F] md:w-[280px]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] text-left">
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Mã KH
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Khách hàng
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Liên hệ
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Số xe
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Trạng thái
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-[#F0F1EF] last:border-b-0"
                      >
                        <td className="px-3 py-4 text-xs font-semibold">
                          {customer.id}
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-xs font-semibold">
                            {customer.name}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-xs text-[#66717C]">
                            {customer.phone}
                          </p>
                          <p className="mt-1 text-[10px] text-[#8A949E]">
                            {customer.email}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-xs text-[#66717C]">
                          {customer.cars} xe
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${
                              customer.status === "Hoạt động"
                                ? "bg-[#EEF7EF] text-[#3F7047]"
                                : "bg-[#FDEEEE] text-[#A24A4A]"
                            }`}
                          >
                            {customer.status}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(customer.id)
                            }
                            className="cursor-pointer rounded-xl border border-[#E1E4E6] px-3 py-2 text-[10px] font-semibold text-[#66717C] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                          >
                            {customer.status === "Hoạt động"
                              ? "Khóa"
                              : "Mở khóa"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCustomers.length === 0 && (
                  <div className="py-10 text-center text-xs text-[#8A949E]">
                    Không tìm thấy khách hàng.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminCustomers;