import { useState } from "react";
import { API_BASE_URL } from "../../services/api";
import { Icon } from "../ui/Icon";

/** `avatar_url` lưu đường dẫn trong kho; ảnh được phát qua API để đúng cả khi API ở tên miền khác. */
const avatarSource = (path: string) => `${API_BASE_URL}/vehicle-avatars/${path.split("/").pop()}`;

/** Ảnh đại diện xe. Chưa có ảnh hoặc ảnh lỗi: hiện biểu tượng ô tô mặc định, không để khung trống. */
export function VehicleAvatar({ path, name, iconSize = 40, className = "" }: {
  path?: string | null; name: string; iconSize?: number; className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = path ? avatarSource(path) : null;
  const showImage = source !== null && source !== failedSource;

  return <span data-testid="vehicle-avatar" data-has-image={showImage || undefined}
    className={`relative grid shrink-0 place-items-center overflow-hidden border border-cs-border bg-cs-surface-2 text-cs-muted ${className}`}>
    {showImage
      ? <img src={source} alt={`Ảnh xe ${name}`} loading="lazy" className="absolute inset-0 size-full object-cover" onError={() => setFailedSource(source)}/>
      : <span role="img" aria-label={`Xe ${name} chưa có ảnh`} className="grid place-items-center"><Icon name="car" size={iconSize}/></span>}
  </span>;
}
