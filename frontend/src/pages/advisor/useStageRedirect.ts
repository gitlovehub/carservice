import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { workflowApi, type WorkflowOrder } from "../../services/workflowService";
import { stageRedirect } from "./repairOrderFlow";

/**
 * Dùng ở khung xem nhanh của các trang danh sách (Báo giá, Tiến độ, Kiểm tra & bàn giao, Thanh toán, Tiếp nhận):
 * sau một thao tác, tải lại phiếu; nếu phiếu đã sang bước có trang khác thì tự chuyển tới trang đó.
 * Trả về true khi đã chuyển trang (nơi gọi không cần làm mới khung hiện tại nữa).
 */
export function useStageRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(async (before: WorkflowOrder | null | undefined, orderId?: number) => {
    const id = orderId ?? before?.id;
    if (!id) return false;
    try {
      const after = await workflowApi.order(id);
      const target = stageRedirect(before, after, pathname);
      if (target) { navigate(target); return true; }
    } catch { /* Không tải được phiếu thì ở lại trang hiện tại. */ }
    return false;
  }, [navigate, pathname]);
}
