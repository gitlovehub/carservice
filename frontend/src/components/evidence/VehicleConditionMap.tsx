import type { HandoverChecklistItem } from "../../services/workflowService";

export type ExteriorPosition = "FRONT" | "REAR" | "LEFT" | "RIGHT";

const POSITIONS: { code: ExteriorPosition; title: string; placement: string }[] = [
  { code: "FRONT", title: "Đầu xe", placement: "left-1/2 top-[2%] -translate-x-1/2" },
  { code: "REAR", title: "Đuôi xe", placement: "bottom-[2%] left-1/2 -translate-x-1/2" },
  { code: "LEFT", title: "Bên trái", placement: "left-[2%] top-1/2 -translate-y-1/2" },
  { code: "RIGHT", title: "Bên phải", placement: "right-[2%] top-1/2 -translate-y-1/2" },
];

const FLAGS = new Set<HandoverChecklistItem["condition"]>(["SCRATCH", "DENT", "BROKEN", "MISSING"]);

/**
 * Sơ đồ định vị hiện trạng (nhìn từ trên xuống).
 * Chỉ chọn 4 vùng mà API check-in/ảnh đang hỗ trợ.
 * Dữ liệu tình trạng vẫn được lưu bằng checklist hiện có, không tạo bảng/endpoint mới.
 */
export function VehicleConditionMap({ value, onChange, items }: {
  value: ExteriorPosition;
  onChange: (next: ExteriorPosition) => void;
  items: HandoverChecklistItem[];
}) {
  const flagged = new Set(items.filter(i => i.category === "EXTERIOR" && FLAGS.has(i.condition)).map(i => i.position_code));
  return <div className="rounded-2xl border border-cs-border bg-cs-surface-2 p-4 sm:p-5" data-testid="vehicle-condition-map">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-bold text-cs-text">Sơ đồ vị trí trên xe</p>
        <p className="mt-1 text-xs text-cs-muted">Chọn một vùng để ghi hiện trạng và gắn ảnh bằng chứng.</p>
      </div>
      <div className="flex gap-3 text-[11px] text-cs-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cs-danger"/> Có hư hỏng</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cs-accent"/> Đang chọn</span>
      </div>
    </div>
    <div className="relative mx-auto h-[290px] max-w-[340px] rounded-2xl border border-cs-border bg-cs-surface">
      <svg viewBox="0 0 220 320" className="absolute inset-0 h-full w-full p-10" role="img" aria-label="Hình ô tô nhìn từ trên xuống, đầu xe ở phía trên">
        <rect x="40" y="39" width="22" height="54" rx="8" fill="#475569"/>
        <rect x="158" y="39" width="22" height="54" rx="8" fill="#475569"/>
        <rect x="40" y="229" width="22" height="54" rx="8" fill="#475569"/>
        <rect x="158" y="229" width="22" height="54" rx="8" fill="#475569"/>
        <path d="M80 10 Q110 0 140 10 Q155 16 158 43 L158 270 Q158 306 140 310 L80 310 Q62 306 62 270 L62 43 Q65 16 80 10Z" fill="#dbe4ed" stroke="#64748b" strokeWidth="3"/>
        <path d="M77 85 Q110 72 143 85 L148 127 L72 127Z" fill="#7893aa" stroke="#475569" strokeWidth="2"/>
        <path d="M73 193 L147 193 L144 239 Q110 251 76 239Z" fill="#7893aa" stroke="#475569" strokeWidth="2"/>
        <path d="M74 133 L146 133 L146 187 L74 187Z" fill="#aabed0" stroke="#64748b" strokeWidth="2"/>
        <path d="M74 133 L62 145 M146 133 L158 145 M74 187 L62 175 M146 187 L158 175" stroke="#64748b" strokeWidth="2"/>
        <path d="M83 20 H137 M83 296 H137" stroke="#64748b" strokeWidth="3" strokeLinecap="round"/>
        <path d="M69 85 L69 236 M151 85 L151 236" stroke="#ffffff" strokeOpacity=".55" strokeWidth="3"/>
      </svg>
      {POSITIONS.map(p => {
        const selected = value === p.code;
        const danger = flagged.has(p.code);
        return <button key={p.code} type="button" onClick={() => onChange(p.code)}
          aria-pressed={selected} aria-label={`Chọn ${p.title}${danger ? ", có hư hỏng được ghi nhận" : ""}`}
          className={`absolute ${p.placement} z-10 min-h-10 rounded-full border px-3 py-2 text-xs font-bold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cs-accent ${selected ? "border-cs-accent bg-cs-accent text-cs-accent-contrast shadow-md" : danger ? "border-cs-danger bg-cs-surface text-cs-danger" : "border-cs-border bg-cs-surface text-cs-text hover:border-cs-accent hover:text-cs-accent-text"}`}>
          {danger ? "● " : ""}{p.title}
        </button>;
      })}
    </div>
    <p className="mt-3 text-center text-xs text-cs-muted">Vị trí đang chọn: <strong className="text-cs-text">{POSITIONS.find(p => p.code === value)?.title}</strong></p>
  </div>;
}
