import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const shortcuts = [
  {
    title: "Dịch vụ",
    description: "Xem các dịch vụ bảo dưỡng và sửa chữa.",
    link: "/services",
  },
  {
    title: "Đặt lịch",
    description: "Đặt lịch bảo dưỡng cho xe của bạn.",
    link: "/booking",
  },
  {
    title: "Lịch hẹn",
    description: "Theo dõi các lịch hẹn đã đặt.",
    link: "/appointments",
  },
  {
    title: "Xe của tôi",
    description: "Quản lý danh sách xe của bạn.",
    link: "/cars",
  },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#243b53]">
            KHÁCH HÀNG / TRANG TỔNG QUAN
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.5px]">
                Chào mừng bạn đến với CarService
              </h1>

              <p className="mt-2 text-[12px] text-[#66717c]">
                Quản lý xe, lịch hẹn và các dịch vụ của bạn tại một nơi.
              </p>
            </div>

            <Link
              to="/booking"
              className="rounded-xl bg-[#243b53] px-5 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1d3043]"
            >
              + Đặt lịch bảo dưỡng
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[#66717c]">
              XE CỦA TÔI
            </p>

            <p className="mt-2 text-[25px] font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#66717c]">
              xe đang sử dụng
            </p>
          </div>

          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[#66717c]">
              LỊCH HẸN
            </p>

            <p className="mt-2 text-[25px] font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#66717c]">
              lịch hẹn sắp tới
            </p>
          </div>

          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[#66717c]">
              ĐANG SỬA CHỮA
            </p>

            <p className="mt-2 text-[25px] font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#66717c]">
              phiếu đang xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-[#66717c]">
              BÁO GIÁ
            </p>

            <p className="mt-2 text-[25px] font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#66717c]">
              báo giá chờ duyệt
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e3e7ea] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#243b53]">
                  LỊCH HẸN SẮP TỚI
                </p>

                <h2 className="mt-1 text-[17px] font-bold">
                  Bảo dưỡng định kỳ
                </h2>
              </div>

              <span className="rounded-lg bg-[#e3e7ea] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                Đã xác nhận
              </span>
            </div>

            <div className="grid gap-4 py-5 md:grid-cols-3">
              <div>
                <p className="text-[9px] uppercase text-[#66717c]">
                  NGÀY
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  08/10/2026
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase text-[#66717c]">
                  GIỜ
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  09:00
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase text-[#66717c]">
                  XE
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  Toyota Camry
                </p>
              </div>
            </div>

            <Link
              to="/appointments"
              className="inline-flex text-[11px] font-semibold text-[#243b53]"
            >
              Xem tất cả lịch hẹn →
            </Link>
          </div>

          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#243b53]">
              XE ĐANG ĐƯỢC XỬ LÝ
            </p>

            <h2 className="mt-2 text-[17px] font-bold">
              Toyota Camry
            </h2>

            <p className="mt-1 text-[11px] text-[#66717c]">
              30A-123.45 · Bảo dưỡng định kỳ
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] text-[#66717c]">
                  Tiến độ sửa chữa
                </span>

                <span className="text-[11px] font-bold text-[#243b53]">
                  70%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#e3e7ea]">
                <div
                  className="h-full rounded-full bg-[#243b53]"
                  style={{ width: "70%" }}
                />
              </div>
            </div>

            <Link
              to="/repair-status"
              className="mt-6 inline-flex text-[11px] font-semibold text-[#243b53]"
            >
              Theo dõi sửa chữa →
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#d5d9dd] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#243b53]">
              LỐI TẮT
            </p>

            <h2 className="mt-1 text-[17px] font-bold">
              Quản lý dịch vụ
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.title}
                to={shortcut.link}
                className="rounded-xl border border-[#d5d9dd] bg-[#f7f8f9] p-4 transition hover:bg-[#e9ecef]"
              >
                <h3 className="text-[13px] font-bold">
                  {shortcut.title}
                </h3>

                <p className="mt-2 text-[10px] leading-5 text-[#66717c]">
                  {shortcut.description}
                </p>

                <span className="mt-4 inline-block text-[10px] font-semibold text-[#243b53]">
                  Truy cập →
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#d5d9dd] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#243b53]">
                  BÁO GIÁ
                </p>

                <h2 className="mt-1 text-[17px] font-bold">
                  Báo giá chờ duyệt
                </h2>
              </div>

              <span className="text-[20px] font-bold">
                3.850.000 đ
              </span>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-[#66717c]">
              Bảo dưỡng định kỳ · Toyota Camry · 30A-123.45
            </p>

            <Link
              to="/quotation"
              className="mt-5 inline-flex text-[11px] font-semibold text-[#243b53]"
            >
              Xem báo giá →
            </Link>
          </div>

          <div className="rounded-2xl border border-[#d5d9dd] bg-[#20252b] p-6 text-white shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aeb8c1]">
              CẦN HỖ TRỢ?
            </p>

            <h2 className="mt-2 text-[18px] font-bold">
              Liên hệ CarService
            </h2>

            <p className="mt-2 text-[11px] leading-5 text-[#aeb8c1]">
              Đội ngũ CarService sẵn sàng hỗ trợ bạn trong quá trình bảo
              dưỡng và sửa chữa xe.
            </p>

            <Link
              to="/contact"
              className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-[10px] font-semibold text-[#20252b] transition hover:bg-[#e9ecef]"
            >
              Liên hệ ngay
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;