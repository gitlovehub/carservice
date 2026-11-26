import { ToastError } from "../../../components/ui/ToastError";
import { useState } from "react";
import { Button, Drawer, Field, Icon, IconButton, Input, type IconName } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { catalogAdminApi, CATEGORY_TONE, type ServiceCategory } from "../../../services/catalogAdminApi";
import { Pill } from "../kit/AdminKit";
import { useFieldErrors } from "../../../components/ui/useFieldErrors";

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
  const fieldErrors = useFieldErrors();