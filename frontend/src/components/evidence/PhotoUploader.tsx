import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { compressImage, mediaApi, VEHICLE_POSITIONS, type MediaAttachableType, type MediaItem } from "../../services/evidenceService";

/**
 * Ảnh bằng chứng (P1B). Ảnh lưu private trên server; hiển thị bằng blob tải kèm token.
 * readOnly: chỉ xem (khách, hoặc chứng từ đã khóa).
 */
export function PhotoUploader({ type, id, readOnly = false, title = "Ảnh bằng chứng", positions }: {
  type: MediaAttachableType; id: number; readOnly?: boolean; title?: string; positions?: Record<string, string>;
}) {
  const [position, setPosition] = useState(positions ? Object.keys(positions)[0] : "");
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
      setError(err instanceof Error ? err.message : "Không tải được ảnh.");
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
        await mediaApi.upload(type, id, blob, name, position ? { position_code: position } : {});
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return <div className="mt-4" data-testid="photo-uploader">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold text-cs-muted">{title} ({items.length})</p>
      {!readOnly && <>
        {positions && <select aria-label="Vị trí ảnh" className="rounded-lg border border-cs-border bg-cs-surface-2 px-2 py-1 text-xs" value={position} onChange={event => setPosition(event.target.value)}>{Object.entries(positions).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" aria-label="Chọn ảnh" onChange={event => void upload(event.target.files)}/>
        <Button size="sm" variant="secondary" loading={busy} loadingText="Đang tải ảnh…" onClick={() => fileInput.current?.click()}>Thêm ảnh</Button>
      </>}
    </div>
    {error && <p className="mt-2 text-xs font-semibold text-cs-danger" role="alert">{error}</p>}
    {items.length > 0
      ? <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{items.map(item => <li key={item.id} className="overflow-hidden rounded-lg border border-cs-border bg-cs-surface-2">
        {urls[item.id]
          ? <a href={urls[item.id]} target="_blank" rel="noreferrer"><img src={urls[item.id]} alt={item.caption || item.position_code || `Ảnh #${item.id}`} className="aspect-square w-full object-cover"/></a>
          : <div className="aspect-square w-full animate-pulse"/>}
        <p className="truncate px-1.5 py-1 text-[11px] text-cs-muted" title={item.sha256}>{(item.position_code && (positions?.[item.position_code] ?? VEHICLE_POSITIONS[item.position_code] ?? item.position_code)) || (item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : `#${item.id}`)}</p>
      </li>)}</ul>
      : <p className="mt-2 text-xs text-cs-muted">Chưa có ảnh.</p>}
  </div>;
}
