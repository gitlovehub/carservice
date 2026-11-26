import { useEffect, useId, useRef, useState } from "react";
import { garageApi, type AddressSuggestion } from "../../services/garageService";
import { userErrorMessage } from "../../services/apiError";

/**
 * Ô nhập địa chỉ có gợi ý kiểu app đặt xe: gõ ≥ 3 ký tự → danh sách gợi ý (Goong / OpenStreetMap),
 * chọn bằng chuột hoặc phím ↑ ↓ Enter, Esc để đóng. Trả về địa chỉ + tọa độ của gợi ý đã chọn.
 */
export function AddressAutocomplete({ value, onChange, onSelect, label = "Địa chỉ", required }: {
  value: string; onChange: (text: string) => void; onSelect: (suggestion: AddressSuggestion & { latitude: number | null; longitude: number | null }) => void;
  label?: string; required?: boolean;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listId = useId();
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    const query = value.trim();
    if (query.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      garageApi.suggest(query, controller.signal)
        .then(list => { setItems(list); setOpen(true); setActive(-1); })
        .catch((err: unknown) => { if (!controller.signal.aborted) setError(userErrorMessage(err, "Không tải được gợi ý.")); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value]);

  async function choose(item: AddressSuggestion) {
    skipNext.current = true;
    setOpen(false);
    onChange(item.main_text);
    let latitude = item.latitude ?? null;
    let longitude = item.longitude ?? null;
    if ((latitude === null || longitude === null) && item.provider === "goong" && item.place_id) {
      const place = await garageApi.place(item.place_id).catch(() => null);
      latitude = place?.latitude ?? null; longitude = place?.longitude ?? null;
    }
    onSelect({ ...item, latitude, longitude });
  }

  return <div className="relative">
    <label className="block text-xs font-semibold text-cs-muted">{label}
      <input
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="mt-1 w-full rounded-xl border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none focus:border-cs-accent focus:ring-2 focus:ring-cs-accent/20"
        value={value} required={required} autoComplete="off" placeholder="Gõ số nhà, tên đường… để chọn từ gợi ý"
        onChange={e => { onChange(e.target.value); if (e.target.value.trim().length < 3) { setItems([]); setOpen(false); } }}
        onFocus={() => { if (items.length) setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i <= 0 ? items.length - 1 : i - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); void choose(items[active]); }
          else if (e.key === "Escape") setOpen(false);