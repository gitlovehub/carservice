import { ToastError } from "../ui/ToastError";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useAppFeedback } from "../ui/feedbackContext";
import { formatDateTime } from "../../services/customerApi";
import { compressImage, mediaApi, VEHICLE_POSITIONS, type MediaAttachableType, type MediaItem } from "../../services/evidenceService";
import { userErrorMessage } from "../../services/apiError";

/**
 * Ảnh bằng chứng (P1B). Ảnh lưu private trên server; hiển thị bằng blob tải kèm token.
 * readOnly: chỉ xem (khách, hoặc chứng từ đã khóa).
 */
export function PhotoUploader({ type, id, readOnly = false, title = "Ảnh bằng chứng", positions, positionValue, onPositionChange }: {
  type: MediaAttachableType; id: number; readOnly?: boolean; title?: string; positions?: Record<string, string>;
  positionValue?: string; onPositionChange?: (value: string) => void;
}) {
  const { confirm } = useAppFeedback();
  const [position, setPosition] = useState(positions ? Object.keys(positions)[0] : "");
  const activePosition = positionValue ?? position;
  const [items, setItems] = useState<MediaItem[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const list = await mediaApi.list(type, id);
      setItems(list);
      for (const item of list) {
        if (urlsRef.current[item.id]) continue;
        const blob = await mediaApi.blob(item.id).catch(() => null);
        if (!blob) continue;
        urlsRef.current[item.id] = URL.createObjectURL(blob);
        setUrls({ ...urlsRef.current });
      }
    } catch (err) {
      setError(userErrorMessage(err, "Không tải được ảnh."));
    }
  }, [type, id]);

  useEffect(() => {
    // Tải danh sách ảnh từ API khi đổi chứng từ (đồng bộ với hệ thống ngoài).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() chỉ setState sau khi API trả về.
    void load();
  }, [load]);

  useEffect(() => () => { Object.values(urlsRef.current).forEach(url => URL.revokeObjectURL(url)); }, []);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const name = file.name.replace(/\.[^.]+$/, "") + (blob.type === "image/jpeg" ? ".jpg" : file.name.slice(file.name.lastIndexOf(".")));
        await mediaApi.upload(type, id, blob, name, activePosition ? { position_code: activePosition } : {});
      }
      await load();
    } catch (err) {
      setError(userErrorMessage(err, "Không tải được ảnh lên."));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(item: MediaItem) {
    const where = item.position_code ? (positions?.[item.position_code] ?? VEHICLE_POSITIONS[item.position_code] ?? item.position_code) : "";
    if (!await confirm({ title: "Xoá ảnh này?", description: `Ảnh${where ? ` vị trí ${where}` : ""} sẽ bị xoá khỏi chứng từ, không khôi phục được.`, confirmText: "Xoá ảnh", variant: "danger", confirmIcon: "trash" })) return;
    setBusy(true); setError("");
    try {
      await mediaApi.remove(item.id);
      if (urlsRef.current[item.id]) { URL.revokeObjectURL(urlsRef.current[item.id]); delete urlsRef.current[item.id]; setUrls({ ...urlsRef.current }); }
      setItems(list => list.filter(x => x.id !== item.id));
    } catch (err) {
      setError(userErrorMessage(err, "Không xoá được ảnh."));
    } finally { setBusy(false); }
  }

  return <div className="mt-4" data-testid="photo-uploader">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold text-cs-muted">{title} ({items.length})</p>
      {!readOnly && <>
        {positions && <select aria-label="Vị trí ảnh" className="rounded-lg border border-cs-border bg-cs-surface-2 px-2 py-1 text-xs" value={activePosition} onChange={event => { if (onPositionChange) onPositionChange(event.target.value); else setPosition(event.target.value); }}>{Object.entries(positions).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" aria-label="Chọn ảnh" onChange={event => void upload(event.target.files)}/>
        <Button size="sm" variant="secondary" loading={busy} loadingText="Đang tải ảnh…" onClick={() => fileInput.current?.click()}>Thêm ảnh</Button>
      </>}
    </div>
    <ToastError message={error}/>
    {items.length > 0
      ? <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{items.map(item => <li key={item.id} className="relative overflow-hidden rounded-lg border border-cs-border bg-cs-surface-2">
        {!readOnly && <button type="button" onClick={() => void remove(item)} disabled={busy} aria-label="Xoá ảnh" title="Xoá ảnh"
          className="absolute right-1 top-1 z-10 grid size-7 cursor-pointer place-items-center rounded-full bg-black/65 text-white transition-colors hover:bg-danger disabled:opacity-50"><Icon name="x" size={15}/></button>}
        {urls[item.id]
          ? <a href={urls[item.id]} target="_blank" rel="noreferrer"><img src={urls[item.id]} alt={item.caption || item.position_code || `Ảnh #${item.id}`} className="aspect-square w-full object-cover"/></a>
          : <div className="aspect-square w-full animate-pulse"/>}
        <p className="truncate px-1.5 py-1 text-[11px] text-cs-muted" title={item.sha256}>{(item.position_code && (positions?.[item.position_code] ?? VEHICLE_POSITIONS[item.position_code] ?? item.position_code)) || (item.created_at ? formatDateTime(item.created_at) : `#${item.id}`)}</p>
      </li>)}</ul>
      : <p className="mt-2 text-xs text-cs-muted">Chưa có ảnh.</p>}
  </div>;
}
