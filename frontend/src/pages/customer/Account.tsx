import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";

function Account() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />

      <div className="lg:ml-[250px]">
        <CustomerTopbar />

        <main>
          <section className="border-b border-[#E1E4E6] bg-white">
            <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-8 lg:py-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
                KHÁCH HÀNG / TÀI KHOẢN
              </p>

              <h1 className="mt-2 text-[30px] font-bold tracking-[-0.8px] text-[#20252B]">
                Thông tin tài khoản
              </h1>

              <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#66717C]">
                Quản lý thông tin cá nhân và tài khoản sử dụng dịch vụ
                CarService.
              </p>
            </div>
          </section>

          <section>
            <div className="mx-auto max-w-[1100px] px-6 py-8 lg:px-8 lg:py-10">
              <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
                <div className="h-fit overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                  <div className="bg-[#1F2933] px-6 py-7 text-center text-white">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#3C4650] bg-[#D6A85F] text-2xl font-bold text-[#1F2933] transition duration-300 hover:scale-105">
                      NV
                    </div>

                    <h2 className="mt-4 text-[17px] font-bold">
                      Nguyễn Văn A
                    </h2>

                    <p className="mt-1 text-[13px] text-[#AEB8C1]">
                      Khách hàng
                    </p>

                    <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#29333D] px-4 py-1.5 transition duration-200 hover:bg-[#34404B]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

                      <span className="text-[11px] font-semibold text-[#E8ECEF]">
                        Tài khoản đang hoạt động
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      THÔNG TIN KHÁCH HÀNG
                    </p>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl p-3 transition duration-200 hover:bg-[#F7F7F5]">
                        <p className="text-[11px] text-[#8A949E]">
                          Mã khách hàng
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          KH-001
                        </p>
                      </div>

                      <div className="rounded-xl p-3 transition duration-200 hover:bg-[#F7F7F5]">
                        <p className="text-[11px] text-[#8A949E]">
                          Ngày tham gia
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          05/01/2026
                        </p>
                      </div>

                      <div className="rounded-xl p-3 transition duration-200 hover:bg-[#F7F7F5]">
                        <p className="text-[11px] text-[#8A949E]">
                          Số xe đã đăng ký
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          2 xe
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-[#E1E4E6] pt-5">
                      <p className="text-[11px] leading-5 text-[#66717C]">
                        Thông tin này được sử dụng để quản lý lịch hẹn,
                        phương tiện và lịch sử dịch vụ của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                    <div className="flex flex-col justify-between gap-4 border-b border-[#E1E4E6] px-6 py-5 md:flex-row md:items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                          PROFILE
                        </p>

                        <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                          Thông tin cá nhân
                        </h2>

                        <p className="mt-1 text-[11px] text-[#66717C]">
                          Thông tin được sử dụng trong quá trình sử dụng dịch
                          vụ.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="w-fit cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2.5 text-[11px] font-semibold text-[#20252B] transition duration-200 hover:-translate-y-0.5 hover:border-[#1F2933] hover:bg-[#1F2933] hover:text-white hover:shadow-[0_6px_16px_rgba(31,41,51,0.12)]"
                      >
                        Chỉnh sửa
                      </button>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2">
                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Họ và tên
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          Nguyễn Văn A
                        </p>
                      </div>

                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Số điện thoại
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          0901 234 567
                        </p>
                      </div>

                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Email
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          nguyenvana@gmail.com
                        </p>
                      </div>

                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Ngày sinh
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          15/08/2000
                        </p>
                      </div>

                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white md:col-span-2">
                        <p className="text-[11px] text-[#8A949E]">
                          Địa chỉ
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          Hà Nội, Việt Nam
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_4px_20px_rgba(31,41,51,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                    <div className="border-b border-[#E1E4E6] px-6 py-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                        ACCOUNT
                      </p>

                      <h2 className="mt-1.5 text-[17px] font-bold text-[#20252B]">
                        Thông tin đăng nhập
                      </h2>

                      <p className="mt-1 text-[11px] text-[#66717C]">
                        Quản lý thông tin dùng để đăng nhập vào hệ thống.
                      </p>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2">
                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Tên tài khoản
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                          nguyenvana
                        </p>
                      </div>

                      <div className="group rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-white">
                        <p className="text-[11px] text-[#8A949E]">
                          Mật khẩu
                        </p>

                        <p className="mt-1 text-[13px] font-semibold tracking-[0.15em] text-[#20252B]">
                          ••••••••••
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-[#E1E4E6] px-6 py-5">
                      <button
                        type="button"
                        className="cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2.5 text-[11px] font-semibold text-[#20252B] transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A85F] hover:bg-[#F7F7F5] hover:shadow-sm"
                      >
                        Đổi mật khẩu
                      </button>
                    </div>
                  </div>

                  <div className="group rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_4px_20px_rgba(31,41,51,0.03)] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F] hover:shadow-[0_12px_30px_rgba(31,41,51,0.08)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933] transition duration-300 group-hover:scale-105 group-hover:bg-[#D6A85F]">
                        i
                      </div>

                      <div>
                        <p className="text-[13px] font-bold text-[#20252B]">
                          Bảo mật tài khoản
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                          Không chia sẻ thông tin đăng nhập cho người khác.
                          Thông tin tài khoản được sử dụng để quản lý lịch
                          hẹn, phương tiện và lịch sử dịch vụ của bạn.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Account;