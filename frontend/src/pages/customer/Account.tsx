import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { fetchApi } from "../../services/api";

type AccountInfo = {
  id: number;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "ADVISOR" | "TECHNICIAN";
  status: string;
  created_at: string;
  employee?: {
    id: number;
    full_name: string;
    phone?: string | null;
    technician_profile_id: number | null;
  } | null;
  customer?: {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

type CustomerProfile = NonNullable<AccountInfo["customer"]>;

const roleNames: Record<AccountInfo["role"], string> = {
  CUSTOMER: "Khách hàng",
  ADMIN: "Quản trị viên",
  ADVISOR: "Cố vấn dịch vụ",
  TECHNICIAN: "Kỹ thuật viên",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : date.toLocaleDateString("vi-VN");
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function Account() {
  const [account, setAccount] = useState<AccountInfo | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as AccountInfo | null;
    } catch {
      return null;
    }
  });
  const [customer, setCustomer] = useState<CustomerProfile | null>(
    account?.customer || null,
  );
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  useEffect(() => {
    const loadAccountDetails = async () => {
      const accountResponse = await fetchApi("/me");
      const currentAccount = accountResponse.account as AccountInfo;
      setAccount(currentAccount);
      localStorage.setItem("user", JSON.stringify(currentAccount));

      if (currentAccount.role === "CUSTOMER") {
        const [customerResult, vehiclesResult] = await Promise.allSettled([
          fetchApi("/me/customer/"),
          fetchApi("/me/vehicles/"),
        ]);

        if (customerResult.status === "fulfilled" && customerResult.value?.data) {
          setCustomer(customerResult.value.data as CustomerProfile);
        }

        if (
          vehiclesResult.status === "fulfilled" &&
          Array.isArray(vehiclesResult.value?.data)
        ) {
          setVehicleCount(vehiclesResult.value.data.length);
        }
      }
    };

    void loadAccountDetails();
  }, []);

  const fullName =
    customer?.full_name ||
    account?.customer?.full_name ||
    account?.employee?.full_name ||
    "Chưa cập nhật";
  const email = customer?.email || account?.customer?.email || account?.email || "Chưa cập nhật";
  const phone =
    customer?.phone ||
    account?.customer?.phone ||
    account?.employee?.phone ||
    "Chưa cập nhật";
  const address = customer?.address || account?.customer?.address || "Chưa cập nhật";
  const status = account?.status === "ACTIVE" ? "Đang hoạt động" : account?.status || "Chưa cập nhật";
  const roleName = account ? roleNames[account.role] : "Tài khoản";
  const profileNumber =
    account?.role === "CUSTOMER" && customer?.id
      ? `KH-${String(customer.id).padStart(3, "0")}`
      : account?.employee?.id
        ? `NV-${String(account.employee.id).padStart(3, "0")}`
        : "Chưa cập nhật";

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main>
        <section className="border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-14 md:px-8 md:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              CARSERVICE / TÀI KHOẢN
            </p>

            <h1 className="mt-3 text-[38px] font-bold tracking-[-1.4px] text-[#1F2933] md:text-[50px]">
              Thông tin tài khoản
            </h1>

            <p className="mt-3 max-w-[620px] text-[13px] leading-6 text-[#66717C]">
              Quản lý thông tin cá nhân và tài khoản sử dụng dịch vụ
              CarService.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-8 md:py-16">
            <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
              <div className="h-fit overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
                <div className="bg-[#1F2933] px-6 py-7 text-center text-white">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#3C4650] bg-[#D6A85F] text-2xl font-bold text-[#1F2933]">
                    {fullName === "Chưa cập nhật"
                      ? account?.role.slice(0, 2) || "TK"
                      : getInitials(fullName)}
                  </div>

                  <h2 className="mt-4 text-[17px] font-bold">
                    {fullName}
                  </h2>

                  <p className="mt-1 text-[13px] text-[#AEB8C1]">
                    {roleName}
                  </p>

                  <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#29333D] px-4 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6A85F]" />

                    <span className="text-[11px] font-semibold text-[#E8ECEF]">
                      Tài khoản {status.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    THÔNG TIN TÀI KHOẢN
                  </p>

                  <div className="mt-5 space-y-5">
                    <div>
                      <p className="text-[11px] text-[#8A949E]">
                        Mã khách hàng
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {profileNumber}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-[#8A949E]">
                        Ngày tham gia
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {formatDate(account?.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-[#8A949E]">
                        Số xe đã đăng ký
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {account?.role !== "CUSTOMER"
                          ? "Không áp dụng"
                          : vehicleCount === null
                            ? "Đang tải..."
                            : `${vehicleCount} xe`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#E1E4E6] pt-5">
                    <p className="text-[11px] leading-5 text-[#66717C]">
                      Thông tin này được sử dụng để quản lý lịch hẹn,
                      phương tiện và lịch sử dịch vụ của bạn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
                  <div className="flex flex-col justify-between gap-4 border-b border-[#E1E4E6] px-6 py-5 md:flex-row md:items-center">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                        PROFILE
                      </p>

                      <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                        Thông tin cá nhân
                      </h2>

                      <p className="mt-1 text-[11px] text-[#66717C]">
                        Thông tin được sử dụng trong quá trình sử dụng dịch vụ.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="w-fit cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2.5 text-[11px] font-semibold text-[#20252B] transition hover:border-[#1F2933] hover:bg-[#1F2933] hover:text-white"
                    >
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] text-[#8A949E]">
                        Họ và tên
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {fullName}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] text-[#8A949E]">
                        Số điện thoại
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {phone}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] text-[#8A949E]">
                        Email
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4">
                      <p className="text-[11px] text-[#8A949E]">
                        Ngày sinh
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        Chưa cập nhật
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 md:col-span-2">
                      <p className="text-[11px] text-[#8A949E]">
                        Địa chỉ
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
                  <div className="border-b border-[#E1E4E6] px-6 py-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      ACCOUNT
                    </p>

                    <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                      Thông tin đăng nhập
                    </h2>

                    <p className="mt-1 text-[11px] text-[#66717C]">
                      Quản lý thông tin dùng để đăng nhập vào hệ thống.
                    </p>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    <div className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4">
                      <p className="text-[11px] text-[#8A949E]">
                        Tên tài khoản
                      </p>

                      <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                        {email}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4">
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
                      className="cursor-pointer rounded-xl border border-[#DDE1E4] px-4 py-2.5 text-[11px] font-semibold text-[#20252B] transition hover:border-[#D6A85F] hover:bg-[#F7F7F5]"
                    >
                      Đổi mật khẩu
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                      i
                    </div>

                    <div>
                      <p className="text-[13px] font-bold text-[#20252B]">
                        Bảo mật tài khoản
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-[#66717C]">
                        Không chia sẻ thông tin đăng nhập cho người khác.
                        Thông tin tài khoản được sử dụng để quản lý lịch hẹn,
                        phương tiện và lịch sử dịch vụ của bạn.
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
  );
}

export default Account;