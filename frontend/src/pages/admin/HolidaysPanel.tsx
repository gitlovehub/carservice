import { ToastError } from "../../components/ui/ToastError";
import { useMemo, useState } from "react";
import { Button, DateInput, ErrorState, Field, IconButton, Input, LoadingState, Modal, confirmDelete } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, type HolidayRange } from "../../services/adminApi";
import { BookingSlotsPanel } from "./BookingSlotsPanel";
import { ReschedulePolicyPanel } from "./ReschedulePolicyPanel";
import { Panel } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";

type Form = { replaceIds: number[]; from: string; to: string; reason: string };
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const fmt = (iso: string) => iso.split("-").reverse().join("/");
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Ngày nghỉ lễ (API thật /api/admin/holidays — đặt lịch tự chặn các ngày này)
 * + khung giờ đặt lịch sáng / chiều (BookingSlotsPanel). `open`/`close`: giờ mở cửa sớm nhất / đóng cửa muộn nhất.
 */
export function HolidaysPanel({ open = "07:30", close = "17:30" }: { open?: string; close?: string }) {
  const { notify, confirm } = useAppFeedback();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fieldErrors = useFieldErrors();
  const query = useAdminQuery("holidays", signal => adminApi.holidays(signal));
  const holidays = useMemo(() => query.data ?? query.stale ?? [], [query.data, query.stale]);
  const today = isoDay(new Date());
  const upcoming = holidays.filter(h => h.to >= today);
  const past = holidays.filter(h => h.to < today).slice(-3);

  const offDays = useMemo(() => new Map(holidays.flatMap(h => {
    const days: Array<[string, string]> = [];
    for (let d = new Date(`${h.from}T00:00:00`); isoDay(d) <= h.to; d.setDate(d.getDate() + 1)) days.push([isoDay(d), h.reason ?? "Ngày nghỉ"]);
    return days;
  })), [holidays]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)] as Array<number | null>;
  }, [month]);
  const iso = (day: number) => isoDay(new Date(month.getFullYear(), month.getMonth(), day));

  const save = async () => {
    if (!form) return;
    const problems: FieldErrors = {};
    if (!form.from) problems.from = "Chọn ngày bắt đầu nghỉ.";
    if (form.from && form.to && form.to < form.from) problems.to = "Đến ngày phải từ ngày bắt đầu trở đi.";
    if (!form.reason.trim()) problems.reason = "Nhập lý do nghỉ.";
    setFormError("");
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    try {
      const response = await adminApi.saveHoliday({ from: form.from, to: form.to || null, reason: form.reason.trim(), replace_ids: form.replaceIds.length ? form.replaceIds : undefined });
      notify(response.affected_appointments
        ? `${response.message} Có ${response.affected_appointments} lịch hẹn rơi vào ngày nghỉ — hãy liên hệ khách để đổi lịch.`
        : response.message, response.affected_appointments ? "info" : "success");
      setForm(null);
      query.reload();
    } catch (error) {
      fieldErrors.showApi(error, { from: "from", to: "to", reason: "reason" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (h: HolidayRange) => {
    if (!await confirm(confirmDelete(`ngày nghỉ “${h.reason ?? fmt(h.from)}”`, "Khách sẽ đặt lịch được vào các ngày này."))) return;
    try {
      notify((await adminApi.deleteHoliday(h.ids)).message, "success");
      query.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };
  const item = (h: HolidayRange) => <li key={h.ids[0]} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
    <Icon name="calendar" size={18} className="shrink-0 text-cs-muted"/>
    <span className="min-w-0 flex-1 text-small"><b className="block tabular-nums text-cs-text">{h.from === h.to ? fmt(h.from) : `${fmt(h.from)} – ${fmt(h.to)}`}</b><span className="text-cs-muted">{h.reason ?? "Ngày nghỉ"}{h.days > 1 ? ` · ${h.days} ngày` : ""}</span></span>
    <IconButton icon="edit" label={`Sửa ${h.reason ?? fmt(h.from)}`} size="sm" onClick={() => { setFormError(""); fieldErrors.reset(); setForm({ replaceIds: h.ids, from: h.from, to: h.to, reason: h.reason ?? "" }); }}/>
    <IconButton icon="trash" label={`Xoá ${h.reason ?? fmt(h.from)}`} size="sm" tone="danger" onClick={() => void remove(h)}/>
  </li>;

  // Ngày nghỉ 60%, cột phải 40% gồm khung giờ đặt lịch và giới hạn khách tự đổi lịch.
  return <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <Panel title="Ngày nghỉ lễ" icon="calendar" subtitle="Ngày nghỉ, lễ không nhận lịch hẹn."
      action={<Button size="sm" variant="outline" icon="plus" onClick={() => { setFormError(""); fieldErrors.reset(); setForm({ replaceIds: [], from: "", to: "", reason: "" }); }}>Thêm ngày nghỉ</Button>}>
      {!query.data && !query.stale ? (query.error ? <ErrorState compact description={query.error} onRetry={query.reload}/> : <LoadingState compact/>) :
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-control border border-cs-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <IconButton icon="chevron-left" label="Tháng trước" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}/>
              <b className="text-small">Tháng {String(month.getMonth() + 1).padStart(2, "0")}/{month.getFullYear()}</b>
              <IconButton icon="chevron-right" label="Tháng sau" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}/>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-caption">
              {WEEKDAYS.map(d => <span key={d} className="py-1 font-semibold text-cs-muted">{d}</span>)}
              {cells.map((day, i) => day === null ? <span key={`e${i}`}/> : <span key={day} title={offDays.get(iso(day))}
                className={`grid h-8 place-items-center rounded-md tabular-nums ${offDays.has(iso(day)) ? "bg-cs-soft font-bold text-cs-accent-text" : iso(day) === today ? "border border-cs-accent text-cs-text" : "text-cs-text"}`}>{day}</span>)}
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {upcoming.map(item)}
            {!upcoming.length && <li className="text-small text-cs-muted">Chưa có ngày nghỉ sắp tới.</li>}
            {past.length > 0 && <li className="pt-1 text-caption text-cs-muted">
              <b className="font-semibold">Đã qua</b>
              <ul className="mt-1 grid gap-1">
                {past.map(h => <li key={h.ids[0]} className="flex gap-2">
                  <span className="shrink-0 whitespace-nowrap tabular-nums">{h.from === h.to ? fmt(h.from) : `${fmt(h.from)} – ${fmt(h.to)}`}</span>
                  <span className="min-w-0 truncate" title={h.reason ?? "Ngày nghỉ"}>{h.reason ?? "Ngày nghỉ"}</span>
                </li>)}
              </ul>
            </li>}
          </ul>
        </div>}
    </Panel>
    <div className="grid min-w-0 gap-5">
      <BookingSlotsPanel open={open} close={close}/>
      <ReschedulePolicyPanel/>
    </div>

    <Modal open={!!form} onClose={() => setForm(null)} dismissible={!saving} title={form?.replaceIds.length ? "Sửa ngày nghỉ" : "Thêm ngày nghỉ"} size="sm"
      footer={<><Button disabled={saving} onClick={() => setForm(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void save()}>Lưu</Button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Từ ngày" required error={fieldErrors.errors.from}><DateInput value={form.from} onChange={e => { setForm({ ...form, from: e.target.value }); fieldErrors.clear("from", "to"); }}/></Field>
        <Field label="Đến ngày" optional error={fieldErrors.errors.to} hint="Tối đa 31 ngày"><DateInput value={form.to} min={form.from} onChange={e => { setForm({ ...form, to: e.target.value }); fieldErrors.clear("to"); }}/></Field>
        <Field label="Lý do" required error={fieldErrors.errors.reason} className="sm:col-span-2"><Input value={form.reason} maxLength={255} onChange={e => { setForm({ ...form, reason: e.target.value }); fieldErrors.clear("reason"); }} placeholder="Tết Nguyên Đán"/></Field>
        <ToastError message={formError}/>
      </div>}
    </Modal>
  </div>;
}
