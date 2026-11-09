import { useMemo, useState } from "react";
import { Button, ErrorState, Field, IconButton, Input, LoadingState, Modal, confirmDelete } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, type HolidayRange } from "../../services/adminApi";
import { Panel } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

type Form = { replaceIds: number[]; from: string; to: string; reason: string };
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const fmt = (iso: string) => iso.split("-").reverse().join("/");
const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Ngày nghỉ lễ (API thật /api/admin/holidays — đặt lịch tự chặn các ngày này)
 * + xem trước khung giờ khách thấy theo giờ mở/đóng của ngày làm việc đầu tiên.
 */
export function HolidaysPanel({ open = "07:30", close = "17:30" }: { open?: string; close?: string }) {
  const { notify, confirm } = useAppFeedback();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
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

  const slots = useMemo(() => {
    const list: string[] = [];
    for (let m = Math.ceil(toMinutes(open) / 30) * 30; m + 30 <= toMinutes(close); m += 30) {
      if (m >= 12 * 60 && m < 13 * 60) continue; // nghỉ trưa
      list.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return list;
  }, [open, close]);

  const save = async () => {
    if (!form || !form.from || !form.reason.trim()) return setFormError("Chọn ngày và nhập lý do.");
    setSaving(true); setFormError("");
    try {
      const response = await adminApi.saveHoliday({ from: form.from, to: form.to || null, reason: form.reason.trim(), replace_ids: form.replaceIds.length ? form.replaceIds : undefined });
      notify(response.affected_appointments
        ? `${response.message} Có ${response.affected_appointments} lịch hẹn rơi vào ngày nghỉ — hãy liên hệ khách để đổi lịch.`
        : response.message, response.affected_appointments ? "info" : "success");
      setForm(null);
      query.reload();
    } catch (error) {
      setFormError(errorMessage(error, "Không lưu được ngày nghỉ."));
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
  const item = (h: HolidayRange) => <li key={h.ids[0]} className={`flex items-center gap-3 rounded-control border border-cs-border p-3 ${h.to < today ? "opacity-60" : ""}`}>
    <Icon name="calendar" size={18} className="shrink-0 text-cs-muted"/>
    <span className="min-w-0 flex-1 text-small"><b className="block tabular-nums text-cs-text">{h.from === h.to ? fmt(h.from) : `${fmt(h.from)} – ${fmt(h.to)}`}</b><span className="text-cs-muted">{h.reason ?? "Ngày nghỉ"}{h.days > 1 ? ` · ${h.days} ngày` : ""}</span></span>
    <IconButton icon="edit" label={`Sửa ${h.reason ?? fmt(h.from)}`} size="sm" onClick={() => { setFormError(""); setForm({ replaceIds: h.ids, from: h.from, to: h.to, reason: h.reason ?? "" }); }}/>
    <IconButton icon="trash" label={`Xoá ${h.reason ?? fmt(h.from)}`} size="sm" tone="danger" onClick={() => void remove(h)}/>
  </li>;

  return <div className="mt-6 grid gap-5 xl:grid-cols-2">
    <Panel title="Ngày nghỉ lễ" icon="calendar" subtitle="Ngày nghỉ, lễ không nhận lịch hẹn."
      action={<Button size="sm" variant="outline" icon="plus" onClick={() => { setFormError(""); setForm({ replaceIds: [], from: "", to: "", reason: "" }); }}>Thêm ngày nghỉ</Button>}>
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
            {past.length > 0 && <li className="pt-1 text-caption font-semibold text-cs-muted">Đã qua</li>}
            {past.map(item)}
          </ul>
        </div>}
    </Panel>
    <Panel title="Xem trước khung giờ khách thấy" icon="clock" subtitle={`Ngày làm việc ${open}–${close}, bước 30 phút, nghỉ trưa 12:00–13:00.`}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map(s => <li key={s} className="rounded-full border border-cs-border py-2 text-center text-small font-medium tabular-nums text-cs-text">{s}</li>)}
      </ul>
    </Panel>

    <Modal open={!!form} onClose={() => setForm(null)} dismissible={!saving} title={form?.replaceIds.length ? "Sửa ngày nghỉ" : "Thêm ngày nghỉ"} size="sm"
      footer={<><Button disabled={saving} onClick={() => setForm(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." onClick={() => void save()}>Lưu</Button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Từ ngày" required><Input type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}/></Field>
        <Field label="Đến ngày" optional hint="Tối đa 31 ngày"><Input type="date" value={form.to} min={form.from} onChange={e => setForm({ ...form, to: e.target.value })}/></Field>
        <Field label="Lý do" required className="sm:col-span-2"><Input value={form.reason} maxLength={255} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Tết Nguyên Đán"/></Field>
        {formError && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg sm:col-span-2">{formError}</p>}
      </div>}
    </Modal>
  </div>;
}
