import { useState } from "react";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Booking() {
  const [car, setCar] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const handleBooking = () => {
    if (!car || !service || !date || !time) {
      alert("Vui lòng nhập đầy đủ thông tin đặt lịch.");
      return;
    }

    alert("Đặt lịch thành công!");
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                  KHÁCH HÀNG / ĐẶT LỊCH
                </p>

                <h1 className="mt-2 text-[28px] font-bold tracking-[-0.6px] text-[#20252B]">
                  Đặt lịch dịch vụ
                </h1>

                <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-[#66717C]">
                  Chọn xe, dịch vụ và thời gian phù hợp để đặt lịch bảo dưỡng
                  hoặc sửa chữa tại CarService.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white px-5 py-4 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A949E]">
                  TRẠNG THÁI
                </p>

                <p className="mt-1 text-[13px] font-bold text-[#20252B]">
                  Sẵn sàng đặt lịch
                </p>
              </div>
            </div>

            <section className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-sm text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                    1
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      BƯỚC 01
                    </p>

                    <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                      Chọn thông tin dịch vụ
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Chọn xe và dịch vụ bạn cần thực hiện.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm font-bold text-[#3A3020] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                    2
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      BƯỚC 02
                    </p>

                    <p className="mt-1 text-[14px] font-bold text-[#20252B]">
                      Chọn thời gian
                    </p>

                    <p className="mt-1 text-[11px] text-[#8A949E]">
                      Chọn ngày và khung giờ phù hợp.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:shadow-[0_12px_30px_rgba(31,41,51,0.07)]">
                <div className="border-b border-[#E5E7E9] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    THÔNG TIN ĐẶT LỊCH
                  </p>

                  <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                    Chi tiết lịch hẹn
                  </h2>

                  <p className="mt-1 text-[12px] text-[#66717C]">
                    Vui lòng điền đầy đủ thông tin trước khi xác nhận.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-[#20252B]">
                      Xe cần bảo dưỡng
                    </label>

                    <select
                      value={car}
                      onChange={(e) => setCar(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                    >
                      <option value="">-- Chọn xe --</option>
                      <option value="Toyota Vios - 30A-123.45">
                        Toyota Vios - 30A-123.45
                      </option>
                      <option value="Honda City - 30F-678.90">
                        Honda City - 30F-678.90
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-[#20252B]">
                      Dịch vụ
                    </label>

                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                    >
                      <option value="">-- Chọn dịch vụ --</option>
                      <option value="Bảo dưỡng định kỳ">
                        Bảo dưỡng định kỳ
                      </option>
                      <option value="Kiểm tra tổng quát">
                        Kiểm tra tổng quát
                      </option>
                      <option value="Sửa chữa">Sửa chữa</option>
                    </select>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[12px] font-semibold text-[#20252B]">
                        Ngày hẹn
                      </label>

                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[12px] font-semibold text-[#20252B]">
                        Giờ hẹn
                      </label>

                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-[#20252B]">
                      Ghi chú
                    </label>

                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={5}
                      placeholder="Mô tả thêm tình trạng xe hoặc yêu cầu của bạn..."
                      className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] leading-5 text-[#20252B] outline-none transition duration-200 hover:border-[#C8CDD1] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                    />
                  </div>

                  <div className="border-t border-[#E5E7E9] pt-5">
                    <button
                      type="button"
                      onClick={handleBooking}
                      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2933] px-5 py-3.5 text-[12px] font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#151D24] hover:shadow-[0_10px_24px_rgba(31,41,51,0.16)] active:translate-y-0"
                    >
                      <span className="transition duration-300 group-hover:translate-x-0.5">
                        ✓
                      </span>
                      Đặt lịch
                    </button>
                  </div>
                </div>
              </section>

              <div className="space-y-5">
                <section className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                        XEM TRƯỚC
                      </p>

                      <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                        Lịch hẹn của bạn
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8D2] text-sm text-[#3A3020] transition duration-300 hover:scale-105">
                      ▣
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl bg-[#F7F7F5] p-4 transition duration-200 hover:bg-[#F3F4F2]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        XE
                      </p>

                      <p className="mt-1.5 text-[12px] font-semibold text-[#20252B]">
                        {car || "Chưa chọn xe"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F7F7F5] p-4 transition duration-200 hover:bg-[#F3F4F2]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                        DỊCH VỤ
                      </p>

                      <p className="mt-1.5 text-[12px] font-semibold text-[#20252B]">
                        {service || "Chưa chọn dịch vụ"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#F7F7F5] p-4 transition duration-200 hover:bg-[#F3F4F2]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                          NGÀY
                        </p>

                        <p className="mt-1.5 text-[12px] font-semibold text-[#20252B]">
                          {date || "Chưa chọn"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F7F7F5] p-4 transition duration-200 hover:bg-[#F3F4F2]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                          GIỜ
                        </p>

                        <p className="mt-1.5 text-[12px] font-semibold text-[#20252B]">
                          {time || "Chưa chọn"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="group rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs text-white transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F] group-hover:text-[#1F2933]">
                      i
                    </div>

                    <div>
                      <p className="text-[14px] font-bold text-[#20252B]">
                        Lưu ý khi đặt lịch
                      </p>

                      <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-[#66717C]">
                        <li className="flex gap-2">
                          <span className="text-[#D6A85F]">•</span>
                          Vui lòng chọn đúng xe cần thực hiện dịch vụ.
                        </li>

                        <li className="flex gap-2">
                          <span className="text-[#D6A85F]">•</span>
                          Nên đặt lịch trước để được hỗ trợ tốt nhất.
                        </li>

                        <li className="flex gap-2">
                          <span className="text-[#D6A85F]">•</span>
                          CarService sẽ xác nhận lịch hẹn sau khi tiếp nhận.
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-[#1F2933] bg-[#1F2933] p-6 transition duration-300 hover:shadow-[0_14px_35px_rgba(31,41,51,0.14)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                    CARSERVICE
                  </p>

                  <h2 className="mt-1.5 text-[16px] font-bold text-white">
                    Đặt lịch nhanh và thuận tiện
                  </h2>

                  <p className="mt-1.5 max-w-[650px] text-[11px] leading-5 text-[#AEB8C1]">
                    Điền thông tin xe, dịch vụ và thời gian. Sau khi gửi yêu
                    cầu, lịch hẹn sẽ được tiếp nhận và xác nhận.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F] text-lg text-[#1F2933] transition duration-300 hover:scale-110">
                  🚗
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Booking;