import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

const diagnoses = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios - 30A-123.45",
    problem: "Động cơ rung nhẹ khi chạy không tải",
    result: "Cần kiểm tra hệ thống đánh lửa",
    status: "Đã chẩn đoán",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3 - 30F-111.11",
    problem: "Điều hòa không lạnh",
    result: "Thiếu gas điều hòa",
    status: "Đã chẩn đoán",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City - 30G-222.22",
    problem: "Phanh có tiếng kêu",
    result: "Đang kiểm tra má phanh",
    status: "Đang chẩn đoán",
  },
];

function Diagnosis() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                KỸ THUẬT VIÊN / CHẨN ĐOÁN
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Chẩn đoán xe
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Ghi nhận nguyên nhân lỗi và kết quả chẩn đoán kỹ thuật.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  CD
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  PHIẾU CHẨN ĐOÁN
                </p>

                <p className="mt-3 text-[22px] font-bold">5</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu cần chẩn đoán
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG XỬ LÝ
                </p>

                <p className="mt-3 text-[22px] font-bold">1</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Chưa hoàn tất chẩn đoán
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐÃ HOÀN THÀNH
                </p>

                <p className="mt-3 text-[22px] font-bold">4</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Đã có kết quả
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
                className="rounded-2xl border border-[#1f2933] bg-[#1f2933] p-4 text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                  CD
                </div>

                <p className="mt-3 text-[12px] font-semibold">
                  Chẩn đoán
                </p>

                <p className="mt-1 text-[9px] text-[#cbd0d5]">
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

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="border-b border-[#eef0f2] px-5 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                  DIAGNOSIS
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-bold">
                    Danh sách chẩn đoán
                  </h2>

                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {diagnoses.length} phiếu
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {diagnoses.map((diagnosis, index) => (
                  <div
                    key={diagnosis.id}
                    className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5 transition hover:border-[#d5d9dc] hover:bg-white"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">
                              {diagnosis.id}
                            </p>

                            <span
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${
                                diagnosis.status === "Đã chẩn đoán"
                                  ? "bg-[#eef7f0] text-[#39734a]"
                                  : "bg-[#f5f1e8] text-[#876d35]"
                              }`}
                            >
                              {diagnosis.status}
                            </span>
                          </div>

                          <p className="mt-2 text-[12px] font-semibold">
                            {diagnosis.customer}
                          </p>

                          <p className="mt-1 text-[10px] text-[#8a9299]">
                            {diagnosis.car}
                          </p>
                        </div>
                      </div>

                      <div className="max-w-xl">
                        <p className="text-[10px] text-[#8a9299]">
                          Hiện tượng
                        </p>

                        <p className="mt-1 text-[11px] font-semibold">
                          {diagnosis.problem}
                        </p>

                        <p className="mt-3 text-[10px] text-[#8a9299]">
                          Kết quả chẩn đoán
                        </p>

                        <p className="mt-1 text-[11px] font-semibold">
                          {diagnosis.result}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="rounded-xl bg-[#1f2933] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                      >
                        Xem chẩn đoán
                      </button>
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

export default Diagnosis;