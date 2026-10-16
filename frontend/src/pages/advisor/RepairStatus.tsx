
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  CLOSE_REASONS,
  TECHNICIANS,
  assignTechnician,
  closeRepair,
  completeRepair,
  createRepairOrder,
  formatDate,
  formatMileage,
  getCustomers,
  getCustomerVehicles,
  getRepairOrder,
  getRepairOrders,
  getTechnicianName,
  getVehicleName,
  handOverRepair,
  markWaitingForParts,
  repairProgress,
  repairStatusLabel,
  resumeRepair,
  reviewRepair,
  startRepair,
  type ApiRepairOrder,
  type AdvisorCustomer,
  type AdvisorVehicle,
} from "../../services/advisorApi";

type RepairRow = {
  orderId: number;
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
  technician: string;
  startDate: string;
  status: string;
  progress: number;
  quotationStatus: string | null;
  raw: ApiRepairOrder;
};

function toRow(order: ApiRepairOrder): RepairRow {
  return {
    orderId: order.id,
    id: order.repair_order_code,
    customer: order.customer?.full_name ?? "Khách hàng",
    car: getVehicleName(order.vehicle),
    plate: order.vehicle?.license_plate ?? "—",
    service: order.initial_condition?.trim() || "Chưa xác định hạng mục",
    technician: getTechnicianName(order),
    startDate: formatDate(order.received_at),
    status: order.status,
    progress: repairProgress(order),
    quotationStatus:
      order.quotations && order.quotations.length > 0
        ? order.quotations[order.quotations.length - 1].status
        : null,
    raw: order,
  };
}

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

const statuses = Object.keys(repairStatusLabel);

function getStatusClass(status: string) {
  if (status === "COMPLETED" || status === "HANDED_OVER") {
    return "bg-[#EEF7F0] text-[#39734A]";
  }

  if (status === "IN_PROGRESS" || status === "WAITING_FOR_PARTS") {
    return "bg-[#F3E8D2] text-[#5B4630]";
  }

  if (status === "CLOSED") {
    return "bg-[#F3F4F2] text-[#9AA1A8]";
  }

  return "bg-[#F3F4F2] text-[#66717C]";
}

function RepairStatus() {
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [selected, setSelected] = useState<ApiRepairOrder | null>(null);
  const [assignTarget, setAssignTarget] = useState<number>(TECHNICIANS[0].id);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState(CLOSE_REASONS[0].value);
  const [closeNote, setCloseNote] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<AdvisorCustomer[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState<number | "">("");
  const [createVehicles, setCreateVehicles] = useState<AdvisorVehicle[]>([]);
  const [createVehicleId, setCreateVehicleId] = useState<number | "">("");
  const [createMileage, setCreateMileage] = useState("");
  const [createCondition, setCreateCondition] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const orders = await getRepairOrders();
      const details = await Promise.all(
        orders.map((order) => getRepairOrder(order.id).catch(() => order)),
      );
      setRows(details.map(toRow));
      setLoadError("");
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setIsLoading(false);
    })();
  }, [reload]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchSearch = [row.id, row.customer, row.plate, row.car, row.technician, row.service]
        .some((value) => value.toLowerCase().includes(keyword));

      return matchSearch && (!status || row.status === status);
    });
  }, [rows, search, status]);

  const repairingCount = rows.filter(
    (r) => r.status === "IN_PROGRESS" || r.status === "WAITING_FOR_PARTS",
  ).length;
  const completedCount = rows.filter(
    (r) => r.status === "COMPLETED" || r.status === "HANDED_OVER",
  ).length;
  const waitingCount = rows.filter(
    (r) => r.status === "RECEIVED" || r.status === "INSPECTING" || r.status === "WAITING_APPROVAL",
  ).length;

  async function openDetail(orderId: number) {
    setMessage("");
    setActionError("");
    setShowCloseForm(false);
    try {
      const detail = await getRepairOrder(orderId);
      setSelected(detail);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function runAction(orderId: number, action: () => Promise<unknown>, label: string) {
    setIsSaving(true);
    setActionError("");
    setMessage("");

    try {
      await action();
      await reload();
      const updated = await getRepairOrder(orderId).catch(() => null);
      if (updated) setSelected(updated);
      setMessage(`Đã ${label} phiếu ${updated?.repair_order_code ?? orderId}.`);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  function submitAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    void runAction(selected.id, () => assignTechnician(selected.id, assignTarget), "giao việc cho KTV");
  }

  function submitClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    if (!closeNote.trim()) {
      setActionError("Vui lòng nhập lý do đóng phiếu.");
      return;
    }

    void runAction(
      selected.id,
      () => closeRepair(selected.id, closeReason, closeNote.trim()),
      "đóng phiếu",
    ).then(() => setShowCloseForm(false));
  }

  async function openCreateModal() {
    setIsCreateOpen(true);
    setCreateError("");
    setCreateCustomerId("");
    setCreateVehicleId("");
    setCreateVehicles([]);
    setCreateMileage("");
    setCreateCondition("");

    try {
      const { items } = await getCustomers({ page: 1 });
      setCustomers(items);
    } catch (err) {
      setCreateError((err as Error).message);
    }
  }

  async function changeCreateCustomer(value: number) {
    setCreateCustomerId(value);
    setCreateVehicleId("");
    try {
      setCreateVehicles(await getCustomerVehicles(value));
    } catch {
      setCreateVehicles([]);
    }
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");

    if (createCustomerId === "" || createVehicleId === "") {
      setCreateError("Vui lòng chọn khách hàng và xe.");
      return;
    }

    setIsCreating(true);

    createRepairOrder({
      customer_id: Number(createCustomerId),
      vehicle_id: Number(createVehicleId),
      mileage_received: createMileage.trim() ? Number(createMileage) : undefined,
      initial_condition: createCondition.trim() || undefined,
    })
      .then(async (order) => {
        await reload();
        setIsCreateOpen(false);
        setMessage(`Đã tạo phiếu ${order.repair_order_code}.`);
      })
      .catch((err: Error) => setCreateError(err.message))
      .finally(() => setIsCreating(false));
  }

  function latestQuotation(order: ApiRepairOrder) {
    if (!order.quotations || order.quotations.length === 0) return null;
    return order.quotations[order.quotations.length - 1];
  }

  function canStartRepair(order: ApiRepairOrder) {
    const quotation = latestQuotation(order);
    return (
      order.status === "WAITING_APPROVAL" &&
      quotation &&
      (quotation.status === "APPROVED" || quotation.status === "PARTIALLY_APPROVED")
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main>
          <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 lg:py-10">
            {isLoading && (
              <div className="mb-5 rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 text-[12px] text-[#66717C]">
                Đang tải phiếu sửa chữa...
              </div>
            )}

            {loadError && (
              <div className="mb-5 rounded-xl border border-[#F0D0CB] bg-[#FDF1EF] px-4 py-3 text-[12px] text-[#A44A3F]">
                Không tải được dữ liệu: {loadError}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-[#CFE5D4] bg-[#EEF7F0] px-4 py-3 text-[12px] text-[#39734A]"
              >
                {message}
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A949E]">
                GARA / SỬA CHỮA
              </p>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Trạng thái sửa chữa
                  </h2>
                  <p className="mt-2 max-w-[620px] text-[12px] leading-5 text-[#8A949E]">
                    Tiếp nhận xe, giao kỹ thuật viên và điều khiển trạng thái sửa chữa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void openCreateModal()}
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Tạo phiếu sửa chữa
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "PHIẾU SỬA CHỮA", value: rows.length, description: "Tổng số phiếu" },
                { label: "ĐANG SỬA", value: repairingCount, description: "Đang xử lý tại gara" },
                { label: "HOÀN THÀNH", value: completedCount, description: "Đã hoàn tất / bàn giao" },
                { label: "CHỜ XỬ LÝ", value: waitingCount, description: "Tiếp nhận / kiểm tra / chờ duyệt" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-5 transition hover:-translate-y-1 hover:border-[#D6A85F]"
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-[24px] font-bold">{item.value}</p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mã phiếu, khách hàng, biển số, KTV..."
                  className={inputClass}
                />

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả trạng thái</option>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {repairStatusLabel[item]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                  }}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white hover:bg-[#151D24]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#EEF0F2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold">Danh sách phiếu sửa chữa</p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">
                    Bấm Chi tiết để điều khiển trạng thái
                  </p>
                </div>
                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {filtered.length} phiếu
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      {["MÃ PHIẾU", "KHÁCH HÀNG", "XE", "TIẾN ĐỘ", "KỸ THUẬT VIÊN", "NGÀY NHẬN", "TRẠNG THÁI", "THAO TÁC"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-[9px] font-bold text-[#8A949E]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]">
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-bold">
                            {row.id}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[11px] font-semibold">{row.customer}</td>

                        <td className="px-5 py-4">
                          <p className="text-[11px] font-semibold">{row.car}</p>
                          <p className="mt-1 text-[9px] text-[#8A949E]">{row.plate}</p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EEF0F2]">
                              <div
                                className="h-full rounded-full bg-[#1F2933]"
                                style={{ width: `${row.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#66717C]">{row.progress}%</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[11px]">{row.technician}</td>

                        <td className="px-5 py-4 text-[11px]">{row.startDate}</td>

                        <td className="px-5 py-4">
                          <span className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${getStatusClass(row.status)}`}>
                            {repairStatusLabel[row.status] ?? row.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => void openDetail(row.orderId)}
                            className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold hover:border-[#D6A85F]"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && !isLoading && (
                <div className="px-5 py-14 text-center">
                  <p className="text-[12px] font-semibold">Không tìm thấy phiếu sửa chữa</p>
                  <p className="mt-1 text-[10px] text-[#8A949E]">Thử đổi từ khóa hoặc trạng thái.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A949E]">
                  CHI TIẾT PHIẾU
                </p>
                <h3 className="mt-1 text-lg font-bold">{selected.repair_order_code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-2 text-sm text-[#66717C] hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-5 p-6">
              {[
                ["Khách hàng", selected.customer?.full_name ?? "—"],
                ["Xe", getVehicleName(selected.vehicle)],
                ["Biển số", selected.vehicle?.license_plate ?? "—"],
                ["Số km", formatMileage(selected.mileage_received)],
                ["Tình trạng", selected.initial_condition || "—"],
                ["Kỹ thuật viên", getTechnicianName(selected)],
                ["Ngày nhận", formatDate(selected.received_at)],
                ["Trạng thái", repairStatusLabel[selected.status] ?? selected.status],
                ["Báo giá", selected.quotations && selected.quotations.length > 0
                  ? (selected.quotations[selected.quotations.length - 1].quotation_code)
                  : "Chưa có"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-[#EEF0F2] pb-3">
                  <span className="text-xs text-[#8A949E]">{label}</span>
                  <span className="text-right text-xs font-semibold">{value}</span>
                </div>
              ))}

              {(selected.workItems ?? []).length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold">Hạng mục công việc</p>
                  <div className="space-y-2">
                    {(selected.workItems ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-4 py-2.5">
                        <span className="text-[11px]">{item.description || "—"}</span>
                        <span className="text-[10px] font-semibold text-[#66717C]">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {actionError && (
                <p role="alert" className="rounded-xl border border-[#F0D0CB] bg-[#FDF1EF] px-4 py-3 text-[11px] font-medium text-[#A44A3F]">
                  {actionError}
                </p>
              )}

              {/* Giao KTV khi phiếu mới tiếp nhận */}
              {selected.status === "RECEIVED" && (
                <form onSubmit={submitAssign} className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-4">
                  <p className="mb-3 text-[11px] font-semibold">Giao kỹ thuật viên kiểm tra</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      value={assignTarget}
                      onChange={(event) => setAssignTarget(Number(event.target.value))}
                      className={`${inputClass} flex-1`}
                    >
                      {TECHNICIANS.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                    >
                      {isSaving ? "Đang xử lý..." : "Giao việc"}
                    </button>
                  </div>
                </form>
              )}

              {/* Các nút điều khiển trạng thái */}
              <div className="flex flex-wrap gap-2">
                {canStartRepair(selected) && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void runAction(selected.id, () => startRepair(selected.id), "bắt đầu sửa chữa")}
                    className="rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                  >
                    Bắt đầu sửa chữa
                  </button>
                )}

                {selected.status === "WAITING_APPROVAL" && !canStartRepair(selected) && (
                  <p className="rounded-xl bg-[#F3E8D2] px-4 py-2.5 text-[11px] font-semibold text-[#5B4630]">
                    Chờ khách duyệt báo giá
                  </p>
                )}

                {selected.status === "INSPECTING" && (
                  <p className="rounded-xl bg-[#F3F4F2] px-4 py-2.5 text-[11px] font-semibold text-[#66717C]">
                    Lập báo giá tại trang "Báo giá"
                  </p>
                )}

                {selected.status === "IN_PROGRESS" && (
                  <>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void runAction(selected.id, () => markWaitingForParts(selected.id), "báo chờ phụ tùng")}
                      className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-[11px] font-semibold hover:border-[#D6A85F] disabled:opacity-60"
                    >
                      Chờ phụ tùng
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void runAction(selected.id, () => reviewRepair(selected.id), "ghi nhận Review & Test")}
                      className="rounded-xl border border-[#D9DDE1] px-4 py-2.5 text-[11px] font-semibold hover:border-[#D6A85F] disabled:opacity-60"
                    >
                      Review &amp; Test
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void runAction(selected.id, () => completeRepair(selected.id), "hoàn tất phiếu")}
                      className="rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                    >
                      Hoàn tất
                    </button>
                  </>
                )}

                {selected.status === "WAITING_FOR_PARTS" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void runAction(selected.id, () => resumeRepair(selected.id), "tiếp tục sửa chữa")}
                    className="rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                  >
                    Tiếp tục sửa chữa
                  </button>
                )}

                {selected.status === "COMPLETED" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void runAction(selected.id, () => handOverRepair(selected.id), "bàn giao xe")}
                    className="rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                  >
                    Bàn giao xe
                  </button>
                )}

                {["RECEIVED", "INSPECTING", "WAITING_APPROVAL", "IN_PROGRESS"].includes(selected.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCloseForm((v) => !v);
                      setActionError("");
                    }}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    Đóng phiếu
                  </button>
                )}
              </div>

              {showCloseForm && (
                <form onSubmit={submitClose} className="rounded-xl border border-[#F0D0CB] bg-[#FDF1EF] p-4">
                  <p className="mb-3 text-[11px] font-semibold text-[#A44A3F]">Đóng phiếu sửa chữa</p>
                  <div className="space-y-3">
                    <select
                      value={closeReason}
                      onChange={(event) => setCloseReason(event.target.value)}
                      className={inputClass}
                    >
                      {CLOSE_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      value={closeNote}
                      onChange={(event) => setCloseNote(event.target.value)}
                      placeholder="Ghi chú lý do đóng phiếu..."
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Xác nhận đóng phiếu
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <h3 className="text-lg font-bold">Tạo phiếu sửa chữa</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-[#66717C] hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4 p-6">
              {createError && (
                <div className="rounded-xl border border-[#F0D0CB] bg-[#FDF1EF] px-4 py-3 text-[11px] text-[#A44A3F]">
                  {createError}
                </div>
              )}

              <label className="text-xs font-semibold">
                Khách hàng *
                <select
                  value={createCustomerId}
                  onChange={(event) => void changeCreateCustomer(Number(event.target.value))}
                  className={`${inputClass} mt-2`}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} · {customer.phone}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold">
                Xe *
                <select
                  value={createVehicleId}
                  onChange={(event) => setCreateVehicleId(Number(event.target.value))}
                  disabled={createCustomerId === ""}
                  className={`${inputClass} mt-2`}
                >
                  <option value="">-- Chọn xe --</option>
                  {createVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {getVehicleName(vehicle)} · {vehicle.license_plate}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold">
                Số km nhận xe
                <input
                  type="number"
                  min={0}
                  value={createMileage}
                  onChange={(event) => setCreateMileage(event.target.value)}
                  placeholder="VD: 45000"
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className="text-xs font-semibold">
                Tình trạng xe khi tiếp nhận
                <textarea
                  rows={3}
                  value={createCondition}
                  onChange={(event) => setCreateCondition(event.target.value)}
                  placeholder="Mô tả tình trạng xe lúc tiếp nhận..."
                  className={`${inputClass} mt-2`}
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-[#EEF0F2] pt-5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#D9DDE1] px-5 py-3 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                >
                  {isCreating ? "Đang tạo..." : "Tạo phiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairStatus;
