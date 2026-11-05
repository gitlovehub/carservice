import type { PropsWithChildren } from "react";

/** Khung bề mặt chuẩn (nền, viền, bo góc, padding theo token). */
export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`cs-card rounded-card border border-cs-border bg-cs-surface p-card shadow-card ${className}`}>{children}</section>;
}
