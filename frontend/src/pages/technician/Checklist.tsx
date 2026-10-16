
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";
import {
  getRepairOrders,
  getVehicleName,
  getWorkItems,
  updateWorkItemStatus,
  type ApiRepairOrder,
  type ApiWorkItem,
} from "../../services/technicianApi";

type ChecklistItem = {
  id: number;
  title: string;
  checked: boolean;
};

type RepairTicket = {
  orderId: number;
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
};

function toTicket(order: ApiRepairOrder): RepairTicket {
  const vehicle = order.vehicle ?? null;

  return {
    orderId: order.id,
    id: order.repair_order_code,
    customer: order.customer?.full_name ?? "Khách hàng",
    car: getVehicleName(vehicle),
    plate: vehicle?.license_plate ?? "—",
    service: order.initial_condition?.trim() || "Chưa xác định hạng mục",
  };
}

function toChecklistItems(workItems: ApiWorkItem[]): ChecklistItem[] {
  return workItems.map((workItem) => ({
    id: workItem.id,
    title:
      workItem.description ||
      workItem.service?.name ||
      `Hạng mục #${workItem.id}`,
    checked: workItem.status === "COMPLETED",
  }));
}

const quickLinks = [
  {
    code: "PS",
    title: "Phiếu được phân công",
    description: "Công việc được giao",
    to: "/assigned-repairs",
  },
  {
    code: "KT",
    title: "Kiểm tra xe",
    description: "Kiểm tra tình trạng xe",
    to: "/vehicle-check",
  },
  {
    code: "CD",
    title: "Chẩn đoán",
    description: "Ghi nhận lỗi xe",
    to: "/diagnosis",
  },
  {
    code: "TD",
    title: "Tiến độ sửa chữa",
    description: "Cập nhật tiến độ",
    to: "/repair-progress",
  },
  {
    code: "CL",
    title: "Checklist",
    description: "Review & Test",
    to: "/checklist",
    active: true,
  },
];

function Checklist() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>(
    {},
  );
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const orders = await getRepairOrders();
        const withItems = await Promise.all(
          orders.map(async (order) => ({
            order,
            items: await getWorkItems(order.id).catch(() => [] as ApiWorkItem[]),
          })),
        );

        if (!isMounted) return;

        const mappedTickets = withItems.map(({ order }) => toTicket(order));
        const mappedChecklists = Object.fromEntries(
          withItems.map(({ order, items }) => [
            order.repair_order_code,
            toChecklistItems(items),
          ]),
        );

        setTickets(mappedTickets);
        setChecklists(mappedChecklists);
        setSelectedTicketId(mappedTickets[0]?.id ?? "");
      } catch (loadErr) {
        if (isMounted) setLoadError((loadErr as Error).message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0];

  const currentChecklist = checklists[selectedTicketId] ?? [];
  const completedCount = currentChecklist.filter((item) => item.checked).length;
  const totalCount = currentChecklist.length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isCompleted = totalCount > 0 && completedCount === totalCount;

  const summary = useMemo(
    () =>
      tickets.map((ticket) => {
        const items = checklists[ticket.id] ?? [];
        const checked = items.filter((item) => item.checked).length;

        return {
          id: ticket.id,
          checked,
          total: items.length,
          completed: items.length > 0 && checked === items.length,
        };
      }),
    [tickets, checklists],
  );

  const allTicketsCompleted = summary.filter((item) => item.completed).length;

  function updateChecklist(itemId: number, checked: boolean) {
    setMessage("");
    setError("");

    setChecklists((current) => ({
      ...current,
      [selectedTicketId]: (current[selectedTicketId] ?? []).map((item) =>
        item.id === itemId ? { ...item, checked } : item,
      ),
    }));

    updateWorkItemStatus(itemId, checked ? "COMPLETED" : "PENDING").catch(
      (saveErr: Error) => {
        setChecklists((current) => ({
          ...current,
          [selectedTicketId]: (current[selectedTicketId] ?? []).map((item) =>
            item.id === itemId ? { ...item, checked: !checked } : item,
          ),
        }));
        setError(saveErr.message);
      },
    );
  }

  function resetCurrentChecklist() {
    if (isCompleted) {
      setError("Phiếu đã hoàn tất Review & Test, không thể đặt lại.");
      return;
    }

    const items = checklists[selectedTicketId] ?? [];
    setIsSaving(true);
    setMessage("");
    setError("");

    Promise.all(
      items
        .filter((item) => item.checked)
        .map((item) => updateWorkItemStatus(item.id, "PENDING")),
    )
      .then(() => {
        setChecklists((current) => ({
          ...current,
          [selectedTicketId]: items.map((item) => ({ ...item, checked: false })),
        }));
      })
      .catch((saveErr: Error) => {
        setError(saveErr.message);
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  function completeReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (totalCount === 0 || completedCount !== totalCount) {
      setError("Vui lòng kiểm tra đầy đủ tất cả hạng mục trước khi hoàn tất.");
      return;
    }

    setMessage(`Đã hoàn tất Review & Test cho phiếu ${selectedTicketId}.`);
  }

  function changeTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    setMessage("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#20252b]">
      <TechnicianSidebar />

      <div className="lg:ml-[250px]">
        <TechnicianTopbar />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
            {isLoading && (
              <div className="mb-5 rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-[12px] text-[#66717c]">
                Đang tải checklist...
              </div>
            )}

            {loadError && (
              <div className="mb-5 rounded-xl border border-[#f0d0cb] bg-[#fdf1ef] px-4 py-3 text-[12px] text-[#a44a3f]">
                Không tải được dữ liệu: {loadError}
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">
                KỸ THUẬT VIÊN / CHECKLIST
              </p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">
                    Review & Test
                  </h2>
                  <p className="mt-1 text-[12px] text-[#8a9299]">
                    Kiểm tra các hạng mục công việc trước khi hoàn tất phiếu sửa
                    chữa.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f2933] text-xs font-bold text-white">
                  CL
                </div>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-[#cfe5d4] bg-[#eef7f0] px-4 py-3 text-[12px] text-[#39734a]"
              >
                {message}
              </div>
            )}

            {selectedTicket ? (
              <>
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                      PHIẾU SỬA CHỮA
                    </p>
                    <p className="mt-3 text-[22px] font-bold">
                      {selectedTicket.id}
                    </p>
                    <p className="mt-1 text-[10px] text-[#8a9299]">
                      {selectedTicket.car} · {selectedTicket.plate}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                      HOÀN THÀNH CHECKLIST
                    </p>
                    <p className="mt-3 text-[22px] font-bold">
                      {completedCount}/{totalCount}
                    </p>
                    <p className="mt-1 text-[10px] text-[#8a9299]">
                      {completionPercent}% hạng mục đã kiểm tra
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e1e4e6] bg-white p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a9299]">
                      TRẠNG THÁI
                    </p>
                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-semibold ${
                          isCompleted
                            ? "bg-[#eef7f0] text-[#39734a]"
                            : "bg-[#f5f1e8] text-[#876d35]"
                        }`}
                      >
                        {isCompleted
                          ? "Đã hoàn tất Review & Test"
                          : "Đang kiểm tra"}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-[#8a9299]">
                      {allTicketsCompleted}/{tickets.length} phiếu hoàn tất
                    </p>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`rounded-2xl border p-4 transition ${
                        item.active
                          ? "border-[#1f2933] bg-[#1f2933] text-white"
                          : "border-[#e1e4e6] bg-white hover:border-[#cfd4d8] hover:bg-[#fafbfc]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${
                          item.active ? "bg-white/10 text-white" : "bg-[#f0f1ef]"
                        }`}
                      >
                        {item.code}
                      </div>
                      <p className="mt-3 text-[12px] font-semibold">
                        {item.title}
                      </p>
                      <p
                        className={`mt-1 text-[9px] ${
                          item.active ? "text-[#cbd0d5]" : "text-[#8a9299]"
                        }`}
                      >
                        {item.description}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
                  <div className="border-b border-[#eef0f2] px-5 py-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a7]">
                      REVIEW & TEST
                    </p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-[14px] font-bold">
                        Checklist kiểm tra xe
                      </h2>
                      <span className="rounded-lg bg-[#f3f4f2] px-3 py-1.5 text-[10px] font-semibold text-[#66717c]">
                        {completedCount}/{totalCount} hạng mục
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 p-4 sm:p-5">
                    <div>
                      <label
                        htmlFor="checklist-ticket"
                        className="mb-2 block text-[11px] font-semibold"
                      >
                        Chọn phiếu sửa chữa
                      </label>
                      <select
                        id="checklist-ticket"
                        value={selectedTicketId}
                        onChange={(event) => changeTicket(event.target.value)}
                        className="w-full rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-[12px] outline-none focus:border-[#8a9299]"
                      >
                        {tickets.map((ticket) => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.id} · {ticket.car} · {ticket.plate}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl bg-[#f3f4f2] p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-[12px] font-bold">
                            {selectedTicket.car}
                          </p>
                          <p className="mt-1 text-[10px] text-[#8a9299]">
                            {selectedTicket.id} · {selectedTicket.plate} ·{" "}
                            {selectedTicket.customer}
                          </p>
                          <p className="mt-1 text-[10px] text-[#8a9299]">
                            Dịch vụ: {selectedTicket.service}
                          </p>
                        </div>
                        <p className="text-[11px] font-bold">
                          {completionPercent}%
                        </p>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e1e4e6]">
                        <div
                          className="h-full rounded-full bg-[#1f2933] transition-all"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>

                    {currentChecklist.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9dddf] px-5 py-12 text-center">
                        <p className="text-[13px] font-semibold">
                          Phiếu chưa có hạng mục công việc
                        </p>
                        <p className="mt-2 text-[11px] text-[#8a9299]">
                          Checklist dựa trên các hạng mục công việc của phiếu sửa
                          chữa.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentChecklist.map((item, index) => (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-4 transition ${
                              item.checked
                                ? "border-[#d8e8dc] bg-[#f4faf5]"
                                : "border-[#e5e8ea] bg-[#fafbfb] hover:border-[#d5d9dc] hover:bg-white"
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-4">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                disabled={isCompleted}
                                onChange={(event) =>
                                  updateChecklist(item.id, event.target.checked)
                                }
                                className="mt-1 h-4 w-4 accent-[#1f2933]"
                              />

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-[11px] font-semibold ${
                                    item.checked
                                      ? "text-[#39734a]"
                                      : "text-[#20252b]"
                                  }`}
                                >
                                  {item.title}
                                </p>
                                <p className="mt-1 text-[9px] text-[#8a9299]">
                                  Hạng mục {index + 1}
                                </p>
                              </div>

                              {item.checked && (
                                <span className="shrink-0 rounded-lg bg-[#eef7f0] px-3 py-1.5 text-[9px] font-semibold text-[#39734a]">
                                  Đã kiểm tra
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      onSubmit={completeReview}
                      className="border-t border-[#eef0f2] pt-5"
                    >
                      {error && (
                        <p
                          role="alert"
                          className="text-[11px] font-medium text-red-600"
                        >
                          {error}
                        </p>
                      )}

                      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          disabled={isCompleted || isSaving}
                          onClick={resetCurrentChecklist}
                          className="rounded-xl border border-[#e1e4e6] px-5 py-3 text-[10px] font-semibold text-[#66717c] transition hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Đặt lại checklist
                        </button>

                        <button
                          type="submit"
                          disabled={isCompleted}
                          className={`rounded-xl px-5 py-3 text-[10px] font-semibold transition ${
                            isCompleted
                              ? "cursor-not-allowed bg-[#eef0f2] text-[#9aa1a8]"
                              : "bg-[#1f2933] text-white hover:bg-[#151d24]"
                          }`}
                        >
                          {isCompleted
                            ? "Đã hoàn tất Review & Test"
                            : "Hoàn tất Review & Test"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[#e1e4e6] bg-white">
                  <div className="border-b border-[#eef0f2] px-5 py-4">
                    <h2 className="text-[13px] font-bold">
                      Tổng quan checklist
                    </h2>
                  </div>

                  <div className="divide-y divide-[#eef0f2]">
                    {summary.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => changeTicket(item.id)}
                        className={`flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-[#fafbfb] sm:flex-row sm:items-center sm:justify-between ${
                          item.id === selectedTicketId
                            ? "bg-[#fafbfb]"
                            : "bg-white"
                        }`}
                      >
                        <span className="text-[11px] font-semibold">
                          {item.id}
                        </span>
                        <span className="text-[10px] text-[#8a9299]">
                          {item.checked}/{item.total} hạng mục
                        </span>
                        <span
                          className={`rounded-lg px-3 py-1.5 text-[9px] font-semibold ${
                            item.completed
                              ? "bg-[#eef7f0] text-[#39734a]"
                              : "bg-[#f5f1e8] text-[#876d35]"
                          }`}
                        >
                          {item.completed ? "Đã hoàn tất" : "Đang kiểm tra"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              !isLoading && (
                <div className="rounded-2xl border border-dashed border-[#d9dddf] bg-white px-5 py-16 text-center">
                  <p className="text-[14px] font-semibold">
                    Chưa có phiếu sửa chữa được phân công
                  </p>
                  <p className="mt-2 text-[11px] text-[#8a9299]">
                    Checklist sẽ hiển thị khi bạn được phân công phiếu sửa chữa.
                  </p>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Checklist;
