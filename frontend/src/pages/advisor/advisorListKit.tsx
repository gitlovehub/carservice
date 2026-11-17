import { Dropdown } from "../../components/ui/Dropdown";
import { Icon } from "../../components/ui/Icon";
import { RANGES, dmy, rangeDates, type Range, type TrackStep } from "./advisorListFormat";

/**
 * Component dùng chung của các trang danh sách + xem nhanh khu cố vấn (Phiếu sửa chữa, Báo giá & phê duyệt).
 * Hàm định dạng nằm ở `advisorListFormat.ts`.
 */

/** Nút chọn khoảng ngày (menu preset). `anyLabel` = nhãn khi không lọc ngày. */
export function RangePicker({ value, onChange, label, anyLabel }: { value: Range; onChange: (range: Range) => void; label: string; anyLabel: string }) {
  const dates = rangeDates(value);
  const text = dates.from ? (dates.from === dates.to ? dmy(dates.from) : `${dmy(dates.from)} – ${dmy(dates.to!)}`) : anyLabel;
  return <div className="min-w-0 flex-1 [&>span]:w-full">
    <Dropdown label={label} align="start"
      items={RANGES.map(r => ({ label: r.id === "any" ? anyLabel : r.label, icon: r.id === value ? "check" : "calendar", onSelect: () => onChange(r.id) }))}
      trigger={props => <button type="button" {...props} className="adv-ro-range"><Icon name="calendar" size={18} className="text-cs-accent-text"/><span className="min-w-0 flex-1 truncate text-left tabular-nums">{text}</span><Icon name="chevron-down" size={16}/></button>}/>
  </div>;
}

/** Thanh tiến trình chấm + đường nối (`.adv-track`). Bước đang làm / dừng hiện nhãn dạng viên, bước xong hiện ngày giờ. */
export function Track({ steps, label }: { steps: TrackStep[]; label: string }) {
  return <ol className="adv-track" aria-label={label}>
    {steps.map(step => <li key={step.label} className="adv-track-step" data-state={step.state} aria-current={step.state === "active" ? "step" : undefined}>
      <span className="adv-track-dot" aria-hidden="true">{step.state === "done" ? <Icon name="check" size={14}/> : step.state === "closed" ? <Icon name="ban" size={13}/> : step.state === "rejected" ? <Icon name="x" size={14}/> : null}</span>
      <b>{step.label}</b>
      {step.note && (step.state === "done" || step.state === "todo"
        ? <small className="tabular-nums">{step.note}</small>
        : <span className="adv-track-pill" data-tone={step.state === "active" ? undefined : step.state === "rejected" ? "danger" : "neutral"}>{step.note}</span>)}
    </li>)}
  </ol>;
}
