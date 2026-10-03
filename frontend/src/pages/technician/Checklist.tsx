import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";

function Checklist() {
  const [items, setItems] = useState([
    { id: 1, name: "Kiểm tra dầu động cơ", checked: true },
    { id: 2, name: "Kiểm tra hệ thống phanh", checked: true },
    { id: 3, name: "Kiểm tra lốp xe", checked: false },
    { id: 4, name: "Kiểm tra đèn xe", checked: false },
    { id: 5, name: "Kiểm tra điều hòa", checked: false },
    { id: 6, name: "Chạy thử xe", checked: false },
  ]);

  const handleCheck = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const completed = items.filter((item) => item.checked).length;

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / CHECKLIST REVIEW & TEST
          </p>

          <h1 className="text-[24px] font-bold">
            Checklist Review & Test
          </h1>

          <p className="mt-2 text-[13px] text-[#7b858f]">
            Kiểm tra lại tình trạng xe trước khi hoàn tất phiếu sửa chữa.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-5 gap-3">
          <Link
            to="/assigned-repairs"
            className="rounded-xl border border-[#e1e4e7] bg-white p-4 hover:bg-[#fafafa]"
          >
            <p className="text-[12px] font-semibold">Phiếu được phân công</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Danh sách phiếu
            </p>
          </Link>

          <Link
            to="/vehicle-check"
            className="rounded-xl border border-[#e1e4e7] bg-white p-4 hover:bg-[#fafafa]"
          >
            <p className="text-[12px] font-semibold">Kiểm tra xe</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Kiểm tra ban đầu
            </p>
          </Link>

          <Link
            to="/diagnosis"
            className="rounded-xl border border-[#e1e4e7] bg-white p-4 hover:bg-[#fafafa]"
          >
            <p className="text-[12px] font-semibold">Chẩn đoán</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Xác định tình trạng
            </p>
          </Link>

          <Link
            to="/repair-progress"
            className="rounded-xl border border-[#e1e4e7] bg-white p-4 hover:bg-[#fafafa]"
          >
            <p className="text-[12px] font-semibold">Tiến độ sửa chữa</p>
            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cập nhật tiến độ
            </p>
          </Link>

          <div className="rounded-xl border border-[#20252b] bg-[#20252b] p-4 text-white">
            <p className="text-[12px] font-semibold">Checklist</p>
            <p className="mt-1 text-[10px] text-[#c8cdd2]">
              Review & Test
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                PHIẾU SỬA CHỮA
              </p>

              <p className="mt-1 text-[16px] font-bold">
                PSC-001 · Toyota Vios
              </p>

              <p className="mt-1 text-[12px] text-[#7b858f]">
                Biển số: 30A-12345 · Khách hàng: Nguyễn Tiến Hiền
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-[#8a949e]">
                HOÀN THÀNH
              </p>

              <p className="mt-1 text-[20px] font-bold">
                {completed}/{items.length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          <div className="rounded-xl border border-[#e1e4e7] bg-white">
            <div className="border-b border-[#e1e4e7] px-5 py-4">
              <h2 className="text-[14px] font-bold">
                Checklist kiểm tra
              </h2>

              <p className="mt-1 text-[11px] text-[#8a949e]">
                Đánh dấu các hạng mục đã kiểm tra.
              </p>
            </div>

            <div className="divide-y divide-[#eef0f2]">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-[#fafafa]"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleCheck(item.id)}
                    className="h-4 w-4"
                  />

                  <div className="flex-1">
                    <p
                      className={`text-[13px] font-medium ${
                        item.checked
                          ? "text-[#20252b]"
                          : "text-[#5f6973]"
                      }`}
                    >
                      {item.name}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      item.checked
                        ? "bg-[#e8f1ff] text-[#2563a8]"
                        : "bg-[#fff4d6] text-[#9a6b00]"
                    }`}
                  >
                    {item.checked ? "Đã kiểm tra" : "Chưa kiểm tra"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
              REVIEW & TEST
            </p>

            <h2 className="mt-2 text-[16px] font-bold">
              Tổng kết kiểm tra
            </h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-[#f6f7f8] p-4">
                <p className="text-[10px] text-[#8a949e]">
                  ĐÃ HOÀN THÀNH
                </p>

                <p className="mt-1 text-[20px] font-bold">
                  {completed} / {items.length}
                </p>
              </div>

              <div className="rounded-lg bg-[#f6f7f8] p-4">
                <p className="text-[10px] text-[#8a949e]">
                  TRẠNG THÁI
                </p>

                <p className="mt-1 text-[12px] font-semibold">
                  {completed === items.length
                    ? "Đã hoàn tất kiểm tra"
                    : "Đang kiểm tra"}
                </p>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-[#20252b] px-4 py-3 text-[12px] font-semibold text-white hover:bg-[#343a40]"
              >
                Hoàn tất Review & Test
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-10 border-t border-[#e1e4e7] pt-5 text-[10px] text-[#8a949e]">
          CarService · Giao diện nội bộ kỹ thuật viên
        </footer>
      </main>
    </div>
  );
}

export default Checklist;