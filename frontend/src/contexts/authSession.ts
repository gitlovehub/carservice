import { createContext, useContext } from "react";
import type { AuthUserInfo } from "../pages/auth/auth";

export type SessionState =
  | { status: "checking"; account: null }
  | { status: "guest"; account: null }
  | { status: "error"; account: null }
  | { status: "authenticated"; account: NonNullable<AuthUserInfo> };

/** Context phiên đăng nhập; giá trị do AuthProvider (AuthContext.tsx) cung cấp. */
export const AuthContext = createContext<SessionState | null>(null);

export function useAuthSession() {
  const session = useContext(AuthContext);
  if (!session) throw new Error("useAuthSession phải được dùng trong AuthProvider");
  return session;
}
