import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";

function Accounts() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả trạng thái");

  const employees = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      username: "nguyenvana",
      role: "Cố vấn dịch vụ",
      status: "Hoạt động",
    },
    {
      id: 2,
      name: "Trần Thị B",
      username: "tranthib",
      role: "Kỹ thuật viên",
      status: "Hoạt động",
    },
  ];

  const filteredEmployees = employees.filter((employee) => {
    const matchSearch =
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.username.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      status === "Tất cả trạng thái" || employee.status === status;

    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#20252b]">
      <Header />

      <div className="mx-auto flex max-w-[1200px]">
        <aside className="w-60 border-r border-[#e1e4e7] bg-white px-4 py-6">
          <p className="mb-4 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            KHÔNG GIAN LÀM VIỆC
          </p>

          <div className="mb-6 flex items-center gap-3 rounded-lg bg-[#f1f3f5] px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20252b] text-[11px] font-bold text-white">
              AD
            </div>

            <div>
              <p className="text-[12px] font-semibold">Quản trị viên</p>
              <p className="text-[10px] text-[#8a949e]">
                Giao diện nội bộ
              </p>
            </div>
          </div>

          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
            CHỨC NĂNG
          </p>

          <div className="space-y-1">
            <Link
              to="/admin"
              className="block rounded-lg bg-[#20252b] px-3 py-2.5 text-[12px] font-medium text-white"
            >
              Tài khoản & nhân viên
            </Link>

            <div className="rounded-lg px-3 py-2.5 text-[12px] text-[#555f69]">
              Dịch vụ & gói bảo dưỡng
            </div>

            <div className="rounded-lg px-3 py-2.5 text-[12px] text-[#555f69]">
              Phụ tùng & tồn kho
            </div>

            <div className="rounded-lg px-3 py-2.5 text-[12px] text-[#555f69]">
              Báo cáo & thống kê
            </div>
          </div>

          <div className="mt-8 border-t border-[#eef0f2] pt-6">
            <button className="w-full rounded-lg border border-[#d9dde1] px-3 py-2.5 text-[11px] font-medium">
              MỞ CHECKLIST REVIEW & TEST
            </button>
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <div className="mb-8">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[#8a949e]">
              GARA / TÀI KHOẢN & NHÂN VIÊN
            </p>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Tài khoản & nhân viên
                </h1>

                <p className="mt-2 text-[12px] text-[#707a84]">
                  Quản lý tài khoản người dùng và phân quyền nhân viên.
                </p>
              </div>

              <div className="flex gap-2">
                <button className="rounded-lg bg-[#20252b] px-4 py-2.5 text-[11px] font-semibold text-white">
                  Thêm nhân viên
                </button>

                <button className="rounded-lg border border-[#d9dde1] bg-white px-4 py-2.5 text-[11px] font-semibold">
                  Tạo tài khoản
                </button>
              </div>
            </div>
          </div>

          <section className="mb-6 rounded-xl border border-[#e1e4e7] bg-white p-5">
            <h2 className="mb-4 text-[14px] font-bold">
              Tìm kiếm tài khoản & nhân viên
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo họ tên hoặc tài khoản..."
                className="flex-1 rounded-lg border border-[#d9dde1] px-3 py-2.5 text-[12px] outline-none"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-48 rounded-lg border border-[#d9dde1] bg-white px-3 py-2.5 text-[12px] outline-none"
              >
                <option>Tất cả trạng thái</option>
                <option>Hoạt động</option>
                <option>Khóa</option>
              </select>

              <button className="rounded-lg bg-[#20252b] px-5 py-2.5 text-[11px] font-semibold text-white">
                Tìm kiếm
              </button>
            </div>

            <p className="mt-3 text-[10px] text-[#8a949e]">
              Tìm kiếm và lọc danh sách theo thông tin hiện có.
            </p>
          </section>

          <section className="rounded-xl border border-[#e1e4e7] bg-white">
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[14px] font-bold">
                Danh sách tài khoản & nhân viên
              </h2>

              <span className="text-[11px] text-[#8a949e]">
                {filteredEmployees.length} kết quả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#eef0f2] bg-[#fafbfc]">
                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      STT
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      HỌ VÀ TÊN
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      TÀI KHOẢN
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      VAI TRÒ
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      TRẠNG THÁI
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold text-[#8a949e]">
                      THAO TÁC
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-[#eef0f2] last:border-0"
                    >
                      <td className="px-5 py-4 text-[12px]">
                        {employee.id}
                      </td>

                      <td className="px-5 py-4 text-[12px] font-semibold">
                        {employee.name}
                      </td>

                      <td className="px-5 py-4 text-[12px] text-[#555f69]">
                        {employee.username}
                      </td>

                      <td className="px-5 py-4 text-[12px]">
                        {employee.role}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#edf7ef] px-3 py-1 text-[10px] font-semibold text-[#357044]">
                          {employee.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-medium">
                            Phân quyền
                          </button>

                          <button className="rounded-lg border border-[#d9dde1] px-3 py-1.5 text-[10px] font-medium">
                            Khóa / Mở khóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-[12px] text-[#8a949e]"
                      >
                        Không tìm thấy tài khoản phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Accounts;