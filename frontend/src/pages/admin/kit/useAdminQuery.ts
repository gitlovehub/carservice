import { useEffect, useState } from "react";
import { errorMessage } from "../../../services/adminApi";
import { LIVE_EVENT } from "../../../services/liveSync";

type State<T> = { key: string; data: T | null; error: string };
type CacheSlot = { id: string; owner: string };

/**
 * Cache trong bộ nhớ để quay lại trang đã xem không phải chờ vòng quay. Chỉ dùng làm `stale`: trang vẫn gọi API
 * lấy bản mới, còn `data` chỉ có sau khi server trả lời nên các thao tác dựa vào `data` không chạy trên số liệu cũ.
 * Tách theo phiên đăng nhập (đổi token là xoá sạch) và theo khu vực, vì admin và cố vấn có khoá trùng tên.
 */
const CACHE_LIMIT = 150;
const queryCache = new Map<string, unknown>();
let cacheOwner: string | null = null;

function cacheSlot(key: string): CacheSlot | null {
  const token = localStorage.getItem("token");
  if (token !== cacheOwner) {
    queryCache.clear();
    cacheOwner = token;