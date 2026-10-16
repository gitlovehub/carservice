
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AdvisorSidebar from "./AdvisorSidebar";
import AdvisorTopbar from "./AdvisorTopbar";
import {
  createQuotation,
  formatDate,
  formatMoney,
  getRepairOrder,
  getRepairOrders,
  getServices,
  getVehicleName,
  quotationStatusLabel,
  sendQuotation,
  type ApiQuotation,
  type ApiService,
  type ApiRepairOrder,
} from "../../services/advisorApi";

type QuotationRow = {
  quotationId: number;
  code: string;
  roId: number;
  roCode: string;
  customer: string;
  car: string;
  total: number;
  status: string;
  version: number;
  itemCount: number;
  raw: ApiQuotation;
};

function toRows(orders: ApiRepairOrder[]): QuotationRow[] {
  const rows: QuotationRow[] = [];

  for (const order of orders) {
    for (const quotation of order.quotations ?? []) {
      rows.push({
        quotationId: quotation.id,
        code: quotation.quotation_code,
        roId: order.id,
        roCode: order.repair_order_code,
        customer: order.customer?.full_name ?? "Khách hàng",
        car: getVehicleName(order.vehicle),
        total: Number(quotation.total_amount ?? 0),
        status: quotation.status,
        version: Number(quotation.version ?? 1),
        itemCount: (quotation.items ?? []).length,
        raw: { ...quotation, repairOrder: order },
      });
    }
  }

  return rows.sort((a, b) => b.quotationId - a.quotationId);
}

type DraftItem = {
  service_id: number | "";
  quantity: number;
  unit_price: string;
  description: string;
};

const inputClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-4 py-3 text-[12px] outline-none transition placeholder:text-[#A0A8AF] focus:border-[#D6A85F] focus:ring-2 focus:ring-[#D6A85F]/10";

const statuses = Object.keys(quotationStatusLabel);

function getStatusClass(status: string) {
  if (status === "APPROVED" || status === "PARTIALLY_APPROVED") {
    return "bg-[#EEF7F0] text-[#39734A]";
  }

  if (status === "SENT") {
    return "bg-[#F5F1E8] text-[#876D35]";
  }

  if (status === "DRAFT") {
    return "bg-[#EEF0F2] text-[#5F6871]";
  }

  return "bg-[#F3F4F2] text-[#66717C]";
}

function emptyDraftItem(): DraftItem {
  return { service_id: "", quantity: 1, unit_price: "", description: "" };
}

function Quotation() {
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [selected, setSelected] = useState<QuotationRow | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState<ApiRepairOrder[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [createRoId, setCreateRoId] = useState<number | "">("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([emptyDraftItem()]);
  const [discount, setDiscount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const orders = await getRepairOrders();
      const details = await Promise.all(
        orders.map((order) => getRepairOrder(order.id).catch(() => order)),
      );
      setRows(toRows(details));
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
      const matchSearch = [row.code, row.roCode, row.customer, row.car].some((value) =>
        value.toLowerCase().includes(keyword),
      );

      return matchSearch && (!status || row.status === status);
    });
  }, [rows, search, status]);

  const waitingCount = rows.filter((r) => r.status === "SENT").length;
  const approvedCount = rows.filter(
    (r) => r.status === "APPROVED" || r.status === "PARTIALLY_APPROVED",
  ).length;
  const draftCount = rows.filter((r) => r.status === "DRAFT").length;
  const totalAmount = rows
    .filter((r) => r.status !== "REJECTED" && r.status !== "CANCELLED")
    .reduce((sum, r) => sum + r.total, 0);

  async function openCreateModal() {
    setIsCreateOpen(true);
    setCreateError("");
    setCreateRoId("");
    setDraftItems([emptyDraftItem()]);
    setDiscount("");
    setValidUntil("");

    try {
      const orders = await getRepairOrders();
      const details = await Promise.all(
        orders.map((order) => getRepairOrder(order.id).catch(() => order)),
      );

      setEligibleOrders(
        details.filter(
          (order) => order.status === "INSPECTING" || order.status === "WAITING_APPROVAL",
        ),
      );
      setServices(await getServices());
    } catch (err) {
      setCreateError((err as Error).message);
    }
  }

  function updateDraftItem(index: number, patch: Partial<DraftItem>) {
    setDraftItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function changeService(index: number, serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    updateDraftItem(index, {
      service_id: serviceId,
      description: service?.name ?? "",
      unit_price: service?.base_price != null ? String(service.base_price) : "",
    });
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");

    if (createRoId === "") {
      setCreateError("Vui lòng chọn phiếu sửa chữa.");
      return;
    }

    const items = draftItems
      .filter((item) => item.service_id !== "" && Number(item.quantity) >= 1)
      .map((item) => ({
        item_type: "SERVICE" as const,
        service_id: Number(item.service_id),
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price) || 0,
      }));

    if (items.length === 0) {
      setCreateError("Vui lòng chọn ít nhất một dịch vụ hợp lệ.");
      return;
    }

    setIsCreating(true);

    createQuotation(Number(createRoId), {
      items,
      discount_amount: discount.trim() ? Number(discount) : undefined,
      valid_until: validUntil || undefined,
    })
      .then(async (quotation) => {
        await reload();
        setIsCreateOpen(false);
        setMessage(`Đã tạo báo giá ${quotation.quotation_code} (bản nháp).`);
      })
      .catch((err: Error) => setCreateError(err.message))
      .finally(() => setIsCreating(false));
  }

  async function handleSend(row: QuotationRow) {
    setIsSaving(true);
    setActionError("");
    setMessage("");

    try {
      const updated = await sendQuotation(row.quotationId);
      await reload();
      setSelected((current) =>
        current && current.quotationId === row.quotationId
          ? { ...current, raw: { ...current.raw, ...updated }, status: updated.status }
          : current,
      );
      setMessage(`Đã gửi báo giá ${row.code} cho khách hàng.`);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <AdvisorSidebar />

      <div className="lg:ml-[250px]">
        <AdvisorTopbar />

        <main className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            {isLoading && (
              <div className="mb-5 rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 text-[12px] text-[#66717C]">
                Đang tải báo giá...
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
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A9299]">
                GARA / BÁO GIÁ
              </p>

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[24px] font-bold tracking-tight">Quản lý báo giá</h2>
                  <p className="mt-1 text-[12px] text-[#8A9299]">
                    Lập báo giá từ dịch vụ, gửi cho khách hàng duyệt trước khi sửa chữa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void openCreateModal()}
                  className="w-fit rounded-xl bg-[#1F2933] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  + Tạo báo giá
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "TỔNG BÁO GIÁ", value: rows.length, description: "Báo giá đã lập" },
                { label: "BẢN NHÁP", value: draftCount, description: "Chưa gửi cho khách" },
                { label: "CHỜ DUYỆT", value: waitingCount, description: "Đã gửi, chờ khách" },
                {
                  label: "TỔNG GIÁ TRỊ",
                  value:
                    totalAmount >= 1000000
                      ? `${(totalAmount / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}M`
                      : formatMoney(totalAmount),
                  description: "Chưa bao gồm báo giá bị từ chối",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E1E4E6] bg-white p-4 transition hover:-translate-y-1 hover:border-[#D6A85F]"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A9299]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[22px] font-bold">{item.value}</p>
                  <p className="mt-1 text-[10px] text-[#8A9299]">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mã báo giá, phiếu, khách hàng..."
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
                      {quotationStatusLabel[item]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                  }}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#151D24]"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className="flex flex-col justify-between gap-3 border-b border-[#E1E4E6] px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[13px] font-semibold">Danh sách báo giá</p>
                  <p className="mt-1 text-[10px] text-[#8A9299]">
                    Báo giá đã duyệt: {approvedCount}
                  </p>
                </div>

                <p className="w-fit rounded-lg bg-[#F3F4F2] px-3 py-1.5 text-[10px] font-semibold text-[#66717C]">
                  {filtered.length} báo giá
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1E4E6] bg-[#F7F7F5] text-left">
                      {["MÃ BÁO GIÁ", "PHIẾU", "KHÁCH HÀNG", "XE", "DÒNG", "TỔNG TIỆN", "TRẠNG THÁI", "THAO TÁC"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-[9px] font-semibold text-[#8A9299]">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.quotationId} className="border-b border-[#EEF0F2] last:border-0 hover:bg-[#FAFAF9]">
                        <td className="px-5 py-4">
                          <p className="text-[11px] font-bold">{row.code}</p>
                          <p className="mt-1 text-[9px] text-[#8A9299]">v{row.version}</p>
                        </td>

                        <td className="px-5 py-4 text-[11px]">{row.roCode}</td>

                        <td className="px-5 py-4 text-[12px] font-semibold">{row.customer}</td>

                        <td className="px-5 py-4 text-[12px]">{row.car}</td>

                        <td className="px-5 py-4 text-[11px]">{row.itemCount}</td>

                        <td className="px-5 py-4 text-[12px] font-bold">{formatMoney(row.total)}</td>

                        <td className="px-5 py-4">
                          <span className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${getStatusClass(row.status)}`}>
                            {quotationStatusLabel[row.status] ?? row.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(row);
                                setActionError("");
                              }}
                              className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold hover:border-[#D6A85F]"
                            >
                              Chi tiết
                            </button>

                            {row.status === "DRAFT" && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void handleSend(row)}
                                className="rounded-lg bg-[#1F2933] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                              >
                                Gửi báo giá
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && !isLoading && (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] font-semibold">Chưa có báo giá nào</p>
                  <p className="mt-1 text-[10px] text-[#8A9299]">
                    Bấm "Tạo báo giá" cho phiếu đang kiểm tra (INSPECTING).
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5">
              <p className="text-xs font-semibold">Quy trình báo giá</p>
              <p className="mt-1 text-[10px] leading-5 text-[#7B858F]">
                Phiếu đang ở trạng thái "Đang kiểm tra" → tạo báo giá (bản nháp) → gửi cho
                khách duyệt từng dòng → khách đồng ý → quay lại trang "Sửa chữa" bấm "Bắt đầu
                sửa chữa".
              </p>
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9299]">
                  CHI TIẾT BÁO GIÁ
                </p>
                <h3 className="mt-1 text-lg font-bold">{selected.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-2 text-sm text-[#66717C] hover:bg-[#F3F4F2]"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-4 p-6">
              {[
                ["Phiếu sửa chữa", selected.roCode],
                ["Khách hàng", selected.customer],
                ["Xe", selected.car],
                ["Phiên bản", `v${selected.version}`],
                ["Tổng tiền", formatMoney(selected.total)],
                ["Ngày tạo", formatDate(selected.raw.customer_response_at ?? null)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-[#EEF0F2] pb-3">
                  <span className="text-xs text-[#8A9299]">{label}</span>
                  <span className="text-right text-xs font-semibold">{value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#8A9299]">Trạng thái</span>
                <span className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${getStatusClass(selected.status)}`}>
                  {quotationStatusLabel[selected.status] ?? selected.status}
                </span>
              </div>

              {(selected.raw.items ?? []).length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold">Các dòng báo giá</p>
                  <div className="space-y-2">
                    {(selected.raw.items ?? []).map((item) => (
                      <div key={item.id} className="rounded-xl bg-[#F7F7F5] px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px]">{item.description}</span>
                          <span className="text-[11px] font-bold">
                            {formatMoney(Number(item.unit_price) * Number(item.quantity))}
                          </span>
                        </div>
                        <p className="mt-1 text-[9px] text-[#8A9299]">
                          SL {item.quantity} × {formatMoney(item.unit_price)}
                          {item.is_approved === true && " · Khách đã duyệt"}
                          {item.is_approved === false && " · Khách từ chối"}
                        </p>
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

              {selected.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSend(selected)}
                  className="w-full rounded-xl bg-[#1F2933] px-4 py-3 text-xs font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                >
                  {isSaving ? "Đang gửi..." : "Gửi báo giá cho khách"}
                </button>
              )}

              {selected.status === "SENT" && (
                <p className="rounded-xl bg-[#F5F1E8] px-4 py-3 text-[11px] font-semibold text-[#876D35]">
                  Đã gửi, chờ khách hàng duyệt báo giá.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF0F2] px-6 py-5">
              <div>
                <h3 className="text-lg font-bold">Tạo báo giá</h3>
                <p className="mt-1 text-xs text-[#8A9299]">
                  Chỉ lập được cho phiếu đang "Đang kiểm tra" hoặc "Chờ khách duyệt".
                </p>
              </div>
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

              {eligibleOrders.length === 0 ? (
                <p className="rounded-xl bg-[#F3F4F2] px-4 py-6 text-center text-[11px] text-[#66717C]">
                  Hiện không có phiếu nào đủ điều kiện lập báo giá.
                </p>
              ) : (
                <>
                  <label className="text-xs font-semibold">
                    Phiếu sửa chữa *
                    <select
                      value={createRoId}
                      onChange={(event) => setCreateRoId(Number(event.target.value))}
                      className={`${inputClass} mt-2`}
                    >
                      <option value="">-- Chọn phiếu --</option>
                      {eligibleOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.repair_order_code} · {order.customer?.full_name ?? "—"} ·{" "}
                          {quotationStatusLabel[order.status] ?? order.status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold">Dịch vụ trong báo giá</p>
                      <button
                        type="button"
                        onClick={() => setDraftItems((c) => [...c, emptyDraftItem()])}
                        className="rounded-lg border border-[#D9DDE1] px-3 py-1.5 text-[10px] font-semibold hover:border-[#D6A85F]"
                      >
                        + Thêm dòng
                      </button>
                    </div>

                    <div className="space-y-3">
                      {draftItems.map((item, index) => (
                        <div key={index} className="rounded-xl border border-[#E1E4E6] bg-[#FAFAF9] p-3">
                          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                            <select
                              value={item.service_id}
                              onChange={(event) => changeService(index, Number(event.target.value))}
                              className={inputClass}
                            >
                              <option value="">-- Chọn dịch vụ --</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(event) =>
                                updateDraftItem(index, { quantity: Number(event.target.value) })
                              }
                              placeholder="SL"
                              className={inputClass}
                            />

                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={item.unit_price}
                              onChange={(event) =>
                                updateDraftItem(index, { unit_price: event.target.value })
                              }
                              placeholder="Đơn giá"
                              className={inputClass}
                            />
                          </div>

                          {draftItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraftItems((c) => c.filter((_, i) => i !== index))
                              }
                              className="mt-2 text-[10px] font-semibold text-red-600 hover:underline"
                            >
                              Xóa dòng
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold">
                      Giảm giá (VNĐ)
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                        placeholder="0"
                        className={`${inputClass} mt-2`}
                      />
                    </label>

                    <label className="text-xs font-semibold">
                      Hiệu lực đến
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(event) => setValidUntil(event.target.value)}
                        className={`${inputClass} mt-2`}
                      />
                    </label>
                  </div>
                </>
              )}

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
                  disabled={isCreating || eligibleOrders.length === 0}
                  className="rounded-xl bg-[#1F2933] px-5 py-3 text-xs font-semibold text-white hover:bg-[#151D24] disabled:opacity-60"
                >
                  {isCreating ? "Đang tạo..." : "Tạo báo giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Quotation;
