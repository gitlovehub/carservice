import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

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
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                GARA / KỸ THUẬT VIÊN
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight text-[#20252b]">
                    Phiếu sửa chữa được phân công
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Theo dõi và thực hiện các phiếu sửa chữa được giao.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  KT
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  PHIẾU ĐƯỢC GIAO
                </p>

                <p className="mt-2 text-[22px] font-bold">
                  {repairs.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đang phụ trách
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  CHỜ THỰC HIỆN
                </p>

                <p className="mt-2 text-[22px] font-bold">
                  {
                    repairs.filter(
                      (repair) => repair.status === "Chờ thực hiện",
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Cần bắt đầu xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG THỰC HIỆN
                </p>

                <p className="mt-2 text-[22px] font-bold">
                  {
                    repairs.filter(
                      (repair) => repair.status === "Đang thực hiện",
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Đang sửa chữa
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  HOÀN THÀNH
                </p>

                <p className="mt-2 text-[22px] font-bold">
                  {
                    repairs.filter(
                      (repair) => repair.status === "Hoàn thành",
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Đã hoàn tất
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Link
                to="/assigned-repairs"
                className="rounded-2xl border border-[#1f2933] bg-[#1f2933] p-4 text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                  PS
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Phiếu được phân công
                </p>

                <p className="mt-1 text-[9px] text-[#cbd0d5]">
                  Công việc được giao
                </p>
              </Link>

              <Link
                to="/vehicle-check"
                className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ef] text-[10px] font-bold">
                  KT
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Kiểm tra xe
                </p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
                  Kiểm tra tình trạng xe
                </p>
              </Link>

              <Link
                to="/diagnosis"
                className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ef] text-[10px] font-bold">
                  CD
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Chẩn đoán
                </p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
                  Ghi nhận lỗi xe
                </p>
              </Link>

              <Link
                to="/repair-progress"
                className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ef] text-[10px] font-bold">
                  TD
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Tiến độ sửa chữa
                </p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
                  Cập nhật tiến độ
                </p>
              </Link>

              <Link
                to="/checklist"
                className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ef] text-[10px] font-bold">
                  CL
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Checklist
                </p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
                  Review & Test
                </p>
              </Link>
            </div>

            <div className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                    ASSIGNED REPAIRS
                  </p>

                  <p className="mt-1 text-[13px] font-semibold">
                    Tìm kiếm phiếu sửa chữa
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Tìm theo mã phiếu, khách hàng hoặc biển số xe.
                  </p>
                </div>

                <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {repairs.length} phiếu
                </span>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  type="text"
                  placeholder="Mã phiếu, khách hàng hoặc biển số..."
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1]"
                />

                <select className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1]">
                  <option>Tất cả trạng thái</option>
                  <option>Chờ thực hiện</option>
                  <option>Đang thực hiện</option>
                  <option>Hoàn thành</option>
                </select>

                <button className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]">
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {repairs.map((repair) => (
                <div
                  key={repair.id}
                  className="rounded-2xl border border-[#e1e4e6] bg-white p-5 transition hover:border-[#d5d9dc] hover:shadow-sm"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                          PS
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">
                              {repair.id}
                            </p>

                            <span
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${
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
                              <span className="rounded-lg bg-[#f9ece9] px-3 py-1.5 text-[10px] font-semibold text-[#a44a3f]">
                                Ưu tiên
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-[12px] font-semibold">
                            {repair.customer}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8a9299]">
                            {repair.car} · {repair.plate}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[500px]">
                        <div>
                          <p className="text-[10px] text-[#8a9299]">
                            Dịch vụ
                          </p>

                          <p className="mt-1 text-[11px] font-semibold">
                            {repair.service}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#8a9299]">
                            Ưu tiên
                          </p>

                          <p className="mt-1 text-[11px] font-semibold">
                            {repair.priority}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#8a9299]">
                            Tiến độ
                          </p>

                          <p className="mt-1 text-[11px] font-bold">
                            {repair.progress}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#eef0f2] pt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9299]">
                          TIẾN ĐỘ
                        </p>

                        <p className="text-[10px] font-semibold text-[#66717c]">
                          {repair.progress === 100
                            ? "Đã hoàn thành"
                            : "Đang xử lý"}
                        </p>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                        <div
                          className="h-full rounded-full bg-[#1f2933]"
                          style={{ width: `${repair.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                      <p className="text-[10px] text-[#8a9299]">
                        Kiểm tra thông tin trước khi bắt đầu xử lý phiếu.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-xl border border-[#d9dde1] px-4 py-2.5 text-[10px] font-semibold transition hover:border-[#aeb8c1] hover:bg-[#f6f7f8]"
                        >
                          Xem chi tiết
                        </button>

                        <Link
                          to="/checklist"
                          className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                        >
                          Checklist
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AssignedRepairs;