import { Link } from "react-router-dom";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main className="p-6 lg:p-8">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A85F]">
              DASHBOARD
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#20252B]">
              Xin chào, Tên người dùng
            </h1>
            <p className="mt-2 text-sm text-[#66717C]">
              Theo dõi xe, lịch hẹn và tình trạng sửa chữa của bạn.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs text-[#66717C]">Xe của tôi</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-bold text-[#20252B]">2</p>
                <span className="rounded-lg bg-[#F3E8D2] px-3 py-2 text-[10px] font-semibold text-[#3A3020]">
                  Xe
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs text-[#66717C]">Lịch hẹn</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-bold text-[#20252B]">2</p>
                <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[10px] font-semibold text-[#66717C]">
                  Lịch
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs text-[#66717C]">Đang sửa</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-bold text-[#20252B]">1</p>
                <span className="rounded-lg bg-[#F3E8D2] px-3 py-2 text-[10px] font-semibold text-[#3A3020]">
                  Xe
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs text-[#66717C]">Báo giá</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-bold text-[#20252B]">1</p>
                <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[10px] font-semibold text-[#66717C]">
                  Chờ duyệt
                </span>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    LỊCH HẸN GẦN NHẤT
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-[#20252B]">
                    Bảo dưỡng định kỳ
                  </h2>
                </div>

                <span className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
                  Chờ xác nhận
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] text-[#8A949E]">Mã lịch hẹn</p>
                  <p className="mt-1 text-sm font-semibold text-[#20252B]">
                    LH-001
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-[#8A949E]">Xe</p>
                  <p className="mt-1 text-sm font-semibold text-[#20252B]">
                    Toyota Vios
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-[#8A949E]">Ngày hẹn</p>
                  <p className="mt-1 text-sm font-semibold text-[#20252B]">
                    24/06/2026
                  </p>
                </div>
              </div>

              <Link
                to="/appointments"
                className="mt-6 inline-flex rounded-xl bg-[#1F2933] px-5 py-3 text-[10px] font-semibold text-white transition hover:bg-[#151D24]"
              >
                Xem lịch hẹn
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                TIẾN ĐỘ SỬA CHỮA
              </p>

              <h2 className="mt-2 text-lg font-bold text-[#20252B]">
                Toyota Vios
              </h2>

              <p className="mt-1 text-xs text-[#66717C]">
                Bảo dưỡng định kỳ · SC-001
              </p>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] text-[#66717C]">
                    Tiến độ hoàn thành
                  </span>
                  <span className="text-xs font-bold text-[#20252B]">70%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#ECEEED]">
                  <div className="h-full w-[70%] rounded-full bg-[#D6A85F]" />
                </div>
              </div>

              <Link
                to="/repair-status"
                className="mt-6 inline-flex text-[10px] font-semibold text-[#20252B] underline underline-offset-4"
              >
                Xem tình trạng sửa chữa
              </Link>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.5fr]">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                TRUY CẬP NHANH
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  to="/booking"
                  className="rounded-xl border border-[#E1E4E6] p-4 transition hover:bg-[#F7F7F5]"
                >
                  <p className="text-sm font-semibold text-[#20252B]">
                    Đặt lịch
                  </p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Tạo lịch hẹn mới
                  </p>
                </Link>

                <Link
                  to="/cars"
                  className="rounded-xl border border-[#E1E4E6] p-4 transition hover:bg-[#F7F7F5]"
                >
                  <p className="text-sm font-semibold text-[#20252B]">
                    Xe của tôi
                  </p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Quản lý xe
                  </p>
                </Link>

                <Link
                  to="/quotation"
                  className="rounded-xl border border-[#E1E4E6] p-4 transition hover:bg-[#F7F7F5]"
                >
                  <p className="text-sm font-semibold text-[#20252B]">
                    Báo giá
                  </p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Kiểm tra báo giá
                  </p>
                </Link>

                <Link
                  to="/invoices"
                  className="rounded-xl border border-[#E1E4E6] p-4 transition hover:bg-[#F7F7F5]"
                >
                  <p className="text-sm font-semibold text-[#20252B]">
                    Hóa đơn
                  </p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Xem hóa đơn
                  </p>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-[#1F2933] p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    BÁO GIÁ CẦN DUYỆT
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-white">
                    Bảo dưỡng định kỳ
                  </h2>

                  <p className="mt-2 text-xs text-[#AEB8C1]">
                    Toyota Vios · 30A-123.45 · BG-001
                  </p>
                </div>

                <span className="rounded-full bg-[#D6A85F] px-3 py-1.5 text-[10px] font-bold text-[#3A3020]">
                  Chờ duyệt
                </span>
              </div>

              <div className="mt-7 flex items-end justify-between border-t border-[#3A4650] pt-5">
                <div>
                  <p className="text-[10px] text-[#8F9BA6]">Tổng báo giá</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    3.850.000đ
                  </p>
                </div>

                <Link
                  to="/quotation"
                  className="rounded-xl bg-[#D6A85F] px-5 py-3 text-[10px] font-bold text-[#3A3020] transition hover:bg-[#E4C17E]"
                >
                  Xem báo giá
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                  HỖ TRỢ KHÁCH HÀNG
                </p>
                <h2 className="mt-2 text-lg font-bold text-[#20252B]">
                  Bạn cần hỗ trợ?
                </h2>
                <p className="mt-1 text-xs text-[#66717C]">
                  Liên hệ CarService nếu bạn cần tư vấn về lịch hẹn hoặc xe.
                </p>
              </div>

              <Link
                to="/contact"
                className="rounded-xl border border-[#1F2933] px-5 py-3 text-center text-[10px] font-semibold text-[#1F2933] transition hover:bg-[#1F2933] hover:text-white"
              >
                Liên hệ hỗ trợ
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;