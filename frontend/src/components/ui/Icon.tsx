import type { ReactNode } from "react";
import type { ShellNavItem } from "../../layouts/navigation";

export type IconName = ShellNavItem["icon"] | "sun" | "moon" | "menu" | "close" | "logout" | "arrow" | "plus"
  | "search" | "chevron-left" | "chevron-right" | "chevron-down" | "edit" | "trash" | "more" | "check"
  | "alert" | "info" | "eye" | "filter" | "user" | "refresh" | "sidebar" | "card" | "star" | "file";
type Props = { name: IconName; size?: number; className?: string };
const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  car: <><path d="M5 11 7 5h10l2 6M4 11h16v7H4zM7 18v2M17 18v2M7 14h2M15 14h2"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h6"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 9a3 3 0 0 1 0 6M18 17c2 0 3 1 3 3"/></>,
  wrench: <path d="M14 5a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 3-3-3z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
  box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 5 9-5M12 12v9"/></>,
  chart: <path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/>,
  shield: <><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  receipt: <><path d="M5 3h14v18l-4-2-3 2-3-2-4 2z"/><path d="M8 8h8M8 12h8"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></>,
  moon: <path d="M20 15.2A8.3 8.3 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="M5 5l14 14M19 5 5 19"/>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  "chevron-left": <path d="m15 5-7 7 7 7"/>,
  "chevron-right": <path d="m9 5 7 7-7 7"/>,
  "chevron-down": <path d="m5 9 7 7 7-7"/>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></>,
  more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  alert: <><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/></>,
  eye: <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.8"/></>,
  filter: <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></>,
};
export function Icon({ name, size = 18, className }: Props) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
