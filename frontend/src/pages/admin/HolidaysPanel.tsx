import { useMemo, useState } from "react";
import { Button, Field, IconButton, Input, Modal } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { DemoTag, Panel } from "./kit/AdminKit";

type Holiday = { id: number; from: string; to: string; reason: string };
const initialHolidays: Holiday[] = [
  { id: 1, from: "2027-01-01", to: "2027-01-01", reason: "Tết Dương lịch" },
  { id: 2, from: "2027-02-16", to: "2027-02-20", reason: "Tết Nguyên Đán" },
];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const fmt = (iso: string) => iso.split("-").reverse().join("/");
const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/**
 * Ngày nghỉ lễ + xem trước khung giờ khách thấy.
 * Ngày nghỉ là DEMO (bảng holidays chưa có API); khung giờ tính từ giờ mở/đóng thật của ngày làm việc đầu tiên.
 */
export function HolidaysPanel({ open = "07:30", close = "17:30" }: { open?: string; close?: string }) {
  const [holidays, setHolidays] = useState(initialHolidays);
  const [month, setMonth] = useState(new Date(2027, 1, 1));
  const [form, setForm] = useState<Holiday | null>(null);

  const offDays = useMemo(() => new Set(holidays.flatMap(h => {
    const days: string[] = [];
    for (let d = new Date(h.from); d <= new Date(h.to); d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
    return days;
  })), [holidays]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)] as Array<number | null>;
  }, [month]);
  const iso = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const slots = useMemo(() => {
    const list: string[] = [];
    for (let m = Math.ceil(toMinutes(open) / 30) * 30; m + 30 <= toMinutes(close); m += 30) {
      if (m >= 12 * 60 && m < 13 * 60) continue; // nghỉ trưa
      list.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return list;
  }, [open, close]);

  const save = () => {
    if (!form || !form.reason.trim() || !form.from) return;
    const item = { ...form, to: form.to && form.to >= form.from ? form.to : form.from };
    setHolidays(list => (form.id ? list.map(h => h.id === form.id ? item : h) : [...list, { ...item, id: Date.now() }]).sort((a, b) => a.from.localeCompare(b.from)));
    setForm(null);
  };

  return <div className="mt-6 grid gap-5 xl:grid-cols-2">
    <Panel title={<span className="flex items-center gap-2">Ngày nghỉ lễ <DemoTag/></span>} icon="calendar" subtitle="Ngày nghỉ, lễ sẽ không nhận lịch hẹn."
      action={<Button size="sm" variant="outline" icon="plus" onClick={() => setForm({ id: 0, from: "", to: "", reason: "" })}>Thêm ngày nghỉ</Button>}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-control border border-cs-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <IconButton icon="chevron-left" label="Tháng trước" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}/>
            <b className="text-small">Tháng {String(month.getMonth() + 1).padStart(2, "0")}/{month.getFullYear()}</b>
            <IconButton icon="chevron-right" label="Tháng sau" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}/>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-caption">
            {WEEKDAYS.map(d => <span key={d} className="py-1 font-semibold text-cs-muted">{d}</span>)}
            {cells.map((day, i) => day === null ? <span key={`e${i}`}/> : <span key={day}
              className={`grid h-8 place-items-center rounded-md tabular-nums ${offDays.has(iso(day)) ? "bg-cs-soft font-bold text-cs-accent-text" : "text-cs-text"}`}>{day}</span>)}
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {holidays.map(h => <li key={h.id} className="flex items-center gap-3 rounded-control border border-cs-border p-3">
            <Icon name="calendar" size={18} className="shrink-0 text-cs-muted"/>
            <span className="min-w-0 flex-1 text-small"><b className="block tabular-nums text-cs-text">{h.from === h.to ? fmt(h.from) : `${fmt(h.from)} – ${fmt(h.to)}`}</b><span className="text-cs-muted">{h.reason}</span></span>
            <IconButton icon="edit" label={`Sửa ${h.reason}`} size="sm" onClick={() => setForm(h)}/>
            <IconButton icon="trash" label={`Xoá ${h.reason}`} size="sm" tone="danger" onClick={() => setHolidays(list => list.filter(x => x.id !== h.id))}/>
          </li>)}
          {!holidays.length && <li className="text-small text-cs-muted">Chưa có ngày nghỉ.</li>}
        </ul>
      </div>
    </Panel>
    <Panel title="Xem trước khung giờ khách thấy" icon="clock" subtitle={`Ngày làm việc ${open}–${close}, bước 30 phút, nghỉ trưa 12:00–13:00.`}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map(s => <li key={s} className="rounded-full border border-cs-border py-2 text-center text-small font-medium tabular-nums text-cs-text">{s}</li>)}
      </ul>
    </Panel>

    <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa ngày nghỉ" : "Thêm ngày nghỉ"} size="sm"
      footer={<><Button onClick={() => setForm(null)}>Huỷ</Button><Button variant="primary" onClick={save} disabled={!form?.from || !form?.reason.trim()}>Lưu</Button></>}>
      {form && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Từ ngày" required><Input type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}/></Field>
        <Field label="Đến ngày" optional><Input type="date" value={form.to} min={form.from} onChange={e => setForm({ ...form, to: e.target.value })}/></Field>
        <Field label="Lý do" required className="sm:col-span-2"><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Tết Nguyên Đán"/></Field>
      </div>}
    </Modal>
  </div>;
}
