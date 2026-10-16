
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

type RepairStatus = "Chờ thực hiện" | "Đang thực hiện" | "Hoàn thành";

type Repair = {
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
  priority: string;
  status: RepairStatus;
  progress: number;
};

const repairs: Repair[] = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    priority: "Bình thường",
    status: "Đang thực hiện",
    progress: 70,
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "30F-111.11",
    service: "Sửa chữa điều hòa",
    priority: "Ưu tiên",
    status: "Chờ thực hiện",
    progress: 0,
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City",
    plate: "30G-222.22",
    service: "Kiểm tra phanh",
    priority: "Bình thường",
    status: "Hoàn thành",
    progress: 100,
  },
];

const statusStyles: Record<RepairStatus, string> = {
  "Chờ thực hiện": "bg-[#eef0f2] text-[#5f6871]",
  "Đang thực hiện": "bg-[#f5f1e8] text-[#876d35]",
  "Hoàn thành": "bg-[#eef7f0] text-[#39734a]",
};

function TechnicianQuickLink({
  to,
  icon,
  title,
  description,
  active = false,
}: {
  to: string;
  icon: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border p-4 transition ${
        active
          ? "border-[#1f2933] bg-[#1f2933] text-white"
          : "border-[#e1e4e6] bg-white hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${
          active
            ? "bg-white/10 text-white"
            : "bg-[#f0f1ef] text-[#20252b]"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[12px] font-semibold">{title}</p>

      <p
        className={`mt-1 text-[9px] ${
          active ? "text-[#cbd0d5]" : "text-[#8a9299]"
        }`}
      >
        {description}
      </p>
    </Link>
  );
}

function AssignedRepairs() {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(
    null,
  );

  const filteredRepairs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return repairs.filter((repair) => {
      const matchesKeyword = [
        repair.id,
        repair.customer,
        repair.car,
        repair.plate,
        repair.service,
      ].some((value) => value.toLowerCase().includes(normalizedKeyword));

      const matchesStatus =
        statusFilter === "Tất cả trạng thái" ||
        repair.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [keyword, statusFilter]);

  const statistics = [
    {
      label: "TỔNG SỐ PHIẾU",
      value: repairs.length,
      description: "Tất cả phiếu được giao",
    },
    {
      label: "CHỜ THỰC HIỆN",
      value: repairs.filter((repair) => repair.status === "Chờ thực hiện")
        .length,
      description: "Cần bắt đầu xử lý",
    },
    {
      label: "ĐANG THỰC HIỆN",
      value: repairs.filter((repair) => repair.status === "Đang thực hiện")
        .length,
      description: "Đang sửa chữa",
    },
    {
      label: "HOÀN THÀNH",
      value: repairs.filter((repair) => repair.status === "Hoàn thành").length,
      description: "Đã hoàn tất",
    },
  ];

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("Tất cả trạng thái");
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                GARA / KỸ THUẬT VIÊN
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-bold tracking-tight text-[#20252b] sm:text-[24px]">
                    Phiếu sửa chữa được phân công
                  </h2>

                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Theo dõi và thực hiện các phiếu sửa chữa được giao.
                  </p>
                </div>

                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white sm:flex">
                  KT
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statistics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#e1e4e6] bg-white p-4"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                    {item.label}
                  </p>

                  <p className="mt-2 text-[22px] font-bold">{item.value}</p>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TechnicianQuickLink
                to="/assigned-repairs"
                icon="PS"
                title="Phiếu được phân công"
                description="Công việc được giao"
                active
              />

              <TechnicianQuickLink
                to="/vehicle-check"
                icon="KT"
                title="Kiểm tra xe"
                description="Kiểm tra tình trạng xe"
              />

              <TechnicianQuickLink
                to="/diagnosis"
                icon="CD"
                title="Chẩn đoán"
                description="Ghi nhận lỗi xe"
              />

              <TechnicianQuickLink
                to="/repair-progress"
                icon="TD"
                title="Tiến độ sửa chữa"
                description="Cập nhật tiến độ"
              />

              <TechnicianQuickLink
                to="/checklist"
                icon="CL"
                title="Checklist"
                description="Kiểm tra hạng mục"
              />
            </div>

            <section className="mb-6 rounded-2xl border border-[#e1e4e6] bg-white p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                    ASSIGNED REPAIRS
                  </p>

                  <h3 className="mt-1 text-[13px] font-semibold">
                    Tìm kiếm phiếu sửa chữa
                  </h3>

                  <p className="mt-1 text-[10px] text-[#8a9299]">
                    Tìm theo mã phiếu, khách hàng, xe hoặc biển số.
                  </p>
                </div>

                <span className="w-fit rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                  {filteredRepairs.length}/{repairs.length} phiếu
                </span>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Mã phiếu, khách hàng hoặc biển số..."
                  aria-label="Tìm kiếm phiếu sửa chữa"
                  className="min-w-0 rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1] focus:ring-2 focus:ring-[#d6a85f]/20"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Lọc trạng thái phiếu"
                  className="rounded-xl border border-[#d9dde1] bg-white px-4 py-3 text-[12px] outline-none transition focus:border-[#aeb8c1] focus:ring-2 focus:ring-[#d6a85f]/20"
                >
                  <option>Tất cả trạng thái</option>
                  <option>Chờ thực hiện</option>
                  <option>Đang thực hiện</option>
                  <option>Hoàn thành</option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl bg-[#1f2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151d24]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </section>

            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[14px] font-bold">Danh sách phiếu sửa chữa</h3>

              <span className="text-[10px] text-[#8a9299]">
                {filteredRepairs.length} kết quả
              </span>
            </div>

            {filteredRepairs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9dde1] bg-white px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f2] text-[#66717c]">
                  <span className="text-xl">⌕</span>
                </div>

                <h3 className="mt-4 text-[14px] font-semibold">
                  Không tìm thấy phiếu sửa chữa
                </h3>

                <p className="mt-2 text-[11px] text-[#8a9299]">
                  Thử thay đổi từ khóa hoặc trạng thái tìm kiếm.
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-xl border border-[#d9dde1] px-4 py-2.5 text-[11px] font-semibold transition hover:bg-[#f7f7f5]"
                >
                  Hiển thị tất cả phiếu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRepairs.map((repair) => {
                  const isExpanded = selectedRepairId === repair.id;

                  return (
                    <article
                      key={repair.id}
                      className="rounded-2xl border border-[#e1e4e6] bg-white p-4 transition hover:border-[#d5d9dc] hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2933] text-[10px] font-bold text-white">
                              PS
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold">{repair.id}</p>

                                <span
                                  className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${statusStyles[repair.status]}`}
                                >
                                  {repair.status}
                                </span>

                                {repair.priority === "Ưu tiên" && (
                                  <span className="rounded-lg bg-[#f9ece9] px-3 py-1.5 text-[10px] font-semibold text-[#a44a3f]">
                                    Ưu tiên
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-[12px] font-semibold">
                                {repair.customer}
                              </p>

                              <p className="mt-1 text-[10px] text-[#8a9299]">
                                {repair.car} · {repair.plate}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[500px]">
                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Dịch vụ
                              </p>

                              <p className="mt-1 text-[11px] font-semibold">
                                {repair.service}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Ưu tiên
                              </p>

                              <p className="mt-1 text-[11px] font-semibold">
                                {repair.priority}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Tiến độ
                              </p>

                              <p className="mt-1 text-[11px] font-bold">
                                {repair.progress}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-[#eef0f2] pt-5">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9299]">
                              TIẾN ĐỘ
                            </p>

                            <p className="text-[10px] font-semibold text-[#66717c]">
                              {repair.status}
                            </p>
                          </div>

                          <div
                            className="h-2 overflow-hidden rounded-full bg-[#eef0f2]"
                            role="progressbar"
                            aria-label={`Tiến độ phiếu ${repair.id}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={repair.progress}
                          >
                            <div
                              className="h-full rounded-full bg-[#1f2933] transition-all duration-300"
                              style={{ width: `${repair.progress}%` }}
                            />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="grid gap-4 rounded-xl bg-[#f7f7f5] p-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Mã phiếu sửa chữa
                              </p>
                              <p className="mt-1 text-[12px] font-semibold">
                                {repair.id}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Khách hàng
                              </p>
                              <p className="mt-1 text-[12px] font-semibold">
                                {repair.customer}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Phương tiện
                              </p>
                              <p className="mt-1 text-[12px] font-semibold">
                                {repair.car}
                              </p>
                              <p className="mt-1 text-[10px] text-[#8a9299]">
                                Biển số: {repair.plate}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#8a9299]">
                                Dịch vụ sửa chữa
                              </p>
                              <p className="mt-1 text-[12px] font-semibold">
                                {repair.service}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col justify-between gap-3 border-t border-[#eef0f2] pt-5 sm:flex-row sm:items-center">
                          <p className="text-[10px] text-[#8a9299]">
                            Kiểm tra thông tin trước khi xử lý phiếu.
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRepairId(
                                  isExpanded ? null : repair.id,
                                )
                              }
                              aria-expanded={isExpanded}
                              className="rounded-xl border border-[#d9dde1] px-4 py-2.5 text-[10px] font-semibold transition hover:border-[#aeb8c1] hover:bg-[#f6f7f8]"
                            >
                              {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                            </button>

                            <Link
                              to="/checklist"
                              className="rounded-xl bg-[#1f2933] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#151d24]"
                            >
                              Checklist
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AssignedRepairs;
