import { Link } from "react-router-dom";
import Header from "../../components/Header";

function Inventory() {
  const parts = [
    {
      id: 1,
      name: "Dầu động cơ 5W-30",
      code: "DAU-5W30",
      quantity: 25,
      minimum: 10,
      status: "Còn hàng",
    },
    {
      id: 2,
      name: "Lọc dầu Toyota",
      code: "LOC-TOYOTA",
      quantity: 8,
      minimum: 10,
      status: "Sắp hết",
    },
    {
      id: 3,
      name: "Má phanh trước",
      code: "MP-TRUOC",
      quantity: 18,
      minimum: 5,
      status: "Còn hàng",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <div className="mx-auto flex max-w-[1200px]">
        <aside className="w-60 border-r border-[#e1e4e7] bg-white px-4 py-6">
          <p className="mb-4 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="mb-6 flex items-center gap-3 rounded-lg bg-[#f1f3f5] px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              AD
            </div>

            <div>
              <p className="text-[12px] font-semibold">Quản trị viên</p>
              <p className="text-[10px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>

          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            CHỨC NĂNG
          </p>

          <div className="space-y-1">
            <Link
              to="/admin"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Tài khoản & nhân viên
            </Link>

            <Link
              to="/admin/services"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Dịch vụ & gói bảo dưỡng
            </Link>

            <Link
              to="/admin/inventory"
              className="block rounded-lg bg-[#20252b] px-3 py-2.5 text-[12px] font-medium text-white"
            >
              Phụ tùng & tồn kho
            </Link>

            <Link
              to="/admin/reports"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
            >
              Báo cáo & thống kê
            </Link>
          </div>

          <div className="mt-8 border-t border-[#eef0f2] pt-6">
            <button className="w-full rounded-lg border border-[#d9dde1] px-3 py-2.5 text-[11px] font-medium">
              MỞ CHECKLIST REVIEW & TEST
            </button>
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <div className="mb-8">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
              GARA / PHỤ TÙNG & TỒN KHO
            </p>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Phụ tùng & tồn kho
                </h1>

                <p className="mt-2 text-[12px] text-[#707a84]">
                  Quản lý phụ tùng, số lượng và tình trạng tồn kho.
                </p>
              </div>

              <button className="rounded-lg bg-[#20252b] px-4 py-2.5 text-[11px] font-semibold text-white">
                Thêm phụ tùng
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">TỔNG PHỤ TÙNG</p>
              <p className="mt-2 text-2xl font-bold">48</p>
            </div>

            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">CÒN HÀNG</p>
              <p className="mt-2 text-2xl font-bold">35</p>
            </div>

            <div className="rounded-xl border border-[#e1e4e7] bg-white p-5">
              <p className="text-[10px] text-[#8a949e]">SẮP HẾT</p>
              <p className="mt-2 text-2xl font-bold">13</p>
            </div>
          </div>

          <section className="rounded-xl border border-[#e1e4e7] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[14px] font-bold">
                Danh sách phụ tùng
              </h2>

              <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px]">
                Nhập kho
              </button>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eef0f2] bg-[#fafbfc]">
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">STT</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">PHỤ TÙNG</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">MÃ PHỤ TÙNG</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">SỐ LƯỢNG</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">MỨC TỐI THIỂU</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">TRẠNG THÁI</th>
                </tr>
              </thead>

              <tbody>
                {parts.map((part) => (
                  <tr key={part.id} className="border-b border-[#eef0f2]">
                    <td className="px-5 py-4 text-[12px]">{part.id}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold">
                      {part.name}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#555f69]">
                      {part.code}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      {part.quantity}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      {part.minimum}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      {part.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Inventory;