import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../../components/ui";
import { useAuthSession } from "../../contexts/authSession";
import { readReturnLocation, resolveReturnPath } from "./auth";

/**
 * Trang chỉ dành cho khách CHƯA đăng nhập (Đăng nhập, Đăng ký, Quên mật khẩu).
 * Đã đăng nhập mà mở lại các trang này → chuyển đi theo cùng quy tắc với trang Đăng nhập (resolveReturnPath):
 * về trang đang đứng trước đó nếu hợp lệ, không thì về trang chính của vai trò.
 */
export default function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const session = useAuthSession();

  if (session.status === "checking") return <LoadingState/>;
  if (session.status !== "authenticated") return <>{children}</>;

  return <Navigate to={resolveReturnPath(session.account.role, readReturnLocation(location.state))} replace/>;
}
