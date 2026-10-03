import { useState } from "react";

function Booking() {
  const [car, setCar] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!car || !service || !date || !time) {
      alert("Vui lòng nhập đầy đủ thông tin đặt lịch.");
      return;
    }

    alert("Đặt lịch thành công!");
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#20252b]">
      <main className="mx-auto max-w-[1000px] px-6 py-10">

        
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#8a949e]">
            KHÁCH HÀNG / ĐẶT LỊCH
          </p>

          <h1 className="text-[28px] font-bold">
            Đặt lịch bảo dưỡng
          </h1>

          <p className="mt-2 text-[12px] text-[#7b858f]">
            Chọn xe, dịch vụ và thời gian phù hợp để gửi yêu cầu đặt lịch.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-[#e1e4e7] bg-white">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e1e4e7] px-6 py-5">
            <h2 className="text-[15px] font-bold">
              Thông tin đặt lịch
            </h2>

            <span className="text-[10px] text-[#8a949e]">
              01 / 02
            </span>
          </div>

          <div className="space-y-6 p-6">

            {/* Chọn xe */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold">
                Chọn xe
              </label>

              <select
                value={car}
                onChange={(e) => setCar(e.target.value)}
                className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
              >
                <option value="">Chọn xe</option>
                <option value="Toyota Vios · 30A-123.45">
                  Toyota Vios · 30A-123.45
                </option>
                <option value="Honda City · 30F-678.90">
                  Honda City · 30F-678.90
                </option>
              </select>
            </div>

            {/* Dịch vụ */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold">
                Dịch vụ / gói bảo dưỡng
              </label>

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
              >
                <option value="">Chọn dịch vụ</option>
                <option value="Bảo dưỡng định kỳ">
                  Bảo dưỡng định kỳ
                </option>
                <option value="Kiểm tra tổng quát">
                  Kiểm tra tổng quát
                </option>
                <option value="Thay dầu động cơ">
                  Thay dầu động cơ
                </option>
              </select>
            </div>

            {/* Ngày + giờ */}
            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Ngày hẹn
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Khung giờ
                </label>

                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
                >
                  <option value="">Chọn khung giờ</option>
                  <option value="08:00 – 10:00">
                    08:00 – 10:00
                  </option>
                  <option value="10:00 – 12:00">
                    10:00 – 12:00
                  </option>
                  <option value="13:00 – 15:00">
                    13:00 – 15:00
                  </option>
                  <option value="15:00 – 17:00">
                    15:00 – 17:00
                  </option>
                </select>
              </div>

            </div>

            {/* Ghi chú */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold">
                Ghi chú
              </label>

              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
                className="w-full resize-none rounded-lg border border-[#dfe3e6] px-4 py-3 text-[12px] outline-none focus:border-[#20252b]"
              />
            </div>

            {/* Button */}
            <div className="flex justify-end border-t border-[#e1e4e7] pt-6">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-[#20252b] px-6 py-3 text-[11px] font-semibold text-white hover:bg-[#111519]"
              >
                Tiếp tục xác nhận
              </button>
            </div>

          </div>
        </div>

        {/* Footer nhỏ */}
        <div className="mt-8 text-center text-[10px] text-[#8a949e]">
          © CarService · Quản lý dịch vụ ô tô
        </div>

      </main>
    </div>
  );
}

export default Booking;