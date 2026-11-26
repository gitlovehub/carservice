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