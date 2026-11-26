import { useState } from "react";

/** Phân trang dữ liệu đã tải (demo). Tự quay về trang 1 khi bộ lọc làm danh sách ngắn lại. */
export function usePaged<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  return {
    page: current,
    setPage,
    totalPages,
    pageRows: rows.slice((current - 1) * pageSize, current * pageSize),
    pagination: { page: current, totalPages, onChange: setPage, totalItems: rows.length, pageSize },
  };
}
