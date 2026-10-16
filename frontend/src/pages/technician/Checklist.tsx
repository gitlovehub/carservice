
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import TechnicianSidebar from "./TechnicianSidebar";
import TechnicianTopbar from "./TechnicianTopbar";

type ChecklistItem = {
  id: number;
  title: string;
  checked: boolean;
  note: string;
};

type RepairTicket = {
  id: string;
  customer: string;
  car: string;
  plate: string;
  service: string;
};

const repairTickets: RepairTicket[] = [
  {
    id: "PSC-001",
    customer: "Nguyễn Tiến Hiền",
    car: "Toyota Vios",
    plate: "30A-123.45",
    service: "Bảo dưỡng định kỳ",
  },
  {
    id: "PSC-003",
    customer: "Bùi Việt",
    car: "Mazda 3",
    plate: "30F-111.11",
    service: "Sửa chữa điều hòa",
  },
  {
    id: "PSC-005",
    customer: "Trần Thị B",
    car: "Honda City",
    plate: "30G-222.22",
    service: "Kiểm tra phanh",
  },
];

const checklistTemplates = [
  "Kiểm tra ngoại thất và thân xe",
  "Kiểm tra mức dầu động cơ",
  "Kiểm tra hệ thống phanh",
  "Kiểm tra lốp và áp suất lốp",
  "Kiểm tra hệ thống đèn",
  "Chạy thử và kiểm tra sau sửa chữa",
];

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

function createChecklist(): ChecklistItem[] {
  return checklistTemplates.map((title, index) => ({
    id: index + 1,
    title,
    checked: false,
    note: "",
  }));
}

function Checklist() {
  const [selectedTicketId, setSelectedTicketId] = useState("PSC-001");
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>(
    () =>
      Object.fromEntries(
        repairTickets.map((ticket) => [ticket.id, createChecklist()]),
      ),
  );
  const [completedTickets, setCompletedTickets] = useState<string[]>([]);
  const [reviewerNote, setReviewerNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTicket =
    repairTickets.find((ticket) => ticket.id === selectedTicketId) ??
    repairTickets[0];

  const currentChecklist = checklists[selectedTicketId] ?? [];
  const completedCount = currentChecklist.filter(
    (item) => item.checked,
  ).length;
  const totalCount = currentChecklist.length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isCompleted = completedTickets.includes(selectedTicketId);
  const allTicketsCompleted = completedTickets.length;

  const summary = useMemo(
    () =>
      repairTickets.map((ticket) => {
        const items = checklists[ticket.id] ?? [];
        const checked = items.filter((item) => item.checked).length;

        return {
          id: ticket.id,
          checked,
          total: items.length,
          completed: completedTickets.includes(ticket.id),
        };
      }),
    [checklists, completedTickets],
  );

  function updateChecklist(
    itemId: number,
    changes: Partial<ChecklistItem>,
  ) {
    setChecklists((current) => ({
      ...current,
      [selectedTicketId]: (current[selectedTicketId] ?? []).map((item) =>
        item.id === itemId ? { ...item, ...changes } : item,
      ),
    }));

    setMessage("");
    setError("");
  }

  function resetCurrentChecklist() {
    if (isCompleted) {
      setError("Phiếu đã hoàn tất Review & Test, không thể đặt lại.");
      return;
    }

    setChecklists((current) => ({
      ...current,
      [selectedTicketId]: createChecklist(),
    }));
    setReviewerNote("");
    setMessage("");
    setError("");
  }

  function completeReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (completedCount !== totalCount) {
      setError("Vui lòng kiểm tra đầy đủ tất cả hạng mục trước khi hoàn tất.");
      return;
    }

    setCompletedTickets((current) =>
      current.includes(selectedTicketId)
        ? current
        : [...current, selectedTicketId],
    );

    setMessage(`Đã hoàn tất Review & Test cho phiếu ${selectedTicketId}.`);
  }

  function changeTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    setReviewerNote("");
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
                    Kiểm tra các hạng mục trước khi hoàn tất phiếu sửa chữa.
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
                  {allTicketsCompleted}/{repairTickets.length} phiếu hoàn tất
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
                      item.active
                        ? "bg-white/10 text-white"
                        : "bg-[#f0f1ef]"
                    }`}
                  >
                    {item.code}
                  </div>
                  <p className="mt-3 text-[12px] font-semibold">{item.title}</p>
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
                    {repairTickets.map((ticket) => (
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
                            updateChecklist(item.id, {
                              checked: event.target.checked,
                            })
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

                      <div className="ml-8 mt-3">
                        <label
                          htmlFor={`check-note-${selectedTicketId}-${item.id}`}
                          className="mb-2 block text-[10px] font-semibold text-[#66717c]"
                        >
                          Ghi chú kiểm tra
                        </label>
                        <textarea
                          id={`check-note-${selectedTicketId}-${item.id}`}
                          rows={2}
                          disabled={isCompleted}
                          value={item.note}
                          onChange={(event) =>
                            updateChecklist(item.id, {
                              note: event.target.value,
                            })
                          }
                          placeholder="Nhập ghi chú nếu có..."
                          className="w-full rounded-xl border border-[#e1e4e6] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#8a9299] disabled:bg-[#f0f1ef]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={completeReview}
                  className="border-t border-[#eef0f2] pt-5"
                >
                  <label
                    htmlFor="reviewer-note"
                    className="mb-2 block text-[11px] font-semibold"
                  >
                    Ghi chú chung
                  </label>
                  <textarea
                    id="reviewer-note"
                    rows={3}
                    disabled={isCompleted}
                    value={reviewerNote}
                    onChange={(event) => setReviewerNote(event.target.value)}
                    placeholder="Ghi nhận xét sau khi kiểm tra..."
                    className="w-full rounded-xl border border-[#e1e4e6] px-4 py-3 text-[12px] outline-none focus:border-[#8a9299] disabled:bg-[#f0f1ef]"
                  />

                  {error && (
                    <p
                      role="alert"
                      className="mt-3 text-[11px] font-medium text-red-600"
                    >
                      {error}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      disabled={isCompleted}
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
                      item.id === selectedTicketId ? "bg-[#fafbfb]" : "bg-white"
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{item.id}</span>
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default Checklist;