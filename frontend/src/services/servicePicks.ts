import { useCallback, useState } from "react";

/**
 * Dịch vụ khách đang chọn ở trang chi tiết nhóm dịch vụ — lưu trong trình duyệt (7 ngày) để
 * rời trang rồi quay lại vẫn còn; bấm "Đặt lịch" thì mang sang /booking?services=…&symptom=…
 * (bước 2 của đặt lịch tick sẵn). Đặt lịch thành công → xóa.
 */
const KEY = "cs-service-picks";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ServicePicks = { ids: number[]; symptom: string };
const EMPTY: ServicePicks = { ids: [], symptom: "" };

export function readServicePicks(): ServicePicks {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null") as (ServicePicks & { savedAt: number }) | null;
    if (!saved || Date.now() - saved.savedAt > TTL_MS) return EMPTY;
    return { ids: Array.isArray(saved.ids) ? saved.ids.filter(Number.isInteger) : [], symptom: typeof saved.symptom === "string" ? saved.symptom : "" };
  } catch {
    return EMPTY;
  }
}

function writeServicePicks(picks: ServicePicks) {
  try {
    if (picks.ids.length === 0 && !picks.symptom) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ ...picks, savedAt: Date.now() }));
  } catch { /* storage bị chặn: vẫn chọn được, chỉ không nhớ */ }
}

/**
 * Trang đặt lịch là nơi chốt lựa chọn: ghi đè kho theo đúng các dịch vụ đang chọn ở đó — khách xóa dịch vụ
 * ở bước 2 thì trang Dịch vụ / trang chi tiết cũng bỏ tick, không "sống lại" ở lần sau.
 */
export function syncServicePicks(ids: number[]) {
  const current = readServicePicks();
  const same = current.ids.length === ids.length && ids.every(id => current.ids.includes(id));
  if (!same) writeServicePicks({ ...current, ids });
}

export function clearServicePicks() {
  try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}

/** Link đặt lịch mang theo dịch vụ đã chọn + mô tả tình trạng. */
export function bookingLinkFor(picks: ServicePicks): string {
  const params = new URLSearchParams();
  if (picks.ids.length) params.set("services", picks.ids.join(","));
  if (picks.symptom) params.set("symptom", picks.symptom);
  const query = params.toString();
  return query ? `/booking?${query}` : "/booking";
}

/** State dịch vụ đã chọn, tự lưu mỗi lần đổi. */
export function useServicePicks() {
  const [picks, setPicksState] = useState<ServicePicks>(readServicePicks);
  const setPicks = useCallback((update: (current: ServicePicks) => ServicePicks) => {
    setPicksState(current => {
      const next = update(current);
      writeServicePicks(next);
      return next;
    });
  }, []);
  return [picks, setPicks] as const;
}
