import { useState } from "react";

export type ReviewViewMode = "grid" | "list";

/** Chế độ Grid / List, nhớ theo từng trang. */
export function useReviewView(storageKey: string) {
  const [view, setView] = useState<ReviewViewMode>(() => { try { return localStorage.getItem(storageKey) === "list" ? "list" : "grid"; } catch { return "grid"; } });
  const change = (next: ReviewViewMode) => {
    setView(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Không nhớ được thì vẫn đổi trong phiên. */ }
  };
  return [view, change] as const;
}
