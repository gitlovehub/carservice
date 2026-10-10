import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Bảng dịch vụ chính quy garage
const services = [
  {
    number: "01",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra tổng quát theo các mốc 5.000km, 10.000km, 20.000km và 40.000km theo tiêu chuẩn hãng.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Hệ thống phanh & Lốp",
    description:
      "Đo độ mòn má phanh, láng đĩa phanh điện tử, kiểm tra áp suất, đảo lốp và cân chỉnh thước lái.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Hệ thống điều hòa",
    description:
      "Vệ sinh giàn lạnh nội soi, đo áp suất gas, thay lọc gió điều hòa khử mùi ẩm mốc khoang cabin.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Thay dầu & Phụ gia động cơ",
    description:
      "Sử dụng dầu động cơ tổng hợp toàn phần chính hãng kèm thay lọc dầu và vòng đệm ốc xả.",
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
];

// Quy trình tiếp nhận thực tế tại xưởng
const steps = [
  {
    number: "01",
    title: "Đặt hẹn trực tuyến",
    desc: "Chọn cơ sở dịch vụ, loại xe và khung giờ thuận tiện trên website.",
  },
  {
    number: "02",
    title: "Tiếp nhận & Giám định",
    desc: "Cố vấn dịch vụ kiểm tra xe cùng khách hàng và báo giá chi tiết từng hạng mục.",
  },
  {
    number: "03",
    title: "Thực hiện dịch vụ",
    desc: "Kỹ thuật viên thao tác kỹ thuật theo danh mục nghiệm thu được bạn đồng ý.",
  },
  {
    number: "04",
    title: "Nghiệm thu & Bàn giao",
    desc: "Khách hàng kiểm tra chất lượng xe thực tế, thanh toán và nhận phiếu bảo hành.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <Header />

      <main>
        {/* HERO SECTION */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Cột thông tin */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Xưởng dịch vụ mở cửa: 08:00 - 18:00 (Thứ 2 - Thứ 7)
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                  Dịch vụ bảo dưỡng & sửa chữa ô tô tiêu chuẩn
                </h1>

                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                  Quy trình chuẩn mực, kỹ thuật viên có chứng chỉ chuyên môn, phụ tùng chính hãng và báo giá minh bạch trước khi thực hiện.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/booking"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Đặt lịch bảo dưỡng ngay
                  </Link>

                  <Link
                    to="/services"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Bảng giá dịch vụ
                  </Link>
                </div>

                {/* Tiêu chí cam kết */}
                <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-100 pt-8">
                  <div>
                    <p className="text-xl font-bold text-slate-900">100%</p>
                    <p className="mt-0.5 text-xs text-slate-500">Phụ tùng chuẩn OEM/Chính hãng</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">Minh bạch</p>
                    <p className="mt-0.5 text-xs text-slate-500">Không phát sinh chi phí phụ</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">Bảo hành</p>
                    <p className="mt-0.5 text-xs text-slate-500">Tối thiểu 6 tháng / 10.000km</p>
                  </div>
                </div>
              </div>

              {/* Form đặt lịch nhanh thực tế */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50">
                <div className="border-b border-slate-100 pb-5">
                  <h2 className="text-lg font-bold text-slate-900">Đặt hẹn dịch vụ nhanh</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Chọn trước thông tin để trung tâm chuẩn bị cầu nâng và vật tư sẵn sàng
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = "/booking";
                  }}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Dịch vụ yêu cầu</label>
                    <select className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
                      <option>Bảo dưỡng định kỳ theo số km</option>
                      <option>Kiểm tra hệ thống phanh</option>
                      <option>Bảo dưỡng hệ thống điều hòa</option>
                      <option>Thay dầu & Lọc dầu nhớt</option>
                      <option>Kiểm tra xe có tiếng kêu / sự cố khác</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Hãng xe</label>
                      <input
                        type="text"
                        placeholder="Vd: Toyota, Mazda..."
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Biển số xe</label>
                      <input
                        type="text"
                        placeholder="Vd: 30A-123.45"
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Thời gian mong muốn</label>
                    <input
                      type="date"
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Tiếp tục xác nhận lịch hẹn →
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    Cố vấn dịch vụ sẽ gọi điện thoại xác nhận trong vòng 15 phút làm việc.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* DỊCH VỤ NỔI BẬT */}
        <section className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Hạng mục kỹ thuật
                </p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Dịch vụ bảo dưỡng tiêu chuẩn
                </h2>
              </div>
              <Link
                to="/services"
                className="inline-flex items-center text-sm font-semibold text-slate-900 hover:text-amber-600"
              >
                Xem chi tiết tất cả dịch vụ →
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((item) => (
                <div
                  key={item.number}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                        {item.icon}
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {item.number}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-bold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <Link
                    to="/booking"
                    className="mt-6 inline-flex text-xs font-semibold text-slate-900 transition hover:text-amber-600"
                  >
                    Đặt hẹn hạng mục này →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUY TRÌNH 4 BƯỚC */}
        <section className="border-t border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Quy trình làm việc
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                4 bước bảo dưỡng minh bạch tại trạm
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Toàn bộ quy trình được chuẩn hóa nhằm tối ưu thời gian chờ và đảm bảo bạn nắm rõ tình trạng xe trước khi chi trả.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((st) => (
                <div
                  key={st.number}
                  className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-white">
                    {st.number}
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {st.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LIÊN HỆ & HỖ TRỢ KHẨN CẤP */}
        <section className="border-t border-slate-200 bg-slate-900 py-14 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Hỗ trợ kỹ thuật & Cứu hộ
                </p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Cần tư vấn trực tiếp hoặc tiếp nhận xe khẩn cấp?
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Cố vấn dịch vụ luôn sẵn sàng giải đáp thắc mắc về tình trạng hỏng hóc hoặc đặt lịch gấp.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:19001234"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Hotline: 1900 1234
                </a>
                <Link
                  to="/booking"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-6 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Đặt hẹn trực tuyến
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;