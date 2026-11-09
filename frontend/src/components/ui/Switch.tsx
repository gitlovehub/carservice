/**
 * Công tắc bật/tắt dùng chung (kiểu iOS): bật = xanh lá, tắt = xám; núm trắng trượt sang phải.
 * Luôn có nhãn (`label`) cho trình đọc màn hình. Dùng cho mọi chỗ bật/tắt trạng thái trong hệ thống.
 */
export function Switch({ checked, onChange, label, disabled, size = "md" }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-[22px] w-[38px]" : "h-[26px] w-[46px]";
  const knob = size === "sm" ? "size-[18px]" : "size-[22px]";
  const on = size === "sm" ? "translate-x-[18px]" : "translate-x-[22px]";
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`cs-switch relative inline-flex ${track} shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-[var(--cs-switch-on)]" : "bg-[var(--cs-switch-off)]"}`}>
    <span aria-hidden="true" className={`inline-block ${knob} rounded-full bg-[var(--cs-switch-knob)] shadow-[0_2px_4px_rgb(0_0_0/0.22)] transition-transform duration-200 ${checked ? on : "translate-x-0"}`}/>
  </button>;
}
