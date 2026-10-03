function Services() {
  const services = [
    {
      name: "Bảo dưỡng định kỳ",
      category: "Gói bảo dưỡng",
      description: "Kiểm tra và bảo dưỡng định kỳ",
    },
    {
      name: "Kiểm tra tổng quát",
      category: "Dịch vụ",
      description: "Kiểm tra tình trạng xe",
    },
    {
      name: "Thay dầu động cơ",
      category: "Dịch vụ",
      description: "Thay dầu theo nhu cầu",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        
        {/* Tiêu đề */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / DỊCH VỤ
          </p>

          <h1 className="text-[28px] font-bold">
            Dịch vụ & gói bảo dưỡng
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Khám phá các dịch vụ và gói bảo dưỡng hiện có.
          </p>
        </div>

        {/* Tìm kiếm */}
        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">
          <h2 className="mb-4 text-[15px] font-bold">
            Tìm kiếm dịch vụ
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            
            <select className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none">
              <option>Tất cả phân loại</option>
              <option>Gói bảo dưỡng</option>
              <option>Dịch vụ</option>
            </select>

            <input
              type="text"
              placeholder="Nhập tên dịch vụ..."
              className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
            />

            <button
              type="button"
              className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
            >
              Tìm kiếm
            </button>

          </div>

          <p className="mt-4 text-[11px] text-[#8a949e]">
            Tìm kiếm và lọc danh sách theo thông tin hiện có.
          </p>
        </div>

        {/* Danh sách */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white">
          
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách dịch vụ
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {services.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Dịch vụ / Gói</th>
                  <th className="px-6 py-4">Phân loại</th>
                  <th className="px-6 py-4">Mô tả</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {services.map((service, index) => (
                  <tr
                    key={service.name}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >
                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {service.name}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {service.category}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {service.description}
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        className="rounded-lg bg-[#20252b] px-4 py-2 text-[10px] font-semibold text-white hover:bg-[#111519]"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Services;