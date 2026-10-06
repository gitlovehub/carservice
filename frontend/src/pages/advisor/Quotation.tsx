import { useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

const quotations = [
  {
    id: "BG-001",
    customer: "Nguyễn Tiến Hiền",
    phone: "0901234567",
    car: "Toyota Camry - 30A-12345",
    service: "Bảo dưỡng định kỳ",
    date: "03/10/2026",
    total: "3.850.000 đ",
    status: "Chờ duyệt",
  },
  {
    id: "BG-002",
    customer: "Phùng Đức Anh",
    phone: "0912345678",
    car: "Honda Civic - 29A-67890",
    service: "Kiểm tra và thay má phanh",
    date: "03/10/2026",
    total: "2.450.000 đ",
    status: "Đã duyệt",
  },
  {
    id: "BG-003",
    customer: "Bùi Việt",
    phone: "0987654321",
    car: "Mazda CX-5 - 30F-11111",
    service: "Sửa chữa điều hòa",
    date: "02/10/2026",
    total: "4.200.000 đ",
    status: "Đã gửi",
  },
];

function Quotation() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filteredQuotations = quotations.filter((quotation) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      quotation.id.toLowerCase().includes(keyword) ||
      quotation.customer.toLowerCase().includes(keyword) ||
      quotation.phone.includes(search) ||
      quotation.car.toLowerCase().includes(keyword) ||
      quotation.service.toLowerCase().includes(keyword);

    const matchStatus =
      status === "" || quotation.status === status;

    return matchSearch && matchStatus;
  });

  const getStatusClass = (value: string) => {
    if (value === "Đã duyệt") {
      return "bg-[#eef7f0] text-[#39734a]";
    }

    if (value === "Chờ duyệt") {
      return "bg-[#f5f1e8] text-[#876d35]";
    }

    return "bg-[#eef0f2] text-[#5f6871]";
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                GARA / BÁO GIÁ
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Quản lý báo giá
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Tạo, theo dõi và quản lý báo giá dịch vụ sửa chữa cho khách hàng.
                  </p>
                </div>

                <button className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151d24]">
                  + Tạo báo giá
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  TỔNG BÁO GIÁ
                </p>

                <p className="mt-2 text-[22px] font-bold text-[#20252b]">
                  10
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Báo giá trong hệ thống
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  CHỜ DUYỆT
                </p>

                <p className="mt-2 text-[22px] font-bold text-[#20252b]">
                  2
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Chờ khách hàng duyệt
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐÃ DUYỆT
                </p>

                <p className="mt-2 text-[22px] font-bold text-[#20252b]">
                  6
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Báo giá đã được duyệt
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  GIÁ TRỊ
                </p>

                <p className="mt-2 text-[22px] font-bold text-[#20252b]">
                  28,5M
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng giá trị báo giá
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="mb-4">
                <p className="text-[13px] font-semibold text-[#20252b]">
                  Tìm kiếm báo giá
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tìm theo khách hàng, biển số, mã báo giá hoặc dịch vụ.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Khách hàng, biển số hoặc mã báo giá..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1]"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Đã gửi">Đã gửi</option>
                  <option value="Đã duyệt">Đã duyệt</option>
                </select>

                <button className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]">
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="flex items-center justify-between border-b border-[#e1e4e6] px-5 py-4">
                <div>
                  <p className="text-[13px] font-semibold text-[#20252b]">
                    Danh sách báo giá
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Báo giá dịch vụ dành cho khách hàng
                  </p>
                </div>

                <p className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredQuotations.length} báo giá
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e1e4e6] bg-[#fafbfc] text-left">
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        MÃ BÁO GIÁ
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        KHÁCH HÀNG
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        XE
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        DỊCH VỤ
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        NGÀY TẠO
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        TỔNG TIỀN
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        TRẠNG THÁI
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold text-[#8a9299]">
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr
                        key={quotation.id}
                        className="border-b border-[#eef0f2] last:border-0 hover:bg-[#fafbfc]"
                      >
                        <td className="px-5 py-4">
                          <p className="text-[11px] font-bold text-[#20252b]">
                            {quotation.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-semibold text-[#20252b]">
                            {quotation.customer}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8a9299]">
                            {quotation.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[12px] font-semibold text-[#374151]">
                            {quotation.car}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[12px] text-[#374151]">
                          {quotation.service}
                        </td>

                        <td className="px-5 py-4 text-[12px] text-[#374151]">
                          {quotation.date}
                        </td>

                        <td className="px-5 py-4 text-[12px] font-bold text-[#20252b]">
                          {quotation.total}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${getStatusClass(
                              quotation.status
                            )}`}
                          >
                            {quotation.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[11px] font-semibold text-[#374151] transition hover:border-[#aeb8c1] hover:bg-[#f6f7f8]">
                              Chi tiết
                            </button>

                            <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[11px] font-semibold text-[#374151] transition hover:border-[#aeb8c1] hover:bg-[#f6f7f8]">
                              Sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredQuotations.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold text-[#20252b]">
                    Không tìm thấy báo giá
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Thử thay đổi từ khóa hoặc trạng thái.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f1ef] text-xs font-bold text-[#374151]">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#20252b]">
                    Quy trình báo giá
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Cố vấn tạo báo giá dựa trên tình trạng xe, gửi cho khách
                    hàng và theo dõi trạng thái phê duyệt trước khi thực hiện
                    sửa chữa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Quotation;