import { Link } from "react-router-dom";
import Header from "../components/Header";

function Home() {
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
              Khách hàng / Trang chủ
            </p>

            <h2 className="text-[28px] font-bold tracking-[-0.5px]">
              Chăm sóc xe của bạn
            </h2>

            <p className="mt-2 text-[12px] text-[#7b858f]">
              Theo dõi xe, lịch hẹn và dịch vụ bảo dưỡng tại CarService.
            </p>
          </div>

          <Link
            to="/booking"
            className="flex items-center gap-2 rounded-lg bg-[#20252b] px-5 py-3 text-[11px] font-semibold text-white hover:bg-[#111519]"
          >
            <span className="text-base">+</span>
            Đặt lịch bảo dưỡng
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-xl border border-[#e1e4e7] bg-white p-7">
            <p className="mb-5 text-[10px] uppercase tracking-[0.08em] text-[#89939d]">
              Dịch vụ của bạn
            </p>

            <h3 className="max-w-[430px] text-[23px] font-bold leading-8">
              Mọi thông tin về xe, tại một nơi.
            </h3>

            <p className="mt-2 max-w-[430px] text-[11px] leading-5 text-[#818b95]">
              Quản lý xe, theo dõi lịch hẹn và tiến độ sửa chữa một cách dễ
              dàng.
            </p>

            <Link
              to="/cars"
              className="mt-10 inline-flex items-center gap-2 text-[11px] font-semibold"
            >
              Xem xe của tôi
              <span className="text-base">→</span>
            </Link>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white px-5 py-4">
            <h3 className="mb-3 text-[12px] font-bold">
              Lối tắt
            </h3>

            <div className="border-t border-[#edf0f2]">
              <Link
                to="/services"
                className="flex h-[46px] items-center justify-between border-b border-[#edf0f2]"
              >
                <span className="text-[11px] text-[#59646e]">
                  Dịch vụ
                </span>

                <span className="text-[#929ba4]">
                  →
                </span>
              </Link>

              <Link
                to="/booking"
                className="flex h-[46px] items-center justify-between border-b border-[#edf0f2]"
              >
                <span className="text-[11px] text-[#59646e]">
                  Đặt lịch
                </span>

                <span className="text-[#929ba4]">
                  →
                </span>
              </Link>

              <Link
                to="/appointments"
                className="flex h-[46px] items-center justify-between border-b border-[#edf0f2]"
              >
                <span className="text-[11px] text-[#59646e]">
                  Lịch hẹn
                </span>

                <span className="text-[#929ba4]">
                  →
                </span>
              </Link>

              <Link
                to="/cars"
                className="flex h-[46px] items-center justify-between"
              >
                <span className="text-[11px] text-[#59646e]">
                  Xe của tôi
                </span>

                <span className="text-[#929ba4]">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5e8eb] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-[15px]">
                ⚒
              </span>

              <h3 className="text-[12px] font-bold">
                Theo dõi dịch vụ
              </h3>
            </div>

            <span className="text-[9px] uppercase tracking-wide text-[#9aa2aa]">
              Use case khách hàng
            </span>
          </div>

          <div className="grid grid-cols-2">
            <Link
              to="/repair-status"
              className="flex items-center justify-between border-b border-r border-[#e5e8eb] px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Trạng thái phiếu sửa chữa
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>

            <Link
              to="/quotation"
              className="flex items-center justify-between border-b border-[#e5e8eb] px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Xem báo giá
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>

            <Link
              to="/quotation"
              className="flex items-center justify-between border-b border-r border-[#e5e8eb] px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Duyệt / Từ chối báo giá
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>

            <Link
              to="/payment"
              className="flex items-center justify-between border-b border-[#e5e8eb] px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Thanh toán
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>

            <Link
              to="/invoices"
              className="flex items-center justify-between border-r border-[#e5e8eb] px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Xem hóa đơn
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>

            <Link
              to="/reviews"
              className="flex items-center justify-between px-6 py-4"
            >
              <span className="text-[10px] text-[#59646e]">
                Đánh giá dịch vụ
              </span>

              <span className="text-[#929ba4]">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#e2e5e8] bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-6">
          <p className="text-[9px] text-[#929ba4]">
            © 2026 CarService · Quản lý dịch vụ ô tô
          </p>

          <p className="text-[9px] text-[#929ba4]">
            Dịch vụ bảo dưỡng và sửa chữa ô tô
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;