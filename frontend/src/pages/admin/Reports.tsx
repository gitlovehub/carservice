import { Link } from "react-router-dom";
import Header from "../../components/Header";

function Reports() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <div className="mx-auto flex max-w-[1200px]">
        <aside className="w-60 border-r border-[#e1e4e7] bg-white px-4 py-6">
          <p className="mb-4 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="mb-6 flex items-center gap-3 rounded-lg bg-[#f1f3f5] px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              AD
            </div>

            <div>
              <p className="text-[12px] font-semibold">Quản trị viên</p>
              <p className="text-[10px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>

          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            CHỨC NĂNG
          </p>

          <div className="space-y-1">
            <Link
              to="/admin"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Tài khoản & nhân viên
            </Link>

            <Link
              to="/admin/services"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Dịch vụ & gói bảo dưỡng
            </Link>

            <Link
              to="/admin/inventory"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Phụ tùng & tồn kho
            </Link>

            <Link
              to="/admin/reports"
              className="block rounded-lg bg-[#20252b] px-3 py-2.5 text-[12px] font-medium text-white"
            >
              Báo cáo & thống kê
            </Link>
          </div>

          <div className="mt-8 border-t border-[#eef0f2] pt-6">
            <button className="w-full rounded-lg border border-[#d9dde1] px-3 py-2.5 text-[11px] font-medium">
              MỞ CHECKLIST REVIEW & TEST
            </button>
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <div className="mb-8">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
              GARA / BÁO CÁO & THỐNG KÊ
            </p>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Báo cáo & thống kê
                </h1>

                <p className="mt-2 text-[12px] text-[#707a84]">
                  Theo dõi tình hình hoạt động và doanh thu của gara.
                </p>
              </div>

              <button className="rounded-lg border border-[#d9dde1] bg-white px-4 py-2.5 text-[11px] font-semibold">
                Xuất báo cáo
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">KHÁCH HÀNG</p>
              <p className="mt-2 text-2xl font-bold">128</p>
              <p className="mt-1 text-[10px] text-[#8a949e]">
                Trong tháng này
              </p>
            </div>

            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">LỊCH HẸN</p>
              <p className="mt-2 text-2xl font-bold">86</p>
              <p className="mt-1 text-[10px] text-[#8a949e]">
                Trong tháng này
              </p>
            </div>

            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">ĐƠN ĐÃ HOÀN TẤT</p>
              <p className="mt-2 text-2xl font-bold">72</p>
              <p className="mt-1 text-[10px] text-[#8a949e]">
                Trong tháng này
              </p>
            </div>

            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">DOANH THU</p>
              <p className="mt-2 text-2xl font-bold">186M</p>
              <p className="mt-1 text-[10px] text-[#8a949e]">
                Trong tháng này
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <section className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <h2 className="mb-5 text-[14px] font-bold">
                Thống kê lịch hẹn
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span>Đã hoàn tất</span>
                    <span>72</span>
                  </div>

                  <div className="h-2 rounded-full bg-[#eef0f2]">
                    <div className="h-2 w-[84%] rounded-full bg-[#20252b]" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span>Đang thực hiện</span>
                    <span>10</span>
                  </div>

                  <div className="h-2 rounded-full bg-[#eef0f2]">
                    <div className="h-2 w-[35%] rounded-full bg-[#20252b]" />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-[11px]">
                    <span>Đã hủy</span>
                    <span>4</span>
                  </div>

                  <div className="h-2 rounded-full bg-[#eef0f2]">
                    <div className="h-2 w-[15%] rounded-full bg-[#20252b]" />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <h2 className="mb-5 text-[14px] font-bold">
                Doanh thu theo tháng
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#eef0f2] pb-3">
                  <span className="text-[11px]">Tháng 7</span>
                  <span className="text-[12px] font-semibold">152.000.000đ</span>
                </div>

                <div className="flex items-center justify-between border-b border-[#eef0f2] pb-3">
                  <span className="text-[11px]">Tháng 8</span>
                  <span className="text-[12px] font-semibold">174.000.000đ</span>
                </div>

                <div className="flex items-center justify-between border-b border-[#eef0f2] pb-3">
                  <span className="text-[11px]">Tháng 9</span>
                  <span className="text-[12px] font-semibold">186.000.000đ</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">Tổng</span>
                  <span className="text-[13px] font-bold">512.000.000đ</span>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Reports;