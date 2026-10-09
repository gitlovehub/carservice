import { Navigate, useLocation } from "react-router-dom";
import { getUserRole } from "./auth";
import type { UserRole } from "./auth";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const role = getUserRole();
  const token = localStorage.getItem("token");

  if (isLoggedIn !== "true" || !role || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;