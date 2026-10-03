import React from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    car: <path d="m4 12 2-5h12l2 5M5 17H3v-5h18v5h-2M5 17h14M7 17v2M17 17v2M7 14h.01M17 14h.01" />,
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 5 5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 10h18" />
      </>
    ),
    file: <path d="M5 3h10l4 4v14H5zM15 3v5h4M8 13h8M8 17h6" />,
    wrench: <path d="M14 6a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 6-6l-3 3-3-3z" />,
    box: <path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4m-9 4v10" />,
    chart: <path d="M4 20V4m0 16h17M8 16l4-5 3 2 5-7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    edit: <path d="m5 19 3.5-.8L19 7.7 16.3 5 5.8 15.5zM14.5 6.8l2.7 2.7" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    filter: <path d="M4 7h16M7 12h10m-7 5h4" />,
    check: <path d="m4 12 5 5L20 6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.file}
    </svg>
  );
}

export function getIconForTitle(title: string): string {
  if (title.includes("xe") || title.includes("Xe")) return "car";
  if (title.includes("hẹn") || title.includes("lịch")) return "calendar";
  if (title.includes("hàng") || title.includes("kho")) return title.includes("kho") ? "box" : "users";
  if (title.includes("thống kê")) return "chart";
  if (title.includes("sửa chữa") || title.includes("Kiểm tra") || title.includes("Chẩn đoán")) return "wrench";
  return "file";
}
