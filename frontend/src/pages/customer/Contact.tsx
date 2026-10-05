import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!name || !phone || !message) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    alert("Gửi liên hệ thành công!");

    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a949e]">
            CARSERVICE / LIÊN HỆ
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Liên hệ với chúng tôi
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#7b858f]">
            Nếu bạn cần hỗ trợ về dịch vụ, lịch hẹn hoặc tình trạng xe,
            hãy liên hệ với CarService.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                CONTACT
              </p>

              <h2 className="mt-1 text-base font-bold">
                Thông tin liên hệ
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#f8f9fa] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20252b] text-xs font-bold text-white">
                      ☎
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Điện thoại
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        0123 456 789
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8f9fa] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                      @
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Email
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        contact@carservice.vn
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8f9fa] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                      ĐC
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Địa chỉ gara
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        Hà Nội, Việt Nam
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8f9fa] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0f2] text-xs font-bold">
                      TG
                    </div>

                    <div>
                      <p className="text-[10px] text-[#8a949e]">
                        Thời gian làm việc
                      </p>

                      <p className="mt-1 text-xs font-semibold">
                        08:00 – 17:30
                      </p>

                      <p className="mt-1 text-[10px] text-[#8a949e]">
                        Thứ 2 – Thứ 7
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6e8] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f2f3] text-xs font-bold">
                  i
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Hỗ trợ khách hàng
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#7b858f]">
                    Đội ngũ CarService sẽ tiếp nhận và phản hồi yêu cầu
                    của bạn trong thời gian sớm nhất.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3e6e8] bg-white shadow-sm">
            <div className="border-b border-[#eef0f2] px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a949e]">
                SEND MESSAGE
              </p>

              <h2 className="mt-1 text-base font-bold">
                Gửi yêu cầu hỗ trợ
              </h2>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold">
                    Họ và tên
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold">
                    Số điện thoại
                  </label>

                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email"
                  className="w-full rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold">
                  Nội dung
                </label>

                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập nội dung cần hỗ trợ..."
                  className="w-full resize-none rounded-xl border border-[#dfe3e6] bg-white px-4 py-3 text-xs outline-none transition focus:border-[#20252b] focus:ring-2 focus:ring-[#20252b]/10"
                />
              </div>

              <div className="flex flex-col justify-between gap-4 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                <p className="text-[10px] leading-5 text-[#8a949e]">
                  Vui lòng cung cấp thông tin chính xác để CarService
                  có thể liên hệ lại với bạn.
                </p>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-xl bg-[#20252b] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#343a40] hover:shadow-md"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;