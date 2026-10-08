import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "Chờ xác nhận",
  ).length;
  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status === "Đã xác nhận",
  ).length;

  const getStatusStyle = (appointmentStatus: string) => {
    if (appointmentStatus === "Đã xác nhận") {
      return "bg-[#EAF4EC] text-[#3F6B47] border-[#CFE5D3]";
    }

    if (appointmentStatus === "Chờ xác nhận") {
      return "bg-[#F8F1E3] text-[#8A6A32] border-[#EAD8B4]";
    }

    return "bg-[#F3F4F2] text-[#66717C] border-[#E1E4E6]";
  };

  const content = (
    <>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / LỊCH HẸN
          </p>

          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
            Lịch hẹn của tôi
          </h1>

          <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
            Theo dõi các lịch hẹn bảo dưỡng và sửa chữa xe của bạn.
          </p>
        </div>

        <Link
          to="/customer/booking"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[12px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
        >
          <span className="transition duration-300 group-hover:translate-x-0.5">
            +
          </span>
          Đặt lịch mới
        </Link>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                TỔNG LỊCH HẸN
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#20252B]">
                {totalAppointments}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Lịch hẹn đã tạo
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
              ▣
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                CHỜ XÁC NHẬN
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#8A6A32]">
                {pendingAppointments}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Đang chờ CarService xử lý
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F1E3] text-sm text-[#8A6A32] transition duration-300 group-hover:scale-105">
              ⏱
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                ĐÃ XÁC NHẬN
              </p>

              <p className="mt-2 text-[25px] font-bold text-[#3F6B47]">
                {confirmedAppointments}
              </p>

              <p className="mt-1 text-[11px] text-[#66717C]">
                Lịch hẹn đã được xác nhận
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4EC] text-sm text-[#3F6B47] transition duration-300 group-hover:scale-105">
              ✓
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_10px_26px_rgba(31,41,51,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
              Tìm kiếm
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#8A949E]">
                ⌕
              </span>

              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mã lịch, tên xe hoặc dịch vụ..."
                className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] py-3 pl-10 pr-4 text-[12px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              />
            </div>
          </div>

          <div className="w-full lg:w-[230px]">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
              Trạng thái
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">Chờ xác nhận</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#E5E7E9] pt-4">
          <p className="text-[11px] text-[#8A949E]">
            Kết quả tìm kiếm
          </p>

          <span className="rounded-full bg-[#F3E8D2] px-3 py-1 text-[10px] font-bold text-[#6F5527]">
            {filteredAppointments.length} lịch hẹn
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
        <div className="border-b border-[#E5E7E9] px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
            DANH SÁCH
          </p>

          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[17px] font-bold text-[#20252B]">
              Lịch hẹn gần đây
            </h2>

            <p className="text-[11px] text-[#8A949E]">
              {filteredAppointments.length} kết quả
            </p>
          </div>
        </div>

        {filteredAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-[#E5E7E9] bg-[#FAFAF9] text-left">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    STT
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Mã lịch
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Xe
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Dịch vụ
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Ngày
                  </th>

                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Trạng thái
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map((appointment, index) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-[#EEF0F1] transition duration-200 hover:bg-[#FAFAF9]"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#8A949E]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-5">
                      <span className="font-semibold text-[12px] text-[#20252B]">
                        {appointment.id}
                      </span>
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3E8D2] text-xs text-[#3A3020] transition duration-200 hover:scale-105">
                          🚗
                        </div>

                        <span className="text-[12px] font-semibold text-[#20252B]">
                          {appointment.car}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-[12px] text-[#66717C]">
                      {appointment.service}
                    </td>

                    <td className="px-4 py-5 text-[12px] font-medium text-[#20252B]">
                      {appointment.date}
                    </td>

                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold transition duration-200 hover:-translate-y-0.5 ${getStatusStyle(
                          appointment.status,
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#66717C] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:text-[#20252B]"
                        >
                          Xem chi tiết
                        </button>

                        <button
                          type="button"
                          className="rounded-lg border border-[#E1E4E6] bg-white px-3 py-2 text-[10px] font-semibold text-[#8A949E] transition duration-200 hover:-translate-y-0.5 hover:border-[#D9B8B8] hover:bg-[#FBF5F5] hover:text-[#8A4A4A]"
                        >
                          Hủy lịch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8D2] text-lg text-[#3A3020] transition duration-300 hover:scale-110">
              ▣
            </div>

            <h3 className="mt-4 text-[15px] font-bold text-[#20252B]">
              Không tìm thấy lịch hẹn
            </h3>

            <p className="mx-auto mt-2 max-w-[430px] text-[12px] leading-5 text-[#8A949E]">
              Không có lịch hẹn nào phù hợp với điều kiện tìm kiếm hiện tại.
            </p>

            <Link
              to="/customer/booking"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)]"
            >
              + Đặt lịch mới
            </Link>
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#1F2933] bg-[#1F2933] p-6 transition duration-300 hover:shadow-[0_14px_35px_rgba(31,41,51,0.14)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              CARSERVICE
            </p>

            <h2 className="mt-1.5 text-[16px] font-bold text-white">
              Bạn muốn đặt lịch mới?
            </h2>

            <p className="mt-1.5 max-w-[650px] text-[11px] leading-5 text-[#AEB8C1]">
              Chọn xe và dịch vụ phù hợp để tạo một lịch hẹn mới.
            </p>
          </div>

          <Link
            to="/customer/booking"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D6A85F] px-5 py-3 text-[11px] font-bold text-[#1F2933] transition duration-300 hover:-translate-y-0.5 hover:bg-[#E1B873] hover:shadow-[0_10px_24px_rgba(214,168,95,0.18)]"
          >
            Đặt lịch mới
            <span className="transition duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  );

  if (!isCustomerPage) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F7F7F5]">
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            {content}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Appointments;