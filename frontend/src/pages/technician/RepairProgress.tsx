import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KỸ THUẬT VIÊN / TIẾN ĐỘ
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Tiến độ sửa chữa
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Cập nhật tiến độ thực hiện và công việc hiện tại của từng phiếu.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Đang sửa chữa
            </p>

            <p className="mt-4 text-2xl font-bold">
              2
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phiếu đang xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Tiến độ trung bình
            </p>

            <p className="mt-4 text-2xl font-bold">
              72%
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Các phiếu đang xử lý
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Hoàn thành
            </p>

            <p className="mt-4 text-2xl font-bold">
              1
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Phiếu đã hoàn tất
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

          <Link to="/diagnosis" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">CD</div>
            <p className="mt-4 text-xs font-semibold">Chẩn đoán</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Ghi nhận lỗi xe</p>
          </Link>

          <Link to="/repair-progress" className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">TD</div>
            <p className="mt-4 text-xs font-semibold">Tiến độ sửa chữa</p>
            <p className="mt-1 text-[10px] text-[#cbd0d5]">Cập nhật tiến độ</p>
          </Link>

          <Link to="/checklist" className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">CL</div>
            <p className="mt-4 text-xs font-semibold">Checklist</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">Review & Test</p>
          </Link>
        </div>

        <div className="space-y-4">
          {progressList.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">
                        {item.id}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                          item.status === "Hoàn thành"
                            ? "bg-[#eef7f0] text-[#39734a]"
                            : "bg-[#f5f1e8] text-[#876d35]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold">
                      {item.customer}
                    </p>

                    <p className="mt-1 text-[10px] text-[#8a949e]">
                      {item.car}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#8a949e]">
                      Dịch vụ
                    </p>

                    <p className="mt-1 text-xs font-semibold">
                      {item.service}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#eef0f2] pt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#8a949e]">
                      TIẾN ĐỘ THỰC HIỆN
                    </p>

                    <p className="text-sm font-bold">
                      {item.progress}%
                    </p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-[#eef0f2]">
                    <div
                      className="h-full rounded-full bg-[#20252b]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    CÔNG VIỆC HIỆN TẠI
                  </p>

                  <p className="mt-1 text-xs font-semibold">
                    {item.currentStep}
                  </p>
                </div>

                <div className="flex justify-end border-t border-[#eef0f2] pt-5">
                  <button
                    type="button"
                    className="rounded-xl bg-[#20252b] px-5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#343a40]"
                  >
                    Cập nhật tiến độ
                  </button>
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

export default RepairProgress;