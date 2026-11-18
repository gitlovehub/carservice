import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { workflowApi, type WorkflowOrder } from "../../services/workflowService";
import { QUALITY_ITEMS } from "./repairOrderFlow";
import { fullDayTime } from "./advisorListFormat";
import { Notice, Req } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Kiểm tra sau sửa chữa (PO 17/11/2026: bắt buộc trước bàn giao). Cố vấn tick đủ mọi hạng mục rồi lưu;
 * đã lưu thì hiện người kiểm + thời điểm, còn ở trạng thái "đã sửa xong" thì được kiểm tra lại.
 * Đây là kiểm tra của gara — xác nhận nhận xe vẫn do chủ xe làm qua biên bản trả xe.
 */
export function QualityCheckPanel({ order, onChanged, bare = false }: { order: WorkflowOrder; onChanged: (message: string) => Promise<void> | void; bare?: boolean }) {
  const saved = !!order.quality_checked_at;
  const editable = order.status === "COMPLETED";
  const [editing, setEditing] = useState(!saved && editable);
  const [checked, setChecked] = useState<string[]>(() => saved ? QUALITY_ITEMS.map(i => i.code) : []);
  const [note, setNote] = useState(order.quality_check?.note ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  if (!["COMPLETED", "HANDED_OVER"].includes(order.status)) return null;
  const legacy = !saved && !editable;

  const all = checked.length === QUALITY_ITEMS.length;
  const toggle = (code: string) => setChecked(list => list.includes(code) ? list.filter(c => c !== code) : [...list, code]);

  async function save() {
    if (!all) { setError("Tick đủ các hạng mục đã kiểm tra."); return; }
    setWorking(true); setError("");
    try { await workflowApi.qualityCheck(order.id, checked, note.trim() || undefined); setEditing(false); await onChanged("Đã lưu kết quả kiểm tra sau sửa chữa."); }
    catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <section className={bare ? "" : "rounded-2xl border border-cs-border bg-cs-surface p-5"} data-testid="quality-check">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="adv-section-title">Checklist kiểm tra sau sửa chữa{editing && <Req/>}</h3>
      {saved && !editing && <span className="inline-flex items-center gap-1 text-caption font-semibold text-success-fg"><Icon name="check" size={14}/>Đã kiểm tra</span>}
    </div>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
    {!legacy && <ul className="mt-3 divide-y divide-cs-border">{QUALITY_ITEMS.map(item => {
      const on = editing ? checked.includes(item.code) : saved;
      return <li key={item.code}>
        <label className={`flex items-center gap-3 py-2.5 text-small ${editing ? "cursor-pointer" : ""}`}>
          <input type="checkbox" className="adv-check" checked={on} disabled={!editing || working} onChange={() => toggle(item.code)}/>
          <span className={on ? "text-cs-text" : "text-cs-text-2"}>{item.label}</span>
        </label>
      </li>;
    })}</ul>}
    {editing ? <div className="mt-3 space-y-3">
      <label className="block text-caption font-semibold text-cs-muted">Ghi chú (tuỳ chọn)
        <textarea className="mt-1 w-full rounded-control border border-cs-border bg-cs-surface px-3 py-2 text-small text-cs-text" rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: đã chạy thử 3 km, phanh ổn định"/>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" icon="check" loading={working} disabled={!all} onClick={() => void save()}>Lưu kết quả kiểm tra</Button>
        {saved && <Button variant="ghost" disabled={working} onClick={() => setEditing(false)}>Huỷ</Button>}
        {!all && <span className="text-caption text-cs-muted">Còn {QUALITY_ITEMS.length - checked.length} hạng mục chưa tick.</span>}
      </div>
    </div> : saved ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-cs-text-2">
      <span>{order.quality_inspector?.employee?.full_name || order.quality_inspector?.email || "Cố vấn"} · {fullDayTime(order.quality_checked_at)}{order.quality_check?.note ? ` · ${order.quality_check.note}` : ""}</span>
      {editable && <Button size="sm" variant="ghost" icon="edit" onClick={() => { setChecked([]); setEditing(true); }}>Kiểm tra lại</Button>}
    </div> : <p className="mt-2 text-caption text-cs-muted">Xe bàn giao trước khi có bước kiểm tra này (17/11/2026).</p>}
  </section>;
}
