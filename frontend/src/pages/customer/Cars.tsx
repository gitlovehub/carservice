import { useState } from "react";

function Cars() {
  const [plate, setPlate] = useState("");

  const cars = [
    {
      id: 1,
      name: "Toyota Vios",
      plate: "30A-123.45",
      history: "2 lần bảo dưỡng",
    },
    {
      id: 2,
      name: "Honda City",
      plate: "30F-678.90",
      history: "1 lần bảo dưỡng",
    },
  ];

  const filteredCars = cars.filter((car) => {
    return plate === "" || car.plate === plate;
  });

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1200px] px-6 py-10">

        {/* HEADER */}
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            GARA / XE CỦA TÔI
          </p>

          <h1 className="text-[28px] font-bold">
            Xe của tôi
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Quản lý xe và xem lịch sử bảo dưỡng.
          </p>
        </div>

        {/* ADD CAR */}
        <div className="mb-8 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-[#20252b] px-5 py-3 text-[12px] font-semibold text-white hover:bg-[#111519]"
          >
            Thêm xe
          </button>
        </div>

        {/* SEARCH */}
        <div className="mb-8 rounded-xl border border-[#e1e4e7] bg-white p-6">
          <h2 className="mb-4 text-[15px] font-bold">
            Tìm kiếm xe của tôi
          </h2>

          <div className="grid gap-4 md:grid-cols-3">

            <select
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
            >
              <option value="">Tất cả biển số</option>
              <option value="30A-123.45">30A-123.45</option>
              <option value="30F-678.90">30F-678.90</option>
            </select>

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

        {/* TABLE */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white">

          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Danh sách xe của tôi
            </h2>

            <span className="text-[11px] text-[#8a949e]">
              {filteredCars.length} kết quả
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead>
                <tr className="border-b border-[#e1e4e7] text-[10px] uppercase text-[#8a949e]">

                  <th className="px-6 py-4">
                    STT
                  </th>

                  <th className="px-6 py-4">
                    Xe / Dòng xe
                  </th>

                  <th className="px-6 py-4">
                    Biển số
                  </th>

                  <th className="px-6 py-4">
                    Lịch sử bảo dưỡng
                  </th>

                  <th className="px-6 py-4">
                    Thao tác
                  </th>

                </tr>
              </thead>

              <tbody>
                {filteredCars.map((car, index) => (

                  <tr
                    key={car.id}
                    className="border-b border-[#eef0f2] last:border-b-0"
                  >

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 text-[12px] font-semibold">
                      {car.name}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {car.plate}
                    </td>

                    <td className="px-6 py-5 text-[12px] text-[#7b858f]">
                      {car.history}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">

                        <button
                          type="button"
                          className="rounded-md bg-[#20252b] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#111519]"
                        >
                          Xem chi tiết
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                        >
                          Lịch sử
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                        >
                          Cập nhật xe
                        </button>

                        <button
                          type="button"
                          className="rounded-md border border-[#dfe3e6] px-3 py-2 text-[10px] font-medium hover:bg-[#f5f5f5]"
                        >
                          Xóa xe
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}
              </tbody>

            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>

      </main>
    </div>
  );
}

export default Cars;