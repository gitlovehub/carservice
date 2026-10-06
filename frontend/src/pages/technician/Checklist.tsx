import { useState } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

const checklistItems = [
  "Kiểm tra ngoại thất và thân xe",
  "Kiểm tra mức dầu động cơ",
  "Kiểm tra hệ thống phanh",
  "Kiểm tra lốp và áp suất lốp",
  "Kiểm tra hệ thống đèn",
  "Chạy thử và kiểm tra sau sửa chữa",
];

function Checklist() {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    checklistItems.map(() => false),
  );

  const completedCount = checkedItems.filter(Boolean).length;

  const handleCheck = (index: number) => {
    setCheckedItems((current) =>
      current.map((checked, itemIndex) =>
        itemIndex === index ? !checked : checked,
      ),
    );
  };

  const isCompleted = completedCount === checklistItems.length;

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                KỸ THUẬT VIÊN / CHECKLIST
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Review & Test
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Kiểm tra các hạng mục trước khi hoàn tất phiếu sửa chữa.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  CL
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  PHIẾU SỬA CHỮA
                </p>

                <p className="mt-3 text-[22px] font-bold">PSC-001</p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Toyota Vios · 30A-123.45
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  HOÀN THÀNH CHECKLIST
                </p>

                <p className="mt-3 text-[22px] font-bold">
                  {completedCount}/{checklistItems.length}
                </p>

                <p className="mt-1 text-[10px] text-[#8a9299]">
                  Hạng mục đã kiểm tra
                </p>
              </div>

              <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                  TRẠNG THÁI
                </p>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-semibold ${
                      isCompleted
                        ? "bg-[#eef7f0] text-[#39734a]"
                        : "bg-[#f5f1e8] text-[#876d35]"
                    }`}
                  >
                    {isCompleted ? "Sẵn sàng hoàn tất" : "Đang kiểm tra"}
                  </span>
                </div>

                <p className="mt-2 text-[10px] text-[#8a9299]">
                  Review & Test
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

                <p className="mt-3 text-[12px] font-semibold">Chẩn đoán</p>

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
                className="rounded-2xl border border-[#1f2933] bg-[#1f2933] p-4 text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold">
                  CL
                </div>

                <p className="mt-3 text-[12px] font-semibold">Checklist</p>

                <p className="mt-1 text-[9px] text-[#cbd0d5]">
                  Review & Test
                </p>
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
              <div className="border-b border-[#eef0f2] px-5 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                  REVIEW & TEST
                </p>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-bold">
                    Checklist kiểm tra xe
                  </h2>

                  <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                    {completedCount}/{checklistItems.length}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-5 rounded-2xl bg-[#f3f4f2] p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[12px] font-bold">Toyota Vios</p>

                      <p className="mt-1 text-[10px] text-[#8a9299]">
                        PSC-001 · 30A-123.45 · Nguyễn Tiến Hiền
                      </p>
                    </div>

                    <p className="text-[11px] font-bold">
                      {completedCount}/{checklistItems.length}
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e1e4e6]">
                    <div
                      className="h-full rounded-full bg-[#1f2933]"
                      style={{
                        width: `${(completedCount / checklistItems.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {checklistItems.map((item, index) => (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                        checkedItems[index]
                          ? "border-[#d8e8dc] bg-[#f4faf5]"
                          : "border-[#e5e8ea] bg-[#fafbfb] hover:border-[#d5d9dc] hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checkedItems[index]}
                        onChange={() => handleCheck(index)}
                        className="h-4 w-4 accent-[#1f2933]"
                      />

                      <div className="flex-1">
                        <p
                          className={`text-[11px] font-semibold ${
                            checkedItems[index]
                              ? "text-[#39734a]"
                              : "text-[#20252b]"
                          }`}
                        >
                          {item}
                        </p>

                        <p className="mt-1 text-[9px] text-[#8a9299]">
                          Hạng mục {index + 1}
                        </p>
                      </div>

                      {checkedItems[index] && (
                        <span className="rounded-lg bg-[#eef7f0] px-3 py-1.5 text-[9px] font-semibold text-[#39734a]">
                          Đã kiểm tra
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                  <p className="text-[10px] leading-5 text-[#8a9299]">
                    Chỉ hoàn tất Review & Test khi tất cả hạng mục đã được kiểm
                    tra.
                  </p>

                  <button
                    type="button"
                    disabled={!isCompleted}
                    className={`rounded-xl px-5 py-3 text-[10px] font-semibold transition ${
                      isCompleted
                        ? "bg-[#1f2933] text-white hover:bg-[#151d24]"
                        : "cursor-not-allowed bg-[#eef0f2] text-[#9aa1a8]"
                    }`}
                  >
                    Hoàn tất Review & Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Checklist;