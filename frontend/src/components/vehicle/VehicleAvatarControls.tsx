import { useRef, useState, type ChangeEvent } from "react";
import { apiClient } from "../../services/api";
import { userErrorMessage } from "../../services/apiError";
import { Button, IconButton } from "../ui/Button";
import { useAppFeedback } from "../ui/feedbackContext";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
type AvatarResponse = { message: string; data: { avatar_url: string | null } };

/**
 * Nút tải lên / đổi / xóa ảnh đại diện xe, chỉ đặt ở khu Cố vấn và Admin (Backend cũng chặn vai trò khác).
 * `compact`: chỉ hiện icon, dùng trong danh sách hẹp.
 */
export function VehicleAvatarControls({ vehicleId, hasImage, name, compact = false, onChanged }: {
  vehicleId: number; hasImage: boolean; name: string; compact?: boolean; onChanged: (avatarUrl: string | null) => void;
}) {
  const { confirm, notify } = useAppFeedback();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [action, setAction] = useState<"upload" | "remove" | null>(null);

  const run = async (kind: "upload" | "remove", request: () => Promise<AvatarResponse>, fallback: string) => {
    busy.current = true;
    setAction(kind);
    try {
      const response = await request();
      onChanged(response.data.avatar_url);
      notify(response.message, "success");
    } catch (error) {
      notify(userErrorMessage(error, fallback), "error");
    } finally {
      busy.current = false;
      setAction(null);
    }
  };

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy.current) return;
    if (!ACCEPTED_TYPES.includes(file.type)) { notify("Chỉ nhận ảnh JPG, PNG hoặc WebP.", "error"); return; }
    if (file.size > MAX_BYTES) { notify("Ảnh không được vượt quá 5 MB.", "error"); return; }
    const body = new FormData();
    body.append("image", file);
    void run("upload", async () => (await apiClient.post<AvatarResponse>(`/vehicles/${vehicleId}/avatar`, body, { timeout: 60000 })).data, "Không tải được ảnh lên. Vui lòng thử lại.");
  };

  const remove = async () => {
    if (busy.current) return;
    const accepted = await confirm({ title: "Xóa ảnh đại diện xe?", description: `Xe ${name} sẽ trở về biểu tượng mặc định. Ảnh minh chứng tiếp nhận và bàn giao không bị ảnh hưởng.`, confirmText: "Xóa ảnh", variant: "danger", confirmIcon: "trash" });
    if (accepted) void run("remove", async () => (await apiClient.delete<AvatarResponse>(`/vehicles/${vehicleId}/avatar`)).data, "Không xóa được ảnh. Vui lòng thử lại.");
  };

  const uploadLabel = hasImage ? "Đổi ảnh" : "Thêm ảnh";
  const disabled = action !== null;
  return <span className="inline-flex shrink-0 items-center gap-1.5">
    <input ref={input} type="file" accept={ACCEPTED_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-label={`Chọn ảnh đại diện cho xe ${name}`} disabled={disabled} onChange={pick}/>
    {compact
      ? <IconButton icon="upload" size="sm" variant="outline" label={`${uploadLabel} xe ${name}`} loading={action === "upload"} disabled={disabled} onClick={() => input.current?.click()}/>
      : <Button icon="upload" size="sm" variant="outline" loading={action === "upload"} loadingText="Đang tải..." disabled={disabled} onClick={() => input.current?.click()}>{uploadLabel}</Button>}
    {hasImage && <IconButton icon="trash" size="sm" variant="outline" tone="danger" label={`Xóa ảnh xe ${name}`} loading={action === "remove"} disabled={disabled} onClick={() => void remove()}/>}
  </span>;
}
