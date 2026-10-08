import { Link } from "react-router-dom";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  KHÁCH HÀNG / TỔNG QUAN
                </p>

                <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                  Xin chào, Tên người dùng
                </h1>

                <p className="mt-2 text-[13px] leading-5 text-[#66717C]">
                  Theo dõi xe, lịch hẹn và tình trạng sửa chữa của bạn.
                </p>
              </div>

              <Link
                to="/customer/booking"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
              >
                <span className="text-sm">＋</span>
                Đặt lịch mới
              </Link>
            </div>

            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Link
                to="/customer/cars"
                className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition hover:-translate-y-0.5 hover:border-[#D6A85F]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      XE CỦA TÔI
                    </p>

                    <p className="mt-3 text-[28px] font-bold tracking-[-0.5px] text-[#20252B]">
                      2
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                    🚗
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Số xe đang quản lý.
                </p>

                <p className="mt-4 text-[11px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                  Xem xe của tôi →
                </p>
              </Link>

              <Link
                to="/customer/appointments"
                className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition hover:-translate-y-0.5 hover:border-[#D6A85F]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      LỊCH HẸN
                    </p>

                    <p className="mt-3 text-[28px] font-bold tracking-[-0.5px] text-[#20252B]">
                      2
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                    ▣
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Tổng số lịch hẹn hiện có.
                </p>

                <p className="mt-4 text-[11px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                  Xem lịch hẹn →
                </p>
              </Link>

              <Link
                to="/repair-status"
                className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition hover:-translate-y-0.5 hover:border-[#D6A85F]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      ĐANG SỬA
                    </p>

                    <p className="mt-3 text-[28px] font-bold tracking-[-0.5px] text-[#20252B]">
                      1
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white">
                    🔧
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Xe đang được bảo dưỡng.
                </p>

                <p className="mt-4 text-[11px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                  Theo dõi sửa chữa →
                </p>
              </Link>

              <Link
                to="/quotation"
                className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition hover:-translate-y-0.5 hover:border-[#D6A85F]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                      BÁO GIÁ
                    </p>

                    <p className="mt-3 text-[28px] font-bold tracking-[-0.5px] text-[#20252B]">
                      1
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020]">
                    ₫
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[#66717C]">
                  Báo giá đang chờ duyệt.
                </p>

                <p className="mt-4 text-[11px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                  Xem báo giá →
                </p>
              </Link>
            </section>

            <section className="mb-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <div className="border-b border-[#E5E7E9] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    LỊCH HẸN GẦN NHẤT
                  </p>

                  <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-[17px] font-bold text-[#20252B]">
                      Bảo dưỡng định kỳ
                    </h2>

                    <span className="w-fit rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
                      Chờ xác nhận
                    </span>
                  </div>
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-[#8A949E]">
                      Mã lịch hẹn
                    </p>

                    <p className="mt-1 text-[12px] font-bold text-[#20252B]">
                      LH-001
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-[#8A949E]">
                      Xe
                    </p>

                    <p className="mt-1 text-[12px] font-bold text-[#20252B]">
                      Toyota Vios
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-[#8A949E]">
                      Ngày hẹn
                    </p>

                    <p className="mt-1 text-[12px] font-bold text-[#20252B]">
                      24/06/2026
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7E9] px-6 py-5">
                  <Link
                    to="/customer/appointments"
                    className="inline-flex cursor-pointer rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                  >
                    Xem lịch hẹn
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  TIẾN ĐỘ SỬA CHỮA
                </p>

                <div className="mt-1.5 flex items-center justify-between gap-4">
                  <h2 className="text-[17px] font-bold text-[#20252B]">
                    Toyota Vios
                  </h2>

                  <span className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
                    70%
                  </span>
                </div>

                <p className="mt-1 text-[12px] text-[#66717C]">
                  Bảo dưỡng định kỳ · SC-001
                </p>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#66717C]">
                      Tiến độ hoàn thành
                    </span>

                    <span className="text-[11px] font-bold text-[#20252B]">
                      70%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                    <div className="h-full w-[70%] rounded-full bg-[#D6A85F]" />
                  </div>
                </div>

                <Link
                  to="/repair-status"
                  className="mt-6 inline-flex text-[11px] font-semibold text-[#20252B] underline underline-offset-4"
                >
                  Xem tình trạng sửa chữa
                </Link>
              </div>
            </section>

            <section className="mb-6 grid gap-5 xl:grid-cols-[1fr_1.5fr]">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
                <div className="border-b border-[#E5E7E9] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    TRUY CẬP NHANH
                  </p>

                  <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                    Chức năng khách hàng
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 p-6">
                  <Link
                    to="/customer/booking"
                    className="group rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                  >
                    <p className="text-[12px] font-semibold text-[#20252B]">
                      Đặt lịch
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Tạo lịch hẹn mới
                    </p>

                    <p className="mt-3 text-[10px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                      Thực hiện →
                    </p>
                  </Link>

                  <Link
                    to="/customer/cars"
                    className="group rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                  >
                    <p className="text-[12px] font-semibold text-[#20252B]">
                      Xe của tôi
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Quản lý xe
                    </p>

                    <p className="mt-3 text-[10px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                      Xem danh sách →
                    </p>
                  </Link>

                  <Link
                    to="/quotation"
                    className="group rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                  >
                    <p className="text-[12px] font-semibold text-[#20252B]">
                      Báo giá
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Kiểm tra báo giá
                    </p>

                    <p className="mt-3 text-[10px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                      Xem báo giá →
                    </p>
                  </Link>

                  <Link
                    to="/invoices"
                    className="group rounded-xl border border-[#E1E4E6] p-4 transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                  >
                    <p className="text-[12px] font-semibold text-[#20252B]">
                      Hóa đơn
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Xem hóa đơn
                    </p>

                    <p className="mt-3 text-[10px] font-semibold text-[#66717C] group-hover:text-[#20252B]">
                      Mở hóa đơn →
                    </p>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-[#1F2933] p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      BÁO GIÁ CẦN DUYỆT
                    </p>

                    <h2 className="mt-1.5 text-[17px] font-bold text-white">
                      Bảo dưỡng định kỳ
                    </h2>

                    <p className="mt-2 text-[12px] text-[#AEB8C1]">
                      Toyota Vios · 30A-123.45 · BG-001
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-[#D6A85F] px-3 py-1.5 text-[10px] font-bold text-[#3A3020]">
                    Chờ duyệt
                  </span>
                </div>

                <div className="mt-7 flex flex-col gap-5 border-t border-[#3A4650] pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] text-[#8F9BA6]">
                      Tổng báo giá
                    </p>

                    <p className="mt-1 text-xl font-bold text-white">
                      3.850.000đ
                    </p>
                  </div>

                  <Link
                    to="/quotation"
                    className="rounded-xl bg-[#D6A85F] px-5 py-3 text-center text-[11px] font-bold text-[#3A3020] transition hover:bg-[#E4C17E]"
                  >
                    Xem báo giá
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    HỖ TRỢ KHÁCH HÀNG
                  </p>

                  <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                    Bạn cần hỗ trợ?
                  </h2>

                  <p className="mt-1 text-[12px] text-[#66717C]">
                    Liên hệ CarService nếu bạn cần tư vấn về lịch hẹn hoặc xe.
                  </p>
                </div>

                <Link
                  to="/contact"
                  className="rounded-xl border border-[#1F2933] px-5 py-3 text-center text-[11px] font-semibold text-[#1F2933] transition hover:bg-[#1F2933] hover:text-white"
                >
                  Liên hệ hỗ trợ
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;