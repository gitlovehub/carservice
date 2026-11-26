import { useEffect, useState } from "react";

/** Giá trị trễ `delay` ms sau lần thay đổi cuối — dùng cho ô tìm kiếm gọi API. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {