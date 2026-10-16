
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

type DiagnosisStatus = "Chưa chẩn đoán" | "Đang chẩn đoán" | "Đã chẩn đoán";

type DiagnosisItem = {
  id: string;
  customer: string;
  car: string;
  problem: string;
  cause: string;
  result: string;
  recommendation: string;
  status: DiagnosisStatus;
};

const initialDiagnoses: DiagnosisItem[] = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios - 30A-123.45",
    problem: "Động cơ rung nhẹ khi chạy không tải",
    cause: "Có thể liên quan đến hệ thống đánh lửa",
    result: "Cần kiểm tra bugi và cuộn đánh lửa",
    recommendation: "Kiểm tra bugi, cuộn đánh lửa và hệ thống cấp nhiên liệu",
    status: "Đã chẩn đoán",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3 - 30F-111.11",
    problem: "Điều hòa không lạnh",
    cause: "Nghi ngờ thiếu gas điều hòa",
    result: "Cần kiểm tra lượng gas và độ kín của hệ thống",
    recommendation: "Kiểm tra đường ống, phát hiện rò rỉ và bổ sung gas nếu cần",
    status: "Đã chẩn đoán",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City - 30G-222.22",
    problem: "Phanh có tiếng kêu",
    cause: "",
    result: "Đang kiểm tra má phanh",
    recommendation: "",
    status: "Đang chẩn đoán",
  },
];

const statusStyles: Record<DiagnosisStatus, string> = {
  "Chưa chẩn đoán": "bg-[#f0f1f2] text-[#66717c]",
  "Đang chẩn đoán": "bg-[#f5f1e8] text-[#876d35]",
  "Đã chẩn đoán": "bg-[#eef7f0] text-[#39734a]",
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
    active: true,
  },
  {
    code: "TD",
    title: "Tiến độ sửa chữa",
    description: "Cập nhật tiến độ",
    to: "/repair-progress",
  },
  {
    code: "CL",
    title: "Checklist",
    description: "Review & Test",
    to: "/checklist",
  },
];

const emptyForm = {
  problem: "",
  cause: "",
  result: "",
  recommendation: "",
  status: "Đang chẩn đoán" as DiagnosisStatus,
};

function Diagnosis() {
  const [diagnoses, setDiagnoses] = useState(initialDiagnoses);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DiagnosisItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filteredDiagnoses = useMemo(() => {
    const searchText = keyword.trim().toLowerCase();

    return diagnoses.filter((diagnosis) => {
      const matchesKeyword = [
        diagnosis.id,
        diagnosis.customer,
        diagnosis.car,
        diagnosis.problem,
      ].some((value) => value.toLowerCase().includes(searchText));

      const matchesStatus =
        statusFilter === "Tất cả" || diagnosis.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [diagnoses, keyword, statusFilter]);

  const completedCount = diagnoses.filter(
    (diagnosis) => diagnosis.status === "Đã chẩn đoán",
  ).length;

  const inProgressCount = diagnoses.filter(
    (diagnosis) => diagnosis.status === "Đang chẩn đoán",
  ).length;

  const pendingCount = diagnoses.filter(
    (diagnosis) => diagnosis.status === "Chưa chẩn đoán",
  ).length;

  function openDiagnosis(diagnosis: DiagnosisItem) {
    setSelectedDiagnosis(diagnosis);
    setForm({
      problem: diagnosis.problem,
      cause: diagnosis.cause,
      result: diagnosis.result,
      recommendation: diagnosis.recommendation,
      status: diagnosis.status,
    });
    setError("");
    setMessage("");
  }

  function closeDiagnosis() {
    setSelectedDiagnosis(null);
    setError("");
  }

  function saveDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDiagnosis) {
      return;
    }

    if (
      !form.problem.trim() ||
      !form.cause.trim() ||
      !form.result.trim() ||
      !form.recommendation.trim()
    ) {
      setError("Vui lòng nhập đầy đủ thông tin chẩn đoán.");
      return;
    }

    setDiagnoses((current) =>
      current.map((diagnosis) =>
        diagnosis.id === selectedDiagnosis.id
          ? {
              ...diagnosis,
              problem: form.problem.trim(),
              cause: form.cause.trim(),
              result: form.result.trim(),
              recommendation: form.recommendation.trim(),
              status: form.status,
            }
          : diagnosis,
      ),
    );

    setMessage(`Đã cập nhật chẩn đoán ${selectedDiagnosis.id}.`);
    setSelectedDiagnosis(null);
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

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  CD
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
                  TỔNG PHIẾU CHẨN ĐOÁN
                </p>
                <p className="mt-3 text-[22px] font-bold">{diagnoses.length}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng số phiếu trong danh sách
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG XỬ LÝ
                </p>
                <p className="mt-3 text-[22px] font-bold">{inProgressCount}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đang chẩn đoán
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐÃ HOÀN THÀNH
                </p>
                <p className="mt-3 text-[22px] font-bold">{completedCount}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Phiếu đã có kết quả
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
                        : "bg-[#f0f1ef] text-[#20252b]"
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
                  DIAGNOSIS
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[14px] font-bold">
                    Danh sách chẩn đoán
                  </h2>
                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {filteredDiagnoses.length} phiếu
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-b border-[#eef0f2] p-5 md:grid-cols-[1fr_220px]">
                <div>
                  <label
                    htmlFor="diagnosis-search"
                    className="mb-2 block text-[11px] font-semibold"
                  >
                    Tìm kiếm phiếu
                  </label>
                  <input
                    id="diagnosis-search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Nhập mã phiếu, khách hàng hoặc biển số xe..."
                    className="w-full rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#8a9299]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="diagnosis-status"
                    className="mb-2 block text-[11px] font-semibold"
                  >
                    Trạng thái
                  </label>
                  <select
                    id="diagnosis-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-xl border border-[#e1e4e6] bg-white px-3 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  >
                    <option value="Tất cả">Tất cả trạng thái</option>
                    <option value="Chưa chẩn đoán">Chưa chẩn đoán</option>
                    <option value="Đang chẩn đoán">Đang chẩn đoán</option>
                    <option value="Đã chẩn đoán">Đã chẩn đoán</option>
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
                      className="text-[11px] font-semibold text-[#66717c] underline underline-offset-4 hover:text-[#20252b]"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {filteredDiagnoses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9dddf] px-5 py-12 text-center">
                    <p className="text-[13px] font-semibold">
                      Không tìm thấy phiếu chẩn đoán
                    </p>
                    <p className="mt-2 text-[11px] text-[#8a9299]">
                      Thử thay đổi từ khóa hoặc trạng thái tìm kiếm.
                    </p>
                  </div>
                ) : (
                  filteredDiagnoses.map((diagnosis, index) => (
                    <div
                      key={diagnosis.id}
                      className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-4 transition hover:border-[#d5d9dc] hover:bg-white sm:p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">{diagnosis.id}</p>
                              <span
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${statusStyles[diagnosis.status]}`}
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

                        <div className="min-w-0 flex-1 xl:max-w-xl">
                          <p className="text-[10px] text-[#8a9299]">
                            Hiện tượng
                          </p>
                          <p className="mt-1 break-words text-[11px] font-semibold">
                            {diagnosis.problem}
                          </p>

                          <p className="mt-3 text-[10px] text-[#8a9299]">
                            Nguyên nhân
                          </p>
                          <p className="mt-1 break-words text-[11px] font-semibold">
                            {diagnosis.cause || "Chưa ghi nhận"}
                          </p>

                          <p className="mt-3 text-[10px] text-[#8a9299]">
                            Kết quả chẩn đoán
                          </p>
                          <p className="mt-1 break-words text-[11px] font-semibold">
                            {diagnosis.result}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDiagnosis(diagnosis)}
                          className="shrink-0 rounded-xl bg-[#1f2933] px-5 py-3 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                        >
                          Xem / sửa chẩn đoán
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#eef0f2] px-5 py-4">
                <p className="text-[10px] text-[#8a9299]">
                  Chưa chẩn đoán: {pendingCount} phiếu · Đang chẩn đoán:{" "}
                  {inProgressCount} phiếu · Đã chẩn đoán: {completedCount} phiếu
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedDiagnosis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDiagnosis();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="diagnosis-modal-title"
            className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eef0f2] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a9299]">
                  PHIẾU {selectedDiagnosis.id}
                </p>
                <h2
                  id="diagnosis-modal-title"
                  className="mt-1 text-lg font-bold"
                >
                  Cập nhật chẩn đoán
                </h2>
                <p className="mt-1 text-[11px] text-[#8a9299]">
                  {selectedDiagnosis.customer} · {selectedDiagnosis.car}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDiagnosis}
                aria-label="Đóng biểu mẫu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f2] text-lg text-[#66717c] hover:bg-[#e9ebea]"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveDiagnosis} className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="diagnosis-problem"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Hiện tượng lỗi
                </label>
                <textarea
                  id="diagnosis-problem"
                  rows={2}
                  value={form.problem}
                  onChange={(event) =>
                    setForm({ ...form, problem: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  placeholder="Mô tả hiện tượng xe gặp phải"
                />
              </div>

              <div>
                <label
                  htmlFor="diagnosis-cause"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Nguyên nhân
                </label>
                <textarea
                  id="diagnosis-cause"
                  rows={2}
                  value={form.cause}
                  onChange={(event) =>
                    setForm({ ...form, cause: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  placeholder="Ghi nhận nguyên nhân xác định hoặc nghi ngờ"
                />
              </div>

              <div>
                <label
                  htmlFor="diagnosis-result"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Kết quả chẩn đoán
                </label>
                <textarea
                  id="diagnosis-result"
                  rows={3}
                  value={form.result}
                  onChange={(event) =>
                    setForm({ ...form, result: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  placeholder="Ghi kết quả kiểm tra kỹ thuật"
                />
              </div>

              <div>
                <label
                  htmlFor="diagnosis-recommendation"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Đề xuất sửa chữa
                </label>
                <textarea
                  id="diagnosis-recommendation"
                  rows={3}
                  value={form.recommendation}
                  onChange={(event) =>
                    setForm({ ...form, recommendation: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                  placeholder="Đề xuất hướng xử lý tiếp theo"
                />
              </div>

              <div>
                <label
                  htmlFor="diagnosis-status-edit"
                  className="mb-2 block text-[11px] font-semibold"
                >
                  Trạng thái chẩn đoán
                </label>
                <select
                  id="diagnosis-status-edit"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as DiagnosisStatus,
                    })
                  }
                  className="w-full rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                >
                  <option value="Chưa chẩn đoán">Chưa chẩn đoán</option>
                  <option value="Đang chẩn đoán">Đang chẩn đoán</option>
                  <option value="Đã chẩn đoán">Đã chẩn đoán</option>
                </select>
              </div>

              {error && (
                <p role="alert" className="text-[11px] font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDiagnosis}
                  className="rounded-xl border border-[#e1e4e6] px-5 py-3 text-[11px] font-semibold text-[#66717c] transition hover:bg-[#f7f7f5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Lưu chẩn đoán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Diagnosis;
