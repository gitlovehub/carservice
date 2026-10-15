import { useMemo, useState } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";

type RepairStatusType =
  | "Chờ sửa chữa"
  | "Đang sửa chữa"
  | "Đã hoàn thành";

type Repair = {
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
  technician: string;
  startDate: string;
  status: RepairStatusType;
  mileage: string;
  description: string;
  note: string;
};

const initialRepairs: Repair[] = [
  {
    id: "SC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
    technician: "Trần Văn Nam",
    startDate: "24/06/2026",
    status: "Đang sửa chữa",
    mileage: "45000",
    description: "Bảo dưỡng định kỳ, kiểm tra động cơ và hệ thống phanh",
    note: "",
  },
  {
    id: "SC-002",
    customer: "Phùng Đức Anh",
    car: "Honda City",
    plate: "30F-678.90",
    service: "Kiểm tra tổng quát",
    technician: "Lê Minh Tuấn",
    startDate: "25/06/2026",
    status: "Chờ sửa chữa",
    mileage: "32000",
    description: "Kiểm tra tiếng kêu bất thường khi vận hành",
    note: "",
  },
  {
    id: "SC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "29A-456.78",
    service: "Thay dầu động cơ",
    technician: "Nguyễn Văn Hùng",
    startDate: "26/06/2026",
    status: "Đã hoàn thành",
    mileage: "51000",
    description: "Thay dầu động cơ và kiểm tra các dung dịch",
    note: "Đã hoàn thành công việc",
  },
];

const statusOptions: RepairStatusType[] = [
  "Chờ sửa chữa",
  "Đang sửa chữa",
  "Đã hoàn thành",
];

const emptyForm = {
  customer: "",
  car: "",
  plate: "",
  service: "",
  technician: "",
  mileage: "",
  description: "",
  note: "",
};

function RepairStatus() {
  const [repairs, setRepairs] = useState<Repair[]>(initialRepairs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredRepairs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return repairs.filter((repair) => {
      const matchSearch = [
        repair.id,
        repair.customer,
        repair.car,
        repair.plate,
        repair.technician,
        repair.service,
      ].some((value) => value.toLowerCase().includes(keyword));

      const matchStatus =
        statusFilter === "" || repair.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [repairs, search, statusFilter]);

  const completedCount = repairs.filter(
    (repair) => repair.status === "Đã hoàn thành",
  ).length;

  const repairingCount = repairs.filter(
    (repair) => repair.status === "Đang sửa chữa",
  ).length;

  const waitingCount = repairs.filter(
    (repair) => repair.status === "Chờ sửa chữa",
  ).length;

  const getStatusClass = (value: RepairStatusType) => {
    if (value === "Đã hoàn thành") {
      return "bg-[#EEF7F0] text-[#39734A]";
    }

    if (value === "Đang sửa chữa") {
      return "bg-[#F3E8D2] text-[#805D24]";
    }

    return "bg-[#F3F4F2] text-[#66717C]";
  };

  const updateStatus = (
    id: string,
    nextStatus: RepairStatusType,
  ) => {
    setRepairs((current) =>
      current.map((repair) =>
        repair.id === id
          ? { ...repair, status: nextStatus }
          : repair,
      ),
    );

    setSelectedRepair((current) =>
      current?.id === id
        ? { ...current, status: nextStatus }
        : current,
    );

    setSuccess(`Đã cập nhật trạng thái phiếu ${id}.`);
    setError("");
  };

  const handleCreateRepair = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const plate = form.plate.trim().toUpperCase();

    if (!form.customer.trim() || !form.car.trim() || !plate) {
      setError("Vui lòng nhập đầy đủ tên khách hàng, xe và biển số.");
      return;
    }

    if (!form.service.trim() || !form.technician.trim()) {
      setError("Vui lòng nhập dịch vụ và kỹ thuật viên phụ trách.");
      return;
    }

    if (form.mileage.trim() && Number(form.mileage) < 0) {
      setError("Số km hiện tại không hợp lệ.");
      return;
    }

    const duplicatePlate = repairs.some(
      (repair) => repair.plate.toLowerCase() === plate.toLowerCase()
        && repair.status !== "Đã hoàn thành",
    );

    if (duplicatePlate) {
      setError("Xe này đã có phiếu chưa hoàn thành.");
      return;
    }

    const nextNumber =
      repairs.reduce((max, repair) => {
        const number = Number(repair.id.replace("SC-", ""));
        return Number.isNaN(number) ? max : Math.max(max, number);
      }, 0) + 1;

    const newRepair: Repair = {
      id: `SC-${String(nextNumber).padStart(3, "0")}`,
      customer: form.customer.trim(),
      car: form.car.trim(),
      plate,
      service: form.service.trim(),
      technician: form.technician.trim(),
      startDate: new Date().toLocaleDateString("vi-VN"),
      status: "Chờ sửa chữa",
      mileage: form.mileage.trim(),
      description: form.description.trim(),
      note: form.note.trim(),
    };

    setRepairs((current) => [newRepair, ...current]);
    setForm(emptyForm);
    setShowForm(false);
    setSearch("");
    setStatusFilter("");
    setSuccess(`Đã tạo phiếu ${newRepair.id} trên giao diện.`);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-8">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
              GARA / SỬA CHỮA
            </p>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Trạng thái sửa chữa
                </h1>
                <p className="mt-2 text-xs leading-5 text-[#8A949E]">
                  Quản lý phiếu sửa chữa và theo dõi tiến độ xử lý xe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setError("");
                  setSuccess("");
                }}
                className="w-fit rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#151D24]"
              >
                + Tạo phiếu sửa chữa
              </button>
            </div>
          </div>

          {success && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#CDE6D2] bg-[#EEF7F0] px-4 py-3 text-xs text-[#39734A]">
              <span>{success}</span>
              <button
                type="button"
                onClick={() => setSuccess("")}
                className="font-bold"
              >
                Đóng
              </button>
            </div>
          )}

          {error && !showForm && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "TỔNG PHIẾU",
                value: repairs.length,
                description: "Tổng số phiếu sửa chữa",
              },
              {
                label: "CHỜ SỬA CHỮA",
                value: waitingCount,
                description: "Chờ kỹ thuật viên tiếp nhận",
              },
              {
                label: "ĐANG SỬA",
                value: repairingCount,
                description: "Đang xử lý tại gara",
              },
              {
                label: "HOÀN THÀNH",
                value: completedCount,
                description: "Đã hoàn tất sửa chữa",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#D6A85F]"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <section className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-sm font-semibold">
                Tìm kiếm phiếu sửa chữa
              </h2>
              <p className="mt-1 text-[10px] text-[#8A949E]">
                Tìm theo mã phiếu, khách hàng, biển số, xe hoặc kỹ thuật viên.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập thông tin cần tìm..."
                className="w-full rounded-xl border border-[#D9DDE1] px-4 py-3 text-xs outline-none focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#D6A85F]"
              >
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                }}
                className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold transition hover:border-[#D6A85F]"
              >
                Xóa bộ lọc
              </button>
            </div>

            <p className="mt-3 text-[10px] text-[#8A949E]">
              Tìm thấy {filteredRepairs.length} trên {repairs.length} phiếu.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Danh sách phiếu sửa chữa
                </h2>
                <p className="mt-1 text-[10px] text-[#8A949E]">
                  Xem chi tiết hoặc cập nhật tiến độ từng phiếu.
                </p>
              </div>
              <span className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-2 text-[10px] font-semibold text-[#66717C]">
                {filteredRepairs.length} phiếu
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5]">
                    {[
                      "MÃ PHIẾU",
                      "KHÁCH HÀNG",
                      "XE",
                      "DỊCH VỤ",
                      "KỸ THUẬT VIÊN",
                      "NGÀY NHẬN",
                      "TRẠNG THÁI",
                      "THAO TÁC",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3 text-[9px] font-bold text-[#8A949E]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRepairs.map((repair) => (
                    <tr
                      key={repair.id}
                      className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]"
                    >
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#F3F4F2] px-3 py-2 text-[10px] font-bold">
                          {repair.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold">
                        {repair.customer}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold">{repair.car}</p>
                        <p className="mt-1 text-[10px] text-[#8A949E]">
                          {repair.plate}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs">{repair.service}</td>
                      <td className="px-5 py-4 text-xs">
                        {repair.technician}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs">
                        {repair.startDate}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          aria-label={`Trạng thái ${repair.id}`}
                          value={repair.status}
                          onChange={(event) =>
                            updateStatus(
                              repair.id,
                              event.target.value as RepairStatusType,
                            )
                          }
                          className={`rounded-lg border-0 px-3 py-2 text-[10px] font-semibold outline-none ${getStatusClass(repair.status)}`}
                        >
                          {statusOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRepair(repair)}
                          className="whitespace-nowrap rounded-lg border border-[#D9DDE1] px-3 py-2 text-[10px] font-semibold transition hover:border-[#D6A85F] hover:bg-[#FBF7EF]"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRepairs.length === 0 && (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">
                  Không tìm thấy phiếu sửa chữa
                </p>
                <p className="mt-2 text-xs text-[#8A949E]">
                  Thử thay đổi từ khóa hoặc trạng thái lọc.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">Tạo phiếu sửa chữa</h2>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Nhập thông tin xe và công việc cần thực hiện.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[#F3F4F2]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRepair} className="space-y-4 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-semibold">
                  Khách hàng *
                  <input
                    required
                    value={form.customer}
                    onChange={(event) =>
                      setForm({ ...form, customer: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                    placeholder="Tên khách hàng"
                  />
                </label>

                <label className="space-y-2 text-xs font-semibold">
                  Tên xe *
                  <input
                    required
                    value={form.car}
                    onChange={(event) =>
                      setForm({ ...form, car: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                    placeholder="Ví dụ: Toyota Vios"
                  />
                </label>

                <label className="space-y-2 text-xs font-semibold">
                  Biển số xe *
                  <input
                    required
                    value={form.plate}
                    onChange={(event) =>
                      setForm({ ...form, plate: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal uppercase outline-none focus:border-[#D6A85F]"
                    placeholder="30A-123.45"
                  />
                </label>

                <label className="space-y-2 text-xs font-semibold">
                  Số km hiện tại
                  <input
                    type="number"
                    min="0"
                    value={form.mileage}
                    onChange={(event) =>
                      setForm({ ...form, mileage: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                    placeholder="Số km trên đồng hồ"
                  />
                </label>

                <label className="space-y-2 text-xs font-semibold">
                  Dịch vụ *
                  <input
                    required
                    value={form.service}
                    onChange={(event) =>
                      setForm({ ...form, service: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                    placeholder="Tên dịch vụ sửa chữa"
                  />
                </label>

                <label className="space-y-2 text-xs font-semibold">
                  Kỹ thuật viên *
                  <input
                    required
                    value={form.technician}
                    onChange={(event) =>
                      setForm({ ...form, technician: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                    placeholder="Tên kỹ thuật viên"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-xs font-semibold">
                Nội dung sửa chữa
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                  placeholder="Mô tả yêu cầu của khách hàng..."
                />
              </label>

              <label className="block space-y-2 text-xs font-semibold">
                Ghi chú
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(event) =>
                    setForm({ ...form, note: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#D9DDE1] px-3 py-3 font-normal outline-none focus:border-[#D6A85F]"
                  placeholder="Ghi chú thêm..."
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-[#EEF0F2] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold hover:bg-[#F7F7F5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
                >
                  Tạo phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A949E]">
                  CHI TIẾT PHIẾU
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  {selectedRepair.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepair(null)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[#F3F4F2]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                ["Khách hàng", selectedRepair.customer],
                ["Tên xe", selectedRepair.car],
                ["Biển số", selectedRepair.plate],
                ["Số km", selectedRepair.mileage || "Chưa cập nhật"],
                ["Dịch vụ", selectedRepair.service],
                ["Kỹ thuật viên", selectedRepair.technician],
                ["Ngày nhận", selectedRepair.startDate],
                ["Trạng thái", selectedRepair.status],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#F7F7F5] p-4">
                  <p className="text-[10px] text-[#8A949E]">{label}</p>
                  <p className="mt-2 text-xs font-semibold">{value}</p>
                </div>
              ))}

              <div className="rounded-xl bg-[#F7F7F5] p-4 sm:col-span-2">
                <p className="text-[10px] text-[#8A949E]">
                  Nội dung sửa chữa
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs">
                  {selectedRepair.description || "Chưa có nội dung"}
                </p>
              </div>

              <div className="rounded-xl bg-[#F7F7F5] p-4 sm:col-span-2">
                <p className="text-[10px] text-[#8A949E]">Ghi chú</p>
                <p className="mt-2 whitespace-pre-wrap text-xs">
                  {selectedRepair.note || "Không có ghi chú"}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#EEF0F2] p-6 sm:flex-row sm:items-center sm:justify-between">
              <select
                value={selectedRepair.status}
                onChange={(event) =>
                  updateStatus(
                    selectedRepair.id,
                    event.target.value as RepairStatusType,
                  )
                }
                className="rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-xs outline-none focus:border-[#D6A85F]"
              >
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSelectedRepair(null)}
                className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24]"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairStatus;