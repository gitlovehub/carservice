import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, ErrorState, Field, Input, LoadingState, buttonClass } from "../../components/ui";
import { Icon } from "../../components/ui/Icon";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { fetchApi } from "../../services/api";
import { errorMessage, fmtDate } from "../../services/adminApi";
import { getUserInitials } from "../auth/auth";
import { AdminPage, Panel, Pill } from "./kit/AdminKit";

type Me = {
  id: number; email: string; role: string; status: string; avatar: string | null; created_at: string | null;
  employee: { id: number; full_name: string; phone: string | null } | null;
};
type Draft = { name: string; phone: string };
type Passwords = { current: string; next: string; confirm: string };
const emptyPasswords: Passwords = { current: "", next: "", confirm: "" };
const PHONE = /^0\d{9,10}$/;
const AVATAR_SIZE = 256;

/** Cắt giữa thành hình vuông + thu về 256×256 JPEG (data URL vài chục KB) trước khi lưu vào accounts.avatar. */
function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Trình duyệt không xử lý được ảnh.")); }
      ctx.fillStyle = "#fff"; // nền trắng cho ảnh PNG trong suốt
      ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
      ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh. Hãy chọn ảnh PNG, JPG hoặc WebP.")); };
    image.src = url;
  });
}

/**
 * Hồ sơ của bạn (Admin) — xem / sửa họ tên, số điện thoại (PATCH /me/profile) và đổi mật khẩu (POST /me/change-password).
 * Email là tên đăng nhập nên chỉ xem. Lưu xong phát "user-updated" để tên trên thanh trên cùng cập nhật ngay.
 */
export default function AdminProfile() {
  const { notify } = useAppFeedback();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null); // null = đang xem, có giá trị = đang sửa
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwords, setPasswords] = useState<Passwords>(emptyPasswords);
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchApi<{ account: Me }>("/me")
      .then(response => { if (active) { setMe(response.account); setLoadError(""); } })
      .catch(error => { if (active) setLoadError(errorMessage(error, "Không tải được hồ sơ.")); });
    return () => { active = false; };
  }, [reload]);

  const name = me?.employee?.full_name || me?.email || "";
  const startEdit = () => { setProfileError(""); setDraft({ name: me?.employee?.full_name ?? "", phone: me?.employee?.phone ?? "" }); };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) return setProfileError("Nhập họ và tên.");
    if (draft.phone.trim() && !PHONE.test(draft.phone.trim())) return setProfileError("Số điện thoại gồm 10–11 số, bắt đầu bằng 0.");
    setSaving(true); setProfileError("");
    try {
      const response = await fetchApi<{ account: Me }>("/me/profile", {
        method: "PATCH", body: JSON.stringify({ full_name: draft.name.trim(), phone: draft.phone.trim() || null }),
      });
      setMe(response.account);
      localStorage.setItem("user", JSON.stringify(response.account));
      window.dispatchEvent(new Event("user-updated"));
      setDraft(null);
      notify("Đã cập nhật hồ sơ của bạn.", "success");
    } catch (error) {
      setProfileError(errorMessage(error, "Không lưu được hồ sơ.")); // fetchApi đã đưa lỗi validate đầu tiên vào message
    } finally {
      setSaving(false);
    }
  };

  /** Lưu ảnh đại diện ngay (null = xoá, quay về chữ viết tắt). */
  const saveAvatar = async (avatar: string | null) => {
    setAvatarBusy(true);
    try {
      const response = await fetchApi<{ account: Me }>("/me/profile", { method: "PATCH", body: JSON.stringify({ avatar }) });
      setMe(response.account);
      localStorage.setItem("user", JSON.stringify(response.account));
      window.dispatchEvent(new Event("user-updated"));
      notify(avatar ? "Đã đổi ảnh đại diện." : "Đã xoá ảnh đại diện.", "success");
    } catch (error) {
      notify(errorMessage(error, "Không lưu được ảnh đại diện."), "error");
    } finally {
      setAvatarBusy(false);
    }
  };
  const pickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // chọn lại cùng file vẫn kích hoạt onChange
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return notify("Chọn ảnh PNG, JPG hoặc WebP.", "warning");
    if (file.size > 5 * 1024 * 1024) return notify("Ảnh tối đa 5 MB.", "warning");
    try {
      await saveAvatar(await resizeAvatar(file));
    } catch (error) {
      notify(errorMessage(error, "Không đọc được ảnh."), "error");
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    const { current, next, confirm } = passwords;
    if (!current || !next || !confirm) return setPasswordError("Nhập đủ mật khẩu hiện tại, mật khẩu mới và xác nhận.");
    if (next.length < 8 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/\d/.test(next)) return setPasswordError("Mật khẩu mới tối thiểu 8 ký tự, gồm chữ thường, chữ hoa và chữ số.");
    if (next !== confirm) return setPasswordError("Xác nhận mật khẩu mới không khớp.");
    setChanging(true); setPasswordError("");
    try {
      await fetchApi("/me/change-password", {
        method: "POST", body: JSON.stringify({ current_password: current, new_password: next, new_password_confirmation: confirm }),
      });
      setPasswords(emptyPasswords);
      notify("Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.", "success");
    } catch (error) {
      setPasswordError(errorMessage(error, "Không đổi được mật khẩu."));
    } finally {
      setChanging(false);
    }
  };

  if (!me) return <AdminPage title="Hồ sơ của bạn" description="Thông tin tài khoản quản trị của bạn" demo={false}>
    <div className="rounded-card border border-cs-border bg-cs-surface shadow-card">
      {loadError ? <ErrorState description={loadError} onRetry={() => setReload(n => n + 1)}/> : <LoadingState/>}
    </div>
  </AdminPage>;

  const setPw = (patch: Partial<Passwords>) => { setPasswords(p => ({ ...p, ...patch })); setPasswordError(""); };

  return <AdminPage title="Hồ sơ của bạn" description="Thông tin tài khoản quản trị của bạn" demo={false}>
    <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Thẻ tóm tắt */}
      <section className="flex flex-col items-center rounded-card border border-cs-border bg-cs-surface p-6 text-center shadow-card">
        <span className="relative">
          {me.avatar
            ? <img src={me.avatar} alt={`Ảnh đại diện của ${name}`} className="size-24 rounded-full border border-cs-border object-cover"/>
            : <span className="grid size-24 place-items-center rounded-full bg-cs-accent text-3xl font-bold text-cs-accent-contrast" aria-hidden="true">{getUserInitials(me)}</span>}
          {avatarBusy && <span role="status" aria-label="Đang lưu ảnh" className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <span className="size-6 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"/>
          </span>}
        </span>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <label className={buttonClass({ variant: "outline", size: "sm", className: avatarBusy ? "pointer-events-none opacity-60" : "cursor-pointer" })}>
            <Icon name="upload" size={15}/>{me.avatar ? "Đổi ảnh" : "Tải ảnh lên"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={avatarBusy} onChange={event => void pickAvatar(event)}/>
          </label>
          {me.avatar && <Button size="sm" variant="ghost" tone="danger" icon="trash" disabled={avatarBusy} onClick={() => void saveAvatar(null)}>Xoá ảnh</Button>}
        </div>
        <h2 className="mt-3 text-subheading font-semibold text-cs-text">{name}</h2>
        <p className="mt-0.5 break-all text-small text-cs-muted">{me.email}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Pill tone="brand" icon="key">Quản trị viên</Pill>
          <Pill tone={me.status === "ACTIVE" ? "success" : "neutral"}>{me.status === "ACTIVE" ? "Đang hoạt động" : me.status}</Pill>
        </div>
        <dl className="mt-5 w-full space-y-2 border-t border-cs-border pt-4 text-left text-small">
          <div className="flex justify-between gap-3"><dt className="text-cs-muted">Số điện thoại</dt><dd className="tabular-nums text-cs-text">{me.employee?.phone || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-cs-muted">Tham gia từ</dt><dd className="tabular-nums text-cs-text">{fmtDate(me.created_at)}</dd></div>
        </dl>
      </section>

      <div className="flex min-w-0 flex-col gap-5">
        {/* Thông tin cá nhân */}
        <Panel title="Thông tin cá nhân" icon="user"
          action={!draft && <Button size="sm" variant="outline" icon="edit" onClick={startEdit}>Sửa</Button>}>
          <form onSubmit={event => void saveProfile(event)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" required={!!draft}>
                <Input value={draft ? draft.name : me.employee?.full_name ?? ""} disabled={!draft || saving} maxLength={100}
                  onChange={e => { setDraft(d => d && { ...d, name: e.target.value }); setProfileError(""); }}/>
              </Field>
              <Field label="Số điện thoại" optional={!!draft}>
                <Input inputMode="tel" value={draft ? draft.phone : me.employee?.phone ?? ""} disabled={!draft || saving} maxLength={11} placeholder={draft ? "VD: 0901234567" : undefined}
                  onChange={e => { setDraft(d => d && { ...d, phone: e.target.value }); setProfileError(""); }}/>
              </Field>
              <Field label="Email đăng nhập" hint="Email dùng để đăng nhập nên không đổi tại đây." className="sm:col-span-2">
                <Input type="email" value={me.email} disabled/>
              </Field>
            </div>
            {profileError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg">{profileError}</p>}
            {draft && <div className="flex flex-wrap justify-end gap-2 border-t border-cs-border pt-4">
              <Button type="button" disabled={saving} onClick={() => { setDraft(null); setProfileError(""); }}>Huỷ</Button>
              <Button type="submit" variant="primary" icon="check" loading={saving} loadingText="Đang lưu...">Lưu thay đổi</Button>
            </div>}
          </form>
        </Panel>

        {/* Đổi mật khẩu */}
        <Panel title="Đổi mật khẩu" icon="lock">
          <form onSubmit={event => void changePassword(event)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Mật khẩu hiện tại" required>
                <Input type="password" autoComplete="current-password" value={passwords.current} disabled={changing} onChange={e => setPw({ current: e.target.value })}/>
              </Field>
              <Field label="Mật khẩu mới" required>
                <Input type="password" autoComplete="new-password" value={passwords.next} disabled={changing} onChange={e => setPw({ next: e.target.value })}/>
              </Field>
              <Field label="Nhập lại mật khẩu mới" required>
                <Input type="password" autoComplete="new-password" value={passwords.confirm} disabled={changing} onChange={e => setPw({ confirm: e.target.value })}/>
              </Field>
            </div>
            <p className="flex items-center gap-1.5 text-caption text-cs-muted"><Icon name="info" size={14}/>Tối thiểu 8 ký tự, gồm chữ thường, chữ hoa và chữ số; không trùng mật khẩu hiện tại.</p>
            {passwordError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg">{passwordError}</p>}
            <div className="flex justify-end border-t border-cs-border pt-4">
              <Button type="submit" variant="primary" icon="key" loading={changing} loadingText="Đang đổi..."
                disabled={!passwords.current || !passwords.next || !passwords.confirm}>Đổi mật khẩu</Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  </AdminPage>;
}
