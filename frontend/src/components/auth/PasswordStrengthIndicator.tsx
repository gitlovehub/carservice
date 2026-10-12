import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const requirements = useMemo(() => {
    return [
      {
        label: "Ít nhất 8 ký tự",
        met: password.length >= 8,
      },
      {
        label: "Chữ cái viết hoa (A-Z)",
        met: /[A-Z]/.test(password),
      },
      {
        label: "Chữ cái viết thường (a-z)",
        met: /[a-z]/.test(password),
      },
      {
        label: "Ít nhất 1 chữ số (0-9)",
        met: /[0-9]/.test(password),
      },
    ];
  }, [password]);

  if (!password) {
    return null;
  }

  const metCount = requirements.filter((r) => r.met).length;
  const strengthLevels = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Rất mạnh"];
  const strengthText = strengthLevels[metCount];

  const colorStyles = [
    "bg-slate-200",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ][metCount];

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
        <span
          className={`font-semibold ${
            metCount <= 1
              ? "text-red-500"
              : metCount <= 2
              ? "text-amber-500"
              : metCount === 3
              ? "text-blue-500"
              : "text-emerald-600"
          }`}
        >
          {strengthText}
        </span>
      </div>

      {/* Thanh tiến trình độ mạnh */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              metCount >= step ? colorStyles : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Danh sách tiêu chuẩn */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 transition-colors ${
              req.met ? "text-emerald-600 font-medium" : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                req.met
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {req.met ? "✓" : "•"}
            </span>
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordStrengthIndicator;
