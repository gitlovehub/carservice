
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

type CheckStatus = "Đã kiểm tra" | "Đang kiểm tra" | "Chưa kiểm tra";

type VehicleCheckItem = {
  id: string;
  customer: string;
  car: string;
  plate: string;
  mileage: string;
  status: CheckStatus;
  date: string;
  condition: string;
  notes: string;
};

const initialChecks: VehicleCheckItem[] = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    mileage: "32.500 km",
    status: "Đã kiểm tra",
    date: "03/10/2026",
    condition: "Xe hoạt động bình thường",
    notes: "Cần theo dõi tình trạng lốp xe.",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "30F-111.11",
    mileage: "45.800 km",
    status: "Đang kiểm tra",
    date: "03/10/2026",
    condition: "",
    notes: "",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City",
    plate: "30G-222.22",
    mileage: "18.200 km",
    status: "Chưa kiểm tra",
    date: "03/10/2026",
    condition: "",
    notes: "",
  },
];

const statusStyles: Record<CheckStatus, string> = {
  "Đã kiểm tra": "bg-[#eef7f0] text-[#39734a]",
  "Đang kiểm tra": "bg-[#f5f1e8] text-[#876d35]",
  "Chưa kiểm tra": "bg-[#eef0f2] text-[#5f6871]",
};

const quickLinks = [
  {
    path: "/assigned-repairs",
    code: "PS",
    title: "Phiếu được phân công",
    description: "Công việc được giao",
  },
  {
    path: "/vehicle-check",
    code: "KT",
    title: "Kiểm tra xe",
    description: "Kiểm tra tình trạng xe",
    active: true,
  },
  {
    path: "/diagnosis",
    code: "CD",
    title: "Chẩn đoán",
    description: "Ghi nhận lỗi xe",
  },
  {
    path: "/repair-progress",
    code: "TD",
    title: "Tiến độ sửa chữa",
    description: "Cập nhật tiến độ",
  },
  {
    path: "/checklist",
    code: "CL",
    title: "Checklist",
    description: "Review & Test",
  },
];

function VehicleCheck() {
  const [checks, setChecks] = useState(initialChecks);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [selectedCheck, setSelectedCheck] =
    useState<VehicleCheckItem | null>(null);
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filteredChecks = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return checks.filter((check) => {
      const matchesKeyword = [
        check.id,
        check.customer,
        check.car,
        check.plate,
      ].some((value) => value.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === "Tất cả" || check.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [checks, keyword, statusFilter]);

  const completedCount = checks.filter(
    (check) => check.status === "Đã kiểm tra",
  ).length;

  const inProgressCount = checks.filter(
    (check) => check.status === "Đang kiểm tra",
  ).length;

  const openCheckForm = (check: VehicleCheckItem) => {
    setSelectedCheck(check);
    setMileage(check.mileage.replace(/\D/g, ""));
    setCondition(check.condition);
    setNotes(check.notes);
    setError("");
    setMessage("");
  };

  const closeCheckForm = () => {
    setSelectedCheck(null);
    setError("");
  };

  const saveCheck = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCheck) return;

    if (!mileage.trim() || !/^\d+$/.test(mileage.trim())) {
      setError("Vui lòng nhập số km hợp lệ.");
      return;
    }

    if (!condition.trim()) {
      setError("Vui lòng chọn tình trạng xe.");
      return;
    }

    setChecks((currentChecks) =>
      currentChecks.map((check) =>
        check.id === selectedCheck.id
          ? {
              ...check,
              mileage: `${Number(mileage).toLocaleString("vi-VN")} km`,
              condition,
              notes: notes.trim(),
              status: "Đã kiểm tra",
            }
          : check,
      ),
    );

    setMessage(`Đã cập nhật phiếu ${selectedCheck.id}.`);
    setSelectedCheck(null);
    setError("");
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("Tất cả");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                KỸ THUẬT VIÊN / KIỂM TRA XE
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Kiểm tra xe
                  </h2>
                  <p className="mt-1 text-xs text-[#8a9299]">
                    Kiểm tra tình trạng thực tế của xe trước khi tiến hành sửa
                    chữa.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  KT
                </div>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#cfe5d4] bg-[#eef7f0] px-4 py-3 text-sm text-[#39734a]"
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
                  TỔNG PHIẾU KIỂM TRA
                </p>
                <p className="mt-3 text-[22px] font-bold">{checks.length}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Tổng số phiếu hiện có
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐANG KIỂM TRA
                </p>
                <p className="mt-3 text-[22px] font-bold">{inProgressCount}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Đang thực hiện kiểm tra
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  ĐÃ KIỂM TRA
                </p>
                <p className="mt-3 text-[22px] font-bold">{completedCount}</p>
                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Hoàn tất kiểm tra
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
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
                  <p className="mt-3 text-xs font-semibold">{item.title}</p>
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
                  VEHICLE CHECK
                </p>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold">
                    Danh sách xe cần kiểm tra
                  </h2>
                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {filteredChecks.length} phiếu
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
                  <div className="relative">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="Tìm mã phiếu, khách hàng, xe..."
                      aria-label="Tìm kiếm phiếu kiểm tra"
                      className="w-full rounded-xl border border-[#e1e4e6] bg-[#fafbfb] px-4 py-3 text-xs outline-none transition placeholder:text-[#a0a6ac] focus:border-[#8a9299]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Lọc trạng thái kiểm tra"
                    className="rounded-xl border border-[#e1e4e6] bg-[#fafbfb] px-4 py-3 text-xs outline-none focus:border-[#8a9299]"
                  >
                    <option value="Tất cả">Tất cả trạng thái</option>
                    <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                    <option value="Đang kiểm tra">Đang kiểm tra</option>
                    <option value="Đã kiểm tra">Đã kiểm tra</option>
                  </select>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-[#e1e4e6] px-4 py-3 text-xs font-semibold transition hover:bg-[#f7f7f5]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {filteredChecks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d8dcdf] px-5 py-12 text-center">
                    <p className="text-sm font-semibold">
                      Không tìm thấy phiếu kiểm tra
                    </p>
                    <p className="mt-2 text-xs text-[#8a9299]">
                      Thử từ khóa khác hoặc thay đổi trạng thái lọc.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 rounded-xl bg-[#1f2933] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#151d24]"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  filteredChecks.map((check, index) => (
                    <div
                      key={check.id}
                      className="rounded-2xl border border-[#e5e8ea] bg-[#fafbfb] p-4 transition hover:border-[#d5d9dc] hover:bg-white sm:p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">{check.id}</p>
                              <span
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${statusStyles[check.status]}`}
                              >
                                {check.status}
                              </span>
                            </div>

                            <p className="mt-2 text-xs font-semibold">
                              {check.customer}
                            </p>
                            <p className="mt-1 text-[10px] text-[#8a9299]">
                              {check.car} · {check.plate}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] text-[#8a9299]">
                              Số km
                            </p>
                            <p className="mt-1 text-[11px] font-semibold">
                              {check.mileage}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#8a9299]">
                              Ngày kiểm tra
                            </p>
                            <p className="mt-1 text-[11px] font-semibold">
                              {check.date}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#8a9299]">
                              Mã phiếu
                            </p>
                            <p className="mt-1 text-[11px] font-semibold">
                              {check.id}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCheckForm(check)}
                          className="shrink-0 rounded-xl bg-[#1f2933] px-5 py-3 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                        >
                          {check.status === "Đã kiểm tra"
                            ? "Xem / sửa"
                            : "Kiểm tra"}
                        </button>
                      </div>

                      {check.condition && (
                        <div className="mt-4 rounded-xl border border-[#e9ebed] bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold text-[#66717c]">
                            Tình trạng ghi nhận
                          </p>
                          <p className="mt-1 text-xs">{check.condition}</p>
                          {check.notes && (
                            <p className="mt-1 text-[11px] text-[#8a9299]">
                              Ghi chú: {check.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedCheck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCheckForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-check-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eef0f2] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                  VEHICLE CHECK / {selectedCheck.id}
                </p>
                <h2
                  id="vehicle-check-title"
                  className="mt-2 text-lg font-bold"
                >
                  Ghi nhận tình trạng xe
                </h2>
                <p className="mt-1 text-xs text-[#8a9299]">
                  {selectedCheck.customer} · {selectedCheck.car}
                </p>
                <p className="mt-1 text-xs text-[#8a9299]">
                  Biển số: {selectedCheck.plate}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckForm}
                aria-label="Đóng biểu mẫu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e1e4e6] text-lg text-[#66717c] hover:bg-[#f7f7f5]"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCheck} className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="vehicle-mileage"
                  className="mb-2 block text-xs font-semibold"
                >
                  Số km hiện tại
                </label>
                <div className="relative">
                  <input
                    id="vehicle-mileage"
                    type="number"
                    min="0"
                    step="1"
                    value={mileage}
                    onChange={(event) => setMileage(event.target.value)}
                    placeholder="Nhập số km"
                    className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 pr-14 text-sm outline-none focus:border-[#8a9299]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8a9299]">
                    km
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="vehicle-condition"
                  className="mb-2 block text-xs font-semibold"
                >
                  Tình trạng xe
                </label>
                <select
                  id="vehicle-condition"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  className="w-full rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-sm outline-none focus:border-[#8a9299]"
                  required
                >
                  <option value="">Chọn tình trạng xe</option>
                  <option value="Xe hoạt động bình thường">
                    Xe hoạt động bình thường
                  </option>
                  <option value="Có dấu hiệu bất thường">
                    Có dấu hiệu bất thường
                  </option>
                  <option value="Cần kiểm tra chuyên sâu">
                    Cần kiểm tra chuyên sâu
                  </option>
                  <option value="Có hư hỏng cần sửa chữa">
                    Có hư hỏng cần sửa chữa
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="vehicle-notes"
                  className="mb-2 block text-xs font-semibold"
                >
                  Ghi chú kiểm tra
                </label>
                <textarea
                  id="vehicle-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Mô tả tình trạng lốp, phanh, động cơ hoặc các dấu hiệu bất thường..."
                  className="w-full resize-y rounded-xl border border-[#e1e4e6] px-4 py-3 text-sm outline-none placeholder:text-[#a0a6ac] focus:border-[#8a9299]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCheckForm}
                  className="rounded-xl border border-[#e1e4e6] px-5 py-3 text-xs font-semibold transition hover:bg-[#f7f7f5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Lưu kết quả kiểm tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleCheck;
