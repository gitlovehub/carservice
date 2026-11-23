import { ToastError } from "../../components/ui/ToastError";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLiveRefresh } from '../../services/liveSync';
import { pageCacheSaver, readPageCache } from '../../services/pageCache';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { OrderPaperwork } from '../customer/RepairStatus';
import { QuotationDetailModal } from '../customer/QuotationDetailModal';
import { quotationRoundLabel } from '../customer/account/useDetailedOrders';
import { useAuthSession } from '../../contexts/authSession';
import { ApiClientError, fetchApi } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import { Icon, type IconName } from '../../components/ui/Icon';
import {
  FINISHED_REPAIR_STATUSES, formatDate, formatDateTime, formatTime, getMyAppointments, getMyRepairOrderDetail, getMyRepairOrders, getVehicleName, repairStatusLabel,
  type CustomerRepairOrder,
} from '../../services/customerApi';
import { ReferenceBanner } from './ReferenceShell';
import { foldVi } from './serviceDisplay';
import { userErrorMessage } from '../../services/apiError';

/**
 * Tiến độ sửa chữa (khách đã đăng nhập) — trang riêng ở menu chính, không nằm trong khu Hồ sơ.
 * Bố cục: danh sách xe đang sửa (tab Đang xử lý / Đã hoàn tất, lọc không dấu) → khung chi tiết của phiếu đang chọn:
 * "Việc cần bạn làm" theo trạng thái, 5 bước tiến độ có mốc thời gian, hạng mục, chi phí, nhật ký.
 * Phiếu đang chọn nằm trên URL (?orderId=) để chuông thông báo / chia sẻ mở đúng phiếu; tự làm mới mỗi 60 giây.
 */

type AppointmentLink = CustomerRepairOrder & { appointment_id?: number | null };
type Tone = 'warning' | 'info' | 'success' | 'neutral';


const STAGES: { label: string; icon: IconName; statuses: string[] }[] = [
  { label: 'Tiếp nhận', icon: 'car', statuses: ['RECEIVED'] },
  { label: 'Kiểm tra & báo giá', icon: 'search', statuses: ['INSPECTING', 'QUOTING', 'WAITING_APPROVAL'] },
  { label: 'Sửa chữa', icon: 'wrench', statuses: ['IN_PROGRESS', 'WAITING_FOR_PARTS'] },
  { label: 'Kiểm tra lại', icon: 'shield', statuses: ['REVIEW_TEST'] },
  { label: 'Bàn giao', icon: 'check', statuses: ['COMPLETED', 'HANDED_OVER'] },
];
const stageOf = (status: string) => STAGES.findIndex(stage => stage.statuses.includes(status));
const isFinished = (status: string) => FINISHED_REPAIR_STATUSES.includes(status);

const money = (n: string | number | null | undefined) =>
  n == null || n === '' ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n));
/** Ngày giờ theo định dạng chung của web khách (24h); trống/sai → null để ẩn dòng. */
const when = (d: string | null | undefined, withTime = true) => {
  const text = withTime ? formatDateTime(d) : formatDate(d);
  return text === '—' ? null : text;
};
const historyOf = (o: CustomerRepairOrder) => (o.statusHistory ?? o.status_history ?? []).slice()
  .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
const worksOf = (o: CustomerRepairOrder) => o.work_items ?? o.workItems ?? [];

const TONE_BOX: Record<Tone, string> = {
  warning: 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  neutral: 'border-cs-border bg-cs-surface-2 text-cs-text',
};
const TONE_ICON: Record<Tone, string> = {
  warning: 'bg-amber-500 text-white', info: 'bg-sky-500 text-white', success: 'bg-emerald-500 text-white', neutral: 'bg-cs-muted text-white',
};

/** "Việc cần bạn làm": một thông điệp + nút hành động, ưu tiên việc khách phải xử lý trước. */
function nextStep(o: CustomerRepairOrder): { tone: Tone; icon: IconName; title: string; text: ReactNode; action?: { label: string; to: string } } {
  const pendingQuote = o.quotations?.slice().sort((a, b) => b.id - a.id).find(q => q.status === 'SENT');
  if (pendingQuote || o.status === 'WAITING_APPROVAL') return {
    tone: 'warning', icon: 'dollar', title: 'Báo giá đang chờ bạn duyệt',
    text: <>Gara chỉ bắt đầu sửa các hạng mục bạn đồng ý.{pendingQuote && <> Tổng báo giá: <strong>{money(pendingQuote.total_amount)}</strong>.</>}</>,
    action: { label: 'Xem & duyệt báo giá', to: '/quotation' },
  };
  if (o.handovers?.some(h => h.status === 'SUBMITTED')) return {
    tone: 'warning', icon: 'clipboard', title: 'Biên bản giao nhận chờ bạn xác nhận',
    // Không thêm nút ở đây: nút "Xem & xác nhận biên bản" (mở modal) nằm ở mục Biên bản giao nhận bên dưới — tránh 2 nút trùng.
    text: 'Bấm “Xem & xác nhận biên bản” ở mục Biên bản giao nhận bên dưới, kiểm tra ảnh và tình trạng xe rồi xác nhận.',
  };
  if (o.status === 'COMPLETED') {
    const unpaid = o.invoice && ['UNPAID', 'PARTIALLY_PAID'].includes(o.invoice.status);
    return unpaid
      ? { tone: 'success', icon: 'card', title: 'Xe đã sửa xong — sẵn sàng bàn giao', text: <>Hóa đơn <strong>{money(o.invoice?.total_amount)}</strong> đang chờ thanh toán. Thanh toán trước để nhận xe nhanh hơn.</>, action: { label: 'Xem hóa đơn & thanh toán', to: '/invoices' } }
      : { tone: 'success', icon: 'check', title: 'Xe đã sửa xong — sẵn sàng bàn giao', text: 'Bạn có thể đến gara nhận xe. Nhớ mang theo giấy tờ xe.' };
  }
  if (o.status === 'WAITING_FOR_PARTS') {
    const parts = o.part_requests?.filter(r => ['REQUESTED', 'ORDERED'].includes(r.status)) ?? [];
    return {
      tone: 'info', icon: 'box', title: 'Đang chờ phụ tùng',
      text: parts.length
        ? <>{parts.map(r => `${r.part?.name ?? 'Phụ tùng'} ×${r.quantity}${r.eta_date ? ` (dự kiến về ${when(r.eta_date, false)})` : ''}`).join(', ')}. Gara tiếp tục sửa ngay khi có hàng.</>
        : 'Gara đang đặt phụ tùng và sẽ tiếp tục sửa ngay khi có hàng.',
    };
  }
  if (o.status === 'HANDED_OVER') return {
    tone: 'success', icon: 'star', title: 'Đã bàn giao xe', text: 'Cảm ơn bạn đã tin tưởng CarService. Dành một phút đánh giá để gara phục vụ tốt hơn nhé.',
    action: { label: 'Đánh giá dịch vụ', to: `/customer/service-history?review=${o.id}` },
  };
  if (o.status === 'CLOSED') return { tone: 'neutral', icon: 'info', title: 'Phiếu đã đóng', text: 'Phiếu sửa chữa này đã kết thúc.' };
  if (['INSPECTING', 'QUOTING'].includes(o.status)) return {
    tone: 'info', icon: 'search', title: o.status === 'QUOTING' ? 'Gara đang lập báo giá' : 'Kỹ thuật viên đang kiểm tra xe',
    text: 'Bạn sẽ nhận thông báo ngay khi có báo giá để xem và duyệt.',
  };
  return {
    tone: 'info', icon: 'wrench', title: repairStatusLabel[o.status] || 'Đang xử lý',
    text: o.estimated_ready_at ? <>Dự kiến hoàn thành <strong>{when(o.estimated_ready_at)}</strong>. Gara sẽ cập nhật khi có thay đổi.</> : 'Gara sẽ cập nhật tiến độ ngay khi có thay đổi.',
  };
}

/** 5 vạch tiến độ nhỏ trên thẻ danh sách. */
function MiniProgress({ status }: { status: string }) {
  const at = stageOf(status);
  return <div className="flex gap-1" aria-hidden="true">
    {STAGES.map((stage, i) => <span key={stage.label} className={`h-1.5 flex-1 rounded-full ${status === 'CLOSED' ? 'bg-cs-border' : i <= at ? 'bg-[#e11d2e]' : 'bg-cs-border'}`}/>)}
  </div>;
}

function Stepper({ order }: { order: CustomerRepairOrder }) {
  const at = stageOf(order.status);
  const closed = order.status === 'CLOSED';
  // Mốc thời gian mỗi bước = lần đầu phiếu chuyển sang một trạng thái thuộc bước đó.
  const reached = STAGES.map(stage => historyOf(order).find(h => stage.statuses.includes(h.status))?.created_at ?? null);
  if (reached[0] == null) reached[0] = order.received_at ?? null;
  return <ol className="grid grid-cols-5 gap-1">
    {STAGES.map((stage, i) => {
      const done = !closed && i < at;
      const current = !closed && i === at;
      return <li key={stage.label} className="relative flex flex-col items-center text-center">
        {i < STAGES.length - 1 && <span aria-hidden="true" className={`absolute top-5 left-[calc(50%+22px)] h-0.5 w-[calc(100%-44px+0.25rem)] rounded-full ${done ? 'bg-[#e11d2e]' : 'bg-cs-border'}`}/>}
        <span className={`relative grid size-10 place-items-center rounded-full ${done ? 'bg-[#e11d2e] text-white' : current ? 'bg-[#e11d2e] text-white ring-4 ring-[#fde0e4] dark:ring-[#4a1219]' : 'bg-cs-surface-2 text-cs-muted'}`}>
          <Icon name={done ? 'check' : stage.icon} size={17}/>
        </span>
        <strong className={`mt-2 text-[11px] leading-tight sm:text-[13px] ${current ? 'text-cs-accent-text' : done ? 'text-cs-text' : 'text-cs-muted'}`}>{stage.label}</strong>
        <small className="mt-0.5 hidden text-[11px] text-cs-muted sm:block">{(done || current) && reached[i] ? when(reached[i]) : current ? 'Đang thực hiện' : ' '}</small>
      </li>;
    })}
  </ol>;
}

function Section({ title, icon, children, aside }: { title: string; icon: IconName; children: ReactNode; aside?: ReactNode }) {
  return <section className="rounded-2xl border border-cs-border bg-cs-surface p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-extrabold text-cs-text"><span className="text-cs-accent-text"><Icon name={icon} size={18}/></span>{title}</h3>
      {aside}
    </div>
    {children}
  </section>;
}

function OrderDetail({ order, appointmentCode, loading, onChanged }: { order: CustomerRepairOrder; appointmentCode?: string; loading: boolean; onChanged: () => void }) {
  const { hash } = useLocation();
  // "Xem & xác nhận biên bản" (#bien-ban) → cuộn tới đúng khung biên bản khi chi tiết đã tải.
  const hasHandovers = !!order.handovers?.length;
  useEffect(() => {
    if (!hash || !hasHandovers) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, hasHandovers, order.id]);
  const step = nextStep(order);
  const works = worksOf(order);
  const doneWorks = works.filter(w => w.status === 'COMPLETED').length;
  const percent = works.length ? Math.round((doneWorks / works.length) * 100) : 0;
  const quote = order.quotations?.slice().sort((a, b) => b.id - a.id).find(q => !['CANCELLED', 'REJECTED', 'DRAFT'].includes(q.status));
  const history = historyOf(order).reverse();
  const [quoteOpen, setQuoteOpen] = useState(false);

  return <div className="space-y-5">
    {quoteOpen && quote && <QuotationDetailModal key={quote.id} row={{ quotation: quote, order }} onClose={() => setQuoteOpen(false)} onResponded={onChanged}/>}
    {/* Đầu khung: xe + mã + trạng thái */}
    <div className="rounded-2xl border border-cs-border bg-cs-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-[0.1em] text-cs-accent-text">{order.repair_order_code}{appointmentCode && <span className="font-semibold text-cs-muted"> · Lịch hẹn {appointmentCode}</span>}</p>
          <h2 className="mt-1 text-xl font-extrabold text-cs-text sm:text-2xl">{getVehicleName(order.vehicle)}</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-cs-muted">
            <span className="inline-flex items-center gap-1.5"><Icon name="car" size={14}/>{order.vehicle?.license_plate || 'Chưa có biển số'}</span>
            {when(order.received_at) && <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14}/>Tiếp nhận {when(order.received_at)}</span>}
            {order.estimated_ready_at && !isFinished(order.status) && <span className="inline-flex items-center gap-1.5"><span className="text-[#e11d2e]"><Icon name="clock" size={14}/></span>Dự kiến xong {when(order.estimated_ready_at)}</span>}
          </p>
        </div>
        <StatusBadge domain="repair" status={order.status} audience="customer" className="text-sm"/>
      </div>

      <div className="mt-6"><Stepper order={order}/></div>

      {/* Việc cần bạn làm / thông tin hiện tại */}
      <div className={`mt-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${TONE_BOX[step.tone]}`} role="status">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE_ICON[step.tone]}`}><Icon name={step.icon} size={19}/></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{step.title}</p>
          <p className="mt-0.5 text-sm opacity-90">{step.text}</p>
        </div>
        {step.action && <Link to={step.action.to} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e11d2e] px-4 py-2.5 text-sm font-bold text-white no-underline transition hover:bg-[#c81627]">{step.action.label}<Icon name="arrow" size={15}/></Link>}
      </div>
      {loading && <p className="mt-3 text-xs text-cs-muted">Đang tải chi tiết mới nhất…</p>}
    </div>

    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
      <Section title="Hạng mục công việc" icon="layers" aside={works.length > 0 && <span className="text-sm font-bold text-cs-text">{doneWorks}/{works.length} xong</span>}>
        {works.length === 0 ? <p className="text-sm text-cs-muted">Gara sẽ cập nhật hạng mục sau khi kiểm tra và bạn duyệt báo giá.</p> : <>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-cs-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ hạng mục">
            <div className="h-full rounded-full bg-[#e11d2e] transition-[width] duration-500" style={{ width: `${percent}%` }}/>
          </div>
          <ul className="divide-y divide-cs-border">
            {works.map(w => {
              const done = w.status === 'COMPLETED', doing = w.status === 'IN_PROGRESS';
              return <li key={w.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : doing ? 'bg-[#e11d2e] text-white' : 'border border-cs-border text-cs-muted'}`}>
                  {done ? <Icon name="check" size={13}/> : doing ? <Icon name="wrench" size={12}/> : null}
                </span>
                <span className={`min-w-0 flex-1 ${done ? 'text-cs-muted line-through decoration-cs-border' : 'text-cs-text'}`}>{w.description || 'Công việc sửa chữa'}</span>
                <span className={`shrink-0 text-xs font-semibold ${done ? 'text-emerald-600 dark:text-emerald-400' : doing ? 'text-cs-accent-text' : 'text-cs-muted'}`}>{done ? 'Hoàn thành' : doing ? 'Đang làm' : 'Chờ'}</span>
              </li>;
            })}
          </ul>
        </>}
      </Section>

      <Section title="Chi phí" icon="receipt">
        {order.invoice ? <>
          <p className="text-sm text-cs-muted">Hóa đơn {order.invoice.invoice_code}</p>
          <p className="mt-1 text-2xl font-extrabold text-cs-accent-text">{money(order.invoice.total_amount)}</p>
          <div className="mt-2"><StatusBadge domain="invoice" status={order.invoice.status} audience="customer"/></div>
          <Link to="/invoices" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-cs-accent-text no-underline hover:underline">Xem hóa đơn<Icon name="arrow" size={14}/></Link>
        </> : quote ? <>
          <p className="text-sm text-cs-muted">Báo giá{quotationRoundLabel(order, quote)}</p>
          <p className="mt-1 text-2xl font-extrabold text-cs-accent-text">{money(quote.total_amount)}</p>
          <div className="mt-2"><StatusBadge domain="quotation" status={quote.status} audience="customer"/></div>
          {/* Mở modal chi tiết / duyệt ngay tại đây (cùng modal trang Báo giá), không chuyển trang. */}
          <button type="button" onClick={() => setQuoteOpen(true)} className="-mx-2.5 mt-3 inline-flex min-h-9 cursor-pointer items-center rounded-[10px] px-2.5 text-sm font-bold text-cs-accent-text transition-colors hover:bg-cs-soft focus-visible:bg-cs-soft">{quote.status === 'SENT' ? 'Xem và duyệt báo giá' : 'Xem báo giá'}</button>
        </> : <p className="text-sm text-cs-muted">Chưa có báo giá. Gara gửi báo giá sau khi kiểm tra xe.</p>}
        <p className="mt-4 border-t border-cs-border pt-3 text-xs text-cs-muted">Chi phí thực tế theo hóa đơn và các hạng mục bạn đã duyệt.</p>
      </Section>
    </div>

    <Section title="Nhật ký cập nhật" icon="clock">
      {history.length === 0 ? <p className="text-sm text-cs-muted">{loading ? 'Đang tải nhật ký…' : 'Chưa có cập nhật nào.'}</p> :
        <ol className="relative ml-1.5 border-l border-cs-border">
          {history.slice(0, 8).map((h, i) => <li key={h.id} className="relative pb-4 pl-5 last:pb-0">
            <span className={`absolute top-1 -left-[5px] size-2.5 rounded-full ${i === 0 ? 'bg-[#e11d2e] ring-4 ring-[#fde0e4] dark:ring-[#4a1219]' : 'bg-cs-border'}`}/>
            <p className={`text-sm ${i === 0 ? 'font-bold text-cs-text' : 'text-cs-text'}`}>{h.note?.trim() || repairStatusLabel[h.status] || 'Cập nhật trạng thái'}</p>
            <p className="text-xs text-cs-muted">{when(h.created_at) ?? ''}</p>
          </li>)}
        </ol>}
    </Section>

    {/* Biên bản, chẩn đoán, ủy quyền nhận xe — trước đây ở trang riêng /customer/repair-status/manage. */}
    <OrderPaperwork order={order} onChanged={onChanged}/>

    <div className="flex flex-wrap gap-3">
      <Link to="/customer/service-history" className="inline-flex items-center gap-2 rounded-xl border border-cs-border bg-cs-surface px-4 py-2.5 text-sm font-bold text-cs-text no-underline transition hover:border-[#e11d2e] hover:text-cs-accent-text"><Icon name="clock" size={16}/>Lịch sử bảo dưỡng</Link>
      <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-cs-border bg-cs-surface px-4 py-2.5 text-sm font-bold text-cs-text no-underline transition hover:border-[#e11d2e] hover:text-cs-accent-text"><Icon name="phone" size={16}/>Liên hệ gara</Link>
    </div>
  </div>;
}

/** Khách đã đăng nhập: toàn bộ phiếu của tài khoản. */
function MemberTracking() {
  const [params, setParams] = useSearchParams();
  const urlOrderId = Number(params.get('orderId') || 0);

  const [tick, setTick] = useState(0);
  const [list, setList] = useState<{ orders: CustomerRepairOrder[]; loading: boolean; error: string; updatedAt: Date | null }>(() => {
    const cached = readPageCache<CustomerRepairOrder[]>('customer:tracking');
    return { orders: cached ?? [], loading: cached === null, error: '', updatedAt: null };
  });
  const [detail, setDetail] = useState<CustomerRepairOrder | null>(null);
  const [appointmentCodes, setAppointmentCodes] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<'active' | 'done' | null>(null);
  const [search, setSearch] = useState('');

  // Danh sách phiếu: tải lần đầu, khi bấm "Thử lại" (lỗi) và mỗi khi gara cập nhật (realtime bên dưới).
  useEffect(() => {
    let alive = true;
    const save = pageCacheSaver<CustomerRepairOrder[]>('customer:tracking');
    getMyRepairOrders()
      .then(rows => { save(rows); if (alive) setList({ orders: rows, loading: false, error: '', updatedAt: new Date() }); })
      .catch(e => { if (alive) setList(prev => ({ ...prev, loading: false, error: userErrorMessage(e, 'Không tải được phiếu sửa chữa.') })); });
    return () => { alive = false; };
  }, [tick]);
  // Gara cập nhật tiến độ / báo giá / biên bản → tải lại ngay (WebSocket; mất kết nối thì liveSync tự hỏi định kỳ).
  useLiveRefresh(() => setTick(t => t + 1));
  useEffect(() => {
    let alive = true;
    getMyAppointments({ page: 1, perPage: 100 })
      .then(res => { if (alive) setAppointmentCodes(Object.fromEntries(res.items.map(a => [a.id, a.appointment_code]))); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const orders = list.orders;
  const active = useMemo(() => orders.filter(o => !isFinished(o.status)), [orders]);
  const done = useMemo(() => orders.filter(o => isFinished(o.status)), [orders]);
  // Mặc định mở tab "Đang xử lý" nếu còn xe đang sửa; link ?orderId= mở đúng tab của phiếu đó.
  const linked = orders.find(o => o.id === urlOrderId);
  const currentTab = tab ?? (linked ? (isFinished(linked.status) ? 'done' : 'active') : active.length ? 'active' : 'done');
  const term = foldVi(search);
  const visible = (currentTab === 'active' ? active : done).filter(o => !term || foldVi([
    o.repair_order_code, o.vehicle?.license_plate, getVehicleName(o.vehicle), appointmentCodes[(o as AppointmentLink).appointment_id ?? 0],
  ].join(' ')).includes(term));
  const selected = visible.find(o => o.id === urlOrderId) ?? visible[0] ?? null;

  // Chi tiết phiếu đang chọn (hạng mục, báo giá, nhật ký…), làm mới cùng nhịp với danh sách.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (selectedId === null) return;
    let alive = true;
    getMyRepairOrderDetail(selectedId).then(d => { if (alive) setDetail(d); }).catch(() => undefined);
    return () => { alive = false; };
  }, [selectedId, tick]);

  const shown = selected && detail?.id === selected.id ? detail : selected;
  const select = (id: number) => setParams(prev => { const next = new URLSearchParams(prev); next.set('orderId', String(id)); return next; }, { replace: true });
  const refresh = () => { setList(prev => ({ ...prev, error: '' })); setTick(t => t + 1); };

  return <div className="mx-auto w-[min(1230px,calc(100%-48px))] py-8 max-[570px]:w-[calc(100%-28px)]">
      {list.loading ? <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]" aria-busy="true">
        <div className="h-64 animate-pulse rounded-2xl bg-cs-surface-2"/><div className="h-96 animate-pulse rounded-2xl bg-cs-surface-2"/>
      </div> : list.error && orders.length === 0 ? <div className="rounded-2xl border border-cs-border bg-cs-surface p-8 text-center" role="alert">
        <p className="font-bold text-cs-text">{list.error}</p>
        <button type="button" onClick={refresh} className="mt-4 rounded-xl bg-[#e11d2e] px-5 py-2.5 text-sm font-bold text-white">Thử lại</button>
      </div> : orders.length === 0 ? <div className="rounded-2xl border border-cs-border bg-cs-surface px-6 py-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-cs-soft text-cs-accent-text"><Icon name="car" size={30}/></span>
        <h2 className="mt-4 text-xl font-extrabold text-cs-text">Chưa có xe nào đang sửa</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-cs-muted">Khi gara tiếp nhận xe theo lịch hẹn của bạn, tiến độ sửa chữa sẽ hiện ở đây.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/booking" className="rounded-xl bg-[#e11d2e] px-5 py-2.5 text-sm font-bold text-white no-underline">Đặt lịch ngay</Link>
          <Link to="/customer/appointments" className="rounded-xl border border-cs-border px-5 py-2.5 text-sm font-bold text-cs-text no-underline">Xem lịch hẹn</Link>
        </div>
      </div> : <>
        {/* Thanh công cụ: tab + lọc + làm mới */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-cs-border bg-cs-surface p-1" role="tablist" aria-label="Lọc phiếu sửa chữa">
            {([['active', 'Đang xử lý', active.length], ['done', 'Đã hoàn tất', done.length]] as const).map(([key, label, count]) =>
              <button key={key} type="button" role="tab" aria-selected={currentTab === key} onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${currentTab === key ? 'bg-[#e11d2e] text-white' : 'text-cs-text hover:bg-cs-surface-2'}`}>
                {label}<span className={`rounded-full px-1.5 text-xs ${currentTab === key ? 'bg-white/25' : 'bg-cs-surface-2 text-cs-muted'}`}>{count}</span>
              </button>)}
          </div>
          {/* Viền + vòng sáng đặt ở khung ngoài (focus-within); ô input bên trong không viền để không lồng 2 khung. */}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-cs-border bg-cs-surface px-3 transition focus-within:border-[#e11d2e]sm:max-w-sm">
            <span className="text-cs-muted"><Icon name="search" size={16}/></span>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã phiếu hoặc biển số xe…" aria-label="Mã phiếu hoặc biển số xe"
              className="min-w-0 flex-1 rounded-none! border-0! bg-transparent! py-2.5 text-sm text-cs-text shadow-none! outline-none! placeholder:text-cs-muted"/>
          </label>
          <div className="ml-auto flex items-center gap-2 text-xs text-cs-muted">
            {/* Realtime (WebSocket, có dự phòng hỏi định kỳ) → không cần nút "Làm mới"; chỉ báo dữ liệu đang tự cập nhật. */}
            {list.updatedAt && <span className="inline-flex items-center gap-1.5" title="Gara cập nhật là trang tự đổi, không cần tải lại">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true"/>Tự cập nhật · lúc {formatTime(list.updatedAt)}</span>}
          </div>
        </div>
        {list.error && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" role="alert">Chưa làm mới được: {list.error}</p>}

        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Danh sách xe / phiếu */}
          <div className="space-y-3 lg:sticky lg:top-24">
            {visible.length === 0 ? <p className="rounded-2xl border border-dashed border-cs-border px-4 py-8 text-center text-sm text-cs-muted">
              {term ? 'Không có phiếu khớp từ khóa.' : currentTab === 'active' ? 'Không có xe nào đang sửa.' : 'Chưa có phiếu hoàn tất.'}
            </p> : visible.map(o => {
              const on = o.id === selected?.id;
              return <button key={o.id} type="button" onClick={() => select(o.id)} aria-pressed={on}
                className={`w-full rounded-2xl border p-4 text-left transition ${on ? 'border-[#e11d2e] bg-cs-surface shadow-[0_10px_24px_#e11d2e1f]' : 'border-cs-border bg-cs-surface hover:border-[#e11d2e]/60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-cs-text">{getVehicleName(o.vehicle)}</p>
                    <p className="truncate text-xs text-cs-muted">{o.vehicle?.license_plate || 'Chưa có biển số'}</p>
                  </div>
                  <StatusBadge domain="repair" status={o.status} audience="customer"/>
                </div>
                <div className="mt-3"><MiniProgress status={o.status}/></div>
                <p className="mt-2 text-xs text-cs-muted">{isFinished(o.status) ? `Hoàn tất ${when(o.handed_over_at ?? o.completed_at, false) ?? ''}` : o.estimated_ready_at ? `Dự kiến xong ${when(o.estimated_ready_at)}` : `Tiếp nhận ${when(o.received_at, false) ?? ''}`}</p>
              </button>;
            })}
          </div>

          {/* Chi tiết phiếu đang chọn */}
          {shown ? <OrderDetail order={shown} appointmentCode={appointmentCodes[(shown as AppointmentLink).appointment_id ?? 0]} loading={detail?.id !== shown.id} onChanged={refresh}/>
            : <div className="rounded-2xl border border-dashed border-cs-border p-10 text-center text-sm text-cs-muted">Chọn một phiếu để xem tiến độ.</div>}
        </div>
      </>}
  </div>;
}

/* ===================== Tra cứu không cần đăng nhập ===================== */

type LookupResult =
  | { type: 'repair_order'; repair_order_code: string; appointment_code: string | null; status: string; received_at: string | null;
      estimated_ready_at: string | null; completed_at: string | null; handed_over_at: string | null;
      vehicle: { name: string; license_plate: string | null }; history: { status: string; created_at: string | null }[];
      work_progress: { done: number; total: number } }
  | { type: 'appointment'; appointment_code: string; status: string; appointment_date: string; appointment_time: string;
      vehicle: { name: string; license_plate: string | null } };

const fieldClass = 'w-full rounded-xl border border-cs-border bg-cs-surface px-3.5 py-3 text-sm text-cs-text outline-none transition placeholder:text-cs-muted focus:border-[#e11d2e] focus:ring-3 focus:ring-[#e11d2e]/15';

/**
 * Khách chưa đăng nhập: mã phiếu (RO-…) hoặc mã lịch hẹn (APT-…) + 4 số cuối điện thoại → tiến độ rút gọn
 * (không giá tiền / báo giá / hóa đơn). Muốn duyệt báo giá, xem chi phí, biên bản → đăng nhập.
 */
function GuestLookup() {
  const [code, setCode] = useState('');
  const [last4, setLast4] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'error'; message?: string; field?: 'code' | 'last4'; result?: LookupResult }>({ status: 'idle' });
  const fieldError = (name: 'code' | 'last4') => state.status === 'error' && state.field === name ? state.message : undefined;
  const clearField = (name: 'code' | 'last4') => setState(current => current.field === name ? { status: 'idle' } : current);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setState({ status: 'error', field: 'code', message: 'Nhập mã phiếu hoặc mã lịch hẹn.' });
    if (!/^\d{4}$/.test(last4)) return setState({ status: 'error', field: 'last4', message: 'Nhập đúng 4 số cuối số điện thoại đã đăng ký.' });
    setState({ status: 'loading' });
    try {
      const res = await fetchApi<{ data: LookupResult }>('/repair-orders/lookup', { method: 'POST', body: JSON.stringify({ code: code.trim(), phone_last4: last4 }) });
      setState({ status: 'idle', result: res.data });
    } catch (err) {
      const message = err instanceof ApiClientError && err.status === 429
        ? 'Bạn đã thử quá nhiều lần. Vui lòng đợi 1 phút rồi tra cứu lại.'
        : userErrorMessage(err, 'Không tra cứu được, vui lòng thử lại.');
      setState({ status: 'error', message });
    }
  };

  const result = state.result;
  return <div className="mx-auto grid w-[min(1230px,calc(100%-48px))] items-start gap-6 py-8 max-[570px]:w-[calc(100%-28px)] lg:grid-cols-[400px_minmax(0,1fr)]">
    <form onSubmit={submit} className="rounded-2xl border border-cs-border bg-cs-surface p-6 lg:sticky lg:top-24" noValidate>
      <h2 className="text-xl font-extrabold text-cs-text">Tra cứu nhanh</h2>
      <p className="mt-1 text-sm text-cs-muted">Không cần đăng nhập. Mã có trong tin nhắn/email xác nhận lịch hẹn hoặc phiếu tiếp nhận xe.</p>
      <label className="mt-5 block text-sm font-bold text-cs-text">Mã phiếu hoặc mã lịch hẹn
        <input value={code} onChange={e => { setCode(e.target.value); clearField('code'); }} aria-invalid={!!fieldError('code') || undefined} placeholder="VD: RO-2026-DM0198" autoComplete="off" className={`mt-1.5 uppercase placeholder:normal-case aria-invalid:border-danger ${fieldClass}`}/>
        {fieldError('code') && <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{fieldError('code')}</span>}
      </label>
      <label className="mt-4 block text-sm font-bold text-cs-text">4 số cuối số điện thoại
        <input value={last4} onChange={e => { setLast4(e.target.value.replace(/\D/g, '').slice(0, 4)); clearField('last4'); }} aria-invalid={!!fieldError('last4') || undefined} inputMode="numeric" placeholder="VD: 5678" autoComplete="off" className={`mt-1.5 tracking-[0.3em] aria-invalid:border-danger ${fieldClass}`}/>
        {fieldError('last4') && <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{fieldError('last4')}</span>}
        <span className="mt-1 block text-xs font-normal text-cs-muted">Số điện thoại bạn dùng khi đặt lịch / gửi xe.</span>
      </label>
      <ToastError message={state.status === 'error' && !state.field ? state.message : ''} signal={state}/>
      <button type="submit" disabled={state.status === 'loading'} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e11d2e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c81627] disabled:opacity-60">
        <Icon name="search" size={16}/>{state.status === 'loading' ? 'Đang tra cứu…' : 'Tra cứu tiến độ'}
      </button>
      <p className="mt-5 border-t border-cs-border pt-4 text-sm text-cs-muted">Đã có tài khoản? <Link to="/login" state={{ from: { pathname: '/repair-status' } }} className="font-bold text-cs-accent-text no-underline hover:underline">Đăng nhập</Link> để xem tất cả xe, duyệt báo giá và chi phí.</p>
    </form>

    {!result ? <div className="rounded-2xl border border-dashed border-cs-border bg-cs-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-cs-soft text-cs-accent-text"><Icon name="search" size={28}/></span>
      <h2 className="mt-4 text-lg font-extrabold text-cs-text">Xe của bạn đang ở bước nào?</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-cs-muted">Nhập mã và 4 số cuối điện thoại để xem tiến độ: tiếp nhận, kiểm tra & báo giá, sửa chữa, kiểm tra lại, bàn giao.</p>
    </div> : result.type === 'appointment' ? <div className="rounded-2xl border border-cs-border bg-cs-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-extrabold tracking-[0.1em] text-cs-accent-text">Lịch hẹn {result.appointment_code}</p>
          <h2 className="mt-1 text-xl font-extrabold text-cs-text">{result.vehicle.name}</h2>
          <p className="mt-1 text-sm text-cs-muted">{result.vehicle.license_plate ?? 'Chưa có biển số'}</p></div>
        <StatusBadge domain="appointment" status={result.status} audience="customer" className="text-sm"/>
      </div>
      <div className={`mt-5 flex gap-3 rounded-xl border p-4 ${TONE_BOX.info}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE_ICON.info}`}><Icon name="calendar" size={19}/></span>
        <div><p className="font-extrabold">Gara chưa tiếp nhận xe</p>
          <p className="mt-0.5 text-sm opacity-90">Lịch hẹn lúc <strong>{formatTime(result.appointment_time)} - {when(result.appointment_date, false)}</strong>. Tiến độ sửa chữa sẽ hiện tại đây ngay khi gara tiếp nhận xe.</p></div>
      </div>
    </div> : <div className="space-y-5">
      <div className="rounded-2xl border border-cs-border bg-cs-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.1em] text-cs-accent-text">{result.repair_order_code}{result.appointment_code && <span className="font-semibold text-cs-muted"> · Lịch hẹn {result.appointment_code}</span>}</p>
            <h2 className="mt-1 text-xl font-extrabold text-cs-text sm:text-2xl">{result.vehicle.name}</h2>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-cs-muted">
              <span className="inline-flex items-center gap-1.5"><Icon name="car" size={14}/>{result.vehicle.license_plate ?? 'Chưa có biển số'}</span>
              {when(result.received_at) && <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14}/>Tiếp nhận {when(result.received_at)}</span>}
              {result.estimated_ready_at && !isFinished(result.status) && <span className="inline-flex items-center gap-1.5"><span className="text-[#e11d2e]"><Icon name="clock" size={14}/></span>Dự kiến xong {when(result.estimated_ready_at)}</span>}
            </p>
          </div>
          <StatusBadge domain="repair" status={result.status} audience="customer" className="text-sm"/>
        </div>
        <div className="mt-6"><Stepper order={{ status: result.status, received_at: result.received_at, statusHistory: result.history.map((h, i) => ({ id: i, ...h })) } as CustomerRepairOrder}/></div>
        {result.work_progress.total > 0 && <div className="mt-6">
          <div className="mb-1.5 flex justify-between text-sm"><span className="font-bold text-cs-text">Hạng mục công việc</span><span className="text-cs-muted">{result.work_progress.done}/{result.work_progress.total} xong</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-cs-surface-2"><div className="h-full rounded-full bg-[#e11d2e]" style={{ width: `${Math.round(result.work_progress.done / result.work_progress.total * 100)}%` }}/></div>
        </div>}
      </div>
      <div className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center ${result.status === 'WAITING_APPROVAL' ? TONE_BOX.warning : TONE_BOX.neutral}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${result.status === 'WAITING_APPROVAL' ? TONE_ICON.warning : 'bg-[#e11d2e] text-white'}`}><Icon name={result.status === 'WAITING_APPROVAL' ? 'file' : 'lock'} size={19}/></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{result.status === 'WAITING_APPROVAL' ? 'Báo giá đang chờ bạn duyệt' : 'Xem đầy đủ chi phí, báo giá & biên bản'}</p>
          <p className="mt-0.5 text-sm opacity-90">Đăng nhập tài khoản đã đặt lịch để {result.status === 'WAITING_APPROVAL' ? 'xem và duyệt báo giá — gara chỉ sửa các hạng mục bạn đồng ý.' : 'xem hạng mục, chi phí, ảnh tình trạng xe và nhật ký chi tiết.'}</p>
        </div>
        <Link to="/login" state={{ from: { pathname: '/repair-status' } }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e11d2e] px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#c81627]">Đăng nhập<Icon name="arrow" size={15}/></Link>
      </div>
    </div>}
  </div>;
}

/** Đã đăng nhập (khách) → danh sách phiếu của tài khoản; chưa đăng nhập / tài khoản khác → tra cứu bằng mã. */
export default function ReferenceTracking() {
  const session = useAuthSession();
  const member = session.status === 'authenticated' && session.account.role === 'CUSTOMER';
  return <main className="v3ref">
    <ReferenceBanner title="Tra cứu" highlight="tiến độ" crumb="Tra cứu tiến độ"
      subtitle={member ? 'Theo dõi xe của bạn đang ở bước nào, việc cần bạn duyệt và thời gian dự kiến hoàn thành — cập nhật trực tiếp từ gara.' : 'Nhập mã phiếu hoặc mã lịch hẹn cùng 4 số cuối điện thoại để xem xe đang ở bước nào — không cần đăng nhập.'}
      image="banner-service-progress.webp" position="right center"/>
    {session.status === 'checking'
      ? <div className="mx-auto h-64 w-[min(1230px,calc(100%-48px))] animate-pulse rounded-2xl bg-cs-surface-2 py-8" aria-busy="true"/>
      : member ? <MemberTracking/> : <GuestLookup/>}
  </main>;
}
