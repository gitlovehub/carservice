import Header from "../../components/Header";
import Footer from "../../components/Footer";

const repairSteps = [
  {
    title: "Tiếp nhận xe",
    description: "Gara đã tiếp nhận xe và tạo phiếu sửa chữa.",
    time: "08:15 · 12/10/2026",
    status: "Hoàn thành",
  },
  {
    title: "Kiểm tra xe",
    description: "Kỹ thuật viên đang kiểm tra tình trạng tổng thể của xe.",
    time: "09:00 · 12/10/2026",
    status: "Đang thực hiện",
  },
  {
    title: "Chẩn đoán",
    description: "Xác định nguyên nhân và các hạng mục cần xử lý.",
    time: "Dự kiến 10:30",
    status: "Chưa thực hiện",
  },
  {
    title: "Sửa chữa",
    description: "Thực hiện các hạng mục sửa chữa sau khi được xác nhận.",
    time: "Dự kiến 13:00",
    status: "Chưa thực hiện",
  },
];

function RepairStatus() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / TÌNH TRẠNG SỬA CHỮA
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Tình trạng sửa chữa
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Theo dõi tiến độ kiểm tra và sửa chữa xe tại CarService.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#20252b] text-sm font-bold text-white">
                SC
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold">
                    Toyota Vios
                  </h2>

                  <span className="rounded-full bg-[#f5f1e8] px-3 py-1.5 text-[10px] font-semibold text-[#876d35]">
                    Đang sửa chữa
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#7b858f]">
                  Biển số: 30A-123.45
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Mã phiếu
                </p>

                <p className="mt-1 text-xs font-semibold">
                  PSC-001
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Ngày tiếp nhận
                </p>

                <p className="mt-1 text-xs font-semibold">
                  12/10/2026
                </p>
              </div>

              <div>
                <p className="text-[10px] text-[#8a949e]">
                  Dịch vụ
                </p>

                <p className="mt-1 text-xs font-semibold">
                  Bảo dưỡng định kỳ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                REPAIR PROGRESS
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tiến độ xử lý
              </h2>
            </div>

            <div className="space-y-0 p-6">
              {repairSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="relative flex gap-4 pb-7 last:pb-0"
                >
                  {index !== repairSteps.length - 1 && (
                    <div className="absolute left-[18px] top-10 h-[calc(100%-18px)] w-px bg-[#e3e6e8]" />
                  )}

                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.status === "Hoàn thành"
                        ? "bg-[#20252b] text-white"
                        : step.status === "Đang thực hiện"
                          ? "bg-[#f5f1e8] text-[#876d35]"
                          : "bg-[#eef0f2] text-[#7b858f]"
                    }`}
                  >
                    {step.status === "Hoàn thành"
                      ? "✓"
                      : String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="flex-1 rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <h3 className="text-xs font-bold">
                          {step.title}
                        </h3>

                        <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                          {step.description}
                        </p>
                      </div>

                      <span className="text-[10px] font-medium text-[#8a949e]">
                        {step.time}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                          step.status === "Hoàn thành"
                            ? "bg-[#eef7f0] text-[#39734a]"
                            : step.status === "Đang thực hiện"
                              ? "bg-[#f5f1e8] text-[#876d35]"
                              : "bg-[#f0f2f3] text-[#7b858f]"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                SUMMARY
              </p>

              <h2 className="mt-1 text-base font-bold">
                Tổng quan
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-[#f8f9fa] p-4">
                  <p className="text-[10px] text-[#8a949e]">
                    Tiến độ
                  </p>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5e7e9]">
                    <div className="h-full w-1/2 rounded-full bg-[#20252b]" />
                  </div>

                  <p className="mt-2 text-xs font-bold">
                    50% hoàn thành
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f8f9fa] p-4">
                    <p className="text-[10px] text-[#8a949e]">
                      Đã hoàn thành
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      1
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f8f9fa] p-4">
                    <p className="text-[10px] text-[#8a949e]">
                      Đang xử lý
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      1
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Thông tin tiến độ
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Tiến độ có thể thay đổi theo tình trạng thực tế
                    của xe và kết quả kiểm tra của kỹ thuật viên.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default RepairStatus;