import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const repairs = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    priority: "Bình thường",
    status: "Đang thực hiện",
    progress: 70,
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "30F-111.11",
    service: "Sửa chữa điều hòa",
    priority: "Ưu tiên",
    status: "Chờ thực hiện",
    progress: 0,
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City",
    plate: "30G-222.22",
    service: "Kiểm tra phanh",
    priority: "Bình thường",
    status: "Hoàn thành",
    progress: 100,
  },
];

function AssignedRepairs() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC / KỸ THUẬT VIÊN
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white shadow-sm">
              KT
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Kỹ thuật viên
              </h1>

              <p className="mt-1 text-xs text-[#8a949e]">
                Theo dõi và thực hiện các phiếu sửa chữa được phân công.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Phiếu được giao
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                PS
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {repairs.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phiếu đang phụ trách
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Chờ thực hiện
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f1e8] text-xs font-bold text-[#876d35]">
                01
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {
                repairs.filter(
                  (repair) => repair.status === "Chờ thực hiện",
                ).length
              }
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cần bắt đầu xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Đang thực hiện
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                01
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {
                repairs.filter(
                  (repair) => repair.status === "Đang thực hiện",
                ).length
              }
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đang sửa chữa
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                Hoàn thành
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef7f0] text-xs font-bold text-[#39734a]">
                ✓
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold">
              {
                repairs.filter(
                  (repair) => repair.status === "Hoàn thành",
                ).length
              }
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đã hoàn tất
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Link
            to="/assigned-repairs"
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              PS
            </div>

            <p className="mt-4 text-xs font-semibold">
              Phiếu được phân công
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Công việc được giao
            </p>
          </Link>

          <Link
            to="/vehicle-check"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              KT
            </div>

            <p className="mt-4 text-xs font-semibold">
              Kiểm tra xe
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Kiểm tra tình trạng xe
            </p>
          </Link>

          <Link
            to="/diagnosis"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              CD
            </div>

            <p className="mt-4 text-xs font-semibold">
              Chẩn đoán
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Ghi nhận lỗi xe
            </p>
          </Link>

          <Link
            to="/repair-progress"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              TD
            </div>

            <p className="mt-4 text-xs font-semibold">
              Tiến độ sửa chữa
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cập nhật tiến độ
            </p>
          </Link>

          <Link
            to="/checklist"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5d9dc] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              CL
            </div>

            <p className="mt-4 text-xs font-semibold">
              Checklist
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Review & Test
            </p>
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                ASSIGNED REPAIRS
              </p>

              <h2 className="mt-1 text-base font-bold">
                Phiếu sửa chữa được phân công
              </h2>
            </div>

            <span className="rounded-full bg-[#f0f2f3] px-3 py-1.5 text-[10px] font-semibold text-[#6f7881]">
              {repairs.length} phiếu
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_140px]">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, khách hàng hoặc biển số..."
              className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
            />

            <select className="rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10">
              <option>Tất cả trạng thái</option>
              <option>Chờ thực hiện</option>
              <option>Đang thực hiện</option>
              <option>Hoàn thành</option>
            </select>

            <button
              type="button"
              className="rounded-xl border border-[#dfe3e6] px-5 py-3 text-xs font-semibold transition hover:border-[#20252b] hover:bg-[#20252b] hover:text-white"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {repairs.map((repair) => (
            <div
              key={repair.id}
              className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm transition hover:border-[#d5d9dc] hover:shadow-md"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#20252b] text-[10px] font-bold text-white">
                      PS
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">
                          {repair.id}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                            repair.status === "Hoàn thành"
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : repair.status === "Đang thực hiện"
                                ? "bg-[#f5f1e8] text-[#876d35]"
                                : "bg-[#eef0f2] text-[#5f6871]"
                          }`}
                        >
                          {repair.status}
                        </span>

                        {repair.priority === "Ưu tiên" && (
                          <span className="rounded-full bg-[#f9ece9] px-3 py-1.5 text-[10px] font-medium text-[#a44a3f]">
                            Ưu tiên
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {repair.customer}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {repair.car} · {repair.plate}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Dịch vụ
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {repair.service}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Ưu tiên
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        {repair.priority}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Tiến độ
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {repair.progress}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef0f2] pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#8a949e]">
                      TIẾN ĐỘ
                    </p>

                    <p className="text-[10px] font-semibold text-[#6f7881]">
                      {repair.progress === 100
                        ? "Đã hoàn thành"
                        : "Đang xử lý"}
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                    <div
                      className="h-full rounded-full bg-[#20252b]"
                      style={{ width: `${repair.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                  <p className="text-[10px] text-[#8a949e]">
                    Kiểm tra thông tin trước khi bắt đầu xử lý phiếu.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#dfe3e6] px-4 py-2.5 text-[10px] font-semibold transition hover:bg-[#f5f6f7]"
                    >
                      Xem chi tiết
                    </button>

                    <Link
                      to="/checklist"
                      className="rounded-xl bg-[#20252b] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
                    >
                      Checklist
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AssignedRepairs;