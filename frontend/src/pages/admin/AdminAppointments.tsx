import { useMemo, useState, type ReactNode } from "react";
import { Button, DataTable, Dropdown, ErrorState, Icon, IconButton, LoadingState, Pagination, SearchInput, type Column, type DropdownItem } from "../../components/ui";
import { StatusBadge } from "../../components/ui/Badge";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { getStatus } from "../../config/status";
import { errorMessage } from "../../services/adminApi";
import {
  catalogAdminApi, dmy, hhmm, money, REQUEST_TYPES, weekRange,
  type AppointmentRow, type AppointmentStatus, type RequestType,
} from "../../services/catalogAdminApi";
import { AdminPage, FilterSelect, PaneSection, SplitView, Tabs, Toolbar } from "./kit/AdminKit";
import type { Tone } from "./kit/format";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useDebounced } from "./kit/useDebounced";
import { CancelAppointmentModal, CreateAppointmentModal } from "./appointments/AppointmentModals";

type StatusFilter = "ALL" | AppointmentStatus;
type View = "list" | "week";
const STATUS_CHIPS: Array<{ id: StatusFilter; label: string; icon: "list" | "clock" | "check" | "car" | "x" | "ban"; tone: Tone }> = [
  { id: "ALL", label: "Tất cả", icon: "list", tone: "neutral" },
  { id: "PENDING", label: "Chờ xác nhận", icon: "clock", tone: "warning" },
  { id: "CONFIRMED", label: "Đã xác nhận", icon: "check", tone: "info" },
  { id: "CHECKED_IN", label: "Đã tiếp nhận xe", icon: "car", tone: "success" },
  { id: "CANCELLED", label: "Đã huỷ", icon: "x", tone: "danger" },
  { id: "NO_SHOW", label: "Không đến", icon: "ban", tone: "neutral" },
];
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const PER_PAGE = 10;

const vehicleName = (a: AppointmentRow) => [a.vehicle?.model?.brand?.name, a.vehicle?.model?.name].filter(Boolean).join(" ") || "Chưa rõ dòng xe";
const timeRange = (a: AppointmentRow) => `${hhmm(a.appointment_time)}${a.end_time ? ` – ${a.end_time}` : ""}`;
const itemNames = (a: AppointmentRow) => [...a.packages.map(p => p.name), ...a.services.map(s => s.name)];
const isPast = (a: AppointmentRow) => new Date(`${a.appointment_date.slice(0, 10)}T${hhmm(a.appointment_time)}:00`).getTime() <= Date.now();

/** Ô xe: dòng xe + biển số (chỉ chữ, không icon). */
function VehicleCell({ a }: { a: AppointmentRow }) {
  return <span className="block min-w-0">
    <span className="block truncate font-semibold text-cs-text">{vehicleName(a)}</span>
    <span className="block whitespace-nowrap text-caption font-medium tabular-nums text-cs-text-2">{a.vehicle?.license_plate ?? "Chưa có biển"}</span>
  </span>;
}

/** Lịch hẹn — danh sách / lịch tuần, lọc theo trạng thái, tuần, loại yêu cầu; ngăn chi tiết để xác nhận, tiếp nhận, huỷ. */
export default function AdminAppointments() {
  const { notify } = useAppFeedback();
  const [view, setView] = useState<View>("list");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [type, setType] = useState<"all" | RequestType>("all");
  const [search, setSearch] = useState("");
  const [anchor, setAnchor] = useState(() => new Date());
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<AppointmentRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(search.trim());
  const week = useMemo(() => weekRange(anchor), [anchor]);

  const filters = {
    date_from: week.from, date_to: week.to, search: term,
    status: status === "ALL" ? undefined : status, request_type: type === "all" ? undefined : type,
  };
  const listParams = view === "list" ? { ...filters, page, per_page: PER_PAGE } : { ...filters, per_page: 500 };
  const list = useAdminQuery(`appointments:${view}:${JSON.stringify(listParams)}`, signal => catalogAdminApi.appointments(listParams, signal));
  const detail = useAdminQuery(selectedId === null ? null : `appointment:${selectedId}`, signal => catalogAdminApi.appointment(selectedId as number, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const counts = result?.counts ?? {};
  const selected = detail.data;

  const refresh = () => { list.reload(); detail.reload(); };
  const resetPage = () => { setPage(1); setChecked([]); };
  const shiftWeek = (weeks: number) => { setAnchor(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + weeks * 7)); resetPage(); };

  const run = async (key: string, task: () => Promise<{ message?: string } | void>, success: string) => {
    setBusy(key);
    try {
      await task();
      notify(success, "success");
      refresh();
    } catch (e) {
      notify(errorMessage(e, "Không cập nhật được lịch hẹn."), "error");
    } finally {
      setBusy(null);
    }
  };
  const who = (a: AppointmentRow) => a.customer?.full_name ?? "khách";
  const confirmOne = (a: AppointmentRow) => run(`confirm:${a.id}`, () => catalogAdminApi.confirmAppointment(a.id),
    `Đã xác nhận lịch ${a.appointment_code} của ${who(a)} (${hhmm(a.appointment_time)} ngày ${dmy(a.appointment_date)}).`);
  const checkIn = (a: AppointmentRow) => run(`checkin:${a.id}`, () => catalogAdminApi.checkInAppointment(a.id),
    `Đã tiếp nhận xe ${a.vehicle?.license_plate ?? ""} theo lịch ${a.appointment_code}.`);
  const noShow = (a: AppointmentRow) => run(`noshow:${a.id}`, () => catalogAdminApi.noShowAppointment(a.id),
    `Đã đánh dấu ${who(a)} không đến lịch ${a.appointment_code}.`);

  const confirmChecked = async () => {
    const pending = rows.filter(r => checked.includes(r.id) && r.status === "PENDING");
    if (!pending.length) return notify("Các lịch đã chọn không có lịch nào đang chờ xác nhận.", "info");
    setBusy("bulk");
    const results = await Promise.allSettled(pending.map(r => catalogAdminApi.confirmAppointment(r.id)));
    const ok = results.filter(r => r.status === "fulfilled").length;
    setBusy(null);
    setChecked([]);
    notify(ok === pending.length ? `Đã xác nhận ${ok} lịch hẹn đang chờ.` : `Đã xác nhận ${ok}/${pending.length} lịch; ${pending.length - ok} lịch không xác nhận được.`, ok === pending.length ? "success" : "warning");
    refresh();
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: AppointmentRow[] = [];
      for (let p = 1, last = 1; p <= last && p <= 20; p++) {
        const chunk = await catalogAdminApi.appointments({ ...filters, page: p, per_page: 200 });
        all.push(...chunk.data);
        last = chunk.pagination.last_page;
      }
      const data = checked.length ? all.filter(a => checked.includes(a.id)) : all;
      const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
      const lines = [
        ["Mã lịch", "Khách hàng", "Số điện thoại", "Xe", "Biển số", "Ngày hẹn", "Giờ hẹn", "Loại yêu cầu", "Dịch vụ", "Dự kiến (₫)", "Trạng thái"],
        ...data.map(a => [a.appointment_code, a.customer?.full_name ?? "", a.customer?.phone ?? "", vehicleName(a), a.vehicle?.license_plate ?? "",
          dmy(a.appointment_date), timeRange(a), REQUEST_TYPES[a.request_type]?.label ?? a.request_type, itemNames(a).join("; "),
          Math.round(a.estimated_total ?? 0), getStatus("appointment", a.status, "staff").label]),
      ];
      const blob = new Blob(["﻿" + lines.map(r => r.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: `lich-hen-${week.from}-${week.to}.csv` }).click();
      URL.revokeObjectURL(url);
      notify(`Đã xuất ${data.length} lịch hẹn (${dmy(week.from)} – ${dmy(week.to)}) ra file Excel (CSV).`, "success");
    } catch (e) {
      notify(errorMessage(e, "Không xuất được file."), "error");
    } finally {
      setExporting(false);
    }
  };

  const menu = (a: AppointmentRow): DropdownItem[] => [
    { label: "Xem chi tiết", icon: "eye", onSelect: () => setSelectedId(a.id) },
    ...(a.status === "PENDING" ? [{ label: "Xác nhận lịch", icon: "check" as const, onSelect: () => void confirmOne(a) }] : []),
    ...(a.status === "CONFIRMED" ? [{ label: "Tiếp nhận xe", icon: "car" as const, onSelect: () => void checkIn(a) }] : []),
    ...((a.status === "PENDING" || a.status === "CONFIRMED") && isPast(a) ? [{ label: "Khách không đến", icon: "ban" as const, onSelect: () => void noShow(a) }] : []),
    ...(a.status === "PENDING" || a.status === "CONFIRMED" ? [{ type: "separator" as const }, { label: "Huỷ lịch", icon: "x" as const, danger: true, onSelect: () => setCancelling(a) }] : []),
  ];

  const paneOpen = selectedId !== null;
  const allOnPage = rows.length > 0 && rows.every(r => checked.includes(r.id));
  const columns: Column<AppointmentRow>[] = [
    {
      key: "check", width: "44px", hideOnMobile: true,
      header: <input type="checkbox" className="size-4 cursor-pointer accent-[var(--cs-accent)]" aria-label="Chọn tất cả lịch trên trang" checked={allOnPage}
        onChange={() => setChecked(allOnPage ? [] : rows.map(r => r.id))}/>,
      render: a => <input type="checkbox" className="size-4 cursor-pointer accent-[var(--cs-accent)]" aria-label={`Chọn lịch ${a.appointment_code}`}
        checked={checked.includes(a.id)} onClick={e => e.stopPropagation()}
        onChange={() => setChecked(c => c.includes(a.id) ? c.filter(id => id !== a.id) : [...c, a.id])}/>,
    },
    { key: "code", header: "Mã lịch", primary: true, render: a => <b className="whitespace-nowrap text-cs-accent-text">{a.appointment_code}</b> },
    { key: "customer", header: "Khách hàng", render: a => <span className="block min-w-0">
      <b className="block truncate text-cs-text">{a.customer?.full_name ?? "—"}</b>
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-caption text-cs-muted"><Icon name="phone" size={12}/>{a.customer?.phone ?? "—"}</span>
    </span> },
    { key: "vehicle", header: "Xe / Biển số", render: a => <VehicleCell a={a}/> },
    { key: "time", header: "Ngày giờ hẹn", render: a => <span className="block whitespace-nowrap">
      <span className="block font-medium tabular-nums text-cs-text">{dmy(a.appointment_date)}</span><span className="block text-caption tabular-nums text-cs-muted">{timeRange(a)}</span>
    </span> },
    ...(paneOpen ? [] : [{ key: "type", header: "Loại yêu cầu", hideOnMobile: true, render: (a: AppointmentRow) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-cs-text-2">
      <Icon name={REQUEST_TYPES[a.request_type]?.icon ?? "wrench"} size={16} className="shrink-0 text-cs-muted"/>{REQUEST_TYPES[a.request_type]?.short ?? a.request_type}
    </span> },
    { key: "services", header: "Dịch vụ", hideOnMobile: true, render: (a: AppointmentRow) => {
      const names = itemNames(a);
      return names.length ? <span className="inline-flex max-w-[200px] items-center gap-1.5">
        <span className="truncate rounded-full border border-cs-border bg-cs-surface-2 px-2.5 py-0.5 text-caption text-cs-text-2" title={names.join(", ")}>{names[0]}</span>
        {names.length > 1 && <span className="shrink-0 text-caption text-cs-muted">+{names.length - 1}</span>}
      </span> : <span className="text-caption text-cs-muted">Chưa chọn</span>;
    } }]),
    { key: "status", header: "Trạng thái", render: a => <StatusBadge domain="appointment" status={a.status}/> },
  ];

  const pane: ReactNode = selectedId === null ? null : !selected
    ? (detail.error ? <ErrorState compact description={detail.error} onRetry={detail.reload}/> : <LoadingState compact/>)
    : <AppointmentDetail a={selected}/>;

  const paneFooter = selected && (selected.status === "PENDING" || selected.status === "CONFIRMED") ? <>
    {selected.status === "PENDING"
      ? <Button variant="success" icon="check" loading={busy === `confirm:${selected.id}`} loadingText="Đang xác nhận..." onClick={() => void confirmOne(selected)}>Xác nhận</Button>
      : <Button variant="primary" icon="car" loading={busy === `checkin:${selected.id}`} loadingText="Đang tiếp nhận..." onClick={() => void checkIn(selected)}>Tiếp nhận xe</Button>}
    {isPast(selected) && <Button icon="ban" loading={busy === `noshow:${selected.id}`} onClick={() => void noShow(selected)}>Không đến</Button>}
    <Button variant="danger-outline" icon="x" onClick={() => setCancelling(selected)}>Huỷ lịch</Button>
  </> : undefined;

  const filtersActive = status !== "ALL" || type !== "all" || term !== "";
  const toolbar = <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Tabs label="Chế độ xem" variant="segment" value={view} onChange={v => { setView(v); setChecked([]); }} items={[
        { id: "list", label: "Danh sách", icon: "list" }, { id: "week", label: "Lịch tuần", icon: "calendar" },
      ]}/>
    </div>
    <div className="mb-4">
      <Tabs label="Lọc theo trạng thái" variant="chips" value={status} onChange={v => { setStatus(v); resetPage(); }}
        items={STATUS_CHIPS.map(c => ({ id: c.id, label: c.label, icon: c.icon, tone: c.tone, count: counts[c.id] ?? 0 }))}/>
    </div>
    <Toolbar>
      <SearchInput value={search} onChange={v => { setSearch(v); resetPage(); }} placeholder="Tìm theo mã lịch, khách hàng, SĐT, biển số…"/>
      <div className="inline-flex items-center gap-1 rounded-control border border-cs-border bg-cs-surface p-1" role="group" aria-label="Chọn tuần">
        <IconButton icon="chevron-left" size="sm" label="Tuần trước" onClick={() => shiftWeek(-1)}/>
        <span className="inline-flex items-center gap-2 px-2 text-small font-medium tabular-nums text-cs-text">
          <Icon name="calendar" size={15} className="text-cs-muted"/>{dmy(week.from)} – {dmy(week.to)}
        </span>
        <IconButton icon="chevron-right" size="sm" label="Tuần sau" onClick={() => shiftWeek(1)}/>
      </div>
      <Button size="sm" variant="ghost" onClick={() => { setAnchor(new Date()); resetPage(); }}>Tuần này</Button>
      <FilterSelect label="Loại yêu cầu" value={type} onChange={v => { setType(v); resetPage(); }} options={[
        { value: "all", label: "Tất cả" }, ...(Object.keys(REQUEST_TYPES) as RequestType[]).map(k => ({ value: k, label: REQUEST_TYPES[k].label })),
      ]}/>
      {filtersActive && <IconButton icon="refresh" label="Xoá bộ lọc" onClick={() => { setStatus("ALL"); setType("all"); setSearch(""); resetPage(); }}/>}
    </Toolbar>
    {checked.length > 0 && view === "list" && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-control border border-cs-border bg-cs-surface-2 px-3 py-2 text-small">
      <b>Đã chọn {checked.length} lịch</b>
      <span className="flex-1"/>
      <Button size="sm" variant="success" icon="check" loading={busy === "bulk"} loadingText="Đang xác nhận..." onClick={() => void confirmChecked()}>Xác nhận các lịch chờ</Button>
      <Button size="sm" icon="download" loading={exporting} onClick={() => void exportCsv()}>Xuất lịch đã chọn</Button>
      <Button size="sm" variant="ghost" onClick={() => setChecked([])}>Bỏ chọn</Button>
    </div>}
  </>;

  const listView = <DataTable caption="Danh sách lịch hẹn" columns={columns} rows={rows} rowKey={a => a.id}
    loading={list.loading} error={list.error || undefined} onRetry={list.reload}
    onRowClick={a => setSelectedId(a.id)} rowClassName={a => a.id === selectedId ? "bg-cs-soft/70" : ""}
    actions={a => <Dropdown label={`Thao tác lịch ${a.appointment_code}`} items={menu(a)}/>}
    footer={result && <Pagination page={result.pagination.current_page} totalPages={result.pagination.last_page} totalItems={result.pagination.total}
      pageSize={result.pagination.per_page} disabled={list.loading} onChange={p => { setPage(p); setChecked([]); }}/>}/>;

  const weekView = <WeekBoard days={week.days} rows={rows} loading={list.loading && !rows.length} selectedId={selectedId} onSelect={setSelectedId}/>;

  return <AdminPage demo={false} title="Lịch hẹn" description="Theo dõi và điều phối lịch hẹn của khách"
    actions={<>
      <Button variant="outline" icon="download" loading={exporting} loadingText="Đang xuất..." onClick={() => void exportCsv()}>Xuất Excel</Button>
      <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Tạo lịch hẹn</Button>
    </>}>
    {toolbar}
    <SplitView paneWidth={380} paneOpen={selectedId !== null} onClose={() => setSelectedId(null)} paneTitle="Chi tiết lịch hẹn"
      pane={pane} paneFooter={paneFooter} list={view === "list" ? listView : weekView}/>
    <CreateAppointmentModal open={creating} onClose={() => setCreating(false)} onCreated={a => {
      setCreating(false);
      setAnchor(new Date(`${a.appointment_date.slice(0, 10)}T00:00:00`));
      setStatus("ALL");
      resetPage();
      setSelectedId(a.id);
    }}/>
    <CancelAppointmentModal appointment={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); refresh(); }}/>
  </AdminPage>;
}

/** Lịch tuần: 7 cột Thứ hai → Chủ nhật, mỗi lịch là một thẻ theo giờ. */
function WeekBoard({ days, rows, loading, selectedId, onSelect }: {
  days: Date[]; rows: AppointmentRow[]; loading: boolean; selectedId: number | null; onSelect: (id: number) => void;
}) {
  if (loading) return <div className="rounded-card border border-cs-border bg-cs-surface shadow-card"><LoadingState/></div>;
  const today = new Date().toDateString();
  return <div className="overflow-x-auto rounded-card border border-cs-border bg-cs-surface shadow-card">
    <div className="grid min-w-[980px] grid-cols-7 divide-x divide-cs-border">
      {days.map(day => {
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const items = rows.filter(r => r.appointment_date.slice(0, 10) === key).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
        const isToday = day.toDateString() === today;
        return <section key={key} aria-label={`${WEEKDAY[day.getDay()]} ${day.getDate()}/${day.getMonth() + 1}`} className="flex min-h-[420px] flex-col">
          <header className={`flex items-baseline justify-between border-b border-cs-border px-3 py-2.5 ${isToday ? "bg-cs-soft" : "bg-cs-surface-2"}`}>
            <span className={`text-small font-semibold ${isToday ? "text-cs-accent-text" : "text-cs-text"}`}>{WEEKDAY[day.getDay()]} <span className="tabular-nums">{day.getDate()}/{day.getMonth() + 1}</span></span>
            <span className="text-caption text-cs-muted">{items.length} lịch</span>
          </header>
          <ul className="flex flex-1 flex-col gap-2 p-2">
            {items.map(a => {
              const tone = getStatus("appointment", a.status, "staff").tone;
              const dot = { warning: "bg-warning", info: "bg-info", success: "bg-success", danger: "bg-danger", neutral: "bg-cs-muted", accent: "bg-cs-accent" }[tone];
              return <li key={a.id}>
                <button type="button" onClick={() => onSelect(a.id)}
                  className={`w-full cursor-pointer rounded-control border p-2.5 text-left transition-colors ${a.id === selectedId ? "border-cs-accent bg-cs-soft" : "border-cs-border bg-cs-surface hover:border-cs-border-strong hover:bg-cs-hover"}`}>
                  <span className="flex items-center gap-1.5 text-caption font-semibold tabular-nums text-cs-text"><span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true"/>{timeRange(a)}</span>
                  <span className="mt-1 block truncate text-small font-semibold text-cs-text">{a.customer?.full_name ?? "—"}</span>
                  <span className="block truncate text-caption text-cs-muted">{a.vehicle?.license_plate ?? "—"} · {vehicleName(a)}</span>
                  <span className="sr-only">{getStatus("appointment", a.status, "staff").label}</span>
                </button>
              </li>;
            })}
            {!items.length && <li className="mt-6 text-center text-caption text-cs-muted">Không có lịch</li>}
          </ul>
        </section>;
      })}
    </div>
  </div>;
}

/** Nội dung ngăn chi tiết lịch hẹn. */
function AppointmentDetail({ a }: { a: AppointmentRow }) {
  const lines = [
    ...a.packages.map(p => ({ key: `p${p.id}`, name: p.name, note: "Gói bảo dưỡng", price: Number(p.pivot?.estimated_price ?? 0) })),
    ...a.services.map(s => ({ key: `s${s.id}`, name: s.name, note: s.estimated_minutes ? `${s.estimated_minutes} phút` : "", price: Number(s.pivot?.estimated_price ?? s.base_price) })),
  ];
  const total = a.estimated_total ?? lines.reduce((sum, l) => sum + l.price, 0);
  const row = (label: string, value: ReactNode) => <div className="flex gap-3 py-1"><dt className="w-28 shrink-0 text-cs-muted">{label}</dt><dd className="min-w-0 flex-1 text-cs-text">{value}</dd></div>;
  return <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-subheading font-bold text-cs-accent-text">{a.appointment_code}</span>
      <StatusBadge domain="appointment" status={a.status}/>
    </div>
    <PaneSection title="Thông tin khách hàng" icon="user">
      <ul className="flex flex-col gap-1.5 text-small">
        <li className="flex items-center gap-2"><Icon name="user" size={15} className="text-cs-muted"/><b>{a.customer?.full_name ?? "—"}</b></li>
        <li className="flex items-center gap-2"><Icon name="phone" size={15} className="text-cs-muted"/>{a.customer?.phone ? <a href={`tel:${a.customer.phone}`} className="tabular-nums text-cs-text hover:underline">{a.customer.phone}</a> : "—"}</li>
        <li className="flex items-center gap-2"><Icon name="mail" size={15} className="text-cs-muted"/><span className="truncate">{a.customer?.email ?? "Chưa có email"}</span></li>
      </ul>
    </PaneSection>
    <PaneSection title="Thông tin xe" icon="car">
      <div className="flex items-start gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-control bg-cs-surface-2 text-cs-muted"><Icon name="car" size={28}/></span>
        <dl className="min-w-0 flex-1 text-small">
          <p className="mb-1 font-semibold text-cs-text">{vehicleName(a)}{a.vehicle?.variant ? ` ${a.vehicle.variant}` : ""}</p>
          {row("Biển số", <b className="tabular-nums">{a.vehicle?.license_plate ?? "—"}</b>)}
          {row("Năm sản xuất", a.vehicle?.year ?? "—")}
          {row("Số km hiện tại", a.vehicle?.mileage != null ? `${new Intl.NumberFormat("vi-VN").format(a.vehicle.mileage)} km` : "—")}
        </dl>
      </div>
    </PaneSection>
    <PaneSection title="Thông tin lịch hẹn" icon="calendar">
      <dl className="text-small">
        {row("Ngày giờ hẹn", <span className="tabular-nums">{dmy(a.appointment_date)}, {timeRange(a)}</span>)}
        {row("Loại yêu cầu", REQUEST_TYPES[a.request_type]?.label ?? a.request_type)}
        {row("Trạng thái", <StatusBadge domain="appointment" status={a.status}/>)}
        {a.handled_by && row("Người xử lý", a.handled_by.employee?.full_name ?? a.handled_by.email ?? "—")}
        {a.status === "CANCELLED" && a.cancel_reason && row("Lý do huỷ", a.cancel_reason)}
      </dl>
    </PaneSection>
    <PaneSection title="Mô tả triệu chứng / yêu cầu" icon="file">
      <p className="whitespace-pre-wrap rounded-control bg-cs-surface-2 px-3 py-2.5 text-small text-cs-text-2">{a.symptom_description || a.note || "Khách không ghi mô tả."}</p>
    </PaneSection>
    <PaneSection title="Danh sách dịch vụ (dự kiến)" icon="wrench">
      {lines.length ? <div className="overflow-hidden rounded-control border border-cs-border">
        <table className="w-full text-small">
          <thead><tr className="bg-cs-surface-2 text-left text-caption text-cs-muted"><th className="px-3 py-2 font-semibold">Dịch vụ</th><th className="px-3 py-2 text-right font-semibold">Đơn giá</th></tr></thead>
          <tbody>
            {lines.map(l => <tr key={l.key} className="border-t border-cs-border">
              <td className="px-3 py-2 text-cs-text">{l.name}{l.note && <span className="block text-caption text-cs-muted">{l.note}</span>}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(l.price)}</td>
            </tr>)}
          </tbody>
          <tfoot><tr className="border-t border-cs-border bg-cs-soft">
            <td className="px-3 py-2.5 font-semibold text-cs-accent-text">Tổng dự kiến</td>
            <td className="px-3 py-2.5 text-right text-subheading font-bold tabular-nums text-cs-accent-text">{money(total)}</td>
          </tr></tfoot>
        </table>
      </div> : <p className="text-small text-cs-muted">Khách chưa chọn dịch vụ — cố vấn sẽ tư vấn khi tiếp nhận.</p>}
    </PaneSection>
  </>;
}
