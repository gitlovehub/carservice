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
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main className="mx-auto max-w-[1000px] px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
            KHÁCH HÀNG / ĐẶT LỊCH
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                Đặt lịch bảo dưỡng
              </h1>

              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#66717C]">
                Chọn xe, dịch vụ và thời gian phù hợp để gửi yêu cầu đặt lịch.
              </p>
            </div>

            <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                BƯỚC
              </p>

              <p className="mt-1 text-[12px] font-bold text-[#20252B]">
                01 / 02
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.05)]">
          <div className="flex items-center justify-between border-b border-[#E1E4E6] px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                BOOKING
              </p>

              <h2 className="mt-1 text-[16px] font-bold text-[#20252B]">
                Thông tin đặt lịch
              </h2>
            </div>

            <div className="rounded-full bg-[#F3E8D2] px-3 py-1.5 text-[10px] font-semibold text-[#3A3020]">
              01 / 02
            </div>
          </div>

          <div className="space-y-6 p-6 md:p-7">
            <div>
              <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                Chọn xe
              </label>

              <select
                value={car}
                onChange={(e) => setCar(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              >
                <option value="">Chọn xe</option>

                <option value="Toyota Vios · 30A-123.45">
                  Toyota Vios · 30A-123.45
                </option>

                <option value="Honda City · 30F-678.90">
                  Honda City · 30F-678.90
                </option>
              </select>

              <p className="mt-2 text-[9px] text-[#8A949E]">
                Chọn một trong các phương tiện đã đăng ký.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                Dịch vụ / gói bảo dưỡng
              </label>

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
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
              <div>
                <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                  Ngày hẹn
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                  Khung giờ
                </label>

                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                >
                  <option value="">Chọn khung giờ</option>

                  <option value="08:00 – 10:00">08:00 – 10:00</option>

                  <option value="10:00 – 12:00">10:00 – 12:00</option>

                  <option value="13:00 – 15:00">13:00 – 15:00</option>

                  <option value="15:00 – 17:00">15:00 – 17:00</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold text-[#20252B]">
                Ghi chú
              </label>

              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
                className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[12px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
              />

              <p className="mt-2 text-[9px] text-[#8A949E]">
                Bạn có thể mô tả tình trạng xe hoặc yêu cầu đặc biệt.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-[#E1E4E6] pt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs">
                  ✓
                </div>

                <p className="max-w-md text-[10px] leading-5 text-[#66717C]">
                  Kiểm tra lại thông tin trước khi tiếp tục xác nhận lịch hẹn.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-xl bg-[#1F2933] px-6 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#151D24] hover:shadow-md"
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