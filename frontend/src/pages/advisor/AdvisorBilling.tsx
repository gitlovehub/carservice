import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../components/ui";
import { Badge } from "../../components/ui/Badge";
import { buttonClass } from "../../components/ui/buttonClass";
import { Dropdown } from "../../components/ui/Dropdown";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Icon, type IconName } from "../../components/ui/Icon";
import { controlClass } from "../../components/ui/fieldContext";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";
import { formatVnd, listRepairOrders, toNumber, workflowApi, type CounterMethod, type WorkflowOrder } from "../../services/workflowService";
import { useAdminQuery } from "../admin/kit/useAdminQuery";
import { useDebounced } from "../admin/kit/useDebounced";
import { OpenOrderButton, PreviewDrawer, RangePicker } from "./advisorListKit";
import { useNarrowDrawer } from "./useNarrowDrawer";
import { dayTime, fullDayTime, rangeDates, vehicleName, type Range } from "./advisorListFormat";
import { orderStepPath, stagePath } from "./repairOrderFlow";
import { useStageRedirect } from "./useStageRedirect";
import { Req } from "./WorkflowUI";
import { errorText } from "./workflowFormat";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";
import "./advisorDashboard.css";

/**
 * Thanh toán (cố vấn) — theo mockup PO 17/11/2026. Thu tại quầy: tiền mặt / chuyển khoản / thẻ / ví điện tử
 * (PO 17/11: trừ tiền mặt bắt buộc mã giao dịch để đối soát, không ghi trùng mã; lưu người thu). VNPay vẫn do khách
 * tự trả trong tài khoản. Doanh thu = tiền thực thu (giao dịch thành công) theo ngày giờ Việt Nam.
 */

type Filter = "unpaid" | "paid" | "all";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "unpaid", label: "Chờ thanh toán" }, { id: "paid", label: "Đã thanh toán" }, { id: "all", label: "Tất cả phiếu đã sửa xong" },
];
const METHODS: Array<{ id: CounterMethod; label: string; icon: IconName; code?: string }> = [
  { id: "DIRECT", label: "Tiền mặt", icon: "cash" },
  { id: "TRANSFER", label: "Chuyển khoản", icon: "bank", code: "Mã giao dịch chuyển khoản" },
  { id: "CARD", label: "Thẻ ngân hàng", icon: "card", code: "Mã chuẩn chi trên hoá đơn máy POS" },
  { id: "EWALLET", label: "Ví điện tử", icon: "coins", code: "Mã giao dịch ví (MoMo, ZaloPay…)" },
];
const METHOD_TEXT: Record<string, string> = { DIRECT: "Tiền mặt", TRANSFER: "Chuyển khoản", CARD: "Thẻ ngân hàng", EWALLET: "Ví điện tử", VNPAY: "VNPay (khách tự trả)", QR: "QR" };
/** Ô nhập chuẩn (40px, màn hẹp 44px) — cùng chiều cao với nút. */
const field = `mt-1 tabular-nums ${controlClass}`;
/** Số tiền hiển thị có dấu chấm ngăn nghìn (190.000), lưu dạng chuỗi chữ số. */
const money = (digits: string) => digits ? Number(digits).toLocaleString("vi-VN") : "";
const digitsOnly = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
const PER_PAGE = 8;

function billingBadge(order: WorkflowOrder): { tone: "warning" | "info" | "success" | "neutral"; label: string } {
  const invoice = order.invoice;
  if (!invoice) return { tone: "neutral", label: "Chưa lập hoá đơn" };
  if (invoice.status === "PAID") return { tone: "success", label: "Đã thanh toán" };
  if (invoice.status === "PARTIALLY_PAID") return { tone: "info", label: "Thanh toán một phần" };
  return { tone: "warning", label: "Chờ thanh toán" };
}

export default function AdvisorBilling() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find(f => f.id === params.get("filter"))?.id ?? "unpaid";
  const selectedParam = Number(params.get("order")) || null;
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("any");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const term = useDebounced(search.trim(), 350);

  const query = {
    page, search: term, perPage: PER_PAGE, withBilling: true, ...rangeDates(range),
    ...(filter === "all" ? { statuses: ["COMPLETED", "HANDED_OVER"] } : { billing: filter }),
    sort: "created", dir: "desc",
  };
  const list = useAdminQuery(`billing:${JSON.stringify(query)}#${version}`, signal => listRepairOrders(query, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const summary = result?.billing;
  const selectedId = selectedParam ?? rows[0]?.id ?? null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    setParams(next, { replace: true });
  };
  const selectFilter = (id: Filter) => { setParam({ filter: id === "unpaid" ? null : id, order: null }); setPage(1); };
  // Màn rộng: khung bên phải; màn hẹp: ngăn kéo xem nhanh (cùng cách các trang danh sách khác).
  const drawer = useNarrowDrawer();
  const open = (o: WorkflowOrder) => { setParam({ order: String(o.id) }); drawer.show(); };
  const stats: Array<{ label: string; icon: IconName; value: string; filter?: Filter; tone?: "success" }> = [
    { label: "Chờ thanh toán", icon: "receipt", value: summary ? String(summary.unpaid) : "–", filter: "unpaid" },
    { label: "Đã thanh toán", icon: "check", value: summary ? String(summary.paid) : "–", filter: "paid", tone: "success" },
    { label: "Doanh thu hôm nay", icon: "cash", value: summary ? formatVnd(summary.revenue_today) : "–" },
    { label: "Doanh thu tháng", icon: "chart", value: summary ? formatVnd(summary.revenue_month) : "–" },
  ];

  return <main className="page-container adv-theme space-y-5">
    <h1 className="sr-only">Thanh toán</h1>
    <section className="adv-ro-stats adv-ro-stats-4" aria-label="Thống kê thanh toán">
      {stats.map(s => s.filter
        ? <button key={s.label} type="button" className="adv-card adv-ro-stat" aria-pressed={filter === s.filter} onClick={() => selectFilter(s.filter!)}>
          <span className="adv-ro-stat-icon" data-tone={s.tone} aria-hidden="true"><Icon name={s.icon} size={26}/></span>
          <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span><span className="block text-[1.9rem] font-bold leading-tight tabular-nums text-cs-text">{s.value}</span></span>
        </button>
        : <div key={s.label} className="adv-card adv-ro-stat cursor-default!" title="Tiền thực thu (giao dịch thành công), theo giờ Việt Nam">
          <span className="adv-ro-stat-icon" aria-hidden="true"><Icon name={s.icon} size={26}/></span>
          <span className="min-w-0"><span className="block text-small font-semibold text-cs-text-2">{s.label}</span><span className="block truncate text-[1.6rem] font-bold leading-tight tabular-nums text-cs-text">{s.value}</span></span>
        </div>)}
    </section>

    <div className="adv-ro-layout">
      <section className="adv-card adv-ro-list" aria-label="Danh sách phiếu thanh toán">
        <header className="adv-ro-list-head"><h2>Danh sách phiếu thanh toán</h2></header>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <RangePicker label="Khoảng ngày nhận xe" anyLabel="Tất cả" value={range} onChange={r => { setRange(r); setPage(1); setParam({ order: null }); }}/>
            <div className="min-w-0 flex-1 [&>span]:w-full">
              <Dropdown label="Trạng thái thanh toán" items={FILTERS.map(f => ({ label: f.label, icon: f.id === filter ? "check" : undefined, onSelect: () => selectFilter(f.id) }))}
                trigger={props => <button type="button" {...props} className="adv-ro-range"><span className="min-w-0 flex-1 truncate text-left">{FILTERS.find(f => f.id === filter)?.label}</span><Icon name="chevron-down" size={16}/></button>}/>
            </div>
          </div>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); setParam({ order: null }); }} placeholder="Mã phiếu, biển số, tên hoặc SĐT…" className="adv-ro-search"/>
        </div>
        <div className="flex-1 space-y-2.5 px-4 pb-4">
          {list.loading && !result ? <LoadingState compact label="Đang tải..."/>
            : list.error ? <ErrorState compact description={list.error} onRetry={list.reload}/>
            : !rows.length ? <EmptyState compact icon="receipt" title={filter === "unpaid" ? "Không có phiếu chờ thanh toán" : "Không có phiếu phù hợp"} description="Phiếu xuất hiện ở đây sau khi hoàn thành sửa chữa."/>
            : rows.map(o => { const b = billingBadge(o); return <button key={o.id} type="button" className="adv-appt adv-ro-item" aria-current={o.id === selectedId} onClick={() => open(o)}>
              <span className="min-w-0 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2"><b className="text-small tracking-wide text-cs-text">{o.repair_order_code}</b><Badge tone={b.tone}>{b.label}</Badge></span>
                <span className="flex items-center gap-2 text-small text-cs-text"><Icon name="user" size={15} className="shrink-0 text-cs-muted"/><span className="min-w-0 flex-1 truncate">{o.customer?.full_name || "—"}</span>
                  <b className={`shrink-0 tabular-nums ${o.invoice?.status === "PAID" ? "text-cs-text" : "text-danger"}`}>{o.invoice ? formatVnd(o.invoice.total_amount) : "—"}</b></span>
                <span className="flex items-center gap-2 text-caption text-cs-text-2"><Icon name="car" size={15} className="shrink-0 text-cs-muted"/>
                  <span className="min-w-0 truncate">{vehicleName(o.vehicle)} · <span className="tabular-nums">{o.vehicle?.license_plate || "xxx.xx"}</span></span></span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-cs-muted"/>
            </button>; })}
        </div>
        {result && result.last_page > 1 && <div className="border-t border-cs-border px-4 py-3">
          <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={PER_PAGE} disabled={list.loading} onChange={p => { setPage(p); setParam({ order: null }); }}/>
        </div>}
      </section>

      <div className="adv-ro-preview">
        {selectedId ? <BillingPreview key={`${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/>
          : <section className="adv-card grid min-h-[320px] place-items-center p-8 text-center text-small text-cs-muted">Chọn một phiếu ở danh sách.</section>}
      </div>
      {selectedId && <PreviewDrawer open={drawer.open} onClose={drawer.close} title="Thanh toán phiếu sửa chữa">
        <BillingPreview key={`d-${selectedId}-${version}`} id={selectedId} onChanged={() => setVersion(v => v + 1)}/></PreviewDrawer>}
    </div>
  </main>;
}

type Tab = "detail" | "history" | "invoice";

function BillingPreview({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { confirm, notify } = useAppFeedback();
  const [tab, setTab] = useState<Tab>("detail");
  const [method, setMethod] = useState<CounterMethod>("DIRECT");
  // Mặc định thu đủ số còn lại (ô khoá, tránh gõ nhầm); bấm "Thu một phần" mới nhập số tiền khác.
  const [partial, setPartial] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [emailedTo, setEmailedTo] = useState("");
  const redirect = useStageRedirect();
  const detail = useAdminQuery(`billing-order:${id}`, () => workflowApi.order(id));
  const order = detail.data;
  const fieldErrors = useFieldErrors();

  if (!order) return <section className="adv-card min-h-[420px] p-6">
    {detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact label="Đang tải phiếu..."/>}
  </section>;

  const invoice = order.invoice;
  const items = invoice?.items ?? [];
  const serviceTotal = items.filter(i => i.item_type !== "PART").reduce((s, i) => s + toNumber(i.amount), 0);
  const partTotal = items.filter(i => i.item_type === "PART").reduce((s, i) => s + toNumber(i.amount), 0);
  const payments = invoice?.payments ?? [];
  const paid = payments.filter(p => p.status === "SUCCESS").reduce((s, p) => s + toNumber(p.amount), 0);
  const remaining = Math.max(0, toNumber(invoice?.total_amount) - paid);
  const amountValue = partial ? toNumber(amountText) : remaining;
  const change = toNumber(cashGiven) - amountValue;
  const canPay = !!invoice && invoice.status !== "PAID" && remaining > 0;
  const methodDef = METHODS.find(m => m.id === method)!;
  const b = billingBadge(order);
  const printPath = `${orderStepPath(order.id, 4)}&print=1`;

  async function createInvoice() {
    setWorking(true);
    try { await workflowApi.createInvoice(order!.id); notify("Đã lập hoá đơn từ các hạng mục khách đã duyệt.", "success"); onChanged(); }
    catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }

  async function sendPaymentEmail() {
    if (!invoice) return;
    const recipient = order!.customer?.email || "email trong tài khoản của khách";
    if (!await confirm({
      title: "Gửi email thanh toán", reference: invoice.invoice_code,
      description: `Gửi hoá đơn và link thanh toán VNPay ${formatVnd(remaining)} tới ${recipient}. Khách mở link là xem và trả được ngay, không cần đăng nhập. Link có hiệu lực 3 ngày.`,
      confirmText: "Đồng ý gửi", confirmIcon: "mail",
      checklist: ["Đã kiểm tra đúng email của khách và số tiền trên hoá đơn."],
    })) return;
    setWorking(true);
    try {
      const result = await workflowApi.sendInvoicePaymentEmail(invoice.id);
      setEmailedTo(result.emailed_to);
      notify(result.message, "success");
    } catch (err) { notify(errorText(err), "error"); }
    finally { setWorking(false); }
  }

  async function pay() {
    if (!invoice) return;
    const problems: FieldErrors = {};
    if (partial && !amountText) problems.amount = "Nhập số tiền thu một phần.";
    else if (!(amountValue > 0) || amountValue > remaining + 0.001) problems.amount = `Số tiền thu phải lớn hơn 0 và không quá ${formatVnd(remaining)}.`;
    if (method !== "DIRECT" && !code.trim()) problems.code = `Nhập ${methodDef.code?.toLowerCase()}.`;
    if (method === "DIRECT" && cashGiven && change < 0) problems.cash = `Khách đưa thiếu ${formatVnd(-change)}.`;
    setError("");
    if (fieldErrors.show(problems)) return;
    if (!await confirm({
      title: "Xác nhận thanh toán", reference: invoice.invoice_code,
      description: `Ghi nhận khách đã trả ${formatVnd(amountValue)} bằng ${methodDef.label.toLowerCase()}${method !== "DIRECT" ? ` (mã ${code.trim()})` : ""}.${method === "DIRECT" && change > 0 ? ` Trả lại khách ${formatVnd(change)}.` : ""}`,
      confirmText: "Đã nhận tiền",
      checklist: [method === "DIRECT" ? "Đã đếm đủ tiền mặt khách đưa." : "Đã kiểm tra tiền đã vào tài khoản gara / giao dịch thành công."],
    })) return;
    setWorking(true); setError("");
    try {
      await workflowApi.payAtCounter(invoice.id, method, amountValue, method === "DIRECT" ? undefined : code.trim());
      const full = amountValue >= remaining - 0.001;
      notify(full ? "Đã thu đủ tiền. Chuyển sang bước bàn giao xe." : "Đã ghi nhận một phần thanh toán.", "success");
      // Thu đủ → tự sang trang của bước kế (kiểm tra & bàn giao, hoặc biên bản trả xe).
      if (!(full && await redirect(null, order!.id))) onChanged();
    } catch (err) { fieldErrors.showApi(err, { amount: "amount", transaction_code: "code" }); }
    finally { setWorking(false); }
  }

  const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
    { id: "detail", label: "Chi tiết thanh toán", icon: "list" },
    { id: "history", label: `Lịch sử thanh toán${payments.length ? ` (${payments.length})` : ""}`, icon: "clock" },
    { id: "invoice", label: "Hoá đơn", icon: "file" },
  ];

  return <section className="adv-card adv-ro-detail" aria-label={`Thanh toán ${order.repair_order_code ?? ""}`}>
    {/* Đầu khung cùng kiểu các trang khác (Báo giá, Biên bản, Kiểm tra & bàn giao): ô biểu tượng + vạch vàng + ánh nền. */}
    <header className="adv-hv-head relative -mx-5.5 -mt-5.5 flex flex-wrap items-center gap-4 rounded-t-[18px] px-5.5 py-4 max-sm:-mx-4 max-sm:-mt-4 max-sm:px-4">
      <span className="adv-hv-tile" aria-hidden="true"><Icon name="cash" size={30}/></span>
      <span className="adv-hv-rule" aria-hidden="true"/>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.45rem] font-bold leading-tight text-cs-text">Thanh toán phiếu sửa chữa</h2>
        <p className="mt-1 text-small text-cs-text-2">Phiếu <Link className="adv-hv-code font-semibold text-cs-text hover:text-cs-accent-text hover:underline" to={orderStepPath(order.id)}>{order.repair_order_code}</Link>
          {invoice?.invoice_code && <><span className="px-2 text-cs-muted">·</span>Hoá đơn {invoice.invoice_code}</>}</p>
        <p className="mt-0.5 text-caption text-cs-muted">Hoàn thành sửa chữa <span className="tabular-nums">{fullDayTime(order.completed_at)}</span></p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><Badge tone={b.tone}>{b.label}</Badge><OpenOrderButton id={order.id} step={4}/></div>
    </header>

    <div className="adv-ro-vehicle">
      <div className="flex min-w-0 items-center gap-4">
        <VehicleBrandLogo brand={order.vehicle?.model?.brand?.name} size={60}/>
        <div className="min-w-0"><p className="truncate text-subheading font-bold text-cs-text">{vehicleName(order.vehicle)}</p>
          <p className="text-small tabular-nums tracking-wide text-cs-text-2">{order.vehicle?.license_plate || "xxx.xx"}</p></div>
      </div>
      <div className="min-w-0 space-y-1.5 text-small">
        <p className="flex items-center gap-2 text-cs-text"><Icon name="user" size={16} className="shrink-0 text-cs-muted"/><span className="truncate font-semibold">{order.customer?.full_name || "—"}</span></p>
        <p className="flex items-center gap-2"><Icon name="phone" size={16} className="shrink-0 text-cs-muted"/>{order.customer?.phone ? <a className="tabular-nums text-cs-text hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : "—"}</p>
      </div>
    </div>

    {!invoice ? <div className="adv-notice">
      <Icon name="info" size={18} className="text-cs-accent-text"/>
      <span className="min-w-0 flex-1 text-small">Chưa lập hoá đơn. Hoá đơn tính từ các hạng mục khách đã duyệt (báo giá gốc + phát sinh).</span>
    </div> : <>
      <div role="tablist" aria-label="Nội dung thanh toán" className="adv-ro-tabs adv-ro-tabs-3">
        {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="adv-ro-tab" onClick={() => setTab(t.id)}><Icon name={t.icon} size={18}/><span>{t.label}</span></button>)}
      </div>

      {tab === "detail" && <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-cs-border"><table className="w-full min-w-[560px] text-small">
          <thead className="bg-cs-surface-2 text-left text-cs-text-2"><tr>
            <th className="w-12 px-3 py-2.5 text-center font-semibold">STT</th><th className="px-3 py-2.5 font-semibold">Hạng mục</th>
            <th className="px-3 py-2.5 font-semibold">Loại</th><th className="px-3 py-2.5 text-center font-semibold">Số lượng</th><th className="px-3 py-2.5 text-right font-semibold">Thành tiền</th>
          </tr></thead>
          <tbody className="divide-y divide-cs-border">{items.map((i, index) => <tr key={i.id} className="text-cs-text">
            <td className="px-3 py-2.5 text-center tabular-nums">{index + 1}</td>
            <td className="px-3 py-2.5 font-medium">{i.description}</td>
            <td className="px-3 py-2.5">{i.item_type === "PART" ? <span className="adv-kind" data-kind="part"><Icon name="box" size={14}/>Phụ tùng</span> : <span className="adv-kind" data-kind="service"><Icon name="wrench" size={14}/>Dịch vụ</span>}</td>
            <td className="px-3 py-2.5 text-center tabular-nums">{i.quantity}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{formatVnd(i.amount)}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
          <div className="rounded-xl border border-cs-border p-4 text-small">
            <p className="flex items-center gap-2 font-semibold text-cs-text"><Icon name="clipboard" size={16} className="text-cs-muted"/>Ghi chú:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-cs-text-2">
              <li>Hoá đơn gồm các hạng mục khách đã phê duyệt.</li>
              {order.quality_checked_at ? <li>Đã kiểm tra sau sửa chữa ({fullDayTime(order.quality_checked_at)}).</li> : <li>Chưa kiểm tra sau sửa chữa — cần làm trước khi bàn giao.</li>}
              <li>Khách có thể tự thanh toán VNPay trong tài khoản hoặc qua email thanh toán.</li>
            </ul>
          </div>
          <dl className="adv-quote-total">
            <div><dt>Tổng tiền dịch vụ</dt><dd>{formatVnd(serviceTotal)}</dd></div>
            <div><dt>Tổng tiền phụ tùng</dt><dd>{formatVnd(partTotal)}</dd></div>
            {toNumber(invoice.discount_amount) > 0 && <div><dt>Giảm giá</dt><dd>−{formatVnd(invoice.discount_amount)}</dd></div>}
            {paid > 0 && <div><dt>Đã thu</dt><dd className="text-success-fg">{formatVnd(paid)}</dd></div>}
            <div className="adv-quote-grand"><dt>{paid > 0 && remaining > 0 ? "Còn phải thu" : "Tổng thanh toán"}</dt><dd className="text-danger">{formatVnd(paid > 0 && remaining > 0 ? remaining : invoice.total_amount)}</dd></div>
          </dl>
        </div>
      </div>}

      {tab === "history" && (payments.length ? <ul className="divide-y divide-cs-border rounded-xl border border-cs-border">{[...payments].reverse().map(p => <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-small">
        <span className="min-w-0 flex-1"><b className="text-cs-text">{METHOD_TEXT[p.payment_method] ?? p.payment_method}</b>
          {(p.transaction_code || p.gateway_txn_ref) && <span className="text-caption text-cs-muted"> · Mã {p.transaction_code || p.gateway_txn_ref}</span>}
          <span className="block text-caption text-cs-text-2">{dayTime(p.paid_at ?? p.created_at)}{p.collector ? ` · thu bởi ${p.collector.employee?.full_name || p.collector.email}` : ""}</span></span>
        <Badge tone={p.status === "SUCCESS" ? "success" : p.status === "PENDING" ? "warning" : "neutral"}>{p.status === "SUCCESS" ? "Thành công" : p.status === "PENDING" ? "Đang chờ" : p.status === "FAILED" ? "Thất bại" : "Đã huỷ"}</Badge>
        <b className="w-28 text-right tabular-nums text-cs-text">{formatVnd(p.amount)}</b>
      </li>)}</ul> : <p className="rounded-xl border border-dashed border-cs-border px-4 py-8 text-center text-small text-cs-muted">Chưa có khoản thu nào.</p>)}

      {tab === "invoice" && <dl className="grid gap-4 rounded-xl border border-cs-border p-4 text-small sm:grid-cols-2">
        <div><dt className="text-caption text-cs-muted">Số hoá đơn</dt><dd className="mt-1 font-semibold text-cs-text">{invoice.invoice_code}</dd></div>
        <div><dt className="text-caption text-cs-muted">Ngày lập</dt><dd className="mt-1 tabular-nums text-cs-text">{fullDayTime(invoice.created_at)}</dd></div>
        <div><dt className="text-caption text-cs-muted">Tổng hoá đơn</dt><dd className="mt-1 font-semibold tabular-nums text-cs-text">{formatVnd(invoice.total_amount)}</dd></div>
        <div><dt className="text-caption text-cs-muted">Đã thu / còn lại</dt><dd className="mt-1 tabular-nums text-cs-text">{formatVnd(paid)} / {formatVnd(remaining)}</dd></div>
      </dl>}

      {canPay && <section className="space-y-3" aria-label="Phương thức thanh toán">
        <h3 className="adv-section-title">Phương thức thanh toán</h3>
        <div role="radiogroup" aria-label="Phương thức thanh toán" className="adv-pay-methods">
          {METHODS.map(m => <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className="adv-pay-method" onClick={() => { setMethod(m.id); setError(""); fieldErrors.reset(); }}>
            <span className="adv-pay-radio" aria-hidden="true"/><Icon name={m.icon} size={18}/><span>{m.label}</span>
          </button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Số tiền thu: mặc định khoá ở số còn lại; "Thu một phần" mở ô nhập (có dấu chấm ngăn nghìn). */}
          <div className="text-caption font-semibold text-cs-muted">
            <span className="flex items-center justify-between gap-2">Số tiền thu (₫)
              <button type="button" className="text-caption font-semibold text-cs-accent-text hover:underline" onClick={() => { setPartial(p => !p); setAmountText(""); setError(""); fieldErrors.clear("amount"); }}>
                {partial ? "Thu đủ số còn lại" : "Thu một phần"}</button></span>
            {partial
              ? <><input className={`${field} tabular-nums`} inputMode="numeric" required autoFocus aria-invalid={!!fieldErrors.errors.amount || undefined} value={money(amountText)} placeholder={`Tối đa ${money(String(remaining))}`}
                  onChange={e => { setAmountText(digitsOnly(e.target.value)); setError(""); fieldErrors.clear("amount"); }} aria-label="Số tiền thu một phần"/>
                <FieldError className="mt-1">{fieldErrors.errors.amount}</FieldError>
                <span className="mt-1 block text-small font-normal text-cs-text-2">Còn lại sau lần thu này: <b className="tabular-nums text-cs-text">{formatVnd(Math.max(0, remaining - amountValue))}</b></span></>
              : <span className="mt-1.5 flex min-h-10 items-center justify-between gap-3 rounded-control border border-cs-border bg-cs-surface-2 px-3.5" aria-live="polite">
                  <b className="text-lg tabular-nums text-cs-text">{formatVnd(remaining)}</b><span className="text-caption font-normal text-cs-muted">Thu đủ số còn lại</span></span>}
            {!partial && <FieldError className="mt-1">{fieldErrors.errors.amount}</FieldError>}
          </div>
          {method === "DIRECT"
            ? <label className="text-caption font-semibold text-cs-muted">Khách đưa (₫, để tính tiền thối)
              <input className={`${field} tabular-nums`} inputMode="numeric" aria-invalid={!!fieldErrors.errors.cash || undefined} value={money(cashGiven)} placeholder="0" onChange={e => { setCashGiven(digitsOnly(e.target.value)); fieldErrors.clear("cash"); }}/>
              {cashGiven && <span className={`mt-1 block text-small ${change >= 0 ? "text-cs-text" : "text-danger"}`}>{change >= 0 ? `Tiền thối lại: ${formatVnd(change)}` : `Khách đưa thiếu ${formatVnd(-change)}`}</span>}
            </label>
            : <label className="text-caption font-semibold text-cs-muted">{methodDef.code}<Req/>
              <input className={field} required maxLength={100} aria-invalid={!!fieldErrors.errors.code || undefined} value={code} onChange={e => { setCode(e.target.value); fieldErrors.clear("code"); }} placeholder="Bắt buộc để đối soát"/>
              <FieldError className="mt-1">{fieldErrors.errors.code}</FieldError>
            </label>}
        </div>
        {error && <p className="text-small text-danger" role="alert">{error}</p>}
      </section>}
      {canPay && emailedTo && <div className="adv-notice" role="status"><Icon name="mail" size={18} className="text-success-fg"/><span className="min-w-0 flex-1 text-small">Đã gửi link thanh toán tới <b className="break-all">{emailedTo}</b>. Khi khách trả xong, phiếu tự chuyển sang đã thanh toán.</span></div>}
      {invoice.status === "PAID" && order.status === "COMPLETED" && <div className="adv-notice"><Icon name="check" size={18} className="text-success-fg"/><span className="min-w-0 flex-1 text-small">Đã thu đủ tiền. Bước tiếp theo: kiểm tra sau sửa chữa (nếu chưa) và bàn giao xe.</span></div>}
    </>}

    <footer className="adv-ro-footer justify-end!">
      <span className="cs-btn-row">
        {invoice && <Link className={buttonClass({ variant: "outline" })} to={printPath}><Icon name="printer" size={16}/>In hoá đơn</Link>}
        {/* Một nút vàng đồng cho việc kế tiếp: lập hoá đơn → thu tiền → sang bàn giao. */}
        {!invoice && order.status === "COMPLETED" && <button type="button" className="adv-btn-gold" disabled={working} onClick={() => void createInvoice()}><Icon name="receipt" size={18}/>Lập hoá đơn</button>}
        {canPay && <button type="button" className={buttonClass({ variant: "outline" })} disabled={working} onClick={() => void sendPaymentEmail()}><Icon name="mail" size={16}/>{emailedTo ? "Gửi lại email thanh toán" : "Gửi email thanh toán"}</button>}
        {canPay && <button type="button" className="adv-btn-gold" disabled={working} onClick={() => void pay()}><Icon name="check" size={18}/>Xác nhận thanh toán</button>}
        {invoice?.status === "PAID" && order.status === "COMPLETED" && <Link className="adv-btn-gold" to={stagePath(order) ?? `/advisor/delivery?order=${order.id}`}>Kiểm tra & bàn giao<Icon name="arrow-right" size={18}/></Link>}
      </span>
    </footer>
  </section>;
}
