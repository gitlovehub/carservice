import { useState } from "react";
import { Button, Field, Icon, Input, Modal, type IconName } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { errorMessage } from "../../../services/adminApi";
import { catalogAdminApi, CATEGORY_TONE, type ServiceCategory } from "../../../services/catalogAdminApi";
import { Pill } from "../kit/AdminKit";

/** Tên dễ hiểu cho từng icon (hiện dưới ô trong lưới chọn icon). */
const ICON_LABEL: Record<string, string> = {
  droplet: "Dầu / bảo dưỡng", engine: "Động cơ", disc: "Phanh", snowflake: "Điều hoà", tire: "Lốp – mâm", bolt: "Điện",
  battery: "Ắc quy", search: "Kiểm tra", sparkle: "Chăm sóc xe", wrench: "Sửa chữa chung", tools: "Dụng cụ", gauge: "Đồng hồ",
};

type Selection = number | "new";

/**
 * Quản lý danh mục dịch vụ — 2 cột: danh sách danh mục (trái) và form sửa (phải) gồm tên,
 * lưới chọn icon có hình + nhãn, xem trước đúng như khách / admin sẽ thấy; xoá được khi danh mục rỗng.
 */
export function CategoryManagerModal({ open, categories, icons, onClose, onChanged }: {
  open: boolean; categories: ServiceCategory[]; icons: string[]; onClose: () => void; onChanged: () => void;
}) {
  const { notify, confirm } = useAppFeedback();
  const [selection, setSelection] = useState<Selection>(categories[0]?.id ?? "new");
  const current = typeof selection === "number" ? categories.find(c => c.id === selection) ?? null : null;
  const [name, setName] = useState(current?.name ?? "");
  const [icon, setIcon] = useState(current?.icon ?? "wrench");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState("");

  const select = (next: Selection) => {
    const c = typeof next === "number" ? categories.find(x => x.id === next) : null;
    setSelection(next);
    setName(c?.name ?? "");
    setIcon(c?.icon ?? "wrench");
    setError("");
  };

  const isNew = selection === "new" || !current;
  const dirty = isNew ? name.trim() !== "" : name.trim() !== current.name || icon !== current.icon;
  const iconList = icons.length ? icons : Object.keys(ICON_LABEL);

  const save = async () => {
    if (!name.trim()) return setError("Nhập tên danh mục.");
    setBusy("save");
    setError("");
    try {
      const res = isNew
        ? await catalogAdminApi.createCategory({ name: name.trim(), icon })
        : await catalogAdminApi.updateCategory(current.id, { name: name.trim(), icon });
      notify(res.message, "success");
      onChanged();
      setSelection(res.data.id);
    } catch (e) {
      setError(errorMessage(e, "Không lưu được danh mục."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!current) return;
    if (!await confirm({ title: "Xoá danh mục", description: `Xoá danh mục “${current.name}”? Thao tác không hoàn tác được.`, variant: "danger", confirmText: "Xoá danh mục" })) return;
    setBusy("delete");
    try {
      const res = await catalogAdminApi.deleteCategory(current.id);
      notify(res.message, "success");
      onChanged();
      select(categories.find(c => c.id !== current.id)?.id ?? "new");
    } catch (e) {
      setError(errorMessage(e, "Không xoá được danh mục."));
    } finally {
      setBusy(null);
    }
  };

  return <Modal open={open} onClose={onClose} dismissible={busy === null} size="lg" title="Quản lý danh mục dịch vụ"
    description="Chọn một danh mục để đổi tên hoặc icon. Icon hiện ở cột danh mục, trên từng dòng dịch vụ và trang đặt lịch."
    footer={<Button onClick={onClose}>Xong</Button>}>
    <div className="grid gap-5 md:grid-cols-[230px_minmax(0,1fr)]">
      {/* Danh sách danh mục */}
      <div className="flex min-w-0 flex-col gap-2">
        <ul className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1" aria-label="Danh mục hiện có">
          {categories.map(c => {
            const on = selection === c.id;
            return <li key={c.id}>
              <button type="button" aria-current={on ? "true" : undefined} onClick={() => select(c.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-control border px-2.5 py-2 text-left text-small transition-colors ${on ? "border-cs-accent bg-cs-soft text-cs-accent-text" : "border-transparent text-cs-text hover:bg-cs-hover"}`}>
                <span className={`grid size-8 shrink-0 place-items-center rounded-control ${on ? "bg-cs-surface" : "bg-cs-surface-2 text-cs-text-2"}`}><Icon name={c.icon as IconName} size={17}/></span>
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <span className="text-caption tabular-nums text-cs-muted">{c.services_count}</span>
              </button>
            </li>;
          })}
        </ul>
        <Button variant={selection === "new" ? "tonal" : "outline"} icon="plus" onClick={() => select("new")}>Thêm danh mục</Button>
      </div>

      {/* Form sửa */}
      <div className="flex min-w-0 flex-col gap-4 rounded-card border border-cs-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-subheading font-semibold">{isNew ? "Danh mục mới" : "Sửa danh mục"}</h3>
          {!isNew && <span className="text-caption text-cs-muted">{current.services_count} dịch vụ · {current.active_services_count} đang áp dụng</span>}
        </div>

        <Field label="Tên danh mục" required>
          <Input value={name} maxLength={100} placeholder="Ví dụ: Lốp – mâm" onChange={e => { setName(e.target.value); setError(""); }}/>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-cs-text-2">Icon <span className="font-normal text-cs-muted">— bấm để chọn</span></legend>
          <div role="radiogroup" aria-label="Icon danh mục" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {iconList.map(i => {
              const on = icon === i;
              return <button key={i} type="button" role="radio" aria-checked={on} onClick={() => setIcon(i)}
                className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-control border px-2 py-3 text-center transition-colors ${on
                  ? "border-cs-accent bg-cs-soft text-cs-accent-text"
                  : "border-cs-border bg-cs-surface text-cs-text-2 hover:border-cs-border-strong hover:bg-cs-hover hover:text-cs-text"}`}>
                {on && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-cs-accent text-cs-accent-contrast" aria-hidden="true"><Icon name="check" size={11}/></span>}
                <Icon name={i as IconName} size={24}/>
                <span className="text-caption font-medium leading-tight">{ICON_LABEL[i] ?? i}</span>
              </button>;
            })}
          </div>
        </fieldset>

        <div className="rounded-control bg-cs-surface-2 p-3">
          <p className="mb-2 text-caption font-medium text-cs-muted">Xem trước</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2.5 rounded-control bg-cs-soft px-3 py-2 text-small font-semibold text-cs-accent-text">
              <Icon name={icon as IconName} size={18}/>{name.trim() || "Tên danh mục"}
            </span>
            <Pill tone={CATEGORY_TONE[icon] ?? "neutral"}>{name.trim() || "Tên danh mục"}</Pill>
          </div>
        </div>

        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-cs-border pt-3">
          {!isNew && <Button variant="danger-outline" icon="trash" disabled={current.services_count > 0 || busy !== null} loading={busy === "delete"} onClick={() => void remove()}>Xoá</Button>}
          {!isNew && current.services_count > 0 && <span className="text-caption text-cs-muted">Còn dịch vụ — chuyển sang danh mục khác trước khi xoá.</span>}
          <span className="flex-1"/>
          <Button variant="primary" icon={isNew ? "plus" : "check"} disabled={!dirty || busy !== null} loading={busy === "save"} loadingText="Đang lưu..."
            onClick={() => void save()}>{isNew ? "Thêm danh mục" : "Lưu thay đổi"}</Button>
        </div>
      </div>
    </div>
  </Modal>;
}
