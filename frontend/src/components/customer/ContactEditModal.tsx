import { useState, type FormEvent } from "react";
import { Modal } from "../ui";
import { buttonClass } from "../ui/buttonClass";
import { useAppFeedback } from "../ui/feedbackContext";
import { apiFieldErrors } from "../ui/formValidation";
import { fetchApi } from "../../services/api";

export type ContactInfo = { name: string; phone: string; email: string };

const VIETNAM_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

/**
 * Sửa nhanh họ tên + số điện thoại của khách (PATCH /me/profile) — dùng chung cho
 * bước Xác nhận ở trang Đặt lịch và nút "Chỉnh sửa" ở trang Hồ sơ của tôi. Email đăng nhập chỉ xem.
 * `onSaved` nhận thông tin mới + tài khoản server trả về (đã ghi vào localStorage và phát sự kiện user-updated).
 */
export default function ContactEditModal({ contact, title = "Cập nhật thông tin liên hệ", description, onClose, onSaved }: {
  contact: ContactInfo;
  title?: string;
  description?: string;
  onClose: () => void;
  onSaved: (contact: ContactInfo, account: unknown) => void;
}) {
  const { notify } = useAppFeedback();
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [errs, setErrs] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim(), p = phone.trim();
    const next: typeof errs = {};
    if (n.length < 2) next.name = "Họ và tên phải có ít nhất 2 ký tự.";
    else if (n.length > 100) next.name = "Họ và tên không được vượt quá 100 ký tự.";
    if (!VIETNAM_PHONE_REGEX.test(p)) next.phone = "Số điện thoại không hợp lệ (10 chữ số, ví dụ: 0912345678).";
    setErrs(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await fetchApi("/me/profile", { method: "PATCH", body: JSON.stringify({ full_name: n, phone: p }) });
      if (res?.account) {
        localStorage.setItem("user", JSON.stringify(res.account));
        window.dispatchEvent(new Event("user-updated"));
      }
      onSaved({ ...contact, name: res?.account?.customer?.full_name ?? n, phone: res?.account?.customer?.phone ?? p }, res?.account ?? null);
    } catch (err: unknown) {
      const fromApi = apiFieldErrors(err);
      if (fromApi.full_name || fromApi.phone) setErrs({ name: fromApi.full_name, phone: fromApi.phone });
      else notify(err instanceof Error && err.message ? err.message : "Không lưu được thông tin. Vui lòng thử lại.", "error");
      setSaving(false);
    }
  };

  const field = (bad?: string) => `mt-1.5 w-full rounded-xl border bg-cs-surface px-3.5 py-2.5 text-sm text-cs-text outline-none transition placeholder:text-cs-muted focus:border-[#e11d2e] focus:ring-2 focus:ring-[#e11d2e]/15 ${bad ? "border-rose-400" : "border-cs-border"}`;

  return (
    <Modal open onClose={onClose} dismissible={!saving} size="md" title={title} description={description}
      footer={<>
        <button type="button" className={buttonClass({ variant: "secondary" })} onClick={onClose} disabled={saving}>Hủy</button>
        <button type="submit" form="contact-edit-form" className={buttonClass({ variant: "primary" })} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thông tin"}</button>
      </>}>
      <form id="contact-edit-form" onSubmit={submit} className="space-y-4" noValidate>
        <label className="block text-sm font-semibold text-cs-text">Họ và tên <span className="text-rose-500">*</span>
          <input autoFocus aria-invalid={!!errs.name || undefined} value={name} onChange={(e) => { setName(e.target.value); setErrs((x) => ({ ...x, name: undefined })); }} className={field(errs.name)} placeholder="Nhập họ và tên" autoComplete="name"/>
          {errs.name && <span className="mt-1 block text-xs font-medium text-rose-500">{errs.name}</span>}
        </label>
        <label className="block text-sm font-semibold text-cs-text">Số điện thoại <span className="text-rose-500">*</span>
          <input type="tel" inputMode="tel" aria-invalid={!!errs.phone || undefined} value={phone} onChange={(e) => { setPhone(e.target.value); setErrs((x) => ({ ...x, phone: undefined })); }} className={field(errs.phone)} placeholder="Ví dụ: 0912345678" autoComplete="tel"/>
          {errs.phone && <span className="mt-1 block text-xs font-medium text-rose-500">{errs.phone}</span>}
        </label>
        {contact.email && (
          <label className="block text-sm font-semibold text-cs-text">Email
            <input value={contact.email} disabled className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-cs-border bg-cs-surface-2 px-3.5 py-2.5 text-sm text-cs-muted"/>
            <span className="mt-1 block text-xs font-normal text-cs-muted">Email đăng nhập không đổi được ở đây.</span>
          </label>
        )}
      </form>
    </Modal>
  );
}
