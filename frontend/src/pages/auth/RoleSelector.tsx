import { useNavigate } from "react-router-dom";

function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F7F5] px-6 py-10 text-[#20252B]">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A949E]">
            CARSERVICE
          </p>

          <h1 className="mt-2 text-[28px] font-bold">
            Chọn giao diện hệ thống
          </h1>

          <p className="mt-2 text-[13px] text-[#7A838C]">
            Chọn khu vực bạn muốn truy cập để kiểm tra giao diện.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-6 text-left transition hover:border-[#D6A85F] hover:shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F2] text-xl">
              👤
            </div>

            <h2 className="mt-4 text-[15px] font-bold">
              Khách hàng
            </h2>

            <p className="mt-1 text-[11px] text-[#7A838C]">
              Quản lý xe, đặt lịch và theo dõi dịch vụ.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-6 text-left transition hover:border-[#D6A85F] hover:shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F2] text-xl">
              💬
            </div>

            <h2 className="mt-4 text-[15px] font-bold">
              Cố vấn dịch vụ
            </h2>

            <p className="mt-1 text-[11px] text-[#7A838C]">
              Quản lý khách hàng, lịch hẹn và tiếp nhận xe.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-6 text-left transition hover:border-[#D6A85F] hover:shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F2] text-xl">
              🔧
            </div>

            <h2 className="mt-4 text-[15px] font-bold">
              Kỹ thuật viên
            </h2>

            <p className="mt-1 text-[11px] text-[#7A838C]">
              Kiểm tra, chẩn đoán và xử lý công việc sửa chữa.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-2xl border border-[#E1E4E6] bg-white p-6 text-left transition hover:border-[#D6A85F] hover:shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F2] text-xl">
              ⚙
            </div>

            <h2 className="mt-4 text-[15px] font-bold">
              Quản trị viên
            </h2>

            <p className="mt-1 text-[11px] text-[#7A838C]">
              Quản lý tổng thể người dùng, dịch vụ, kho và báo cáo hệ thống.
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 cursor-pointer text-[12px] font-medium text-[#66717C] hover:text-[#20252B]"
        >
          ← Về trang chủ
        </button>
      </div>
    </div>
  );
}

export default RoleSelector;