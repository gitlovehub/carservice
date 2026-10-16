
import { Navigate, useLocation } from "react-router-dom";
import { getUserRole, getRoleManagementPage } from "./auth";
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

  if (isLoggedIn !== "true" || !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(role)) {
    const managementPage = getRoleManagementPage(role);

    return (
      <Navigate
        to={managementPage?.path || "/login"}
        replace
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
