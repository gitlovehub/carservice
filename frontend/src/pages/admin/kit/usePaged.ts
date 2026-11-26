import { useState } from "react";

/** Phân trang dữ liệu đã tải (demo). Tự quay về trang 1 khi bộ lọc làm danh sách ngắn lại. */
export function usePaged<T>(rows: T[], pageSize = 10) {