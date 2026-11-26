import { useState, type ReactNode } from "react";
import { Button, Dropdown, EmptyState, ErrorState, Icon, LoadingState, Pagination, type IconName } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { errorMessage } from "../../services/adminApi";
import { catalogAdminApi, money, type AdminPackage } from "../../services/catalogAdminApi";
import { AdminPage, FilterSelect } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";
import { PackageFormModal } from "./packages/PackageFormModal";
import { VehicleBrandLogo } from "../../components/vehicle/VehicleBrandLogo";

const PER_PAGE = 5;
const n = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const modelText = (p: AdminPackage) => p.vehicle_model ? [p.vehicle_model.brand?.name, p.vehicle_model.name].filter(Boolean).join(" ") : "Dùng chung mọi dòng xe";
const minutesOf = (p: AdminPackage) => p.services.reduce((sum, s) => sum + (s.estimated_minutes ?? 0) * (s.pivot?.quantity ?? 1), 0);

/** Logo hãng (dùng chung VehicleBrandLogo với trang khách/cố vấn); gói dùng chung mọi dòng xe → icon cờ lê. */
function BrandMark({ p, size = 44 }: { p: AdminPackage; size?: number }) {
  const brand = p.vehicle_model?.brand?.name;
  if (brand) return <VehicleBrandLogo brand={brand} size={size}/>;
  return <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    className="grid shrink-0 place-items-center rounded-full border border-cs-border bg-cs-surface font-bold tracking-tight text-cs-accent-text">
    {brand ? brand.replace(/[^A-Za-zÀ-ỹ0-9]/g, "").slice(0, 2).toUpperCase() : <Icon name="wrench" size={Math.round(size * 0.45)}/>}
  </span>;
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold ${active ? "bg-success-soft text-success-fg" : "bg-warning-soft text-warning-fg"}`}>
    <span className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-warning"}`} aria-hidden="true"/>{active ? "Đang áp dụng" : "Tạm ngừng"}
  </span>;
}

function Meta({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-small text-cs-text-2"><Icon name={icon} size={16} className="text-cs-muted"/>{children}</span>;
}

/** Gói bảo dưỡng — danh sách thẻ theo hãng / dòng xe, chi tiết dịch vụ và phụ tùng của gói đang chọn. */
export default function MaintenancePackages() {
  const { notify } = useAppFeedback();
  const [brand, setBrand] = useState("all");
  const [model, setModel] = useState("all");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdminPackage | null | undefined>(undefined);