import { useMemo, useState } from "react";
import { Button, Drawer, SearchInput } from "../../components/ui";
import type { AppointmentFilterOptions } from "../../services/workflowService";

export type ItemSelection = { packageIds: number[]; serviceIds: number[] };

const toggle = (list: number[], id: number) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

function Check({ checked, onChange, label, tag, muted }: { checked: boolean; onChange: () => void; label: string; tag?: string | null; muted?: boolean }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2 text-small transition-colors hover:bg-cs-hover ${checked ? "bg-cs-soft" : ""}`}>
    <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--cs-accent)]" checked={checked} onChange={onChange}/>
    <span className="min-w-0 flex-1">
      <span className={`block ${muted ? "text-cs-muted" : "text-cs-text"}`}>{label}{muted && <span className="text-caption"> · ngừng</span>}</span>
      {tag && <span className="block text-caption text-cs-muted">{tag}</span>}
    </span>
  </label>;
}

/**
 * Sidebar phải lọc lịch theo gói bảo dưỡng / dịch vụ (chọn nhiều). Chọn xong bấm "Tìm kiếm" → áp dụng và đóng.
 * Đóng bằng × / nền tối thì bỏ thay đổi chưa áp dụng.
 */
export function AppointmentItemFilter({ open, onClose, options, value, onApply }: {
  open: boolean; onClose: () => void; options: AppointmentFilterOptions | null; value: ItemSelection; onApply: (value: ItemSelection) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [term, setTerm] = useState("");
  const [lastOpen, setLastOpen] = useState(open);
  // Mỗi lần mở: bắt đầu từ bộ lọc đang áp dụng.
  if (open !== lastOpen) { setLastOpen(open); if (open) { setDraft(value); setTerm(""); } }

  const q = fold(term.trim());
  const packages = useMemo(() => (options?.packages ?? []).filter(p => !q || fold(`${p.name} ${p.model ?? ""}`).includes(q)), [options, q]);
  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof options>["services"]>();
    for (const s of options?.services ?? []) {
      if (q && !fold(`${s.name} ${s.category ?? ""}`).includes(q)) continue;
      const key = s.category || "Khác";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [options, q]);
  const count = draft.packageIds.length + draft.serviceIds.length;

  return <Drawer open={open} onClose={onClose} title="Lọc theo gói & dịch vụ" description="Hiện lịch hẹn có bất kỳ mục nào được chọn."
    footer={<>
      <Button variant="secondary" disabled={!count} onClick={() => setDraft({ packageIds: [], serviceIds: [] })}>Bỏ chọn</Button>
      <Button variant="primary" icon="search" onClick={() => onApply(draft)}>Tìm kiếm{count ? ` (${count})` : ""}</Button>
    </>}>
    <SearchInput value={term} onChange={setTerm} placeholder="Tìm gói hoặc dịch vụ…" className="sm:max-w-none"/>
    {!options ? <p className="mt-6 text-center text-small text-cs-muted">Đang tải danh sách…</p> : <>
      <section className="mt-5">
        <p className="adv-section-title mb-2">Gói bảo dưỡng {draft.packageIds.length > 0 && <span className="text-caption font-normal text-cs-muted">· đã chọn {draft.packageIds.length}</span>}</p>
        {packages.length ? <div className="space-y-0.5">{packages.map(p => <Check key={p.id} label={p.name} tag={p.model ? `Riêng cho ${p.model}` : null} muted={!p.active}
          checked={draft.packageIds.includes(p.id)} onChange={() => setDraft(d => ({ ...d, packageIds: toggle(d.packageIds, p.id) }))}/>)}</div>
          : <p className="px-2.5 text-small text-cs-muted">Không có gói phù hợp.</p>}
      </section>
      <section className="mt-6">
        <p className="adv-section-title mb-2">Dịch vụ {draft.serviceIds.length > 0 && <span className="text-caption font-normal text-cs-muted">· đã chọn {draft.serviceIds.length}</span>}</p>
        {groups.length ? groups.map(([category, items]) => <div key={category} className="mb-3">
          <p className="px-2.5 pb-1 text-caption font-semibold uppercase tracking-wide text-cs-muted">{category}</p>
          <div className="space-y-0.5">{items.map(s => <Check key={s.id} label={s.name} muted={!s.active}
            checked={draft.serviceIds.includes(s.id)} onChange={() => setDraft(d => ({ ...d, serviceIds: toggle(d.serviceIds, s.id) }))}/>)}</div>
        </div>) : <p className="px-2.5 text-small text-cs-muted">Không có dịch vụ phù hợp.</p>}
      </section>
    </>}
  </Drawer>;
}
