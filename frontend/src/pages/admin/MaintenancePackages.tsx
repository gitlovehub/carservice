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

  const brands = useAdminQuery("catalog-brands", signal => catalogAdminApi.brands(signal));
  const models = useAdminQuery(brand !== "all" && brand !== "general" ? `catalog-models:${brand}` : null, signal => catalogAdminApi.models(Number(brand), signal));
  const params = {
    page, per_page: PER_PAGE, status: status || undefined,
    brand_id: brand === "all" ? undefined : brand, vehicle_model_id: model === "all" ? undefined : model,
  };
  const list = useAdminQuery(`packages:${JSON.stringify(params)}`, signal => catalogAdminApi.packages(params, signal));
  const result = list.data ?? list.stale;
  const rows = result?.data ?? [];
  const currentId = selectedId ?? rows[0]?.id ?? null; // mặc định chọn gói đầu trang
  const detail = useAdminQuery(currentId === null ? null : `package:${currentId}`, signal => catalogAdminApi.package(currentId as number, signal));
  const selected = detail.data ?? (detail.stale?.id === currentId ? detail.stale : rows.find(r => r.id === currentId)) ?? null;

  const reload = () => { list.reload(); detail.reload(); };
  const setStatusOf = async (p: AdminPackage, next: "ACTIVE" | "INACTIVE") => {
    try {
      await catalogAdminApi.updatePackage(p.id, { status: next });
      notify(next === "ACTIVE" ? `Đã áp dụng lại gói “${p.name}”.` : `Đã tạm ngừng gói “${p.name}” — khách không chọn được khi đặt lịch.`, "success");
      reload();
    } catch (e) {
      notify(errorMessage(e, "Không cập nhật được gói."), "error");
    }
  };

  const brandOptions = [
    { value: "all", label: "Tất cả" }, { value: "general", label: "Dùng chung" },
    ...(brands.data ?? brands.stale ?? []).map(b => ({ value: String(b.id), label: b.name })),
  ];
  const modelOptions = [{ value: "all", label: "Tất cả" }, ...(models.data ?? []).map(m => ({ value: String(m.id), label: m.name }))];

  return <AdminPage demo={false} title="Gói bảo dưỡng" description="Gói định kỳ theo dòng xe và mốc km/tháng"
    actions={<Button variant="primary" icon="plus" onClick={() => setEditing(null)}>Tạo gói</Button>}>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="min-w-0">
        <div className="mb-4 grid gap-3 sm:grid-cols-3 [&>*]:w-full">
          <FilterSelect label="Hãng" value={brand} onChange={v => { setBrand(v); setModel("all"); setPage(1); setSelectedId(null); }} options={brandOptions}/>
          <FilterSelect label="Dòng xe" value={model} onChange={v => { setModel(v); setPage(1); setSelectedId(null); }} options={modelOptions}
            className={brand === "all" || brand === "general" ? "pointer-events-none opacity-60" : ""}/>
          <FilterSelect label="Trạng thái" value={status} onChange={v => { setStatus(v); setPage(1); setSelectedId(null); }} options={[
            { value: "", label: "Tất cả" }, { value: "ACTIVE", label: "Đang áp dụng" }, { value: "INACTIVE", label: "Tạm ngừng" },
          ]}/>        </div>

        {list.error ? <div className="rounded-card border border-cs-border bg-cs-surface"><ErrorState description={list.error} onRetry={list.reload}/></div>
          : list.loading && !rows.length ? <div className="rounded-card border border-cs-border bg-cs-surface"><LoadingState/></div>
          : !rows.length ? <div className="rounded-card border border-cs-border bg-cs-surface"><EmptyState title="Chưa có gói phù hợp" description="Đổi bộ lọc hoặc bấm “Tạo gói”."/></div>
          : <ul className="flex flex-col gap-3" aria-busy={list.loading || undefined}>
            {rows.map(p => {
              const on = p.id === currentId;
              const activeP = p.status === "ACTIVE";
              return <li key={p.id} className={`relative rounded-card border bg-cs-surface p-4 shadow-card transition-colors ${on ? "border-cs-accent bg-cs-soft/40" : "border-cs-border hover:border-cs-border-strong"}`}>
                <div className="flex items-start gap-3">
                  <BrandMark p={p}/>
                  <button type="button" aria-current={on ? "true" : undefined} onClick={() => setSelectedId(p.id)}
                    className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-['']">
                    <span className="block truncate text-subheading font-bold text-cs-text">{p.name}</span>
                    <span className="block truncate text-small text-cs-muted">{modelText(p)}</span>
                  </button>
                  <span className="relative z-10 flex items-center gap-2">
                    <StatusDot active={activeP}/>
                    <Dropdown label={`Thao tác gói ${p.name}`} items={[
                      { label: "Xem chi tiết", icon: "eye", onSelect: () => setSelectedId(p.id) },
                      { label: "Chỉnh sửa", icon: "edit", onSelect: () => setEditing(p) },
                      { type: "separator" },
                      activeP ? { label: "Tạm ngừng gói", icon: "ban", danger: true, onSelect: () => void setStatusOf(p, "INACTIVE") }
                        : { label: "Áp dụng lại", icon: "check", onSelect: () => void setStatusOf(p, "ACTIVE") },
                    ]}/>
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Meta icon="gauge">{p.mileage_milestone ? `${n(p.mileage_milestone)} km` : "—"}</Meta>
                  <Meta icon="calendar">{p.month_milestone ? `${p.month_milestone} tháng` : "—"}</Meta>
                  <Meta icon="wrench">{p.services.length} dịch vụ</Meta>
                  <Meta icon="box">{p.parts.length} phụ tùng</Meta>
                  <span className="ml-auto border-l border-cs-border pl-4 text-right">
                    <b className="block text-subheading tabular-nums text-cs-text">{money(p.price)}</b>
                    <span className="text-caption text-cs-muted">(Ước tính)</span>
                  </span>
                </div>
              </li>;
            })}
          </ul>}
        {result && result.last_page > 1 && <Pagination page={result.current_page} totalPages={result.last_page} totalItems={result.total} pageSize={result.per_page}
          disabled={list.loading} onChange={p => { setPage(p); setSelectedId(null); }}/>}
      </div>

      <aside aria-label="Chi tiết gói" className="min-w-0 rounded-card border border-cs-border bg-cs-surface p-5 shadow-card xl:sticky xl:top-[84px]">