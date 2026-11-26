import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Drawer, IconButton, PageHeader, RatingStars, Switch } from "../../../components/ui";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { initials, num, toneSoft, type Tone } from "./format";

/**
 * Bộ khung giao diện dùng chung cho khu Admin (theo bản thiết kế đã duyệt):
 * trang, thẻ số liệu, panel, tab, bộ lọc, avatar, thanh tiến độ, ngăn chi tiết.
 * Màu lấy từ token (styles/tokens.css) — không viết mã hex trong trang.
 */

const toneTint: Record<Tone, string> = {
  brand: "bg-[var(--cs-tint-brand)]",
  info: "bg-[var(--cs-tint-info)]",
  success: "bg-[var(--cs-tint-success)]",
  warning: "bg-[var(--cs-tint-warning)]",
  danger: "bg-[var(--cs-tint-brand)]",
  violet: "bg-[var(--cs-tint-violet)]",
  neutral: "bg-cs-surface",
};
const toneBar: Record<Tone, string> = {
  brand: "bg-cs-accent",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  violet: "bg-[var(--cs-violet)]",
  neutral: "bg-neutral",
};

/* ---------- Trang ---------- */
export function AdminPage({ title, description, actions, demo = false, children }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode;
  /** Trang đang chạy dữ liệu mẫu (chưa nối API). */
  demo?: boolean; children: ReactNode;
}) {
  // Khung + tiêu đề chung với mọi trang Admin (page-container, PageHeader) để lề và khoảng cách đều nhau.
  return <main className="page-container">
    <PageHeader title={demo ? <span className="inline-flex flex-wrap items-center gap-2.5">{title}<DemoTag/></span> : title}
      description={description} actions={actions}/>
    {children}
  </main>;
}

export function DemoTag() {
  return <span title="Trang đang hiển thị dữ liệu mẫu, sẽ thay bằng dữ liệu thật khi có API."