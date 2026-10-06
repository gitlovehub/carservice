import { useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Appointments() {
  const location = useLocation();
  const isCustomerPage = location.pathname === "/customer/appointments";

  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");

  const appointments = [
    {
      id: "LH-001",
      car: "Toyota Vios",
      service: "Bảo dưỡng định kỳ",
      date: "24/06/2026",
      status: "Chờ xác nhận",
    },
    {
      id: "LH-002",
      car: "Honda City",
      service: "Kiểm tra tổng quát",
      date: "25/06/2026",
      status: "Đã xác nhận",
    },
  ];

  const filteredAppointments = appointments.filter((appointment) => {
    const matchStatus =
      status === "" || appointment.status === status;

    const matchKeyword =
      keyword === "" ||
      appointment.id.toLowerCase().includes(keyword.toLowerCase()) ||
      appointment.car.toLowerCase().includes(keyword.toLowerCase()) ||
      appointment.service.toLowerCase().includes(keyword.toLowerCase());

    return matchStatus && matchKeyword;
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
              {isCustomerPage
                ? "KHÁCH HÀNG / LỊCH HẸN"
                : "CARSERVICE / LỊCH HẸN"}
            </p>

            <div className="mt-3">
              <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Lịch hẹn
              </h1>

              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#66717C]">
                Quản lý và theo dõi các lịch hẹn bảo dưỡng, sửa chữa xe.
              </p>
            </div>
          </div>

          <div className="mb-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    TỔNG LỊCH HẸN
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {appointments.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2933] text-lg text-white">
                  ▣
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Tổng số lịch hẹn hiện có.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    KẾT QUẢ HIỆN TẠI
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#20252B]">
                    {filteredAppointments.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                  ✓
                </div>
              </div>

              <p className="mt-3 text-[10px] text-[#66717C]">
                Số lịch hẹn phù hợp với bộ lọc.
              </p>
            </div>
          </div>

          <div className="mb-7 overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="border-b border-[#E1E4E6] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                FILTER
              </p>

              <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                Tìm kiếm lịch hẹn
              </h2>

              <p className="mt-1 text-[10px] text-[#66717C]">
                Tìm kiếm theo mã lịch hẹn, xe hoặc dịch vụ.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-semibold text-[#20252B]">
                  Từ khóa
                </label>

                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Nhập mã lịch hẹn, tên xe..."
                  className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition placeholder:text-[#9AA3AA] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold text-[#20252B]">
                  Trạng thái
                </label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Chờ xác nhận">Chờ xác nhận</option>
                  <option value="Đã xác nhận">Đã xác nhận</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  APPOINTMENTS
                </p>

                <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                  Danh sách lịch hẹn
                </h2>
              </div>

              <span className="w-fit rounded-full bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                {filteredAppointments.length} kết quả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#FAFAF9] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    <th className="px-6 py-4">STT</th>
                    <th className="px-6 py-4">Mã lịch hẹn</th>
                    <th className="px-6 py-4">Xe</th>
                    <th className="px-6 py-4">Dịch vụ</th>
                    <th className="px-6 py-4">Ngày hẹn</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAppointments.map((appointment, index) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-[#EEF0F2] last:border-b-0 transition hover:bg-[#FAFAF9]"
                    >
                      <td className="px-6 py-5 text-[11px] text-[#8A949E]">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-[11px] font-bold text-[#20252B]">
                          {appointment.id}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                            🚗
                          </div>

                          <div>
                            <p className="text-[12px] font-bold text-[#20252B]">
                              {appointment.car}
                            </p>

                            <p className="mt-1 text-[9px] text-[#8A949E]">
                              Phương tiện cá nhân
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-[11px] text-[#66717C]">
                        {appointment.service}
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-[11px] font-semibold text-[#20252B]">
                          {appointment.date}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${
                            appointment.status === "Đã xác nhận"
                              ? "bg-[#F3E8D2] text-[#3A3020]"
                              : "bg-[#F3F4F2] text-[#66717C]"
                          }`}
                        >
                          {appointment.status}
                        </span>
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
                            Hủy lịch
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAppointments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F2] text-sm text-[#66717C]">
                          —
                        </div>

                        <p className="mt-4 text-xs font-semibold text-[#20252B]">
                          Không tìm thấy lịch hẹn
                        </p>

                        <p className="mt-1 text-[10px] text-[#8A949E]">
                          Thử thay đổi từ khóa hoặc trạng thái tìm kiếm.
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
                  Quản lý lịch hẹn
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[#66717C]">
                  Bạn có thể theo dõi trạng thái lịch hẹn và thông tin dịch vụ
                  đã đăng ký tại CarService.
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

export default Appointments;