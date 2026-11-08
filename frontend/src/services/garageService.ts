import { useEffect, useState } from "react";
import { apiClient } from "./api";

/** Thông tin gara (Admin cấu hình) + gợi ý địa chỉ qua backend (Goong / OpenStreetMap). */
export type GarageInfo = {
  name: string; phone?: string | null; email?: string | null; address_line?: string | null;
  ward?: string | null; district?: string | null; province?: string | null; latitude?: number | null; longitude?: number | null;
};
export type AddressSuggestion = {
  provider: "goong" | "osm"; place_id?: string | null; description: string; main_text: string; secondary_text: string;
  latitude?: number | null; longitude?: number | null;
};

let cached: Promise<GarageInfo | null> | null = null;

export const garageApi = {
  get: () => (cached ??= apiClient.get<{ data: GarageInfo | null }>("/garage-settings").then(r => r.data.data).catch(() => null)),
  save: async (input: GarageInfo & { place_provider?: string | null; place_id?: string | null }) => {
    const response = await apiClient.put<{ data: GarageInfo }>("/admin/garage-settings", input);
    cached = Promise.resolve(response.data.data);
    return response.data.data;
  },
  suggest: async (q: string, signal?: AbortSignal) =>
    (await apiClient.get<{ data: AddressSuggestion[] }>("/address/suggest", { params: { q }, signal })).data.data,
  place: async (placeId: string) =>
    (await apiClient.get<{ data: { latitude: number | null; longitude: number | null; description: string } }>("/address/place", { params: { place_id: placeId } })).data.data,
};

/** Địa chỉ đầy đủ một dòng (null nếu Admin chưa cấu hình). */
export function formatGarageAddress(info: GarageInfo | null): string | null {
  if (!info?.address_line) return null;
  return [info.address_line, info.ward, info.district, info.province].filter(Boolean).join(", ");
}

/** Hook đọc thông tin gara (dùng chung cache trong phiên). */
export function useGarageInfo(): GarageInfo | null {
  const [info, setInfo] = useState<GarageInfo | null>(null);
  useEffect(() => {
    let active = true;
    void garageApi.get().then(data => { if (active) setInfo(data); });
    return () => { active = false; };
  }, []);
  return info;
}