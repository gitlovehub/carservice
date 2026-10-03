import { Link } from "react-router-dom";
import Header from "../../components/Header";

const repairs = [
  {
    id: 1,
    code: "PSC-001",
    car: "Toyota Vios",
    service: "Bảo dưỡng định kỳ",
    date: "23/06/2026",
    status: "Đang kiểm tra",
  },
  {
    id: 2,
    code: "PSC-003",
    car: "Mazda 3",
    service: "Kiểm tra tổng quát",
    date: "24/06/2026",
    status: "Chưa bắt đầu",
  },
];

function AssignedRepairs() {
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              KT
            </div>

            <div>
              <h1 className="text-[18px] font-bold">
                Kỹ thuật viên
              </h1>

              <p className="text-[11px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-5 gap-3">
          <Link
            to="/assigned-repairs"
            className="rounded-xl border border-[#20252b] bg-[#20252b] px-4 py-4 text-white"
          >
            <p className="text-[12px] font-semibold">
              Phiếu được phân công
            </p>

            <p className="mt-1 text-[10px] text-[#cbd0d5]">
              Phiếu đang phụ trách
            </p>
          </Link>

          <Link
            to="/vehicle-check"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Kiểm tra xe
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Kiểm tra tình trạng xe
            </p>
          </Link>

          <Link
            to="/diagnosis"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Chẩn đoán
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Chẩn đoán lỗi
            </p>
          </Link>

          <Link
            to="/repair-progress"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Tiến độ sửa chữa
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Cập nhật tiến độ
            </p>
          </Link>

          <Link
            to="/checklist"
            className="rounded-xl border border-[#e1e4e7] bg-white px-4 py-4 hover:bg-[#f9fafb]"
          >
            <p className="text-[12px] font-semibold">
              Checklist
            </p>

            <p className="mt-1 text-[10px] text-[#8a949e]">
              Review & Test
            </p>
          </Link>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / PHIẾU ĐƯỢC PHÂN CÔNG
          </p>

          <h2 className="text-[24px] font-bold">
            Phiếu sửa chữa được phân công
          </h2>

          <p className="mt-1 text-[12px] text-[#8a949e]">
            Xem yêu cầu dịch vụ, báo giá và các phiếu đang phụ trách.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
          <p className="mb-4 text-[12px] font-semibold">
            Tìm kiếm phiếu được phân công
          </p>

          <div className="grid grid-cols-[1.5fr_1fr_auto] gap-3">
            <input
              placeholder="Mã phiếu hoặc tên xe"
              className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none"
            />

            <select className="rounded-lg border border-[#d9dde1] px-4 py-2.5 text-[12px] outline-none">
              <option>Tất cả trạng thái</option>
              <option>Đang kiểm tra</option>
              <option>Chưa bắt đầu</option>
            </select>

            <button className="rounded-lg bg-[#20252b] px-5 py-2.5 text-[12px] font-semibold text-white">
              Tìm kiếm
            </button>
          </div>

          <p className="mt-3 text-[10px] text-[#8a949e]">
            Tìm kiếm và lọc danh sách theo thông tin hiện có.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e1e4e7] bg-white">
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-5 py-4">
            <p className="text-[13px] font-semibold">
              Danh sách phiếu được phân công
            </p>

            <p className="text-[11px] text-[#8a949e]">
              2 kết quả
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e1e4e7] bg-[#fafbfc] text-left">
                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  STT
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  MÃ PHIẾU
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  XE
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  YÊU CẦU DỊCH VỤ
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  NGÀY NHẬN
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  TRẠNG THÁI
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                  THAO TÁC
                </th>
              </tr>
            </thead>

            <tbody>
              {repairs.map((repair, index) => (
                <tr
                  key={repair.id}
                  className="border-b border-[#eef0f2] last:border-0"
                >
                  <td className="px-5 py-4 text-[12px]">
                    {index + 1}
                  </td>

                  <td className="px-5 py-4 text-[12px] font-semibold">
                    {repair.code}
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {repair.car}
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {repair.service}
                  </td>

                  <td className="px-5 py-4 text-[12px]">
                    {repair.date}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        repair.status === "Đang kiểm tra"
                          ? "bg-[#e8f1ff] text-[#2563a8]"
                          : "bg-[#fff4d6] text-[#9a6b00]"
                      }`}
                    >
                      {repair.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[11px] font-semibold">
                        Xem yêu cầu
                      </button>

                      <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[11px] font-semibold">
                        Xem báo giá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="mt-10 border-t border-[#e1e4e7] bg-white">
        <div className="mx-auto flex max-w-[1200px] justify-between px-6 py-5">
          <p className="text-[10px] text-[#8a949e]">
            © CarService · Quản lý dịch vụ ô tô
          </p>

          <p className="text-[10px] text-[#8a949e]">
            Dịch vụ bảo dưỡng và sửa chữa ô tô
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AssignedRepairs;