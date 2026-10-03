import React from "react";

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="status-badge">
      <span />
      {children}
    </span>
  );
}
