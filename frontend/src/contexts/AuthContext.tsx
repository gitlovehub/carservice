import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { fetchApi } from "../services/api";
import type { AuthUserInfo } from "../pages/auth/auth";
import { AuthContext, type SessionState } from "./authSession";

// Chỉ dữ liệu /api/me được xác nhận bởi Sanctum mới cấp quyền truy cập route.
// Hook đọc phiên: useAuthSession() trong contexts/authSession.ts.
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState>({ status: "checking", account: null });
  const [revision, setRevision] = useState(0);

  const invalidate = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    window.addEventListener("user-updated", invalidate);
    window.addEventListener("storage", invalidate);
    return () => {
      window.removeEventListener("user-updated", invalidate);
      window.removeEventListener("storage", invalidate);
    };
  }, [invalidate]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("token");
    if (!token || token === "session_authenticated") {
      // Không xóa hồ sơ hiển thị cũ ở đây, nhưng không sử dụng nó để phân quyền.
      queueMicrotask(() => { if (active) setSession({ status: "guest", account: null }); });
      return () => { active = false; };
    }
    queueMicrotask(() => { if (active) setSession({ status: "checking", account: null }); });
    void fetchApi("/me")
      .then((response: { account?: NonNullable<AuthUserInfo> }) => {
        if (!active) return;
        const account = response?.account;
        if (account?.role && account.status === "ACTIVE") {
          localStorage.setItem("user", JSON.stringify(account));
          localStorage.setItem("role", account.role);
          setSession({ status: "authenticated", account });
        } else {
          setSession({ status: "guest", account: null });
        }
      })
      .catch((error: { status?: number }) => {
        if (active) setSession({ status: error.status === 401 ? "guest" : "error", account: null });
      });
    return () => { active = false; };
  }, [revision]);

  const value = useMemo(() => session, [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
