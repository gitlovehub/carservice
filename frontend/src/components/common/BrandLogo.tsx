import { Link } from "react-router-dom";

type BrandLogoProps = {
  to?: string;
  className?: string;
  subtitle?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

export default function BrandLogo({
  to = "/",
  className = "",
  subtitle = "Dịch vụ chăm sóc ô tô",
  theme = "light",
  size = "md",
}: BrandLogoProps) {
  const iconSizeClass =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
      ? "h-11 w-11 rounded-2xl"
      : "h-10 w-10 rounded-xl";

  const svgSizeClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  const titleClass =
    size === "sm"
      ? "text-xs font-bold tracking-tight"
      : size === "lg"
      ? "text-base font-bold tracking-tight"
      : "text-sm font-bold tracking-tight";

  const subtitleClass = size === "lg" ? "text-[11px]" : "text-[10px]";

  const isDark = theme === "dark";

  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 transition ${className}`}
    >
      <div
        className={`flex items-center justify-center shadow-sm transition ${iconSizeClass} ${
          isDark
            ? "bg-[#D6A85F] text-[#1F2933] group-hover:bg-[#c49852]"
            : "bg-slate-900 text-white group-hover:bg-slate-800"
        }`}
      >
        <svg
          className={`${svgSizeClass} ${
            isDark ? "text-slate-900" : "text-amber-500"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
          />
        </svg>
      </div>

      <div>
        <p className={`${titleClass} ${isDark ? "text-white" : "text-slate-900"}`}>
          CarService
        </p>
        {subtitle && (
          <p
            className={`${subtitleClass} ${
              isDark ? "text-[#AEB8C1]" : "text-slate-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
