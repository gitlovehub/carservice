import { Link } from "react-router-dom";
import Header from "../../components/Header";

function Services() {
  const services = [
    {
      id: 1,
      name: "Bảo dưỡng định kỳ",
      description: "Kiểm tra và bảo dưỡng xe theo định kỳ",
      price: "1.500.000đ",
      status: "Đang hoạt động",
    },
    {
      id: 2,
      name: "Thay dầu động cơ",
      description: "Thay dầu và kiểm tra động cơ",
      price: "800.000đ",
      status: "Đang hoạt động",
    },
    {
      id: 3,
      name: "Kiểm tra phanh",
      description: "Kiểm tra hệ thống phanh",
      price: "500.000đ",
      status: "Đang hoạt động",
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
              className="block rounded-lg bg-[#20252b] px-3 py-2.5 text-[12px] font-medium text-white"
            >
              Dịch vụ & gói bảo dưỡng
            </Link>

            <Link
              to="/admin/inventory"
              className="block rounded-lg px-3 py-2.5 text-[12px] text-[#555f69] hover:bg-[#f6f7f8]"
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
              GARA / DỊCH VỤ & GÓI BẢO DƯỠNG
            </p>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Dịch vụ & gói bảo dưỡng
                </h1>

                <p className="mt-2 text-[12px] text-[#707a84]">
                  Quản lý các dịch vụ và gói bảo dưỡng của gara.
                </p>
              </div>

              <button className="rounded-lg bg-[#20252b] px-4 py-2.5 text-[11px] font-semibold text-white">
                Thêm dịch vụ
              </button>
            </div>
          </div>

          <section className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
            <h2 className="mb-4 text-[14px] font-bold">
              Tìm kiếm dịch vụ
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Tên dịch vụ..."
                className="flex-1 rounded-lg border border-[#d9dde1] px-3 py-2.5 text-[12px] outline-none"
              />

              <select className="w-48 rounded-lg border border-[#d9dde1] bg-white px-3 py-2.5 text-[12px]">
                <option>Tất cả trạng thái</option>
                <option>Đang hoạt động</option>
                <option>Ngừng hoạt động</option>
              </select>

              <button className="rounded-lg bg-[#20252b] px-5 py-2.5 text-[11px] font-semibold text-white">
                Tìm kiếm
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[#e1e4e7] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[14px] font-bold">
                Danh sách dịch vụ
              </h2>

              <span className="text-[11px] text-[#8a949e]">
                {services.length} dịch vụ
              </span>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eef0f2] bg-[#fafbfc]">
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">STT</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">DỊCH VỤ</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">MÔ TẢ</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">GIÁ</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">TRẠNG THÁI</th>
                  <th className="px-5 py-3 text-[10px] text-[#8a949e]">THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-[#eef0f2]">
                    <td className="px-5 py-4 text-[12px]">{service.id}</td>
                    <td className="px-5 py-4 text-[12px] font-semibold">
                      {service.name}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#555f69]">
                      {service.description}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      {service.price}
                    </td>
                    <td className="px-5 py-4 text-[12px]">
                      {service.status}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px]">
                          Sửa
                        </button>

                        <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px]">
                          Xóa
                        </button>
                      </div>
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

export default Services;