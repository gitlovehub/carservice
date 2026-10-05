import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KỸ THUẬT VIÊN / CHECKLIST
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Review & Test
          </h1>

          <p className="mt-2 text-xs leading-5 text-[#7b858f]">
            Kiểm tra các hạng mục trước khi hoàn tất phiếu sửa chữa.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Phiếu sửa chữa
            </p>

            <p className="mt-4 text-2xl font-bold">
              PSC-001
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Toyota Vios · 30A-123.45
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Hoàn thành checklist
            </p>

            <p className="mt-4 text-2xl font-bold">
              {completedCount}/{checklistItems.length}
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Hạng mục đã kiểm tra
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              Trạng thái
            </p>

            <div className="mt-4">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                  isCompleted
                    ? "bg-[#eef7f0] text-[#39734a]"
                    : "bg-[#f5f1e8] text-[#876d35]"
                }`}
              >
                {isCompleted ? "Sẵn sàng hoàn tất" : "Đang kiểm tra"}
              </span>
            </div>

            <p className="mt-2 text-[10px] text-[#8a949e]">
              Review & Test
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Link
            to="/assigned-repairs"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              PS
            </div>
            <p className="mt-4 text-xs font-semibold">
              Phiếu được phân công
            </p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Công việc được giao
            </p>
          </Link>

          <Link
            to="/vehicle-check"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              KT
            </div>
            <p className="mt-4 text-xs font-semibold">
              Kiểm tra xe
            </p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Kiểm tra tình trạng xe
            </p>
          </Link>

          <Link
            to="/diagnosis"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              CD
            </div>
            <p className="mt-4 text-xs font-semibold">
              Chẩn đoán
            </p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Ghi nhận lỗi xe
            </p>
          </Link>

          <Link
            to="/repair-progress"
            className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2f3] text-[10px] font-bold">
              TD
            </div>
            <p className="mt-4 text-xs font-semibold">
              Tiến độ sửa chữa
            </p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cập nhật tiến độ
            </p>
          </Link>

          <Link
            to="/checklist"
            className="rounded-2xl border border-[#20252b] bg-[#20252b] p-5 text-white shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-bold">
              CL
            </div>
            <p className="mt-4 text-xs font-semibold">
              Checklist
            </p>
            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Review & Test
            </p>
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="border-b border-[#eef0f2] px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              REVIEW & TEST
            </p>

            <h2 className="mt-1 text-base font-bold">
              Checklist kiểm tra xe
            </h2>
          </div>

          <div className="p-6">
            <div className="mb-5 rounded-2xl bg-[#f8f9fa] p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold">
                    Toyota Vios
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a949e]">
                    PSC-001 · 30A-123.45 · Nguyễn Tiến Hiền
                  </p>
                </div>

                <p className="text-xs font-bold">
                  {completedCount}/{checklistItems.length}
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5e8ea]">
                <div
                  className="h-full rounded-full bg-[#20252b]"
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
                      : "border-[#e5e8ea] bg-[#fafbfb] hover:border-[#d5d9dc]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedItems[index]}
                    onChange={() => handleCheck(index)}
                    className="h-4 w-4 accent-[#20252b]"
                  />

                  <div className="flex-1">
                    <p
                      className={`text-xs font-semibold ${
                        checkedItems[index]
                          ? "text-[#39734a]"
                          : "text-[#20252b]"
                      }`}
                    >
                      {item}
                    </p>

                    <p className="mt-1 text-[10px] text-[#8a949e]">
                      Hạng mục {index + 1}
                    </p>
                  </div>

                  {checkedItems[index] && (
                    <span className="rounded-full bg-[#eef7f0] px-3 py-1.5 text-[10px] font-semibold text-[#39734a]">
                      Đã kiểm tra
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
              <p className="text-[10px] leading-5 text-[#8a949e]">
                Chỉ hoàn tất Review & Test khi tất cả hạng mục đã được kiểm tra.
              </p>

              <button
                type="button"
                disabled={!isCompleted}
                className={`rounded-xl px-5 py-3 text-xs font-semibold transition ${
                  isCompleted
                    ? "bg-[#20252b] text-white hover:bg-[#343a40]"
                    : "cursor-not-allowed bg-[#eef0f2] text-[#9aa1a8]"
                }`}
              >
                Hoàn tất Review & Test
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Checklist;