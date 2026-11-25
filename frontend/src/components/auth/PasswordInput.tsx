import { useState, type InputHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { authFieldClass } from "./authStyles";

/** Ô mật khẩu dùng chung cho các trang auth: nút con mắt để ẩn/hiện. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input {...props} type={visible ? "text" : "password"} className={`${authFieldClass} pr-12`}/>
    <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible}
      title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-cs-muted transition hover:bg-black/5 hover:text-[#cf2935] focus-visible:outline-2 focus-visible:outline-[#cf2935] dark:hover:bg-white/5">
      <Icon name={visible ? "eye-off" : "eye"} size={18}/>
    </button>
  </div>;
}

/**
 * Dòng chuyển trang cuối form, cùng một kiểu ở cả 3 trang: "Chưa có tài khoản? Đăng ký".
 * `state`: chuyển tiếp `location.state` (chứa trang cần quay về sau khi đăng nhập) qua lại giữa các trang auth.
 */
export function AuthSwitchLink({ text, to, label, state }: { text: string; to: string; label: string; state?: unknown }) {
  return <p className="mt-6 text-center text-sm text-cs-muted">
    {text} <Link to={to} state={state} className="font-extrabold text-[#cf2935] no-underline hover:underline">{label}</Link>
  </p>;
}
