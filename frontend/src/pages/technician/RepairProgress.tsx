import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

const progressList = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios - 30A-123.45",
    service: "Bảo dưỡng định kỳ",
    progress: 70,
    status: "Đang sửa chữa",
    currentStep: "Thay dầu và kiểm tra động cơ",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3 - 30F-111.11",
    service: "Sửa chữa điều hòa",
    progress: 45,
    status: "Đang sửa chữa",
    currentStep: "Bổ sung gas điều hòa",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City - 30G-222.22",
    service: "Kiểm tra phanh",
    progress: 100,
    status: "Hoàn thành",
    currentStep: "Hoàn tất kiểm tra và chạy thử",
  },
];

function RepairProgress() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                KỸ THUẬT VIÊN / TIẾN ĐỘ
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Tiến độ sửa chữa
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Cập nhật tiến độ thực hiện và công việc hiện tại của từng
                    phiếu.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  TD
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG SỬA CHỮA
                </p>

                <p className="mt-3 text-[22px] font-bold">2</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đang xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  TIẾN ĐỘ TRUNG BÌNH
                </p>

                <p className="mt-3 text-[22px] font-bold">72%</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Các phiếu đang xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  HOÀN THÀNH
                </p>

                <p className="mt-3 text-[22px] font-bold">1</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đã hoàn tất
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Link
                to="/assigned-repairs"
                className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ef] text-[10px] font-bold">
                  PS
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Phiếu được phân công
                </p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
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
                className="rounded-2xl border border-[#1f2933] bg-[#1f2933] p-4 text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                  TD
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Tiến độ sửa chữa
                </p>

                <p className="mt-1 text-[9px] text-[#cbd0d5]">
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

                <p className="mt-3 text-[12px] font-semibold">Checklist</p>

                <p className="mt-1 text-[9px] text-[#8a9299]">
                  Review & Test
                </p>
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="border-b border-[#eef0f2] px-5 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                  REPAIR PROGRESS
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-bold">
                    Danh sách tiến độ sửa chữa
                  </h2>

                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {progressList.length} phiếu
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {progressList.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:bg-white"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">{item.id}</p>

                              <span
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${
                                  item.status === "Hoàn thành"
                                    ? "bg-[#eef7f0] text-[#39734a]"
                                    : "bg-[#f5f1e8] text-[#876d35]"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <p className="mt-2 text-[12px] font-semibold">
                              {item.customer}
                            </p>

                            <p className="mt-1 text-[10px] text-[#8a9299]">
                              {item.car}
                            </p>
                          </div>
                        </div>

                        <div className="xl:min-w-[250px]">
                          <p className="text-[10px] text-[#8a9299]">Dịch vụ</p>

                          <p className="mt-1 text-[11px] font-semibold">
                            {item.service}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#eef0f2] pt-5">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9299]">
                            TIẾN ĐỘ THỰC HIỆN
                          </p>

                          <p className="text-[11px] font-bold">
                            {item.progress}%
                          </p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                          <div
                            className="h-full rounded-full bg-[#1f2933]"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#f3f4f2] p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9299]">
                          CÔNG VIỆC HIỆN TẠI
                        </p>

                        <p className="mt-1 text-[11px] font-semibold">
                          {item.currentStep}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                        <p className="text-[10px] text-[#8a9299]">
                          Theo dõi và cập nhật tiến độ thực hiện phiếu.
                        </p>

                        <button
                          type="button"
                          className="rounded-xl bg-[#1f2933] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                        >
                          Cập nhật tiến độ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RepairProgress;