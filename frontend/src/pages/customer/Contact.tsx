function Contact() {
  return (
    <div className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Liên hệ CarService
          </h1>

          <p className="mt-3 text-gray-600">
            Liên hệ với chúng tôi nếu bạn cần hỗ trợ về dịch vụ bảo dưỡng ô tô.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Thông tin gara
            </h2>

            <div className="space-y-4 text-gray-600">
              <p>
                <strong className="text-gray-900">Địa chỉ:</strong>{" "}
                123 Nguyễn Văn A, Hà Nội
              </p>

              <p>
                <strong className="text-gray-900">Điện thoại:</strong>{" "}
                0123 456 789
              </p>

              <p>
                <strong className="text-gray-900">Email:</strong>{" "}
                contact@carservice.vn
              </p>

              <p>
                <strong className="text-gray-900">Giờ làm việc:</strong>{" "}
                08:00 - 18:00
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
              Gửi liên hệ
            </h2>

            <form
              className="space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                placeholder="Họ và tên"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <input
                type="tel"
                placeholder="Số điện thoại"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <textarea
                rows={5}
                placeholder="Nội dung"
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Gửi liên hệ
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Contact;