import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { ShellContext, type ShellArea } from "../../layouts/ShellContext";

/**
 * Lớp phủ render qua portal ra <body> nên mất data-area của shell → mất màu nhấn theo vai trò.
 * Hook này trả về khu vực hiện tại để gắn lại data-area lên lớp phủ.
 */
export function useOverlayArea(): ShellArea {
  const shell = useContext(ShellContext);
  const { pathname } = useLocation();
  if (shell) return shell;
  return pathname.startsWith("/advisor") ? "advisor" : pathname.startsWith("/admin") ? "admin" : "customer";
}
