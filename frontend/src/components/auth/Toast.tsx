import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";
export const ToastType = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
} as const;

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "info",
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-[#FAF8F5] border-[#E5B869] text-[#20252B]",
  }[type];

  const icon = {
    success: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
        ✓
      </div>
    ),
    error: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs text-white">
        ✕
      </div>
    ),
    info: (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D6A85F] text-xs text-white">
        ℹ
      </div>
    ),
  }[type];

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm animate-bounce-in transition-all">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm ${bgStyles}`}
      >
        {icon}
        <div className="flex-1 text-xs font-medium leading-5">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-slate-700 font-bold text-sm"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;
