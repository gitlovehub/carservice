import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KỸ THUẬT VIÊN / CHẨN ĐOÁN
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Chẩn đoán xe
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Ghi nhận nguyên nhân lỗi và kết quả chẩn đoán kỹ thuật.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Phiếu chẩn đoán
            </p>
            <p className="mt-4 text-2xl font-bold">5</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phiếu cần chẩn đoán
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đang xử lý
            </p>
            <p className="mt-4 text-2xl font-bold">1</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Chưa hoàn tất chẩn đoán
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đã hoàn thành
            </p>
            <p className="mt-4 text-2xl font-bold">4</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Đã có kết quả
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Link to="/assigned-repairs" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">PS</div>
            <p className="mt-4 text-xs font-semibold">Phiếu được phân công</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Công việc được giao</p>
          </Link>

          <Link to="/vehicle-check" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">KT</div>
            <p className="mt-4 text-xs font-semibold">Kiểm tra xe</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Kiểm tra tình trạng xe</p>
          </Link>

          <Link to="/diagnosis" className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">CD</div>
            <p className="mt-4 text-xs font-semibold">Chẩn đoán</p>
            <p className="mt-1 text-[10px] text-[#cbd0d5]">Ghi nhận lỗi xe</p>
          </Link>

          <Link to="/repair-progress" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">TD</div>
            <p className="mt-4 text-xs font-semibold">Tiến độ sửa chữa</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Cập nhật tiến độ</p>
          </Link>

          <Link to="/checklist" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">CL</div>
            <p className="mt-4 text-xs font-semibold">Checklist</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Review & Test</p>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="border-b border-[#eef0f2] px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              DIAGNOSIS
            </p>

            <h2 className="mt-1 text-base font-bold">
              Danh sách chẩn đoán
            </h2>
          </div>

          <div className="space-y-3 p-5">
            {diagnoses.map((diagnosis, index) => (
              <div
                key={diagnosis.id}
                className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#20252b] text-[10px] font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{diagnosis.id}</p>

                        <span className="rounded-full bg-[#eef7f0] px-3 py-1.5 text-[10px] font-medium text-[#39734a]">
                          {diagnosis.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold">
                        {diagnosis.customer}
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        {diagnosis.car}
                      </p>
                    </div>
                  </div>

                  <div className="max-w-xl">
                    <p className="text-[10px] text-[#8a949e]">
                      Hiện tượng
                    </p>

                    <p className="mt-1 text-xs font-semibold">
                      {diagnosis.problem}
                    </p>

                    <p className="mt-3 text-[10px] text-[#8a949e]">
                      Kết quả chẩn đoán
                    </p>

                    <p className="mt-1 text-xs font-semibold">
                      {diagnosis.result}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
                  >
                    Xem chẩn đoán
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

export default Diagnosis;