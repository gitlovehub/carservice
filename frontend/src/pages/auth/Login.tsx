import { ToastError } from "../../components/ui/ToastError";
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchApi } from "../../services/api";
import { readReturnLocation, resolveReturnPath, setUserRole } from "./auth";
import { LostEmailLink, VerifyEmailPrompt } from "../../components/auth/VerifyEmailPrompt";
import Toast, { type ToastType } from "../../components/auth/Toast";
import { GarageAuthLayout, GarageField } from "../../components/GaragePublic";
import { AuthSwitchLink, PasswordInput } from "../../components/auth/PasswordInput";
import { authFieldClass, authPrimaryClass } from "../../components/auth/authStyles";
import { markAuthSession } from "../../services/authPersistence";
import { focusFirstInvalid } from "../../components/ui/focusInvalid";
import { API_ERROR_MARK, splitApiErrors } from "../../components/ui/formValidation";

const REMEMBER_EMAIL_KEY = "carservice_remembered_email";

type ApiErrorDetails = {
  message?: string;
  errors?: Record<string, string[]>;
};


const getApiErrorDetails = (error: unknown): ApiErrorDetails => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return {};
  }

  const data = (error as { data: unknown }).data;

  if (typeof data !== "object" || data === null) {
    return {};
  }

  const message =
    "message" in data && typeof data.message === "string"
      ? data.message
      : undefined;

  const errors: Record<string, string[]> = {};

  if (
    "errors" in data &&
    typeof data.errors === "object" &&
    data.errors !== null
  ) {
    for (const [field, messages] of Object.entries(
      data.errors as Record<string, unknown>,
    )) {
      if (Array.isArray(messages)) {
        errors[field] = messages.filter(
          (value): value is string => typeof value === "string",
        );
      }
    }
  }

  return { message, errors };
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const linkedEmail = searchParams.get("email")?.trim() ?? "";
  // Về từ nút xác thực trong email: điền sẵn email và báo kết quả.
  const linkNotice = searchParams.has("verified") ? "Xác thực thành công. Nhập mật khẩu để đăng nhập."
    : searchParams.has("email_changed") ? "Đã đổi email. Vui lòng đăng nhập bằng email mới." : "";

  // Tài khoản đúng mật khẩu nhưng chưa bấm nút xác thực trong email.
  const [pendingEmail, setPendingEmail] = useState("");

  // "Ghi nhớ đăng nhập": có tích → giữ phiên khi đóng trình duyệt + nhớ email; không tích → đóng trình duyệt là đăng xuất
  // (xem services/authPersistence.ts). Không bao giờ lưu mật khẩu.
  const [rememberMe, setRememberMe] = useState(() =>
    typeof window !== "undefined" &&
    localStorage.getItem(REMEMBER_EMAIL_KEY) !== null,
  );

  const [form, setForm] = useState(() => ({
    email:
      linkedEmail ||
      (typeof window !== "undefined"
        ? localStorage.getItem(REMEMBER_EMAIL_KEY) || ""
        : ""),
    password: "",
  }));

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const goToDashboard = (role: string) => {
    const validRoles = [
      "CUSTOMER",
      "ADVISOR",
      "ADMIN",
    ];

    if (!validRoles.includes(role)) {
      setApiError("Tài khoản không có vai trò hợp lệ.");
      return;
    }

    // Về lại đúng trang đang đứng trước khi phải đăng nhập (quy tắc chung: resolveReturnPath).
    navigate(resolveReturnPath(role, readReturnLocation(location.state)), { replace: true });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
  };

  const validate = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const saveRememberedEmail = (email: string) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    markAuthSession(rememberMe);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetchApi("/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          device_name: "web",
        }),
      });

      if (response?.account?.role === "TECHNICIAN") {
        // Khu vực KTV đã bỏ: cố vấn ghi kết quả kiểm tra. Thu hồi token vừa cấp, không lưu phiên.
        if (response.token) {
          void fetchApi("/logout", { method: "POST", headers: { Authorization: `Bearer ${response.token}` } }).catch(() => undefined);
        }
        setApiError("Tài khoản kỹ thuật viên không có màn hình riêng. Kết quả kiểm tra do cố vấn ghi trên phiếu sửa chữa.");
        return;
      }

      if (response?.account?.role) {
        saveRememberedEmail(form.email.trim());

        localStorage.setItem(
          "token",
          response.token || "session_authenticated",
        );
        localStorage.setItem("user", JSON.stringify(response.account));
        setUserRole(response.account.role);

        showToast("Đăng nhập thành công! Đang chuyển hướng...", "success");

        setTimeout(() => {
          goToDashboard(response.account.role);
        }, 500);

        return;
      }

      setApiError("Không nhận được dữ liệu xác thực từ máy chủ.");
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      const backendMessage = details.message || "";
      const emailErrors = details.errors?.email || [];

      if ([backendMessage, ...emailErrors].some((message) => /chưa xác thực/i.test(message))) {
        setPendingEmail(form.email.trim());
        return;
      }

      const { fields, toast } = splitApiErrors(error, { email: "email", password: "password" }, "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.");
      // Sai thông tin đăng nhập: giữ email, đưa con trỏ về ô mật khẩu để nhập lại.
      const invalid = toast && /Email hoặc mật khẩu không đúng/i.test(toast) ? { password: API_ERROR_MARK } : fields;
      if (Object.keys(invalid).length) { setErrors({ email: "", password: "", ...invalid }); focusFirstInvalid(); }
      if (toast) setApiError(toast);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GarageAuthLayout
      title={pendingEmail ? "Xác thực email" : "Đăng nhập"}
      description={pendingEmail ? "Tài khoản của bạn chưa được kích hoạt." : "Vui lòng nhập địa chỉ email và mật khẩu của bạn:"}
    >
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ToastError message={apiError}/>
      {linkNotice && !pendingEmail && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{linkNotice}</p>}
      {!pendingEmail ? (
        <>
          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <GarageField htmlFor="login-email" label="Địa chỉ email" error={errors.email}>
              <input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" value={form.email} onChange={handleChange} aria-invalid={!!errors.email} className={authFieldClass} />
            </GarageField>
            <GarageField htmlFor="login-password" label="Mật khẩu" error={errors.password}>
              <PasswordInput id="login-password" name="password" autoFocus={!!linkedEmail} autoComplete="current-password" placeholder="Nhập mật khẩu" value={form.password} onChange={handleChange} aria-invalid={!!errors.password}/>
            </GarageField>
            <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs text-cs-muted">
              <label htmlFor="login-remember" className="inline-flex cursor-pointer items-center gap-2.5" title="Không tích: tự đăng xuất khi đóng trình duyệt (nên dùng trên máy dùng chung).">
                <input id="login-remember" type="checkbox" checked={rememberMe} onChange={e => { setRememberMe(e.target.checked); if (!e.target.checked) localStorage.removeItem(REMEMBER_EMAIL_KEY); }} className="size-4 cursor-pointer accent-[#cf2935]" />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" state={location.state} className="cursor-pointer font-bold hover:text-[#cf2935] hover:underline">Quên mật khẩu?</Link>
            </div>
            <button type="submit" disabled={isLoading} aria-busy={isLoading || undefined} className={authPrimaryClass}>{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </form>
          <p className="mt-3 text-center"><LostEmailLink/></p>
          <AuthSwitchLink text="Chưa có tài khoản?" to="/register" label="Đăng ký ngay" state={location.state}/>
        </>
      ) : <VerifyEmailPrompt email={pendingEmail} justSent={false} backLabel="Quay lại đăng nhập" onBack={() => { setPendingEmail(""); setApiError(""); }}/>}
    </GarageAuthLayout>
  );
}

export default Login;
