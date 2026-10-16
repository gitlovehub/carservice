
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

type ProgressStatus = "Chờ sửa chữa" | "Đang sửa chữa" | "Hoàn thành";

type ProgressItem = {
  id: string;
  customer: string;
  car: string;
  service: string;
  progress: number;
  status: ProgressStatus;
  currentStep: string;
};

const initialProgressList: ProgressItem[] = [
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

const statusStyles: Record<ProgressStatus, string> = {
  "Chờ sửa chữa": "bg-[#f0f1f2] text-[#66717c]",
  "Đang sửa chữa": "bg-[#f5f1e8] text-[#876d35]",
  "Hoàn thành": "bg-[#eef7f0] text-[#39734a]",
};

const quickLinks = [
  {
    code: "PS",
    title: "Phiếu được phân công",
    description: "Công việc được giao",
    to: "/assigned-repairs",
  },
  {
    code: "KT",
    title: "Kiểm tra xe",
    description: "Kiểm tra tình trạng xe",
    to: "/vehicle-check",
  },
  {
    code: "CD",
    title: "Chẩn đoán",
    description: "Ghi nhận lỗi xe",
    to: "/diagnosis",
  },
  {
    code: "TD",
    title: "Tiến độ sửa chữa",
    description: "Cập nhật tiến độ",
    to: "/repair-progress",
    active: true,
  },
  {
    code: "CL",
    title: "Checklist",
    description: "Review & Test",
    to: "/checklist",
  },
];

function RepairProgress() {
  const [progressList, setProgressList] = useState(initialProgressList);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [selectedItem, setSelectedItem] = useState<ProgressItem | null>(null);
  const [progress, setProgress] = useState("0");
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filteredList = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    return progressList.filter((item) => {
      const matchesKeyword = [
        item.id,
        item.customer,
        item.car,
        item.service,
        item.currentStep,
      ].some((value) => value.toLowerCase().includes(searchText));

      const matchesStatus =
        statusFilter === "Tất cả" || item.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [progressList, keyword, statusFilter]);

  const inProgressItems = progressList.filter(
    (item) => item.status === "Đang sửa chữa",
  );

  const completedCount = progressList.filter(
    (item) => item.status === "Hoàn thành",
  ).length;

  const waitingCount = progressList.filter(
    (item) => item.status === "Chờ sửa chữa",
  ).length;

  const averageProgress =
    inProgressItems.length > 0
      ? Math.round(
          inProgressItems.reduce((total, item) => total + item.progress, 0) /
            inProgressItems.length,
        )
      : 0;

  function openUpdateForm(item: ProgressItem) {
    setSelectedItem(item);
    setProgress(String(item.progress));
    setCurrentStep(item.currentStep);
    setError("");
    setMessage("");
  }

  function closeUpdateForm() {
    setSelectedItem(null);
    setError("");
  }

  function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    const progressValue = Number(progress);

    if (
      progress.trim() === "" ||
      !Number.isInteger(progressValue) ||
      progressValue < 0 ||
      progressValue > 100
    ) {
      setError("Tiến độ phải là số nguyên từ 0 đến 100.");
      return;
    }

    if (!currentStep.trim()) {
      setError("Vui lòng nhập công việc hiện tại.");
      return;
    }

    const nextStatus: ProgressStatus =
      progressValue === 100
        ? "Hoàn thành"
        : progressValue === 0
          ? "Chờ sửa chữa"
          : "Đang sửa chữa";

    setProgressList((current) =>
      current.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              progress: progressValue,
              currentStep: currentStep.trim(),
              status: nextStatus,
            }
          : item,
      ),
    );

    setMessage(`Đã cập nhật tiến độ phiếu ${selectedItem.id}.`);
    setSelectedItem(null);
    setError("");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
                    Theo dõi và cập nhật tiến độ thực hiện của từng phiếu.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  TD
                </div>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#cfe5d4] bg-[#eef7f0] px-4 py-3 text-[12px] text-[#39734a]"
              >
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="font-semibold"
                >
                  Đóng
                </button>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG SỬA CHỮA
                </p>
                <p className="mt-3 text-[22px] font-bold">
                  {inProgressItems.length}
                </p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đang xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  TIẾN ĐỘ TRUNG BÌNH
                </p>
                <p className="mt-3 text-[22px] font-bold">
                  {averageProgress}%
                </p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Các phiếu đang xử lý
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  HOÀN THÀNH
                </p>
                <p className="mt-3 text-[22px] font-bold">{completedCount}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đã hoàn tất
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-2xl border p-4 transition ${
                    item.active
                      ? "border-[#1f2933] bg-[#1f2933] text-white"
                      : "border-[#e1e4e6] bg-white hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${
                      item.active
                        ? "bg-white/10 text-white"
                        : "bg-[#f0f1ef]"
                    }`}
                  >
                    {item.code}
                  </div>
                  <p className="mt-3 text-[12px] font-semibold">{item.title}</p>
                  <p
                    className={`mt-1 text-[9px] ${
                      item.active ? "text-[#cbd0d5]" : "text-[#8a9299]"
                    }`}
                  >
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="border-b border-[#eef0f2] px-5 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                  REPAIR PROGRESS
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[14px] font-bold">
                    Danh sách tiến độ sửa chữa
                  </h2>
                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {filteredList.length} phiếu
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-b border-[#eef0f2] p-5 md:grid-cols-[1fr_220px]">
                <div>
                  <label
                    htmlFor="progress-search"
                    className="mb-2 block text-[11px] font-semibold"
                  >
                    Tìm kiếm phiếu
                  </label>
                  <input
                    id="progress-search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Mã phiếu, khách hàng, biển số xe..."
                    className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="progress-status"
                    className="mb-2 block text-[11px] font-semibold"
                  >
                    Trạng thái
                  </label>
                  <select
                    id="progress-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-xl border border-[#e1e4e6] bg-white px-3 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  >
                    <option value="Tất cả">Tất cả trạng thái</option>
                    <option value="Chờ sửa chữa">Chờ sửa chữa</option>
                    <option value="Đang sửa chữa">Đang sửa chữa</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>

                {(keyword || statusFilter !== "Tất cả") && (
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        setStatusFilter("Tất cả");
                      }}
                      className="text-[11px] font-semibold text-[#66717c] underline underline-offset-4"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {filteredList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9dddf] px-5 py-12 text-center">
                    <p className="text-[13px] font-semibold">
                      Không tìm thấy phiếu sửa chữa
                    </p>
                    <p className="mt-2 text-[11px] text-[#8a9299]">
                      Thử thay đổi từ khóa hoặc trạng thái tìm kiếm.
                    </p>
                  </div>
                ) : (
                  filteredList.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-4 transition hover:border-[#d5d9dc] hover:bg-white sm:p-5"
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                              {String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold">{item.id}</p>
                                <span
                                  className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${statusStyles[item.status]}`}
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
                            <p className="text-[10px] text-[#8a9299]">
                              Dịch vụ
                            </p>
                            <p className="mt-1 text-[11px] font-semibold">
                              {item.service}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-[#eef0f2] pt-5">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9299]">
                              TIẾN ĐỘ THỰC HIỆN
                            </p>
                            <p className="text-[11px] font-bold">
                              {item.progress}%
                            </p>
                          </div>
                          <div
                            className="h-2 overflow-hidden rounded-full bg-[#eef0f2]"
                            role="progressbar"
                            aria-label={`Tiến độ phiếu ${item.id}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={item.progress}
                          >
                            <div
                              className="h-full rounded-full bg-[#1f2933] transition-all"
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
                            Cập nhật tiến độ và nội dung công việc.
                          </p>
                          <button
                            type="button"
                            onClick={() => openUpdateForm(item)}
                            className="rounded-xl bg-[#1f2933] px-5 py-3 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                          >
                            Cập nhật tiến độ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#eef0f2] px-5 py-4">
                <p className="text-[10px] text-[#8a9299]">
                  Chờ sửa chữa: {waitingCount} phiếu · Đang sửa chữa:{" "}
                  {inProgressItems.length} phiếu · Hoàn thành: {completedCount}{" "}
                  phiếu
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUpdateForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="progress-modal-title"
            className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eef0f2] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a9299]">
                  PHIẾU {selectedItem.id}
                </p>
                <h2
                  id="progress-modal-title"
                  className="mt-1 text-lg font-bold"
                >
                  Cập nhật tiến độ
                </h2>
                <p className="mt-1 text-[11px] text-[#8a9299]">
                  {selectedItem.customer} · {selectedItem.car}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUpdateForm}
                aria-label="Đóng biểu mẫu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f2] text-lg text-[#66717c] hover:bg-[#e9ebea]"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProgress} className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="progress-value"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Tiến độ hoàn thành (%)
                </label>
                <input
                  id="progress-value"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={progress}
                  onChange={(event) => setProgress(event.target.value)}
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                />
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f2]">
                  <div
                    className="h-full rounded-full bg-[#1f2933] transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(progress) || 0))}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="progress-step"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Công việc hiện tại
                </label>
                <textarea
                  id="progress-step"
                  rows={3}
                  value={currentStep}
                  onChange={(event) => setCurrentStep(event.target.value)}
                  placeholder="Nhập công việc đang thực hiện..."
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                />
              </div>

              <p className="rounded-xl bg-[#f3f4f2] px-4 py-3 text-[11px] text-[#66717c]">
                Trạng thái sẽ tự cập nhật theo tiến độ: 0% là chờ sửa chữa,
                từ 1% đến 99% là đang sửa chữa, 100% là hoàn thành.
              </p>

              {error && (
                <p role="alert" className="text-[11px] font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeUpdateForm}
                  className="rounded-xl border border-[#e1e4e6] px-5 py-3 text-[11px] font-semibold text-[#66717c] hover:bg-[#f7f7f5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Lưu tiến độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairProgress;
