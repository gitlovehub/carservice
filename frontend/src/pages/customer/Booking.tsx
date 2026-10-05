import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            KHÁCH HÀNG / ĐẶT LỊCH
          </p>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Đặt lịch bảo dưỡng
              </h1>

              <p className="mt-2 text-xs leading-5 text-[#7b858f]">
                Chọn xe, dịch vụ và thời gian phù hợp để gửi yêu cầu đặt lịch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#20252b]" />
              <span className="text-[10px] font-semibold text-[#7b858f]">
                BƯỚC 01 / 02
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eef0f2] px-6 py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                BOOKING
              </p>

              <h2 className="mt-1 text-base font-bold">
                Thông tin đặt lịch
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-2 w-8 rounded-full bg-[#20252b]" />
              <div className="h-2 w-8 rounded-full bg-[#e5e7e9]" />
            </div>
          </div>

          <div className="space-y-7 p-6">
            <div className="rounded-2xl border border-[#e7e9eb] bg-[#fafbfb] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#20252b] text-xs font-bold text-white">
                  01
                </div>

                <div>
                  <p className="text-xs font-bold">
                    Thông tin xe
                  </p>

                  <p className="text-[10px] text-[#8a949e]">
                    Chọn xe bạn muốn sử dụng dịch vụ
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-[11px] font-semibold">
                Chọn xe
              </label>

              <select
                value={car}
                onChange={(e) => setCar(e.target.value)}
                className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
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

            <div className="rounded-2xl border border-[#e7e9eb] bg-[#fafbfb] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold text-[#20252b]">
                  02
                </div>

                <div>
                  <p className="text-xs font-bold">
                    Dịch vụ
                  </p>

                  <p className="text-[10px] text-[#8a949e]">
                    Chọn dịch vụ hoặc gói bảo dưỡng
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-[11px] font-semibold">
                Dịch vụ / gói bảo dưỡng
              </label>

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
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

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e7e9eb] bg-[#fafbfb] p-5">
                <label className="mb-3 block text-[11px] font-semibold">
                  Ngày hẹn
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
                />
              </div>

              <div className="rounded-2xl border border-[#e7e9eb] bg-[#fafbfb] p-5">
                <label className="mb-3 block text-[11px] font-semibold">
                  Khung giờ
                </label>

                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
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

            <div className="rounded-2xl border border-[#e7e9eb] bg-[#fafbfb] p-5">
              <label className="mb-3 block text-[11px] font-semibold">
                Ghi chú
              </label>

              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
                className="w-full resize-none rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
              />
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-[#eef0f2] pt-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold text-[#20252b]">
                  Kiểm tra thông tin trước khi tiếp tục
                </p>

                <p className="mt-1 text-[10px] text-[#8a949e]">
                  Bạn có thể chỉnh sửa thông tin ở bước tiếp theo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-[#20252b] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
              >
                Tiếp tục xác nhận
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Booking;