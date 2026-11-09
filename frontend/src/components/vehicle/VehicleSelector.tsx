import { useEffect, useState } from "react";
import { vehicleCatalogApi, type VehicleSelection } from "../../services/vehicleCatalog";
import { SearchableSelect, type SelectOption } from "./SearchableSelect";

type Loaded = { key: string; options: SelectOption[]; error: string };
const idle: Loaded = { key: "", options: [], error: "" };

/**
 * Tải một cấp danh mục theo khóa yêu cầu. "Đang tải" = khóa hiện tại chưa có kết quả,
 * nên không cần setState đồng bộ trong effect.
 */
function useCatalogLevel(key: string | null, load: (signal: AbortSignal) => Promise<SelectOption[]>) {
  const [state, setState] = useState<Loaded>(idle);
  const [attempt, setAttempt] = useState(0);
  const requestKey = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    load(controller.signal)
      .then(options => setState({ key: requestKey, options, error: "" }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, options: [], error: error instanceof Error ? error.message : "Không tải được danh sách." });
      });
    return () => controller.abort();
    // `load` đổi theo mỗi lần render; chỉ tải lại khi khóa yêu cầu đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const ready = requestKey !== null && state.key === requestKey;
  return {
    options: ready ? state.options : [],
    loading: requestKey !== null && !ready,
    error: ready ? state.error : "",
    retry: () => setAttempt(n => n + 1),
  };
}

type Props = {
  value: VehicleSelection;
  onChange: (next: VehicleSelection) => void;
  errors?: { brand?: string; model?: string; trim?: string };
  disabled?: boolean;
  /** Phiên bản không bắt buộc (khách có thể chưa biết). */
  trimRequired?: boolean;
  /** 3: ba cột từ màn hình sm; 1: xếp dọc (dùng trong modal hẹp). */
  columns?: 1 | 3;
  className?: string;
};

/**
 * Bộ chọn xe 3 bước: Hãng xe → Dòng xe → Phiên bản. Dữ liệu lấy từ /api/vehicle-catalog.
 * Đổi hãng thì bỏ chọn dòng xe + phiên bản; đổi dòng xe thì bỏ chọn phiên bản.
 */
export function VehicleSelector({ value, onChange, errors = {}, disabled, trimRequired = false, columns = 3, className = "" }: Props) {
  const brands = useCatalogLevel("brands", signal => vehicleCatalogApi.brands(undefined, signal)
    .then(list => list.map(brand => ({ value: brand.id, label: brand.name, hint: brand.models_count ? `${brand.models_count} dòng` : undefined }))));

  const models = useCatalogLevel(value.brandId === null ? null : `models-${value.brandId}`, signal => vehicleCatalogApi.models(value.brandId as number, undefined, signal)
    .then(list => list.map(model => ({ value: model.id, label: model.name, hint: model.trims_count ? `${model.trims_count} phiên bản` : undefined }))));

  const trims = useCatalogLevel(value.modelId === null ? null : `trims-${value.modelId}`, signal => vehicleCatalogApi.trims(value.modelId as number, undefined, signal)
    .then(list => list.map(trim => ({ value: trim.id, label: trim.name }))));

  return <div className={`grid gap-4 ${columns === 3 ? "sm:grid-cols-3" : ""} ${className}`} data-testid="vehicle-selector">
    <SearchableSelect
      testId="vehicle-brand"
      label="Hãng xe" placeholder="Tìm hãng xe…" required
      options={brands.options} loading={brands.loading} loadError={brands.error} onRetry={brands.retry}
      value={value.brandId} fallbackLabel={value.brandName} error={errors.brand} disabled={disabled}
      emptyText="Không tìm thấy hãng xe."
      onChange={option => onChange({
        brandId: option?.value ?? null, brandName: option?.label ?? "",
        modelId: null, modelName: "", trimId: null, trimName: "",
      })}
    />
    <SearchableSelect
      testId="vehicle-model"
      label="Dòng xe" placeholder="Tìm dòng xe…" required
      options={models.options} loading={models.loading} loadError={models.error} onRetry={models.retry}
      value={value.modelId} fallbackLabel={value.modelName} error={errors.model}
      disabled={disabled || value.brandId === null} disabledHint="Chọn hãng xe trước."
      emptyText="Hãng này chưa có dòng xe phù hợp."
      onChange={option => onChange({ ...value, modelId: option?.value ?? null, modelName: option?.label ?? "", trimId: null, trimName: "" })}
    />
    <SearchableSelect
      testId="vehicle-trim"
      label="Phiên bản" placeholder="Tìm phiên bản…" required={trimRequired} optional={!trimRequired}
      options={trims.options} loading={trims.loading} loadError={trims.error} onRetry={trims.retry}
      value={value.trimId} fallbackLabel={value.trimName} error={errors.trim}
      disabled={disabled || value.modelId === null} disabledHint="Chọn dòng xe trước."
      emptyText="Dòng xe này chưa có phiên bản trong danh mục."
      onChange={option => onChange({ ...value, trimId: option?.value ?? null, trimName: option?.label ?? "" })}
    />
  </div>;
}
