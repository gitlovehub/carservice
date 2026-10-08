import { fetchApi } from "../../services/api";

export type UserRole =
  | "CUSTOMER"
  | "ADVISOR"
  | "TECHNICIAN"
  | "ADMIN";

export const getUserDisplayName = (user: any = null): string => {
  return (
    user?.full_name ||
    user?.customer?.full_name ||
    user?.employee?.full_name ||
    user?.name ||
    user?.email ||
    "Tên người dùng"
  );
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
};

export const logout = async () => {
  try {
    await fetchApi("/logout", { method: "POST" });
  } catch (e) {
    // Ignore error
  }
  localStorage.removeItem("role");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};