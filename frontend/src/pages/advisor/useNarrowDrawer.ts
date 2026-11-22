import { useCallback, useState } from "react";

/** Màn rộng: khung xem nhanh bên phải danh sách. Hẹp hơn: ngăn kéo trượt từ phải (PreviewDrawer). */
export const PREVIEW_WIDE = "(min-width: 1280px)";

/**
 * Trang danh sách + xem nhanh (Phiếu, Báo giá, Tiến độ, Bàn giao, Thanh toán, Khách hàng, Xe): bấm một dòng
 * → màn rộng chỉ chọn dòng (khung bên phải); màn hẹp mở ngăn kéo cùng nội dung xem nhanh (PO 20/11/2026).
 */
export function useNarrowDrawer() {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => { if (!window.matchMedia(PREVIEW_WIDE).matches) setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  return { open, show, close };
}
