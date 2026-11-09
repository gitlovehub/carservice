import { useState } from "react";
import { Button, Drawer, Field, Icon, IconButton, Input, type IconName } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { errorMessage } from "../../../services/adminApi";
import { catalogAdminApi, CATEGORY_TONE, type ServiceCategory } from "../../../services/catalogAdminApi";
import { Pill } from "../kit/AdminKit";

/** Tên dễ hiểu cho từng icon (hiện dưới ô trong lưới chọn icon). */
const ICON_LABEL: Record<string, string> = {
  droplet: "Dầu / bảo dưỡng", engine: "Động cơ", disc: "Phanh", snowflake: "Điều hoà", tire: "Lốp – mâm", bolt: "Điện",
  battery: "Ắc quy", search: "Kiểm tra", sparkle: "Chăm sóc xe", wrench: "Sửa chữa chung", tools: "Dụng cụ", gauge: "Đồng hồ",
};

export type CategoryFilter = "all" | "none" | number;
type Editing = { id: number | null; name: string; icon: string };

/**
 * Danh mục dịch vụ — ngăn kéo trượt từ bên phải.
 * Chế độ xem: danh sách danh mục + số dịch vụ; bấm "Xem dịch vụ" để lọc bảng.
 * Bấm sửa / "Thêm danh mục" → form (tên, icon, xem trước); xoá được khi danh mục không còn dịch vụ.
 */
export function CategoryDrawer({ open, categories, icons, total, uncategorized, filter, onFilter, onClose, onChanged }: {
  open: boolean; categories: ServiceCategory[]; icons: string[]; total: number; uncategorized: number;
  filter: CategoryFilter; onFilter: (filter: CategoryFilter) => void; onClose: () => void; onChanged: () => void;
}) {
  const { notify, confirm } = useAppFeedback();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState("");

  const current = editing?.id != null ? categories.find(c => c.id === editing.id) ?? null : null;
  const isNew = editing !== null && editing.id === null;
  const dirty = editing !== null && (isNew ? editing.name.trim() !== "" : !!current && (editing.name.trim() !== current.name || editing.icon !== current.icon));
  const iconList = icons.length ? icons : Object.keys(ICON_LABEL);

  const edit = (c: ServiceCategory | null) => { setError(""); setEditing(c ? { id: c.id, name: c.name, icon: c.icon } : { id: null, name: "", icon: "wrench" }); };
  const back = () => { setError(""); setEditing(null); };
  const set = (patch: Partial<Editing>) => { setEditing(e => e && { ...e, ...patch }); setError(""); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return setError("Nhập tên danh mục.");
    setBusy("save"); setError("");
    try {
      const body = { name: editing.name.trim(), icon: editing.icon };
      const res = editing.id === null ? await catalogAdminApi.createCategory(body) : await catalogAdminApi.updateCategory(editing.id, body);
      notify(res.message, "success");
      onChanged();
      setEditing(null);
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
      if (filter === current.id) onFilter("all");
      onChanged();
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e, "Không xoá được danh mục."));
    } finally {
      setBusy(null);
    }
  };

  const viewItem = (id: CategoryFilter, name: string, icon: IconName, count: number, sub?: string, c?: ServiceCategory) => {
    const on = filter === id;
    return <li key={String(id)} className={`flex items-center gap-3 rounded-control border px-3 py-2.5 transition-colors ${on ? "border-cs-accent bg-cs-soft" : "border-cs-border"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-control ${on ? "bg-cs-surface text-cs-accent-text" : "bg-cs-surface-2 text-cs-text-2"}`}><Icon name={icon} size={19}/></span>
      <span className="min-w-0 flex-1">
        <b className={`block truncate text-small ${on ? "text-cs-accent-text" : "text-cs-text"}`}>{name}</b>
        <span className="block text-caption text-cs-muted">{count} dịch vụ{sub ? ` · ${sub}` : ""}</span>
      </span>
      <Button size="sm" variant={on ? "tonal" : "ghost"} onClick={() => { onFilter(id); onClose(); }}>{on ? "Đang xem" : "Xem dịch vụ"}</Button>
      {c && <IconButton icon="edit" size="sm" label={`Sửa danh mục ${c.name}`} onClick={() => edit(c)}/>}
    </li>;
  };

  const list = <ul className="flex flex-col gap-2" aria-label="Danh mục dịch vụ">
    {viewItem("all", "Tất cả dịch vụ", "grid", total)}
    {categories.map(c => viewItem(c.id, c.name, c.icon as IconName, c.services_count, `${c.active_services_count} đang áp dụng`, c))}
    {uncategorized > 0 && viewItem("none", "Chưa phân loại", "tag", uncategorized)}
  </ul>;

  const form = editing && <div className="flex flex-col gap-4">
    <button type="button" onClick={back} disabled={busy !== null}
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-small font-medium text-cs-accent-text hover:underline disabled:opacity-50">
      <Icon name="arrow-left" size={15}/>Quay lại danh sách
    </button>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-subheading font-semibold">{isNew ? "Danh mục mới" : "Sửa danh mục"}</h3>
      {current && <span className="text-caption text-cs-muted">{current.services_count} dịch vụ · {current.active_services_count} đang áp dụng</span>}
    </div>
    <Field label="Tên danh mục" required>
      <Input value={editing.name} maxLength={100} placeholder="Ví dụ: Lốp – mâm" onChange={e => set({ name: e.target.value })}/>
    </Field>
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-cs-text-2">Icon <span className="font-normal text-cs-muted">— bấm để chọn</span></legend>
      <div role="radiogroup" aria-label="Icon danh mục" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {iconList.map(i => {
          const on = editing.icon === i;
          return <button key={i} type="button" role="radio" aria-checked={on} onClick={() => set({ icon: i })}
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
          <Icon name={editing.icon as IconName} size={18}/>{editing.name.trim() || "Tên danh mục"}
        </span>
        <Pill tone={CATEGORY_TONE[editing.icon] ?? "neutral"}>{editing.name.trim() || "Tên danh mục"}</Pill>
      </div>
    </div>
    {current && current.services_count > 0 && <p className="text-caption text-cs-muted">Danh mục còn dịch vụ — chuyển dịch vụ sang danh mục khác trước khi xoá.</p>}
    {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-fg">{error}</p>}
  </div>;

  const footer = editing
    ? <>
      {current && <Button variant="danger-outline" icon="trash" className="mr-auto" disabled={current.services_count > 0 || busy !== null} loading={busy === "delete"} onClick={() => void remove()}>Xoá</Button>}
      <Button disabled={busy !== null} onClick={back}>Huỷ</Button>
      <Button variant="primary" icon={isNew ? "plus" : "check"} disabled={!dirty || busy !== null} loading={busy === "save"} loadingText="Đang lưu..."
        onClick={() => void save()}>{isNew ? "Thêm danh mục" : "Lưu thay đổi"}</Button>
    </>
    : <>
      <Button variant="outline" icon="plus" className="mr-auto" onClick={() => edit(null)}>Thêm danh mục</Button>
      <Button onClick={onClose}>Đóng</Button>
    </>;

  return <Drawer open={open} onClose={() => { setEditing(null); onClose(); }} dismissible={busy === null} width="md"
    title="Danh mục dịch vụ" description={editing ? "Đổi tên hoặc icon — icon hiện trên từng dòng dịch vụ và trang đặt lịch." : "Bấm “Xem dịch vụ” để lọc bảng, bấm biểu tượng bút để sửa."}
    footer={footer}>
    {editing ? form : list}
  </Drawer>;
}
