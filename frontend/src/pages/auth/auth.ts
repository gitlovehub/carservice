import { fetchApi } from "../../services/api";
import { clearAuthSessionMarker } from "../../services/authPersistence";

export type UserRole =
  | "CUSTOMER"
  | "ADVISOR"
  | "TECHNICIAN"
  | "ADMIN";

export const getRoleManagementPage = (
  role: unknown,
): { path: string; label: string } | null => {
  switch (role) {
    case "ADMIN":
      return { path: "/admin", label: "Quản trị hệ thống" };
    case "ADVISOR":
      return { path: "/advisor", label: "Quản lý cố vấn" };
    case "CUSTOMER":
      return { path: "/customer/appointments", label: "Lịch hẹn của tôi" };
    default:
      return null;
  }
};

export type AuthUserInfo = {
  id?: number | string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  avatar?: string | null;
  customer?: { full_name?: string | null } | null;
  employee?: { full_name?: string | null } | null;
} | null;

export const getUserDisplayName = (user: AuthUserInfo = null): string => {
  return (
    user?.full_name ||
    user?.customer?.full_name ||
    user?.employee?.full_name ||
    user?.name ||
    user?.email ||
    "Tên người dùng"
  );
};

export const getUserInitials = (user: AuthUserInfo = null): string => {
  const name = getUserDisplayName(user);
  if (!name || name === "Tên người dùng") {
    const role = user?.role;
    if (role === "ADMIN") return "AD";
    if (role === "ADVISOR") return "CV";
    if (role === "TECHNICIAN") return "KT";
    return "KH";
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/** Trang người dùng đang đứng khi bị chuyển sang Đăng nhập (react-router `location.state.from`). */
export type ReturnLocation = { pathname?: string; search?: string; hash?: string };

const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Đăng nhập xong thì về đâu — MỘT quy tắc dùng chung (Login, Register, GuestOnlyRoute):
 *  - Về đúng trang đang đứng trước khi phải đăng nhập (kể cả trang công khai, giữ ?query và #hash).
 *  - Trừ khi đó là trang auth, hoặc là khu của vai trò khác (/admin, /advisor), hoặc trang chỉ dành cho khách
 *    mà người đăng nhập là nhân viên → về trang chính của vai trò.
 */
export const resolveReturnPath = (role: unknown, from?: ReturnLocation | null): string | Required<ReturnLocation> => {
  const home = getRoleManagementPage(role)?.path ?? "/";
  const pathname = from?.pathname;
  if (!pathname || AUTH_PAGES.includes(pathname)) return home;

  const area = pathname === "/admin" || pathname.startsWith("/admin/") ? "ADMIN"
    : pathname === "/advisor" || pathname.startsWith("/advisor/") ? "ADVISOR" : null;
  if (area && area !== role) return home;
  if (role !== "CUSTOMER" && (pathname === "/booking" || pathname.startsWith("/customer/"))) return home;

  return { pathname, search: from?.search ?? "", hash: from?.hash ?? "" };
};

/** Đọc `from` từ state của trang hiện tại (an toàn khi state không đúng dạng). */
export const readReturnLocation = (state: unknown): ReturnLocation | null => {
  const from = (state as { from?: ReturnLocation } | null)?.from;
  return from && typeof from.pathname === "string" ? from : null;
};

export const getUserRole = (): UserRole | null => {
  const role = localStorage.getItem("role");

  if (
    role === "CUSTOMER" ||
    role === "ADVISOR" ||
    role === "TECHNICIAN" ||
    role === "ADMIN"
  ) {
    return role;
  }

  return null;
};

export const setUserRole = (role: UserRole) => {
  localStorage.setItem("role", role);
  localStorage.setItem("isLoggedIn", "true");
  window.dispatchEvent(new Event("user-updated"));
};


export const logout = async () => {
  try {
    if (localStorage.getItem("token")) {
      // Revoke bearer token while it is still present; then clear the session.
      await fetchApi("/logout", { method: "POST" });
    }
  } catch { /* Xóa phiên ở Frontend kể cả khi mất kết nối. */ }
  finally {
    clearAuthSessionMarker();
    localStorage.removeItem("role");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    window.location.assign("/login");
  }
};
