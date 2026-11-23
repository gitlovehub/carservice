import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, ErrorState, IconButton, LoadingState, Modal } from "../../../components/ui";
import { ServiceStoppedTag, StatusBadge } from "../../../components/ui/Badge";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { VehicleBrandLogo } from "../../../components/vehicle/VehicleBrandLogo";
import { formatGarageAddress, useGarageInfo, type GarageInfo } from "../../../services/garageService";
import { mediaApi, type MediaItem } from "../../../services/evidenceService";
import {
  formatDate, formatMoney, formatTime, getMyRepairOrderDetail, paymentMethodLabel, paymentStatusLabel, requestTypeLabel,
  type CustomerRepairOrder, type InvoiceItem,
} from "../../../services/customerApi";
import { getStatus } from "../../../config/status";
import { LineItemsTable } from "../account/AccountKit";
import { MODAL_CLASS } from "../account/accountStyles";

type Tab = "overview" | "services" | "parts" | "invoice" | "history";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Tổng quan", icon: "list" },
  { id: "services", label: "Hạng mục dịch vụ", icon: "wrench" },
  { id: "parts", label: "Phụ tùng đã sử dụng", icon: "box" },
  { id: "invoice", label: "Hóa đơn", icon: "file" },
  { id: "history", label: "Tiến trình sửa chữa", icon: "clock" },
];

/** Kết quả kiểm tra đạt → chữ xanh lá; các kết quả khác (cần lưu ý / thay thế / không đạt) → chữ đỏ. */
const PASSED_CONDITIONS = new Set(["PASSED", "NORMAL", "GOOD", "OK"]);
function ConditionText({ status }: { status?: string | null }) {
  const label = status ? getStatus("inspection", status, "customer").label : "—";
  const passed = PASSED_CONDITIONS.has((status ?? "").toUpperCase());
  return <b className={status ? (passed ? "text-success-fg" : "text-danger-fg") : "text-cs-muted"}>{label}</b>;
}

/** Ngày · giờ như mẫu: "06/11/2026 · 08:30". */
const dateTime = (value?: string | null) => value ? `${formatTime(value)} - ${formatDate(value)}` : "—";

/** "8 giờ 15 phút" / "2 ngày 3 giờ" từ hai mốc thời gian. */
function duration(from?: string | null, to?: string | null): string {
  if (!from || !to) return "—";
  const minutes = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  const days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), mins = minutes % 60;
  return [days && `${days} ngày`, hours && `${hours} giờ`, !days && mins && `${mins} phút`].filter(Boolean).join(" ") || "Dưới 1 phút";
}

const isPart = (item: InvoiceItem) => item.item_type === "PART";
const sum = (items: InvoiceItem[]) => items.reduce((total, item) => total + Number(item.amount), 0);

/** Khối có tiêu đề (icon đỏ) dùng trong tab Tổng quan. */
function Panel({ icon, title, children, className = "" }: { icon: IconName; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-cs-border bg-cs-surface ${className}`}>
      <h4 className="flex items-center gap-2.5 border-b border-cs-border bg-cs-surface-2 px-5 py-3 text-[16px] font-extrabold text-cs-text"><span className="text-cs-accent-text"><Icon name={icon} size={19}/></span>{title}</h4>
      <div className="p-5">{children}</div>
    </section>
  );
}

/**
 * Một mục: "icon + nhãn:" ở trên, nội dung xuống dòng bên dưới (tiết kiệm chiều rộng khối).
 * `inline`: giá trị ngắn (số km, nhãn, tên) nằm cùng hàng, canh phải.
 */
function Row({ icon, label, children, inline = false }: { icon: IconName; label: string; children: ReactNode; inline?: boolean }) {
  if (inline) return (
    <div className="flex items-center justify-between gap-3 border-b border-cs-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <p className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-cs-muted"><Icon name={icon} size={15}/>{label}:</p>
      <div className="min-w-0 text-right text-[14px] font-semibold text-cs-text">{children}</div>
    </div>
  );
  return (
    <div className="border-b border-cs-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-cs-muted"><Icon name={icon} size={15}/>{label}:</p>
      <div className="mt-1.5 min-w-0 pl-[23px] text-[14px] font-semibold text-cs-text">{children}</div>
    </div>
  );
}

const Chip = ({ children }: { children: ReactNode }) => <span className="inline-block rounded-lg bg-cs-surface-2 px-2.5 py-1 text-[13px] font-bold text-cs-text">{children}</span>;
const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-[14px] text-cs-muted">{children}</p>;

/** Mở hóa đơn dạng trang in → khách chọn "Lưu dưới dạng PDF" trong hộp thoại in của trình duyệt. */
function printInvoice(order: CustomerRepairOrder, garage: GarageInfo | null) {
  const invoice = order.invoice;
  if (!invoice) return;
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const rows = (invoice.items ?? []).map((it) => `<tr><td>${esc(it.description || (isPart(it) ? "Phụ tùng" : "Dịch vụ"))}</td><td class="c">${esc(Number(it.quantity))}</td><td class="r">${esc(formatMoney(it.unit_price))}</td><td class="r">${esc(formatMoney(it.amount))}</td></tr>`).join("");
  const discount = Number(invoice.discount_amount ?? 0);
  const vehicle = order.vehicle;
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${esc(invoice.invoice_code)}</title>
<style>body{font-family:system-ui,"Segoe UI",Arial,sans-serif;color:#111;margin:32px;font-size:14px}h1{font-size:22px;margin:0}.muted{color:#555}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #e11d2e;padding-bottom:16px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-size:12px;text-transform:uppercase}.c{text-align:center}.r{text-align:right}.total td{font-weight:700;font-size:16px;border-bottom:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}</style></head><body>
<div class="head"><div><h1>${esc(garage?.name || "CarService")}</h1><div class="muted">${esc(formatGarageAddress(garage) || "")}</div><div class="muted">${esc(garage?.phone || "")}</div></div>
<div style="text-align:right"><h1>HÓA ĐƠN</h1><div><b>${esc(invoice.invoice_code)}</b></div><div class="muted">Ngày: ${esc(formatDate(order.completed_at ?? order.received_at))}</div></div></div>
<div class="grid"><div><span class="muted">Phiếu sửa chữa:</span> <b>${esc(order.repair_order_code)}</b></div><div><span class="muted">Xe:</span> <b>${esc([vehicle?.model?.brand?.name, vehicle?.model?.name, vehicle?.trim?.name].filter(Boolean).join(" "))}</b></div>
<div><span class="muted">Biển số:</span> <b>${esc(vehicle?.license_plate || "—")}</b></div><div><span class="muted">Số km:</span> <b>${esc(order.mileage_received != null ? `${Number(order.mileage_received).toLocaleString("vi-VN")} km` : "—")}</b></div></div>
<table><thead><tr><th>Hạng mục</th><th class="c">Số lượng</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows}</tbody>
<tfoot>${discount > 0 ? `<tr><td colspan="3" class="r">Giảm trừ</td><td class="r">-${esc(formatMoney(discount))}</td></tr>` : ""}<tr class="total"><td colspan="3" class="r">Tổng thanh toán</td><td class="r">${esc(formatMoney(invoice.total_amount))}</td></tr></tfoot></table>
<p class="muted" style="margin-top:24px">Trạng thái: ${esc(getStatus("invoice", invoice.status, "customer").label)}</p>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const win = window.open("", "_blank", "noopener=no,width=900,height=1000");
  if (!win) return;
  win.document.open(); win.document.write(html); win.document.close();
}

/** Ảnh nằm sau API kiểm quyền: tải blob kèm token rồi hiện bằng object URL. */
function usePhotos(order: CustomerRepairOrder | null) {
  const [photos, setPhotos] = useState<Array<{ item: MediaItem; url: string }>>([]);
  useEffect(() => {
    if (!order) return;
    let active = true;
    const created: string[] = [];
    const sources: Array<[Parameters<typeof mediaApi.list>[0], number]> = [
      ["repair_order", order.id],
      ...(order.inspections ?? []).map((i) => ["inspection", i.id] as [Parameters<typeof mediaApi.list>[0], number]),
      ...(order.handovers ?? []).map((h) => ["handover", h.id] as [Parameters<typeof mediaApi.list>[0], number]),
    ];
    Promise.all(sources.map(([type, id]) => mediaApi.list(type, id).catch(() => [] as MediaItem[])))
      .then((lists) => lists.flat().filter((m) => m.mime.startsWith("image/")).slice(0, 12))
      .then((items) => Promise.all(items.map(async (item) => {
        try { const url = URL.createObjectURL(await mediaApi.blob(item.id)); created.push(url); return { item, url }; } catch { return null; }
      })))
      .then((list) => { if (active) setPhotos(list.filter((p): p is { item: MediaItem; url: string } => p !== null)); });
    return () => { active = false; created.forEach((url) => URL.revokeObjectURL(url)); };
  }, [order]);
  return photos;
}

export default function ServiceDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const garage = useGarageInfo();
  const [order, setOrder] = useState<CustomerRepairOrder | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [preview, setPreview] = useState<string | null>(null);
  const photos = usePhotos(order);

  useEffect(() => {
    let active = true;
    getMyRepairOrderDetail(orderId)
      .then((data) => { if (active) setOrder(data); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Không tải được chi tiết dịch vụ."); });
    return () => { active = false; };
  }, [orderId, attempt]);

  const data = useMemo(() => {
    if (!order) return null;
    const workItems = order.work_items ?? order.workItems ?? [];
    const invoiceItems = order.invoice?.items ?? [];
    const serviceItems = invoiceItems.filter((it) => !isPart(it));
    const partItems = invoiceItems.filter(isPart);
    const technicians = [...new Set(workItems.map((w) => w.technician?.employee?.full_name).filter(Boolean))] as string[];
    const checkIn = order.handovers?.find((h) => h.type === "CHECK_IN");
    const inspection = order.inspections?.[0];
    const recommendations = (order.inspections ?? []).flatMap((i) => i.recommendations ?? []);
    const findings = (order.inspections ?? []).flatMap((i) => i.items ?? []);
    const history = [...(order.status_history ?? order.statusHistory ?? [])].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
    const bookedNames = [...(order.appointment?.services ?? []), ...(order.appointment?.packages ?? [])].map((s) => s.name);
    return { workItems, invoiceItems, serviceItems, partItems, technicians, checkIn, inspection, recommendations, findings, history, bookedNames };
  }, [order]);

  const vehicle = order?.vehicle;

  return (
    <Modal bare open onClose={onClose} title="Chi tiết lịch sử dịch vụ" className={`${MODAL_CLASS} max-w-[1180px]`}>
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div>
          <h3 className="text-[24px] font-extrabold text-cs-text">Chi tiết lịch sử dịch vụ</h3>
          <p className="mt-1 text-[15px] text-cs-muted">Thông tin đầy đủ về lần bảo dưỡng, sửa chữa và chi phí dịch vụ.</p>
        </div>
        <div className="shrink-0"><IconButton icon="x" label="Đóng" onClick={onClose}/></div>
      </div>

      {error ? <div className="px-5 pb-6 sm:px-7"><ErrorState description={error} onRetry={() => { setError(""); setAttempt((n) => n + 1); }}/></div>
        : !order || !data ? <LoadingState label="Đang tải chi tiết dịch vụ…"/>
        : (
          <div className="space-y-5 px-5 pb-6 sm:px-7">
            {/* Thẻ đầu: xe | thông tin phiếu | trạng thái + tổng tiền */}
            <div className="grid gap-5 rounded-2xl border border-cs-border p-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
              <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-cs-surface-2 text-cs-muted/60" aria-hidden="true"><Icon name="car" size={48}/></div>
              <div className="min-w-0 space-y-2">
                <VehicleBrandLogo brand={vehicle?.model?.brand?.name} size={44}/>
                <p className="break-words text-[22px] font-extrabold leading-tight text-cs-text">{[vehicle?.model?.brand?.name, vehicle?.model?.name].filter(Boolean).join(" ") || "Xe của bạn"}</p>
                <div className="flex flex-wrap gap-2">
                  {(vehicle?.trim?.name || vehicle?.variant) && <Chip>{vehicle?.trim?.name || vehicle?.variant}</Chip>}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-cs-surface-2 px-2.5 py-1 font-mono text-[14px] font-bold text-cs-text"><Icon name="car" size={15}/>{vehicle?.license_plate || "XXXX"}</span>
                </div>
              </div>
              <dl className="min-w-0 space-y-1 border-cs-border lg:border-l lg:pl-5">
                {([
                  ["calendar", "Mã phiếu", <span className="text-cs-accent-text">{order.repair_order_code}</span>],
                  ["calendar", "Ngày nhận xe", dateTime(order.received_at)],
                  ["calendar", "Ngày hoàn thành", dateTime(order.completed_at ?? order.handed_over_at)],
                  ["clock", "Thời gian thực hiện", duration(order.received_at, order.completed_at ?? order.handed_over_at)],
                ] as Array<[IconName, string, ReactNode]>).map(([icon, label, value]) => (
                  <div key={label} className="flex items-center gap-3 py-1.5 text-[14px]">
                    <span className="text-cs-muted"><Icon name={icon} size={17}/></span>
                    <dt className="w-[150px] shrink-0 text-cs-muted">{label}</dt>
                    <dd className="min-w-0 font-bold text-cs-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Tab */}
            <div className="flex gap-1 overflow-x-auto border-b border-cs-border [scrollbar-width:none]" role="tablist" aria-label="Chi tiết lịch sử dịch vụ">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={`-mb-px flex flex-1 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] font-bold transition-colors ${tab === t.id ? "border-cs-accent text-cs-accent-text" : "border-transparent text-cs-muted hover:text-cs-text"}`}>
                  <Icon name={t.icon} size={18}/>{t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-[1.2fr_1.1fr_1fr]">
                  <Panel icon="info" title="Thông tin dịch vụ">
                    <Row icon="clipboard" label="Loại dịch vụ" inline><Chip>{requestTypeLabel[order.appointment?.request_type ?? ""] ?? (order.appointment ? order.appointment.request_type : "Khách đến trực tiếp")}</Chip></Row>
                    {data.bookedNames.length > 0 && <Row icon="layers" label="Dịch vụ / gói đã đặt"><div className="flex flex-wrap gap-1.5">{data.bookedNames.map((n) => <Chip key={n}>{n}</Chip>)}</div></Row>}
                    <Row icon="wrench" label="Kỹ thuật viên" inline>{data.technicians.join(", ") || "—"}</Row>
                    <Row icon="phone" label="Cố vấn" inline>{order.advisor?.full_name || "—"}</Row>
                    <Row icon="file" label="Yêu cầu của bạn">
                      {order.customer_request || order.appointment?.symptom_description
                        ? <p className="whitespace-pre-wrap rounded-lg bg-cs-surface-2 px-3 py-2 font-medium text-cs-muted">{[order.appointment?.symptom_description, order.customer_request].filter(Boolean).join("\n")}</p> : "—"}
                    </Row>
                  </Panel>

                  <Panel icon="car" title={<>Tình trạng xe <span className="text-[14px] font-semibold text-cs-muted">(khi tiếp nhận)</span></>}>
                    <Row icon="gauge" label="Số ODO" inline>{order.mileage_received != null ? `${Number(order.mileage_received).toLocaleString("vi-VN")} km` : (data.checkIn?.mileage != null ? `${Number(data.checkIn.mileage).toLocaleString("vi-VN")} km` : "—")}</Row>
                    <Row icon="calendar" label="Tình trạng khi nhận">
                      {data.checkIn?.general_condition || order.initial_condition
                        ? <span className="font-medium">{data.checkIn?.general_condition || order.initial_condition}</span>
                        : <span className="font-normal text-cs-muted">Chưa ghi</span>}
                    </Row>
                    {data.checkIn?.fuel_level && <Row icon="droplet" label="Mức nhiên liệu" inline>{data.checkIn.fuel_level}</Row>}
                  </Panel>

                  <Panel icon="shield" title="Kết quả sau dịch vụ">
                    <Row icon="check" label="Trạng thái sửa chữa" inline><StatusBadge domain="repair" status={order.status} audience="customer"/></Row>
                    {data.inspection?.condition_description && <Row icon="clipboard" label="Kết quả kiểm tra"><span className="whitespace-pre-wrap font-normal">{data.inspection.condition_description}</span></Row>}
                    {data.inspection?.diagnosis && <Row icon="search" label="Kết luận chẩn đoán"><span className="font-normal">{data.inspection.diagnosis}</span></Row>}
                    {data.findings.length > 0 && (
                      <Row icon="list" label="Hạng mục kiểm tra">
                        <ul className="space-y-1 font-normal">{data.findings.slice(0, 5).map((f) => <li key={f.id}>{f.item_name}: <ConditionText status={f.condition_status}/></li>)}</ul>
                      </Row>
                    )}
                    <Row icon="check" label="Khuyến nghị">
                      {data.recommendations.length
                        ? <ul className="list-disc space-y-1 pl-4 font-normal">{data.recommendations.map((r) => <li key={r.id}>{r.service?.name || r.part?.name}{r.quantity && r.quantity > 1 ? ` × ${r.quantity}` : ""}</li>)}</ul>
                        : <span className="font-normal text-cs-muted">Không có khuyến nghị thêm.</span>}
                    </Row>
                  </Panel>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
                  <Panel icon="eye" title={<>Hình ảnh thực hiện <span className="text-[14px] font-semibold text-cs-muted">({photos.length} ảnh)</span></>}>
                    {photos.length ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {photos.map((p) => (
                          <button key={p.item.id} type="button" onClick={() => setPreview(p.url)} className="aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl bg-cs-surface-2" title={p.item.caption ?? undefined}>
                            <img src={p.url} alt={p.item.caption ?? "Ảnh dịch vụ"} className="h-full w-full object-cover"/>
                          </button>
                        ))}
                      </div>
                    ) : <Empty>Gara chưa đăng ảnh cho lần dịch vụ này.</Empty>}
                  </Panel>

                  <section className="overflow-hidden rounded-2xl border border-cs-accent/30 bg-cs-soft">
                    <h4 className="flex items-center gap-2.5 px-5 py-3 text-[16px] font-extrabold text-cs-accent-text"><Icon name="layers" size={19}/>Tổng chi phí</h4>
                    <div className="space-y-3 px-5 pb-5">
                      {order.invoice ? <>
                        <p className="flex items-center justify-between gap-3 text-[14px] text-cs-text"><span className="inline-flex items-center gap-2"><Icon name="file" size={16}/>Dịch vụ ({data.serviceItems.length} hạng mục)</span><b>{formatMoney(sum(data.serviceItems))}</b></p>
                        <p className="flex items-center justify-between gap-3 text-[14px] text-cs-text"><span className="inline-flex items-center gap-2"><Icon name="box" size={16}/>Phụ tùng ({data.partItems.length} hạng mục)</span><b>{formatMoney(sum(data.partItems))}</b></p>
                        {Number(order.invoice.discount_amount ?? 0) > 0 && <p className="flex items-center justify-between gap-3 text-[14px] text-cs-text"><span>Giảm trừ</span><b>-{formatMoney(order.invoice.discount_amount)}</b></p>}
                        <div className="flex items-center justify-between gap-3 border-t border-cs-accent/20 pt-3">
                          <span className="text-[17px] font-extrabold text-cs-text">Tổng thanh toán</span>
                          <span className="text-[24px] font-extrabold text-cs-accent-text">{formatMoney(order.invoice.total_amount)}</span>
                        </div>
                      </> : <p className="text-[14px] text-cs-muted">Gara chưa lập hóa đơn cho lần dịch vụ này.</p>}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {tab === "services" && (
              data.workItems.length ? (
                <ul className="divide-y divide-cs-border rounded-2xl border border-cs-border">
                  {data.workItems.map((w) => (
                    <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-cs-text">{w.description || "Hạng mục dịch vụ"}<ServiceStoppedTag status={w.service?.status}/></p>
                        <p className="mt-0.5 text-[13px] text-cs-muted">
                          {w.technician?.employee?.full_name ? `KTV: ${w.technician.employee.full_name}` : "Chưa phân công"}
                          {w.completed_at ? ` · Xong ${dateTime(w.completed_at)}` : w.started_at ? ` · Bắt đầu ${dateTime(w.started_at)}` : ""}
                        </p>
                      </div>
                      <StatusBadge domain="workItem" status={w.status} audience="customer"/>
                    </li>
                  ))}
                </ul>
              ) : data.serviceItems.length ? (
                <LineItemsTable items={data.serviceItems.map((it) => ({ id: it.id, label: it.description || "Dịch vụ", quantity: Number(it.quantity), unitPrice: formatMoney(it.unit_price), amount: formatMoney(it.amount) }))} total={formatMoney(sum(data.serviceItems))} totalLabel="Tổng dịch vụ"/>
              ) : <Empty>Chưa có hạng mục dịch vụ.</Empty>
            )}

            {tab === "parts" && (
              (order.used_parts ?? []).length ? (
                <LineItemsTable
                  items={(order.used_parts ?? []).map((p) => ({ id: p.id, label: p.part?.name || "Phụ tùng", quantity: Number(p.quantity), unitPrice: `${formatMoney(p.unit_price)}${p.part?.unit ? ` / ${p.part.unit}` : ""}`, amount: formatMoney(Number(p.quantity) * Number(p.unit_price)) }))}
                  total={formatMoney((order.used_parts ?? []).reduce((s, p) => s + Number(p.quantity) * Number(p.unit_price), 0))} totalLabel="Tổng phụ tùng"/>
              ) : data.partItems.length ? (
                <LineItemsTable items={data.partItems.map((it) => ({ id: it.id, label: it.description || "Phụ tùng", quantity: Number(it.quantity), unitPrice: formatMoney(it.unit_price), amount: formatMoney(it.amount) }))} total={formatMoney(sum(data.partItems))} totalLabel="Tổng phụ tùng"/>
              ) : <Empty>Lần dịch vụ này không thay phụ tùng.</Empty>
            )}

            {tab === "invoice" && (
              order.invoice ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[15px] text-cs-text">Hóa đơn <b className="font-mono">{order.invoice.invoice_code}</b></p>
                    <StatusBadge domain="invoice" status={order.invoice.status} audience="customer"/>
                  </div>
                  <LineItemsTable
                    items={data.invoiceItems.map((it) => ({ id: it.id, label: it.description || (isPart(it) ? "Phụ tùng" : "Dịch vụ"), kind: isPart(it) ? "Phụ tùng" : "Dịch vụ", quantity: Number(it.quantity), unitPrice: formatMoney(it.unit_price), amount: formatMoney(it.amount) }))}
                    discount={Number(order.invoice.discount_amount ?? 0) > 0 ? formatMoney(order.invoice.discount_amount) : null}
                    total={formatMoney(order.invoice.total_amount)} totalLabel="Tổng thanh toán"/>
                  {(order.invoice.payments ?? []).length > 0 && (
                    <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">
                      {order.invoice.payments?.map((pm) => (
                        <li key={pm.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                          <span className="text-[14px] text-cs-text">{paymentMethodLabel[pm.payment_method ?? "DIRECT"] ?? pm.payment_method} · <span className="text-cs-muted">{formatDate(pm.paid_at ?? pm.payment_date ?? pm.created_at)} · {paymentStatusLabel[pm.status] ?? pm.status}</span></span>
                          <b className={pm.status === "SUCCESS" ? "text-success-fg" : "text-cs-muted"}>{formatMoney(pm.amount)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : <Empty>Gara chưa lập hóa đơn cho lần dịch vụ này.</Empty>
            )}

            {tab === "history" && (
              data.history.length ? (
                <ol className="relative space-y-4 border-l-2 border-cs-border pl-6">
                  {data.history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[33px] top-1 flex size-4 items-center justify-center rounded-full border-2 border-cs-accent bg-cs-surface"/>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge domain="repair" status={h.status} audience="customer"/>
                        <time className="text-[13px] text-cs-muted">{dateTime(h.created_at)}</time>
                      </div>
                      {h.note && <p className="mt-1 text-[14px] text-cs-text font-medium">{h.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : <Empty>Chưa có tiến trình sửa chữa.</Empty>
            )}
          </div>
        )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cs-border px-5 py-4 sm:px-7">
        <Button variant="secondary" icon="download" disabled={!order?.invoice} onClick={() => order && printInvoice(order, garage)}>Tải hóa đơn (PDF)</Button>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[400] flex cursor-zoom-out items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)} role="presentation">
          <img src={preview} alt="Ảnh dịch vụ" className="max-h-full max-w-full rounded-xl object-contain"/>
        </div>
      )}
    </Modal>
  );
}
