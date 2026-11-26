import { ToastError } from "../../../components/ui/ToastError";
import { useEffect, useMemo, useState } from "react";
import { Button, Field, Icon, IconButton, Input, KmInput, Modal, QuantityStepper, SearchInput, Select, Switch, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { adminApi, type AdminPart } from "../../../services/adminApi";
import {
  catalogAdminApi, money, type AdminPackage, type AdminService, type CatalogBrand, type CatalogModel, type PackagePayload,
} from "../../../services/catalogAdminApi";
import { useDebounced } from "../kit/useDebounced";
import { useFieldErrors, type FieldErrors } from "../../../components/ui/useFieldErrors";
import { FieldError } from "../../../components/ui/Field";

type PartLine = { part_id: number; name: string; sku: string; price: number; quantity: number };

/** Tạo / sửa gói bảo dưỡng: dòng xe áp dụng, mốc km/tháng, dịch vụ và phụ tùng đi kèm (giá ước tính tự cộng). */
export function PackageFormModal({ open, pkg, brands, onClose, onSaved }: {
  open: boolean; pkg: AdminPackage | null; brands: CatalogBrand[]; onClose: () => void; onSaved: (pkg: AdminPackage) => void;
}) {
  const { notify } = useAppFeedback();
  const [name, setName] = useState(pkg?.name ?? "");
  const [brandId, setBrandId] = useState(pkg?.vehicle_model ? String(pkg.vehicle_model.brand_id) : "");
  const [modelId, setModelId] = useState(pkg?.vehicle_model_id ? String(pkg.vehicle_model_id) : "");
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [km, setKm] = useState(pkg?.mileage_milestone ? String(pkg.mileage_milestone) : "");
  const [months, setMonths] = useState(pkg?.month_milestone ? String(pkg.month_milestone) : "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [active, setActive] = useState((pkg?.status ?? "ACTIVE") === "ACTIVE");
  const [services, setServices] = useState<AdminService[]>([]);
  const [picked, setPicked] = useState<Record<number, number>>(() => Object.fromEntries((pkg?.services ?? []).map(s => [s.id, s.pivot?.quantity ?? 1])));
  const [serviceSearch, setServiceSearch] = useState("");
  const [parts, setParts] = useState<PartLine[]>(() => (pkg?.parts ?? []).map(p => ({ part_id: p.id, name: p.name, sku: p.sku, price: Number(p.sell_price), quantity: p.pivot?.quantity ?? 1 })));
  const [partSearch, setPartSearch] = useState("");
  const partTerm = useDebounced(partSearch.trim());
  const [partResults, setPartResults] = useState<AdminPart[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();