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