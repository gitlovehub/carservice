import { useState } from "react";
import { Button, ErrorState, IconButton, Input, LoadingState, Modal } from "../../components/ui";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, type BookingSlots } from "../../services/adminApi";
import { Panel } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

type Period = keyof BookingSlots;
const PERIODS: Array<{ id: Period; label: string; icon: IconName; hint: string; min: string; max: string }> = [
  { id: "morning", label: "Buổi sáng", icon: "sun", hint: "Trước 12:00", min: "00:00", max: "11:59" },
  { id: "afternoon", label: "Buổi chiều", icon: "clock", hint: "Từ 12:00 trở đi", min: "12:00", max: "23:59" },
];
const MAX_PER_PERIOD = 12;

/** Kiểm tra một giờ mới cho buổi: đúng buổi, trong giờ mở cửa, không trùng. Trả về thông báo lỗi hoặc "". */
function checkSlot(period: Period, time: string, current: string[], open: string, close: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return "Chọn giờ hợp lệ.";
  if (period === "morning" && time >= "12:00") return "Khung giờ buổi sáng phải trước 12:00.";
  if (period === "afternoon" && time < "12:00") return "Khung giờ buổi chiều phải từ 12:00 trở đi.";
  if (time < open || time >= close) return `Ngoài giờ mở cửa (${open}–${close}).`;
  if (current.includes(time)) return `Đã có khung giờ ${time}.`;
  if (current.length >= MAX_PER_PERIOD) return `Mỗi buổi tối đa ${MAX_PER_PERIOD} khung giờ.`;
  return "";
}

/**
 * Khung giờ khách được chọn khi đặt lịch, chia sáng / chiều (API thật /api/booking-slots, admin sửa qua PUT /api/admin/booking-slots).
 * `open`/`close`: giờ mở cửa sớm nhất / đóng cửa muộn nhất để chặn khung giờ nằm ngoài giờ làm việc.
 */
export function BookingSlotsPanel({ open = "07:30", close = "17:30" }: { open?: string; close?: string }) {
  const { notify } = useAppFeedback();
  const query = useAdminQuery("booking-slots", signal => adminApi.bookingSlots(signal));
  const slots = query.data ?? query.stale;
  const [draft, setDraft] = useState<BookingSlots | null>(null);
  const [adding, setAdding] = useState<Record<Period, string>>({ morning: "", afternoon: "" });
  const [errors, setErrors] = useState<Partial<Record<Period | "form", string>>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!slots) return;
    setDraft({ morning: [...slots.morning], afternoon: [...slots.afternoon] });
    setAdding({ morning: "", afternoon: "" });
    setErrors({});
  };
  const add = (period: Period) => {
    if (!draft) return;
    const time = adding[period];
    const error = checkSlot(period, time, draft[period], open, close);
    setErrors(current => ({ ...current, [period]: error, form: "" }));
    if (error) return;
    setDraft({ ...draft, [period]: [...draft[period], time].sort() });
    setAdding(current => ({ ...current, [period]: "" }));
  };
  const remove = (period: Period, time: string) => {
    if (!draft) return;
    setDraft({ ...draft, [period]: draft[period].filter(t => t !== time) });
    setErrors(current => ({ ...current, [period]: "", form: "" }));
  };
  const save = async () => {
    if (!draft) return;
    if (!draft.morning.length && !draft.afternoon.length) return setErrors({ form: "Cần ít nhất một khung giờ đặt lịch." });
    setSaving(true);
    try {
      const response = await adminApi.saveBookingSlots(draft);
      notify(response.message, "success");
      setDraft(null);
      query.reload();
    } catch (error) {
      setErrors({ form: errorMessage(error, "Không lưu được khung giờ đặt lịch.") });
    } finally {
      setSaving(false);
    }
  };

  const outside = (time: string) => time < open || time >= close;
  const outsideCount = slots ? [...slots.morning, ...slots.afternoon].filter(outside).length : 0;
  const unchanged = !!draft && !!slots && draft.morning.join() === slots.morning.join() && draft.afternoon.join() === slots.afternoon.join();

  return <Panel title="Khung giờ đặt lịch" icon="clock" subtitle="Các giờ khách được chọn khi đặt lịch trên web, chia theo buổi."
    action={<Button size="sm" variant="outline" icon="edit" className="shrink-0 whitespace-nowrap" disabled={!slots} onClick={startEdit}>Chỉnh sửa khung giờ</Button>}>
    {!slots ? (query.error ? <ErrorState compact description={query.error} onRetry={query.reload}/> : <LoadingState compact/>) :
      <div className="grid gap-4">
        {PERIODS.map(p => <div key={p.id}>
          <p className="mb-2 flex items-center gap-2 text-small font-semibold text-cs-text">
            <Icon name={p.icon} size={16} className="text-cs-muted"/>{p.label}
            <span className="font-normal text-cs-muted">· {slots[p.id].length} khung giờ</span>
          </p>
          {slots[p.id].length ? <ul className="flex flex-wrap gap-2">
            {slots[p.id].map(t => <li key={t} title={outside(t) ? `Ngoài giờ mở cửa ${open}–${close}` : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-small font-medium tabular-nums ${outside(t) ? "border-warning/60 bg-warning-soft text-warning-fg line-through" : "border-cs-border text-cs-text"}`}>{t}</li>)}
          </ul> : <p className="text-small text-cs-muted">Không nhận lịch buổi này.</p>}
        </div>)}
        {outsideCount > 0 && <p role="alert" className="rounded-control bg-warning-soft p-3 text-caption text-warning-fg">
          {outsideCount} khung giờ (gạch ngang) nằm ngoài giờ mở cửa {open}–{close} nên khách không đặt được. Hãy chỉnh lại khung giờ.
        </p>}
        <p className="rounded-control bg-cs-surface-2 p-3 text-caption text-cs-text-2">
          Mỗi khung giờ nhận tối đa số lịch đã cấu hình cho từng ngày ở bảng trên. Ngày nghỉ và ngày lễ tự động không hiện khung giờ.
        </p>
      </div>}

    <Modal open={!!draft} onClose={() => setDraft(null)} dismissible={!saving} title="Chỉnh sửa khung giờ đặt lịch"
      description={`Giờ mở cửa ${open}–${close}. Thêm hoặc bỏ khung giờ cho từng buổi.`}
      footer={<><Button disabled={saving} onClick={() => setDraft(null)}>Huỷ</Button><Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." disabled={unchanged} onClick={() => void save()}>Lưu khung giờ</Button></>}>
      {draft && <div className="grid gap-5 sm:grid-cols-2">
        {PERIODS.map(p => <section key={p.id} className="rounded-control border border-cs-border p-4" aria-label={p.label}>
          <p className="flex items-center gap-2 text-small font-semibold text-cs-text"><Icon name={p.icon} size={16} className="text-cs-muted"/>{p.label}
            <span className="ml-auto text-caption font-normal text-cs-muted">{p.hint}</span></p>
          <ul className="mt-3 flex min-h-10 flex-wrap gap-2">
            {draft[p.id].map(t => <li key={t} title={outside(t) ? `Ngoài giờ mở cửa ${open}–${close} — hãy bỏ khung giờ này` : undefined}
              className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-3 pr-0.5 text-small font-medium tabular-nums ${outside(t) ? "border-warning/60 bg-warning-soft text-warning-fg" : "border-cs-border bg-cs-surface-2 text-cs-text"}`}>
              {t}<IconButton icon="close" size="sm" label={`Bỏ khung giờ ${t}`} className="!size-7 !rounded-full" onClick={() => remove(p.id, t)}/>
            </li>)}
            {!draft[p.id].length && <li className="py-1.5 text-small text-cs-muted">Chưa có khung giờ — buổi này không nhận lịch.</li>}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input type="time" step={300} min={p.min} max={p.max} value={adding[p.id]} aria-label={`Thêm giờ ${p.label.toLowerCase()}`}
              onChange={e => setAdding(current => ({ ...current, [p.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(p.id); } }}/>
            <Button variant="tonal" icon="plus" disabled={!adding[p.id]} onClick={() => add(p.id)}>Thêm</Button>
          </div>
          {errors[p.id] && <p role="alert" className="mt-2 text-caption text-danger-fg">{errors[p.id]}</p>}
        </section>)}
        {errors.form && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg sm:col-span-2">{errors.form}</p>}
      </div>}
    </Modal>
  </Panel>;
}
