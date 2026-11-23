import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Field, Input, Modal, PasswordInput } from "../ui";
import { useFieldErrors } from "../ui/useFieldErrors";
import { fetchApi } from "../../services/api";

/** Khách tự đổi email: nhập mật khẩu + email mới, email chỉ đổi sau khi bấm nút xác thực gửi tới email mới. */
export default function ChangeEmailModal({ currentEmail, onClose, onSent }: { currentEmail: string; onClose: () => void; onSent: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const fieldErrors = useFieldErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = email.trim();
    const problems: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(next)) problems.email = "Nhập email mới hợp lệ.";
    else if (next.toLowerCase() === currentEmail.toLowerCase()) problems.email = "Email mới phải khác email hiện tại.";
    if (!password) problems.current_password = "Nhập mật khẩu hiện tại.";
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    try {
      const response = await fetchApi<{ message: string }>("/me/email-change", { method: "POST", body: JSON.stringify({ email: next, current_password: password }) });
      onSent(response.message);
    } catch (error) {
      fieldErrors.showApi(error, { email: "email", current_password: "current_password" });
      setSaving(false);
    }
  };

  return <Modal open onClose={onClose} dismissible={!saving} size="md" title="Đổi email đăng nhập"
    description="Email cũ vẫn dùng được cho đến khi bạn bấm nút xác thực trong email mới."
    footer={<>
      <Button disabled={saving} onClick={onClose}>Hủy</Button>
      <Button type="submit" form="change-email-form" variant="primary" icon="send" loading={saving} loadingText="Đang gửi...">Gửi email xác thực</Button>
    </>}>
    <form id="change-email-form" onSubmit={event => void submit(event)} noValidate className="flex flex-col gap-4">
      <Field label="Email hiện tại"><Input value={currentEmail} disabled/></Field>
      <Field label="Email mới" required error={fieldErrors.errors.email}><Input type="email" autoComplete="email" maxLength={150} value={email} onChange={e => { setEmail(e.target.value); fieldErrors.clear("email"); }}/></Field>
      <Field label="Mật khẩu hiện tại" required error={fieldErrors.errors.current_password}><PasswordInput autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); fieldErrors.clear("current_password"); }}/></Field>
      <p className="text-caption text-cs-muted">Không còn dùng được email cũ? <Link to="/contact?topic=lost-email" className="font-semibold text-cs-accent-text hover:underline">Gửi liên hệ để gara hỗ trợ</Link>.</p>
    </form>
  </Modal>;
}
