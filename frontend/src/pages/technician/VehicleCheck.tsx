import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const checks = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    mileage: "32.500 km",
    status: "Đã kiểm tra",
    date: "03/10/2026",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "30F-111.11",
    mileage: "45.800 km",
    status: "Đang kiểm tra",
    date: "03/10/2026",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City",
    plate: "30G-222.22",
    mileage: "18.200 km",
    status: "Chưa kiểm tra",
    date: "03/10/2026",
  },
];

function VehicleCheck() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KỸ THUẬT VIÊN / KIỂM TRA XE
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Kiểm tra xe
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Kiểm tra tình trạng thực tế của xe trước khi tiến hành sửa chữa.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tổng phiếu kiểm tra
            </p>

            <p className="mt-4 text-2xl font-bold">
              {checks.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Xe cần kiểm tra
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đang kiểm tra
            </p>

            <p className="mt-4 text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đang thực hiện kiểm tra
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đã kiểm tra
            </p>

            <p className="mt-4 text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Hoàn tất kiểm tra
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Link to="/assigned-repairs" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              PS
            </div>
            <p className="mt-4 text-xs font-semibold">Phiếu được phân công</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Công việc được giao</p>
          </Link>

          <Link to="/vehicle-check" className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              KT
            </div>
            <p className="mt-4 text-xs font-semibold">Kiểm tra xe</p>
            <p className="mt-1 text-[10px] text-[#cbd0d5]">Kiểm tra tình trạng xe</p>
          </Link>

          <Link to="/diagnosis" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              CD
            </div>
            <p className="mt-4 text-xs font-semibold">Chẩn đoán</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Ghi nhận lỗi xe</p>
          </Link>

          <Link to="/repair-progress" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              TD
            </div>
            <p className="mt-4 text-xs font-semibold">Tiến độ sửa chữa</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Cập nhật tiến độ</p>
          </Link>

          <Link to="/checklist" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              CL
            </div>
            <p className="mt-4 text-xs font-semibold">Checklist</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Review & Test</p>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="border-b border-[#eef0f2] px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              VEHICLE CHECK
            </p>

            <h2 className="mt-1 text-base font-bold">
              Danh sách xe cần kiểm tra
            </h2>
          </div>

          <div className="space-y-3 p-5">
            {checks.map((check, index) => (
              <div
                key={check.id}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{check.id}</p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            check.status === "Đã kiểm tra"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : check.status === "Đang kiểm tra"
                                ? "bg-[#f5f1e8] text-[#876d35]"
                                : "bg-[#eef0f2] text-[#5f6871]"
                          }`}
                        >
                          {check.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {check.customer}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {check.car} · {check.plate}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">Số km</p>
                      <p className="mt-1 text-xs font-semibold">{check.mileage}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">Ngày kiểm tra</p>
                      <p className="mt-1 text-xs font-semibold">{check.date}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">Mã phiếu</p>
                      <p className="mt-1 text-xs font-semibold">{check.id}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
                  >
                    Kiểm tra
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default VehicleCheck;